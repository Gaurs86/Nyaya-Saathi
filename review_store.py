"""Local, access-controlled prototype storage for lawyer review cases.

Only the extracted intake brief and review metadata are stored; original uploads
are not stored here. The database contains sensitive personal data and must be
kept on a protected host. The shared-token auth is suitable for a private demo,
not a public multi-user legal service.
"""
from __future__ import annotations

import hmac
import json
import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_DB = Path(__file__).parent / ".nyaya_saathi" / "review.sqlite3"
DB_PATH = Path(os.getenv("REVIEW_DB_PATH", str(DEFAULT_DB)))
CASE_STATUSES = {"pending_review", "changes_requested", "approved", "rejected"}
EDITABLE_FIELDS = {
    "summary",
    "parties",
    "demands_or_claims",
    "dates_and_periods",
    "legal_provisions_cited",
    "information_to_confirm",
}
APPROVAL_CONFIRMATIONS = {"source_checked", "facts_checked", "deadline_reviewed"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    try:
        os.chmod(DB_PATH.parent, 0o700)
    except OSError:
        pass
    conn = sqlite3.connect(str(DB_PATH), timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 10000")
    return conn


@contextmanager
def _db():
    conn = _connect()
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def init_db() -> None:
    with _db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS review_cases (
                case_id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                doc_type TEXT,
                status TEXT NOT NULL,
                revision INTEGER NOT NULL DEFAULT 1,
                brief_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                created_by TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS review_events (
                event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_id TEXT NOT NULL,
                actor_label TEXT NOT NULL,
                action TEXT NOT NULL,
                event_at TEXT NOT NULL,
                details_json TEXT NOT NULL,
                FOREIGN KEY(case_id) REFERENCES review_cases(case_id) ON DELETE CASCADE
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_review_cases_status_updated ON review_cases(status, updated_at)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_review_events_case_id ON review_events(case_id, event_id)")
    if DB_PATH.exists():
        try:
            os.chmod(DB_PATH, 0o600)
        except OSError:
            pass


def _json_dumps(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(",", ":"))


def _case_from_row(row: sqlite3.Row, *, include_brief: bool = True) -> dict:
    result = {
        "case_id": row["case_id"],
        "title": row["title"],
        "doc_type": row["doc_type"],
        "status": row["status"],
        "revision": row["revision"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "created_by": row["created_by"],
    }
    if include_brief:
        result["brief"] = json.loads(row["brief_json"])
    return result


def _add_event(conn: sqlite3.Connection, case_id: str, actor: str, action: str, details: dict) -> None:
    conn.execute(
        "INSERT INTO review_events(case_id, actor_label, action, event_at, details_json) VALUES (?, ?, ?, ?, ?)",
        (case_id, actor, action, utc_now(), _json_dumps(details)),
    )


def create_case(brief: dict, title: str = "", actor_label: str = "reviewer") -> dict:
    if not isinstance(brief, dict):
        raise ValueError("Brief must be a JSON object.")
    if len(_json_dumps(brief).encode("utf-8")) > 500_000:
        raise ValueError("Brief is too large (maximum 500 KB).")
    doc = brief.get("document") if isinstance(brief.get("document"), dict) else {}
    doc_type = str(doc.get("type") or "unknown")[:80]
    safe_title = (title or f"{doc_type.replace('_', ' ').title()} intake").strip()
    if not safe_title or len(safe_title) > 120:
        raise ValueError("Title must be between 1 and 120 characters.")

    case_id = uuid.uuid4().hex
    now = utc_now()
    stored_brief = json.loads(_json_dumps(brief))
    stored_brief["review_status"] = "draft_pending_lawyer_review"
    stored_brief.pop("reviewer_approval", None)
    with _db() as conn:
        conn.execute(
            """INSERT INTO review_cases
            (case_id, title, doc_type, status, revision, brief_json, created_at, updated_at, created_by)
            VALUES (?, ?, ?, 'pending_review', 1, ?, ?, ?, ?)""",
            (case_id, safe_title, doc_type, _json_dumps(stored_brief), now, now, actor_label[:80]),
        )
        _add_event(conn, case_id, actor_label[:80], "created", {
            "status": "pending_review",
            "stored_original_upload": False,
            "note": "Only the extracted brief was stored; the original uploaded file was not stored by this review store.",
        })
    return get_case(case_id)


def list_cases(status: str | None = None, limit: int = 100) -> list[dict]:
    if status is not None and status not in CASE_STATUSES:
        raise ValueError("Unsupported case status.")
    limit = max(1, min(int(limit), 200))
    with _db() as conn:
        if status:
            rows = conn.execute(
                "SELECT * FROM review_cases WHERE status=? ORDER BY updated_at DESC LIMIT ?",
                (status, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM review_cases ORDER BY updated_at DESC LIMIT ?", (limit,)
            ).fetchall()
        return [_case_from_row(row, include_brief=False) for row in rows]


def get_case(case_id: str) -> dict | None:
    with _db() as conn:
        row = conn.execute("SELECT * FROM review_cases WHERE case_id=?", (case_id,)).fetchone()
        return _case_from_row(row) if row else None


def get_events(case_id: str) -> list[dict] | None:
    with _db() as conn:
        exists = conn.execute("SELECT 1 FROM review_cases WHERE case_id=?", (case_id,)).fetchone()
        if not exists:
            return None
        rows = conn.execute(
            "SELECT event_id, actor_label, action, event_at, details_json FROM review_events WHERE case_id=? ORDER BY event_id DESC LIMIT 100",
            (case_id,),
        ).fetchall()
        return [{
            "event_id": row["event_id"],
            "actor_label": row["actor_label"],
            "action": row["action"],
            "event_at": row["event_at"],
            "details": json.loads(row["details_json"]),
        } for row in rows]


def update_brief(
    case_id: str,
    changes: dict,
    expected_revision: int,
    actor_label: str = "reviewer",
    note: str = "",
) -> dict | None:
    if not isinstance(changes, dict) or not changes:
        raise ValueError("Provide at least one field to update.")
    unknown = set(changes) - EDITABLE_FIELDS
    if unknown:
        raise ValueError("Fields cannot be edited directly: " + ", ".join(sorted(unknown)))
    if not isinstance(expected_revision, int) or expected_revision < 1:
        raise ValueError("expected_revision must be a positive integer.")
    if len(_json_dumps(changes).encode("utf-8")) > 250_000:
        raise ValueError("The proposed corrections are too large.")

    for key in ("parties", "demands_or_claims", "dates_and_periods", "legal_provisions_cited", "information_to_confirm"):
        if key in changes and not isinstance(changes[key], list):
            raise ValueError(f"{key} must be a JSON list.")
    if "summary" in changes and not isinstance(changes["summary"], str):
        raise ValueError("summary must be text.")
    for key in ("parties", "demands_or_claims", "dates_and_periods", "legal_provisions_cited", "information_to_confirm"):
        if key in changes and len(changes[key]) > 200:
            raise ValueError(f"{key} may contain at most 200 items.")

    now = utc_now()
    with _db() as conn:
        row = conn.execute("SELECT * FROM review_cases WHERE case_id=?", (case_id,)).fetchone()
        if not row:
            return None
        if row["revision"] != expected_revision:
            raise RuntimeError("revision_conflict")
        previous = json.loads(row["brief_json"])
        updated = dict(previous)
        for key, value in changes.items():
            old_value = updated.get(key)
            if old_value != value:
                updated[key] = value
        changed_fields = [key for key in changes if previous.get(key) != updated.get(key)]
        if not changed_fields:
            return _case_from_row(row)
        if "dates_and_periods" in changed_fields:
            # A changed trigger/date must never retain a stale calculated date.
            # We do not automatically recalculate legal deadlines in the review UI.
            reset_assessment = {
                "due_date": None,
                "days_left": None,
                "basis": "Date/period fields were corrected during review. Previous calculation invalidated; no new legal deadline has been calculated.",
                "assumed": False,
                "informational": False,
                "legal_rule_verified": None,
                "status": "requires_lawyer_verification",
            }
            safe_dates = []
            for entry in updated.get("dates_and_periods") or []:
                if not isinstance(entry, dict):
                    continue
                safe_entry = dict(entry)
                safe_entry["preliminary_assessment"] = dict(reset_assessment)
                safe_dates.append(safe_entry)
            updated["dates_and_periods"] = safe_dates
        # A correction invalidates the current approval; require a fresh review.
        updated["review_status"] = "draft_pending_lawyer_review"
        updated.pop("reviewer_approval", None)
        new_revision = row["revision"] + 1
        new_status = "pending_review"
        updated.setdefault("reviewer_corrections", []).append({
            "revision": new_revision,
            "corrected_at": now,
            "reviewer_label": actor_label[:80],
            "fields": changed_fields,
            "note": note[:2000],
        })
        # Update with the expected revision in SQL as well as checking it above;
        # a concurrent reviewer cannot overwrite a newer correction.
        cursor = conn.execute(
            "UPDATE review_cases SET brief_json=?, revision=?, status=?, updated_at=? WHERE case_id=? AND revision=?",
            (_json_dumps(updated), new_revision, new_status, now, case_id, expected_revision),
        )
        if cursor.rowcount != 1:
            raise RuntimeError("revision_conflict")
        audit_changes = {
            key: {"before": previous.get(key), "after": updated.get(key)}
            for key in changed_fields
        }
        _add_event(conn, case_id, actor_label[:80], "fields_corrected", {
            "fields": changed_fields,
            "changes": audit_changes,
            "note": note[:2000],
            "previous_status": row["status"],
            "new_status": new_status,
            "revision": new_revision,
            "approval_reset": row["status"] == "approved",
        })
    return get_case(case_id)


def decide_case(
    case_id: str,
    decision: str,
    expected_revision: int,
    actor_label: str = "reviewer",
    note: str = "",
    confirmations: dict | None = None,
) -> dict | None:
    if decision not in {"approved", "changes_requested", "rejected"}:
        raise ValueError("Decision must be approved, changes_requested or rejected.")
    if not isinstance(expected_revision, int) or expected_revision < 1:
        raise ValueError("expected_revision must be a positive integer.")
    if len(note) > 2000:
        raise ValueError("Review note must be 2000 characters or less.")
    confirmations = confirmations or {}
    if decision == "approved":
        missing = [name for name in sorted(APPROVAL_CONFIRMATIONS) if confirmations.get(name) is not True]
        if missing:
            raise ValueError("Approval requires confirmation of: " + ", ".join(missing))
    if decision == "changes_requested" and not note.strip():
        raise ValueError("Add a short note describing the requested changes.")

    now = utc_now()
    actor = (actor_label or "reviewer").strip()[:80] or "reviewer"
    with _db() as conn:
        row = conn.execute("SELECT * FROM review_cases WHERE case_id=?", (case_id,)).fetchone()
        if not row:
            return None
        if row["revision"] != expected_revision:
            raise RuntimeError("revision_conflict")
        brief = json.loads(row["brief_json"])
        brief["review_status"] = {
            "approved": "approved_by_reviewer",
            "changes_requested": "changes_requested",
            "rejected": "rejected_by_reviewer",
        }[decision]
        if decision == "approved":
            brief["reviewer_approval"] = {
                "reviewer_label": actor,
                "reviewed_at": now,
                "confirmations": {name: True for name in sorted(APPROVAL_CONFIRMATIONS)},
                "note": note.strip(),
                "meaning": "Reviewer approved this brief for their workflow; this is not a legal guarantee or a substitute for professional judgment.",
            }
        else:
            brief.pop("reviewer_approval", None)
        cursor = conn.execute(
            "UPDATE review_cases SET brief_json=?, status=?, revision=revision+1, updated_at=? WHERE case_id=? AND revision=?",
            (_json_dumps(brief), decision, now, case_id, expected_revision),
        )
        if cursor.rowcount != 1:
            raise RuntimeError("revision_conflict")
        _add_event(conn, case_id, actor, decision, {
            "note": note.strip(),
            "confirmations": confirmations if decision == "approved" else {},
            "from_status": row["status"],
            "to_status": decision,
            "revision": row["revision"] + 1,
        })
    return get_case(case_id)


def delete_case(case_id: str, actor_label: str = "reviewer") -> bool:
    """Hard-delete a case and its event history. This also removes its audit trail."""
    with _db() as conn:
        row = conn.execute("SELECT 1 FROM review_cases WHERE case_id=?", (case_id,)).fetchone()
        if not row:
            return False
        conn.execute("DELETE FROM review_cases WHERE case_id=?", (case_id,))
        # FK cascade removes events; deliberate data deletion does not leave PII in logs.
    return True


def reviewer_token_matches(candidate: str | None) -> bool:
    expected = os.getenv("REVIEWER_API_TOKEN", "")
    if not expected or not candidate:
        return False
    return hmac.compare_digest(expected.encode("utf-8"), candidate.encode("utf-8"))
