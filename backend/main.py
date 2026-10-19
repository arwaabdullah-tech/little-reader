"""Little Reader (القارئ الصغير) API: the حكاية bedtime method.
حديث (talk) → كتاب (book) → ارتقاء (read together) → يُطوى اليوم (goodnight) → صباح الوالدين.
All private routes need a parent token. Interactive docs: /api/docs"""
from __future__ import annotations

import hashlib
import asyncio
import io
import json
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import jwt
from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from PIL import Image, UnidentifiedImageError
from pwdlib import PasswordHash
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from . import ai, config, demo
from .db import Alert, Child, Reading, SessionLocal, Story, User

SECRET = config.JWT_SECRET or (secrets.token_hex(32) if config.DEMO_MODE else '')
MEDIA = config.MEDIA_DIR
(MEDIA / 'tts').mkdir(parents=True, exist_ok=True)
LADDER_NAMES = {'ar': ['كلمتي', 'جملتي', 'فقرتي', 'صفحتي'], 'en': ['My word', 'My sentence', 'My paragraph', 'My page']}

app = FastAPI(title='Little Reader API', version='2.0.0', docs_url='/api/docs', openapi_url='/api/openapi.json')
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_credentials=False,
                   allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], allow_headers=['Authorization', 'Content-Type'])
password_hash = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------- helpers
def db_session():
    with SessionLocal() as db:
        yield db


def current_user(token: Optional[HTTPAuthorizationCredentials] = Depends(bearer), db: Session = Depends(db_session)) -> User:
    if not token or not SECRET:
        raise HTTPException(401, 'Please sign in')
    try:
        uid = jwt.decode(token.credentials, SECRET, algorithms=['HS256'], options={'require': ['exp', 'sub']})['sub']
    except (jwt.InvalidTokenError, KeyError):
        raise HTTPException(401, 'Invalid or expired session')
    user = db.get(User, uid)
    if not user:
        raise HTTPException(401, 'Account unavailable')
    return user


def owned_child(db: Session, user: User, child_id: str) -> Child:
    child = db.get(Child, child_id)
    if not child or child.user_id != user.id:
        raise HTTPException(404, 'Child not found')
    return child


def owned_story(db: Session, user: User, story_id: str) -> Story:
    story = db.get(Story, story_id)
    if not story or story.user_id != user.id:
        raise HTTPException(404, 'Story not found')
    return story


def issue_token(user: User) -> str:
    return jwt.encode({'sub': user.id, 'exp': datetime.now(timezone.utc) + timedelta(days=7)}, SECRET, algorithm='HS256')


def media_url(path: Optional[str]) -> Optional[str]:
    return f'/api/media/{path}' if path else None


def save_png(blob: bytes) -> str:
    name = secrets.token_hex(18) + '.png'
    (MEDIA / name).write_bytes(blob)
    return name


def now_utc() -> datetime:
    return datetime.utcnow()


def local_today():
    return (now_utc() + timedelta(hours=config.TZ_OFFSET_HOURS)).date()


def to_local_date(dt: datetime):
    return (dt + timedelta(hours=config.TZ_OFFSET_HOURS)).date()


def child_json(c: Child) -> dict:
    lang = c.language if c.language in LADDER_NAMES else 'ar'
    name = 'شهد' if config.DEMO_MODE and config.FAST_DEMO and c.name.strip().lower() in ('سارة', 'ساره', 'sara', 'sarah') else c.name
    return {'id': c.id, 'name': name, 'age': c.age, 'gender': c.gender, 'language': c.language,
            'reading_level': c.reading_level, 'ladder_name': LADDER_NAMES[lang][c.reading_level - 1],
            'ladder_progress': c.ladder_progress, 'bedtime': c.bedtime, 'avatar_url': media_url(c.avatar_path),
            'avatar_source': c.avatar_source, 'consent': bool(c.consent_at),
            'sleep_until': c.sleep_until.isoformat() + 'Z' if c.sleep_until and c.sleep_until > now_utc() else None}


def book_number(db: Session, c: Child) -> int:
    return db.query(Story).filter_by(child_id=c.id).count() + (demo.SAMPLE_BOOKS if config.DEMO_MODE else 0)


