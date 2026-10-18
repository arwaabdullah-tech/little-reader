"""Check that every OpenAI feature works with the key and models in .env.

    docker compose exec api python -m backend.check_ai            # everything (one image costs a few cents)
    docker compose exec api python -m backend.check_ai --no-image # skip the picture test

Each line prints ✓ or ✗ with the reason, so a wrong key or a model your account can't use shows up at once.
"""
import asyncio
import io
import sys
import time

from PIL import Image

from . import ai, config, demo


async def step(name: str, fn):
    t = time.monotonic()
    try:
        detail = await fn()
        print(f'  ✓ {name} ({time.monotonic() - t:.1f}s){" · " + detail if detail else ""}', flush=True)
        return True
    except Exception as e:  # noqa: BLE001 - report every failure plainly
        print(f'  ✗ {name}: {e}', flush=True)
        return False


async def main(images: bool) -> int:
    print('Little Reader · OpenAI check')
    if not ai.configured():
        print('  ✗ OPENAI_API_KEY is missing in .env')
        return 1
    print(f'  key …{config.OPENAI_API_KEY[-4:]} · text {config.TEXT_MODEL} · image {config.IMAGE_MODEL} '
          f'(fallback {config.IMAGE_FALLBACK_MODEL}) · voice {config.TTS_MODEL}/{config.TTS_VOICE} · speech {config.STT_MODEL}')
    answers = demo.DAY['ar']
    voice = {}

    async def safety():
        assert await ai.is_safe(answers), 'the safety check said Sara\'s day is unsafe'
        return 'Sara\'s day is safe'

    async def story():
        s = await ai.write_story('سارة', 'f', 5, 'ar', 2, answers)
        return f'«{s["title"]}» · {len(s["pages"])} pages · {len(s["facts"])} facts · e.g. {s["facts"][0] if s["facts"] else "-"}'

    async def speak():
        voice['mp3'] = await ai.speak('في يومٍ مشمس، ذهبت سارة إلى الحديقة مع أبيها.', 'ar')
        return f'{len(voice["mp3"]) // 1024} KB mp3'

    async def listen():
        assert voice.get('mp3'), 'needs the voice test'
        return '«' + await ai.transcribe(voice['mp3'], 'check.mp3', 'ar') + '»'

    async def picture():
        buf = io.BytesIO()
        Image.new('RGB', (512, 512), (255, 214, 170)).save(buf, format='PNG')
        png = await ai.cartoon_avatar(buf.getvalue())
        return f'{len(png) // 1024} KB png'

    ok = [await step('safety check', safety), await step('story writer', story),
          await step('read-aloud voice', speak), await step('speech to text', listen)]
    if images:
        ok.append(await step('cartoon / cover pictures', picture))
    print('All good ✓' if all(ok) else 'Some checks failed: see ✗ above.')
    return 0 if all(ok) else 1


if __name__ == '__main__':
    sys.exit(asyncio.run(main('--no-image' not in sys.argv)))
