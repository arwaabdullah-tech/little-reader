"""Settings, read once from the environment (.env via docker compose, or your shell)."""
import os
from pathlib import Path


def _flag(name: str, default: str = '0') -> bool:
    return os.getenv(name, default).strip().lower() in ('1', 'true', 'yes', 'on')


OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '').strip()
if OPENAI_API_KEY.startswith('replace_with'):
    OPENAI_API_KEY = ''
TEXT_MODEL = os.getenv('OPENAI_TEXT_MODEL', 'gpt-4.1-mini')
IMAGE_MODEL = os.getenv('OPENAI_IMAGE_MODEL', 'gpt-image-1')
IMAGE_FALLBACK_MODEL = os.getenv('OPENAI_IMAGE_FALLBACK_MODEL', 'gpt-image-1')
IMAGE_QUALITY = os.getenv('OPENAI_IMAGE_QUALITY', 'medium')
TTS_MODEL = os.getenv('OPENAI_TTS_MODEL', 'gpt-4o-mini-tts')
TTS_VOICE = os.getenv('OPENAI_TTS_VOICE', 'coral')
STT_MODEL = os.getenv('OPENAI_STT_MODEL', 'gpt-4o-mini-transcribe')

JWT_SECRET = os.getenv('JWT_SECRET', '').strip()
if JWT_SECRET.startswith('replace_with'):
    JWT_SECRET = ''
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:////data/little_reader.db')
MEDIA_DIR = Path(os.getenv('MEDIA_DIR', '/data/media'))
CORS_ORIGINS = [x.strip() for x in os.getenv('CORS_ORIGINS', 'http://localhost:8080').split(',') if x.strip()]

# DEMO_MODE=1 (for presenting): quick guest start, no night lock, sample history on the parent
# dashboard, and a ready-made backup story/cartoon if the AI is unreachable.
# DEMO_MODE=0 (default) is the real website for families.
DEMO_MODE = _flag('DEMO_MODE', '0')
# Serve the frontend folder from FastAPI too (handy without Docker): SERVE_FRONTEND=./frontend
SERVE_FRONTEND = os.getenv('SERVE_FRONTEND', '').strip()
# Families' local time (Asia/Riyadh = +3). The app sleeps until WAKE_HOUR local time.
TZ_OFFSET_HOURS = int(os.getenv('TZ_OFFSET_HOURS', '3'))
WAKE_HOUR = int(os.getenv('WAKE_HOUR', '7'))

MEDIA_DIR.mkdir(parents=True, exist_ok=True)
if DATABASE_URL.startswith('sqlite:'):
    Path(DATABASE_URL.split('///')[-1]).parent.mkdir(parents=True, exist_ok=True)
