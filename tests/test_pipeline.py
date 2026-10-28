#!/usr/bin/env python3
"""
Test script for pipeline.py

Usage:
    python test_pipeline.py path/to/notice.jpg [more_pages.jpg ...]

Prints the extraction result as pretty-printed JSON with UTF-8 support
(ensures Hindi, Kannada, etc. remain readable).
"""

import json
import sys
from pathlib import Path

from pipeline import extract_notice, load_image_files


def main():
    """Main entry point for testing."""
    if len(sys.argv) < 2:
        print(
            "Usage: python test_pipeline.py path/to/notice.jpg [page2.jpg ...]\n"
            "Example: python test_pipeline.py /tmp/eviction_notice.jpg /tmp/eviction_page2.jpg"
        )
        sys.exit(1)

    file_paths = sys.argv[1:]

    print(f"📄 Processing {len(file_paths)} file(s)...\n")

    try:
        # Load images
        images, mime_types = load_image_files(file_paths)
        print(f"✓ Loaded {len(images)} image(s)\n")

        # Extract notice
        print("🔄 Extracting notice information from Gemini...\n")
        extraction = extract_notice(images, mime_types)

        # Print as pretty JSON with UTF-8 support
        print("=" * 80)
        print("EXTRACTION RESULT")
        print("=" * 80)
        result_json = extraction.model_dump_json(indent=2, ensure_ascii=False)
        print(result_json)
        print("=" * 80)

        # Print summary
        print("\n📋 SUMMARY")
        print("-" * 80)
        print(f"Readable: {extraction.readable}")
        print(f"Language: {extraction.notice_language}")
        print(f"Document Type: {extraction.doc_type} (confidence: {extraction.doc_type_confidence})")
        if extraction.issuing_authority:
            print(f"Issuing Authority: {extraction.issuing_authority}")
        if extraction.case_number:
            print(f"Case Number: {extraction.case_number}")
        print(f"\n{extraction.summary_en}")
        print("-" * 80)

        return 0

    except FileNotFoundError as e:
        print(f"❌ File error: {e}", file=sys.stderr)
        return 1
    except ValueError as e:
        print(f"❌ Input error: {e}", file=sys.stderr)
        return 1
    except RuntimeError as e:
        print(f"❌ Extraction error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"❌ Unexpected error: {type(e).__name__}: {e}", file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
