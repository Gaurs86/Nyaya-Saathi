from review_exports import export_docx, export_pdf


def sample_case():
    return {
        "case_id": "abc123",
        "title": "Test intake",
        "status": "approved",
        "revision": 2,
        "created_at": "2026-10-29T00:00:00+00:00",
        "updated_at": "2026-10-29T00:05:00+00:00",
        "brief": {
            "schema_version": "1.0",
            "language": "en",
            "document": {"type": "eviction_or_rent", "type_confidence": "high", "readable": True},
            "summary": "The notice claims unpaid rent.",
            "parties": [{"role": "recipient", "name": "Test Person", "source_quote": "To Test Person", "page_number": 1}],
            "demands_or_claims": ["Pay claimed rent"],
            "dates_and_periods": [{"label": "payment period", "original_text": "within 15 days", "page_number": 1, "preliminary_assessment": {"due_date": None, "status": "requires_lawyer_verification", "basis": "Receipt date missing"}}],
            "legal_provisions_cited": [],
            "supporting_evidence": [{"field": "demand", "quote": "Pay claimed rent", "page_number": 1, "quote_match_status": "not_verifiable", "verification_status": "requires_human_review"}],
            "urgency_flags": [],
            "information_to_confirm": ["Confirm receipt date"],
            "lawyer_review_checklist": ["Check original notice"],
            "important_limitations": ["This is a draft, not a legal opinion."],
            "reviewer_approval": {"reviewer_label": "test-reviewer", "reviewed_at": "2026-10-29T00:05:00+00:00"},
        },
    }


def test_pdf_export_returns_pdf_bytes():
    output = export_pdf(sample_case())
    assert output.startswith(b"%PDF-")


def test_docx_export_returns_zip_bytes():
    output = export_docx(sample_case())
    assert output.startswith(b"PK")
