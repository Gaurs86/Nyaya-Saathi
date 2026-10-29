import json
from pathlib import Path

from evals.run_evaluation import evaluate_case, run_evaluation, set_metrics

DATASET = Path(__file__).resolve().parents[1] / "evals" / "fixtures" / "benchmark.json"


def _perfect_brief(case):
    expected = case["expected"]
    dates = []
    for item in expected.get("dates", []):
        dates.append({
            "date_as_written_iso": item.get("date"),
            "duration_days_as_written": item.get("duration_days"),
            "duration_from_as_written": item.get("duration_from"),
        })
    evidence = [
        {"field": "test", "value": phrase, "quote": phrase}
        for phrase in expected.get("evidence_phrases", [])
    ]
    return {
        "schema_version": "1.0",
        "document": {
            "type": expected["document_type"],
            "readable": expected["readable"],
        },
        "parties": [dict(item) for item in expected.get("parties", [])],
        "dates_and_periods": dates,
        "legal_provisions_cited": [dict(item) for item in expected.get("provisions", [])],
        "demands_or_claims": list(expected.get("demand_phrases", [])),
        "supporting_evidence": evidence,
    }


def test_set_metrics_handles_empty_and_perfect_sets():
    assert set_metrics([], [])["f1"] == 1.0
    result = set_metrics(["party A", "party B"], ["party A"])
    assert result["precision"] == 1.0
    assert result["recall"] == 0.5
    assert result["false_negative"] == 1


def test_all_synthetic_fixtures_are_valid_perfect_match_examples():
    dataset = json.loads(DATASET.read_text(encoding="utf-8"))
    assert dataset["benchmark_version"] == 1
    assert "Synthetic" in dataset["purpose"]
    for case in dataset["cases"]:
        result = evaluate_case(case, _perfect_brief(case))
        assert result["passed_all_checks"], (case["case_id"], result)
        assert result["parties"]["f1"] == 1.0
        assert result["dates"]["f1"] == 1.0
        assert result["provisions"]["f1"] == 1.0


def test_evaluator_detects_unexpected_party_and_date():
    dataset = json.loads(DATASET.read_text(encoding="utf-8"))
    case = dataset["cases"][0]
    actual = _perfect_brief(case)
    actual["parties"].append({"role": "recipient", "name": "Invented Person"})
    actual["dates_and_periods"].append({"date_as_written_iso": "2027-01-01"})
    result = evaluate_case(case, actual)
    assert result["parties"]["precision"] < 1.0
    assert result["dates"]["precision"] < 1.0
    assert not result["passed_all_checks"]


def test_run_evaluation_reports_missing_outputs(tmp_path):
    report = run_evaluation(DATASET, tmp_path)
    assert report["evaluated_cases"] == 0
    assert len(report["missing_actuals"]) == len(json.loads(DATASET.read_text())["cases"])
    assert report["aggregate"]["document_type_accuracy"] is None
