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
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from google.adk.runners import InMemoryRunner
from google.genai.types import Content, Part

from pipeline import extract_notice
from recorder import record
import agent as agent_module
from tools import legal_tools
from metrics import log_event, aggregate_events

# App config
PORT = int(os.getenv('PORT', '8000'))
STATIC_DIR = os.path.join(os.path.dirname(__file__), 'static')

app = FastAPI(title='Nyaya Saathi Web')
# One shared runner: InMemoryRunner keeps sessions in memory, so /chat must reuse the same one as /analyze
RUNNER = InMemoryRunner(agent=agent_module.root_agent, app_name=agent_module.APP_NAME)
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])
app.mount('/static', StaticFiles(directory=STATIC_DIR), name='static')

# Simple feedback store
FEEDBACK_FILE = os.path.join(os.path.dirname(__file__), '.feedback.jsonl')


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
    # Use a single shared user id for web sessions
    user_id = agent_module.USER_ID
    session = await runner.session_service.create_session(app_name=agent_module.APP_NAME, user_id=user_id)

    new_message = Content(role='user', parts=[Part(text=payload_text)])
    stream = runner.run_async(user_id=user_id, session_id=session.id, new_message=new_message)

    # Collect text parts
    answer_parts: List[str] = []
    try:
        async for event in record(stream, slug=slug, input=payload_text, kit='google-adk-py', model=agent_module.MODEL):
            content = getattr(event, 'content', None)
            if content and getattr(content, 'parts', None):
                for part in content.parts:
                    text = getattr(part, 'text', None)
                    if text:
                        answer_parts.append(text)
    except Exception as e:
        raise

    answer = ''.join(answer_parts)
    return {'session_id': session.id, 'answer': answer}


def _compute_urgent_flag(extraction) -> bool:
    # urgent if mentions_arrest_or_warrant or mentions_domestic_violence or any explicit date within 7 days
    try:
        if getattr(extraction, 'mentions_arrest_or_warrant', False) or getattr(extraction, 'mentions_domestic_violence', False):
            return True
        today = datetime.utcnow().date()
        for d in getattr(extraction, 'dates', []) or []:
            date_str = getattr(d, 'date', None)  # Pydantic object, not a dict
            label = (getattr(d, 'label', '') or '').lower()
            if date_str and 'notice' not in label:  # ignore the notice's own issue date
                try:
                    dt = datetime.strptime(date_str, '%Y-%m-%d').date()
                    if 0 <= (dt - today).days <= 7:  # upcoming within 7 days
                        return True
                except Exception:
                    pass
    except Exception:
        pass
    return False


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

    if not files or len(files) == 0:
        raise HTTPException(status_code=400, detail='No files uploaded')
    if len(files) > 3:
        raise HTTPException(status_code=400, detail='Maximum 3 images allowed')

    images = []
    mime_types = []
    for f in files:
        content = await f.read()
        images.append(content)
        mime_types.append(f.content_type or 'application/octet-stream')

    # Run extraction
    try:
        extraction = extract_notice(images, mime_types)
    except Exception as e:
        # log unreadable
        log_event('unreadable', 'unknown', language)
        raise HTTPException(status_code=500, detail=str(e))

    # Log that a notice was explained (we haven't run the agent yet)
    log_event('notice_explained', getattr(extraction, 'doc_type', 'unknown'), language)

    # Prepare payload for agent: include extraction JSON and user's language, received_date and district
    payload_obj = {
        'extraction': extraction.model_dump(),
        'language': language,
        'received_date': received_date or None,
        'district': district or None
    }
    payload_text = json.dumps(payload_obj, ensure_ascii=False)

    # Run agent
    try:
        run_result = await _run_agent_with_payload(payload_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'Agent run failed: {e}')

    urgent = _compute_urgent_flag(extraction)

    # If urgent, log event
    if urgent:
        log_event('sensitive_route', getattr(extraction, 'doc_type', 'unknown'), language)

    return JSONResponse({'session_id': run_result['session_id'], 'answer_markdown': run_result['answer'], 'urgent': urgent})


@app.post('/chat')
async def chat(session_id: str = Form(...), message: str = Form(...)):
    runner = RUNNER
    user_id = agent_module.USER_ID
    new_message = Content(role='user', parts=[Part(text=message)])
    stream = runner.run_async(user_id=user_id, session_id=session_id, new_message=new_message)
    answer_parts: List[str] = []
    try:
        async for event in record(stream, slug=agent_module.SLUG, input=message, kit='google-adk-py', model=agent_module.MODEL):
            content = getattr(event, 'content', None)
            if content and getattr(content, 'parts', None):
                for part in content.parts:
                    text = getattr(part, 'text', None)
                    if text:
                        answer_parts.append(text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    answer = ''.join(answer_parts)
    # Log follow-up question
    log_event('followup_question', 'unknown', 'unknown')
    return JSONResponse({'session_id': session_id, 'answer_markdown': answer})


@app.post('/feedback')
async def feedback(session_id: str = Form(...), rating: int = Form(...)):
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
