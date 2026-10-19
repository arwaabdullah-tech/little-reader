/* Website pages (landing, privacy): Arabic is written in the HTML; English comes from data-en / data-en-html.
   The language choice is shared with the app. */
import { DEFS, sceneSVG, FACE_F } from './art.js';
import './icons.js';

const mock = document.getElementById('mockArt');
if (mock) {
  document.body.insertAdjacentHTML('afterbegin', DEFS);
  document.getElementById('heroHeadImg').setAttribute('href', FACE_F);
  mock.innerHTML = sceneSVG('park', ['⚽']);
}

const nodes = [...document.querySelectorAll('[data-en],[data-en-html]')];
nodes.forEach(el => { el.dataset.ar = el.innerHTML; });
const titles = { ar: document.title, en: document.documentElement.dataset.titleEn || 'Little Reader | القارئ الصغير' };
let lang = 'ar';
try { lang = localStorage.getItem('lr_lang') === 'en' ? 'en' : 'ar'; } catch (e) { /* private mode */ }

function apply() {
  const en = lang === 'en';
  document.documentElement.lang = lang; document.documentElement.dir = en ? 'ltr' : 'rtl';
  nodes.forEach(el => { el.innerHTML = en ? (el.dataset.enHtml || el.dataset.en.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))) : el.dataset.ar; });
  document.getElementById('lang').textContent = en ? 'العربية' : 'English';
  document.title = titles[lang];
}
document.getElementById('lang').onclick = () => {
  lang = lang === 'ar' ? 'en' : 'ar';
  try { localStorage.setItem('lr_lang', lang); } catch (e) { /* private mode */ }
  apply();
};
apply();