def story_json(s: Story, c: Child, number: Optional[int] = None) -> dict:
    d = json.loads(s.content)
    illustrated = config.DEMO_MODE and d.get('illustrated_demo')
    if illustrated:
        d.update(demo.shahd_story(d.get('said', [])))
        d['lang'] = 'ar'
    return {**d, 'id': s.id, 'child_id': s.child_id, 'title': d['title'] if illustrated else s.title, 'source': s.source,
            'cover_url': '/api/demo-assets/page-1.png?v=2' if illustrated else media_url(s.cover_path), 'cover_status': s.cover_status, 'avatar_url': media_url(c.avatar_path),
            'book_number': number, 'created_at': s.created_at.isoformat() + 'Z'}


def ladder_for_age(age: int) -> int:
    return 1 if age <= 4 else 2 if age == 5 else 3 if age == 6 else 4


# ---------------------------------------------------------------- schemas
class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class ChildCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    age: int = Field(ge=3, le=10)
    gender: str = Field(default='f', pattern='^(m|f)$')
    language: str = Field(default='ar', pattern='^(ar|en)$')
    bedtime: str = Field(default='20:00', pattern='^([01][0-9]|2[0-3]):[0-5][0-9]$')
    consent: bool


class ChildUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=60)
    age: Optional[int] = Field(default=None, ge=3, le=10)
    gender: Optional[str] = Field(default=None, pattern='^(m|f)$')
    language: Optional[str] = Field(default=None, pattern='^(ar|en)$')
    bedtime: Optional[str] = Field(default=None, pattern='^([01][0-9]|2[0-3]):[0-5][0-9]$')
    reading_level: Optional[int] = Field(default=None, ge=1, le=4)


class DayAnswers(BaseModel):
    answers: list[str] = Field(min_length=3, max_length=3)


class Completion(BaseModel):
    minutes: int = Field(default=10, ge=0, le=120)
    child_lines: int = Field(default=0, ge=0, le=10)
    words_read: int = Field(default=0, ge=0, le=500)


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1500)
    lang: str = Field(default='ar', pattern='^(ar|en)$')


# ---------------------------------------------------------------- health & accounts
@app.get('/api/health')
def health():
    return {'status': 'ok', 'ai': ai.configured(), 'demo_mode': config.DEMO_MODE,
            'fast_demo': config.DEMO_MODE and config.FAST_DEMO, 'auth': bool(SECRET)}


@app.get('/api/demo-assets/{filename}')
def demo_asset(filename: str):
    allowed = ['avatar.png', 'voice-cover.mp3'] + [f'page-{i}.png' for i in range(1, 6)] + [
        f'voice-{i}-{role}.mp3' for i in range(1, 6) for role in ('parent', 'child')]
    path = Path(__file__).parent / 'demo_assets' / filename
    if not config.DEMO_MODE or filename not in allowed or not path.is_file():
        raise HTTPException(404, 'Asset not found')
    return FileResponse(path)


@app.post('/api/auth/guest')
def guest(db: Session = Depends(db_session)):
    """Quick start while presenting (DEMO_MODE=1): a private guest account, no email needed."""
    if not config.DEMO_MODE:
        raise HTTPException(403, 'Please create an account')
    if not SECRET:
        raise HTTPException(503, 'JWT_SECRET missing')
    u = User(is_guest=True)
    db.add(u); db.commit()
    return {'token': issue_token(u), 'user': {'id': u.id, 'guest': True}}


@app.post('/api/auth/register')
def register(data: Credentials, db: Session = Depends(db_session)):
    if not SECRET:
        raise HTTPException(503, 'JWT_SECRET missing')
    email = str(data.email).lower()
    if db.query(User).filter_by(email=email).first():
        raise HTTPException(409, 'Email already registered')
    u = User(email=email, password_hash=password_hash.hash(data.password))
    db.add(u); db.commit()
    return {'token': issue_token(u), 'user': {'id': u.id, 'email': u.email}}


