/* ============================================================================
   Silver Throne — seturi.js
   Seturile de echipament: 5 seturi (coif, armură, cizme, bijuterie), fiecare cu imaginile lui
   (imagini/seturi/<set>-<slot>.webp, făcute din iconițele pictate ale jocului, recolorate) și un bonus
   când porți 2 sau 4 piese din același set pe același luptător.
   • Obiectele Magic+ pot ieși dintr-un set: Magic 35%, Rar 60%, Epic întotdeauna. Comunele rămân simple.
   • Obiectele vechi din salvare primesc o singură dată un set, după aceleași șanse (S.setv).
   • Fundalul iconițelor are culoarea rarității (Comun gri, Magic verde, Rar portocaliu, Epic roșu, Legendar auriu).
   Bonusurile intră în bon() (index.html), deci se văd peste tot: profil, Echipă, luptă, cardul VS.
   ========================================================================== */
const SET_SL = ['h', 'a', 'b', 'j'];
const SETS = {
  regal: { n: 'Aurul Regelui', c: '#e0b84a', b2: { loot: 8 }, b4: { loot: 10, crit: 4 }, d2: '+8% aur', d4: '+10% aur, +4% critic' },
  lup:   { n: 'Sângele Lupului', c: '#d4564f', b2: { bleed: 15 }, b4: { pd: 6 }, d2: '+15% sângerare', d4: '+6% atac' },
  nord:  { n: 'Gheața Nordului', c: '#7cc8ff', b2: { pf: 6 }, b4: { ph: 8 }, d2: '+6% apărare', d4: '+8% viață' },
  umbra: { n: 'Umbra', c: '#b07cff', b2: { crit: 5 }, b4: { pd: 5 }, d2: '+5% critic', d4: '+5% atac' },
  codru: { n: 'Codrul Verde', c: '#6fd884', b2: { heal: 10 }, b4: { ph: 6, pf: 3 }, d2: '+10% vindecare', d4: '+6% viață, +3% apărare' }
};
const SET_K = Object.keys(SETS), SET_P = [0, 0.35, 0.6, 1];

function setRoll(it) {
  if (!it || it.set || it.lg || !SET_SL.includes(it.t) || !(it.r >= 1)) return it;
  if (Math.random() < (SET_P[it.r] || 0)) it.set = SET_K[Math.floor(Math.random() * SET_K.length)];
  return it;
}
/* câte piese din fiecare set poartă luptătorul */
function setCount(f) {
  const n = {}; if (!f || !f.eq) return n;
  for (const k of SET_SL) { const it = f.eq[k]; if (it && it.set && SETS[it.set]) n[it.set] = (n[it.set] || 0) + 1; }
  return n;
}
function setBonus(f, b) {
  const n = setCount(f);
  for (const s in n) { const S0 = SETS[s]; for (const [m, bb] of [[2, S0.b2], [4, S0.b4]]) if (n[s] >= m) for (const k in bb) b[k] = (b[k] || 0) + bb[k]; }
  return b;
}
/* iconița unui obiect din set (folosită de iic în index.html) */
const setIc = it => `<span class="ico q${it.r} set" style="--sc:${SETS[it.set].c}"><img class="uii" src="imagini/seturi/${it.set}-${it.t}.webp" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='imagini/ui/${UISL[it.t]}.webp'"></span>`;
/* rândul din fereastra obiectului: setul, câte piese ai și bonusurile */
function setTip(it) {
  if (!it || !it.set || !SETS[it.set]) return '';
  const s = SETS[it.set], f = typeof cur === 'function' ? cur() : null, n = f ? (setCount(f)[it.set] || 0) : 0;
  return `<div class="tp-set" style="--sc:${s.c}"><b>Set: ${s.n}</b>${f ? ` <span>(${n}/4 pe ${tEsc(f.n)})</span>` : ''}<div class="${n >= 2 ? 'on' : ''}">2 piese: ${s.d2}</div><div class="${n >= 4 ? 'on' : ''}">4 piese: ${s.d4}</div></div>`;
}
/* rândul din profil: seturile purtate */
function setLine(f) {
  const n = setCount(f), ks = Object.keys(n); if (!ks.length) return '';
  return `<div class="pr-sets">${ks.map(k => { const s = SETS[k]; return `<div style="--sc:${s.c}"><b>${s.n}</b> ${n[k]}/4${n[k] >= 2 ? ` · <span class="on">${n[k] >= 4 ? s.d2 + ', ' + s.d4 : s.d2}</span>` : ` · <span>2 piese: ${s.d2}</span>`}</div>`; }).join('')}</div>`;
}

