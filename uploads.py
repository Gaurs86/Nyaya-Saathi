"""Validation helpers for legal-document uploads."""
from __future__ import annotations

MAX_FILES = 3
MAX_FILE_BYTES = 12 * 1024 * 1024
MAX_TOTAL_BYTES = 20 * 1024 * 1024


def sniff_mime(data: bytes) -> str | None:
    """Detect supported formats from file signatures, not the browser MIME label."""
    if not data:
        return None
    if data.startswith(b"%PDF-") or b"%PDF-" in data[:1024]:
        return "application/pdf"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def validate_upload_payloads(payloads: list[bytes]) -> list[str]:
    """Validate file count, byte limits, supported signatures and PDF grouping.

    Returns MIME types detected from each payload. Raises ValueError with a
    user-safe explanation when the payload is not supported.
    """
    if not payloads:
        raise ValueError("Upload at least one image or PDF.")
    if len(payloads) > MAX_FILES:
        raise ValueError("Upload at most three images, or one PDF.")

    total = sum(len(payload) for payload in payloads)
    if total > MAX_TOTAL_BYTES:
        raise ValueError("Combined upload size must be 20 MB or less.")

    mime_types: list[str] = []
    for payload in payloads:
        if not payload:
            raise ValueError("One of the uploaded files is empty.")
        if len(payload) > MAX_FILE_BYTES:
            raise ValueError("Each uploaded file must be 12 MB or less.")
        detected = sniff_mime(payload)
        if detected is None:
            raise ValueError("Unsupported or invalid file. Upload a PDF, JPEG, PNG, GIF or WebP file.")
        mime_types.append(detected)

    if "application/pdf" in mime_types and (len(mime_types) != 1 or mime_types[0] != "application/pdf"):
        raise ValueError("Upload a PDF by itself, or upload up to three images.")

    return mime_types
