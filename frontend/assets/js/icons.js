/* Shared, local SVG line icons. Text stays in the translation files; this adapter
   upgrades their symbols, including labels updated after a screen is rendered. */
const paths = {
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
  user: '<circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
  book: '<path d="M12 7v14m0-14C9 4 5 3 2 4v15c3-1 7 0 10 2 3-2 7-3 10-2V4c-3-1-7 0-10 3Z"/>',
  library: '<path d="M4 4v16M8 4v16m4-16v16m4-16 5 16M2 20h20"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13Z"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  volume: '<path d="m11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 5-6 4H2v6h3l6 4V5Zm5 4 6 6m0-6-6 6"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
  play: '<path d="m8 4 12 8-12 8V4Z"/>',
  pause: '<path d="M8 4v16m8-16v16"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  sparkles: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3ZM20 2v4m-2-2h4"/>',
  bulb: '<path d="M9 18h6m-6 3h6M9 15a6 6 0 1 1 6 0v3H9v-3Z"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14a4 4 0 0 0 8 0M8 9h.01M16 9h.01"/>',
  sad: '<circle cx="12" cy="12" r="9"/><path d="M8 17a4 4 0 0 1 8 0M8 9h.01M16 9h.01"/>',
  message: '<path d="M21 11a8 8 0 0 1-8 8H7l-5 3V7a5 5 0 0 1 5-5h6a8 8 0 0 1 8 9Z"/><path d="M7 8h9m-9 5h6"/>',
  camera: '<path d="m9 3-2 3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3l-2-3H9Z"/><circle cx="12" cy="13" r="4"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="2"/><path d="m21 15-5-5L5 21"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-3.7 1.5 1.5 0 0 1 1-2.6h2a4 4 0 0 0 4-4C21 6.4 17 3 12 3Z"/><path d="M7 11h.01M9 7h.01M14 7h.01M17 10h.01"/>',
  pen: '<path d="m16 3 5 5M3 21l5-1L21 7a2 2 0 0 0-4-4L4 16l-1 5Z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  settings: '<path d="m10 3-1 3-3 1-3-1-1 4 3 2v3l-2 2 3 3 3-1 3 1 1 3 4-1v-3l2-2 3-1-1-4-3-1-1-3 1-3-4-1-2 3-2-1Z"/><circle cx="12" cy="12" r="3"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  chart: '<path d="M3 3v18h18M7 15l5-5 4 3 5-7m-5 0h5v5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10h.01"/>',
  bridge: '<path d="M3 8v13m18-13v13M3 12c6 6 12 6 18 0M2 18h20M8 15v6m8-6v6"/>',
  ear: '<path d="M6 8a6 6 0 0 1 12 0c0 4-4 5-4 8a4 4 0 0 1-8 0m4-7a2 2 0 0 1 4 0c0 2-2 2-2 4"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  ruler: '<path d="m3 15 12-12 6 6L9 21l-6-6Zm9-9 3 3m-6 0 2 2m-5 1 3 3"/>',
  ball: '<circle cx="12" cy="12" r="9"/><path d="m12 7 5 4-2 6H9l-2-6 5-4Zm0-4v4m9 2-4 2m1 8-3-2m-9 2 3-2M3 9l4 2"/>',
  cloud: '<path d="M6 17a5 5 0 1 1 1-9 7 7 0 0 1 13 3 3 3 0 0 1-1 6H6Zm2 3-1 2m6-2-1 2m6-2-1 2"/>',
  bandage: '<path d="m3 15 12-12a3 3 0 0 1 4 0l2 2a3 3 0 0 1 0 4L9 21a3 3 0 0 1-4 0l-2-2a3 3 0 0 1 0-4Zm5-5 6 6m-4-8 6 6m-5-2h.01m2 0h.01"/>',
  shoe: '<path d="M4 4h5v6l4 4 7 2a2 2 0 0 1 1 4H3V9l1-5Zm0 12h6m2-5-2 2m5 0-2 2"/>',
  sleep: '<path d="M3 7h7l-7 9h7m4-13h7l-7 9h7"/>',
  tooth: '<path d="M7 3c-5 0-5 7-3 11 2 5 2 7 4 7s1-8 4-8 2 8 4 8 2-2 4-7c2-4 2-11-3-11-3 0-3 2-5 2S10 3 7 3Z"/>',
  waves: '<path d="M2 8q3-4 6 0t6 0 6 0m-18 5q3-4 6 0t6 0 6 0m-18 5q3-4 6 0t6 0 6 0"/>',
  handshake: '<path d="m2 8 4-4 5 2 3-1 8 6-4 8-4 2-8-7-4-6Zm9-2-4 4 3 2 4-3m-6 7 3-3m0 6 3-3m0 5 3-3"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  undo: '<path d="M3 10h12a6 6 0 0 1 0 12M3 10l5-5m-5 5 5 5"/>',
};

