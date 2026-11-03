/* ============================================================================
   Silver Throne — drum.js
   „Drumul eroului”: un panou mic pe pagina principală a Satului, cu obiective simple pentru jucătorul nou,
   pe trepte. Fiecare treaptă are 5 obiective și o recompensă finală; se deblochează pe rând.
   Stare: S.drum = { claimed: [treptele deja luate] }. Nu ține un calendar, doar progres permanent.
   ========================================================================== */
const hasItem = () => S.inv.length > 0 || mrAll().some(f => SL.some(k => !!(f.eq && f.eq[k])));
const hasWeapon = () => mrAll().some(f => f.eq && f.eq.w);
const mercCount = () => mrAll().filter(f => !f.h).length;
const DRUM = [
  { t: 'Nivelul 1', r: { g: 40, o: 15, m: 2 }, rt: 'Aur + minereu + material de forjare', o: [
    ['Învinge primul monstru', () => C('w') >= 1],
    ['Obține primul obiect', () => hasItem()],
    ['Echipează o armă', () => hasWeapon()],
    ['Recrutează primul mercenar', () => mercCount() >= 1],
    ['Termină prima temniță', () => C('bs') >= 1],
  ] },
  { t: 'Nivelul 2', r: { g: 150, o: 40, m: 4 }, rt: 'Aur + minereu + materiale', o: [
    ['Ajungi la nivelul 5 (deschide Lumea)', () => S.lvl >= 5],
    ['Îmbunătățește o clădire', () => C('b') >= 1],
    ['Antrenează eroul', () => C('t') >= 1],
    ['Recrutează al doilea mercenar', () => mercCount() >= 2],
    ['Jefuiește un sat', () => C('r') >= 1],
  ] },
  { t: 'Nivelul 3', r: { g: 350, o: 80, m: 8, pts: 10 }, rt: 'Aur, minereu, materiale și puncte', o: [
    ['Ajungi la nivelul 10 (deschide Tronul)', () => S.lvl >= 10],
    ['Alege o specializare', () => mrAll().some(f => f.sp) ],
    ['Trimite un mercenar în expediție', () => C('x') >= 1],
    ['Provoacă regele Tronului', () => C('n') >= 1],
    ['Recrutează al treilea mercenar', () => mercCount() >= 3],
  ] },
];
function drumSt() { return S.drum || (S.drum = { claimed: [] }); }
/* prima treaptă nerevendicată încă */
function drumIdx() { const c = drumSt().claimed; return DRUM.findIndex((_, i) => !c.includes(i)); }
function drumClaim(i) {
  const d = drumSt(); if (d.claimed.includes(i) || i !== drumIdx()) return go();
  const t = DRUM[i]; if (!t.o.every(([, f]) => f())) return go();
  const r = t.r; S.gold += r.g; S.ore += r.o; if (r.m) { const k = P(AFM.filter(x => (MLV[x] || 0) <= S.lvl)); give(k, r.m); } if (r.pts) S.pts = Math.min(MXP(), S.pts + r.pts);
  d.claimed.push(i); S.msg = `${t.t} încheiat! Recompensă: +${r.g} aur, +${r.o} minereu${r.m ? ', materiale' : ''}${r.pts ? `, +${r.pts} puncte` : ''}.`; go();
}
function drumPanel() {
  const i = drumIdx();
  if (i < 0) return '';   /* toate treptele luate: panoul dispare, fără să insiste */
  const t = DRUM[i], done = t.o.filter(([, f]) => f()).length, all = done >= t.o.length;
  return `<section class="drum"><h2>Drumul eroului</h2><div class="drum-h"><b>${t.t}</b><span class="mute">${done}/${t.o.length}</span></div>`
    + `<ul class="drum-l">${t.o.map(([n, f]) => `<li class="${f() ? 'ok' : ''}">${f() ? '✓' : '○'} ${n}</li>`).join('')}</ul>`
    + `<div class="drum-r"><span class="mute">Recompensă finală<br>${t.rt}</span>${all ? `<button class="p" onclick="drumClaim(${i})">Revendică</button>` : ''}</div></section>`;
}
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.drum{margin:14px 0}.drum-h{display:flex;justify-content:space-between;align-items:baseline;margin:4px 0 8px}.drum-h b{font:700 15px Cinzel,serif;color:var(--gold2)}
.drum-l{list-style:none;margin:0 0 10px;padding:0;display:flex;flex-direction:column;gap:5px}.drum-l li{font-size:13.5px;color:var(--mute)}.drum-l li.ok{color:#9fe3ad;text-decoration:line-through;text-decoration-color:#9fe3ad66}
.drum-r{display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:1px dashed var(--line);padding-top:8px;font-size:12.5px}`;
  document.head.appendChild(st);
})();
