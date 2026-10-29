"""
Extract key facts from Indian legal notices using Gemini's structured output.

This module processes photos of legal documents (court summons, eviction notices, etc.)
and returns structured JSON with extracted information.

API Key and model configuration are read from .env/.env.local:
  GOOGLE_API_KEY: Your Gemini API key
  GEMINI_MODEL: Model name (default: gemini-3.5-flash-lite)
"""

import json
import logging
import os
import time
from typing import Optional
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

# Load environment variables
load_dotenv('.env.local')
load_dotenv('.env')

# Configure logging (no sensitive data logged)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================================
# Pydantic Models
# ============================================================================

class Party(BaseModel):
    """A party in the legal notice."""
    role: str = Field(
        ...,
        description='Role in the document: "sender", "recipient", "petitioner", "respondent", or "other"'
    )
    name: str = Field(..., description='Name of the party')


class Date(BaseModel):
    """A date reference in the notice."""
    label: str = Field(..., description='Label for the date (e.g. "notice date", "hearing date", "reply within")')
    date: Optional[str] = Field(None, description='Date in YYYY-MM-DD format, null if duration/unreadable')
    original_text: str = Field(..., description='Exact text copied from the document')
    duration_days: Optional[int] = Field(None, description='For a period like "within 15 days": the number of days (15). Null for ordinary dates')
    duration_from: Optional[str] = Field(None, description='What the period counts from: "receipt", "notice_date" or "other". Null for ordinary dates')


class Section(BaseModel):
    """A legal section or act cited."""
    act: str = Field(..., description='Name of the act (e.g. "IPC", "CPC", "Rent Control Act")')
    section: str = Field(..., description='Section number or clause')
    original_text: str = Field(..., description='Exact text copied from the document')


class NoticeExtraction(BaseModel):
    """Complete extraction of a legal notice."""
    readable: bool = Field(
        ...,
        description='True if document is clear and readable; False if blurry, cut off, or not a legal document'
    )
    notice_language: str = Field(
        ...,
        description='Language(s) of the document (e.g. "English", "Hindi", "Kannada", "mixed")'
    )
    doc_type: str = Field(
        ...,
        description='Type of document. Must be one of: court_summons, eviction_or_rent, cheque_bounce_138, '
                    'labour_or_wage, scheme_rejection, family_or_maintenance, other'
    )
    doc_type_confidence: str = Field(
        ...,
        description='Confidence in doc_type classification: "high", "medium", or "low"'
    )
    issuing_authority: Optional[str] = Field(
        None,
        description='Who issued the notice: court name, police station, advocate, department, or null'
    )
    case_number: Optional[str] = Field(None, description='Case/File number if present, null otherwise')
    parties: list[Party] = Field(
        default_factory=list,
        description='List of parties involved (sender, recipient, petitioner, respondent, etc.)'
    )
    dates: list[Date] = Field(
        default_factory=list,
        description='Important dates from the notice. Durations go here with date=null'
    )
    sections_cited: list[Section] = Field(
        default_factory=list,
        description='Legal acts and sections cited in the notice'
    )
    demands: list[str] = Field(
        default_factory=list,
        description='What the sender is demanding/asking for, in plain English'
    )
    mentions_arrest_or_warrant: bool = Field(
        False,
        description='True if the notice mentions arrest, warrant, or imprisonment'
    )
    mentions_domestic_violence: bool = Field(
        False,
        description='True if the notice relates to domestic violence'
    )
    summary_en: str = Field(
        ...,
        description='2-sentence summary in plain English'
    )


# ============================================================================
# Extraction Prompt
# ============================================================================

EXTRACTION_PROMPT = """You are an expert in Indian legal documents. Extract information from the provided legal notice image(s).

CRITICAL RULES:
1. ONLY extract what is explicitly written in the document. NEVER guess, assume or invent dates, names, case numbers, or sections.
2. Use null or empty arrays for missing/unreadable information.
3. Copy exact text (original_text fields) from the document so it can be verified.
4. For durations like "within 15 days", set date=null, put the phrase in original_text, and fill duration_days (e.g. 15) and duration_from ("receipt" if counted from receipt/service of the notice, "notice_date" if counted from the notice's own date, otherwise "other"). Leave both null for ordinary dates.
5. Preserve the original language where important (e.g., act names, section numbers).
6. If multiple pages are provided, extract all information across all pages as one integrated notice.
7. Ensure all dates are in YYYY-MM-DD format if readable, otherwise null.

DOCUMENT CLASSIFICATION:
- court_summons: Summons from court, notice to appear in court
- eviction_or_rent: Eviction notice, rent recovery, landlord-tenant disputes
- cheque_bounce_138: Notice under Section 138 NI Act for dishonored cheques
- labour_or_wage: Labour disputes, wage recovery, factory act violations
- scheme_rejection: Rejection of government scheme/subsidy application
- family_or_maintenance: Maintenance, alimony, custody, domestic violence, divorce
- other: If none of the above apply

LANGUAGE DETECTION:
Accurately identify the document language(s). Common combinations:
- English (most common in formal notices)
- Hindi (especially in smaller courts/police)
- Kannada, Tamil, Telugu, Marathi, etc. (regional documents)
- mixed (if multiple languages used together)

PARTY ROLES:
- sender: The authority/person issuing the notice
- recipient: The person/entity being served the notice
- petitioner: Person filing the petition/complaint
- respondent: Person being complained against
- other: Any other relevant parties

Return your extraction as valid JSON matching the provided schema. Do not include any explanation or markdown—only the JSON object."""


