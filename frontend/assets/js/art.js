import { symbolIcon } from './icons.js';

/* Illustration kit: Hudhud the hoopoe, the child as a cartoon hero, and 7 night/day scenes (all inline SVG, no image costs).
   The hero's face comes from the child's cartoon avatar: <symbol id="heroHead"> in app.html, image #heroHeadImg. */
export const svgFace = girl => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="${girl?'#FFD3E2':'#9ED8FF'}"/>${girl?'<path d="M40 110c-6-52 24-78 60-78s66 26 60 78c4 34-4 56-14 66l-8-58H62l-8 58c-10-10-18-32-14-66z" fill="#3A241C"/>':''}<path d="M30 200c4-30 32-46 70-46s66 16 70 46z" fill="${girl?'#7C5CF0':'#FF6F59'}"/><circle cx="48" cy="106" r="13" fill="#E2AB84"/><circle cx="152" cy="106" r="13" fill="#E2AB84"/><ellipse cx="100" cy="104" rx="52" ry="56" fill="#EDBB94"/>${girl?'<path d="M48 102c0-42 24-62 52-62s52 20 52 62c-13-20-32-29-52-29-9 10-22 16-35 16-7 0-13 5-17 13z" fill="#3A241C"/><circle cx="146" cy="56" r="9" fill="#FF6F59"/><path d="M146 56l-16-11v22zM146 56l16-11v22z" fill="#FF6F59"/>':'<path d="M46 98c-4-44 24-66 56-66s56 20 52 64c-6-16-17-25-28-27 4 9 2 15-2 19-9-13-33-22-52-18-11 2-20 11-26 28z" fill="#2E1F1A"/>'}<path d="M68 90q11-7 22 0M110 90q11-7 22 0" stroke="#2E1F1A" stroke-width="4.5" fill="none" stroke-linecap="round"/><ellipse cx="79" cy="108" rx="8" ry="9.5" fill="#2A1C17"/><ellipse cx="121" cy="108" rx="8" ry="9.5" fill="#2A1C17"/><circle cx="82" cy="104" r="3" fill="#fff"/><circle cx="124" cy="104" r="3" fill="#fff"/><path d="M98 114q5 8-2 12" stroke="#C98E66" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="64" cy="128" r="9" fill="#FF8C7A" opacity=".5"/><circle cx="136" cy="128" r="9" fill="#FF8C7A" opacity=".5"/><path d="M80 134q20 20 40 0z" fill="#8C2F2B"/><path d="M85 135h30q-2 5-15 5t-15-5z" fill="#fff"/></svg>`);
export const FACE_M = svgFace(false), FACE_F = svgFace(true);

/* Hudhud the hoopoe, the friend who asks about the day */
export const HUD = `<svg viewBox="0 0 200 200" aria-hidden="true"><g class="sv-bob">
  <g transform="translate(72 52)">${[-70,-45,-20,5,30].map((a,i) => `<g transform="rotate(${a})"><ellipse cx="0" cy="-30" rx="8" ry="${26+i%2*4}" fill="#F4A340"/><ellipse cx="0" cy="-52" rx="6" ry="8" fill="#2A1C17"/><ellipse cx="0" cy="-58" rx="4" ry="3" fill="#fff"/></g>`).join('')}</g>
  <path d="M150 120 q34 6 44 30 q-30 4 -48 -12z" fill="#2A1C17"/>
  <ellipse cx="112" cy="128" rx="56" ry="44" fill="#E8A25E"/>
  <path d="M100 112 q36 -14 66 12 q-10 30 -46 34 q-24 -14 -20 -46z" fill="#2A1C17"/>
  <path d="M112 118 q22 -6 44 10 M108 132 q24 -4 46 12 M110 146 q18 0 34 10" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/>
  <circle cx="72" cy="88" r="34" fill="#F0B26E"/>
  <path d="M42 96 Q20 104 4 120" stroke="#2A1C17" stroke-width="6" fill="none" stroke-linecap="round"/>
  <circle cx="66" cy="82" r="11" fill="#fff"/><circle cx="64" cy="83" r="6.5" fill="#2A1C17"/><circle cx="62" cy="80" r="2.2" fill="#fff"/>
  <circle cx="84" cy="100" r="6" fill="#FF8C7A" opacity=".55"/>
  <path d="M98 168 v16 M118 168 v16 M92 184 h12 M112 184 h12" stroke="#E2523D" stroke-width="4" stroke-linecap="round"/>
