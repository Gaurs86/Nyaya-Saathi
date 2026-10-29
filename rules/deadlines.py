"""Compute deadlines from the notice's own dates and stated periods, plus rules in deadline_rules.yaml.

No AI calls. Each item returned:
  {label, due_date, days_left, urgent, overdue, assumed, informational, basis}
  urgent        due within the next 7 days (not yet passed)
  overdue       due date already passed
  assumed       receipt date was not given, so the notice date was used (the earliest likely receipt)
  informational a date in the document that is not a deadline (e.g. the notice date)
"""
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

import yaml

RULES_PATH = Path(__file__).parent / 'deadline_rules.yaml'

with open(RULES_PATH, 'r', encoding='utf-8') as fh:
    DEADLINE_RULES = yaml.safe_load(fh)

URGENT_DAYS = 7
INFO_WORDS = ('notice date', 'date of notice', 'agreement', 'issued', 'dated')


def _parse_date(d) -> Optional[datetime]:
    if not d:
        return None
    try:
        return datetime.strptime(str(d)[:10], '%Y-%m-%d')
    except Exception:
        return None


def _days(n) -> Optional[int]:
    try:
        if n is None or isinstance(n, bool):
            return None
        n = int(n)
        return n if n > 0 else None
    except Exception:
        return None


def _item(label, due_dt, today_dt, basis, assumed=False, informational=False) -> Dict:
    days_left = (due_dt - today_dt).days if (due_dt and today_dt) else None
    known = due_dt is not None and days_left is not None
    return {
        'label': label,
        'due_date': due_dt.strftime('%Y-%m-%d') if due_dt else None,
        'days_left': days_left,
        'urgent': (0 <= days_left <= URGENT_DAYS and not informational) if known else None,
        'overdue': (days_left < 0 and not informational) if known else None,
        'assumed': assumed,
        'informational': informational,
        'basis': basis,
    }


def _notice_date(dates: List[Dict]) -> Optional[datetime]:
    for d in dates:
        if 'notice' in (d.get('label') or '').lower():
            dt = _parse_date(d.get('date'))
            if dt:
                return dt
    return None


def _relative(label, days, start, received_dt, notice_dt, today_dt, quote=None) -> Dict:
    q = f' ("{quote}")' if quote else ''
    if start == 'notice_date':
        if notice_dt:
            return _item(label, notice_dt + timedelta(days=days), today_dt, f'{days} days from the notice date{q}')
        return _item(label, None, today_dt, 'ask user when the notice date is (missing from document)')
    # Default: counted from receipt of the notice
    if received_dt:
        return _item(label, received_dt + timedelta(days=days), today_dt, f'{days} days from receipt{q}')
    if notice_dt:
        return _item(label, notice_dt + timedelta(days=days), today_dt,
                     f'{days} days counted from the notice date, assuming it was received that day; '
                     f'ask user for the real receipt date{q}', assumed=True)
    return _item(label, None, today_dt, 'ask user when they received the notice')


def compute_deadlines(doc_type: str, dates: List[Dict], received_date: Optional[str], today: str) -> List[Dict]:
    """Args: doc_type key from deadline_rules.yaml; dates from the extraction (label, date, original_text,
    optional duration_days / duration_from); received_date YYYY-MM-DD or None; today YYYY-MM-DD."""
    rules = DEADLINE_RULES.get(doc_type) or {}
    dates = dates or []
    today_dt, received_dt = _parse_date(today), _parse_date(received_date)
    notice_dt = _notice_date(dates)
    result, stated_period = [], False

    for d in dates:
        label = d.get('label') or 'date'
        orig = d.get('original_text')
        due_dt = _parse_date(d.get('date'))
        n = _days(d.get('duration_days'))
        if due_dt:
            info = any(w in label.lower() for w in INFO_WORDS)
            kind = 'informational date in document' if info else 'explicit date from document'
            result.append(_item(label, due_dt, today_dt, f'{kind}: "{orig}"', informational=info))
        elif n:
            stated_period = True
            start = 'notice_date' if d.get('duration_from') == 'notice_date' else 'receipt'
            result.append(_relative(label, n, start, received_dt, notice_dt, today_dt, quote=orig))
        else:
            result.append(_item(label, None, today_dt, f'explicit date text unreadable or duration: "{orig}"'))

    for r in rules.get('relative_deadlines') or []:
        days = _days(r.get('days'))
        if not days or (r.get('fallback') and stated_period):
            continue
        result.append(_relative(r.get('label'), days, r.get('from'), received_dt, notice_dt, today_dt))

    return result
