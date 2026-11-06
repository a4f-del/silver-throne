/* ============================================================================
   Silver Throne — ritm.js
   Ritmul zilei și al săptămânii, pe ceasul serverului (tronNow) și ora României:
     • Ora de aur: în fiecare zi, de la RT.h, o oră, punctele se refac de RT.mult ori mai repede;
     • modificatorul săptămânii (se schimbă vineri la 15:00, odată cu Tronul).
   ========================================================================== */
const RT = { h: 19, mult: 2 };
const RT_W = [
  { k: 'aur', n: 'Săptămâna prăzii', d: 'Aurul din temnițe și raiduri ×1,25', gold: 1.25 },
  { k: 'exp', n: 'Săptămâna războinicului', d: 'Experiența din temnițe și raiduri ×1,25', xp: 1.25 },
  { k: 'res', n: 'Săptămâna minerilor', d: 'Minereul și materialele din pradă ×1,3', res: 1.3 },
  { k: 'foc', n: 'Săptămâna fierarilor', d: 'Forja durează cu 35% mai puțin', forge: .65 },
  { k: 'pct', n: 'Săptămâna vigorii', d: 'Punctele se refac cu 25% mai repede', pt: .8 }
];
const rtNow = () => (typeof tronNow === 'function' ? tronNow() : Date.now());

/* începutul ferestrei de aur curente sau următoare (ms UTC); se recalculează doar după ce fereastra trece */
let _rtS = 0;
function rtStart() {
  const now = rtNow();
  if (!_rtS || now >= _rtS + 3600e3) {
    const L = new Date(now + ST_T.tzOffsetMs(now)), y = L.getUTCFullYear(), m = L.getUTCMonth() + 1, d = L.getUTCDate();
    let s = ST_T.localToUtc(y, m, d, RT.h, 0);
    if (now >= s + 3600e3) s = ST_T.localToUtc(y, m, d + 1, RT.h, 0);
    _rtS = s;
  }
  return _rtS;
}
function rtGold() { const s = rtStart(), n = rtNow(); return n >= s && n < s + 3600e3; }

/* modificatorul săptămânii, aliniat cu săptămâna Tronului (vineri 15:00) */
let _rtW = { m: -1, w: RT_W[0] };
function rtWeek() {
  const n = rtNow(), m = Math.floor(n / 60000);
  if (_rtW.m !== m) _rtW = { m, w: RT_W[ST_T.weekIndex(n) % RT_W.length] };
  return _rtW.w;
}
function rtPT() { return PT / (rtGold() ? RT.mult : 1) * (rtWeek().pt || 1); }
function rtForge() { return rtWeek().forge || 1; }
/* pradă: o singură dată pe coborâre, înainte să se încaseze (apelat din leave) */
function rtLoot(d) {
  if (!d || !d.loot || d.rtDone) return; d.rtDone = 1;
  const w = rtWeek(), L = d.loot;
  if (w.gold) L.gold = Math.round(L.gold * w.gold);
  if (w.xp) L.xp = Math.round(L.xp * w.xp);
  if (w.res) { L.ore = Math.round(L.ore * w.res); for (const k in (L.m || {})) L.m[k] = Math.round(L.m[k] * w.res); }
}
function rtBanner() {
  if (typeof S === 'undefined' || !S || S.d || !(S.tab === 'c' || (S.tab === 'a' && !S.vil))) return '';
  if (typeof ghActive === 'function' && ghActive()) return '';
  const gold = rtGold(), s = rtStart(), now = rtNow(), w = rtWeek(), left = gold ? s + 3600e3 - now : s - now;
  const cd = left <= 3600e3 ? `<span data-end="${Date.now() + left}">${fmt(left)}</span>` : sdT(left);
  const a = gold ? `<b class="rt-on">⚡ Ora de aur · punctele se refac de ${RT.mult}×</b><span>mai ai ${cd}</span>`
    : `<b>⚡ Ora de aur · ${RT.h}:00–${RT.h + 1}:00 (ora României)</b><span>începe în ${cd}</span>`;
  return `<section class="rt${gold ? ' on' : ''}"><div class="rt-r">${a}</div><div class="rt-r"><b>${w.n}</b><span>${w.d}</span></div><div class="mute rt-n">Modificatorul se schimbă vineri la 15:00, odată cu Tronul. Dacă bara de puncte e plină, bonusul orei de aur se pierde.</div></section>`;
}
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.rt{padding:10px 14px}.rt.on{border-left-color:var(--gold2)!important;box-shadow:0 0 0 1px var(--gold2),0 0 18px #f0d27a40}
.rt-r{display:flex;flex-wrap:wrap;justify-content:space-between;gap:2px 12px;padding:3px 0}.rt-r b{color:var(--gold2)}.rt-r b.rt-on{color:#9be0a6}.rt-r span{color:var(--ink)}.rt-n{font-size:13px;margin-top:4px}`;
  document.head.appendChild(st);
})();