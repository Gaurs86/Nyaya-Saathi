"""FastAPI web app for Nyaya Saathi.

Endpoints:
- GET / -> static/index.html
- POST /analyze -> multipart form with images (1-3) or one PDF
- POST /chat -> {session_id, message}
- POST /feedback -> {session_id, rating}
- GET /health -> "ok"

This app sends the extracted facts to the ADK agent and returns the agent's reply.
Images are processed in memory only.
"""
import os
import io
import json
import uuid
import asyncio
import logging
import time
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from google.adk.runners import InMemoryRunner
from google.genai.types import Content, Part

from zoneinfo import ZoneInfo
from pypdf import PdfReader
from pipeline import extract_notice
from briefs import build_lawyer_brief
from uploads import MAX_FILE_BYTES, validate_upload_payloads
from rules import deadlines as deadlines_mod, dlsa as dlsa_mod
import agent as agent_module
from tools import legal_tools
from metrics import log_event, aggregate_events

# App config
PORT = int(os.getenv('PORT', '8000'))
STATIC_DIR = os.path.join(os.path.dirname(__file__), 'static')

app = FastAPI(title='Nyaya Saathi Web')
logger = logging.getLogger(__name__)
# One shared runner: InMemoryRunner keeps sessions in memory, so /chat must reuse the same one as /analyze
RUNNER = InMemoryRunner(agent=agent_module.root_agent, app_name=agent_module.APP_NAME)
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])
app.mount('/static', StaticFiles(directory=STATIC_DIR), name='static')

# Simple feedback store
FEEDBACK_FILE = os.path.join(os.path.dirname(__file__), '.feedback.jsonl')

# Browser sessions are isolated by a random ADK user ID. They are ephemeral,
# process-local sessions, not authenticated accounts or a durable case database.
SESSION_TTL_SECONDS = 45 * 60
MAX_TRACKED_SESSIONS = 5000
SESSION_OWNERS: dict[str, tuple[str, float]] = {}


def _prune_sessions() -> None:
    now = time.monotonic()
    expired = [
        sid for sid, (_, created) in SESSION_OWNERS.items()
        if now - created > SESSION_TTL_SECONDS
    ]
    for sid in expired:
        SESSION_OWNERS.pop(sid, None)
    while len(SESSION_OWNERS) > MAX_TRACKED_SESSIONS:
        oldest = min(SESSION_OWNERS, key=lambda sid: SESSION_OWNERS[sid][1])
        SESSION_OWNERS.pop(oldest, None)


def _register_session(session_id: str, user_id: str) -> None:
    _prune_sessions()
    SESSION_OWNERS[session_id] = (user_id, time.monotonic())
    _prune_sessions()


def _session_owner(session_id: str) -> Optional[str]:
    _prune_sessions()
    entry = SESSION_OWNERS.get(session_id)
    return entry[0] if entry else None


def _extract_pdf_source_text(payloads: list[bytes], mime_types: list[str]) -> dict[int, str]:
    """Extract any native PDF text for quote checking. Scanned PDFs remain unverified."""
    if len(payloads) != 1 or mime_types != ["application/pdf"]:
        return {}
    try:
        reader = PdfReader(io.BytesIO(payloads[0]))
        if len(reader.pages) > 20:
            raise ValueError("PDFs are limited to 20 pages for this prototype.")
        return {index + 1: (page.extract_text() or "") for index, page in enumerate(reader.pages)}
    except ValueError:
        raise
    except Exception as exc:
        logger.warning("Could not inspect PDF text layer (%s)", type(exc).__name__)
        return {}


@app.get('/health')
async def health():
    return JSONResponse('ok')


@app.get('/impact')
async def impact():
    data = aggregate_events()
    return JSONResponse(data)


@app.get('/districts.csv')
async def districts_csv():
    return FileResponse(os.path.join(os.path.dirname(__file__), 'data', 'dlsa_karnataka.csv'))


@app.get('/')
async def index():
    return FileResponse(os.path.join(STATIC_DIR, 'index.html'))


async def _run_agent_with_payload(payload_text: str, slug: str = 'nyaya-saathi') -> dict:
    """Run the ADK agent with the provided payload text and return the final text answer and session id.

    Returns: {session_id, answer}
    """
    runner = RUNNER
    # A unique user ID prevents separate browser sessions from sharing ADK state.
    # Do not wrap web runs in AgentFoundry's full-input recorder: payloads include
    # extracted names, case identifiers and other sensitive legal-document facts.
    user_id = uuid.uuid4().hex
    session = await runner.session_service.create_session(app_name=agent_module.APP_NAME, user_id=user_id)
    _register_session(session.id, user_id)

    new_message = Content(role='user', parts=[Part(text=payload_text)])
    stream = runner.run_async(user_id=user_id, session_id=session.id, new_message=new_message)

    answer_parts: List[str] = []
    async for event in stream:
        content = getattr(event, 'content', None)
        if content and getattr(content, 'parts', None):
            for part in content.parts:
                text = getattr(part, 'text', None)
                if text:
                    answer_parts.append(text)

    return {'session_id': session.id, 'answer': ''.join(answer_parts)}


IST = ZoneInfo('Asia/Kolkata')


def _compute_urgent_flag(extraction, deadlines) -> bool:
    """Urgent if arrest/warrant/domestic violence is mentioned, or any real deadline is due within 7 days or has passed."""
    if getattr(extraction, 'mentions_arrest_or_warrant', False) or getattr(extraction, 'mentions_domestic_violence', False):
        return True
    return any(not d.get('informational') and (d.get('urgent') or d.get('overdue')) for d in deadlines)


