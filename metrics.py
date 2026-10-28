"""Anonymous impact tracking.

Provides log_event(event_type, doc_type, language, extra) which records minimal
non-sensitive metadata about events. Does NOT store images, names, case numbers
or free text. If SUPABASE_URL and SUPABASE_KEY are set, inserts into Supabase
REST API. Otherwise appends to data/events.jsonl.
"""
import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any

import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv('.env.local')
load_dotenv('.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

ALLOWED_EVENTS = {
    'notice_explained', 'unreadable', 'sensitive_route', 'followup_question',
    'feedback_up', 'feedback_down', 'legal_aid_shown'
}

DATA_DIR = Path(__file__).parent / 'data'
DATA_DIR.mkdir(parents=True, exist_ok=True)
EVENTS_FILE = DATA_DIR / 'events.jsonl'


def _persist_local(record: Dict[str, Any]):
    try:
        with open(EVENTS_FILE, 'a', encoding='utf-8') as fh:
            fh.write(json.dumps(record, ensure_ascii=False) + '\n')
    except Exception:
        pass


def _insert_supabase(record: Dict[str, Any]):
    # Insert minimal fields into Supabase table 'events'
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False
    url = SUPABASE_URL.rstrip('/') + '/rest/v1/events'
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    payload = {
        'id': record['id'],
        'created_at': record['created_at'],
        'event_type': record['event_type'],
        'doc_type': record.get('doc_type'),
        'language': record.get('language')
    }
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=5)
        return r.status_code in (200, 201, 204)
    except Exception:
        return False


def log_event(event_type: str, doc_type: str, language: str, extra: Dict[str, Any] = None) -> None:
    """Record an anonymous event.

    Only stores event_type, doc_type, language and timestamp. extra is accepted
    but not persisted to avoid storing free text or personally identifying data.
    """
    if event_type not in ALLOWED_EVENTS:
        return

    rec = {
        'id': str(uuid.uuid4()),
        'created_at': datetime.utcnow().isoformat() + 'Z',
        'event_type': event_type,
        'doc_type': doc_type or None,
        'language': language or None
    }

    # Try Supabase first
    ok = False
    if SUPABASE_URL and SUPABASE_KEY:
        ok = _insert_supabase(rec)

    if not ok:
        _persist_local(rec)


def _read_local_events() -> list:
    events = []
    if not EVENTS_FILE.exists():
        return events
    try:
        with open(EVENTS_FILE, 'r', encoding='utf-8') as fh:
            for line in fh:
                try:
                    events.append(json.loads(line))
                except Exception:
                    continue
    except Exception:
        pass
    return events


def aggregate_events(last_days: int = 7) -> Dict[str, Any]:
    """Return aggregates for display: totals by event_type, doc_type, language and last N days count."""
    if SUPABASE_URL and SUPABASE_KEY:
        # Attempt to fetch recent events (limit to 10000)
        try:
            url = SUPABASE_URL.rstrip('/') + '/rest/v1/events?select=id,event_type,doc_type,language,created_at&order=created_at.desc&limit=10000'
            headers = {'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
            r = requests.get(url, headers=headers, timeout=5)
            if r.status_code == 200:
                rows = r.json()
            else:
                rows = _read_local_events()
        except Exception:
            rows = _read_local_events()
    else:
        rows = _read_local_events()

    totals_event = {}
    totals_doc = {}
    totals_lang = {}
    recent_count = 0
    cutoff = datetime.utcnow() - timedelta(days=last_days)
    for r in rows:
        et = r.get('event_type')
        dt = r.get('doc_type') or 'unknown'
        lg = r.get('language') or 'unknown'
        totals_event[et] = totals_event.get(et, 0) + 1
        totals_doc[dt] = totals_doc.get(dt, 0) + 1
        totals_lang[lg] = totals_lang.get(lg, 0) + 1
        # parse created_at
        try:
            ts = datetime.fromisoformat(r.get('created_at').replace('Z', '+00:00'))
            if ts >= cutoff:
                recent_count += 1
        except Exception:
            pass

    return {
        'by_event': totals_event,
        'by_doc_type': totals_doc,
        'by_language': totals_lang,
        'last_days': last_days,
        'recent_count': recent_count
    }