@app.post('/api/auth/login')
def login(data: Credentials, db: Session = Depends(db_session)):
    if not SECRET:
        raise HTTPException(503, 'JWT_SECRET missing')
    u = db.query(User).filter_by(email=str(data.email).lower()).first()
    if not u or not u.password_hash or not password_hash.verify(data.password, u.password_hash):
        raise HTTPException(401, 'Invalid email or password')
    return {'token': issue_token(u), 'user': {'id': u.id, 'email': u.email}}


@app.get('/api/me')
def me(u: User = Depends(current_user)):
    return {'id': u.id, 'email': u.email, 'guest': u.is_guest}


# ---------------------------------------------------------------- children (parent setup)
@app.get('/api/children')
def list_children(u: User = Depends(current_user), db: Session = Depends(db_session)):
    return [child_json(c) for c in db.query(Child).filter_by(user_id=u.id).order_by(Child.created_at).all()]


@app.post('/api/children')
def create_child(data: ChildCreate, u: User = Depends(current_user), db: Session = Depends(db_session)):
    if not data.consent:
        raise HTTPException(400, 'Parent or guardian consent is required')
    c = Child(user_id=u.id, name=data.name.strip(), age=data.age, gender=data.gender, language=data.language,
              bedtime=data.bedtime, reading_level=ladder_for_age(data.age), consent_at=now_utc())
    db.add(c); db.commit()
    return child_json(c)


@app.patch('/api/children/{child_id}')
def edit_child(child_id: str, data: ChildUpdate, u: User = Depends(current_user), db: Session = Depends(db_session)):
    c = owned_child(db, u, child_id)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(c, k, v.strip() if isinstance(v, str) else v)
    db.commit()
    return child_json(c)


@app.delete('/api/children/{child_id}')
def delete_child(child_id: str, u: User = Depends(current_user), db: Session = Depends(db_session)):
    """Deletes the child, every book, reading log, alert and picture."""
    erase_child(db, owned_child(db, u, child_id))
    return {'deleted': True}


@app.delete('/api/me')
def delete_account(u: User = Depends(current_user), db: Session = Depends(db_session)):
    """Deletes the parent account and everything in it."""
    for c in db.query(Child).filter_by(user_id=u.id).all():
        erase_child(db, c)
    db.query(Alert).filter_by(user_id=u.id).delete()
    db.delete(u); db.commit()
    return {'deleted': True}


def erase_child(db: Session, c: Child):
    db.query(Reading).filter_by(child_id=c.id).delete()
    db.query(Alert).filter_by(child_id=c.id).delete()
    for s in db.query(Story).filter_by(child_id=c.id).all():
        if s.cover_path:
            (MEDIA / s.cover_path).unlink(missing_ok=True)
        db.delete(s)
    if c.avatar_path:
        (MEDIA / c.avatar_path).unlink(missing_ok=True)
    db.delete(c); db.commit()


@app.post('/api/children/{child_id}/avatar')
async def avatar(child_id: str, photo: UploadFile = File(...), consent: bool = Form(...),
                 u: User = Depends(current_user), db: Session = Depends(db_session)):
    """Photo → cartoon hero. The original photo is processed in memory and never stored."""
    if not consent:
        raise HTTPException(400, 'Parent or guardian consent is required')
    c = owned_child(db, u, child_id)
    content = await photo.read(8_000_001)
    if len(content) > 8_000_000:
        raise HTTPException(413, 'Photo too large (max 8 MB)')
    try:
        img = Image.open(io.BytesIO(content))
        img.verify()
        img = Image.open(io.BytesIO(content)).convert('RGB')
        img.thumbnail((1024, 1024))
        buf = io.BytesIO(); img.save(buf, format='PNG'); png = buf.getvalue()
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(400, 'Unreadable photo (use JPG, PNG or WebP)')
    source = 'ai'
    try:
        if config.DEMO_MODE and config.FAST_DEMO:
            await asyncio.sleep(1)
            cartoon = (Path(__file__).parent / 'demo_assets' / 'avatar.png').read_bytes()
            source = 'demo'
        else:
            cartoon = await ai.cartoon_avatar(png)
    except ai.AIError:
        if not config.DEMO_MODE:
            raise HTTPException(502, 'The cartoon could not be made; check the image model in .env')
        cartoon, source = ai.local_cartoon(png), 'local'
    old = c.avatar_path
    c.avatar_path, c.avatar_source = save_png(cartoon), source
    db.commit()
    if old:
        (MEDIA / old).unlink(missing_ok=True)
    return child_json(c)