const names = new Map();
for (const [name, symbols] of Object.entries({
  users: ['👨‍👩‍👧', '👨‍👩‍👧‍👦'], user: ['👨', '👧', '👵'], book: ['📖'], library: ['📚'],
  sun: ['☀', '☀️'], moon: ['🌙'], lock: ['🔒'], shield: ['🛡️', '🛡', '🦸'],
  volume: ['🔊'], muted: ['🔇'], mic: ['🎤', '🎙', '🎙️'], play: ['▶', '▶️'], pause: ['⏸', '⏸️'],
  check: ['✓'], checkCircle: ['✅'], star: ['⭐'], sparkles: ['✨', '✦', '💥', '🥳'],
  bulb: ['💡'], heart: ['💛', '❤️', '🤍'], smile: ['😊', '🙂'], sad: ['😣', '😟', '😤', '😢', '😞', '😨', '😰', '😭'], message: ['💬'],
  camera: ['📷'], image: ['🖼️', '🖼'], palette: ['🎨'], pen: ['✍️', '✍', '✎'], trash: ['🗑️', '🗑'],
  settings: ['⚙️', '⚙'], target: ['🎯'], chart: ['📈'], info: ['ℹ️', 'ℹ'], bridge: ['🌉'], ear: ['👂'],
  phone: ['📱'], globe: ['🌍'], ruler: ['📏'], ball: ['⚽'], cloud: ['🌧️', '🌧'], bandage: ['🩹'],
  shoe: ['👟'], sleep: ['💤', '😴'], tooth: ['🦷'], waves: ['🏊'], handshake: ['🤝'],
  left: ['←', '‹'], right: ['→', '›'], undo: ['↺'],
})) for (const symbol of symbols) names.set(symbol, name);

export function icon(name, attributes = '') {
  return `<svg class="ui-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" ${attributes}>${paths[name] || paths.sparkles}</svg>`;
}

export const symbolIcon = (symbol, attributes = '') => icon(names.get(symbol) || 'sparkles', attributes);
const symbols = /(?:\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*|[▶✓✦↺←→‹›])/gu;
const skip = 'script,style,textarea,option,title,svg,[data-no-icons]';

function replaceSymbols(node) {
  if (!node.parentElement || node.parentElement.closest(skip)) return;
  const text = node.nodeValue;
  const matches = [...text.matchAll(symbols)].filter(m => m[0] !== '©' && m[0] !== '®');
  if (!matches.length) return;
  const fragment = document.createDocumentFragment();
  let start = 0;
  for (const match of matches) {
    fragment.append(text.slice(start, match.index));
    const template = document.createElement('template');
    template.innerHTML = symbolIcon(match[0]);
    // Keep icon-only controls and feeling indicators understandable to assistive technology.
    if (text.trim() === match[0] && !node.parentElement.hasAttribute('aria-label')) {
      template.content.firstChild.removeAttribute('aria-hidden');
      template.content.firstChild.setAttribute('role', 'img');
      template.content.firstChild.setAttribute('aria-label', names.get(match[0]) || 'illustration');
    }
    fragment.append(template.content);
    start = match.index + match[0].length;
  }
  fragment.append(text.slice(start));
  node.replaceWith(fragment);
}

export function renderIcons(root = document.body) {
  if (root.nodeType === Node.TEXT_NODE) return replaceSymbols(root);
  if (root.nodeType !== Node.ELEMENT_NODE || root.closest(skip)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(replaceSymbols);
}

renderIcons();
new MutationObserver(records => {
  for (const record of records) {
    if (record.type === 'characterData') replaceSymbols(record.target);
    else record.addedNodes.forEach(node => { if (node.isConnected) renderIcons(node); });
  }
}).observe(document.body, { subtree: true, childList: true, characterData: true });
