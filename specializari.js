/* ============================================================================
   Silver Throne — specializari.js
   Mercenari pe generații, rang prin luptă și specializări.

   • Nivelul mercenarului e FIX, primit la angajare. La Han apar candidați din generația eroului:
     nivelurile 1, 5, 10, 15, 20… (SP.GEN). Statisticile de bază vin din nivelul lui, nu din al eroului.
   • Rangul (Recrut → Legendă, +15% atac și viață pe treaptă) crește prin FAIMĂ: +1 la fiecare luptă câștigată
     în care e în echipă și în viață, +3 la un căpitan sau un raid (SP.RKF = pragurile).
   • Fiecare clasă are 2 specializări cu 4 trepte: Veteran, Elită, Maestru, Legendă (eroul: nivelurile 10/20/30/40).
     Prima alegere e gratuită; schimbarea costă aur (SP.respec) și păstrează rangul.
   • Efectele se aplică în luptă prin cârligele din index.html: hit → spPre/spMul/spCrit/spCm/spDef/spAfter,
     step → spNormal/spSpecial/spCd, enemy → spTick/spEnemyHit/spRoundEnd, win → spFame, startF → spFightStart.
   • Stările de o luptă (scuturi, întăriri, „o dată pe luptă”) stau în f._x și se golesc la începutul fiecărei lupte.

   Fantomele de la Tron și din Lume nu folosesc specializări (lovesc doar normal); atacatorul le folosește.
   Toate cifrele sunt valori de pornire, de reglat cu simulatorul din dev/.
   ========================================================================== */
const SP = {
  RKF: [0, 30, 90, 220, 450],                         /* faimă cumulată: Recrut, Veteran, Elită, Maestru, Legendă */
  HERO_LV: [10, 20, 30, 40],                          /* nivelurile eroului pentru cele 4 trepte */
  GEN: L => (L < 5 ? 1 : Math.floor(L / 5) * 5),      /* generația de mercenari pentru un nivel de erou */
  lvE: L => (L <= 20 ? L : 20 + (L - 20) * 0.7),      /* aceeași curbă ca el() pentru erou */
  respec: f => 30 * Math.max(1, f.h ? S.lvl : (f.lv || 1)),
  T: {
    'Războinic': [
      { k: 'spa', n: 'Spărgător', r: 'control', u: ['Amețirea are 50% șansă', 'Și loviturile normale amețesc (15%)', 'Spargere face daune duble pe un inamic amețit', 'Amețirea ține 2 ture'] },
      { k: 'ber', n: 'Berserker', r: 'daune', u: ['Sub jumătate de viață are +40% atac', 'Se vindecă cu 20% din daunele date', 'Spargere se reîncarcă după o tură', 'O dată pe luptă, rămâne cu 1 viață în loc să cadă'] }],
    'Arcaș': [
      { k: 'van', n: 'Vânător', r: 'sângerare', u: ['Sângerarea lui face daune ×1,75', 'Sângerarea ține 5 ture', 'Săgeata lovește și un al doilea inamic', 'Inamicii care sângerează primesc +20% daune de la toată echipa'] },
      { k: 'lun', n: 'Lunetist', r: 'critic', u: ['+15% șansă de critic', 'Criticele fac ×2 în loc de ×1,5', 'Săgeata zimțată e mereu critică', 'Prima lovitură din fiecare luptă e critică și ignoră apărarea'] }],
    'Paznic': [
      { k: 'scu', n: 'Scut viu', r: 'tanc', u: ['Atrage 70% din lovituri', 'Primește cu 30% mai puține daune', 'Întoarce 40% din daunele primite', 'O dată pe luptă, primește lovitura care ar doborî un aliat'] },
      { k: 'zdr', n: 'Zdrobitor', r: 'lovituri în grup', u: ['Bubuitura face ×1,2 în loc de ×0,8', 'Bubuitura amețește fiecare inamic (20%)', 'Bubuitura scade apărarea inamicilor cu 30% pe 2 ture', 'Bubuitura se reîncarcă după o tură'] }],
    'Mag': [
      { k: 'pir', n: 'Piromant', r: 'ardere', u: ['Flacăra aprinde ținta: arde 3 ture, se adună cu sângerarea', 'Focul trece și la un alt inamic', 'Flacăra lovește toți inamicii, la ×0,55', 'Inamicii care ard au −20% atac'] },
      { k: 'arc', n: 'Arcanist', r: 'explozie', u: ['Flacăra face ×2,1', 'Loviturile normale ignoră 60% din apărare', 'Flacăra se reîncarcă după o tură', 'Dacă Flacăra ucide, se reîncarcă pe loc'] }],
    'Vraci': [
      { k: 'sf', n: 'Sfânt', r: 'vindecare de grup', u: ['Vindecarea atinge toți aliații, la 30% din putere', 'Vindecarea peste maxim devine scut pentru o tură', 'O dată pe luptă, ridică un aliat căzut cu 25% viață', 'La sfârșitul fiecărei ture, echipa își reface 2% din viață'] },
      { k: 'alc', n: 'Alchimist', r: 'întăriri', u: ['Aliatul vindecat primește +30% atac pe 2 ture', 'Loviturile normale otrăvesc 3 ture', 'Aliatul vindecat primește și +5 apărare pe 2 ture', 'Când un aliat dă o lovitură critică, îl vindecă cu 10%'] }],
    'Campion': [
      { k: 'cmd', n: 'Comandant', r: 'sprijin', u: ['Echipa are +5% atac', 'Echipa are +5% viață', 'Lovitura campionului dă echipei +15% atac pe 2 ture', 'O dată pe luptă, abilitatea reîncarcă abilitățile tuturor aliaților'] },
      { k: 'due', n: 'Duelist', r: 'daune', u: ['+30% daune contra căpitanilor', 'Criticele lui provoacă sângerare', 'Lovitura campionului face ×2,6', 'Ucide pe loc inamicii rămași sub 20% viață'] }]
  }
};

