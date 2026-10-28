import pytest
from rules.deadlines import compute_deadlines
from rules.legal_aid import check_eligibility
from rules.dlsa import find_center


def test_cheque_bounce_with_receipt():
    dates = []
    doc_type = 'cheque_bounce_138'
    received_date = '2026-10-01'
    today = '2026-10-05'
    res = compute_deadlines(doc_type, dates, received_date, today)
    # Should include the pay within 15 days rule
    pay_rules = [r for r in res if 'pay within' in r['label']]
    assert len(pay_rules) == 1
    assert pay_rules[0]['due_date'] == '2026-10-16'
    assert pay_rules[0]['days_left'] == 11
    assert pay_rules[0]['urgent'] is False


def test_cheque_bounce_missing_receipt():
    dates = []
    doc_type = 'cheque_bounce_138'
    received_date = None
    today = '2026-10-05'
    res = compute_deadlines(doc_type, dates, received_date, today)
    pay_rules = [r for r in res if 'pay within' in r['label']]
    assert len(pay_rules) == 1
    assert pay_rules[0]['due_date'] is None
    assert pay_rules[0]['basis'] == 'ask user when they received the notice'


def test_urgent_hearing():
    # hearing date is an explicit date soon
    dates = [{'label': 'hearing date', 'date': '2026-10-08', 'original_text': '08-10-2026'}]
    doc_type = 'court_summons'
    res = compute_deadlines(doc_type, dates, None, '2026-10-05')
    hearing = [r for r in res if r['label'] == 'hearing date'][0]
    assert hearing['due_date'] == '2026-10-08'
    assert hearing['urgent'] is True


def test_eligibility_woman():
    answers = {'woman': True, 'annual_income': 50000, 'income_limit': 100000}
    r = check_eligibility(answers)
    assert r['eligible'] is True
    assert any('woman' in reason.lower() for reason in r['reasons'])


def test_ineligible_case():
    answers = {'woman': False, 'annual_income': 200000, 'income_limit': 100000}
    r = check_eligibility(answers)
    assert r['eligible'] is False


def test_unknown_district():
    r = find_center('UnknownDistrict')
    assert r['found'] is False
    assert 'nalasa_helpline' in r
