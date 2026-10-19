"""Run once: python -m backend.prepare_demo_audio. Bundles demo voices for instant playback."""
import asyncio
import argparse
from pathlib import Path

from . import ai, demo


async def main(provider='openai'):
    target = Path(__file__).parent / 'demo_assets'
    book = demo.shahd_story([])
    jobs = [('voice-cover.mp3', 'شَهْد ونور الصلاة. حكاية عن شجاعة المحاولة، وفرحة التعلّم، ونور يكبر في القلب.', 'parent')]
    for i, page in enumerate(book['pages'], 1):
        jobs += [(f'voice-{i}-parent.mp3', page['title'] + '. ' + page['narration'], 'parent'),
                 (f'voice-{i}-child.mp3', page['child_line'], 'child')]
    limit = asyncio.Semaphore(3)

    async def generate(name, text, role):
        async with limit:
            path = target / name
            if path.is_file():
                return
            if provider == 'edge':
                import edge_tts
                voice = 'ar-SA-HamedNeural' if role == 'parent' else 'ar-SA-ZariyahNeural'
                await edge_tts.Communicate(text, voice, rate='-8%' if role == 'parent' else '-5%').save(str(path))
                blob = path.read_bytes()
            else:
                blob = await ai.speak(text, 'ar', role)
                path.write_bytes(blob)
            print(f'Ready: {name} ({len(blob)} bytes)', flush=True)

    await asyncio.gather(*(generate(*job) for job in jobs))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--provider', choices=['openai', 'edge'], default='openai')
    asyncio.run(main(parser.parse_args().provider))
