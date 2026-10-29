# Nyaya-Saathi — legal notice explainer and lawyer-intake draft

Nyaya-Saathi helps people in India understand a legal notice in simple language and creates a **draft lawyer-intake brief** from the same extraction. It supports English, Hindi and Kannada.

The initial workflow is deliberately limited:

1. Upload a PDF by itself or up to three document images.
2. Extract the document type, parties, dates/periods, cited provisions and demands.
3. Explain the notice in the selected language.
4. Create a JSON lawyer-intake brief containing the extracted facts, source quotations when available, dates/periods, missing information and a lawyer-review checklist.
5. Download the brief locally for professional review.

> **This is legal information, not legal advice.** The brief is a draft and must be checked against the original document by a qualified professional. NALSA helpline: **15100**.

Built with Google ADK, Gemini and FastAPI.

## How it works

- `pipeline.py` requests structured extraction from Gemini. It now asks for page numbers and short evidence quotations for important facts. Those quotations are model-extracted pointers, not inherently verified facts.
- `briefs.py` creates a structured draft for intake/review and labels it `draft_pending_lawyer_review`.
- For PDFs with a native text layer, the app checks whether extracted quotations can be found in the corresponding page text. This is only a textual matching check, not legal verification. Scanned PDFs and image uploads may have no independent text layer, so quotations remain unverified.
- `rules/deadlines.py` surfaces dates written in the notice. Periods such as “within 15 days” are calculated only when the stated trigger date is known, and the result is marked provisional. Unverified statutory fallback rules in `rules/deadline_rules.yaml` are not applied.
- The ADK agent provides the plain-language explanation and follow-up conversation. Legal knowledge files are treated as unavailable when they are empty or still contain placeholders.

## Current limits and safety

- Upload limit: 12 MiB per file, 20 MiB combined, up to three images or one PDF, with a 20-page cap for PDFs in this prototype.
- The JSON lawyer brief is a draft, not an approved legal opinion. A matching quote does not establish that a claim is true or legally valid.
- Dates stated in a notice must be distinguished from legal deadlines. Dates calculated from stated periods are provisional and require review. Bundled statutory rules are skipped unless expressly verified with a source URL and review date.
- The app does not save uploaded originals to application storage. The file content is sent to Gemini for extraction, and extracted facts are sent to the agent. The Google service terms and data-handling settings therefore matter. Do not upload real client documents without appropriate consent and an approved data-processing configuration.
- The web app deliberately does not wrap requests in AgentFoundry's full-input recorder because the agent payload may include names, case numbers and extracted document facts. The command-line `python agent.py` flow still uses `recorder.py`; do not pass real client information through that path until recording is disabled or appropriately redacted.
- Web sessions use random in-memory ADK user IDs and expire from the app's session registry after 45 minutes. This is not authentication, durable storage or a multi-instance session system; sessions are lost on restart.
- The Karnataka district legal-aid CSV still contains placeholder records. The app must not be treated as having a verified district contact directory until those rows are replaced with checked official data.
- Legal rules, knowledge notes, income limits and legal-aid contacts must be reviewed against authoritative sources by a qualified professional before real users rely on them.

## Quick start

```bash
python -m pip install -r requirements.txt
```

Create `.env.local` in the project root (never commit it):

```dotenv
GOOGLE_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash-lite
```

Get a key at https://aistudio.google.com/apikey. The extraction pipeline currently requires `GOOGLE_API_KEY`. Configure Vertex AI separately before switching the agent deployment to Vertex.

Run the web app:

```bash
uvicorn app:app --reload
```

Open http://localhost:8000. The analysis response includes `session_id`, `answer_markdown`, `urgent` and `lawyer_brief`. The UI provides a local JSON download of the draft brief.

Run automated tests:

```bash
python -m pip install pytest
pytest -q
```

Test extraction directly with a fictional or properly consented test document:

```bash
python test_pipeline.py path/to/notice.jpg
```

## Project layout

| Path | Purpose |
|---|---|
| `app.py` | FastAPI app, upload validation, session handling, API endpoints |
| `pipeline.py` | Gemini structured extraction, page-aware facts and evidence pointers |
| `briefs.py` | Structured lawyer-intake draft and evidence status |
| `uploads.py` | Server-side file signature and size validation |
| `agent.py` | Google ADK agent and safety instructions |
| `tools/legal_tools.py` | Legal context, deadline, legal-aid eligibility and centre tools |
| `rules/` | Deadline, legal-aid and district-lookup logic |
| `knowledge/` | Notes for supported document types; placeholders are not treated as reviewed notes |
| `data/dlsa_karnataka.csv` | Karnataka district legal services contacts (currently contains placeholders) |
| `static/index.html` | Mobile-first web UI in English, Hindi and Kannada |
| `metrics.py` | Aggregate event counters without document text |
| `recorder.py`, `sidecar.py`, `memory.py` | AgentFoundry-generated local tooling |

