"""API checks for the حكاية flow. Every AI call is mocked, so the tests are free and offline."""
import io
import os
import tempfile
from unittest.mock import patch

os.environ['DATABASE_URL'] = 'sqlite:///' + tempfile.mkdtemp() + '/test.db'
os.environ['MEDIA_DIR'] = tempfile.mkdtemp()
os.environ['JWT_SECRET'] = 'test-secret-should-never-be-used-in-production'
os.environ['OPENAI_API_KEY'] = ''
os.environ['DEMO_MODE'] = '1'

from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402

import backend.ai as ai  # noqa: E402
import backend.config as config  # noqa: E402
import backend.main as main  # noqa: E402

client = TestClient(main.app)
SARA = ['رحت الحديقة مع أبوي ولعبنا كورة!', 'طحت وعوّرت ركبتي… بس ما بكيت!', 'إيه! أختي الصغيرة ساعدتني!']
AI_STORY = {
    'title': 'يوم سارة الشجاع',
    'pages': [{'scene': 'park', 'props': ['⚽'], 'narration': 'في يومٍ مشمس، ~ذهبت~ سارة إلى الحديقة.', 'child_line': 'لعبنا ~بالكرة~!',
               'fact': 'كرة القدم أكثر رياضة يلعبها الناس في العالم.'}] * 5,
    'bridges': [['رحت', 'ذهبت'], ['كورة', 'بالكرة']], 'words': ['ذهبت', 'الكرة', 'وقعت'],
    'mission': 'اطلبي من أختك أن تساعديها أنتِ في شيء صغير.', 'parent_question': 'كيف شعرتِ عندما وقعتِ؟',
    'feelings': [['😊', 'الحديقة'], ['😣', 'السقوط'], ['💛', 'أختي']], 'cover_scene': 'a girl playing football in a park',
}


def auth():
    token = client.post('/api/auth/guest').json()['token']
    return {'Authorization': 'Bearer ' + token}


def new_child(h, **kw):
    body = {'name': 'سارة', 'age': 5, 'gender': 'f', 'language': 'ar', 'consent': True, **kw}
    return client.post('/api/children', headers=h, json=body)


def png_bytes():
    buf = io.BytesIO(); Image.new('RGB', (64, 64), (200, 120, 90)).save(buf, format='PNG'); return buf.getvalue()


def test_health_and_accounts():
    assert client.get('/api/health').json()['status'] == 'ok'
    r = client.post('/api/auth/register', json={'email': 'parent@example.com', 'password': 'secure-secret-123'})
    assert r.status_code == 200, r.text
    assert client.post('/api/auth/login', json={'email': 'parent@example.com', 'password': 'wrong-password-1'}).status_code == 401
    assert client.post('/api/auth/login', json={'email': 'parent@example.com', 'password': 'secure-secret-123'}).status_code == 200
    assert client.get('/api/me').status_code == 401


def test_setup_requires_consent_and_sets_ladder():
    h = auth()
    assert new_child(h, consent=False).status_code == 400
    c = new_child(h).json()
    assert c['reading_level'] == 2 and c['ladder_name'] == 'جملتي'
    assert new_child(h, age=7).json()['reading_level'] == 4


def test_parent_isolation():
    h, other = auth(), auth()
    cid = new_child(h).json()['id']
    assert client.patch('/api/children/' + cid, headers=other, json={'name': 'x'}).status_code == 404
    assert client.get(f'/api/children/{cid}/dashboard', headers=other).status_code == 404
    assert client.post(f'/api/children/{cid}/stories', headers=other, json={'answers': SARA}).status_code == 404


