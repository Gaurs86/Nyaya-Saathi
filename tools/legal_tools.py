"""Tools wrapping the rules/ utilities for use by the ADK agent.

Plain Python functions with type hints and docstrings. These are registered
as tools on the Agent; the ADK will wrap them automatically.
"""
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import List, Dict, Any
import json

from rules import deadlines as deadlines_mod
from rules import legal_aid as legal_aid_mod
from rules import dlsa as dlsa_mod
from pathlib import Path


def compute_deadlines_tool(doc_type: str, dates_json: str, received_date: str = "") -> str:
    """Compute deadlines for a document type.

    Args:
        doc_type: document type key as in rules/deadline_rules.yaml
        dates_json: JSON string encoding a list of date dicts as in the extraction schema
        received_date: optional ISO date string (YYYY-MM-DD) when the notice was received

    Returns:
        JSON string with the list of deadline items (as produced by rules.deadlines.compute_deadlines)
    """
    try:
        dates = json.loads(dates_json) if dates_json else []
    except Exception:
        dates = []

    today = datetime.now(ZoneInfo('Asia/Kolkata')).date().isoformat()
    items = deadlines_mod.compute_deadlines(doc_type, dates, received_date or None, today)
    return json.dumps(items, ensure_ascii=False)


def check_legal_aid_tool(answers_json: str) -> str:
    """Check legal aid eligibility.

    Args:
        answers_json: JSON string of true/false answers for these keys: sc_st, woman, child, person_with_disability,
            victim_of_trafficking_or_begar, victim_of_mass_disaster, industrial_workman, person_in_custody,
            plus optional annual_income (a number). Never include an income limit: it comes from the rules file.

    Returns:
        JSON string with the eligibility result {eligible, reasons, next_step}
    """
    try:
        answers = json.loads(answers_json) if answers_json else {}
    except Exception:
        answers = {}
    result = legal_aid_mod.check_eligibility(answers)
    return json.dumps(result, ensure_ascii=False)


def find_legal_aid_center_tool(district: str) -> str:
    """Find DLSA centers for a district.

    Returns a JSON string with keys: found (bool), entries (list), nalasa_helpline.
    """
    result = dlsa_mod.find_center(district or "")
    return json.dumps(result, ensure_ascii=False)


SUPPORTED_DOC_TYPES = {
    "court_summons",
    "eviction_or_rent",
    "cheque_bounce_138",
    "labour_or_wage",
    "scheme_rejection",
    "family_or_maintenance",
    "other",
}


def get_legal_context_tool(doc_type: str) -> str:
    """Return reviewed notes for a supported document type.

    Treat doc_type as untrusted model output: accept only an explicit allowlist
    before constructing a path, so arbitrary paths cannot be requested.
    """
    if doc_type not in SUPPORTED_DOC_TYPES:
        return "No reviewed notes available for this document type."

    base = Path(__file__).parent.parent / "knowledge"
    path = (base / f"{doc_type}.md").resolve()
    if path.parent != base.resolve() or not path.is_file():
        return "No reviewed notes available for this document type."
    try:
        content = path.read_text(encoding="utf-8")
        if not content.strip() or "TO BE WRITTEN" in content.upper():
            return "No reviewed notes available for this document type."
        return content
    except Exception:
        return "No reviewed notes available for this document type."
