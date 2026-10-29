import pytest
from fastapi.testclient import TestClient

import app as app_module
import review_store


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(review_store, "DB_PATH", tmp_path / "review.sqlite3")
    monkeypatch.setenv("REVIEWER_API_TOKEN", "test-review-token")
    with TestClient(app_module.app) as test_client:
        yield test_client


def brief():
    return {
        "schema_version": "1.0",
        "brief_id": "api-test",
        "language": "en",
        "document": {"type": "eviction_or_rent", "type_confidence": "high", "readable": True},
        "summary": "The notice claims unpaid rent.",
        "parties": [],
        "demands_or_claims": ["Pay claimed rent"],
        "dates_and_periods": [],
        "legal_provisions_cited": [],
        "supporting_evidence": [],
        "urgency_flags": [],
        "information_to_confirm": [],
        "lawyer_review_checklist": ["Check source"],
        "important_limitations": ["Draft only"],
    }


def headers():
    return {"X-Reviewer-Token": "test-review-token", "X-Reviewer-Label": "test-reviewer"}


def test_review_workspace_serves_page(client):
    response = client.get("/review")
    assert response.status_code == 200
    assert "Lawyer Review Workspace" in response.text


def test_review_api_rejects_missing_or_invalid_token(client):
    assert client.get("/review/cases").status_code == 401
    assert client.get("/review/cases", headers={"X-Reviewer-Token": "wrong"}).status_code == 401


def test_create_correct_approve_export_flow(client):
    created = client.post(
        "/review/cases",
        headers=headers(),
        json={"brief": brief(), "title": "Test intake"},
    )
    assert created.status_code == 201, created.text
    case = created.json()
    case_id = case["case_id"]
    assert case["status"] == "pending_review"

    # Reviewed deliverables are not available for a draft.
    draft_export = client.get(f"/review/cases/{case_id}/export?format=docx", headers=headers())
    assert draft_export.status_code == 409

    correction = client.put(
        f"/review/cases/{case_id}/brief",
        headers=headers(),
        json={"expected_revision": 1, "changes": {"summary": "Corrected summary"}, "note": "Clarified summary."},
    )
    assert correction.status_code == 200
    assert correction.json()["status"] == "pending_review"
    assert correction.json()["revision"] == 2

    # Approval requires all three checks.
    denied = client.post(
        f"/review/cases/{case_id}/decision",
        headers=headers(),
        json={"decision": "approved", "expected_revision": 2, "confirmations": {"source_checked": True}},
    )
    assert denied.status_code == 400

    approved = client.post(
        f"/review/cases/{case_id}/decision",
        headers=headers(),
        json={
            "decision": "approved",
            "expected_revision": 2,
            "note": "Checked against test sample.",
            "confirmations": {"source_checked": True, "facts_checked": True, "deadline_reviewed": True},
        },
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["status"] == "approved"

    pdf = client.get(f"/review/cases/{case_id}/export?format=pdf", headers=headers())
    assert pdf.status_code == 200
    assert pdf.content.startswith(b"%PDF-")

    docx = client.get(f"/review/cases/{case_id}/export?format=docx", headers=headers())
    assert docx.status_code == 200
    assert docx.content.startswith(b"PK")

    events = client.get(f"/review/cases/{case_id}/events", headers=headers()).json()["events"]
    assert [event["action"] for event in events][:3] == ["approved", "fields_corrected", "created"]


def test_correction_invalidates_prior_approval(client):
    created = client.post("/review/cases", headers=headers(), json={"brief": brief()}).json()
    case_id = created["case_id"]
    approved = client.post(
        f"/review/cases/{case_id}/decision",
        headers=headers(),
        json={"decision": "approved", "expected_revision": 1,
              "confirmations": {"source_checked": True, "facts_checked": True, "deadline_reviewed": True}},
    )
    assert approved.status_code == 200
    corrected = client.put(
        f"/review/cases/{case_id}/brief",
        headers=headers(),
        json={"expected_revision": 2, "changes": {"summary": "Correction after approval"}},
    )
    assert corrected.status_code == 200
    assert corrected.json()["status"] == "pending_review"
    assert "reviewer_approval" not in corrected.json()["brief"]


def test_delete_requires_explicit_confirmation(client):
    created = client.post("/review/cases", headers=headers(), json={"brief": brief()}).json()
    case_id = created["case_id"]
    assert client.delete(f"/review/cases/{case_id}", headers=headers()).status_code == 400
    assert client.delete(f"/review/cases/{case_id}?confirm=true", headers=headers()).status_code == 200