# ============================================================================
# Main Extraction Function
# ============================================================================

def extract_notice(
    images: list[bytes],
    mime_types: list[str],
    max_retries: int = 1,
) -> NoticeExtraction:
    """
    Extract structured information from Indian legal notice image(s).

    Args:
        images: List of 1-3 image bytes (or 1 PDF) to process
        mime_types: Corresponding MIME types (e.g. ["image/jpeg"])
        max_retries: Number of retries on rate limit or JSON error

    Returns:
        NoticeExtraction: Extracted notice information as Pydantic model

    Raises:
        ValueError: If inputs are invalid
        RuntimeError: If extraction fails after retries
    """

    # Validate inputs
    if not images or not mime_types:
        raise ValueError("images and mime_types cannot be empty")
    if len(images) != len(mime_types):
        raise ValueError("images and mime_types must have the same length")
    if len(images) > 3:
        raise ValueError("Maximum 3 images allowed (or 1 PDF)")
    if not all(isinstance(img, bytes) for img in images):
        raise ValueError("All images must be bytes")

    # Load API config
    api_key = os.getenv('GOOGLE_API_KEY')
    model_name = os.getenv('GEMINI_MODEL', 'gemini-3.5-flash-lite')

    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY not found in environment")

    # Initialize client (google-genai SDK: there is no genai.configure)
    client = genai.Client(api_key=api_key)

    # Prepare image parts for Gemini
    image_parts = [
        types.Part.from_bytes(data=img_bytes, mime_type=mime_type)
        for img_bytes, mime_type in zip(images, mime_types)
    ]
    all_parts = [EXTRACTION_PROMPT] + image_parts

    logger.info(
        f"Extracting notice from {len(images)} image(s). "
        f"Languages: detecting. Doc type: analyzing."
    )

    # Retry logic for rate limits and JSON errors
    for attempt in range(max_retries + 1):
        try:
            # Call Gemini with structured output
            response = client.models.generate_content(
                model=model_name,
                contents=all_parts,
                config=types.GenerateContentConfig(
                    response_mime_type='application/json',
                    response_schema=NoticeExtraction,
                ),
            )

            # Parse the response
            response_text = response.text
            if not response_text:
                raise RuntimeError("Gemini returned empty response")

            # Parse JSON
            result_dict = json.loads(response_text)
            extraction = NoticeExtraction(**result_dict)

            # Log only non-sensitive fields
            logger.info(
                f"Extraction complete. "
                f"readable={extraction.readable}, "
                f"language={extraction.notice_language}, "
                f"doc_type={extraction.doc_type}, "
                f"confidence={extraction.doc_type_confidence}"
            )

            return extraction

        except json.JSONDecodeError as e:
            if attempt < max_retries:
                logger.warning(f"JSON decode error on attempt {attempt + 1}, retrying: {e}")
                time.sleep(2)
                continue
            raise RuntimeError(f"Failed to parse Gemini response as JSON: {e}") from e

        except RuntimeError as e:
            if "429" in str(e) or "rate limit" in str(e).lower():
                if attempt < max_retries:
                    logger.warning(f"Rate limited (attempt {attempt + 1}), waiting 10s...")
                    time.sleep(10)
                    continue
            raise RuntimeError(f"Extraction failed: {e}") from e

        except Exception as e:
            if attempt < max_retries:
                logger.warning(f"Error on attempt {attempt + 1}, retrying: {e}")
                time.sleep(2)
                continue
            raise RuntimeError(f"Extraction failed: {type(e).__name__}: {e}") from e

    raise RuntimeError("Extraction failed after all retries")


# ============================================================================
# Utility Functions
# ============================================================================

def load_image_files(file_paths: list[str]) -> tuple[list[bytes], list[str]]:
    """
    Load image files and detect MIME types.

    Args:
        file_paths: List of paths to image files

    Returns:
        Tuple of (images_bytes, mime_types)

    Raises:
        FileNotFoundError: If file doesn't exist
        ValueError: If file type is not supported
    """
    images = []
    mime_types = []

    mime_map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
    }

    for path in file_paths:
        p = Path(path)
        if not p.exists():
            raise FileNotFoundError(f"File not found: {path}")

        ext = p.suffix.lower()
        if ext not in mime_map:
            raise ValueError(f"Unsupported file type: {ext}")

        with open(p, 'rb') as f:
            images.append(f.read())
            mime_types.append(mime_map[ext])

        logger.info(f"Loaded {len(images[0])} bytes from {path}")

    return images, mime_types