# ---------------------------------------------------------------- tonight's book
async def make_cover(story_id: str):
    """Runs after the story is returned, so the child can start reading while the cover is painted."""
    with SessionLocal() as db:
        s = db.get(Story, story_id)
        if not s:
            return
        c = db.get(Child, s.child_id)
        scene = json.loads(s.content).get('cover_scene', '')
        ref = (MEDIA / c.avatar_path).read_bytes() if c and c.avatar_path and (MEDIA / c.avatar_path).is_file() else None
        try:
            s.cover_path, s.cover_status = save_png(await ai.cover_art(scene, ref)), 'ready'
        except ai.AIError:
            s.cover_status = 'failed'
        db.commit()


@app.post('/api/children/{child_id}/stories')
async def create_story(child_id: str, data: DayAnswers, background: BackgroundTasks,
                       u: User = Depends(current_user), db: Session = Depends(db_session)):
    c = owned_child(db, u, child_id)
    if not c.consent_at:
        raise HTTPException(400, 'Parent setup is not finished')
    if not config.DEMO_MODE and c.sleep_until and c.sleep_until > now_utc():
        raise HTTPException(409, 'Little Reader is asleep until the morning')
    answers = [a.strip()[:600] for a in data.answers]
    if any(not a for a in answers):
        raise HTTPException(422, 'Please answer the three questions')

    # 1) safety first: a worrying answer never becomes a story; the parent gets a private note instead
    concern = demo.worrying(answers)
    fast_demo = config.DEMO_MODE and config.FAST_DEMO
    if not concern and ai.configured() and not fast_demo:
        try:
            concern = not await ai.is_safe(answers)
        except ai.AIError:
            if not config.DEMO_MODE:
                raise HTTPException(502, 'The safety check is unavailable; please try again')
    if concern:
        db.add(Alert(user_id=u.id, child_id=c.id)); db.commit()
        return {'concern': True}

    # 2) the book
    source = 'ai'
    try:
        if fast_demo:
            await asyncio.sleep(1)
            story, source = demo.shahd_story(answers), 'demo'
        else:
            story = await ai.write_story(c.name, c.gender, c.age, c.language, c.reading_level, answers)
    except ai.AIError:
        if not config.DEMO_MODE:
            raise HTTPException(502, 'The story could not be written; check the text model in .env')
        story, source = demo.backup_story(c.name, c.gender, c.language, c.reading_level, answers), 'demo'
    story.update({'said': answers, 'ladder_step': c.reading_level, 'lang': 'ar' if fast_demo else c.language, 'safety_checked': True})
    s = Story(user_id=u.id, child_id=c.id, title=story['title'], content=json.dumps(story, ensure_ascii=False),
              source=source, cover_status='pending' if ai.configured() and not fast_demo else 'none')
    if fast_demo:
        s.cover_path = save_png((Path(__file__).parent / 'demo_assets' / 'page-1.png').read_bytes())
        s.cover_status = 'ready'
    db.add(s); db.commit()
    if s.cover_status == 'pending':
        background.add_task(make_cover, s.id)
    return story_json(s, c, book_number(db, c))


@app.get('/api/children/{child_id}/stories')
def shelf(child_id: str, u: User = Depends(current_user), db: Session = Depends(db_session)):
    c = owned_child(db, u, child_id)
    stories = db.query(Story).filter_by(child_id=c.id).order_by(Story.created_at.desc()).limit(60).all()
    first = demo.SAMPLE_BOOKS if config.DEMO_MODE else 0
    total = len(stories)
    return {'sample_books': first, 'stories': [
        {'id': s.id, 'title': s.title,
         'cover_url': '/api/demo-assets/page-1.png?v=2' if config.DEMO_MODE and json.loads(s.content).get('illustrated_demo') else media_url(s.cover_path), 'cover_status': s.cover_status,
         'book_number': first + total - i, 'created_at': s.created_at.isoformat() + 'Z'} for i, s in enumerate(stories)]}


