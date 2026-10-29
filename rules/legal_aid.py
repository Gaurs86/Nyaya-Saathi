"""Legal aid eligibility checker (no AI calls).

Categories follow Section 12 of the Legal Services Authorities Act, 1987. The income limit is set by each State,
so it is read from legal_aid_config.yaml and is NEVER taken from the caller or the AI.
Results are guidance only: the District Legal Services Authority (DLSA) makes the final decision.
"""
from pathlib import Path
from typing import Any, Dict, Optional

import yaml

CONFIG_PATH = Path(__file__).parent / 'legal_aid_config.yaml'

CATEGORIES = {
    'sc_st': 'SC/ST',
    'woman': 'woman',
    'child': 'child',
    'person_with_disability': 'person with disability',
    'victim_of_trafficking_or_begar': 'victim of trafficking or begar',
    'victim_of_mass_disaster': 'victim of mass disaster',
    'industrial_workman': 'industrial workman',
    'person_in_custody': 'person in custody',
}
ELIGIBILITY_CATEGORIES = list(CATEGORIES.values())
ALIASES = {
    'sc/st': 'sc_st', 'sc': 'sc_st', 'st': 'sc_st', 'scheduled_caste': 'sc_st', 'scheduled_tribe': 'sc_st',
    'disability': 'person_with_disability', 'disabled': 'person_with_disability',
}


def _number(v) -> Optional[float]:
    try:
        if v is None or isinstance(v, bool):
            return None
        return float(str(v).replace(',', '').replace('₹', '').strip())
    except Exception:
        return None


def _flag(v) -> Optional[bool]:
    if isinstance(v, bool):
        return v
    s = str(v).strip().lower() if v is not None else ''
    if s in ('true', 'yes', 'y', '1'):
        return True
    if s in ('false', 'no', 'n', '0'):
        return False
    return None


def get_income_limit(state: str = 'karnataka') -> Optional[float]:
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as fh:
            cfg = yaml.safe_load(fh) or {}
    except Exception:
        return None
    return _number((cfg.get('income_limit_annual') or {}).get(state))


def _fmt(x: float) -> str:
    return f'{int(x):,}' if x == int(x) else str(x)


def check_eligibility(answers: Dict[str, Any], income_limit: Optional[float] = None, state: str = 'karnataka') -> Dict[str, Any]:
    """Args:
        answers: category flags (sc_st, woman, child, person_with_disability, victim_of_trafficking_or_begar,
                 victim_of_mass_disaster, industrial_workman, person_in_custody) and optional 'annual_income'.
                 Any 'income_limit' inside answers is ignored.
        income_limit: for tests only; normally read from legal_aid_config.yaml.
    Returns: {eligible: True | False | None (not enough information), reasons, next_step, income_limit}
    """
    answers = answers or {}
    flags: Dict[str, bool] = {}
    for k, v in answers.items():
        key = ALIASES.get(str(k).lower(), str(k).lower())
        f = _flag(v)
        if key in CATEGORIES and f is not None:
            flags[key] = flags.get(key, False) or f

    reasons = [f'Matches category: {CATEGORIES[k]}' for k, f in flags.items() if f]

    limit = _number(income_limit) if income_limit is not None else get_income_limit(state)
    income = _number(answers.get('annual_income'))
    income_checked = income is not None and limit is not None
    if income_checked and income <= limit:
        reasons.append(f'Annual income {_fmt(income)} is within the limit of {_fmt(limit)}')

    if reasons:
        eligible = True
        next_step = 'Refer to nearest DLSA / legal services center and assist with application.'
    elif flags and income_checked:
        eligible = False
        next_step = ('No Section 12 category or income limit matched the answers given. '
                     'The DLSA makes the final decision, so still check with the nearest DLSA.')
    else:
        eligible = None
        next_step = ('The current income limit is not on file. Ask the legal aid office (DLSA) for the current limit.'
                     if limit is None else
                     'Not enough answers to decide. Ask the category questions and the annual income.')

    return {'eligible': eligible, 'reasons': reasons, 'next_step': next_step, 'income_limit': limit}
