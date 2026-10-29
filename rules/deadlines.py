"""Conservative date extraction and arithmetic for legal-notice review.

This module does not decide whether a stated period is legally enforceable.
Unverified legal-rule fallbacks are never applied. Dates calculated from a
stated period remain provisional and require professional review.
"""
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

import yaml

RULES_PATH = Path(__file__).parent / 'deadline_rules.yaml'
with open(RULES_PATH, 'r', encoding='utf-8') as fh:
    DEADLINE_RULES = yaml.safe_load(fh) or {}

URGENT_DAYS = 7
INFO_WORDS = ('notice date', 'date of notice', 'agreement', 'issued', 'dated')
ACTION_WORDS = ('hearing', 'appear', 'deadline', 'due date', 'reply by', 'respond by',
                'submit by', 'file by', 'pay by', 'payment deadline')


def _parse_date(value) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.strptime(str(value)[:10], '%Y-%m-%d')
    except (TypeError, ValueError):
        return None


def _days(value) -> Optional[int]:
    if value is None or isinstance(value, bool):
        return None
    try:
        number = int(value)
        return number if number > 0 else None
    except (TypeError, ValueError):
        return None


def _item(
    label: str,
    due_dt: Optional[datetime],
    today_dt: Optional[datetime],
    basis: str,
    *,
    assumed: bool = False,
    informational: bool = False,
    calculation_status: str = "unknown",
    legal_rule_verified: Optional[bool] = None,
    calculate_urgency: bool = False,
) -> Dict:
    days_left = (due_dt - today_dt).days if due_dt and today_dt else None
    known = due_dt is not None and days_left is not None
    return {
        "label": label,
        "due_date": due_dt.strftime("%Y-%m-%d") if due_dt else None,
        "days_left": days_left,
        "urgent": (0 <= days_left <= URGENT_DAYS and not informational)
                  if known and calculate_urgency else None,
        "overdue": (days_left < 0 and not informational)
                   if known and calculate_urgency else None,
        "assumed": assumed,
        "informational": informational,
        "basis": basis,
        "calculation_status": calculation_status,
        "legal_rule_verified": legal_rule_verified,
        "requires_lawyer_verification": not informational,
    }


def _notice_date(dates: List[Dict]) -> Optional[datetime]:
    for item in dates:
        if "notice" in str(item.get("label") or "").lower():
            parsed = _parse_date(item.get("date"))
            if parsed:
                return parsed
    return None


def _relative(
    label: str,
    days: int,
    start: str,
    received_dt: Optional[datetime],
    notice_dt: Optional[datetime],
    today_dt: Optional[datetime],
    quote: Optional[str] = None,
) -> Dict:
    """Perform provisional arithmetic only when the stated trigger date is known."""
    quote_part = f' ("{quote}")' if quote else ""
    if start == "notice_date":
        if notice_dt is None:
            return _item(
                label, None, today_dt,
                "The notice date is missing; no date calculated." + quote_part,
                calculation_status="missing_trigger_date",
            )
        return _item(
            label, notice_dt + timedelta(days=days), today_dt,
            f"{days} days from the notice date (arithmetic only; legal effect not verified){quote_part}",
            calculation_status="provisional_from_stated_notice_date",
            calculate_urgency=False,
        )

    if received_dt is None:
        return _item(
            label, None, today_dt,
            "The actual receipt/service date was not provided; no date calculated." + quote_part,
            calculation_status="missing_receipt_date",
        )
    return _item(
        label, received_dt + timedelta(days=days), today_dt,
        f"{days} days from the user-provided receipt date (arithmetic only; legal effect not verified){quote_part}",
        calculation_status="provisional_from_user_receipt_date",
        calculate_urgency=False,
    )


def compute_deadlines(
    doc_type: str,
    dates: List[Dict],
    received_date: Optional[str],
    today: str,
) -> List[Dict]:
    """Return document dates and cautious provisional calculations.

    Legal-rule calculations are enabled only when both the document-type rule
    and the individual rule are explicitly marked verified=True and provide
    review metadata. The bundled rules are currently unverified, so none are
    applied. A stated period from receipt is never anchored to the notice date
    just because the actual receipt date is unknown.
    """
    rules = DEADLINE_RULES.get(doc_type) or {}
    dates = dates or []
    today_dt = _parse_date(today)
    received_dt = _parse_date(received_date)
    notice_dt = _notice_date(dates)
    result: List[Dict] = []
    stated_period = False

    for item in dates:
        label = str(item.get("label") or "Date mentioned")
        original_text = item.get("original_text")
        due_dt = _parse_date(item.get("date"))
        duration = _days(item.get("duration_days"))

        if due_dt:
            label_lower = label.lower()
            informational = any(word in label_lower for word in INFO_WORDS)
            action_date = any(word in label_lower for word in ACTION_WORDS)
            result.append(_item(
                label, due_dt, today_dt,
                f'Date stated in document: "{original_text}"',
                informational=informational,
                calculation_status="date_stated_in_document",
                calculate_urgency=action_date and not informational,
            ))
        elif duration:
            stated_period = True
            start = item.get("duration_from")
            if start not in ("notice_date", "receipt"):
                start = "receipt"  # conservative: require the receipt date if no trigger is stated
            result.append(_relative(
                label, duration, start, received_dt, notice_dt, today_dt,
                quote=original_text,
            ))
        else:
            result.append(_item(
                label, None, today_dt,
                f'Date/period was unreadable or not machine-resolvable: "{original_text}"',
                calculation_status="unreadable_or_unresolved",
            ))

    # Never apply the bundled fallback rules while unverified.
    category_verified = rules.get("verified") is True and bool(
        rules.get("source_url") and rules.get("reviewed_at")
    )
    if category_verified:
        for rule in rules.get("relative_deadlines") or []:
            if rule.get("verified") is not True:
                continue
            if not rule.get("source_url") or not rule.get("reviewed_at"):
                continue
            if rule.get("fallback") and stated_period:
                continue
            days = _days(rule.get("days"))
            if not days:
                continue
            item = _relative(
                str(rule.get("label") or "Verified rule-based period"),
                days,
                str(rule.get("from") or "receipt"),
                received_dt,
                notice_dt,
                today_dt,
            )
            item["legal_rule_verified"] = True
            item["calculation_status"] = "computed_from_lawyer_reviewed_rule"
            result.append(item)

    return result