@app.get('/api/stories/{story_id}')
def get_story(story_id: str, u: User = Depends(current_user), db: Session = Depends(db_session)):
    s = owned_story(db, u, story_id)
    c = db.get(Child, s.child_id)
    earlier = db.query(Story).filter(Story.child_id == c.id, Story.created_at <= s.created_at).count()
    return story_json(s, c, earlier + (demo.SAMPLE_BOOKS if config.DEMO_MODE else 0))


@app.post('/api/stories/{story_id}/complete')
def complete(story_id: str, data: Completion, u: User = Depends(current_user), db: Session = Depends(db_session)):
    """Goodnight: log the reading, adapt the reading level, and lock until the morning."""
    s = owned_story(db, u, story_id)
    c = db.get(Child, s.child_id)
    if not db.query(Reading).filter_by(story_id=s.id).first():
        db.add(Reading(user_id=u.id, child_id=c.id, story_id=s.id, minutes=data.minutes,
                       child_lines=data.child_lines, words_read=data.words_read))
        if data.child_lines >= 4 and c.reading_level < 4:
            c.ladder_progress = min(100, c.ladder_progress + 35)
            if c.ladder_progress >= 100:
                c.reading_level, c.ladder_progress = c.reading_level + 1, 0
    local = now_utc() + timedelta(hours=config.TZ_OFFSET_HOURS)
    wake = local.replace(hour=config.WAKE_HOUR, minute=0, second=0, microsecond=0)
    if wake <= local:
        wake += timedelta(days=1)
    c.sleep_until = wake - timedelta(hours=config.TZ_OFFSET_HOURS)
    db.commit()
    return {'sleep_until': c.sleep_until.isoformat() + 'Z', 'child': child_json(c)}


@app.post('/api/children/{child_id}/wake')
def wake(child_id: str, u: User = Depends(current_user), db: Session = Depends(db_session)):
    """Presenting only (DEMO_MODE=1): skip to the next evening."""
    if not config.DEMO_MODE:
        raise HTTPException(403, 'Available in demo mode only')
    c = owned_child(db, u, child_id)
    c.sleep_until = None; db.commit()
    return child_json(c)


# ---------------------------------------------------------------- parents' morning
@app.get('/api/children/{child_id}/dashboard')
def dashboard(child_id: str, u: User = Depends(current_user), db: Session = Depends(db_session)):
    c = owned_child(db, u, child_id)
    lang = c.language if c.language in ('ar', 'en') else 'ar'
    stories = db.query(Story).filter_by(child_id=c.id).order_by(Story.created_at).all()
    readings = db.query(Reading).filter_by(child_id=c.id).all()
    today = local_today()
    days = [today - timedelta(days=d) for d in range(13, -1, -1)]
    per_day = {}
    for r in readings:
        day = to_local_date(r.created_at)
        per_day[day] = per_day.get(day, 0) + r.words_read
    nights = [per_day.get(d) for d in days]
    real_nights = sum(1 for v in nights if v is not None)
    sample = config.DEMO_MODE and real_nights < 3
    if sample:  # presenting: 13 sample nights + tonight
        nights = demo.SAMPLE_NIGHTS + [per_day.get(today, (stories and 12) or None)]
    contents = [json.loads(s.content) for s in stories]
    words = []
    for d in reversed(contents):
        for w in [b[1] for b in d.get('bridges', [])] + d.get('words', []):
            w = w.replace('~', '')
            if w and w not in words:
                words.append(w)
    week = [{'date': d.isoformat(), 'feeling': None} for d in days[-7:]]
    for s, d in zip(stories, contents):
        day = to_local_date(s.created_at)
        for item in week:
            if item['date'] == day.isoformat() and d.get('feelings'):
                item['feeling'] = d['feelings'][0]
    if sample:
        for item, f in zip(week[:-1], demo.SAMPLE_WEEK[lang]):
            item['feeling'] = item['feeling'] or f
    latest = contents[-1] if contents else None
    minutes = [r.minutes for r in readings]
    alerts = db.query(Alert).filter_by(child_id=c.id).order_by(Alert.created_at.desc()).all()
    return {
        'child': child_json(c),
        'includes_sample': sample,
        'kpi': {
            'nights_with_book': sum(1 for v in nights if v is not None), 'nights_total': len(nights),
            'avg_minutes': round(sum(minutes) / len(minutes)) if minutes and not sample else (demo.SAMPLE_MINUTES if sample else 0),
            'fusha_words': len(words) + (demo.SAMPLE_WORDS_COUNT - 9 if sample else 0),
            'facts': sum(len(d.get('facts', [])) for d in contents) + (demo.SAMPLE_FACTS_COUNT if sample else 0),
            'books': len(stories) + (demo.SAMPLE_BOOKS if config.DEMO_MODE else 0),
        },
        'nights': [{'date': d.isoformat(), 'words': v} for d, v in zip(days, nights)],
        'week': week,
        'words': (words + (demo.SAMPLE_WORDS[lang] if sample else []))[:24],
        'latest': {'title': stories[-1].title, 'question': latest.get('parent_question'), 'mission': latest.get('mission'),
                   'facts': latest.get('facts', []),
                   'feelings': latest.get('feelings', []), 'story_id': stories[-1].id} if latest else None,
        'alerts': [{'date': a.created_at.isoformat() + 'Z'} for a in alerts[:5]],
        'books': len(stories) + (demo.SAMPLE_BOOKS if config.DEMO_MODE else 0),
    }


