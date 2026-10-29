"""Deterministic scorer for synthetic/legal-notice extraction benchmark outputs.

The scorer evaluates extraction completeness and evidence pointers only. It does
not assess legal correctness, legal deadlines, or the quality of legal advice.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATASET = ROOT / "evals" / "fixtures" / "benchmark.json"
DEFAULT_ACTUAL_DIR = ROOT / "evals" / "actual"


def normalize_text(value: Any) -> str:
    """Case/Unicode/whitespace/punctuation normalization for deterministic matching."""
    text = unicodedata.normalize("NFKC", str(value or "")).casefold()
    text = re.sub(r"[^\w]+", " ", text, flags=re.UNICODE)
    return " ".join(text.split())


def set_metrics(expected: list[str] | set[str], actual: list[str] | set[str]) -> dict[str, Any]:
    """Return set precision/recall/F1 and matching details; empty/empty scores 1."""
    expected_set = {item for item in expected if item}
    actual_set = {item for item in actual if item}
    true_positive = len(expected_set & actual_set)
    false_positive = len(actual_set - expected_set)
    false_negative = len(expected_set - actual_set)

    if not expected_set and not actual_set:
        precision = recall = f1 = 1.0
    else:
        precision = true_positive / len(actual_set) if actual_set else 0.0
        recall = true_positive / len(expected_set) if expected_set else 1.0
        f1 = (2 * precision * recall / (precision + recall)) if precision + recall else 0.0

    return {
        "expected_count": len(expected_set),
        "actual_count": len(actual_set),
        "true_positive": true_positive,
        "false_positive": false_positive,
        "false_negative": false_negative,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "missing": sorted(expected_set - actual_set),
        "unexpected": sorted(actual_set - expected_set),
    }


def _brief_from_payload(payload: Any) -> dict[str, Any]:
    """Accept a downloaded brief, analyze API response, or stored review-case object."""
    if not isinstance(payload, dict):
        raise ValueError("Actual output must be a JSON object.")
    for key in ("lawyer_brief", "brief"):
        nested = payload.get(key)
        if isinstance(nested, dict) and (
            "schema_version" in nested or "document" in nested or "parties" in nested
        ):
            return nested
    return payload


def _party_keys(items: Any) -> list[str]:
    keys: list[str] = []
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        name = normalize_text(item.get("name"))
        role = normalize_text(item.get("role"))
        if name:
            keys.append(f"{role}|{name}")
    return keys


def _date_keys(items: Any, *, expected: bool = False) -> list[str]:
    keys: list[str] = []
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        if expected:
            date_value = item.get("date")
            duration_value = item.get("duration_days")
            duration_from = item.get("duration_from")
        else:
            date_value = item.get("date_as_written_iso")
            duration_value = item.get("duration_days_as_written")
            duration_from = item.get("duration_from_as_written")
        if date_value:
            keys.append("date:" + str(date_value).strip())
        if duration_value is not None:
            try:
                days = int(duration_value)
            except (TypeError, ValueError):
                days = normalize_text(duration_value)
            from_key = normalize_text(duration_from) or "unknown"
            keys.append(f"duration:{days}:{from_key}")
    return keys


def _provision_keys(items: Any) -> list[str]:
    keys: list[str] = []
    for item in items if isinstance(items, list) else []:
        if not isinstance(item, dict):
            continue
        act = normalize_text(item.get("act"))
        section = normalize_text(item.get("section"))
        section = re.sub(r"^section\s+", "", section)
        if act or section:
            keys.append(f"{act}|{section}")
    return keys


def _coverage(phrases: Any, actual_text: str) -> dict[str, Any]:
    expected = [str(p).strip() for p in phrases if str(p).strip()] if isinstance(phrases, list) else []
    normalized_actual = normalize_text(actual_text)
    matched = [phrase for phrase in expected if normalize_text(phrase) in normalized_actual]
    missing = [phrase for phrase in expected if phrase not in matched]
    ratio = 1.0 if not expected else len(matched) / len(expected)
    return {
        "expected_count": len(expected),
        "matched_count": len(matched),
        "coverage": round(ratio, 4),
        "matched": matched,
        "missing": missing,
    }


def evaluate_case(case: dict[str, Any], actual_payload: Any) -> dict[str, Any]:
    expected = case.get("expected") or {}
    brief = _brief_from_payload(actual_payload)
    document = brief.get("document") if isinstance(brief.get("document"), dict) else {}

    expected_type = normalize_text(expected.get("document_type"))
    actual_type = normalize_text(document.get("type"))
    type_correct = expected_type == actual_type
    expected_readable = expected.get("readable")
    actual_readable = document.get("readable")
    readable_correct = expected_readable is None or expected_readable == actual_readable

    party_scores = set_metrics(
        [f"{normalize_text(p.get('role'))}|{normalize_text(p.get('name'))}" for p in expected.get("parties", []) if p.get("name")],
        _party_keys(brief.get("parties")),
    )
    date_scores = set_metrics(
        _date_keys(expected.get("dates", []), expected=True),
        _date_keys(brief.get("dates_and_periods", [])),
    )
    provision_scores = set_metrics(
        _provision_keys(expected.get("provisions", [])),
        _provision_keys(brief.get("legal_provisions_cited", [])),
    )

    demand_items = brief.get("demands_or_claims")
    demand_text = " ".join(str(item) for item in demand_items) if isinstance(demand_items, list) else ""
    demand_coverage = _coverage(expected.get("demand_phrases", []), demand_text)

    evidence_items = brief.get("supporting_evidence")
    evidence_text_parts: list[str] = []
    for item in evidence_items if isinstance(evidence_items, list) else []:
        if isinstance(item, dict):
            evidence_text_parts.extend([
                str(item.get("value") or ""),
                str(item.get("quote") or ""),
            ])
    evidence_coverage = _coverage(expected.get("evidence_phrases", []), " ".join(evidence_text_parts))

    checks = {
        "document_type_correct": type_correct,
        "readability_correct": readable_correct,
        "parties_exact": party_scores["f1"] == 1.0,
        "dates_exact": date_scores["f1"] == 1.0,
        "provisions_exact": provision_scores["f1"] == 1.0,
        "demand_phrases_covered": demand_coverage["coverage"] == 1.0,
        "evidence_phrases_covered": evidence_coverage["coverage"] == 1.0,
    }
    return {
        "case_id": case.get("case_id"),
        "title": case.get("title"),
        "document_type": {"expected": expected.get("document_type"), "actual": document.get("type"), "correct": type_correct},
        "readability": {"expected": expected_readable, "actual": actual_readable, "correct": readable_correct},
        "parties": party_scores,
        "dates": date_scores,
        "provisions": provision_scores,
        "demand_phrase_coverage": demand_coverage,
        "evidence_phrase_coverage": evidence_coverage,
        "checks": checks,
        "passed_all_checks": all(checks.values()),
    }


def run_evaluation(dataset_path: Path, actual_dir: Path) -> dict[str, Any]:
    dataset = json.loads(dataset_path.read_text(encoding="utf-8"))
    cases = dataset.get("cases")
    if not isinstance(cases, list) or not cases:
        raise ValueError("Dataset must contain a non-empty 'cases' array.")
    case_ids = [case.get("case_id") for case in cases]
    if any(not isinstance(case_id, str) or not case_id for case_id in case_ids):
        raise ValueError("Every benchmark case must have a non-empty case_id.")
    if len(set(case_ids)) != len(case_ids):
        raise ValueError("Benchmark case_id values must be unique.")

    evaluated: list[dict[str, Any]] = []
    missing: list[str] = []
    for case in cases:
        case_id = case["case_id"]
        path = actual_dir / f"{case_id}.json"
        if not path.is_file():
            missing.append(case_id)
            continue
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            evaluated.append(evaluate_case(case, payload))
        except (json.JSONDecodeError, ValueError) as exc:
            raise ValueError(f"Could not evaluate {path}: {exc}") from exc

    if evaluated:
        count = len(evaluated)
        aggregate = {
            "evaluated_cases": count,
            "passed_cases": sum(bool(row["passed_all_checks"]) for row in evaluated),
            "document_type_accuracy": round(sum(bool(row["document_type"]["correct"]) for row in evaluated) / count, 4),
            "readability_accuracy": round(sum(bool(row["readability"]["correct"]) for row in evaluated) / count, 4),
            "mean_party_f1": round(sum(row["parties"]["f1"] for row in evaluated) / count, 4),
            "mean_date_f1": round(sum(row["dates"]["f1"] for row in evaluated) / count, 4),
            "mean_provision_f1": round(sum(row["provisions"]["f1"] for row in evaluated) / count, 4),
            "mean_demand_phrase_coverage": round(sum(row["demand_phrase_coverage"]["coverage"] for row in evaluated) / count, 4),
            "mean_evidence_phrase_coverage": round(sum(row["evidence_phrase_coverage"]["coverage"] for row in evaluated) / count, 4),
        }
    else:
        aggregate = {
            "evaluated_cases": 0,
            "passed_cases": 0,
            "document_type_accuracy": None,
            "readability_accuracy": None,
            "mean_party_f1": None,
            "mean_date_f1": None,
            "mean_provision_f1": None,
            "mean_demand_phrase_coverage": None,
            "mean_evidence_phrase_coverage": None,
        }
    return {
        "benchmark_version": dataset.get("benchmark_version"),
        "notice": "Extraction regression signals only; these scores do not assess legal correctness, legal deadlines, or legal advice.",
        "dataset": str(dataset_path),
        "actual_directory": str(actual_dir),
        "total_cases": len(cases),
        "evaluated_cases": len(evaluated),
        "missing_actuals": missing,
        "aggregate": aggregate,
        "cases": evaluated,
    }


def _print_report(report: dict[str, Any]) -> None:
    print("Nyaya-Saathi extraction evaluation")
    print(report["notice"])
    print(f"Cases evaluated: {report['evaluated_cases']}/{report['total_cases']}")
    if report["missing_actuals"]:
        print("Missing actual outputs: " + ", ".join(report["missing_actuals"]))
    print()
    print(f"{'Case':30} {'Type':7} {'Party F1':8} {'Date F1':8} {'Provision F1':12} {'Demands':8} {'Evidence':8} {'Checks':8}")
    print("-" * 105)
    for row in report["cases"]:
        status = "PASS" if row["passed_all_checks"] else "REVIEW"
        print(
            f"{row['case_id'][:30]:30} "
            f"{'PASS' if row['document_type']['correct'] else 'FAIL':7} "
            f"{row['parties']['f1']:<8.2f} "
            f"{row['dates']['f1']:<8.2f} "
            f"{row['provisions']['f1']:<12.2f} "
            f"{row['demand_phrase_coverage']['coverage']:<8.2f} "
            f"{row['evidence_phrase_coverage']['coverage']:<8.2f} "
            f"{status:8}"
        )
    print()
    print(json.dumps(report["aggregate"], indent=2))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET, help="Benchmark JSON path")
    parser.add_argument("--actual-dir", type=Path, default=DEFAULT_ACTUAL_DIR, help="Directory of actual brief JSON files")
    parser.add_argument("--json-out", type=Path, help="Optional path to write a JSON report")
    parser.add_argument("--strict", action="store_true", help="Exit 1 when outputs are missing or any case fails a check")
    args = parser.parse_args(argv)

    try:
        report = run_evaluation(args.dataset, args.actual_dir)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"Evaluation error: {exc}", file=sys.stderr)
        return 2

    _print_report(report)
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"JSON report written to {args.json_out}")

    if report["evaluated_cases"] == 0:
        print("No actual outputs found. Run the app on the synthetic PDFs and save each lawyer brief JSON first.", file=sys.stderr)
        return 2
    if args.strict and (report["missing_actuals"] or any(not case["passed_all_checks"] for case in report["cases"])):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