/* ------------------------------------------------------------------ AJUTOARE */
const spT = f => (!f || !SP.T[f.c] ? 0 : f.h ? SP.HERO_LV.filter(x => S.lvl >= x).length : Math.max(0, Math.min(4, f.rk || 0)));
const spOn = (f, k, t) => !!f && f.sp === k && spT(f) >= t;
const spX = f => f._x || (f._x = {});
const spTeam = (k, t) => S.fs.find(x => x.hp > 0 && spOn(x, k, t));      /* un aliat în viață cu efectul */
const spAlive = () => S.fs.filter(x => x.hp > 0);
const spNeed = f => !!(f && SP.T[f.c] && !f.sp && spT(f) >= 1);
const spTick0 = () => 2 + Math.floor(S.lvl / 2);                        /* daunele de bază ale sângerării (ca în enemy()) */
/* nivelul folosit pentru statistici: eroul și străjerii urmează eroul; mercenarii, nivelul lor */
const spL = f => (f && !f.h && Number.isFinite(f.lv) ? SP.lvE(f.lv) : el());
const spHpM = f => (S.fs.includes(f) && spTeam('cmd', 2) ? 0.05 : 0);  /* Comandant: +5% viață echipei */

/* ------------------------------------------------------------------ LOVITURA (hit) */
function spPre(a, o) { if (spOn(a, 'lun', 4) && !spX(a).first) { spX(a).first = 1; o.crit = true; o.ign = 1; } }
function spMul(a, e) {
  let m = 1; const x = spX(a);
  if (spOn(a, 'ber', 1) && a.hp < mhp(a) / 2) m *= 1.4;
  if (e.bl > 0 && spTeam('van', 4)) m *= 1.2;
  if (spTeam('cmd', 1)) m *= 1.05;
  if (x.cb > 0) m *= 1.15;
  if (x.ab > 0) m *= 1.3;
  if (e.b && spOn(a, 'due', 1)) m *= 1.3;
  return m;
}
const spCrit = a => (spOn(a, 'lun', 1) ? 15 : 0);
const spCm = a => (spOn(a, 'lun', 2) ? 2 : 1.5);
function spDef(a, e, o) { const d = e.def * (e.dd > 0 ? 0.7 : 1), ign = o.ign != null ? o.ign : (o.n && spOn(a, 'arc', 2) ? 0.6 : 0); return d * (1 - ign); }
function spAfter(a, e, dm, cr, L) {
  if (spOn(a, 'ber', 2) && a.hp > 0) { const h = Math.max(1, Math.round(dm * 0.2)); a.hp = Math.min(mhp(a), a.hp + h); }
  if (cr && e.hp > 0 && spOn(a, 'due', 2)) { e.bl = Math.max(e.bl || 0, 3); L.push(e.n + ' sângerează.'); }
  if (cr) { const v = spTeam('alc', 4); if (v) { const h = Math.round(mhp(a) * 0.1); a.hp = Math.min(mhp(a), a.hp + h); L.push(`${v.n} îl întărește pe ${a.n} (+${h}).`); } }
  if (e.hp > 0 && spOn(a, 'due', 4) && e.hp < 0.2 * (e.mh || e.hp)) { e.hp = 0; L.push(`${a.n} îl execută pe ${e.n}!`); }
}

