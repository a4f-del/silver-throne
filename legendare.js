/* ============================================================================
   Silver Throne — legendare.js
   Legendarele Turnului: câte unul garantat prima dată când treci de etajele 20, 25, 30, 40, 50, 60, 70, 80, 90, 100
   (turn.js: TW_LG). Patru sunt pentru oricine (bijuterie, cizme, coif, armură), șase sunt arme de clasă (doar clasa lor).
   Fiecare are un efect special (LG[id].ef; LG[id].fx rămâne numele culorilor din CSS), citit de luptă prin lgFx(f) (toate legendarele purtate de un luptător):
     regen  — își reface x din viață la sfârșitul fiecărei ture        treg  — toată echipa își reface x pe tură
     dodge  — șansa de a se feri de o lovitură                          dr    — primește cu x mai puține daune din lovituri
     critx  — loviturile critice fac ×critx                             blm   — sângerarea pe care o provoacă e de x ori mai grea
     ls     — se vindecă cu x din daunele pe care le face               chain — șansa ca lovitura să sară și pe alt inamic (50%)
     thorns — întoarce x din daunele primite                            stn / pr — ca la armele de clasă (amețire, trece prin armură)
   Valorile sunt moderate: un legendar e un salt, nu un câștig sigur (reglat prin simulare în Turn).
   Imaginile: imagini/legendare/<id>.webp (mare) și <id>-ico.webp (iconița).
   ========================================================================== */
const LGX = {
  maree:   { n: 'Amuleta Mareelor',         t: 'j', x: { ph: 8, heal: 15 }, ef: { regen: 0.03 }, d: 'Își reface 3% din viață la sfârșitul fiecărei ture.', c: ['#7ff0e8', '#e0b84a'] },
  pasi:    { n: 'Pașii Furtunii',           t: 'b', x: { crit: 5 }, ef: { dodge: 0.12 }, d: '12% șansă să se ferească de o lovitură.', c: ['#7cc8ff', '#f0d27a'] },
  violet:  { n: 'Coiful Ochilor Violeți',   t: 'h', x: { crit: 8 }, ef: { critx: 2 }, d: 'Loviturile critice fac ×2 daune.', c: ['#c58cff', '#f0d27a'] },
  fum:     { n: 'Platoșa de Fum',           t: 'a', x: { ph: 6 }, ef: { dr: 0.12 }, d: 'Primește cu 12% mai puține daune din lovituri.', c: ['#9fb4ff', '#c9a24b'] },
  smarald: { n: 'Arcul de Smarald',         t: 'w', wf: 'arc', cls: 'Arcaș', x: { bleed: 25 }, ef: { blm: 2 }, d: 'Sângerarea pe care o provoacă e de două ori mai grea.', c: ['#5fe07a', '#1f8a3a'] },
  ametist: { n: 'Toiagul de Ametist',       t: 'w', wf: 'toi', cls: 'Mag', x: { pd: 6 }, ef: { pr: 0.6 }, d: 'Toate loviturile trec prin 60% din armura inamicului.', c: ['#c58cff', '#5c8cff'] },
  izvor:   { n: 'Crucea Izvorului',         t: 'w', wf: 'sce', cls: 'Vraci', x: { ph: 6 }, ef: { treg: 0.02 }, d: 'Toată echipa își reface 2% din viață la sfârșitul fiecărei ture.', c: ['#7ff0e8', '#3aa6c8'] },
  tunet:   { n: 'Ciocanul Tunetului',       t: 'w', wf: 'cio', cls: 'Războinic', x: {}, ef: { chain: 0.25, stn: 0.12 }, d: '25% șansă ca lovitura să sară ca fulger pe alt inamic (50% din daune); 12% amețire.', c: ['#9fdcff', '#3a7cff'] },
  zori:    { n: 'Lama Zorilor',             t: 'w', wf: 'sab', cls: 'Campion', x: {}, ef: { ls: 0.15 }, d: 'Se vindecă cu 15% din daunele pe care le face.', c: ['#fff1b8', '#f0b84a'] },
  rege:    { n: 'Scutul Regelui',           t: 'w', wf: 'tur', cls: 'Paznic', x: {}, ef: { dr: 0.1, thorns: 0.3 }, d: 'Primește cu 10% mai puține daune și întoarce 30% din ele.', c: ['#f0d27a', '#c0504a'] }
};
for (const id in LGX) Object.assign(LGX[id], { fx: id, img: `imagini/legendare/${id}.webp`, ico: `imagini/legendare/${id}-ico.webp` });

