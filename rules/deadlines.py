"""Compute deadlines based on extracted notice dates and relative rules.

This module reads rules/deadline_rules.yaml and exposes compute_deadlines.
It does not call any AI services.
"""
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import yaml
from pathlib import Path

RULES_PATH = Path(__file__).parent / 'deadline_rules.yaml'

with open(RULES_PATH, 'r', encoding='utf-8') as fh:
    DEADLINE_RULES = yaml.safe_load(fh)


def _parse_date(d: Optional[str]) -> Optional[datetime]:
    if not d:
        return None
    try:
        return datetime.strptime(d, '%Y-%m-%d')
    except Exception:
        return None


def compute_deadlines(doc_type: str, dates: List[Dict], received_date: Optional[str], today: str) -> List[Dict]:
    """Compute deadlines.

    Args:
        doc_type: one of the keys in deadline_rules.yaml
        dates: list of dicts from extraction.dates containing label, date (YYYY-MM-DD or None), original_text
        received_date: optional ISO date string when user received the notice (YYYY-MM-DD)
        today: current date as YYYY-MM-DD string (used to compute days_left)

    Returns:
        List of dicts: {label, due_date (YYYY-MM-DD or None), days_left (int or None), urgent (bool or None), basis}
    """
    rules = DEADLINE_RULES.get(doc_type, {})
    relative = rules.get('relative_deadlines', []) if rules else []

    result = []
    today_dt = _parse_date(today)
    received_dt = _parse_date(received_date)

    # First, include explicit dates from the document
    for d in dates:
        label = d.get('label') or 'date'
        date_str = d.get('date')
        orig = d.get('original_text')
        due_dt = _parse_date(date_str)
        if due_dt:
            days_left = (due_dt - today_dt).days if today_dt else None
            urgent = days_left is not None and days_left <= 7
            result.append({
                'label': label,
                'due_date': due_dt.strftime('%Y-%m-%d'),
                'days_left': days_left,
                'urgent': urgent,
                'basis': f'explicit date from document: "{orig}"'
            })
        else:
            # Keep the original text but no due date
            result.append({
                'label': label,
                'due_date': None,
                'days_left': None,
                'urgent': None,
                'basis': f'explicit date text unreadable or duration: "{orig}"'
            })

    # Next, apply relative rules from YAML
    for r in relative:
        label = r.get('label')
        days = r.get('days')
        start = r.get('from')  # 'receipt' or 'notice_date'

        if start == 'receipt':
            if received_dt:
                due_dt = received_dt + timedelta(days=days)
                days_left = (due_dt - today_dt).days if today_dt else None
                urgent = days_left is not None and days_left <= 7
                result.append({
                    'label': label,
                    'due_date': due_dt.strftime('%Y-%m-%d'),
                    'days_left': days_left,
                    'urgent': urgent,
                    'basis': f'{days} days from receipt'
                })
            else:
                result.append({
                    'label': label,
                    'due_date': None,
                    'days_left': None,
                    'urgent': None,
                    'basis': 'ask user when they received the notice'
                })
        elif start == 'notice_date':
            # Try to find a date labelled as notice date in the extraction dates
            notice_dates = [d for d in dates if (d.get('label') or '').lower().find('notice') != -1 or (d.get('label') or '').lower().find('date') != -1]
            # prefer exact matches for 'notice date'
            matched = None
            for nd in notice_dates:
                if nd.get('date'):
                    matched = nd
                    break
            if matched and matched.get('date'):
                ndt = _parse_date(matched.get('date'))
                due_dt = ndt + timedelta(days=days)
                days_left = (due_dt - today_dt).days if today_dt else None
                urgent = days_left is not None and days_left <= 7
                result.append({
                    'label': label,
                    'due_date': due_dt.strftime('%Y-%m-%d'),
                    'days_left': days_left,
                    'urgent': urgent,
                    'basis': f'{days} days from notice date ("{matched.get("original_text")}")'
                })
            else:
                # No notice date available; ask user
                result.append({
                    'label': label,
                    'due_date': None,
                    'days_left': None,
                    'urgent': None,
                    'basis': 'ask user when the notice date is (missing from document)'
                })
        else:
            # Unknown basis — skip
            continue

    return result
