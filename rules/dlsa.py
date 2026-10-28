"""Find District Legal Services Authority (DLSA) centers from CSV.

Loads data/dlsa_karnataka.csv and returns contact details. Always include NALSA helpline 15100.
"""
from typing import Dict, Any
import csv
from pathlib import Path

CSV_PATH = Path(__file__).parent.parent / 'data' / 'dlsa_karnataka.csv'


def find_center(district: str) -> Dict[str, Any]:
    district_lower = district.strip().lower()
    result = {'nalasa_helpline': {'name': 'NALSA Helpline', 'phone': '15100', 'note': 'National helpline'}}

    if not CSV_PATH.exists():
        result['found'] = False
        result['entries'] = []
        return result

    entries = []
    with open(CSV_PATH, newline='', encoding='utf-8') as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            if row.get('district', '').strip().lower() == district_lower:
                entries.append({
                    'name': row.get('name'),
                    'address': row.get('address'),
                    'phone': row.get('phone'),
                    'email': row.get('email')
                })

    result['found'] = len(entries) > 0
    result['entries'] = entries
    return result