/* legăturile: după ce scriptul din pagină a definit mkItem, bon și itTip */
function setHook() {
  if (typeof mkItem === 'function' && !mkItem.__set) { const f = mkItem; window.mkItem = function (...a) { return setRoll(f.apply(this, a)); }; window.mkItem.__set = 1; }
  if (typeof bon === 'function' && !bon.__set) { const f = bon; window.bon = function (x) { return setBonus(x, f(x)); }; window.bon.__set = 1; }
  if (typeof itTip === 'function' && !itTip.__set) { const f = itTip; window.itTip = function (it, cmp) { return f(it, cmp) + setTip(it); }; window.itTip.__set = 1; }
  setMig();
}
/* obiectele vechi: o singură dată, aceleași șanse */
function setMig() {
  if (typeof S === 'undefined' || !S || !S.fs || S.setv) return;
  S.setv = 1;
  const all = [...(S.inv || []), ...[...(S.fs || []), ...(S.rs || []), ...(S.gd || [])].flatMap(f => Object.values(f.eq || {}))];
  all.forEach(setRoll);
}
if (typeof window !== 'undefined') {
  if (document.readyState === 'complete') setHook(); else window.addEventListener('load', setHook);
  setInterval(() => { if (typeof S !== 'undefined' && S && !S.setv) setMig(); }, 2000);   /* salvarea contului se încarcă după pagină */
}

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `
:root{--q0:#8f8a7c;--q1:#5fc470;--q2:#d99a3a;--q3:#d4564f;--ql:#f0d27a}
.ico.q0{background:radial-gradient(circle at 50% 38%,#3a3833,#121314 75%)}
.ico.q1{background:radial-gradient(circle at 50% 38%,#24502c,#0b130d 75%);border-color:var(--q1)}
.ico.q2{background:radial-gradient(circle at 50% 38%,#5e3d12,#160e05 75%);border-color:var(--q2)}
.ico.q3{background:radial-gradient(circle at 50% 38%,#621d1a,#170706 75%);border-color:var(--q3)}
.ico.lg{background:radial-gradient(circle at 50% 38%,#6a4e12,#1a1206 75%);border-color:var(--ql)}
.ico.set::after{content:'';position:absolute;right:2px;bottom:2px;width:6px;height:6px;border-radius:50%;background:var(--sc);box-shadow:0 0 4px var(--sc),0 0 0 1px #000}
.tp-set{margin-top:6px;padding-top:6px;border-top:1px solid #ffffff1f;font-size:13px;color:var(--mute)}.tp-set b{color:var(--sc)}.tp-set span{font-size:12px}.tp-set .on{color:#9be0a6}
.pr-sets{margin:10px 14px 0;font-size:12.5px;color:var(--mute)}.pr-sets>div{padding:2px 0}.pr-sets b{color:var(--sc)}.pr-sets .on{color:#9be0a6}
/* ramele din profil și din recompense, în culorile rarității din joc */
.pr-sl.q0,.pr-it.q0{border-color:#5a564c}.pr-sl.q1,.pr-it.q1{border-color:var(--q1)}.pr-sl.q2,.pr-it.q2{border-color:var(--q2)}.pr-sl.q3,.pr-it.q3{border-color:var(--q3)}.pr-sl.ql,.pr-it.ql{border-color:var(--ql)}
.rw-it.q1 .rw-front{border-color:var(--q1);box-shadow:inset 0 0 14px #000,0 0 10px #5fc47044}.rw-it.q2 .rw-front{border-color:var(--q2);box-shadow:inset 0 0 14px #000,0 0 12px #d99a3a55}.rw-it.q3 .rw-front{border-color:var(--q3);box-shadow:inset 0 0 14px #000,0 0 14px #d4564f66}
.rw-ti.q1{border-color:var(--q1)}.rw-ti.q2{border-color:var(--q2)}.rw-ti.q3{border-color:var(--q3)}`;
  document.head.appendChild(st);
})();
