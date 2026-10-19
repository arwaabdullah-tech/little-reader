import './pages-demo.js';
/* Talks to the FastAPI backend (/api). The token is kept in this browser only. */
const BASE = '/api';
let token = localStorage.getItem('lr_token') || '';

export const hasToken = () => !!token;
export function setToken(t) {
  token = t || '';
  try { t ? localStorage.setItem('lr_token', t) : localStorage.removeItem('lr_token'); } catch (e) { /* private mode */ }
}

export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export async function api(path, { method = 'GET', body, form, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: form || (body !== undefined ? JSON.stringify(body) : undefined) });
  } catch (e) {
    throw new ApiError(0, 'network');
  }
  if (res.status === 401) setToken('');
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new ApiError(res.status, typeof j.detail === 'string' ? j.detail : 'error');
  }
  if (raw) return res;
  return res.status === 204 ? null : res.json();
}

/* private pictures and audio need the token, so they are fetched as blobs */
const blobs = new Map();
export async function blobURL(url) {
  if (!url) return '';
  if (blobs.has(url)) return blobs.get(url);
  try {
    const res = await api(url.replace(/^\/api/, ''), { raw: true });
    const u = URL.createObjectURL(await res.blob());
    blobs.set(url, u);
    return u;
  } catch (e) { return ''; }
}

const voices = new Map();
/* Hudhud's AI voice for a piece of text (cached per text) */
export function ttsURL(text, lang) {
  const key = lang + '|' + text;
  if (!voices.has(key)) {
    voices.set(key, api('/tts', { method: 'POST', body: { text, lang }, raw: true })
      .then(r => r.blob()).then(b => URL.createObjectURL(b))
      .catch(e => { voices.delete(key); throw e; }));
  }
  return voices.get(key);
}
