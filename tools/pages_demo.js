/* Standalone public presentation. This adapter is included only in the Pages export. */
const BASE = '/little-reader-demo/';
const nativeFetch = window.fetch.bind(window);
const key = 'little_reader_public_demo_v1';
let db;
try { db = JSON.parse(localStorage.getItem(key)); } catch (_) {}
db ||= { child: null, stories: [], readings: {} };
const save = () => localStorage.setItem(key, JSON.stringify(db));
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const wait = ms => new Promise(r => setTimeout(r, ms));
const date = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
window.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  if (url.origin !== location.origin || !url.pathname.startsWith('/api/')) return nativeFetch(input, init);
  const path = url.pathname.slice(4), method = init.method || 'GET';
  if (path.includes('/demo-assets/')) return nativeFetch(BASE + 'demo-assets/' + path.split('/demo-assets/')[1] + url.search);
  const body = typeof init.body === 'string' ? JSON.parse(init.body) : {};
  if (path === '/health') return json({ status: 'ok', ai: false, auth: true, demo_mode: true, fast_demo: true });
  if (path.startsWith('/auth/')) return json({ token: 'local-demo', user: { id: 'local', guest: true } });
  if (path === '/me') {
    if (method === 'DELETE') { db = { child: null, stories: [], readings: {} }; save(); }
    return json({ id: 'local', guest: true });
  }
  if (path === '/children' && method === 'GET') return json(db.child ? [db.child] : []);
  if (path === '/children' && method === 'POST') {
    db.child = { ...body, id: 'shahd', name: 'شهد', consent: true, avatar_url: null, avatar_source: null,
      reading_level: body.age <= 4 ? 1 : body.age === 5 ? 2 : body.age === 6 ? 3 : 4,
      ladder_name: 'جملتي', ladder_progress: 0, sleep_until: null };
    save(); return json(db.child);
  }
  if (/^\/children\/[^/]+$/.test(path)) {
    if (method === 'DELETE') { db = { child: null, stories: [], readings: {} }; save(); return json({ deleted: true }); }
    if (method === 'PATCH') { Object.assign(db.child, body); save(); }
    return json(db.child);
  }
  if (path.endsWith('/avatar')) {
    if (!(init.body instanceof FormData) || !init.body.get('photo')) return json({ detail: 'Choose a photo' }, 400);
    await wait(1000);
    Object.assign(db.child, { avatar_url: BASE + 'demo-assets/avatar.png', avatar_source: 'demo' });
    save(); return json(db.child);
  }
  if (path.endsWith('/wake')) { db.child.sleep_until = null; save(); return json(db.child); }
  if (/^\/children\/[^/]+\/stories$/.test(path)) {
    if (method === 'GET') return json({ sample_books: 23, stories: [...db.stories].reverse() });
    await wait(1000);
    const story = await (await nativeFetch(BASE + 'demo-story.json')).json();
    Object.assign(story, { id: crypto.randomUUID(), child_id: db.child.id, source: 'demo',
      cover_url: BASE + 'demo-assets/page-1.png?v=2', cover_status: 'ready', lang: 'ar',
      book_number: 24 + db.stories.length, created_at: new Date().toISOString(), said: body.answers });
    db.stories.push(story); save(); return json(story);
  }
  if (/^\/stories\/[^/]+$/.test(path)) return json(db.stories.find(s => s.id === path.split('/')[2]) || { detail: 'Book unavailable' });
  if (path.endsWith('/complete')) {
    db.readings[path.split('/')[2]] = body; save(); return json({ child: db.child, sleep_until: null });
  }
  if (path.endsWith('/dashboard')) {
    const last = db.stories.at(-1);
    return json({ child: db.child, includes_sample: true, books: 23 + db.stories.length,
      kpi: { nights_with_book: 12, nights_total: 14, avg_minutes: 10, fusha_words: 34, facts: 62 },
      nights: Array.from({ length: 14 }, (_, i) => ({ date: date(13 - i), words: [2,3,3,null,4,5,6,6,7,null,8,9,10,12][i] })),
      week: Array.from({ length: 7 }, (_, i) => ({ date: date(6 - i), feeling: ['😊', 'يوم جميل'] })),
      words: ['الصلاة', 'تقرّبنا', 'أحاول', 'معًا', 'شجاعة'], alerts: [],
      latest: last ? { title: last.title, question: last.parent_question, mission: last.mission,
        facts: last.facts, feelings: last.feelings, story_id: last.id } : null });
  }
  return json({ detail: 'This feature requires the full application server' }, 503);
};
document.addEventListener('DOMContentLoaded', () => {
  const notice = document.createElement('div');
  notice.textContent = 'نسخة عرض تجريبية • تُحفظ بيانات التجربة في هذا المتصفح فقط';
  notice.style.cssText = 'text-align:center;padding:6px 12px;background:#fff2d4;color:#5b4629;font:700 12px Tajawal,sans-serif';
  document.body.prepend(notice);
});