/* ------------------------------------------------------------------ TURA ECHIPEI (step) */
function spCd(a) {
  if (spOn(a, 'ber', 3) || spOn(a, 'zdr', 4) || spOn(a, 'arc', 3)) return 1;
  return a.c === 'Vraci' ? 1 : 2;
}
function spNormal(a, e, L) {
  if (e.hp <= 0) return;
  if (spOn(a, 'spa', 2) && Math.random() < 0.15) { e.st = Math.max(e.st || 0, 1); L.push(e.n + ' e amețit.'); }
  if (spOn(a, 'alc', 2)) { e.po = Math.max(e.po || 0, 3); L.push(e.n + ' e otrăvit.'); }
}
const spOther = (e, al) => { const o = al.filter(x => x !== e && x.hp > 0); return o.length ? P(o) : null; };
function spBleed(a, e, L) { if (e.hp <= 0) return; e.bl = spOn(a, 'van', 2) ? 5 : 3; if (spOn(a, 'van', 1)) e.blm = 1.75; L.push(e.n + ' sângerează.'); }
function spBurn(e, L) { if (e.hp <= 0) return; e.bu = 3; L.push(e.n + ' arde.'); }
function spHealOne(a, t, h, L) {
  const m = mhp(t), over = t.hp + h - m; t.hp = Math.min(m, t.hp + h); L.push(`${a.n} vindecă ${t.n} (+${h}).`);
  if (over > 0 && spOn(a, 'sf', 2)) { spX(t).sh = (spX(t).sh || 0) + over; }
  if (spOn(a, 'alc', 1)) spX(t).ab = 2;
  if (spOn(a, 'alc', 3)) spX(t).dfb = 2;
}
/* abilitatea clasei, cu efectele specializării; e = ținta aleasă, al = inamicii în viață */
function spSpecial(a, e, al, L) {
  if (a.c === 'Războinic') {
    hit(a, e, spOn(a, 'spa', 3) && e.st > 0 ? 3 : 1.5, L);
    if (e.hp > 0 && Math.random() < (spOn(a, 'spa', 1) ? 0.5 : 0.35)) { e.st = spOn(a, 'spa', 4) ? 2 : 1; L.push(e.n + ' e amețit.'); }
  } else if (a.c === 'Arcaș') {
    hit(a, e, 1, L, { crit: spOn(a, 'lun', 3) }); spBleed(a, e, L);
    if (spOn(a, 'van', 3)) { const o = spOther(e, al); if (o) { hit(a, o, 1, L); spBleed(a, o, L); } }
  } else if (a.c === 'Campion') {
    hit(a, e, spOn(a, 'due', 3) ? 2.6 : 1.8, L); if (e.hp > 0) { e.bl = Math.max(e.bl || 0, 3); L.push(e.n + ' sângerează.'); }
    if (spOn(a, 'cmd', 3)) { spAlive().forEach(x => { spX(x).cb = 2; }); L.push('Echipa prinde curaj (+15% atac).'); }
    if (spOn(a, 'cmd', 4) && !spX(a).rst) { spX(a).rst = 1; S.fs.forEach(x => { if (x !== a) x.cd = 0; }); L.push('Abilitățile echipei sunt gata din nou!'); }
  } else if (a.c === 'Mag') {
    const tg = spOn(a, 'pir', 3) ? al.filter(x => x.hp > 0) : [e], m = spOn(a, 'pir', 3) ? 0.55 : spOn(a, 'arc', 1) ? 2.1 : 1.4; let kill = false;
    tg.forEach(x => { hit(a, x, m, L, { ign: 1 }); if (x.hp <= 0) kill = true; else if (spOn(a, 'pir', 1)) spBurn(x, L); });
    if (spOn(a, 'pir', 2) && spOn(a, 'pir', 1)) { const o = spOther(e, al.filter(x => !(x.bu > 0))); if (o) spBurn(o, L); }
    if (kill && spOn(a, 'arc', 4)) { a.cd = 0; L.push('Flacăra se reaprinde pe loc!'); }
  } else if (a.c === 'Vraci') {
    const base = Math.round(atkOf(a) * 2.2 * (1 + bon(a).heal / 100)), dead = S.fs.filter(x => x.hp <= 0);
    if (spOn(a, 'sf', 3) && dead.length && !spX(a).rev) { const t = dead[0]; spX(a).rev = 1; t.hp = Math.ceil(mhp(t) * 0.25); L.push(`${a.n} îl ridică pe ${t.n} din luptă!`); }
    else if (spOn(a, 'sf', 1)) spAlive().forEach(t => spHealOne(a, t, Math.round(base * 0.3), L));
    else { const t = spAlive().sort((x, y) => x.hp / mhp(x) - y.hp / mhp(y))[0]; if (t) spHealOne(a, t, base, L); }
  } else {                                                                                   /* Paznic: Bubuitură */
    const m = spOn(a, 'zdr', 1) ? 1.2 : 0.8;
    al.forEach(x => {
      hit(a, x, m, L); if (x.hp <= 0) return;
      if (spOn(a, 'zdr', 2) && Math.random() < 0.2) { x.st = Math.max(x.st || 0, 1); L.push(x.n + ' e amețit.'); }
      if (spOn(a, 'zdr', 3)) x.dd = 2;
    });
  }
}

