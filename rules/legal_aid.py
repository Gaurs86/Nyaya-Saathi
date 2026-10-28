"""Simple legal aid eligibility checker (no AI calls).

Uses categories listed in the Legal Services Authorities Act (Section 12) to decide
eligibility. This is a guideline — results should be verified by a qualified person.
"""
from typing import Dict, Any

# Configurable income limit is read from config/config.yaml by the caller.
# This function expects the caller to pass the income limit in 'answers' under 'income_limit'.

ELIGIBILITY_CATEGORIES = [
    'SC/ST',
    'woman',
    'child',
    'person_with_disability',
    'victim_of_trafficking_or_begar',
    'victim_of_mass_disaster',
    'industrial_workman',
    'person_in_custody',
]


def check_eligibility(answers: Dict[str, Any]) -> Dict[str, Any]:
    """Determine eligibility for legal aid.

    Args:
        answers: dict with keys for categories and 'annual_income' (number) and 'income_limit'

    Returns:
        dict: {eligible: bool, reasons: list[str], next_step: str}
    """
    reasons = []

    # Check category flags
    for cat in ELIGIBILITY_CATEGORIES:
        key = cat.lower().replace(' ', '_')
        if answers.get(key):
            reasons.append(f'Matches category: {cat}')

    # Income check
    income = answers.get('annual_income')
    income_limit = answers.get('income_limit')  # caller must supply from config
    if income is not None and income_limit is not None:
        try:
            if float(income) <= float(income_limit):
                reasons.append(f'Annual income {income} <= limit {income_limit}')
        except Exception:
            # ignore parsing problems
            pass

    eligible = len(reasons) > 0

    if eligible:
        next_step = 'Refer to nearest DLSA / legal services center and assist with application.'
    else:
        next_step = 'Not eligible under Section 12 criteria. Consider other pro bono options.'

    return {'eligible': eligible, 'reasons': reasons, 'next_step': next_step}
