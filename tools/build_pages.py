"""Export the scripted hackathon prototype for GitHub Pages; no server or secrets included."""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from backend.demo import shahd_story

BASE = '/little-reader-demo/'
OUT = ROOT / 'artifacts' / 'pages-host' / 'little-reader-demo'
OUT.mkdir(parents=True, exist_ok=True)
shutil.copytree(ROOT / 'frontend', OUT, dirs_exist_ok=True)
shutil.copytree(ROOT / 'backend/demo_assets', OUT / 'demo-assets', dirs_exist_ok=True)
(OUT / 'nginx.conf').unlink(missing_ok=True)
for path in OUT.rglob('*'):
    if path.suffix not in ('.html', '.js', '.css'):
        continue
    text = path.read_text(encoding='utf-8')
    text = text.replace('/api/demo-assets/', BASE + 'demo-assets/')
    text = text.replace('/assets/', BASE + 'assets/').replace('/favicon.svg', BASE + 'favicon.svg')
    for quote in ('"', "'"):
        text = text.replace(quote + '/app#', quote + BASE + 'app/#')
        text = text.replace(quote + '/app' + quote, quote + BASE + 'app/' + quote)
        text = text.replace(quote + '/privacy.html', quote + BASE + 'privacy.html')
    text = text.replace('href="/"', 'href="' + BASE + '"')
    text = text.replace("location.href = '/'", "location.href = '" + BASE + "'")
    path.write_text(text, encoding='utf-8')
app = OUT / 'app'
app.mkdir(exist_ok=True)
shutil.copyfile(OUT / 'app.html', app / 'index.html')
adapter = (ROOT / 'tools/pages_demo.js').read_text(encoding='utf-8')
(OUT / 'assets/js/pages-demo.js').write_text(adapter, encoding='utf-8')
api = OUT / 'assets/js/api.js'
api.write_text("import './pages-demo.js';\n" + api.read_text(encoding='utf-8'), encoding='utf-8')
story = json.dumps(shahd_story([]), ensure_ascii=False).replace('/api/demo-assets/', BASE + 'demo-assets/')
(OUT / 'demo-story.json').write_text(story, encoding='utf-8')
(OUT / '.nojekyll').touch()
(OUT / 'README.md').write_text('# Little Reader — Shahd demo\n\nScripted hackathon prototype. '
    'All interactions are simulated locally in the browser. No API keys, original child photos, or backend data are included.\n', encoding='utf-8')
print(OUT)