/* ------------------------------------------------------------------ TURA INAMICILOR (enemy) */
/* arderea și otrava (sângerarea rămâne în enemy()); întoarce true dacă inamicul a căzut */
function spTick(e, L) {
  if (e.dd > 0) e.dd--;
  if (e.bu > 0) { e.hp -= spTick0(); e.bu--; if (e.hp <= 0) { L.push(e.n + ' arde până cade.'); return true; } }
  if (e.po > 0) { e.hp -= spTick0(); e.po--; if (e.hp <= 0) { L.push(e.n + ' cade otrăvit.'); return true; } }
  return false;
}
function spEnemyHit(e, al, L) {
  const pzs = al.filter(x => x.c === 'Paznic'), pz = pzs.find(x => spOn(x, 'scu', 1)) || pzs[0];
  let t = pz && Math.random() < (spOn(pz, 'scu', 1) ? 0.7 : 0.5) ? pz : P(al);
  const raw = Math.round(e.atk * R(0.8, 1.2) * (e.bu > 0 && spTeam('pir', 4) ? 0.8 : 1));
  const dmOn = u => { let d = Math.max(1, raw - bon(u).def * (1 + bon(u).pf / 100) - tr(u, 'def') - (spX(u).dfb > 0 ? 5 : 0)); if (spOn(u, 'scu', 2)) d = Math.max(1, Math.round(d * 0.7)); return d; };
  let dm = dmOn(t);
  const sh = spX(t).sh || 0; if (sh > 0) { const a = Math.min(sh, dm); spX(t).sh = sh - a; dm -= a; if (a) L.push(`Scutul lui ${t.n} oprește ${a}.`); }
  if (t.hp - dm <= 0) {
    const g = al.find(x => x !== t && spOn(x, 'scu', 4) && !spX(x).grd && x.hp > dmOn(x));
    if (g) { spX(g).grd = 1; L.push(`${g.n} se aruncă în fața lui ${t.n}!`); t = g; dm = dmOn(g); }
  }
  if (t.hp - dm <= 0 && spOn(t, 'ber', 4) && !spX(t).last) { spX(t).last = 1; dm = t.hp - 1; L.push(`${t.n} refuză să cadă!`); }
  t.hp = Math.max(0, t.hp - dm); L.push(`${e.n} lovește ${t.n} (-${dm}).` + (t.hp === 0 ? ' ' + t.n + ' cade!' : ''));
  if (dm > 0 && spOn(t, 'scu', 3) && e.hp > 0) { const r = Math.max(1, Math.round(dm * 0.4)); e.hp -= r; L.push(`${t.n} întoarce ${r}.` + (e.hp <= 0 ? ' ' + e.n + ' cade!' : '')); }
}
function spRoundEnd(L) {
  S.fs.forEach(x => { const s = x._x; if (!s) return; ['ab', 'cb', 'dfb'].forEach(k => { if (s[k] > 0) s[k]--; }); s.sh = 0; });
  const v = spTeam('sf', 4); if (v) { spAlive().forEach(x => { x.hp = Math.min(mhp(x), x.hp + Math.max(1, Math.round(mhp(x) * 0.02))); }); L.push('Echipa își trage sufletul (+2% viață).'); }
}
function spFightStart() { S.fs.forEach(x => { x._x = {}; }); }

