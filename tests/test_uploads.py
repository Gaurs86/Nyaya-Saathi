import pytest

from uploads import MAX_FILE_BYTES, MAX_TOTAL_BYTES, sniff_mime, validate_upload_payloads


def test_detects_supported_magic_bytes():
    assert sniff_mime(b"%PDF-1.7 test") == "application/pdf"
    assert sniff_mime(b"\xff\xd8\xffpayload") == "image/jpeg"
    assert sniff_mime(b"\x89PNG\r\n\x1a\npayload") == "image/png"
    assert sniff_mime(b"GIF89apayload") == "image/gif"
    assert sniff_mime(b"RIFF0000WEBPpayload") == "image/webp"


def test_rejects_unknown_or_empty_payload():
    assert sniff_mime(b"not a document") is None
    with pytest.raises(ValueError, match="empty"):
        validate_upload_payloads([b""])


def test_rejects_too_many_files():
    with pytest.raises(ValueError, match="three images"):
        validate_upload_payloads([b"\xff\xd8\xffa"] * 4)


def test_pdf_must_be_uploaded_alone():
    with pytest.raises(ValueError, match="by itself"):
        validate_upload_payloads([b"%PDF-1.7 test", b"\xff\xd8\xffa"])


def test_rejects_per_file_limit():
    with pytest.raises(ValueError, match="12 MB"):
        validate_upload_payloads([b"\xff\xd8\xff" + b"a" * MAX_FILE_BYTES])


def test_rejects_combined_limit():
    # Each file is below the individual limit, but together exceed 20 MiB.
    payload = b"\xff\xd8\xff" + b"a" * (10 * 1024 * 1024)
    assert len(payload) < MAX_FILE_BYTES
    assert len(payload) * 2 > MAX_TOTAL_BYTES
    with pytest.raises(ValueError, match="Combined"):
        validate_upload_payloads([payload, payload])
