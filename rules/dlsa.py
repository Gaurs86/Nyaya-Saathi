"""Find District Legal Services Authority (DLSA) centers from CSV.

Loads data/dlsa_karnataka.csv and returns contact details. Always include NALSA helpline 15100.
"""
from typing import Dict, Any
import csv
from pathlib import Path

CSV_PATH = Path(__file__).parent.parent / 'data' / 'dlsa_karnataka.csv'


def find_center(district: str) -> Dict[str, Any]:
    district_lower = district.strip().lower()
    helpline = {'name': 'NALSA Helpline', 'phone': '15100', 'note': 'National helpline'}
    result = {'nalsa_helpline': helpline}

    if not CSV_PATH.exists():
        result['found'] = False
        result['entries'] = []
        return result

    entries = []
    with open(CSV_PATH, newline='', encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            if row.get('district', '').strip().lower() == district_lower:
                name = (row.get('name') or '').strip()
                address = (row.get('address') or '').strip()
                phone = (row.get('phone') or '').strip()
                # Never return placeholder rows as though they were verified contacts.
                placeholders = {'', 'TO FILL', 'TBD', 'N/A', 'NA', 'UNKNOWN'}
                if any(value.upper() in placeholders for value in (name, address, phone)):
                    continue
                email = (row.get('email') or '').strip()
                entries.append({
                    'name': name,
                    'address': address,
                    'phone': phone,
                    'email': None if email.upper() in placeholders else email
                })

    result['found'] = len(entries) > 0
    result['entries'] = entries
    return result