def test_avatar_ai_and_local_backup():
    h = auth(); cid = new_child(h).json()['id']
    async def cartoon(png): return png_bytes()
    with patch.object(ai, 'cartoon_avatar', cartoon):
        r = client.post(f'/api/children/{cid}/avatar', headers=h, files={'photo': ('p.png', png_bytes(), 'image/png')}, data={'consent': 'true'})
    assert r.status_code == 200, r.text
    assert r.json()['avatar_source'] == 'ai' and client.get(r.json()['avatar_url'], headers=h).status_code == 200
    assert client.get(r.json()['avatar_url'], headers=auth()).status_code == 404       # another parent cannot see it
    r = client.post(f'/api/children/{cid}/avatar', headers=h, files={'photo': ('p.png', png_bytes(), 'image/png')}, data={'consent': 'true'})
    assert r.json()['avatar_source'] == 'local'                                       # no key → local cartoon in demo mode
    assert client.post(f'/api/children/{cid}/avatar', headers=h, files={'photo': ('p.txt', b'nope', 'text/plain')}, data={'consent': 'true'}).status_code == 400


def test_story_with_ai_then_goodnight_and_dashboard():
    h = auth(); cid = new_child(h).json()['id']
    seen = []
    async def chat(system, user, timeout=90):
        seen.append(system)
        return {'safe': True} if 'safe to turn into' in system else AI_STORY
    async def cover(scene, ref): return png_bytes()
    with patch.object(ai, 'configured', lambda: True), patch.object(ai, 'chat_json', chat), patch.object(ai, 'cover_art', cover):
        r = client.post(f'/api/children/{cid}/stories', headers=h, json={'answers': SARA})
    assert r.status_code == 200, r.text
    s = r.json()
    assert s['source'] == 'ai' and len(s['pages']) == 5 and s['bridges'][0] == ['رحت', 'ذهبت'] and s['book_number'] == 24
    assert len(seen) == 2                                                             # safety check, then the writer
    assert client.get('/api/stories/' + s['id'], headers=h).json()['cover_status'] == 'ready'
    done = client.post(f"/api/stories/{s['id']}/complete", headers=h, json={'minutes': 9, 'child_lines': 5, 'words_read': 12}).json()
    assert done['sleep_until'] and done['child']['ladder_progress'] == 35
    d = client.get(f'/api/children/{cid}/dashboard', headers=h).json()
    assert d['includes_sample'] and d['nights'][-1]['words'] == 12 and 'ذهبت' in d['words']
    assert d['latest']['mission'].startswith('اطلبي') and d['books'] == 24
    assert len(d['latest']['facts']) == 5 and d['kpi']['facts'] == 5 + 62                 # "did you know?" facts learned
    shelf = client.get(f'/api/children/{cid}/stories', headers=h).json()
    assert shelf['stories'][0]['book_number'] == 24


def test_backup_story_when_ai_unreachable_in_demo_mode():
    h = auth(); cid = new_child(h, name='آدم', gender='m', age=4).json()['id']
    r = client.post(f'/api/children/{cid}/stories', headers=h, json={'answers': SARA})
    s = r.json()
    assert r.status_code == 200 and s['source'] == 'demo' and s['cover_status'] == 'none'
    assert 'ذهب' in s['pages'][0]['narration'] and 'آدم' in s['title']                # masculine grammar, child's name
    assert len(s['pages'][0]['child_line'].split()) <= 2                               # age 4 reads one or two words
    assert len(s['facts']) == 5 and all(p['fact'] for p in s['pages'])                  # every page teaches something


def test_worrying_answers_never_become_a_story():
    h = auth(); cid = new_child(h).json()['id']
    r = client.post(f'/api/children/{cid}/stories', headers=h, json={'answers': ['لعبت', 'عمي يضربني', 'لا']})
    assert r.json() == {'concern': True}
    async def unsafe(system, user, timeout=90): return {'safe': False}
    with patch.object(ai, 'configured', lambda: True), patch.object(ai, 'chat_json', unsafe):
        assert client.post(f'/api/children/{cid}/stories', headers=h, json={'answers': SARA}).json() == {'concern': True}
    assert client.get(f'/api/children/{cid}/stories', headers=h).json()['stories'] == []
    assert len(client.get(f'/api/children/{cid}/dashboard', headers=h).json()['alerts']) == 2


