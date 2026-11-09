/* ============================================================================
   Silver Throne — sat-cladiri.js
   Satul „construit”: fundalul (zid/palisadă după stadiul satului) + fiecare clădire desenată separat,
   cu aspectul după NIVELUL EI (cladiri-art: pragurile 1, 5, 12, 22, 32 → aspectele 1…5).
   Așa satul arată mai frumos și când crești o clădire, nu doar când crește nivelul satului.

   - Imaginile stau în imagini/sat2/ (fond-1…3.webp, <clădire>-1…5.webp, cu fundal transparent).
   - Clădirile nivelului 0 (neconstruite) lasă locul gol: se vede parcela de pământ.
   - La trecerea la un aspect nou, clădirea „crește” o dată, cu o strălucire (S.satArt ține ultimul aspect văzut).
   - Dacă imaginile nu sunt încă publicate (SAT2.ready = false), satul rămâne exact ca înainte.
   Coordonatele sunt în pixelii imaginii satului (1152×928), ca SAT_Z din sat.js.
   ========================================================================== */
const SAT2 = {
  ready: true,                      /* imaginile din imagini/sat2/ sunt publicate */
  base: 'imagini/sat2/',
  /* parcelele: centrul bazei clădirii (x, y) și lățimea desenului, în pixeli 1152×928 */
  /* parcelele din fundal: x = mijlocul, y = vârful din față al parcelei (baza desenului), w = lățimea desenului (px, 1152×928) */
  plots: {
    a: { file: 'topitorie',   x: 352, y: 394, w: 272 },   /* sus-stânga */
    d: { file: 'depozit',     x: 597, y: 324, w: 232 },   /* sus-centru */
    p: { file: 'piata',       x: 840, y: 400, w: 272 },   /* sus-dreapta */
    i: { file: 'infirmerie',  x: 228, y: 548, w: 252 },   /* mijloc-stânga */
    h: { file: 'han',         x: 930, y: 566, w: 262 },   /* mijloc-dreapta */
    t: { file: 'antrenament', x: 368, y: 730, w: 292 }    /* jos-stânga */
  },
  /* câte aspecte există deja ca imagine pentru fiecare clădire (lipsă → cel mai mare disponibil; 0 → parcelă goală) */
  have: { topitorie: 5, depozit: 5, piata: 1, infirmerie: 5, han: 5, antrenament: 1 },
  /* clădirile fără niveluri: un singur aspect */
  fixed: { p: 1, t: 1 },
  /* obiecte mici, fără parcelă (steagul); Negustorul face parte din Piață */
  props: {
    g: { file: null, x: 706, y: 712, w: 60 }      /* steagul, lângă poartă, în culoarea satului */
  },
  /* zona notițelor (Misiuni) e avizierul pictat din centru */
  board: { x: 638, y: 438 },
  W: 1152, H: 928
};
const satArtTier = (k) => {
  if (SAT2.fixed[k]) return SAT2.fixed[k];
  const lv = typeof satLvl === 'function' ? satLvl(k) : 0;
  const map = { a: 'f', h: 'b', i: 'i', d: 'd' }[k];
  return typeof ST_ART !== 'undefined' && map ? ST_ART.tier(lv, map) : Math.min(5, Math.max(0, lv ? 1 : 0));
};
const satArtSrc = (k, tier) => { const c = SAT2.plots[k]; if (!c || tier < 1) return null; const t = Math.min(tier, SAT2.have[c.file] || 0); return t > 0 ? SAT2.base + c.file + '-' + t + '.webp' : null; };
/* zona clicabilă: un dreptunghi în jurul desenului (lățime w, înălțime ~0,85·w deasupra bazei) */
function satArtZone(c) { const w = c.w, h = Math.round(w * 0.86), x0 = c.x - w / 2, y0 = c.y - h; return [[x0, y0, x0 + w, y0, x0 + w, c.y, x0, c.y], [c.x, Math.max(14, y0 + 10)]]; }

