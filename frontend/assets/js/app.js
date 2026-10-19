/* Little Reader web app: the حكاية evening.
   start → setup (parent) → photo → night (Hudhud) → talk (ح) → making (ك) → read (ا) → goodnight (ي) → morning (☀ parents).
   Child screens use the night theme, parent screens the warm day theme. Every word lives in i18n.js. */
import { T, LANGS } from './i18n.js';
import { DEFS, HUD, FACE_F, FACE_M, sceneSVG } from './art.js';
import { api, ApiError, blobURL, hasToken, setToken, ttsURL } from './api.js';
import { icon } from './icons.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pause = ms => new Promise(r => setTimeout(r, ms));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = { get: (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
                set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } } };

const S = {
  lang: T[store.get('lr_lang', 'ar')] ? store.get('lr_lang', 'ar') : 'ar',
  demo: false,                                           // ready answers in the Talk step (on by default while presenting)
  health: { ai: false, demo_mode: false },
  child: null, face: FACE_F, story: null, page: 0, readLines: new Set(), answers: [], started: 0,
};
let routeTok = 0;

/* ---------- words ---------- */
const t = k => (T[S.lang] && T[S.lang][k] !== undefined ? T[S.lang][k] : T.en[k]);
const gx = s => String(s ?? '').replace(/\[([^\[\]|]*)\|([^\[\]]*)\]/g, (_, m, f) => (S.child && S.child.gender === 'm' ? m : f));
const childName = () => (S.child ? S.child.name : t('default_name_f'));
function fill(s, x = {}) {
  let r = esc(gx(s)).replaceAll('{n}', esc(childName()));
  for (const k in x) r = r.replaceAll('{' + k + '}', esc(gx(x[k])));
  return r;
}
const bridged = s => esc(s).replace(/~([^~]+)~/g, '<span class="br" tabindex="0" role="button">$1</span>');
const plain = s => String(s || '').replace(/~/g, '');
const storyLang = () => (S.story && S.story.lang) || (S.child && S.child.language) || S.lang;