# ---------------------------------------------------------------- voice
@app.post('/api/tts')
async def tts(data: SpeakRequest, u: User = Depends(current_user)):
    """Hudhud reads aloud (OpenAI voice). Cached, so a page is only paid for once."""
    if not ai.configured():
        raise HTTPException(503, 'AI voice is not configured')
    text = data.text.replace('~', '').strip()
    key = hashlib.sha256(f'{config.TTS_MODEL}|{config.TTS_VOICE}|{data.lang}|{text}'.encode()).hexdigest()[:40]
    path = MEDIA / 'tts' / f'{key}.mp3'
    if not path.is_file():
        try:
            path.write_bytes(await ai.speak(text, data.lang))
        except ai.AIError:
            raise HTTPException(502, 'The AI voice is unavailable')
    return FileResponse(path, media_type='audio/mpeg', headers={'Cache-Control': 'private, max-age=86400'})


@app.post('/api/transcribe')
async def transcribe(audio: UploadFile = File(...), lang: str = Form('ar'), u: User = Depends(current_user)):
    """The child's voice → text. The audio is processed in memory and never stored."""
    if not ai.configured():
        raise HTTPException(503, 'Speech-to-text is not configured')
    blob = await audio.read(10_000_001)
    if len(blob) > 10_000_000:
        raise HTTPException(413, 'Recording too long')
    try:
        text = await ai.transcribe(blob, audio.filename or 'answer.webm', 'en' if lang == 'en' else 'ar')
    except ai.AIError:
        raise HTTPException(502, 'Speech-to-text is unavailable')
    return {'text': text}


# ---------------------------------------------------------------- private pictures
@app.get('/api/media/{filename}')
def media(filename: str, u: User = Depends(current_user), db: Session = Depends(db_session)):
    if '/' in filename or '\\' in filename or not filename.endswith('.png'):
        raise HTTPException(404, 'Not found')
    mine = {c.avatar_path for c in db.query(Child).filter_by(user_id=u.id).all()}
    mine |= {s.cover_path for s in db.query(Story).filter_by(user_id=u.id).all()}
    if filename not in mine or not (MEDIA / filename).is_file():
        raise HTTPException(404, 'Not found')
    return FileResponse(MEDIA / filename, media_type='image/png', headers={'Cache-Control': 'private, max-age=600'})


# ---------------------------------------------------------------- optional: serve the website (no Docker)
if config.SERVE_FRONTEND:
    from fastapi.staticfiles import StaticFiles
    site = Path(config.SERVE_FRONTEND).resolve()

    @app.get('/app', include_in_schema=False)
    def app_page():
        return FileResponse(site / 'app.html')

    app.mount('/', StaticFiles(directory=site, html=True), name='site')