/* efectele tuturor legendarelor purtate de un luptător (se adună; dr și dodge au plafon) */
function lgFx(f) {
  const o = {}; if (!f || !f.eq) return o;
  for (const k in f.eq) { const it = f.eq[k], d = it && it.lg && typeof LG !== 'undefined' && LG[it.lg]; if (d && d.ef) for (const x in d.ef) o[x] = x === 'critx' ? Math.max(o[x] || 0, d.ef[x]) : (o[x] || 0) + d.ef[x]; }
  if (o.dr) o.dr = Math.min(0.3, o.dr); if (o.dodge) o.dodge = Math.min(0.25, o.dodge);
  return o;
}
/* o lovitură primită (spEnemyHit): ferire și daune reduse */
function lgHit(t, e, dm, L) {
  const x = lgFx(t);
  if (x.dodge && Math.random() < x.dodge) { L.push(`${t.n} se ferește!`); return 0; }
  return x.dr ? Math.max(1, Math.round(dm * (1 - x.dr))) : dm;
}
function lgThorn(t, e, dm, L) {
  const x = lgFx(t); if (!x.thorns || dm <= 0 || e.hp <= 0) return;
  const r = Math.max(1, Math.round(dm * x.thorns)); e.hp -= r; L.push(`Scutul lui ${t.n} întoarce ${r}.` + (e.hp <= 0 ? ' ' + e.n + ' cade!' : ''));
}
/* după o lovitură dată (spAfter): viață furată, sângerare mai grea, fulger */
function lgAfter(a, e, dm, L) {
  const x = lgFx(a); if (!dm) return;
  if (x.ls && a.hp > 0) {
    const h = Math.max(1, Math.round(dm * x.ls)), before = a.hp;
    a.hp = Math.min(mhp(a), a.hp + h);
    /* BETA Tron: aratam vindecarea efectiva, altfel jurnalul pare sa
       contina mai multa dauna primita decat viata cu care a pornit eroul. */
    if (typeof ST_SERVER !== 'undefined' && ST_SERVER === 'beta' &&
        S.d && S.d.tron && S.d.ghost && a.hp > before)
      L.push(a.n + ' recuperează ' + (a.hp - before) + ' viață din lovitură.');
  }
  if (x.blm && e.bl > 0) e.blm = Math.max(e.blm || 1, x.blm);
  if (x.chain && Math.random() < x.chain && S.d && S.d.f) {
    const o = S.d.f.es.filter(z => z !== e && z.hp > 0); if (o.length) { const z = P(o), r = Math.max(1, Math.round(dm * 0.5)); z.hp -= r; L.push(`Fulgerul sare pe ${z.n} (-${r}).` + (z.hp <= 0 ? ' ' + z.n + ' cade!' : '')); }
  }
}
/* la sfârșitul turei (spRoundEnd): refacere */
function lgRound(L) {
  let team = 0;
  S.fs.forEach(f => {
    if (f.hp <= 0) return;
    const x = lgFx(f);
    if (x.regen) {
      const before = f.hp;
      f.hp = Math.min(mhp(f), f.hp + Math.max(1, Math.round(mhp(f) * x.regen)));
      if (typeof ST_SERVER !== 'undefined' && ST_SERVER === 'beta' &&
          S.d && S.d.tron && S.d.ghost && f.hp > before)
        L.push(f.n + ' regenerează ' + (f.hp - before) + ' viață.');
    }
    team = Math.max(team, x.treg || 0);
  });
  if (team) { S.fs.forEach(f => { if (f.hp > 0) f.hp = Math.min(mhp(f), f.hp + Math.max(1, Math.round(mhp(f) * team))); }); L.push(`Crucea Izvorului vindecă echipa (+${Math.round(team * 100)}%).`); }
}

function lgHook() {
  if (typeof LG !== 'undefined') Object.assign(LG, LGX);
  if (typeof spAfter === 'function' && !spAfter.__lg) { const f = spAfter; window.spAfter = function (a, e, dm, cr, L) { f(a, e, dm, cr, L); lgAfter(a, e, dm, L); }; window.spAfter.__lg = 1; }
  if (typeof spRoundEnd === 'function' && !spRoundEnd.__lg) { const f = spRoundEnd; window.spRoundEnd = function (L) { f(L); lgRound(L); }; window.spRoundEnd.__lg = 1; }
}
if (typeof window !== 'undefined') { if (document.readyState === 'complete') lgHook(); else window.addEventListener('load', lgHook); }

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = Object.entries(LGX).map(([id, d]) => `[data-fx=${id}]{--c1:${d.c[0]};--c2:${d.c[1]}}`).join('\n')
    + `\n.lgi[src*="legendare/"]{object-fit:cover;border-radius:4px}`;
  document.head.appendChild(st);
})();
