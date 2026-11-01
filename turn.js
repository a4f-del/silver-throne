/* ============================================================================
   Silver Throne — turn.js
   Turnul (endgame, de la nivelul 20): etaje succesive, câte o luptă pe etaj, un străjer la fiecare 10.
   Intrarea costă 6 puncte, etajele sunt gratuite, 3 încercări pe zi. Fiecare intrare o ia de la etajul 1;
   rămân recordul din toate timpurile și cel al săptămânii. Fără vindecare, în afară de un foc de tabără
   după fiecare străjer. Recordul deblochează treptele +6…+9 la Fierărie (etajele 10, 20, 30, 40).
   Folosește motorul temnițelor (S.d cu tw:1); cârligele sunt în index.html, trepte.js și istoric.js.
   ========================================================================== */
const TWR = { lv: 20, cost: 6, day: 3, up: [10, 20, 30, 40], ab: ['call', 'howl', 'drain', 'shield', 'wave', 'poison', 'invuln', 'burn', 'storm', 'rebirth'] };
/* etajul n are monștri de nivelul 12 + n, indiferent de nivelul tău, și cu 3% mai grei pe etaj (reglat prin simulare:
   nivel 20 cu Rar ≈ etajul 13, nivel 30 cu Epic ≈ 22, nivel 40 cu Epic +5 ≈ 32, nivel 50 cu Epic +9 ≈ 39–41) */