/* ------------------------------------------------------------------ FAIMĂ ȘI RANG (win) */
function spFame(big) {
  const up = [];
  for (const f of S.fs) {
    if (f.h || f.hp <= 0 || !SP.T[f.c]) continue;
    f.fm = (f.fm || 0) + (big ? 3 : 1);
    while ((f.rk || 0) < 4 && f.fm >= SP.RKF[(f.rk || 0) + 1]) {
      const m0 = mhp(f); f.rk = (f.rk || 0) + 1; f.hp = Math.min(mhp(f), f.hp + Math.max(0, mhp(f) - m0));
      up.push(`${f.n} a devenit ${RK[f.rk]}!` + (f.rk === 1 && !f.sp ? ' Alege-i specializarea în Echipă.' : f.sp ? ` Deblochează: ${spU(f, f.rk)}.` : ''));
    }
  }
  return up.join(' ');
}
const spU = (f, t) => { const s = spDef0(f); return s ? s.u[t - 1].charAt(0).toLowerCase() + s.u[t - 1].slice(1) : ''; };
const spDef0 = f => (SP.T[f.c] || []).find(s => s.k === f.sp);

/* ------------------------------------------------------------------ ANGAJARE */
/* candidat: din generația eroului (uneori din cea anterioară, mai ieftin), aproape mereu Recrut */
function spCand(c) {
  const g = SP.GEN(S.lvl), prev = g > 1 && Math.random() < 0.3 ? SP.GEN(g - 1) : g;
  c.lv = prev; c.rk = S.lvl >= 10 && Math.random() < 0.12 ? 1 : 0;
  c.p = Math.round((25 + 12 * c.lv * c.t.length) * (1 + 0.6 * c.rk));
  return c;
}
const spNew = (c, rk) => ({ n: c.n, c: c.c, hp: 0, sc: 0, t: c.t, rk, lv: c.lv || SP.GEN(S.lvl), fm: SP.RKF[rk] || 0 });

