/* ============================================================================
   Silver Throne — tinut.js
   O singură hartă: ținutul tău (satele-bot, taberele, locurile de interes, Bastionul, ceața) se desenează
   în Lume, în jurul satului tău, și e vizibil doar pentru tine. Logica rămâne cea din teritorii.js / index.html
   (jaf, cucerire, explorare, campanie); aici e doar așezarea pe harta comună și panourile de dedesubt.
   Fără server (Lumea nu se poate încărca), fila Hartă arată harta veche a regiunii, ca jocul să meargă oricum.
   Se încarcă după lume-pictat.js.
   ========================================================================== */
const TN = { s: 1.15, cx: 210, cy: 150, rx: 300, ry: 215 };   /* scara ținutului și zona lui (în unități ale Lumii) */
LW.IA = 330; LW.IB = 200;    /* satele jucătorilor mai departe unele de altele, ca fiecare ținut să încapă */
const tnF = n => Math.round(n * 10) / 10;
function tnMe() { const st = LUME.st; if (!st || !st.me) return null; const me = st.players.find(p => p.id === st.me.user_id); return me ? lwPos(me) : null; }
/* zona ținutului: decorul Lumii (păduri, munți) nu se pune peste ea */
function tnInside(x, y) { const m = tnMe(); return !!m && Math.hypot((x - m[0]) / TN.rx, (y - m[1]) / TN.ry) < 1; }

/* ceața zonelor neexplorate, ca nori; „?” pe cele în care poți explora acum */
function tnFog() {
  let s = '';
  for (let x = 0; x < TW.GW; x++) for (let y = 0; y < TW.GH; y++) {
    if (terCell(x, y)) continue; const adj = terAdj(x, y), cx = x * SMCL + SMCL / 2, cy = y * SMCL + SMCL / 2;
    s += `<g class="st-v tn-fog" onclick="terSel('z',${x},${y})" tabindex="0" role="button" aria-label="Zonă neexplorată${adj ? ', o poți explora' : ''}"><ellipse cx="${cx}" cy="${cy}" rx="34" ry="27" fill="url(#tn-fg)"/><ellipse cx="${cx - 12}" cy="${cy - 6}" rx="20" ry="15" fill="url(#tn-fg)"/><ellipse cx="${cx + 13}" cy="${cy + 4}" rx="22" ry="16" fill="url(#tn-fg)"/>`
      + (adj ? `<text x="${cx}" y="${cy + 5}" text-anchor="middle" fill="#f0d27a" fill-opacity=".9" style="font:700 15px Cinzel,serif" pointer-events="none">?</text>` : '') + '</g>';
  }
  return s;
}
/* stratul ținutului, centrat pe satul tău (capitala e chiar satul tău din Lume) */
function lwTinut(me) {
  try {
    if (!me || !S.map || !S.ter) return '';
    const [ox, oy] = lwPos(me), s = TN.s, m = MPV(), T = smTerrain(m);
    const roads = Object.values(T.roads || {}).map(r => `<path d="${r.d}" fill="none" stroke="#2a1d10" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/><path d="${r.d}" fill="none" stroke="#a88d5c" stroke-opacity=".9" stroke-width="3" stroke-linecap="round"/>`).join('');
    const vs = [...m.vs].sort((a, b) => (a.id === S.mv) - (b.id === S.mv) || a.y - b.y);
    return `<g class="tn" transform="translate(${tnF(ox - TN.cx * s)} ${tnF(oy - TN.cy * s)}) scale(${s})">`
      + `<ellipse cx="${TN.cx}" cy="${TN.cy + 6}" rx="${TN.rx / s}" ry="${TN.ry / s}" fill="#0e1612" fill-opacity=".28" stroke="#f0d27a" stroke-opacity=".45" stroke-width="1.6" stroke-dasharray="7 6"/>`
      + roads + tnFog() + vs.map(v => terVil(v, hrVillage(v, v.id === S.mv))).join('') + terMarks() + '</g>';
  } catch (e) { return ''; }
}
/* panoul de sub hartă pentru satul-bot, tabăra, locul de interes, Bastionul sau zona aleasă */
function tnPanel() {
  if (S.mv == null && !S.msel) return '';   /* satul 0 e un sat valid */
  const h = vMmap(), i = h.indexOf('</section>');
  return i < 0 ? '' : h.slice(i + 10).replace('<p class="mute">Atinge un sat ca să-l vezi.</p>', terPanel());
}
LWA.defs += `<radialGradient id="tn-fg"><stop offset="0" stop-color="#0b1012" stop-opacity=".85"/><stop offset=".7" stop-color="#0b1012" stop-opacity=".6"/><stop offset="1" stop-color="#0b1012" stop-opacity="0"/></radialGradient>`;
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.tn-fog{cursor:pointer}.tn-fog:hover ellipse{fill-opacity:.7}`;
  document.head.appendChild(st);
})();
