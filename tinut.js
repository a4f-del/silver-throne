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

/* ============================================================================
   Satele libere din Lume: aceleași pentru toți (poziția și nivelul se calculează din lista jucătorilor),
   jefuite separat de fiecare: o dată la 4 ore pe sat, fără server (S.wn = {id: momentul jafului}).
   Nivelul unui sat = media celor mai apropiați 3 jucători, deci satele cresc odată cu Lumea.
   ========================================================================== */
const WN = { cd: 4 * 3600e3, gap: 8, names: ['Vadul Negru', 'Satul Lupilor', 'Moara Arsă', 'Crângul Sur', 'Podul Vechi', 'Dealul Ciorii', 'Fântâna Rece', 'Valea Seacă', 'Hanul Părăsit', 'Piatra Albă', 'Codrul Mut', 'Iazul Tulbure', 'Movila Rece', 'Răscruce', 'Vatra Stinsă', 'Gura Văii'] };
const wnHash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
function wnList() {
  const st = LUME.st; if (!st || !st.players || !st.players.length) return [];
  const ps = st.players, key = ps.map(p => p.id + p.x + ',' + p.y + ':' + p.level).join('|');
  if (WN.key === key) return WN.list;
  const occ = new Set(ps.map(p => p.x + ',' + p.y)), R = Math.max(1, ...ps.map(p => Math.max(Math.abs(p.x), Math.abs(p.y)))) + 1, cand = [];
  for (let x = -R; x <= R; x++) for (let y = -R; y <= R; y++) {
    if (occ.has(x + ',' + y) || Math.max(Math.abs(x), Math.abs(y)) < 1) continue;
    let nb = 0; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (occ.has((x + dx) + ',' + (y + dy))) nb++;
    if (nb) cand.push({ x, y, h: wnHash(x + ':' + y) });
  }
  cand.sort((a, b) => a.h - b.h);
  const want = Math.max(6, Math.round(ps.length / 3)), out = [], used = new Set();
  const nm = h => { for (let i = 0; i < WN.names.length; i++) { const n = WN.names[(h + i) % WN.names.length]; if (!used.has(n)) { used.add(n); return n; } } return WN.names[h % WN.names.length] + ' ' + (used.size + 1); };
  for (const c of cand) {
    if (out.length >= want) break;
    const id = 'wn' + c.x + '_' + c.y, pos = lwPos({ id, x: c.x, y: c.y });
    if (typeof tnInside === 'function' && tnInside(pos[0], pos[1])) continue;
    const near = ps.map(p => [Math.hypot(p.x - c.x, p.y - c.y), p.level]).sort((a, b) => a[0] - b[0]).slice(0, 3);
    out.push({ id, x: c.x, y: c.y, pos, lvl: Math.max(1, Math.round(near.reduce((s, n) => s + n[1], 0) / near.length)), n: nm(c.h) });
  }
  WN.key = key; WN.list = out; return out;
}
const wnLeft = v => Math.max(0, ((S.wn || {})[v.id] || 0) + WN.cd - Date.now());
const wnNear = (x, y) => (WN.list || []).some(v => Math.hypot(x - v.pos[0], (y - v.pos[1]) * 1.4) < 110);
/* desenul pe hartă: sat mic sau mare după nivel; după jaf, estompat, cu timpul rămas */
function lwWn() {
  return wnList().map(v => {
    const [cx, cy] = v.pos, big = v.lvl >= 15, src = big ? 'harta/sat-mare' : 'harta/sat-mic', W = big ? 96 : 88, H = W, left = wnLeft(v), sel = S.wsel === v.id, ok = Math.abs(v.lvl - S.lvl) <= WN.gap;
    return `<g class="st-v lw-v${sel ? ' on' : ''}" onclick="wnPick('${v.id}')" tabindex="0" role="button" aria-label="${v.n}, sat liber de nivel ${v.lvl}${left ? ', jefuit de curând' : ''}" transform="translate(${tnF(cx)} ${tnF(cy)})"${left ? ' opacity=".62"' : ''}>`
      + `<ellipse cx="0" cy="${tnF(H * .3)}" rx="${tnF(W * .46)}" ry="${tnF(W * .15)}" fill="#000" opacity=".32"/><ellipse cx="0" cy="${tnF(H * .22)}" rx="${tnF(W * .56)}" ry="${tnF(W * .22)}" fill="none" stroke="${ok ? '#c0504a' : '#8a8f93'}" stroke-width="1.6" stroke-dasharray="6 4" stroke-opacity=".85"/>`
      + `<image href="imagini/${src}.webp" x="${tnF(-W / 2)}" y="${tnF(-H * .62)}" width="${W}" height="${H}"/>`
      + (sel ? `<ellipse cx="0" cy="${tnF(H * .18)}" rx="${tnF(W * .6)}" ry="${tnF(W * .26)}" fill="none" stroke="#f0d27a" stroke-width="2"/>` : '')
      + `<g transform="scale(1.15)">${LWA.plate((H * .42 + 10) / 1.15, v.n + (left ? ' · ' + sdT(left) : ''), false, true, (v.n.length + (left ? 8 : 0)), v.lvl)}</g></g>`;
  }).join('');
}
function wnPick(id) { if (Date.now() - LUME.noClick < 250) return; S.wsel = S.wsel === id ? null : id; S.mv = null; S.msel = null; LUME.sel = null; S.msg = ''; go(); }
/* panoul de sub hartă */
function wnPanel() {
  const v = S.wsel && wnList().find(x => x.id === S.wsel); if (!v) return '';
  const left = wnLeft(v), gold = Math.round((60 + 30 * v.lvl) * 1.2), d = v.lvl - S.lvl, ok = Math.abs(d) <= WN.gap;
  const risk = d >= 4 ? 'periculos' : d >= 1 ? 'greu' : d >= -3 ? 'potrivit' : 'ușor';
  return `<section><h2>${v.n} · sat liber, nivel ${v.lvl}</h2><div class="mute">Un sat fără stăpân, pe care îl poate jefui oricine din Lume. Fiecare jucător îl poate jefui o dată la 4 ore; nivelul lui crește odată cu jucătorii din jur.</div>`
    + `<div class="row"><span>Pradă estimată: ~${gold} aur, minereu și experiență · pentru tine: <b>${risk}</b></span>`
    + (left ? `<span class="mute">Jefuit de tine; din nou în ${sdT(left)}</span>` : !ok ? `<span class="mute">Poți jefui doar sate cu cel mult ${WN.gap} niveluri diferență față de tine.</span>` : `<button class="p" onclick="wnRaid('${v.id}')">Jefuiește · 1 punct</button>`) + '</div></section>';
}
function wnRaid(id) {
  const v = wnList().find(x => x.id === id); if (!v) return;
  if (S.d) { S.msg = 'Ești deja într-o luptă.'; return go(); }
  if (!S.fs.some(f => f.hp > 0)) { S.msg = 'Toți luptătorii sunt căzuți. Du-te la Infirmerie.'; return go(); }
  if (wnLeft(v)) { S.msg = 'L-ai jefuit de curând.'; return go(); }
  if (Math.abs(v.lvl - S.lvl) > WN.gap) { S.msg = 'Satul e prea departe de nivelul tău.'; return go(); }
  if (S.pts < 1) { S.msg = 'Îți trebuie un punct.'; return go(); }
  spend(1); (S.wn = S.wn || {})[v.id] = Date.now();
  const k = Math.max(.6, Math.min(2.4, Math.pow(v.lvl / Math.max(1, S.lvl), 1.2)));
  S.d = { room: 1, rooms: 2, k, rw: 1 + (k - 1) * .6, bn: 'Căpitanul gărzii', di: 0, raid: -5, wn: v.id, wl: v.lvl, rn: v.n, rf: 1, lbl: 'Jaf', loot: { gold: 0, ore: 0, xp: 0, m: {} }, f: null, done: false };
  startF(false); S.tab = 'c'; S.msg = 'Ai ajuns la ' + v.n + '. Gărzile te așteaptă.'; if (S.auto !== false) { autoRun(); return; } go();
}
/* recompensa după căpitanul gărzii (chemată din rl, în index.html) */
function wnRl(d) {
  const vl = d.wl || S.lvl;
  d.loot.gold += Math.round((60 + 30 * vl) * 1.2); d.loot.ore += 5 + vl; d.loot.xp += Math.round(20 + 8 * vl);
  if (Math.random() < .15) { const it = mkItem(P(['w', 'a', 'h', 'b']), Math.max(1, vl), P([1, 1, 2, 2, 3])); S.inv.push(it); d.cm = 'Printre prăzi: ' + it.name + '.'; }
}
