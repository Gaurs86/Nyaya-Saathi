import json
import pytest

import review_store


@pytest.fixture
def db(tmp_path, monkeypatch):
    monkeypatch.setattr(review_store, "DB_PATH", tmp_path / "review.sqlite3")
    review_store.init_db()
    return review_store.DB_PATH


def sample_brief():
    return {
        "schema_version": "1.0",
        "brief_id": "brief-test",
        "language": "en",
        "document": {"type": "eviction_or_rent", "type_confidence": "high", "readable": True},
        "summary": "The notice claims unpaid rent.",
        "parties": [{"role": "recipient", "name": "Test Person", "source_quote": "To Test Person", "page_number": 1}],
        "demands_or_claims": ["Pay the claimed rent"],
        "dates_and_periods": [{"label": "payment period", "original_text": "within 15 days", "page_number": 1}],
        "legal_provisions_cited": [],
        "supporting_evidence": [{"field": "demands", "quote": "Pay the claimed rent", "page_number": 1, "verification_status": "requires_human_review"}],
        "urgency_flags": [],
        "information_to_confirm": ["Confirm the receipt date"],
        "lawyer_review_checklist": ["Check all dates against the source"],
        "important_limitations": ["This is a draft, not a legal opinion."],
    }


def test_create_case_starts_pending_and_records_event(db):
    case = review_store.create_case(sample_brief(), "Rental notice", "reviewer-A")
    assert case["status"] == "pending_review"
    assert case["revision"] == 1
    assert case["brief"]["review_status"] == "draft_pending_lawyer_review"
    events = review_store.get_events(case["case_id"])
    assert events[0]["action"] == "created"
    assert events[0]["details"]["stored_original_upload"] is False


def test_only_allowlisted_fields_can_be_edited(db):
    case = review_store.create_case(sample_brief())
    with pytest.raises(ValueError, match="cannot be edited"):
        review_store.update_brief(
            case["case_id"],
            {"status": "approved"},
            expected_revision=1,
        )


def test_approve_requires_all_review_confirmations(db):
    case = review_store.create_case(sample_brief())
    with pytest.raises(ValueError, match="Approval requires confirmation"):
        review_store.decide_case(
            case["case_id"], "approved", expected_revision=1,
            confirmations={"source_checked": True},
        )


def test_approval_then_correction_resets_status(db):
    case = review_store.create_case(sample_brief(), actor_label="A")
    approved = review_store.decide_case(
        case["case_id"], "approved", expected_revision=1,
        actor_label="A", note="Reviewed.",
        confirmations={
            "source_checked": True,
            "facts_checked": True,
            "deadline_reviewed": True,
        },
    )
    assert approved["status"] == "approved"
    assert approved["brief"]["reviewer_approval"]["reviewer_label"] == "A"

    corrected = review_store.update_brief(
        case["case_id"], {"summary": "Corrected summary"},
        expected_revision=2, actor_label="B", note="Fixed wording.",
    )
    assert corrected["status"] == "pending_review"
    assert corrected["revision"] == 3
    assert corrected["brief"]["review_status"] == "draft_pending_lawyer_review"
    assert "reviewer_approval" not in corrected["brief"]
    events = review_store.get_events(case["case_id"])
    assert [event["action"] for event in events][:2] == ["fields_corrected", "approved"]
    correction = events[0]["details"]
    assert correction["approval_reset"] is True
    assert correction["changes"]["summary"]["before"] == "The notice claims unpaid rent."


def test_revision_conflict_prevents_overwriting_newer_edits(db):
    case = review_store.create_case(sample_brief())
    review_store.update_brief(case["case_id"], {"summary": "First edit"}, 1)
    with pytest.raises(RuntimeError, match="revision_conflict"):
        review_store.update_brief(case["case_id"], {"summary": "Stale edit"}, 1)


def test_changes_requested_requires_reason(db):
    case = review_store.create_case(sample_brief())
    with pytest.raises(ValueError, match="short note"):
        review_store.decide_case(
            case["case_id"], "changes_requested", expected_revision=1, note="   "
        )


def test_delete_removes_case_and_event_history(db):
    case = review_store.create_case(sample_brief())
    case_id = case["case_id"]
    assert review_store.delete_case(case_id) is True
    assert review_store.get_case(case_id) is None
    assert review_store.get_events(case_id) is None


def test_unknown_status_filter_is_rejected(db):
    with pytest.raises(ValueError, match="Unsupported case status"):
        review_store.list_cases(status="made_up")


def test_shared_token_is_disabled_when_not_configured(monkeypatch):
    monkeypatch.delenv("REVIEWER_API_TOKEN", raising=False)
    assert review_store.reviewer_token_matches("anything") is False


def test_shared_token_uses_constant_time_comparison(monkeypatch):
    monkeypatch.setenv("REVIEWER_API_TOKEN", "example-secret")
    assert review_store.reviewer_token_matches("example-secret") is True
    assert review_store.reviewer_token_matches("wrong") is False