/* ------------------------------------------------------------------ SALVĂRI VECHI */
/* mercenarii de dinainte primesc ca nivel propriu nivelul de acum al eroului (statisticile nu se schimbă) și faima rangului lor */
function spNorm() {
  if (!S) return;
  const fix = f => {
    if (!f || f.h || !SP.T[f.c]) return;
    if (!Number.isFinite(f.lv)) f.lv = S.lvl;
    f.rk = Math.max(0, Math.min(4, f.rk || 0));
    if (!Number.isFinite(f.fm)) f.fm = SP.RKF[f.rk];
    if (f.sp && !spDef0(f)) delete f.sp;
  };
  [...(S.fs || []), ...(S.rs || [])].forEach(fix);
  const h = (S.fs || []).find(f => f.h); if (h && h.sp && !spDef0(h)) delete h.sp;
  if (S.pool && Array.isArray(S.pool.c)) S.pool.c.forEach(c => { if (!Number.isFinite(c.lv)) spCand(c); });
}

/* ------------------------------------------------------------------ ALEGERE ȘI SCHIMBARE */
function spPick(k) {
  const f = cur(), s = (SP.T[f.c] || []).find(x => x.k === k);
  if (!s || f.sp === k) return;
  if (S.d) { S.msg = 'Nu poți schimba specializarea în timpul unei lupte.'; return go(); }
  if (spT(f) < 1) { S.msg = f.h ? 'Eroul își alege specializarea la nivelul 10.' : `${f.n} își alege specializarea la rangul Veteran.`; return go(); }
  if (f.sp) {
    const c = SP.respec(f), q = `Îl faci pe ${f.n} ${s.n}? Costă ${c} aur. Rangul rămâne.`;
    if (S.gold < c) { S.msg = `Îți trebuie ${c} aur ca să schimbi specializarea.`; return go(); }
    if (typeof confirm === 'function' && !confirm(q)) return;
    S.gold -= c;
  }
  f.sp = k; S.msg = `${f.n} e acum ${s.n}.`; go();
}

