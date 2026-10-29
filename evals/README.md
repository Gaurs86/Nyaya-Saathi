# Phase 3: Extraction evaluation harness

This directory adds a deterministic benchmark for checking whether Nyaya-Saathi's **draft extraction** captures important fields and supporting evidence consistently. It does not assess legal correctness, whether a deadline legally applies, or whether an explanation is good legal advice.

## What is included

- `fixtures/benchmark.json`: three fictional, English-language sample notices with compact expected labels.
- `generate_fixtures.py`: creates local PDFs from those samples so they can be uploaded through the same UI as a notice.
- `run_evaluation.py`: scores downloaded lawyer-intake JSON against the expected labels.
- `../tests/test_evaluation.py`: offline unit tests for the scorer; no Gemini key or live model call is needed.

## Run the synthetic benchmark

From the repository root, install the app's dependencies and generate the sample PDFs:

```bash
python -m pip install -r requirements.txt
python evals/generate_fixtures.py
```

Start the app in a separate terminal:

```bash
uvicorn app:app --reload
```

Open `http://127.0.0.1:8000`. Upload each PDF from `evals/generated/`, analyze it, and download the lawyer-intake brief JSON. Save each downloaded brief as the matching case ID in `evals/actual/`, for example:

```text
evals/actual/
  synthetic-rent-001.json
  synthetic-summons-001.json
  synthetic-cheque-001.json
```

Each file may be the raw downloaded brief, the `lawyer_brief` object from an `/analyze` response, or a stored review object containing a `brief` property. Then run:

```bash
python -m evals.run_evaluation
```

Write a machine-readable report outside source control:

```bash
python -m evals.run_evaluation --json-out evals/reports/latest.json
```

Use `--strict` to return a non-zero status when an actual is missing or any check fails:

```bash
python -m evals.run_evaluation --strict
```

A failed check is a signal to inspect the source and output, not proof that the model is wrong in every context. A passing result is not a legal-quality certification.

## Interpreting results

The report checks document type and readability, exact normalized role/name pairs, explicit ISO dates and stated durations, cited act/section pairs, expected demand phrases, and selected facts appearing in the evidence quotes/values. Precision penalizes extra extracted parties, dates or provisions; recall shows expected items that were missed. Demand and evidence phrase coverage are literal normalized substring checks, not semantic assessments.

The metric definitions are deliberately transparent and deterministic. Inspect the per-case `missing` and `unexpected` values rather than relying only on aggregate averages. These checks do not measure the full plain-language explanation, follow-up chat behavior, jurisdictional validity, deadline correctness, or hallucination risk outside the annotated fields.

## Testing real notices safely

Real notices need a **separate, human-reviewed gold annotation** made from the original notice; do not treat another model response as ground truth. A qualified reviewer should annotate the document type, names/roles, dates and stated periods, cited provisions, demands, and source passages. Test on a properly authorized and consented set, redact where possible, and follow your organization's retention and data-processing requirements.

Keep confidential datasets, annotated real notices, model outputs and reports in private storage. The `evals/actual/`, `evals/generated/` and `evals/reports/` paths are git-ignored, but that is not encryption or access control. Do not force-add these files to Git, and avoid storing real client content anywhere in the repository. For a private dataset outside this repo, pass explicit paths:

```bash
python -m evals.run_evaluation \
  --dataset /private/path/benchmark.json \
  --actual-dir /private/path/actual-briefs \
  --json-out /private/path/report.json
```

The included samples are fictional software fixtures, not legal notice templates. They are short, English-only and intentionally cover only a small set of extraction fields. Expand them with professionally reviewed examples before making claims about production performance.
