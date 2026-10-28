"""Tools wrapping the rules/ utilities for use by the ADK agent.

Plain Python functions with type hints and docstrings. These are registered
as tools on the Agent; the ADK will wrap them automatically.
"""
from datetime import date
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

    today = date.today().isoformat()
    items = deadlines_mod.compute_deadlines(doc_type, dates, received_date or None, today)
    return json.dumps(items, ensure_ascii=False)


def check_legal_aid_tool(answers_json: str) -> str:
    """Check legal aid eligibility.

    Args:
        answers_json: JSON string with answers (e.g. categories and 'annual_income' and 'income_limit')

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


def get_legal_context_tool(doc_type: str) -> str:
    """Return the knowledge notes for a document type.

    Reads knowledge/<doc_type>.md and returns the file contents, or
    returns 'No notes available' if the file is missing.
    """
    base = Path(__file__).parent.parent / 'knowledge'
    path = base / f"{doc_type}.md"
    if not path.exists():
        return "No notes available"
    try:
        return path.read_text(encoding='utf-8')
    except Exception:
        return "No notes available"
