# القارئ الصغير | Little Reader

**احكِ يومك… واقرأ حكايتك.** A 10-minute bedtime ritual for children aged 4–8: the child tells Hudhud the hoopoe about their day, and that day becomes tonight's illustrated picture book, written in simple Fusha, starring the child as a cartoon hero, read together with a parent.

It's a web app for laptops and phones, in Arabic (RTL) and English, built around the **حكاية** method:

| | Step | What happens |
|---|---|---|
| ح | **حديث** (Talk) | Hudhud asks three questions; the child answers by voice (or the demo's predefined answers). |
| ك | **كتاب** (Book) | Safety check → AI writes a 5-page story for the child's age. The day is the starting point, then the story widens into true facts about the world (science, nature, the body, animals, culture), with dialect→Fusha bridge words. The child's photo becomes a cartoon, and a cover is painted. |
| ا | **ارتقاء** (Rise) | Parent reads the blue lines, child reads the coral lines (more of the page as they get older). Each page has a "💡 هل تعلم؟" fact. Hudhud can read any page aloud with AI voice. |
| ي | **يُطوى اليوم** (Goodnight) | A small mission for tomorrow, then the app sleeps until morning. |
| ☀️ | **صباح الوالدين** | Parents' page: feelings, new Fusha words, the facts learned, a breakfast question, alerts. |

## Pages

- `/`: the website: how it works, features, for parents, safety, FAQ.
- `/app`: the web app. Sign up / sign in → setup (consent, name, age, photo) → cartoon → talk → making → reader → goodnight → parents' morning.
- `/privacy.html`: privacy policy.
- `/api/docs`: API documentation.

## Run with Docker

```bash
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
# edit .env: set OPENAI_API_KEY and JWT_SECRET
docker compose up --build
```

Open **http://localhost:8080**. **Never commit `.env`.**

### Check the OpenAI connection

```bash
docker compose exec api python -m backend.check_ai            # add --no-image to skip the picture test
```

It tries the safety check, the story writer, the read-aloud voice, speech-to-text and the cartoon picture with your key, and prints ✓ or ✗ with the reason for each. The parents' settings also show whether the AI is connected, and each book's cover says "✨ ذكاء اصطناعي" (written by AI) or "قصة احتياطية" (backup story).

> This version changed the database schema. If you ran an older version, reset its data once: `docker compose down -v`.

## Run without Docker

```bash
python -m venv .venv && . .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
export $(grep -v '^#' .env | xargs)              # or set the variables another way
DATABASE_URL=sqlite:///./data/little_reader.db MEDIA_DIR=./data/media \
SERVE_FRONTEND=./frontend uvicorn backend.main:app --port 8080
```

`SERVE_FRONTEND` makes FastAPI serve the website too, so one process is enough.

## Real website vs presenting

Public hackathon demo: **https://shurooqbawazir34.github.io/little-reader-demo/app/**

The GitHub Pages version runs the scripted workflow entirely in the visitor's browser, with local demo storage and bundled illustrations/voices. It has no live backend, registration service, or AI generation. Its deployment repository is `shurooqbawazir34/little-reader-demo`. Rebuild the export with `python tools/build_pages.py`; the output is `artifacts/pages-host/little-reader-demo/`. Only that export is published; `.env`, original child photos, server data, and local review screenshots are excluded.

### Fast hackathon presentation

With `DEMO_MODE=1` and `FAST_DEMO=1` (the default in demo mode), the full Shahd workflow uses the supplied assets without calling image, safety, or story models. Upload a child photo, wait about one second for the prepared cartoon, answer the three questions using the microphone simulation or the example button, then open **شهد ونور الصلاة**. All five supplied illustrations appear in order with animated page turns, keyboard navigation, and visible Arabic reading text. The story preparation animation takes a few seconds. Read-aloud plays bundled voices instantly.

This is a scripted presentation: the cartoon and story stay Shahd's regardless of the uploaded photo or entered answers. Small demo labels identify the preview. The original uploaded photo is validated in memory and discarded. Supplied illustrations live in `backend/demo_assets/` and are included in the API Docker image.

The second edition uses the five text-free illustrations and a clear two-page layout: a full illustration beside editable Arabic story text, with a short child reading line. Existing illustrated demo books automatically display the current edition. Old demo profiles named Sara display as Shahd; real-mode profiles are unaffected.

Eleven bundled Arabic MP3s make the cover, father narration, and Shahd's lines playable immediately, even without a working OpenAI key. These are synthetic voices (Saudi Arabic Hamed for narration, Zariyah for the child lines), not recordings of the family. Page turns use a quiet synthesized paper sound with a mute control. To regenerate the audio, install the optional preparation dependency `pip install edge-tts==7.3.1`, then run `python -m backend.prepare_demo_audio --provider edge`. Alternatively, use `python -m backend.prepare_demo_audio` with a valid OpenAI key exported in the environment for an expressive father performance using the configured TTS model. Existing MP3s are preserved; remove the specific clips you intend to regenerate first. No audio generation service is needed during the demo.

Set `FAST_DEMO=0` to exercise live AI with the original demo fallback behavior, or `DEMO_MODE=0` for real family use. After changing these settings or backend assets, run `docker compose up -d --build`.

**`DEMO_MODE=0`: the real website.** Parents create an account (email + password), add their child, and use it every night. Only real data is shown. After goodnight the app sleeps until 7:00. If the AI fails, the parent sees an error instead of a backup story. In the Talk step anyone can tap "💡 جرّب بمثال" to try an example day.

**`DEMO_MODE=1`: presenting.** Use this on stage:

- "▶ ابدأ التجربة" starts as a guest in one click.
- Pressing the mic "listens" and types Shahd's ready answers, so the audience sees the whole journey. Turn this off in the parents' settings to use the real microphone.
- There's no bedtime lock: "🌙 ليلة جديدة" starts another night.
- The parents' page shows sample history, so tonight's book is #24.
- If the AI is unreachable, a ready-made story and a simple cartoon filter are used, so the demo never stops.

## Architecture

- **Frontend** (`frontend/`): no-build HTML/CSS/ES modules. `index.html` is the landing page and `app.html` the app. `assets/js/app.js` holds the screens and hash router, `i18n.js` the Arabic/English text, `art.js` the SVG art (Hudhud, scenes, hero) and `api.js` the API client. Private images are fetched with the bearer token.
- **Backend** (`backend/`): FastAPI + SQLAlchemy (SQLite in a Docker volume).
  - `ai.py`: OpenAI calls, all server-side:
    - `chat/completions`: JSON safety check (fails closed) and the story writer;
    - `images/edits`: photo → cartoon, and the cover;
    - `audio/speech`: read-aloud;
    - `audio/transcriptions`: the child's voice.
  - `demo.py`: predefined answers, backup story and sample history.
  - `check_ai.py`: checks every OpenAI feature with your key.
  - `main.py`: the routes.
- **nginx** serves the frontend and forwards `/api/` to FastAPI.

## Tests

```bash
pip install pytest
python -m pytest -q tests
```

Every AI call is mocked, so tests are free and offline.

## Safety & privacy notes

This is a hackathon prototype:

- A parent must consent before a photo is used.
- The original photo isn't stored, only the cartoon.
- Voice recordings are transcribed and discarded.
- Every story passes a safety check. If the child's words sound worrying, no story is written and the parent gets an alert.
- Data is scoped to the parent's account. A child's data, or the whole account, can be deleted from the parents' settings.

Photos, text and audio are sent to OpenAI for processing; review their terms. Before a public launch, add:

- verified parental consent;
- a privacy policy and retention schedule;
- rate limiting;
- TLS;
- password reset;
- an independent security review.

Reading marks are the parent's report, not pronunciation scoring.

---

Arwa Bawazir · Shurooq Bawazir · Childhood Hackathon 2026