@app.post('/analyze')
async def analyze(
    files: List[UploadFile] = File(...),
    language: str = Form(...),
    received_date: Optional[str] = Form(''),
    district: Optional[str] = Form('')
):
    # Validate language
    if language not in ('kn', 'hi', 'en'):
        raise HTTPException(status_code=400, detail='language must be kn, hi or en')

    if not files:
        raise HTTPException(status_code=400, detail='No files uploaded')
    if len(files) > 3:
        raise HTTPException(status_code=400, detail='Upload one PDF or up to three images.')

    if received_date:
        try:
            parsed_received = datetime.strptime(received_date, '%Y-%m-%d')
            if parsed_received.date().isoformat() != received_date:
                raise ValueError
        except ValueError:
            raise HTTPException(status_code=400, detail='received_date must use YYYY-MM-DD.')

    images = []
    for upload in files:
        # Read at most one byte over the per-file limit so oversized requests
        # are rejected without buffering the whole file into memory.
        content = await upload.read(MAX_FILE_BYTES + 1)
        images.append(content)

    try:
        mime_types = validate_upload_payloads(images)
        source_text_by_page = _extract_pdf_source_text(images, mime_types)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Run extraction. Do not return provider exceptions or document content to
    # the browser; operational logs record only the exception class.
    try:
        extraction = extract_notice(images, mime_types)
    except Exception as exc:
        logger.warning("Notice extraction failed (%s)", type(exc).__name__)
        log_event('unreadable', 'unknown', language)
        raise HTTPException(status_code=502, detail='The document could not be analysed. Please try a clearer file or try again.')

    # Log that a notice was explained (we haven't run the agent yet)
    log_event('notice_explained', getattr(extraction, 'doc_type', 'unknown'), language)

    # Prepare a structured, evidence-aware intake draft. Native PDF text can be
    # used to check quote matching; image/scanned sources remain unverified.
    ext = extraction.model_dump()
    today = datetime.now(IST).date().isoformat()
    deadlines = deadlines_mod.compute_deadlines(ext['doc_type'], ext['dates'], received_date or None, today)
    lawyer_brief = build_lawyer_brief(
        ext, deadlines, language=language, source_text_by_page=source_text_by_page
    )
    centers = dlsa_mod.find_center(district) if district else None
    payload_obj = {
        'extraction': ext,
        'language': language,
        'received_date': received_date or None,
        'district': district or None,
        'today': today,
        'deadlines': deadlines,
        'legal_aid_centers': centers,
    }
    payload_text = json.dumps(payload_obj, ensure_ascii=False)

    # Run agent
    try:
        run_result = await _run_agent_with_payload(payload_text)
    except Exception as exc:
        logger.warning("ADK agent run failed (%s)", type(exc).__name__)
        raise HTTPException(status_code=502, detail='The explanation could not be generated. Please try again.')

    urgent = _compute_urgent_flag(extraction, deadlines)

    # If urgent, log event
    if urgent:
        log_event('sensitive_route', getattr(extraction, 'doc_type', 'unknown'), language)

    return JSONResponse({
        'session_id': run_result['session_id'],
        'answer_markdown': run_result['answer'],
        'urgent': urgent,
        'lawyer_brief': lawyer_brief,
    })


@app.post('/chat')
async def chat(session_id: str = Form(...), message: str = Form(...)):
    if not message.strip():
        raise HTTPException(status_code=400, detail='Message cannot be empty.')
    if len(message) > 4000:
        raise HTTPException(status_code=413, detail='Message must be 4000 characters or less.')
    user_id = _session_owner(session_id)
    if user_id is None:
        raise HTTPException(status_code=404, detail='This session expired or is unavailable. Please analyse the notice again.')
    runner = RUNNER
    new_message = Content(role='user', parts=[Part(text=message.strip())])
    stream = runner.run_async(user_id=user_id, session_id=session_id, new_message=new_message)
    answer_parts: List[str] = []
    try:
        async for event in stream:
            content = getattr(event, 'content', None)
            if content and getattr(content, 'parts', None):
                for part in content.parts:
                    text = getattr(part, 'text', None)
                    if text:
                        answer_parts.append(text)
    except Exception as exc:
        logger.warning("ADK follow-up failed (%s)", type(exc).__name__)
        raise HTTPException(status_code=502, detail='The follow-up could not be generated. Please try again.')

    answer = ''.join(answer_parts)
    # Log follow-up question
    log_event('followup_question', 'unknown', 'unknown')
    return JSONResponse({'session_id': session_id, 'answer_markdown': answer})


@app.post('/feedback')
async def feedback(session_id: str = Form(...), rating: int = Form(...)):
    if _session_owner(session_id) is None:
        raise HTTPException(status_code=404, detail='This session expired or is unavailable.')
    if rating not in (1, -1):
        raise HTTPException(status_code=400, detail='rating must be 1 or -1')
    entry = {'ts': datetime.utcnow().isoformat(), 'session_id': session_id, 'rating': rating}
    try:
        with open(FEEDBACK_FILE, 'a', encoding='utf-8') as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + '\n')
    except Exception:
        pass
    # Log feedback
    if rating == 1:
        log_event('feedback_up', 'unknown', 'unknown')
    else:
        log_event('feedback_down', 'unknown', 'unknown')
    return JSONResponse({'ok': True})


if __name__ == '__main__':
    import uvicorn
    uvicorn.run('app:app', host='0.0.0.0', port=PORT, reload=True)