TWR.kf = n => 2.6 * Math.pow(1.03, Math.max(0, n - 1)) * (3 + 1.1 * (12 + n)) / (3 + 1.1 * Math.max(1, S.lvl));
const twK = n => TWR.kf(n);
const twWid = () => String(Math.floor((Date.now() - Date.UTC(2024, 0, 5, 13, 0, 0)) / 6048e5));   /* săptămâna se închide vinerea la 15:00, ca la Tron */
function twSt() { const t = S.tw || (S.tw = { best: 0, wk: '', wb: 0, day: '', n: 0 }); if (t.wk !== twWid()) { t.wk = twWid(); t.wb = 0; } if (t.day !== dk()) { t.day = dk(); t.n = 0; } return t; }
const twLeft = () => Math.max(0, TWR.day - twSt().n);
const twUpMax = () => { const b = (S.tw && S.tw.best) || 0; return 5 + TWR.up.filter(f => b >= f).length; };
/* numele monștrilor: urcă prin monștrii temnițelor pe măsură ce urci etajele */
function twMob(n) { const L = Object.values(TR_D).flatMap(x => x.m); return L[Math.min(L.length - 1, Math.floor((n - 1) * L.length / 50))]; }
const twAb = n => TWR.ab[(Math.floor(n / 10) - 1) % TWR.ab.length];
function twEnter() {
  const t = twSt();
  if (S.lvl < TWR.lv) { S.msg = `Turnul se deschide la nivelul ${TWR.lv}.`; return go(); }
  if (S.d) { S.msg = 'Termină întâi coborârea în care ești.'; return go(); }
  if (!S.fs.some(f => f.hp > 0)) { S.msg = 'Toți luptătorii sunt căzuți. Du-i la Infirmerie.'; return go(); }
  if (t.n >= TWR.day) { S.msg = 'Ai folosit toate cele 3 urcări de azi. Revino mâine.'; return go(); }
  if (S.pts < TWR.cost) { S.msg = `Intrarea în Turn costă ${TWR.cost} puncte.`; return go(); }
  spend(TWR.cost); t.n++;
  let di = 0; DG.forEach((g, i) => { if (!g.ev && S.lvl >= g.lv) di = i; });   /* materialele vin ca din cea mai mare temniță deschisă */
  S.d = { tw: 1, room: 0, rooms: 9999, k: twK(1), rw: 1, bn: 'Străjerul', di, tier: 0, loot: { gold: 0, ore: 0, xp: 0, m: {} }, f: null, done: false };
  S.d.doors = doors(); S.tab = 'c'; S.msg = 'Intri în Turn. Fiecare etaj e mai greu decât cel dinainte; poți ieși oricând cu prada.'; cn('d'); go();
}
/* înainte de fiecare etaj (din door): dificultatea, prada și numele străjerului */
function twFloor(d) { const n = d.room; d.k = twK(n); d.rw = 1 + n * 0.04; if (n % 10 === 0) d.bn = `Străjerul etajului ${n}`; }
/* după fiecare etaj câștigat (din win) */
function twWin(d, b) {
  const n = d.room, t = twSt(), was = t.best, msg = [`Etajul ${n} trecut.`];
  if (n > t.best) t.best = n; if (n > t.wb) t.wb = n;
  for (const f of TWR.up) if (was < f && t.best >= f) msg.push(`Ai deblocat +${5 + TWR.up.indexOf(f) + 1} la Fierărie!`);
  if (n % 5 === 0) {   /* un obiect la fiecare 5 etaje */
    const r = n >= 30 && Math.random() < 0.04 ? 'lg' : n >= 30 ? (Math.random() < 0.6 ? 3 : 2) : n >= 10 ? (Math.random() < 0.35 ? 3 : 2) : (Math.random() < 0.7 ? 2 : 1);
    const it = r === 'lg' ? mkLegendary('runic', S.lvl) : mkItem(P(['w', 'a', 'h', 'b', 'j']), S.lvl, r, null, null, 0);
    (d.loot.it || (d.loot.it = [])).push(it); msg.push(`Printre prăzi: ${it.name}.`);
  }
  if (b) {   /* străjer: fragment și foc de tabără */
    if (Math.random() < 0.5) { S.frag = (S.frag || 0) + 1; msg.push('Ai găsit un fragment epic.'); }
    S.fs.forEach(f => { if (f.hp > 0) f.hp = Math.min(mhp(f), f.hp + Math.round(mhp(f) * 0.3)); });
    msg.push('Echipa se odihnește la un foc de tabără (+30% viață).');
  }
  S.msg = msg.join(' ');
}
/* cardul din Coborâre */
function twCard() {
  const t = twSt(), lock = S.lvl < TWR.lv, nx = TWR.up.find(f => t.best < f);
  return `<section class="tw-c"><div class="tw-img"><img src="imagini/lume/turn.webp" alt=""></div><div><h2>Turnul</h2>`
    + `<div class="mute">Etaje tot mai grele, câte o luptă pe etaj și un străjer la fiecare 10. Fiecare intrare o ia de la etajul 1; rămâne recordul tău. Fără vindecare, în afară de un foc de tabără după fiecare străjer. Recordul deblochează treptele +6…+9 la Fierărie.</div>`
    + (lock ? `<div class="row"><span class="mute">Se deschide la nivelul ${TWR.lv}.</span></div>` :
      `<div class="tw-st"><span>Recordul tău<b>${t.best ? 'etajul ' + t.best : '—'}</b></span><span>Săptămâna asta<b>${t.wb ? 'etajul ' + t.wb : '—'}</b></span><span>Urcări azi<b>${twLeft()} / ${TWR.day}</b></span><span>Fierăria<b>până la +${twUpMax()}</b></span></div>`
      + `<div class="row"><span class="mute">${nx ? `Următoarea treaptă (+${5 + TWR.up.indexOf(nx) + 1}) la etajul ${nx}.` : 'Ai deblocat toate treptele Fierăriei.'}</span><button class="p" onclick="twEnter()"${twLeft() && !S.d ? '' : ' disabled'}>Intră · ${TWR.cost} puncte</button></div>`)
    + `</div></section>`;
}
/* pe harta Lumii: la marginea de nord, cu recordul tău; clic → pagina Turnului */
function twPos() { const ps = (LUME.st && LUME.st.players) || []; let y = 0, x = 0; ps.forEach(p => { const q = lwPos(p); if (q[1] < y) y = q[1]; if (q[0] > x) x = q[0]; }); return [Math.round(Math.max(260, x * 0.5)), y - 120]; }   /* nord-est, deoparte de titlul hărții */
const twNear = (x, y) => { const p = twPos(); return Math.hypot(x - p[0], (y - p[1]) * 1.2) < 170; };
function lwTwr() {
  const [x, y] = twPos(), W = 180, H = Math.round(W * 480 / 233), b = (S.tw && S.tw.best) || 0;
  return `<g class="st-v lw-v" onclick="S.tab='c';go()" tabindex="0" role="button" aria-label="Turnul${b ? ', recordul tău: etajul ' + b : ''}" transform="translate(${x} ${y})">`
    + `<ellipse cx="0" cy="${Math.round(H * 0.36)}" rx="${W * 0.55}" ry="${W * 0.16}" fill="#000" opacity=".35"/>`
    + `<image href="imagini/lume/turn.webp" x="${-W / 2}" y="${-Math.round(H * 0.62)}" width="${W}" height="${H}"/>`
    + `<circle cx="1" cy="${-Math.round(H * 0.47)}" r="10" fill="#9fdcff" opacity=".55" class="tw-glow"/>`
    + LWA.plate(Math.round(H * 0.42) + 12, 'Turnul' + (b ? ' · record ' + b : ''), false, true, 14, null) + '</g>';
}
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.tw-c{display:grid;grid-template-columns:96px 1fr;gap:16px;align-items:start}.tw-img img{width:96px;height:auto;filter:drop-shadow(0 6px 10px #000a)}
.tw-st{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}.tw-st span{border:1px solid var(--line);border-radius:8px;padding:6px 8px;font-size:12px;color:var(--mute);background:#0e1214}.tw-st b{display:block;font-size:15px;color:var(--gold2)}
@media (max-width:600px){.tw-c{grid-template-columns:64px 1fr}.tw-img img{width:64px}.tw-st{grid-template-columns:repeat(2,minmax(0,1fr))}}
.tw-glow{animation:twg 2.4s ease-in-out infinite}@keyframes twg{50%{opacity:.15}}@media (prefers-reduced-motion:reduce){.tw-glow{animation:none}}`;
  document.head.appendChild(st);
})();
