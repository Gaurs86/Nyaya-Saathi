from briefs import build_lawyer_brief


def sample_extraction():
    return {
        "readable": True,
        "notice_language": "English",
        "doc_type": "eviction_or_rent",
        "doc_type_confidence": "high",
        "issuing_authority": "Advocate",
        "case_number": None,
        "parties": [{
            "role": "recipient",
            "name": "Rohit Sharma",
            "original_text": "To, Mr. Rohit Sharma",
            "page_number": 1,
        }],
        "dates": [{
            "label": "payment period",
            "date": None,
            "original_text": "within 15 days from receipt",
            "duration_days": 15,
            "duration_from": "receipt",
            "page_number": 1,
        }],
        "sections_cited": [],
        "demands": ["Pay the claimed outstanding rent"],
        "mentions_arrest_or_warrant": False,
        "mentions_domestic_violence": False,
        "summary_en": "The notice demands payment of claimed outstanding rent.",
        "evidence_spans": [{
            "field": "demands",
            "value": "Pay the claimed outstanding rent",
            "quote": "You are called upon to pay the outstanding rent.",
            "page_number": 1,
        }],
    }


def test_brief_is_draft_and_contains_lawyer_review_checklist():
    brief = build_lawyer_brief(sample_extraction(), [], language="en")
    assert brief["review_status"] == "draft_pending_lawyer_review"
    assert brief["document"]["type"] == "eviction_or_rent"
    assert brief["parties"][0]["name"] == "Rohit Sharma"
    assert brief["supporting_evidence"][0]["verification_status"] == "requires_human_review"
    assert brief["lawyer_review_checklist"]
    assert "not a legal opinion" in brief["important_limitations"][0]


def test_brief_marks_unreadable_and_missing_evidence():
    extraction = sample_extraction()
    extraction["readable"] = False
    extraction["evidence_spans"] = []
    brief = build_lawyer_brief(extraction, [])
    assert any("unreadable" in item for item in brief["information_to_confirm"])
    assert any("evidence spans" in item for item in brief["information_to_confirm"])


def test_brief_does_not_claim_due_date_is_verified():
    deadline = {
        "label": "payment period",
        "due_date": "2026-11-15",
        "days_left": 10,
        "basis": "15 days from receipt",
        "assumed": False,
        "informational": False,
        "legal_rule_verified": None,
        "urgent": False,
        "overdue": False,
    }
    brief = build_lawyer_brief(sample_extraction(), [deadline])
    assessment = brief["dates_and_periods"][0]["preliminary_assessment"]
    assert assessment["due_date"] == "2026-11-15"
    assert assessment["status"] == "requires_lawyer_verification"
    assert assessment["legal_rule_verified"] is None


def test_pdf_quote_match_is_recorded_but_still_requires_human_review():
    brief = build_lawyer_brief(
        sample_extraction(),
        [],
        source_text_by_page={1: "You are called upon to pay the outstanding rent."},
    )
    span = brief["supporting_evidence"][0]
    assert span["quote_match_status"] == "matched_in_source_text"
    assert span["verification_status"] == "requires_human_review"


def test_quote_not_found_in_pdf_text_is_flagged():
    brief = build_lawyer_brief(
        sample_extraction(),
        [],
        source_text_by_page={1: "Unrelated text from the PDF."},
    )
    span = brief["supporting_evidence"][0]
    assert span["quote_match_status"] == "not_found_in_source_text"
    assert any("not found" in item for item in brief["information_to_confirm"])
