"""Build a reviewable lawyer-intake brief from notice extraction results.

This module deliberately does not offer legal conclusions. Extracted facts and
calculated dates remain drafts until a qualified person reviews the source.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
import unicodedata
import uuid


def _as_dict(value: Any) -> dict:
    if hasattr(value, "model_dump"):
        return value.model_dump()
    return value if isinstance(value, dict) else {}


def _page_number(value: Any) -> int | None:
    try:
        page = int(value)
        return page if page > 0 else None
    except (TypeError, ValueError):
        return None


def _normalise_quote(value: str) -> str:
    """Normalise Unicode and whitespace for conservative quote matching."""
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def _quote_status(quote: str, page_number: int | None, source_text_by_page: dict[int, str]) -> str:
    if not source_text_by_page or not any(str(text or "").strip() for text in source_text_by_page.values()):
        return "not_verifiable"
    if page_number is not None:
        source = source_text_by_page.get(page_number)
        if source is None or not str(source).strip():
            return "page_text_unavailable"
        return "matched_in_source_text" if _normalise_quote(quote) in _normalise_quote(source) else "not_found_in_source_text"
    for source in source_text_by_page.values():
        if _normalise_quote(quote) in _normalise_quote(source):
            return "matched_in_source_text"
    return "not_found_in_source_text"


def build_lawyer_brief(
    extraction: Any,
    deadlines: list[dict] | None = None,
    *,
    language: str = "en",
    source_text_by_page: dict[int, str] | None = None,
) -> dict:
    """Return a JSON-serializable lawyer-intake draft.

    The function does not determine legal validity or approve deadlines. Any
    calculated date is labelled as preliminary and must be checked by a lawyer.
    """
    ext = _as_dict(extraction)
    deadlines = deadlines or []
    deadline_by_label: dict[str, list[dict]] = {}
    for item in deadlines:
        label = str(item.get("label") or "").strip().casefold()
        deadline_by_label.setdefault(label, []).append(item)

    parties = []
    for raw in ext.get("parties") or []:
        party = _as_dict(raw)
        parties.append({
            "role": party.get("role"),
            "name": party.get("name"),
            "source_quote": party.get("original_text"),
            "page_number": _page_number(party.get("page_number")),
        })

    timeline = []
    for raw in ext.get("dates") or []:
        date = _as_dict(raw)
        label = str(date.get("label") or "Date mentioned")
        related = deadline_by_label.get(label.casefold(), [])
        assessment = related[0] if related else None
        timeline.append({
            "label": label,
            "date_as_written_iso": date.get("date"),
            "original_text": date.get("original_text"),
            "duration_days_as_written": date.get("duration_days"),
            "duration_from_as_written": date.get("duration_from"),
            "page_number": _page_number(date.get("page_number")),
            "preliminary_assessment": ({
                "due_date": assessment.get("due_date"),
                "days_left": assessment.get("days_left"),
                "basis": assessment.get("basis"),
                "assumed": bool(assessment.get("assumed")),
                "informational": bool(assessment.get("informational")),
                "legal_rule_verified": assessment.get("legal_rule_verified"),
                "status": "requires_lawyer_verification",
            } if assessment else None),
        })

    sections = []
    for raw in ext.get("sections_cited") or []:
        section = _as_dict(raw)
        sections.append({
            "act": section.get("act"),
            "section": section.get("section"),
            "source_quote": section.get("original_text"),
            "page_number": _page_number(section.get("page_number")),
        })

    evidence_spans = []
    for raw in ext.get("evidence_spans") or []:
        span = _as_dict(raw)
        quote = str(span.get("quote") or "").strip()
        if not quote:
            continue
        page_number = _page_number(span.get("page_number"))
        quote_status = _quote_status(quote, page_number, source_text_by_page or {})
        evidence_spans.append({
            "field": span.get("field"),
            "value": span.get("value"),
            "quote": quote,
            "page_number": page_number,
            # Exact matching against extractable PDF text is a useful check, not
            # proof of legal correctness. Human review remains required.
            "quote_match_status": quote_status,
            "verification_status": "requires_human_review",
        })

    urgency_flags = []
    if ext.get("mentions_arrest_or_warrant"):
        urgency_flags.append({
            "type": "mentions_arrest_or_warrant",
            "reason": "The extraction indicates a reference to arrest, a warrant or imprisonment. Confirm against the original.",
            "priority": "urgent_review",
        })
    if ext.get("mentions_domestic_violence"):
        urgency_flags.append({
            "type": "mentions_domestic_violence",
            "reason": "The extraction indicates a domestic-violence-related matter. Confirm safely with a qualified service.",
            "priority": "urgent_review",
        })
    for item in deadlines:
        if item.get("urgent") or item.get("overdue"):
            urgency_flags.append({
                "type": "date_needs_attention",
                "reason": item.get("label"),
                "date": item.get("due_date"),
                "priority": "review_promptly",
            })

    information_to_confirm = []
    if ext.get("readable") is False:
        information_to_confirm.append("The document was marked unreadable or incomplete.")
    if str(ext.get("doc_type_confidence") or "").casefold() == "low":
        information_to_confirm.append("Document type classification has low confidence.")
    if not evidence_spans:
        information_to_confirm.append("No supporting evidence spans were returned; check important facts against the original.")
    elif any(span["quote_match_status"] == "not_found_in_source_text" for span in evidence_spans):
        information_to_confirm.append("Some extracted quotations were not found in the available source text; review these fields against the original.")
    elif any(span["quote_match_status"] in ("not_verifiable", "page_text_unavailable") for span in evidence_spans):
        information_to_confirm.append("Some quotations could not be independently checked against extractable source text; verify them against the original.")
    if not parties:
        information_to_confirm.append("Parties could not be reliably identified.")
    for item in deadlines:
        if item.get("due_date") is None and not item.get("informational"):
            information_to_confirm.append(
                f"Confirm the trigger date and applicable rule for: {item.get('label') or 'unresolved date'}."
            )

    return {
        "schema_version": "1.0",
        "brief_id": uuid.uuid4().hex[:12],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "language": language,
        "document": {
            "type": ext.get("doc_type"),
            "type_confidence": ext.get("doc_type_confidence"),
            "readable": ext.get("readable"),
            "notice_language": ext.get("notice_language"),
            "issuing_authority": ext.get("issuing_authority"),
            "case_number": ext.get("case_number"),
        },
        "review_status": "draft_pending_lawyer_review",
        "summary": ext.get("summary_en"),
        "parties": parties,
        "demands_or_claims": ext.get("demands") or [],
        "dates_and_periods": timeline,
        "legal_provisions_cited": sections,
        "supporting_evidence": evidence_spans,
        "urgency_flags": urgency_flags,
        "information_to_confirm": list(dict.fromkeys(information_to_confirm)),
        "lawyer_review_checklist": [
            "Compare all names, amounts, dates and quoted passages with the original document.",
            "Confirm document type, jurisdiction and the recipient's role.",
            "Verify the legal basis and trigger for every deadline before advising the client.",
            "Identify missing pages, attachments, agreements or supporting records.",
            "Confirm the client's account of events and determine appropriate next steps.",
        ],
        "important_limitations": [
            "This is an AI-generated intake draft, not a legal opinion or approved legal advice.",
            "Evidence quotes and page numbers are model-extracted pointers and must be checked against the original.",
            "A date or period stated in the notice does not itself establish that a legal deadline is valid.",
            "Do not send this brief outside the authorised matter team without the client's permission.",
        ],
    }