def test_real_mode_lock_and_errors():
    h = auth(); cid = new_child(h).json()['id']
    with patch.object(config, 'DEMO_MODE', False):
        assert client.post(f'/api/children/{cid}/stories', headers=h, json={'answers': SARA}).status_code == 502
        async def chat(system, user, timeout=90): return {'safe': True} if 'safe to turn into' in system else AI_STORY
        with patch.object(ai, 'configured', lambda: True), patch.object(ai, 'chat_json', chat), patch.object(main, 'make_cover', lambda *_: None):
            sid = client.post(f'/api/children/{cid}/stories', headers=h, json={'answers': SARA}).json()['id']
            client.post(f'/api/stories/{sid}/complete', headers=h, json={'minutes': 5})
            assert client.post(f'/api/children/{cid}/stories', headers=h, json={'answers': SARA}).status_code == 409
        assert client.post(f'/api/children/{cid}/wake', headers=h).status_code == 403
        assert client.post('/api/auth/guest').status_code == 403                        # real site: accounts only
    assert client.post(f'/api/children/{cid}/wake', headers=h).json()['sleep_until'] is None


def test_voice_endpoints():
    h = auth()
    assert client.post('/api/tts', headers=h, json={'text': 'مرحبا', 'lang': 'ar'}).status_code == 503
    calls = []
    async def speak(text, lang): calls.append(text); return b'ID3fake-mp3'
    with patch.object(ai, 'configured', lambda: True), patch.object(ai, 'speak', speak):
        for _ in range(2):
            r = client.post('/api/tts', headers=h, json={'text': 'في يومٍ ~مشمس~', 'lang': 'ar'})
            assert r.status_code == 200 and r.content == b'ID3fake-mp3'
    assert calls == ['في يومٍ مشمس']                                                   # tildes removed, second call cached
    async def stt(blob, name, lang): return 'رحت الحديقة'
    with patch.object(ai, 'configured', lambda: True), patch.object(ai, 'transcribe', stt):
        r = client.post('/api/transcribe', headers=h, files={'audio': ('a.webm', b'123', 'audio/webm')}, data={'lang': 'ar'})
    assert r.json() == {'text': 'رحت الحديقة'}


def test_delete_child_removes_everything():
    h = auth(); cid = new_child(h).json()['id']
    client.post(f'/api/children/{cid}/stories', headers=h, json={'answers': SARA})
    assert client.delete('/api/children/' + cid, headers=h).json() == {'deleted': True}
    assert client.get('/api/children', headers=h).json() == []
    with main.SessionLocal() as db:
        assert db.query(main.Story).filter_by(child_id=cid).count() == 0


def test_writer_output_is_validated():
    bad = {**AI_STORY, 'pages': AI_STORY['pages'][:2]}
    try:
        ai.normalize_story(bad, 2, 'ar'); assert False
    except ai.AIError:
        pass
    good = ai.normalize_story({**AI_STORY, 'pages': [{**AI_STORY['pages'][0], 'scene': 'moon'}] * 5}, 2, 'en')
    assert good['pages'][0]['scene'] == 'home' and good['bridges'] == [] and len(good['facts']) == 5
    nofact = ai.normalize_story({**AI_STORY, 'pages': [{k: v for k, v in AI_STORY['pages'][0].items() if k != 'fact'}] * 5}, 2, 'ar')
    assert nofact['facts'] == [] and nofact['pages'][0]['fact'] == ''


def test_delete_account():
    h = auth(); cid = new_child(h).json()['id']
    client.post(f'/api/children/{cid}/stories', headers=h, json={'answers': SARA})
    assert client.delete('/api/me', headers=h).json() == {'deleted': True}
    assert client.get('/api/children', headers=h).status_code == 401