/* ---------- shell ---------- */
const view = $('#view');
document.body.insertAdjacentHTML('afterbegin', DEFS);
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('on');
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 3200);
}
function errMsg(e) { return e instanceof ApiError && e.status === 0 ? t('err_net') : t('err_generic'); }
function setTheme(theme) {
  document.body.className = 'theme-' + theme;
  $('meta[name=theme-color]').setAttribute('content', theme === 'night' ? '#1B1F5E' : '#FFF8F3');
}
function applyLang() {
  const L = LANGS[S.lang] || LANGS.ar;
  document.documentElement.lang = S.lang; document.documentElement.dir = L.dir;
  $('#brandName').innerHTML = t('brand');
  $('#langBtn').textContent = t('other_lang');
  $('#parentBtn').textContent = t('parents');
  document.title = t('brand').replace(/<[^>]+>/g, '') + ' | Little Reader';
}
function journey(active) {
  const steps = t('journey');
  const colors = ['var(--coral)', 'var(--yellow)', 'var(--purple)', 'var(--night)', 'var(--blue)'];
  $('#journey').innerHTML = active < 0 ? '' : steps.map(([l, name], i) =>
    `<div class="jstep ${i === active ? 'on' : i < active ? 'done' : ''}" ${i === active ? 'aria-current="step"' : ''}><i style="background:${colors[i]}">${esc(l)}</i><span>${esc(name)}</span></div>`).join('');
}
async function loadFace() {
  S.face = S.child && S.child.gender === 'm' ? FACE_M : FACE_F;
  if (S.child && S.child.avatar_url) S.face = (await blobURL(S.child.avatar_url)) || S.face;
  paintFace();
}
function paintFace() {
  const img = $('#heroHeadImg'); if (img) img.setAttribute('href', S.face);
  $$('.js-face').forEach(el => { el.style.backgroundImage = `url("${S.face}")`; });
}
function confetti() {
  if (reduce) return;
  const cv = document.createElement('canvas'); cv.className = 'confetti'; document.body.appendChild(cv);
  const ctx = cv.getContext('2d'), w = cv.width = innerWidth, h = cv.height = innerHeight;
  const cols = ['#FFC23D', '#F26B4F', '#1FA383', '#7A5AF0', '#5fd0e6'];
  const ps = Array.from({ length: 140 }, () => ({ x: w / 2, y: h * .35, vx: (Math.random() - .5) * 18, vy: -Math.random() * 18 - 4, r: Math.random() * 7 + 5, c: cols[Math.random() * 5 | 0], a: Math.random() * 6 }));
  let f = 0;
  (function tick() {
    ctx.clearRect(0, 0, w, h);
    ps.forEach(p => { p.vy += .5; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.a += .15; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
    if (++f < 150) requestAnimationFrame(tick); else cv.remove();
  })();
}

/* ---------- router ---------- */
const go = h => (location.hash === h ? route() : (location.hash = h));
const SCREENS = { start, setup, photo, night, talk, making, read, goodnight, morning };
async function route() {
  const my = ++routeTok;
  stopAudio(); S.auto = false;
  const [name, arg] = location.hash.replace(/^#\/?/, '').split('/');
  let screen = SCREENS[name] ? name : 'night';
  if (!hasToken()) screen = 'start';
  else if (!S.child && screen !== 'start') {
    try {
      const kids = await api('/children');
      S.child = kids[0] || null;
      if (S.child) await loadFace();
    } catch (e) { if (!hasToken()) screen = 'start'; }
    if (!S.child && screen !== 'start') screen = 'setup';
  }
  if (my !== routeTok) return;
  scrollTo(0, 0);
  try { await SCREENS[screen](arg, my); } catch (e) { console.error(e); toast(errMsg(e)); }
  view.focus({ preventScroll: true });
}
addEventListener('hashchange', route);
$('#langBtn').onclick = async () => {
  S.lang = S.lang === 'ar' ? 'en' : 'ar'; store.set('lr_lang', S.lang); applyLang();
  if (S.child && S.child.language !== S.lang) {
    try { S.child = await api('/children/' + S.child.id, { method: 'PATCH', body: { language: S.lang } }); } catch (e) { /* offline */ }
  }
  route();
};
$('#parentBtn').onclick = () => go(hasToken() ? '#/morning' : '#/start');

/* ---------- start ---------- */
async function start(arg) {
  setTheme('night'); journey(-1);
  if (hasToken()) return go('#/night');
  const mode = arg === 'login' ? 'login' : 'register';
  view.innerHTML = `<section class="screen night-bg"><div class="wrap split">
    <div><div class="hud-big">${HUD}</div></div>
    <div class="stack">
      <span class="timepill">🌙 ${esc(t('hudhud'))}</span>
      <h1 class="title">${esc(t('start_h')).replace('…', '…<br><em>')}</em></h1>
      <p class="lead">${esc(t('start_p'))}</p>
      ${S.health.demo_mode ? `<div class="row"><button class="btn btn-coral btn-lg" id="guest">${esc(t('start_btn'))}</button><button class="link" id="haveAcc">${esc(t('have_account'))}</button></div>` : ''}
      <form class="start-card stack" id="acc" ${S.health.demo_mode ? 'hidden' : ''}>
        <div class="seg" id="accMode">${['register', 'login'].map(m => `<button type="button" data-m="${m}" aria-pressed="${m === mode}">${esc(t(m === 'register' ? 'register' : 'login'))}</button>`).join('')}</div>
        <div class="field"><label for="em">${esc(t('email'))}</label><input class="input" id="em" type="email" autocomplete="email" required></div>
        <div class="field"><label for="pw">${esc(t('password'))}</label><input class="input" id="pw" type="password" minlength="10" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" required></div>
        ${mode === 'register' ? `<label class="consent"><input type="checkbox" id="terms" required><span>${t('agree_terms')}</span></label>` : ''}
        <button class="btn btn-coral btn-lg btn-block" id="accGo">${esc(t(mode === 'register' ? 'register_go' : 'login_go'))}</button>
      </form>
      <p class="note" style="color:#A9AEDD">🔒 ${esc(t('start_note'))}</p>
    </div></div></section>`;
  $('#guest') && ($('#guest').onclick = async e => {
    e.target.disabled = true;
    try { setToken((await api('/auth/guest', { method: 'POST' })).token); S.child = null; go('#/setup'); }
    catch (err) { toast(errMsg(err)); e.target.disabled = false; }
  });
  $('#haveAcc') && ($('#haveAcc').onclick = () => { $('#acc').hidden = !$('#acc').hidden; });
  $('#accMode').onclick = e => { const b = e.target.closest('[data-m]'); if (b) go('#/start/' + b.dataset.m); };
  $('#acc').onsubmit = async e => {
    e.preventDefault();
    if (!$('#acc').reportValidity()) return;
    $('#accGo').disabled = true;
    try {
      const r = await api('/auth/' + mode, { method: 'POST', body: { email: $('#em').value, password: $('#pw').value } });
      setToken(r.token); S.child = null; go(mode === 'register' ? '#/setup' : '#/night');
    } catch (err) {
      toast(err.status === 401 ? t('bad_login') : err.status === 409 ? t('email_taken') : err.status === 422 ? t('check_fields') : errMsg(err));
      $('#accGo').disabled = false;
    }
  };
}

/* ---------- parent setup ---------- */
const levelFor = age => (age <= 4 ? 1 : age === 5 ? 2 : age === 6 ? 3 : 4);   // how much of each page the child reads
async function setup() {
  setTheme('day'); journey(-1);
  const c = S.child;
  const F = { name: c ? c.name : S.health.demo_mode ? t('default_name_f') : '', gender: c ? c.gender : 'f', age: c ? c.age : 5, bedtime: c ? c.bedtime : '20:00', language: c ? c.language : S.lang, consent: !!c };
  view.innerHTML = `<section class="screen peach-bg"><div class="wrap split top">
    <form class="card stack" id="sf" novalidate>
      <span class="chip chip-parent">${esc(t('parents'))} · ${esc(t('setup_step'))}</span>
      <h1 class="title" style="font-size:clamp(1.8rem,3vw,2.5rem)">${esc(t('setup_h'))}</h1>
      <p class="muted">${esc(t('setup_p'))}</p>
      <label class="consent" id="consent"><input type="checkbox" id="cBox" ${F.consent ? 'checked' : ''}><span>🔒 ${t('consent')}</span></label>
      <div class="split" style="gap:12px;align-items:end">
        <div class="field"><label for="nm">${esc(t('child_name'))}</label><input class="input" id="nm" maxlength="40" required value="${esc(F.name)}" placeholder="${esc(t('name_ph'))}"></div>
        <div class="seg" id="gender">${[['f', t('girl')], ['m', t('boy')]].map(([v, l]) => `<button type="button" data-g="${v}" aria-pressed="${F.gender === v}">${esc(l)}</button>`).join('')}</div>
      </div>
      <div class="field"><span class="lbl">${esc(t('age'))}</span><div class="ages" id="ages">${[4, 5, 6, 7, 8].map(a => `<button type="button" data-age="${a}" aria-pressed="${F.age === a}">${a}</button>`).join('')}</div></div>
      <div class="split" style="gap:12px">
        <div class="field"><label for="bt">${esc(t('bedtime'))}</label><input class="input" id="bt" type="time" value="${esc(F.bedtime)}"></div>
        <div class="field"><label for="lg">${esc(t('story_lang'))}</label><select class="input" id="lg">${Object.keys(LANGS).map(k => `<option value="${k}" ${k === F.language ? 'selected' : ''}>${LANGS[k].name}</option>`).join('')}</select></div>
      </div>
      <button class="btn btn-blue btn-lg btn-block" id="next">${esc(t('next_photo'))}</button>
    </form>
    <aside class="stack" style="gap:22px"><div class="hud-md" style="margin-inline:auto">${HUD}</div>
      ${t('why_setup').map(([i, h, p]) => `<div class="why"><i>${i}</i><div><b>${esc(h)}</b><p class="muted">${esc(p)}</p></div></div>`).join('')}</aside>
  </div></section>`;
  $('#gender').onclick = e => {
    const b = e.target.closest('[data-g]'); if (!b) return;
    const was = F.gender; F.gender = b.dataset.g;
    if ($('#nm').value.trim() === t(was === 'm' ? 'default_name_m' : 'default_name_f')) $('#nm').value = t(F.gender === 'm' ? 'default_name_m' : 'default_name_f');
    $$('#gender button').forEach(x => x.setAttribute('aria-pressed', x === b));
  };
  $('#ages').onclick = e => {
    const b = e.target.closest('[data-age]'); if (!b) return;
    F.age = +b.dataset.age; $$('#ages button').forEach(x => x.setAttribute('aria-pressed', x === b));
  };
  $('#cBox').onchange = () => $('#consent').classList.remove('need');
  $('#sf').onsubmit = async e => {
    e.preventDefault();
    if (!$('#cBox').checked) { $('#consent').classList.add('need'); toast(t('need_consent')); return; }
    if (!$('#nm').value.trim()) { $('#nm').focus(); toast(t('need_name')); return; }
    const body = { name: $('#nm').value.trim(), gender: F.gender, age: F.age, bedtime: $('#bt').value || '20:00', language: $('#lg').value };
    $('#next').disabled = true;
    try {
      S.child = c ? await api('/children/' + c.id, { method: 'PATCH', body: { ...body, reading_level: levelFor(F.age) } })
                  : await api('/children', { method: 'POST', body: { ...body, consent: true } });
      await loadFace(); go('#/photo');
    } catch (err) { toast(errMsg(err)); $('#next').disabled = false; }
  };
}

/* ---------- photo → cartoon hero ---------- */
async function photo() {
  setTheme('day'); journey(-1);
  view.innerHTML = `<section class="screen peach-bg"><div class="wrap split">
    <div class="stack">
      <span class="chip chip-parent">${esc(t('parents'))} · ${esc(t('setup_step'))}</span>
      <h1 class="title" style="font-size:clamp(1.8rem,3vw,2.6rem)">${esc(t('photo_h'))}</h1>
      <p class="lead">${esc(t('photo_p'))}</p>
      <label class="drop"><input type="file" id="file" accept="image/*" hidden><span class="btn btn-coral" id="pick">${esc(t('choose_photo'))}</span><p class="note" style="margin-top:12px">🔒 ${esc(t('photo_privacy'))}</p></label>
      <p class="chip chip-ai" id="drawnBy" hidden></p>
      <div class="row"><button class="btn btn-night btn-lg" id="goNight">${esc(t('start_night'))}</button><button class="link" id="skip">${esc(t('skip_photo'))}</button></div>
    </div>
    <div class="frames">
      <div class="frame"><div class="img" id="before">📷</div><span class="cap">${esc(t('photo_before'))}</span></div>
      <span class="arrow">➜</span>
      <div class="frame hero"><div class="img js-face" id="after"></div><span class="cap">${esc(t('photo_after'))}</span></div>
    </div></div></section>`;
  paintFace();
  if (S.child.avatar_source) { $('#drawnBy').hidden = false; $('#drawnBy').textContent = t(S.child.avatar_source === 'ai' ? 'drawn_ai' : 'drawn_local'); }
  $('#pick').onclick = e => { e.preventDefault(); $('#file').click(); };
  $('#file').onchange = async () => {
    const f = $('#file').files[0]; if (!f) return;
    $('#before').style.backgroundImage = `url("${URL.createObjectURL(f)}")`; $('#before').textContent = '';
    $('#after').insertAdjacentHTML('beforeend', `<div class="drawing" id="drawing"><div class="spinner"></div>${esc(t('drawing'))}<small class="note">${esc(t('drawing_tip'))}</small></div>`);
    $('#goNight').disabled = true; $('#pick').textContent = t('retake');
    const form = new FormData(); form.append('photo', f); form.append('consent', 'true');
    try {
      S.child = await api(`/children/${S.child.id}/avatar`, { method: 'POST', form });
      await loadFace();
      $('#drawnBy').hidden = false; $('#drawnBy').textContent = t(S.child.avatar_source === 'ai' ? 'drawn_ai' : 'drawn_local');
    } catch (err) { toast(err.status === 400 || err.status === 413 ? err.message : errMsg(err)); }
    $('#drawing') && $('#drawing').remove(); $('#goNight').disabled = false; $('#file').value = '';
  };
  $('#goNight').onclick = $('#skip').onclick = () => go('#/night');
}

/* ---------- the evening: Hudhud and the life library ---------- */
const SPINES = ['#F26B4F', '#FFC23D', '#1FA383', '#7A5AF0', '#F59A6A', '#2F6FE0', '#25A69A', '#E24F8B'];
async function shelfHTML() {
  let shelf = { sample_books: 0, stories: [] };
  try { shelf = await api(`/children/${S.child.id}/stories`); } catch (e) { /* show the sample shelf */ }
  const total = shelf.sample_books + shelf.stories.length;
  const sampleSpines = Array.from({ length: Math.min(shelf.sample_books, 18) }, (_, i) => `<i class="spine" style="background:${SPINES[i % 8]};height:${70 + (i * 37) % 30}%"></i>`).join('');
  const realSpines = shelf.stories.slice(0, 6).reverse().map(s => `<i class="spine real" style="background:#262c6d;height:96%">${s.book_number}</i>`).join('');
  const minis = [];
  for (const s of shelf.stories.slice(0, 6)) {
    const img = s.cover_url ? await blobURL(s.cover_url) : '';
    minis.push(`<button class="mini" data-read="${s.id}" style="${img ? `background-image:url('${img}')` : 'background:linear-gradient(160deg,#262c6d,#6b5bb5)'}"><span>${img ? '' : '⭐'}</span><b>#${s.book_number} · ${esc(s.title)}</b></button>`);
  }
  t('sample_books').slice(0, Math.max(0, 4 - minis.length)).forEach((n, i) =>
    minis.push(`<div class="mini" style="background:linear-gradient(160deg,${SPINES[i]},${SPINES[(i + 3) % 8]})"><span>${['🏊', '👵', '🦷', '🌧️'][i]}</span><b>${esc(n)}</b></div>`));
  return `<div class="shelf-box"><div class="shelf-head"><span>${esc(t('library'))}</span><span>${fill(t('books_n'), { k: String(total) })}</span></div>
    <div class="spines">${sampleSpines}${realSpines}<i class="spine new" style="height:96%">?</i></div><div class="covers">${minis.join('')}</div></div>`;
}
function sleepHTML() {
  return `<div class="stack center" style="align-items:center;max-width:640px;margin-inline:auto"><div class="moon">🌙</div>
    <h1 class="title">${fill(t('asleep_h'))}</h1><p class="lead">${esc(t('asleep_p'))}</p><span class="lock">${esc(t('asleep_lock'))}</span>
    <div class="row" style="justify-content:center;margin-top:10px"><button class="btn btn-coral" id="toMorning">${esc(t('to_morning'))}</button>
    ${S.health.demo_mode ? `<button class="btn btn-ghost" id="wake">${esc(t('demo_wake'))}</button>` : ''}</div></div>`;
}
function bindSleep() {
  $('#toMorning').onclick = () => go('#/morning');
  $('#wake') && ($('#wake').onclick = async () => { S.child = await api(`/children/${S.child.id}/wake`, { method: 'POST' }); S.answers = []; go('#/night'); });
}
async function night(arg, my) {
  setTheme('night'); journey(0);
  if (S.child.sleep_until) {
    view.innerHTML = `<section class="screen night-bg"><div class="wrap">${sleepHTML()}</div></section>`;
    return bindSleep();
  }
  const shelf = await shelfHTML();
  if (my !== routeTok) return;
  view.innerHTML = `<section class="screen night-bg"><div class="wrap split">
    <div class="stack" style="align-items:center"><div class="hud-big">${HUD}</div></div>
    <div class="stack">
      <div class="row"><span class="timepill">🌙 ${esc(t('tonight_q'))}</span><span class="face js-face"></span></div>
      <h1 class="title">${fill(t('good_evening'))}</h1>
      <p class="lead">${fill(t('evening_p'))}</p>
      <div><button class="btn btn-coral btn-lg" id="tell">${fill(t('tell_btn'))}</button></div>
      ${shelf}
    </div></div></section>`;
  paintFace();
  $('#tell').onclick = () => { S.answers = []; go('#/talk'); };
  $$('[data-read]').forEach(b => b.onclick = () => { S.story = null; go('#/read/' + b.dataset.read); });
}

/* ---------- ح talk: three questions ---------- */
let rec = null;
async function talk() {
  setTheme('night'); journey(0);
  if (S.child.sleep_until) return go('#/night');
  const qs = t('q'), skills = t('skills'), done = S.answers.length >= 3;
  const chat = [];
  for (let i = 0; i <= Math.min(S.answers.length, 2); i++) {
    chat.push(`<div class="bubble h">${esc(qs[i])}<br><span class="chip chip-ai">${esc(skills[i])}</span></div>`);
    if (S.answers[i]) chat.push(`<div class="bubble c"><small>${fill(t('you_said'))}</small>${esc(S.answers[i])}</div>`);
  }
  view.innerHTML = `<section class="screen night-bg"><div class="talk">
    <div class="talk-head"><div class="hud-sm">${HUD}</div><div><b style="font-family:var(--f-head);font-size:1.3rem">${esc(t('hudhud'))}</b>
      <div class="qdots">${[0, 1, 2].map(i => `<i class="${i < S.answers.length || (i === S.answers.length && !done) ? 'on' : ''}"></i>`).join('')}</div></div>
      <span class="face js-face" style="margin-inline-start:auto"></span></div>
    <div class="chat" id="chat">${chat.join('')}</div>
    <div class="answer" id="answer">${done
      ? `<button class="btn btn-coral btn-lg" id="make">${esc(t('make_book'))}</button><button class="link" id="redo" style="color:#A9AEDD">${esc(t('redo'))}</button>`
      : `<button class="mic" id="mic" aria-label="${esc(t('tap_talk'))}">🎤</button><b id="micLbl">${esc(t('tap_talk'))}</b>
         <button class="link" id="typeBtn" style="color:#D9DBF7">${esc(t('type_instead'))}</button>
         <form class="typebox" id="typebox" hidden><textarea id="typed" placeholder="${esc(t('type_ph'))}"></textarea><button class="btn btn-coral btn-sm">${esc(t('send'))}</button></form>
         <p class="demo-flag">${S.health.demo_mode ? `${esc(t(S.demo ? 'demo_on' : 'demo_off'))} · <button class="link" id="flip">⇄</button> · ` : ''}<button class="link" id="fillAll">${esc(t('fill_all'))}</button></p>`}
    </div></div></section>`;
  paintFace();
  $('#chat').lastElementChild && $('#chat').lastElementChild.scrollIntoView({ block: 'nearest' });
  if (done) {
    $('#make').onclick = () => go('#/making');
    $('#redo').onclick = () => { S.answers = []; talk(); };
    return;
  }
  const add = text => { S.answers.push(text.trim()); talk(); };
  $('#typeBtn').onclick = () => { $('#typebox').hidden = !$('#typebox').hidden; $('#typed').focus(); };
  $('#typebox').onsubmit = e => { e.preventDefault(); const v = $('#typed').value.trim(); if (v) add(v); };
  $('#flip') && ($('#flip').onclick = () => { S.demo = !S.demo; store.set('lr_demo_answers', S.demo ? '1' : '0'); talk(); });
  $('#fillAll').onclick = () => { S.answers = t('day').slice(); talk(); };
  $('#mic').onclick = () => {
    if (S.demo) return demoAnswer();
    if (S.health.ai && window.MediaRecorder && navigator.mediaDevices) return recordAnswer(add);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) return browserListen(SR, add);
    $('#typebox').hidden = false; $('#typed').focus();
  };
}
async function demoAnswer() {
  const my = routeTok, mic = $('#mic');
  mic.classList.add('on'); mic.disabled = true; $('#micLbl').textContent = t('listening');
  await pause(reduce ? 0 : 1300); if (my !== routeTok) return;
  const full = t('day')[S.answers.length];
  const b = document.createElement('div'); b.className = 'bubble c'; b.innerHTML = `<small>${fill(t('you_said'))}</small><span></span>`;
  $('#chat').appendChild(b); b.scrollIntoView({ block: 'nearest' });
  for (let i = 1; i <= full.length; i++) { if (my !== routeTok) return; $('span', b).textContent = full.slice(0, i); await pause(reduce ? 0 : 28); }
  await pause(400); if (my !== routeTok) return;
  S.answers.push(full); talk();
}
async function recordAnswer(add) {
  const mic = $('#mic');
  if (rec) { rec.stop(); return; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { toast(t('mic_denied')); $('#typebox').hidden = false; return; }
  const chunks = [], r = new MediaRecorder(stream); rec = r;
  r.ondataavailable = e => e.data.size && chunks.push(e.data);
  r.onstop = async () => {
    stream.getTracks().forEach(x => x.stop()); rec = null;
    mic.classList.remove('on'); mic.disabled = true; $('#micLbl').textContent = t('transcribing');
    const form = new FormData(); form.append('audio', new Blob(chunks, { type: r.mimeType || 'audio/webm' }), 'answer.webm'); form.append('lang', S.child.language);
    try { const { text } = await api('/transcribe', { method: 'POST', form }); if (!text) throw new Error('empty'); add(text); }
    catch (e) { toast(t('stt_fail')); mic.disabled = false; $('#micLbl').textContent = t('tap_talk'); $('#typebox').hidden = false; }
  };
  r.start(); mic.classList.add('on'); $('#micLbl').textContent = t('recording');
}
function browserListen(SR, add) {
  const r = new SR(); r.lang = LANGS[S.child.language].speech; r.interimResults = false;
  $('#mic').classList.add('on'); $('#micLbl').textContent = t('listening');
  r.onresult = e => add(e.results[0][0].transcript);
  r.onerror = () => { toast(t('stt_fail')); $('#typebox').hidden = false; };
  r.onend = () => { $('#mic') && $('#mic').classList.remove('on'); };
  r.start();
}

/* ---------- ك the book is written ---------- */
async function making(arg, my) {
  setTheme('night'); journey(1);
  if (S.answers.length < 3) return go('#/talk');
  const steps = t('mk_steps');
  view.innerHTML = `<section class="screen night-bg"><div class="mk">
    <div class="hud-md" style="margin-inline:auto">${HUD}</div>
    <h1 class="title" id="mkTitle" style="font-size:clamp(1.8rem,3.4vw,2.6rem)">${esc(t('making_h'))}</h1>
    <div class="mk-steps">${steps.map(([i, h, p], k) => `<div class="mk-step" id="st${k}"><i>${i}</i><div><b>${fill(h)}</b><p>${fill(p)}</p>${k === 2 ? '<div class="flips" id="flips"></div>' : ''}</div><span class="st"></span></div>`).join('')}</div>
    <div id="mkEnd" class="stack" style="align-items:center;margin-top:24px"></div></div></section>`;
  const mark = (k, state, text = '') => { const el = $('#st' + k); if (!el) return; el.className = 'mk-step ' + state; $('.st', el).textContent = text || (state === 'done' ? '✓' : ''); };
  mark(0, 'active');
  const req = api(`/children/${S.child.id}/stories`, { method: 'POST', body: { answers: S.answers } });
  setTimeout(() => { if (my === routeTok && $('#st0').classList.contains('active')) { mark(0, 'done'); mark(1, 'active'); } }, 1400);
  let res;
  try { res = await req; } catch (e) {
    if (my !== routeTok) return;
    $('#mkEnd').innerHTML = `<p class="lead">${esc(e.status === 409 ? t('asleep_lock') : t('error_story'))}</p><button class="btn btn-coral" id="retry">${esc(t('retry'))}</button>`;
    $('#retry').onclick = () => making(arg, routeTok);
    return;
  }
  if (my !== routeTok) return;
  if (res.concern) {
    view.innerHTML = `<section class="screen night-bg"><div class="wrap stack center" style="align-items:center;max-width:680px">
      <div class="hud-md">${HUD}</div><h1 class="title">${fill(t('concern_h'))}</h1><p class="lead">${fill(t('concern_p'))}</p>
      <button class="btn btn-night btn-lg" id="cn">${fill(t('goodnight'))}</button><p class="note" style="color:#A9AEDD">${esc(t('concern_parent'))}</p></div></section>`;
    $('#cn').onclick = () => { S.answers = []; go('#/morning'); };
    return;
  }
  S.story = res; S.page = 0; S.readLines = new Set(); S.started = Date.now();
  mark(0, 'done'); mark(1, 'done'); mark(2, 'active');
  const pairs = (res.bridges || []).slice(0, 6);
  $('#flips').innerHTML = pairs.map(([d, f]) => `<span class="flip"><s>${esc(d)}</s><i>←</i><b>${esc(f)}</b></span>`).join('');
  for (const el of $$('.flip')) { await pause(reduce ? 0 : 480); if (my !== routeTok) return; el.classList.add('on'); }
  await pause(300);
  mark(2, 'done');
  mark(3, res.cover_status === 'pending' ? 'active' : 'done', res.cover_status === 'pending' ? t('cover_bg') : t('cover_none'));
  $('#mkTitle').textContent = t('ready_h');
  $('#mkEnd').innerHTML = `<button class="btn btn-coral btn-lg" id="open">${esc(t('open_book'))}</button>`;
  $('#open').onclick = () => go('#/read/' + res.id);
}

/* ---------- ا read together: the open book ---------- */
let audioTok = 0, curAudio = null;
function stopAudio() {
  audioTok++;
  const button = $('#readBtn');
  if (button) { button.dataset.playing = 'false'; button.textContent = t('read_page'); }
  if (curAudio) { curAudio.pause(); curAudio = null; }
  try { speechSynthesis.cancel(); } catch (e) { /* not supported */ }
  $$('.speaking').forEach(e => e.classList.remove('speaking'));
}
function playURL(url, my) {
  return new Promise(res => {
    if (my !== audioTok) return res();
    const a = new Audio(url); curAudio = a;
    a.onended = a.onerror = () => res();
    a.play().catch(() => res());
  });
}
function browserSay(text, my) {
  return new Promise(res => {
    if (my !== audioTok || !('speechSynthesis' in window)) return res();
    const u = new SpeechSynthesisUtterance(text); u.lang = (LANGS[storyLang()] || LANGS.ar).speech; u.rate = .85;
    u.onend = u.onerror = () => res();
    speechSynthesis.speak(u);
  });
}
async function say(text, my) {
  text = plain(text).trim(); if (!text) return;
  if (S.health.ai && S.voiceOK !== false) {
    try { const url = await ttsURL(text, storyLang()); S.voiceOK = true; voiceNote(); return playURL(url, my); }
    catch (e) { S.voiceOK = false; voiceNote(); }
  }
  return browserSay(text, my);
}
function voiceNote() { const n = $('#voiceNote'); if (n) n.textContent = '🎙 ' + t(S.health.ai && S.voiceOK !== false ? 'voice_ai' : 'voice_browser'); }
function prefetch(i) {
  if (!S.health.ai || S.voiceOK === false || !S.story) return;
  const p = S.story.pages[i - 1]; if (!p) return;
  [p.narration, p.child_line, p.fact && t('did_you_know') + ' ' + p.fact].filter(Boolean).forEach(x => ttsURL(plain(x).trim(), storyLang()).catch(() => {}));
}
async function readAloud() {
  const my = ++audioTok;
  $('#readBtn').textContent = t('stop');
  $('#readBtn').dataset.playing = 'true';
  if (S.page === 0) await say(S.story.title + '. ' + gx(t('written_from')).replace('{n}', childName()), my);
  else {
    const p = S.story.pages[S.page - 1];
    if (p.narration) { $('.pbox') && $('.pbox').classList.add('speaking'); await say(p.narration, my); $$('.speaking').forEach(e => e.classList.remove('speaking')); }
    if (my !== audioTok) return;
    await pause(350);
    $('.cbox') && $('.cbox').classList.add('speaking'); await say(p.child_line, my); $$('.speaking').forEach(e => e.classList.remove('speaking'));
    if (p.fact && my === audioTok) { await pause(350); $('.fact') && $('.fact').classList.add('speaking'); await say(t('did_you_know') + ' ' + p.fact, my); $$('.speaking').forEach(e => e.classList.remove('speaking')); }
  }
  if (my === audioTok && $('#readBtn')) { $('#readBtn').textContent = t('read_page'); $('#readBtn').dataset.playing = 'false'; }
  return my === audioTok;
}
async function autoRead() {
  const myRoute = routeTok;
  while (S.auto && myRoute === routeTok) {
    prefetch(S.page + 1);
    const finished = await readAloud();
    if (!finished || !S.auto || myRoute !== routeTok) return;
    if (S.page >= S.story.pages.length) { S.auto = false; renderBook(); return; }
    await pause(900); if (!S.auto || myRoute !== routeTok) return;
    S.page++; renderBook();
  }
}
async function read(id, my) {
  setTheme('night'); journey(2);
  if (!S.story || S.story.id !== id) { S.story = await api('/stories/' + id); S.page = 0; S.readLines = new Set(); S.started = S.started || Date.now(); }
  if (my !== routeTok) return;
  S.cover = S.story.cover_url ? await blobURL(S.story.cover_url) : '';
  view.innerHTML = `<section class="screen night-bg"><div class="reader">
    <div class="book" id="book"></div>
    <div class="audio">
      <div class="row"><button class="btn btn-ghost btn-sm" id="readBtn">${esc(t('read_page'))}</button>
        <label class="switch"><input type="checkbox" id="autoSw" ${S.auto ? 'checked' : ''}>${esc(t('read_all'))}</label></div>
      <span class="voice-note" id="voiceNote"></span></div>
    <div class="bnav"><button class="nb" id="prev" aria-label="${esc(t('prev'))}"></button><div class="dots" id="dots"></div><button class="nb" id="next" aria-label="${esc(t('next'))}"></button></div>
  </div></section>`;
  voiceNote(); renderBook();
  $('#readBtn').onclick = () => { if ($('#readBtn').dataset.playing === 'true') { S.auto = false; $('#autoSw').checked = false; stopAudio(); } else { S.voiceUsed = true; prefetch(S.page); readAloud(); } };
  $('#autoSw').onchange = e => { S.auto = e.target.checked; stopAudio(); if (S.auto) autoRead(); else $('#readBtn').textContent = t('read_page'); };
  $('#prev').onclick = () => turn(-1);
  $('#next').onclick = () => turn(1);
  document.onkeydown = e => {
    if (!location.hash.startsWith('#/read')) return;
    const rtl = document.documentElement.dir === 'rtl';
    if (e.key === 'ArrowRight') turn(rtl ? -1 : 1);
    if (e.key === 'ArrowLeft') turn(rtl ? 1 : -1);
  };
  if (S.story.cover_status === 'pending') pollCover(routeTok);
}
function turn(d) {
  S.auto = false; const sw = $('#autoSw'); if (sw) sw.checked = false; stopAudio();
  const last = S.story.pages.length;
  if (d > 0 && S.page >= last) return go('#/goodnight/' + S.story.id);
  S.page = Math.max(0, Math.min(last, S.page + d)); renderBook();
  if (S.voiceUsed) prefetch(S.page);
}
async function pollCover(my) {
  for (let i = 0; i < 40 && my === routeTok; i++) {
    await pause(5000); if (my !== routeTok) return;
    try {
      const s = await api('/stories/' + S.story.id);
      if (s.cover_status !== 'pending') {
        S.story.cover_url = s.cover_url; S.story.cover_status = s.cover_status;
        if (s.cover_url) { S.cover = await blobURL(s.cover_url); if (S.page === 0 && my === routeTok) renderBook(); }
        return;
      }
    } catch (e) { return; }
  }
}
function renderBook() {
  const B = S.story, last = B.pages.length;
  let art, text;
  if (S.page === 0) {
    art = (S.cover ? `<img src="${S.cover}" alt="">` : sceneSVG('night')) + `<span class="badge chip ${B.source === 'ai' ? 'chip-ai' : 'chip-purple'}">${esc(t(B.source === 'ai' ? 'ai_story' : 'backup_story'))}</span>`;
    text = `<span class="chip chip-child">📚 ${fill(t('book_no'), { k: String(B.book_number || '') })}</span>
      <h1 class="cover-t">${esc(B.title)}</h1><p class="muted">${fill(t('written_from'))}</p>
      ${(B.facts || []).length ? `<p class="chip chip-ai">💡 ${fill(t('facts_inside'), { k: String(B.facts.length) })}</p>` : ''}
      <div><button class="btn btn-coral btn-lg" id="begin">${esc(t('start_reading'))}</button></div>`;
  } else {
    const p = B.pages[S.page - 1], done = S.readLines.has(S.page);
    const words = plain(p.child_line).split(/\s+/).map(w => `<span class="w${done ? ' ok' : ''}">${esc(w)}</span>`).join(' ');
    art = sceneSVG(p.scene, p.props);
    text = `<div class="row" style="justify-content:space-between"><span class="face js-face"></span><span class="note">${fill(t('page_of'), { i: String(S.page), k: String(last) })}</span></div>
      ${p.narration ? `<div class="pbox"><small>${esc(t('parent_reads'))}</small><p class="ntext">${bridged(p.narration)}</p></div>` : `<p class="chip chip-parent">${esc(t('parent_listens'))}</p>`}
      <div class="tip" id="tip" hidden></div>
      <div class="cbox"><span class="face js-face"></span><div style="flex:1"><small>${fill(t('child_reads'))}</small><p class="ctext">${words}</p></div></div>
      ${p.fact ? `<div class="fact"><small>${esc(t('did_you_know'))}</small><p>${esc(p.fact)}</p></div>` : ''}
      ${readingConfirmation(done)}`;
  }
  $('#book').innerHTML = `<div class="art">${art}</div><div class="text">${text}</div>`;
  paintFace();
  $('#dots').innerHTML = Array.from({ length: last + 1 }, (_, i) => `<i class="${i === S.page ? 'on' : ''}"></i>`).join('');
  const rtl = document.documentElement.dir === 'rtl';
  $('#prev').textContent = rtl ? '›' : '‹'; $('#next').textContent = S.page >= last ? '✓' : (rtl ? '‹' : '›');
  $('#prev').disabled = S.page === 0;
  $('#next').setAttribute('aria-label', S.page >= last ? t('finish') : t('next'));
  $('#begin') && ($('#begin').onclick = () => turn(1));
  $$('#book .br').forEach(b => b.onclick = b.onkeydown = e => {
    if (e.type === 'keydown' && e.key !== 'Enter') return;
    const w = b.textContent.trim();
    const pair = (B.bridges || []).find(([, f]) => f.replace(/~/g, '').includes(w) || w.includes(f.replace(/~/g, '')));
    if (!pair) return;
    const tip = $('#tip'); tip.hidden = false; tip.innerHTML = fill(t('bridge_tip'), { s: pair[0], b: pair[1] });
  });
  $('#childBtn') && ($('#childBtn').onclick = childReads);
}
function readingConfirmation(done) {
  return `<div class="page-tools reading-confirmation">
    <button type="button" class="btn btn-sm read-confirm" id="childBtn" aria-pressed="${done}" aria-describedby="readStatus" title="${esc(t(done ? 'child_unmark' : 'child_mark'))}">
      ${icon(done ? 'checkCircle' : 'check')}<span>${esc(t('child_confirm'))}</span>
    </button>
    <span id="readStatus" class="read-status" role="status" aria-live="polite">${done ? fill(t('child_done')) : ''}</span>
  </div>`;
}
function childReads() {
  const page = S.page, button = $('#childBtn');
  if (!button || page < 1) return;
  const done = !S.readLines.has(page);
  if (done) S.readLines.add(page); else S.readLines.delete(page);
  $$('.cbox .w').forEach(word => { word.classList.remove('cur'); word.classList.toggle('ok', done); });
  button.setAttribute('aria-pressed', String(done));
  button.title = t(done ? 'child_unmark' : 'child_mark');
  button.innerHTML = `${icon(done ? 'checkCircle' : 'check')}<span>${esc(t('child_confirm'))}</span>`;
  $('#readStatus').innerHTML = done ? fill(t('child_done')) : '';
}

/* ---------- ي goodnight ---------- */
async function goodnight(id, my) {
  setTheme('night'); journey(3);
  if (!S.story || S.story.id !== id) S.story = await api('/stories/' + id);
  if (my !== routeTok) return;
  const cover = S.story.cover_url ? await blobURL(S.story.cover_url) : '';
  view.innerHTML = `<section class="screen night-bg"><div class="end split">
    <div class="bigbook">${cover ? `<img src="${cover}" alt="">` : sceneSVG('night')}</div>
    <div class="stack" id="gnText">
      <span class="chip chip-ai">✨ ${esc(t('the_end'))}</span>
      <h1 class="title">${fill(t('shelf_h'), { k: String(S.story.book_number || '') })}</h1>
      <p class="lead">${fill(t('shelf_p'))}</p>
      <div class="mission"><h3>${esc(t('mission_h'))}</h3><p class="m">${esc(S.story.mission)}</p><p class="note" style="margin-top:8px">${fill(t('mission_p'))}</p></div>
      ${(S.story.facts || []).length ? `<div class="learned"><h3>${fill(t('learned_h'))}</h3><ul>${S.story.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul></div>` : ''}
      <div class="row"><button class="btn btn-night btn-lg" id="gn">${fill(t('goodnight'))}</button></div>
    </div></div></section>`;
  paintFace(); confetti();
  $('#gn').onclick = async () => {
    $('#gn').disabled = true;
    const words = [...S.readLines].reduce((n, i) => n + plain(S.story.pages[i - 1].child_line).split(/\s+/).length, 0);
    try {
      const r = await api(`/stories/${S.story.id}/complete`, { method: 'POST', body: { minutes: Math.max(1, Math.round((Date.now() - (S.started || Date.now())) / 60000)), child_lines: S.readLines.size, words_read: words } });
      S.child = r.child; S.answers = [];
      journey(3);
      view.innerHTML = `<section class="screen night-bg"><div class="wrap">${sleepHTML()}</div></section>`;
      bindSleep();
    } catch (e) { toast(errMsg(e)); $('#gn').disabled = false; }
  };
}

/* ---------- ☀ parents' morning ---------- */
async function morning(arg, my) {
  setTheme('day'); journey(4);
  const d = await api(`/children/${S.child.id}/dashboard`);
  if (my !== routeTok) return;
  S.child = d.child;
  const k = d.kpi, nights = d.nights, mx = Math.max(12, ...nights.map(n => n.words || 0));
  const dayName = iso => new Date(iso + 'T12:00:00').toLocaleDateString(S.lang === 'ar' ? 'ar-SA' : 'en-GB', { weekday: 'short' });
  const latestCover = d.latest && S.story && S.story.id === d.latest.story_id && S.story.cover_url ? await blobURL(S.story.cover_url) : '';
  view.innerHTML = `<section class="screen peach-bg"><div class="wrap">
    <div class="dash-head"><div><h1 class="title" style="font-size:clamp(2rem,3.6vw,2.8rem)">${esc(t('morning_h'))}</h1>
      <p class="muted" style="font-weight:700">🔒 ${fill(t('morning_sub'))}</p></div>
      <div class="row"><span class="face js-face"></span><button class="btn btn-night" id="tonight">${esc(t('start_tonight'))}</button></div></div>
    ${d.includes_sample ? `<p class="chip chip-ai" style="margin-top:12px">ℹ️ ${esc(t('sample_note'))}</p>` : ''}
    <div class="grid">
      <div class="card kpi s3"><div class="v">${k.nights_with_book}/${k.nights_total}</div><div class="k">${esc(t('k_nights'))}</div></div>
      <div class="card kpi s3"><div class="v">${k.avg_minutes} ${esc(t('min'))}</div><div class="k">${esc(t('k_minutes'))}</div></div>
      <div class="card kpi s3"><div class="v">${k.fusha_words}</div><div class="k">${esc(t('k_words'))}</div></div>
      <div class="card kpi s3"><div class="v">${k.facts}</div><div class="k">${esc(t('k_facts'))}</div></div>
      ${d.latest ? `<div class="qcard s7"><span class="chip chip-child">💬 ${fill(t('q_today'))}</span><p class="q">${esc(d.latest.question)}</p><p class="note" style="margin-top:8px">${esc(t('q_hint'))}</p></div>
      <div class="card s5"><h3>🎯 ${esc(t('mission_follow'))}</h3><p style="font-family:var(--f-read);font-size:1.2rem;font-weight:700">${esc(d.latest.mission)}</p><p class="note">${esc(t('mission_follow_p'))}</p></div>` : ''}
      ${d.latest && d.latest.facts.length ? `<div class="card s12"><h3>💡 ${fill(t('learned_h'))}</h3><ul class="facts-list">${d.latest.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul><p class="note">${fill(t('facts_hint'))}</p></div>` : ''}
      ${d.alerts.length ? `<div class="card s12" style="box-shadow:0 0 0 3px var(--coral) inset"><h3>${esc(t('alerts_h'))}</h3><p>${esc(t('alerts_p'))}</p></div>` : ''}
      <div class="card s8"><h3>📈 ${fill(t('chart_h'))}</h3><p class="note">${esc(t('chart_p'))}</p>
        <div class="chart"><div class="yax">${[0, .5, 1].map(f => `<span style="bottom:${f * 100}%">${Math.round(mx * f)}</span>`).join('')}</div>
          <div class="plot"><div class="gridl"><i></i><i></i><i></i></div>${nights.map((n, i) => n.words == null
            ? `<div class="col miss" title="${esc(t('no_book'))}"><div class="b"></div><span class="x">${i + 1}</span></div>`
            : `<div class="col ${i === nights.length - 1 ? 'tonight' : ''}" title="${n.words}"><span class="lab" style="bottom:calc(${n.words / mx * 100}% + 4px)">${i === nights.length - 1 ? n.words : ''}</span><div class="b" style="height:${n.words / mx * 100}%"></div><span class="x">${i + 1}</span></div>`).join('')}</div></div></div>
      <div class="card s4"><h3>🙂 ${esc(t('week_h'))}</h3><div class="week">${d.week.map(w => `<div><b>${esc(dayName(w.date))}</b><span>${w.feeling ? esc(w.feeling[0]) : '·'}</span>${w.feeling ? esc(w.feeling[1]) : ''}</div>`).join('')}</div></div>
      <div class="card s7"><h3>🌉 ${esc(t('words_h'))}</h3><p class="note">${fill(t('words_p'))}</p><div class="words">${d.words.map(w => `<span>${esc(w)}</span>`).join('')}</div></div>
      ${d.latest ? `<div class="card s5"><h3>📖 ${esc(t('latest_h'))}</h3><div class="row" style="align-items:center;margin-top:8px">
        <div class="mini" style="width:110px;${latestCover ? `background-image:url('${latestCover}')` : 'background:linear-gradient(160deg,#262c6d,#6b5bb5)'}"><span>${latestCover ? '' : '⭐'}</span><b>#${d.books}</b></div>
        <div class="stack" style="gap:8px"><b style="font-family:var(--f-head);font-size:1.2rem">${esc(d.latest.title)}</b><button class="btn btn-coral btn-sm" id="reread">${esc(t('reread'))}</button></div></div></div>` : ''}
      <div class="card s6"><h3>${esc(t('safe_h'))}</h3>${t('safe_items').map(x => `<p style="margin-top:8px">✓ ${esc(x)}</p>`).join('')}</div>
      <div class="card s6"><h3>${esc(t('settings_h'))}</h3>
        <div class="setrow"><span>${esc(t('bedtime'))}</span><input class="input" id="sBed" type="time" value="${esc(S.child.bedtime)}"></div>
        <div class="setrow"><span>${esc(t('story_lang'))}</span><select class="input" id="sLang">${Object.keys(LANGS).map(x => `<option value="${x}" ${x === S.child.language ? 'selected' : ''}>${LANGS[x].name}</option>`).join('')}</select></div>
        ${S.health.demo_mode ? `<div class="setrow"><label class="switch day"><input type="checkbox" id="sDemo" ${S.demo ? 'checked' : ''}>${esc(t('demo_answers'))}</label></div>` : ''}
        <div class="setrow"><span>${esc(t('ai_status'))}</span><b>${esc(t(S.health.ai ? 'ai_on' : 'ai_off'))}</b></div>
        <div class="setrow"><button class="link" id="sProfile">✎ ${esc(t('setup_h'))}</button><button class="link" id="sPhoto">${esc(t('edit_photo'))}</button></div>
        <div class="setrow"><button class="danger" id="sDelete">${esc(t('delete_child'))}</button><button class="link" id="sOut">${esc(t('sign_out'))}</button></div>
        <div class="setrow"><button class="link" id="sAccount" style="color:var(--coral-deep)">${esc(t('delete_account'))}</button><a class="link" href="/privacy.html">${esc(t('privacy'))}</a></div>
      </div>
    </div></div></section>`;
  paintFace();
  $('#tonight').onclick = async () => {
    if (S.child.sleep_until && S.health.demo_mode) S.child = await api(`/children/${S.child.id}/wake`, { method: 'POST' });
    S.answers = []; go('#/night');
  };
  $('#reread') && ($('#reread').onclick = () => { if (!S.story || S.story.id !== d.latest.story_id) S.story = null; S.page = 0; go('#/read/' + d.latest.story_id); });
  const patch = async body => { try { S.child = await api('/children/' + S.child.id, { method: 'PATCH', body }); toast(t('saved')); } catch (e) { toast(errMsg(e)); } };
  $('#sBed').onchange = e => patch({ bedtime: e.target.value });
  $('#sLang').onchange = e => patch({ language: e.target.value });
  $('#sDemo') && ($('#sDemo').onchange = e => { S.demo = e.target.checked; store.set('lr_demo_answers', S.demo ? '1' : '0'); toast(t('saved')); });
  $('#sProfile').onclick = () => go('#/setup');
  $('#sPhoto').onclick = () => go('#/photo');
  $('#sDelete').onclick = async () => {
    if (!confirm(t('delete_q'))) return;
    try { await api('/children/' + S.child.id, { method: 'DELETE' }); S.child = null; S.story = null; go('#/setup'); } catch (e) { toast(errMsg(e)); }
  };
  $('#sAccount').onclick = async () => {
    if (!confirm(t('delete_account_q'))) return;
    try { await api('/me', { method: 'DELETE' }); setToken(''); S.child = null; S.story = null; location.href = '/'; } catch (e) { toast(errMsg(e)); }
  };
  $('#sOut').onclick = () => { setToken(''); S.child = null; S.story = null; go('#/start'); };
}

/* ---------- boot ---------- */
(async function boot() {
  applyLang();
  try { S.health = await (await fetch('/api/health')).json(); } catch (e) { /* offline: browser voice only */ }
  S.demo = S.health.demo_mode && store.get('lr_demo_answers', '1') === '1';
  route();
})();