/* ultimul aspect văzut pentru fiecare clădire → animația „a crescut” doar o dată */
function satArtSeen(k, tier) {
  const m = S.satArt || (S.satArt = {}), old = m[k];
  m[k] = tier;
  return old != null && tier > old;
}
function satFlagSvg(c) {
  const col = (typeof TW !== 'undefined' && TW.FLAGS && S.cos && TW.FLAGS.find(f => f.id === S.cos.flag)) || null;
  const fill = col && col.col ? col.col : '#a3322a';
  const x = c.x / SAT2.W * 100, y = c.y / SAT2.H * 100;
  return `<svg class="vh-flag" viewBox="0 0 40 90" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%" aria-hidden="true"><path d="M6 88V4" stroke="#3a2614" stroke-width="3"/><circle cx="6" cy="4" r="3" fill="#c9a24b"/><path class="vh-flag-c" d="M7 8 C20 4 26 14 38 10 L38 34 C26 38 20 28 7 32 Z" fill="${fill}" stroke="#1a0f08" stroke-width="1"/></svg>`;
}
function satSprites() {
  let h = '';
  for (const k in SAT2.plots) {
    if (typeof satVisible === 'function' && !satVisible(k)) continue;
    const c = SAT2.plots[k], tier = satArtTier(k), src = satArtSrc(k, tier);
    if (!src) continue;                                   /* nivel 0: parcela rămâne goală */
    const grew = !SAT2.fixed[k] && satArtSeen(k, tier);
    const left = (c.x - c.w / 2) / SAT2.W * 100, width = c.w / SAT2.W * 100, bottom = (1 - c.y / SAT2.H) * 100;
    h += `<img class="vh-b${grew ? ' vh-grew' : ''}" data-b="${k}" src="${src}" alt="" loading="eager" decoding="async" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%;bottom:${bottom.toFixed(2)}%;z-index:${Math.round(c.y)}">`;
  }
  for (const k in SAT2.props) {
    if (typeof satVisible === 'function' && !satVisible(k)) continue;
    const c = SAT2.props[k];
    if (k === 'g') { h += satFlagSvg(c); continue; }
    const left = (c.x - c.w / 2) / SAT2.W * 100, width = c.w / SAT2.W * 100, bottom = (1 - c.y / SAT2.H) * 100;
    h += `<img class="vh-b vh-prop" data-b="${k}" src="${SAT2.base + c.file}.webp" alt="" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%;bottom:${bottom.toFixed(2)}%;z-index:${Math.round(c.y)}">`;
  }
  return `<div class="vh-sprites" aria-hidden="true">${h}</div>`;
}

(function () {
  if (typeof vHub !== 'function' || typeof SAT_Z === 'undefined') return;
  const base = vHub;
  window.vHub = function () {
    if (!SAT2.ready) return base();
    /* zonele clicabile urmăresc desenele noi */
    for (const k in SAT2.plots) if (k in SAT_Z) SAT_Z[k] = satArtZone(SAT2.plots[k]);
    for (const k in SAT2.props) { const c = SAT2.props[k]; if (k in SAT_Z) SAT_Z[k] = satArtZone({ x: c.x, y: c.y, w: Math.max(90, c.w) }); }
    if ('x' in SAT_Z) SAT_Z.x = satArtZone({ x: SAT2.board.x, y: SAT2.board.y, w: 110 });
    const n = typeof satImgN === 'function' ? satImgN() : 1, fond = SAT2.base + 'fond-' + n + '.webp';
    let html = base();
    html = html.replace(/imagini\/sat\/sat-\d\.jpg/g, fond).replace('<svg viewBox="0 0 1152 928"', satSprites() + '<svg viewBox="0 0 1152 928"');
    return html;
  };
})();

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.vh-sprites{position:absolute;inset:0;pointer-events:none;z-index:1}
.vh-map>svg{z-index:3}.vh-map>.vh-lb{z-index:4}
.vh-map .vh-sprites .vh-b{position:absolute;height:auto!important;max-width:none!important;max-height:none!important;display:block;filter:drop-shadow(0 10px 8px #0008);transform-origin:50% 92%;transition:filter .2s}
.vh-map:has(.vh-z.on) .vh-b{filter:drop-shadow(0 10px 8px #0008) brightness(.88)}
${['a','d','p','i','h','t','l'].map(k => `.vh-map:has(.vh-z.on[data-z="${k}"]) .vh-b[data-b="${k}"]`).join(',')}{filter:drop-shadow(0 0 14px #f0d27aaa) brightness(1.12)!important}
.vh-map .vh-sprites svg.vh-flag{position:absolute;inset:auto;right:auto;bottom:auto;width:3.2%!important;height:auto!important;pointer-events:none;transform:translate(-20%,-96%);z-index:500;filter:drop-shadow(0 6px 4px #0008)}
.vh-flag-c{transform-origin:7px 20px;animation:vhFlag 2.8s ease-in-out infinite alternate}
@keyframes vhFlag{from{transform:skewY(-3deg) scaleX(.96)}to{transform:skewY(3deg) scaleX(1.03)}}
.vh-grew{animation:vhGrow 1.4s cubic-bezier(.2,1.4,.4,1) both}
.vh-grew::after{content:''}
@keyframes vhGrow{0%{transform:scale(.55);filter:drop-shadow(0 0 0 #f0d27a00) brightness(1.6)}55%{filter:drop-shadow(0 0 26px #f0d27aee) brightness(1.35)}100%{transform:scale(1);filter:drop-shadow(0 10px 8px #0008) brightness(1)}}
@media (prefers-reduced-motion:reduce){.vh-grew,.vh-flag-c{animation:none}}`;
  document.head.appendChild(st);
})();