/* ------------------------------------------------------------------ PANOUL DIN ECHIPĂ */
/* scurt: rangul și faima, treptele deblocate; lista completă (și schimbarea) se deschide la cerere */
let spOpen = false;
function spPanel(f) {
  const ss = SP.T[f.c]; if (!ss) return '';
  const t = spT(f), lbl = i => (f.h ? 'nivel ' + SP.HERO_LV[i] : RK[i + 1]), mine = spDef0(f);
  let h = '<div class="sp-box">';
  if (!f.h) {
    const rk = f.rk || 0, nx = rk < 4 ? SP.RKF[rk + 1] : null, p0 = SP.RKF[rk], p = nx ? Math.max(0, Math.min(100, ((f.fm || 0) - p0) / (nx - p0) * 100)) : 100;
    h += `<div class="sp-fm" title="+1 faimă la fiecare luptă câștigată în care e în echipă și în viață, +3 la căpitani și raiduri"><span><b>${RK[rk]}</b> · ${nx ? `faimă ${f.fm || 0}/${nx} până la ${RK[rk + 1]}` : 'rang maxim'}</span><i class="xpb"><i style="width:${p}%"></i></i></div>`;
  }
  const card = (s, own) => `<div class="sp-c${own ? ' on' : ''}"><div class="sp-h"><b>${s.n}</b><span class="mute">${s.r}</span></div><ol>${s.u.map((u, i) => `<li class="${own && t > i ? 'ok' : ''}"><span class="sp-r">${lbl(i)}</span>${u}</li>`).join('')}</ol>`
    + (own ? '' : t >= 1 ? `<button class="${f.sp ? '' : 'p'}" onclick="spPick('${s.k}')">${f.sp ? `Schimbă · ${SP.respec(f)} aur` : `Alege ${s.n}`}</button>` : '') + '</div>';
  if (mine) {
    const on = mine.u.slice(0, t), nx = t < 4 ? mine.u[t] : null;
    h += `<div class="sp-cur"><b>${mine.n}</b> <span class="mute">${mine.r}</span></div><ul class="sp-on">${on.map(u => `<li>${u}</li>`).join('')}</ul>${nx ? `<div class="sp-nx mute">La ${lbl(t)}: ${nx.charAt(0).toLowerCase() + nx.slice(1)}</div>` : ''}`;
  } else if (t >= 1) {
    h += `<div class="sp-ask">Alege o specializare (prima e gratuită):</div><div class="sp-pick">${ss.map(s => `<button class="p" onclick="spPick('${s.k}')"><b>${s.n}</b><small>${s.u[0]}</small></button>`).join('')}</div>`;
  } else {
    h += `<div class="sp-nx mute">${f.h ? 'Eroul își alege specializarea la nivelul 10.' : 'Specializarea se alege la rangul Veteran.'}</div>`;
  }
  h += `<details class="sp-all"${spOpen ? ' open' : ''} ontoggle="spOpen=this.open"><summary>${mine ? 'Toate treptele · schimbă specializarea' : 'Vezi ce face fiecare specializare'}</summary><div class="sp-two">${(mine ? [mine, ...ss.filter(s => s !== mine)] : ss).map(s => card(s, s === mine)).join('')}</div></details>`;
  return h + '</div>';
}
const spNeedN = () => [...S.fs, ...(S.rs || [])].filter(spNeed).length;

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `
.sp-box{margin-top:10px;padding-top:8px;border-top:1px solid var(--line);font-size:14px;text-align:left}
.sp-fm{display:block;margin:0 0 8px}.sp-fm>span{display:block;margin-bottom:3px}
.sp-cur b{font:700 15px Cinzel,serif;color:var(--gold2)}
.sp-on{list-style:none;margin:4px 0 0;padding:0}.sp-on li{padding:2px 0 2px 18px;position:relative;line-height:1.35}.sp-on li::before{content:'✔';position:absolute;left:0;color:#7fd88c}
.sp-nx{margin-top:4px;line-height:1.35}
.sp-ask{color:var(--gold2);margin:2px 0 6px}
.sp-pick{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.sp-pick button{display:flex;flex-direction:column;align-items:flex-start;text-align:left;gap:2px;padding:6px 8px}
.sp-pick b{font:700 14px Cinzel,serif}.sp-pick small{font-size:12px;font-weight:400;line-height:1.3}
.sp-all{margin-top:8px}
.sp-all summary{cursor:pointer;color:var(--gold2);font-size:13px;text-decoration:underline;text-underline-offset:3px;list-style:none}
.sp-all summary::-webkit-details-marker{display:none}
.sp-all summary::before{content:'▸ ';text-decoration:none;display:inline-block;margin-right:4px}
.sp-all[open] summary::before{content:'▾ '}
.sp-two{display:grid;grid-template-columns:1fr;gap:6px;margin-top:6px}
.sp-c{padding:6px 8px;background:linear-gradient(180deg,#171e21,#11171a);border:1px solid var(--line);border-radius:4px}
.sp-c.on{border-color:var(--gold);box-shadow:inset 3px 0 var(--gold)}
.sp-h{display:flex;justify-content:space-between;gap:6px;align-items:baseline}.sp-h b{font:700 14px Cinzel,serif;color:var(--ink)}.sp-h span{font-size:12px}
.sp-c ol{list-style:none;margin:4px 0;padding:0}
.sp-c li{font-size:13px;line-height:1.3;padding:3px 0;color:var(--mute);border-top:1px solid #ffffff0d}
.sp-c li.ok{color:var(--ink)}.sp-c li.ok .sp-r{color:#7fd88c}.sp-c li.ok .sp-r::before{content:'✔ '}
.sp-r{display:block;font-size:11px;color:var(--gold);letter-spacing:.03em}
.sp-c button{width:100%;margin-top:4px;font-size:13px;padding:5px 8px}
`;
  document.head.appendChild(st);
})();
