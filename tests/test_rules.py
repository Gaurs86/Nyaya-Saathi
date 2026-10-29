import pytest
from rules.deadlines import compute_deadlines
from rules.legal_aid import check_eligibility
from rules.dlsa import find_center

NOTICE = {'label': 'notice date', 'date': '2026-10-15', 'original_text': '15 October 2026'}
PERIOD = {'label': 'pay within', 'date': None, 'original_text': 'within 15 (fifteen) days',
          'duration_days': 15, 'duration_from': 'receipt'}


def by_label(res, text):
    return [r for r in res if text in r['label']]


# ---- deadlines: original tests -------------------------------------------------
def test_unverified_cheque_bounce_rule_is_not_applied():
    # No period was extracted from the notice and the statutory fallback is unverified.
    res = compute_deadlines('cheque_bounce_138', [], '2026-10-01', '2026-10-05')
    assert not by_label(res, 'pay within')


def test_unverified_rule_does_not_create_deadline_without_receipt():
    res = compute_deadlines('cheque_bounce_138', [], None, '2026-10-05')
    assert not by_label(res, 'pay within')


def test_urgent_hearing():
    dates = [{'label': 'hearing date', 'date': '2026-10-08', 'original_text': '08-10-2026'}]
    res = compute_deadlines('court_summons', dates, None, '2026-10-05')
    hearing = by_label(res, 'hearing date')[0]
    assert hearing['due_date'] == '2026-10-08'
    assert hearing['urgent'] is True


# ---- deadlines: eviction notice (your sample) and the bugs fixed --------------
def test_stated_period_uses_user_receipt_date_but_remains_provisional():
    res = compute_deadlines('eviction_or_rent', [NOTICE, PERIOD], '2026-10-15', '2026-10-29')
    pay = by_label(res, 'pay within')[0]
    assert pay['due_date'] == '2026-10-30' and pay['days_left'] == 1
    assert pay['urgent'] is None and pay['overdue'] is None
    assert pay['assumed'] is False
    assert pay['calculation_status'] == 'provisional_from_user_receipt_date'
    assert pay['legal_rule_verified'] is None


def test_missing_receipt_never_assumes_notice_date():
    res = compute_deadlines('eviction_or_rent', [NOTICE, PERIOD], None, '2026-10-29')
    pay = by_label(res, 'pay within')[0]
    assert pay['due_date'] is None
    assert pay['assumed'] is False
    assert pay['calculation_status'] == 'missing_receipt_date'
    assert 'no date calculated' in pay['basis']


def test_notice_date_is_informational_not_a_deadline():
    res = compute_deadlines('eviction_or_rent', [NOTICE, PERIOD], None, '2026-10-29')
    n = by_label(res, 'notice date')[0]
    assert n['informational'] is True and n['urgent'] is False and n['overdue'] is False


def test_unverified_eviction_fallback_is_never_applied():
    res = compute_deadlines('eviction_or_rent', [NOTICE], '2026-10-20', '2026-10-29')
    assert not by_label(res, 'fallback')


def test_court_summons_written_statement_counts_from_receipt():
    hearing = {'label': 'hearing date', 'date': '2026-12-01', 'original_text': '1 Dec 2026'}
    res = compute_deadlines('court_summons', [hearing], None, '2026-10-29')
    assert not by_label(res, 'appear on hearing date')      # no made-up deadline equal to the notice date
    assert not by_label(res, 'written statement')              # rule is unverified and must not be applied


def test_past_date_is_overdue_not_urgent():
    dates = [{'label': 'hearing date', 'date': '2026-10-01', 'original_text': '1 Oct 2026'}]
    h = by_label(compute_deadlines('court_summons', dates, None, '2026-10-05'), 'hearing date')[0]
    assert h['overdue'] is True and h['urgent'] is False


# ---- legal aid -----------------------------------------------------------------
def test_eligibility_woman():
    r = check_eligibility({'woman': True, 'annual_income': 50000})
    assert r['eligible'] is True
    assert any('woman' in reason.lower() for reason in r['reasons'])


def test_ineligible_case():
    r = check_eligibility({'woman': False, 'annual_income': 200000}, income_limit=100000)
    assert r['eligible'] is False


def test_ai_supplied_income_limit_is_ignored(monkeypatch):
    monkeypatch.setattr('rules.legal_aid.get_income_limit', lambda state='karnataka': None)
    r = check_eligibility({'annual_income': 50000, 'income_limit': 99999999})
    assert r['eligible'] is None
    assert 'not on file' in r['next_step']


def test_income_limit_comes_from_rules(monkeypatch):
    monkeypatch.setattr('rules.legal_aid.get_income_limit', lambda state='karnataka': 300000)
    assert check_eligibility({'annual_income': 250000})['eligible'] is True
    assert check_eligibility({'woman': False, 'annual_income': 400000})['eligible'] is False


def test_category_alias_and_yes_strings():
    r = check_eligibility({'sc/st': 'yes'})
    assert r['eligible'] is True and 'SC/ST' in r['reasons'][0]


def test_not_enough_information():
    assert check_eligibility({})['eligible'] is None


def test_unknown_district():
    r = find_center('UnknownDistrict')
    assert r['found'] is False
    assert 'nalsa_helpline' in r


def test_placeholder_dlsa_contact_is_not_returned_as_verified():
    r = find_center('Bengaluru Urban')
    assert r['found'] is False
    assert r['entries'] == []
    assert r['nalsa_helpline']['phone'] == '15100'