## API

| Endpoint | Purpose |
|---|---|
| `GET /` | Web UI |
| `POST /analyze` | Multipart form: `files`, `language` (`en`/`hi`/`kn`), optional `received_date` and `district`; returns explanation and lawyer-intake draft |
| `POST /chat` | Form: `session_id`, `message`; session-bound follow-up |
| `POST /feedback` | Form: `session_id`, `rating` (`1` or `-1`) |
| `GET /districts.csv` | District options |
| `GET /impact` | Aggregate event counts |
| `GET /health` | Health check |

## Deployment

The Dockerfile expects the repository root as its build context. Set `GOOGLE_API_KEY` and any model configuration through the hosting provider's secret/environment settings, never in source control. Run tests before deploying.


## Lawyer review workspace (Phase 2)

The private demo workspace is available at `/review`. It provides a queue, editable brief fields, review decisions, audit history and approved PDF/DOCX exports.

Configure a high-entropy token in the hosting environment or in the uncommitted `.env.local` file:

```bash
export REVIEWER_API_TOKEN="$(openssl rand -hex 32)"
```

If using `.env.local`, add `REVIEWER_API_TOKEN=...` there and restart the server. The workspace is disabled when the token is not configured. Do not commit the token.

From the result page, use **Save to lawyer review workspace**. This is an explicit operation that stores the extracted brief and review metadata in a local SQLite database; the original upload is not stored by this review store. The UI prompts for the token and sends it with the save request. Open `/review`, enter the token and a reviewer label, then select the case.

Workspace capabilities:
- List cases by `pending_review`, `changes_requested`, `approved`, or `rejected` status.
- Correct only the whitelisted brief fields: summary, parties, demands/claims, dates/periods, legal provisions cited and information to confirm.
- Record a correction note and an audit event with before/after values for changed fields.
- Request changes or reject intake. Approval requires explicit confirmations that the source, extracted facts and date/deadline language were reviewed.
- Export PDF or DOCX only after the current brief has been approved. Saving corrections to an approved brief resets it to pending review and removes its active approval metadata.
- Permanently delete a case and its event history.

API routes (all require `X-Reviewer-Token`; `X-Reviewer-Label` is a self-reported display label):
- `GET /review` — review workspace UI
- `GET /review/cases?status=pending_review` — list cases
- `POST /review/cases` — create from a `schema_version: "1.0"` lawyer brief
- `GET /review/cases/{case_id}` — retrieve a case and brief
- `PUT /review/cases/{case_id}/brief` — save allowlisted corrections using `expected_revision`
- `POST /review/cases/{case_id}/decision` — approve, request changes, or reject
- `GET /review/cases/{case_id}/events` — audit history
- `GET /review/cases/{case_id}/export?format=pdf` or `format=docx` — export approved brief
- `DELETE /review/cases/{case_id}?confirm=true` — permanently delete the case and audit history

Storage defaults to `.nyaya_saathi/review.sqlite3`; configure `REVIEW_DB_PATH` for a different location. The database contains personal information from extracted briefs. It is not encrypted by the application, so protect the host disk and backups. The self-reported reviewer label is not authenticated identity. This shared-token workflow is only for a private prototype/demo: do not expose it publicly or use it for live client matters before adding individual authentication, authorization, secure key management, encryption at rest, retention controls and security review. The audit trail is mutable local SQLite data, not tamper-evident or a regulated case record.

PDF export uses installed Unicode fonts (the Docker image installs Noto core fonts). DOCX supports Unicode text, but exported documents must still be visually checked for the languages and fonts actually used.

## Before real use

- [ ] Legal knowledge notes and jurisdiction rules are reviewed, sourced and dated by a qualified professional.
- [ ] District legal-aid directory placeholders are replaced with verified official contacts.
- [ ] Source quotations, date extraction and no-date assumptions are tested against a reviewed benchmark.
- [ ] Hindi and Kannada explanations are reviewed by proficient speakers.
- [ ] Privacy notice matches the configured model provider and any recording/persistence.
- [ ] Real-client data is not sent through the CLI recorder and is handled only under an approved data-processing arrangement.
- [ ] A qualified professional reviews the intake brief before it is used for a matter.