</g></svg>`;
const VB = 'viewBox="0 0 360 400" preserveAspectRatio="xMidYMax slice"';
const STARS = [[30,40,1.6],[80,90,1.2],[130,30,1.8],[170,110,1.1],[210,50,1.4],[320,140,1.3],[60,170,1.1],[340,30,1.5],[250,120,1],[110,140,1.3]];
const BG = {
 night:() => `<rect width="360" height="400" fill="url(#gNight)"/>${STARS.map(([x,y,r],i) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#FFF6C8" class="${i%3?'':'sv-tw'}"/>`).join('')}<circle cx="292" cy="72" r="30" fill="#FFF0BE"/><circle cx="282" cy="64" r="6" fill="#F2DE9C"/><circle cx="300" cy="84" r="4" fill="#F2DE9C"/><path d="M0 312 Q90 272 190 300 T360 290 V400 H0Z" fill="#2B2E7E"/><g transform="translate(-6 254)"><path d="M-6 26 L32 -4 L70 26Z" fill="#4A4FB3"/><rect x="0" y="24" width="64" height="40" fill="#383D97"/><rect x="24" y="34" width="16" height="16" rx="2" fill="#FFD36B"/></g><path d="M0 350 Q120 318 240 342 T360 336 V400 H0Z" fill="#1E2160"/>`,
 park:() => `<rect width="360" height="400" fill="url(#gSun)"/><g transform="translate(296 66)">${[0,45,90,135,180,225,270,315].map(a => `<rect x="-3" y="-50" width="6" height="14" rx="3" fill="#FFC23D" transform="rotate(${a})"/>`).join('')}<circle r="28" fill="#FFD54A"/></g><g fill="#fff"><ellipse cx="70" cy="70" rx="38" ry="16"/><ellipse cx="92" cy="58" rx="24" ry="16"/><ellipse cx="190" cy="110" rx="30" ry="12"/></g><g transform="translate(40 230)"><rect x="-6" y="0" width="12" height="70" fill="#9C6B3E"/><circle cx="0" cy="-10" r="40" fill="#4FB45E"/><circle cx="-22" cy="8" r="26" fill="#5CC46B"/></g><g transform="translate(320 240)"><rect x="-5" y="0" width="10" height="60" fill="#9C6B3E"/><circle cx="0" cy="-8" r="32" fill="#4FB45E"/></g><path d="M0 320 Q100 290 200 312 T360 300 V400 H0Z" fill="#8BD06F"/><path d="M0 352 Q140 330 260 348 T360 344 V400 H0Z" fill="#6FBF5A"/>`,
 home:() => `<rect width="360" height="400" fill="url(#gHome)"/><rect x="226" y="54" width="96" height="110" rx="8" fill="#fff"/><rect x="233" y="61" width="82" height="96" rx="4" fill="#9FDBFF"/><path d="M274 61V157M233 109H315" stroke="#fff" stroke-width="5"/><g transform="translate(66 80)"><path d="M-22 0h44l-10 30h-24z" fill="#FFC23D"/><rect x="-2" y="30" width="4" height="40" fill="#C68B59"/></g><rect x="0" y="300" width="360" height="100" fill="#E9C29A"/><rect x="0" y="294" width="360" height="9" fill="#D9A574"/><rect x="20" y="236" width="150" height="64" rx="18" fill="#7C8CFF"/><rect x="28" y="214" width="134" height="40" rx="16" fill="#97A4FF"/>`,
 school:() => `<rect width="360" height="400" fill="url(#gSchool)"/><rect x="28" y="46" width="200" height="116" rx="8" fill="#C68B59"/><rect x="36" y="54" width="184" height="100" rx="4" fill="#2F5D50"/><rect x="256" y="50" width="78" height="96" rx="6" fill="#fff"/><rect x="262" y="56" width="66" height="84" rx="3" fill="#9FDBFF"/><rect x="0" y="300" width="360" height="100" fill="#E8B888"/>`
};
export function hero(x, y, s, pose = 'stand', suit = '#5B6CFF'){
  const arm = (sx, a) => `<g transform="translate(${sx} -104) rotate(${a})"><rect x="-8" y="0" width="16" height="48" rx="8" fill="${suit}"/><circle cx="0" cy="50" r="9.5" fill="#FFC23D"/></g>`;
  const ra = {stand:-16, wave:-140, raise:-172, point:-92}[pose] ?? -16;
  return `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="2" rx="40" ry="7" fill="#000" opacity=".18"/><path d="M-30 -110 Q-54 -50 -44 -10 L44 -10 Q54 -50 30 -110Z" fill="#E2523D"/><rect x="-21" y="-44" width="17" height="42" rx="8" fill="#2B3A8C"/><rect x="4" y="-44" width="17" height="42" rx="8" fill="#2B3A8C"/><ellipse cx="-13" cy="-2" rx="13" ry="6" fill="#1F2547"/><ellipse cx="13" cy="-2" rx="13" ry="6" fill="#1F2547"/>${arm(-29, 16)}<rect x="-31" y="-114" width="62" height="78" rx="26" fill="${suit}"/><path d="M0 -92 l5 10 11 1.6 -8 7.6 2 11 -10 -5.4 -10 5.4 2 -11 -8 -7.6 11 -1.6z" fill="#FFD54A"/>${arm(29, ra)}<circle cx="0" cy="-160" r="52" fill="#fff"/><use href="#heroHead" x="-47" y="-207" width="94" height="94"/><circle cx="0" cy="-160" r="49" fill="none" stroke="#FFC23D" stroke-width="5"/></g>`;
}
const emo = (e, x, y, s, a) => `<g transform="translate(${x} ${y})" color="#37476c"><g class="${a ? 'sv-'+a : ''}">${symbolIcon(e, `x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}"`).replace('class="ui-icon"', 'class="scene-icon"')}</g></g>`;
export const SCENES = {
 park:   () => ['park', hero(110,350,1,'wave') + emo('👨',262,262,96) + emo('⚽',190,326,34,'bob')],
 fall:   () => ['park', hero(150,350,1,'stand') + emo('💥',230,300,40,'wiggle') + emo('⚽',300,330,30) + emo('🩹',200,250,30,'float')],
 brave:  () => ['park', hero(120,350,1,'raise') + emo('👨',262,262,96) + emo('💛',190,140,34,'float')],
 sister: () => ['home', hero(110,350,1,'point') + emo('👧',262,286,84) + emo('👟',200,330,34,'bob')],
 night:  () => ['night', hero(140,350,1,'wave') + emo('💤',250,200,34,'float')],
 home:   () => ['home', hero(120,350,1,'wave')],
 school: () => ['school', hero(120,350,1,'raise')]
};
export function sceneSVG(key, props){
  const [bg, body] = (SCENES[key] || SCENES.park)();
  const extra = (props || []).slice(0,2).map((e,i) => emo(e, i ? 290 : 220, i ? 150 : 250, 46, i ? 'float' : 'bob')).join('');
  return `<svg ${VB} aria-hidden="true">${BG[bg]()}${body}${extra}</svg>`;
}

/* gradients + the hero's face symbol; inject once into the page */
export const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <clipPath id="cpCircle" clipPathUnits="objectBoundingBox"><circle cx=".5" cy=".5" r=".5"/></clipPath>
  <symbol id="heroHead" viewBox="0 0 100 100"><image id="heroHeadImg" width="100" height="100" preserveAspectRatio="xMidYMid slice" clip-path="url(#cpCircle)"/></symbol>
  <linearGradient id="gNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#121650"/><stop offset=".6" stop-color="#2E2F86"/><stop offset="1" stop-color="#5A4BB0"/></linearGradient>
  <linearGradient id="gSun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6CC8FF"/><stop offset="1" stop-color="#DDF3FF"/></linearGradient>
  <linearGradient id="gHome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE3C4"/><stop offset="1" stop-color="#FFF4E8"/></linearGradient>
  <linearGradient id="gSchool" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE0C7"/><stop offset="1" stop-color="#FFF3E9"/></linearGradient>
</defs></svg>`;
