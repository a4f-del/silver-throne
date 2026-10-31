/* ============================================================================
   Silver Throne — teritorii.js
   Extinderea: sate cuceribile, tabere de bandiți, locuri de interes cu alegeri,
   Bastionul Corbilor, campania Tronului Cenușiu, satul cu progres vizual,
   pregătirea Premium (doar aspect și confort).

   Se încarcă ÎNAINTEA scriptului principal. Funcțiile folosesc starea S și
   helperii jocului (RI, P, mkItem, bar, spend, stash, have, take, ...) doar la
   apelare, după ce scriptul principal le-a definit.
   Datele și formulele pure sunt în world-data.js (ST_W).
   ========================================================================== */
const TW = ST_W, TP = TW.P;
const DEV = () => !TW.CFG.prod || /[?&]dev=1/.test((typeof location !== 'undefined' && location.search) || '');
const tEsc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const tDur = ms => { const m = Math.max(0, Math.ceil(ms / 60000)); return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min'; };
const tLvl = v => Math.max(1, S.lvl + v.dl);
const MXP = () => MAXP0 + terB('pts');

/* ----------------------------------------------------- ÎNTOARCERE DUPĂ LUPTĂ ----
   Luptele pornite de pe hartă (raid, cucerire, tabără, fortăreață, Tron) se afișează în fila Coborâre. terFrom() reține
   de unde a pornit lupta, iar go() te readuce acolo când lupta s-a încheiat (ieșire cu prada, înfrângere sau fugă).
   Botul (S.ib) nu schimbă navigarea. */
function terFrom() { if (!S.ib && (S.tab === 'm' || S.tab === 'r')) S.rt = { t: S.tab, mt: S.mt || 'h' }; }
function terBack() { if (!S.rt) return; if (!S.d) { if (S.tab === 'c') { S.tab = S.rt.t; if (S.rt.t === 'm') S.mt = S.rt.mt; } S.rt = null; } }

/* ------------------------------------------------------------------ STARE ---- */
function terKey() { return S.map.vs.map(v => v.x + ',' + v.y).join('|'); }
function terInit() {
  if (typeof S === 'undefined' || !S || !S.fs) return;
  const m = MPV();
  const t = (S.ter && typeof S.ter === 'object') ? S.ter : (S.ter = {});
  t.v = 2; t.hist = t.hist || {}; t.dsc = t.dsc || {}; t.cl = t.cl || {}; t.rw = t.rw || {}; t.poiT = t.poiT || {}; t.cdn = t.cdn || {};
  t.st = t.st || {}; ['raid', 'conq', 'camp', 'recon', 'poi'].forEach(k => { t.st[k] = +t.st[k] || 0; });
  t.fog = Array.isArray(t.fog) ? t.fog : []; t.camps = Array.isArray(t.camps) ? t.camps : []; t.buf = Array.isArray(t.buf) ? t.buf : []; t.lg = Array.isArray(t.lg) ? t.lg : [];
  t.debt = +t.debt || 0; t.upT = +t.upT || 0; t.ll = +t.ll || 0; t.cslot = +t.cslot || 0;
  if (!t.poi || !t.fort) {
    const L = TW.layout(terKey(), m.vs);
    t.fort = Object.assign({ x: L.fort.x, y: L.fort.y, o: 'n', cq: 0, sg: 0, lost: 0 }, t.fort || {});
    t.poi = (t.poi || L.poi).map(p => Object.assign({ cd: 0, dep: [] }, p));
  }
  if (!t.fog.length) terRev(TW.CAP[0], TW.CAP[1], 1);
  m.vs.forEach(v => { if (v.o !== 'p') v.o = 'n'; v.g = Math.max(0, Math.min(TP.gar.max, Math.floor(+v.g || 0))); });
  t.fort.g = Math.max(0, Math.min(TP.gar.max, Math.floor(+t.fort.g || 0)));
  const c = (S.camp && typeof S.camp === 'object') ? S.camp : (S.camp = {});
  c.ch = c.ch || 0; c.bk = c.bk || {}; c.rw = c.rw || {}; c.sec = c.sec || {};
  if (!Array.isArray(S.pre)) S.pre = [];
  if (!S.cos || typeof S.cos !== 'object') S.cos = { vt: 'clasic' };
  S.cos.flag = TW.FLAGS.some(f => f.id === S.cos.flag) ? S.cos.flag : 'aur'; S.cos.own = (S.cos.own && typeof S.cos.own === 'object') ? S.cos.own : {}; S.cos.own.aur = 1;
  S.ren = Object.assign({ f: 0, i: 0, b: 0, d: 0, z: 0 }, (S.ren && typeof S.ren === 'object') ? S.ren : {});
  for (const k in S.ren) S.ren[k] = Math.max(0, Math.min(TP.ren.max, Math.floor(+S.ren[k] || 0)));
  const mk = (S.mkt && typeof S.mkt === 'object') ? S.mkt : (S.mkt = {});
  mk.day = mk.day || ''; mk.bought = (mk.bought && typeof mk.bought === 'object') ? mk.bought : {}; mk.rr = Math.max(0, +mk.rr || 0); mk.lux = Array.isArray(mk.lux) ? mk.lux : []; mk.gen = mk.gen || '';
  if (S.ex && !TW.EX[S.ex.t]) S.ex = null;
  if (typeof tronInit === 'function') tronInit();
}
function terNorm() { terInit(); }
function terTick() { if (!S || !S.fs) return; terInit(); terUpkeep(); terCamps(); const n = Date.now(); S.ter.buf = S.ter.buf.filter(b => b.exp > n); }
function terLog(m) { const l = S.ter.lg; l.unshift(m); l.length = Math.min(l.length, ENT.has('cosm') ? 30 : 8); }

/* Bonusuri active = doar teritoriile în stăpânire ȘI întreținute (fără datorie). */
function terAct() {
  const t = (typeof S !== 'undefined') && S && S.ter; if (!t || !S.map || t.debt > 0) return [];
  const a = []; for (const v of S.map.vs) if (v.o === 'p') { const i = TW.vil(v.id); if (i) a.push({ tip: i.tip, tier: i.tier, m: 1 + TP.gar.bonusK * (v.g || 0) }); }
  if (t.fort && t.fort.o === 'p') a.push({ tip: TW.FORT.bonus, tier: 1 });
  return a;
}
function terB(k) { if (typeof S === 'undefined' || !S || !S.ter) return 0; return TW.bonusOf(k, terAct()); }
function terOwnedV() { return S.map.vs.filter(v => v.o === 'p'); }
function terDaily() {
  let s = 0; terOwnedV().forEach(v => { s += TW.upk(tLvl(v), TW.vil(v.id).tier, TP, v.g); });
  if (S.ter.fort.o === 'p') s += Math.round(TW.upk(S.lvl, 3, TP, S.ter.fort.g) * TP.fort.upkMul);
  return s;
}
function terUpkeep() {
  const t = S.ter, now = Date.now(), d = terDaily();
  if (!d) { t.upT = 0; return; }
  if (!t.upT) t.upT = now;
  const days = Math.floor((now - t.upT) / 864e5);
  if (days > 0) { t.debt = Math.min(t.debt + Math.min(days, TP.upkeep.maxDays) * d, TP.upkeep.maxDays * d); t.upT += days * 864e5; }
  if (t.debt > 0 && S.gold >= t.debt) { terLog('Întreținere plătită: -' + t.debt + ' aur.'); S.gold -= t.debt; t.debt = 0; }
}
function terPay() { const t = S.ter; if (t.debt > 0) { if (S.gold >= t.debt) { S.gold -= t.debt; terLog('Întreținere plătită: -' + t.debt + ' aur.'); t.debt = 0; S.msg = 'Întreținerea a fost plătită. Bonusurile sunt din nou active.'; } else S.msg = 'Îți trebuie ' + t.debt + ' aur.'; } go(); }
function terXp(n) { S.xp += n; let up = 0; while (S.xp >= need(S.lvl)) { S.xp -= need(S.lvl); S.lvl++; up++; S.pts = MXP(); S.ptsT = Date.now(); } return up; }
const trvD = d => Math.max(1, 1 + d - (d >= 3 ? terB('trav') : 0));
const trv = v => trvD(dst(v));
const trvC = (x, y) => trvD(TW.cheb(x, y));

/* ------------------------------------------------------- EFECTE ÎN LUPTĂ ---- */
function tBuf(b) { const n = Date.now(); for (const x of S.ter.buf) if (x.exp > n && b[x.k] !== undefined) b[x.k] += x.v; }
function terEm(es, d) {
  const em = d.em; if (!em) return;
  if (d.ghost) { tronGhostUnits(es, d); return; }                         /* Tronul: inamicii sunt fantoma deținătorului */
  if (d.ks) { const f = d.ks[Math.min(d.room - 1, d.ks.length - 1)] / (d.k || 1); if (f !== 1) es.forEach(e => { e.atk = Math.max(1, Math.round(e.atk * f)); e.mh = e.hp = Math.max(1, Math.round(e.hp * f)); e.def = Math.floor(e.def * Math.sqrt(f)); }); }
  es.forEach(e => {
    if (em.hm) e.mh = e.hp = Math.max(1, Math.round(e.hp * em.hm)); if (em.am) e.atk = Math.max(1, Math.round(e.atk * em.am)); if (em.dm) e.def = Math.floor(e.def * em.dm);
    if (!e.b && em.nm && em.nm.length) e.n = em.nm[RI(0, em.nm.length - 1)];
    e.dm = em.dr && em.dr.length ? em.dr[RI(0, em.dr.length - 1)] : undefined;
  });
}
const terXn = d => d.xs ? (d.xs[d.room - 1] || 0) : (d.xn || 0);

/* ------------------------------------------------------ RECOMPENSE COMUNE ---- */
function terRelic(lv) {
  const w = [0, 70, 20, 8, 2]; let x = Math.random() * 100, q = 0; for (; q < w.length - 1 && x >= w[q]; q++) x -= w[q];
  const ks = ['pd', 'ph', 'heal', 'pf'].sort(() => Math.random() - .5).slice(0, 2), s = {}, v = Math.round((3 + lv * .18) * (1 + .1 * q)); ks.forEach(k => s[k] = v);
  return { t: 'r', l: lv, r: 3, q, name: P(['Pecetea Corbului', 'Colții Haitei', 'Lacrima Izvorului', 'Cenușa Veche', 'Inelul Străjerului', 'Ochiul Cenușii']), s, m: [] };
}
function terMerc(extraRank) {
  const c = cand(), f = spNew(c, Math.min(4, (c.rk || 0) + (extraRank || 1))); f.hp = mhp(f);
  if (S.fs.length + S.rs.length >= 8) { const g = Math.round(rp(c) * .8); S.gold += g; return 'Barăcile sunt pline: ' + f.n + ' a plecat și ți-a lăsat ' + g + ' aur.'; }
  (S.fs.length < 3 && !S.d ? S.fs : S.rs).push(f); return f.n + ' (' + RK[f.rk] + ' ' + f.c + ') s-a alăturat.';
}
function terMatBonus(m) {
  const b = terB('mat') / 100; if (!b || !m) return 0; let n = 0;
  for (const k of TW.AFM) if (m[k]) { const x = m[k] * b, e = Math.floor(x) + (Math.random() < x % 1 ? 1 : 0); if (e) { m[k] += e; n += e; } }
  return n;
}
function terGrant(r, lvl) {
  const g = TW.chRw(r, lvl), out = []; S.gold += g.g; if (g.g) out.push('+' + g.g + ' aur'); S.ore += g.o; if (g.o) out.push('+' + g.o + ' minereu');
  if (g.x) { const up = terXp(g.x); out.push('+' + g.x + ' exp' + (up ? ' (nivel nou!)' : '')); }
  if (r.mat) { const m = {}; for (let i = 0; i < r.mat; i++) { const k = TW.pickMat(Math.random, lvl); m[k] = (m[k] || 0) + 1; } const l = stash({ ore: 0, m }); out.push(r.mat + ' materiale' + (l ? ' (' + l + ' pierdute: depozit plin)' : '')); }
  if (r.cr) { stash({ ore: 0, m: { [r.cr[0]]: r.cr[1] } }); out.push(r.cr[1] + ' × ' + mn(r.cr[0])); }
  if (r.item) { const it = mkItem(P(['w', 'a', 'h', 'b']), lvl, RI(r.item[0], r.item[1])); S.inv.push(it); out.push('obiect: ' + it.name); }
  if (r.relic) { const it = terRelic(Math.max(8, lvl)); S.inv.push(it); out.push('relicvă: ' + it.name); }
  if (r.legend) { const it = mkLegendary(r.legend, lvl); if (it) { S.inv.push(it); out.push('obiect legendar: ' + it.name); } }
  return out.join(', ');
}

/* --------------------------------------------------------------- HARTĂ/FOG --- */
const terCell = (x, y) => S.ter.fog.includes(x + ',' + y);
const terAdj = (x, y) => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if ((i || j) && terCell(x + i, y + j)) return true; return false; };
function terRev(x, y, r) {
  const t = S.ter, out = [];
  for (let i = x - r; i <= x + r; i++) for (let j = y - r; j <= y + r; j++) { if (i < 0 || j < 0 || i >= TW.GW || j >= TW.GH) continue; const k = i + ',' + j; if (!t.fog.includes(k)) { t.fog.push(k); out.push([i, j]); } }
  return out;
}
function terDisc(cells) {
  const t = S.ter; let g = 0, x = 0; const n = [];
  cells.forEach(([i, j]) => {
    const p = t.poi.find(q => q.x === i && q.y === j);
    if (p && !t.dsc[p.id]) { t.dsc[p.id] = 1; g += TP.explore.first.gold * S.lvl; x += TP.explore.first.xp * S.lvl; n.push(TW.poiT(p.t).nm); }
    if (t.fort.x === i && t.fort.y === j && !t.dsc.fort) { t.dsc.fort = 1; g += TP.explore.first.gold * S.lvl * 2; x += TP.explore.first.xp * S.lvl * 2; n.push(TW.FORT.nm); }
  });
  if (!n.length) return ''; S.gold += g; terXp(x); return 'Ai descoperit: ' + n.join(', ') + ' (+' + g + ' aur, +' + x + ' exp, o singură dată).';
}
function explore(x, y) {
  terInit();
  if (S.d) S.msg = 'Ești într-o coborâre.';
  else if (terCell(x, y)) S.msg = 'Zona e deja explorată.';
  else if (!terAdj(x, y)) S.msg = 'Drumul până acolo e necunoscut: explorează mai întâi zonele vecine.';
  else if (S.pts < TP.explore.cost) S.msg = 'Îți trebuie ' + TP.explore.cost + ' punct.';
  else { spend(TP.explore.cost); const c = terRev(x, y, TP.explore.radius); S.msg = 'Iscoadele au explorat zona (' + c.length + ' zone noi). ' + terDisc(c); }
  go();
}
function terSel(k, a, b) { S.msel = { k, a, b }; S.mv = null; S.msg = ''; go(); }

/* ---------------------------------------------------------------- TABERE ----- */
function terTaken() {
  const t = S.ter, s = new Set([TW.cellKey(TW.CAP[0], TW.CAP[1])]); S.map.vs.forEach(v => s.add(TW.cellKey(v.x, v.y)));
  t.poi.forEach(p => s.add(TW.cellKey(p.x, p.y))); s.add(TW.cellKey(t.fort.x, t.fort.y)); t.camps.forEach(c => s.add(TW.cellKey(c.x, c.y))); return s;
}
function terCamps() {
  const t = S.ter, now = Date.now(), sh = TP.camp.slotH * 3600000, cur = Math.floor(now / sh), back = Math.ceil(12 * 3600000 / sh);
  for (let s = Math.max(t.cslot + 1, cur - back); s <= cur; s++) {
    if (t.camps.some(c => c.sl === s)) continue;
    TW.campsForSlot(terKey(), s, S.lvl, terTaken(), TP).forEach(c => { if (c.exp > now && !t.cdn[c.id]) t.camps.push(c); });
  }
  t.cslot = Math.max(t.cslot, cur);
  t.camps = t.camps.filter(c => c.exp > now && !t.cdn[c.id]).sort((a, b) => a.exp - b.exp).slice(-TP.camp.max);
  const ids = Object.keys(t.cdn); if (ids.length > 60) ids.slice(0, ids.length - 60).forEach(k => delete t.cdn[k]);
}
function campK(c) { const T = TW.camp(c.t); return TW.kb(S.lvl) * T.km; }
function campCost(c) { const T = TW.camp(c.t); return trvC(c.x, c.y) + T.fights - 1; }
function campGo(id) {
  terInit(); const c = S.ter.camps.find(x => x.id === id), T = c && TW.camp(c.t);
  if (!c || c.exp <= Date.now()) { S.msg = 'Tabăra a plecat.'; return go(); }
  if (S.d) { S.msg = 'Ești deja într-o coborâre.'; return go(); }
  if (!S.fs.some(f => f.hp > 0)) { S.msg = 'Toți luptătorii sunt căzuți. Du-te la infirmerie.'; return go(); }
  if (c.att >= TP.camp.retries) { S.msg = 'Ai încercat deja de ' + TP.camp.retries + ' ori. Tabăra s-a întărit și nu mai poate fi atacată.'; return go(); }
  const cost = trvC(c.x, c.y) + 0; if (S.pts < campCost(c)) { S.msg = 'Îți trebuie ' + campCost(c) + ' puncte (drum, lupte și căpitan).'; return go(); }
  cn('r'); spend(cost); c.att++;
  const k = campK(c);
  S.d = { room: 1, rooms: T.fights, k, rw: TP.camp.rw, bn: T.bn, di: 0, raid: -1, rn: T.nm, lbl: 'Tabără', camp: c.id, rf: 1, fx: 1, xn: T.xn, loot: { gold: 0, ore: 0, xp: 0, m: {} }, f: null, done: false,
    em: { nm: T.en, dr: T.drops, hm: T.hm, am: T.am, dm: T.dm } };
  startF(false); terFrom(); S.tab = 'c'; S.msg = 'Ai ajuns la ' + T.nm + '.';
  if (S.auto !== false) { autoRun(); return; } go();
}
/* recompensa la căderea căpitanului: deterministă după seed-ul taberei */
function terCampWin(d) {
  const t = S.ter, c = t.camps.find(x => x.id === d.camp), T = c && TW.camp(c.t); if (!c) return;
  const rng = TW.prng(c.sd), lv = c.lv, r = T.rw, L = d.loot, out = [];
  const g = Math.round(TW.rawGold(lv) * r.g), o = Math.round(TW.rawOre(lv) * r.o), x = Math.round(TW.rawXp(lv) * r.x);
  L.gold += g; L.ore += o; L.xp += x; out.push('+' + g + ' aur');
  for (let i = 0; i < (r.mats || 0); i++) lm(TW.pickMat(rng, lv), 1);
  (r.cr || []).forEach(([k, n, p]) => { if (rng() < p) { lm(k, n); out.push(n + ' × ' + mn(k)); } });
  if (r.item) { const it = mkItem(P(['w', 'a', 'h', 'b']), Math.max(1, lv), RI(r.item[0], r.item[1])); (L.it || (L.it = [])).push(it); out.push('obiect: ' + it.name); }
  if (r.relic) { const it = terRelic(Math.max(8, lv)); (L.it || (L.it = [])).push(it); out.push('relicvă: ' + it.name); }
  if (r.merc) L.merc = 1;
  t.cdn[c.id] = 1; t.camps = t.camps.filter(z => z.id !== c.id); t.st.camp++;
  d.cm = T.nm + ' a căzut: ' + out.join(', ') + '.';
}

/* ------------------------------------------------------------ CUCERIREA SATELOR */
function vInfoT(v) { return TW.vil(v.id) || { tip: 'gold', tier: 1, nm: v.n, d: '', def: [] }; }
function terConqCheck(v) {
  const I = vInfoT(v), re = (v.lost || 0) > 0, fee = TW.conqFee(tLvl(v), I.tier, re), pts = trv(v) + 1, sc = v.sc && Date.now() - v.sc < 18e5, rw = v.rw || 0;
  const a = [
    { ok: re || rw >= TP.conq.raids, t: re ? 'Cunoști deja apărarea (recucerire)' : 'Raiduri reușite pe acest sat: ' + Math.min(rw, TP.conq.raids) + '/' + TP.conq.raids },
    { ok: !!sc, t: 'Iscodire recentă (cunoști apărătorii)' },
    { ok: S.gold >= fee, t: 'Taxă de garnizoană: ' + fee + ' aur' },
    { ok: S.pts >= pts, t: 'Puncte: ' + pts },
    { ok: S.fs.some(f => f.hp > 0) && !S.d, t: 'Echipă în stare de luptă, fără coborâre activă' }
  ];
  return { a, ok: a.every(x => x.ok), fee, pts, re, I };
}
function conq(id) {
  terInit(); const v = MPV().vs.find(x => x.id === id), c = v && terConqCheck(v);
  if (!v || v.o === 'p') { S.msg = 'Satul îți aparține deja.'; return go(); }
  if (!c.ok) { S.msg = 'Condițiile de cucerire nu sunt îndeplinite.'; return go(); }
  cn('r'); spend(c.pts); S.gold -= c.fee;
  const I = c.I, k = Math.max(vk(v), TW.kb(S.lvl)) * TP.conq.ck[I.tier - 1] * (c.re ? TP.conq.reK : 1);
  v.t = Date.now(); v.gd = Math.min(5, (v.gd || 0) + 1);
  S.d = { room: 1, rooms: 2, k, rw: TP.conq.rw, bn: 'Stăpânul ' + v.b, di: 0, raid: v.id, rn: v.n, lbl: 'Cucerire', conq: 1, rf: 1, fx: 1, xn: TP.conq.xn[I.tier - 1], loot: { gold: 0, ore: 0, xp: 0, m: {} }, f: null, done: false, em: { nm: I.def, hm: 1, am: 1, dm: 1 } };
  startF(false); terFrom(); S.tab = 'c'; S.msg = 'Asediezi ' + v.n + '. Apărătorii nu se predau ușor.';
  if (S.auto !== false) { autoRun(); return; } go();
}
function terConqWin(d) {
  const t = S.ter, v = MPV().vs.find(x => x.id === d.raid), I = vInfoT(v), vl = tLvl(v), re = (v.lost || 0) > 0, L = d.loot, now = Date.now(), out = [];
  const g = Math.round(TW.rawGold(vl) * TP.conq.reLoot * v.r), x = Math.round(TW.rawXp(vl) * TP.conq.reLoot);
  L.gold += g; L.xp += x;
  if (!t.hist[v.id]) { const fg = Math.round(TW.rawGold(vl) * TP.conq.first.gold), fx = Math.round(TW.rawXp(vl) * TP.conq.first.xp); L.gold += fg; L.xp += fx; out.push('prima cucerire: +' + fg + ' aur, +' + fx + ' exp'); }
  v.o = 'p'; v.cq = now; v.sg = now + TP.conq.immuneH * 3600000; v.lost = 0; t.hist[v.id] = (t.hist[v.id] || 0) + 1; t.st.conq++; if (re) t.st.recon++;
  if (!t.upT) t.upT = now;
  out.unshift(v.n + ' e al tău. ' + TW.TIPN[I.tip] + ': ' + (I.tip === 'pts' ? '+' + TW.bVal(I.tip, I.tier) : (I.tip === 'bld' || I.tip === 'forge' ? '-' : '+') + TW.bVal(I.tip, I.tier) + '%') + ' (de bază)');
  terLog(v.n + (re ? ' a fost recucerit.' : ' a fost cucerit.')); d.cm = out.join('; ') + '.';
}
function terVilBtns(sv) {
  if (sv.o === 'p') return '<span class="mute">Satul tău</span>';
  const c = terConqCheck(sv);
  return `<button class="p" onclick="raid(${sv.id})">Jefuiește (${trv(sv)}+1 p)</button> <button onclick="conq(${sv.id})"${c.ok ? '' : ' disabled'} title="${c.ok ? '' : 'Condiții neîndeplinite'}">${c.re ? 'Recucerește' : 'Cucerește'}</button>`;
}
function terBTxt(tip, tier) { const v = TW.bVal(tip, tier); return tip === 'pts' ? '+' + v + ' puncte maxime' : tip === 'trav' ? '-1 punct la drumuri lungi' : (tip === 'bld' || tip === 'forge' ? '-' : '+') + v + '% ' + TW.TIPN[tip]; }
function terVilInfo(sv) {
  const I = vInfoT(sv), c = terConqCheck(sv), t = S.ter, now = Date.now();
  let h = `<div class="row"><span><b>${I.nm}</b> · treapta ${['mică', 'mijlocie', 'mare'][I.tier - 1]}<br><span class="mute">${I.d}</span></span></div>`;
  h += `<div class="row"><span>Bonus la stăpânire: <b>${terBTxt(I.tip, I.tier)}</b><br><span class="mute">${TW.TIPD[I.tip]}</span></span></div>`;
  if (sv.o === 'p') {
    const act = !t.debt, up = TW.upk(tLvl(sv), I.tier, TP, sv.g);
    h += `<div class="row"><span>Stare: <b style="color:var(--gold2)">în stăpânirea ta</b>${sv.sg > now ? ' · protejat încă ' + tDur(sv.sg - now) : ''}<br><span class="mute">Întreținere ${up} aur/zi. Bonus ${act ? 'activ' : '<b class="r4">suspendat (datorie de întreținere)</b>'}.</span></span></div>` + garRow('v', sv) + abRow('v', sv.id);
  } else {
    h += `<div class="row"><span>Stare: ${(sv.lost || 0) > 0 ? '<b class="r4">pierdut, poate fi recucerit mai ieftin</b>' : 'controlat de ' + sv.b + ' (NPC)'}</span></div>`;
    h += `<div class="mute" style="margin:4px 0">Condiții de ${c.re ? 'recucerire' : 'cucerire'} (3 lupte, apărători mai puternici decât la raid):</div>` + c.a.map(x => `<div class="${x.ok ? 'r2' : 'r4'}" style="font-size:15px">${x.ok ? '✔' : '✖'} ${x.t}</div>`).join('');
    h += `<div class="mute">Întreținere după cucerire: ${TW.upk(tLvl(sv), I.tier)} aur/zi.</div>`;
  }
  return h;
}

/* ---------------------------------------------------------- PIERDERE / RECUCERIRE */
function terSeize(att) {
  const t = S.ter, now = Date.now(); if (now - t.ll < TP.seize.cdH * 3600000) return '';
  const c = terOwnedV().filter(v => (v.sg || 0) < now).map(v => ({ v, w: 1 })); if (t.fort.o === 'p' && (t.fort.sg || 0) < now) c.push({ f: 1, w: TP.seize.fortMul });
  if (!c.length) return '';
  c.forEach(q => { q.w *= 1 - TP.gar.seizeRelief * ((q.f ? t.fort.g : q.v.g) || 0); });
  const wl = 60 * (1 - Math.pow(.92, BL().z)), p = TP.seize.p * (1 - Math.min(.6, wl / 100 * TP.seize.wallRelief * 2));
  let x = Math.random() * c.reduce((s, q) => s + q.w, 0), pick = c[0]; for (const q of c) { x -= q.w; if (x <= 0) { pick = q; break; } }
  /* garnizoana reduce și șansa de reușită a ocupării teritoriului ales (nu doar alegerea lui) */
  if (Math.random() >= p * (1 - TP.gar.seizeRelief * ((pick.f ? t.fort.g : pick.v.g) || 0))) return '';
  t.ll = now;
  if (pick.f) { t.fort.o = 'n'; t.fort.lost = 1; t.fort.sg = 0; t.fort.g = Math.max(0, (t.fort.g || 0) - TP.gar.loseOnSeize); terLog(TW.FORT.nm + ' a fost ocupat de ' + att.b + '.'); return ' ' + TW.FORT.nm + ' a căzut în mâinile lor! Îl poți recuceri cu o taxă redusă.'; }
  pick.v.o = 'n'; pick.v.lost = now; pick.v.sg = 0; pick.v.g = Math.max(0, (pick.v.g || 0) - TP.gar.loseOnSeize); pick.v.gd = Math.min(5, (pick.v.gd || 0) + 2); terLog(pick.v.n + ' a fost ocupat de ' + att.b + '.');
  return ' ' + pick.v.n + ' a fost ocupat! Poți să-l recucerești mai ieftin, fără să repeți cerința de raiduri.';
}

/* ------------------------------------------------------------- LOCURI DE INTERES */
function poiCost(p) { const T = TW.poiT(p.t), d = TW.cheb(p.x, p.y); return Math.max(1, T.pts + (d >= 3 ? 1 : 0) - (d >= 3 ? terB('trav') : 0)); }
function poiLeft(p) { return Math.max(0, p.cd - Date.now()); }
function poiGo(id) {
  terInit(); const t = S.ter, p = t.poi.find(x => x.id === id), T = p && TW.poiT(p.t);
  if (!p || !terCell(p.x, p.y)) { S.msg = 'Locul nu a fost descoperit.'; return go(); }
  if (S.ex) { S.msg = 'Ai o expediție în desfășurare. Termin-o sau retrage-te.'; return go(); }
  if (S.d) { S.msg = 'Ești deja într-o coborâre.'; return go(); }
  if (poiLeft(p) > 0) { S.msg = 'Locul nu mai are nimic de oferit acum. Revino peste ' + tDur(poiLeft(p)) + '.'; return go(); }
  const c = poiCost(p); if (S.pts < c) { S.msg = 'Îți trebuie ' + c + ' puncte.'; return go(); }
  spend(c); const now = Date.now();
  if (p.t === 'tu') {
    const cells = terRev(p.x, p.y, 2), g = Math.round(TW.rawGold(S.lvl) * .3); S.gold += g; p.cd = Infinity; p.cd = now + 36500 * 864e5; t.poiT.tu = 1; t.st.poi++;
    S.msg = 'Din turn vezi mult mai departe (' + cells.length + ' zone noi, +' + g + ' aur). ' + terDisc(cells) + terClue(p.id); S.msel = null; return go();
  }
  p.cd = now + T.cd * 3600000; t.poiT[p.t] = 1; t.st.poi++;
  let f = 1; if (p.t === 'pe') { p.dep = (p.dep || []).filter(ts => ts > now - 48 * 3600000); f = Math.max(.5, 1 - .25 * p.dep.length); p.dep.push(now); }
  S.ex = { p: p.id, t: p.t, seed: TW.hash(p.id + '|' + now), si: 0, ph: 'c', f, loot: { g: 0, o: 0, x: 0, m: {}, cr: {}, relic: 0, clue: 0, buf: null }, log: [] };
  S.tab = 'm'; S.mt = 'h'; S.msg = ''; go();
}
function terClue(pid) { const t = S.ter; if (TW.CLUES[pid] && !t.cl[pid]) { t.cl[pid] = 1; return ' Indiciu nou în jurnal.'; } return ''; }
function exLootTxt(L) {
  const a = []; if (L.g) a.push(L.g + ' aur'); if (L.o) a.push(L.o + ' minereu'); if (L.x) a.push(L.x + ' exp');
  const mm = Object.entries(L.m).map(([k, n]) => n + ' × ' + mn(k)); if (mm.length) a.push(mm.join(', '));
  const cc = Object.entries(L.cr).map(([k, n]) => n + ' × ' + mn(k)); if (cc.length) a.push(cc.join(', '));
  if (L.relic) a.push('o relicvă'); if (L.clue) a.push('un indiciu'); if (L.buf) a.push('binecuvântare ' + L.buf.v + '% ' + ({ pd: 'atac', pf: 'apărare', ph: 'viață' })[L.buf.k]);
  return a.join(', ') || 'nimic încă';
}
function exPick(ci) {
  const e = S.ex; if (!e || e.ph !== 'c') return go();
  const spec = TW.EX[e.t], st = spec.steps[e.si], c = st.ch[ci]; if (!c) return go();
  if (c.need) for (const k in c.need) if (have(k) < c.need[k]) { S.msg = 'Îți lipsesc materiale: ' + mn(k) + ' ' + have(k) + '/' + c.need[k] + '.'; return go(); }
  const off = c.off ? Math.round(c.off * S.lvl) : 0; if (off && S.gold < off) { S.msg = 'Îți trebuie ' + off + ' aur pentru ofrandă.'; return go(); }
  if (c.need) for (const k in c.need) take(k, c.need[k]); if (off) S.gold -= off;
  const r = TW.exRes(spec, e.si, ci, S.lvl, TW.prng(TW.hash(e.seed + '|' + e.si + '|' + ci)), TP), L = e.loot, f = e.f || 1;
  L.g += Math.round(r.g * f); L.o += Math.round(r.o * f); L.x += r.x;
  for (const k in r.m) L.m[k] = (L.m[k] || 0) + Math.max(1, Math.round(r.m[k] * f));
  for (const k in r.cr) L.cr[k] = (L.cr[k] || 0) + r.cr[k];
  if (r.clue) L.clue = 1; if (r.relic) L.relic = 1; if (r.buf) L.buf = r.buf;
  let tx = st.n + ': ' + c.t + '. ';
  if (r.inc && r.inc.k === 'loot') { const q = 1 - r.inc.f; L.g = Math.floor(L.g * q); L.o = Math.floor(L.o * q); L.x = Math.floor(L.x * q); for (const k in L.m) L.m[k] = Math.floor(L.m[k] * q); for (const k in L.cr) L.cr[k] = Math.floor(L.cr[k] * q); tx += 'Incident: ai pierdut ' + Math.round(r.inc.f * 100) + '% din prada neîncasată.'; }
  else if (r.inc && r.inc.k === 'hp') { S.fs.forEach(x => { if (x.hp > 0) x.hp = Math.max(TP.ex.hpFloor, x.hp - Math.round(mhp(x) * r.inc.f)); }); tx += 'Incident: echipa a pierdut ' + Math.round(r.inc.f * 100) + '% din viață.'; }
  else tx += 'A mers bine.';
  e.log.push(tx); e.si++; e.ph = 'r'; S.msg = '';
  if (e.si >= spec.steps.length) return exEnd(); go();
}
function exNext() { const e = S.ex; if (e && e.ph === 'r') e.ph = 'c'; go(); }
function exEnd() {
  const e = S.ex; if (!e) return go(); const t = S.ter, L = e.loot, p = t.poi.find(x => x.id === e.p), out = [];
  const mb = terMatBonus(L.m); S.gold += L.g; if (L.g) out.push('+' + L.g + ' aur');
  const lost = stash({ ore: L.o, m: Object.assign({}, L.m, L.cr) }); if (L.o) out.push('+' + L.o + ' minereu');
  const mt = Object.values(L.m).reduce((a, b) => a + b, 0); if (mt) out.push(mt + ' materiale' + (mb ? ' (+' + mb + ' din bonusul satelor)' : '')); Object.entries(L.cr).forEach(([k, n]) => out.push(n + ' × ' + mn(k)));
  if (L.x) { const up = terXp(L.x); out.push('+' + L.x + ' exp' + (up ? ', nivel nou!' : '')); }
  if (L.relic) { const it = terRelic(Math.max(8, S.lvl)); S.inv.push(it); out.push('relicvă: ' + it.name); }
  if (L.buf) { const b = t.buf.find(x => x.k === L.buf.k); const exp = Date.now() + L.buf.min * 60000; if (b) { b.v = Math.max(b.v, L.buf.v); b.exp = Math.max(b.exp, exp); } else t.buf.push({ k: L.buf.k, v: L.buf.v, exp }); }
  let cl = ''; if (L.clue && p) cl = terClue(p.id);
  S.msg = 'Expediția s-a încheiat: ' + (out.join(', ') || 'ai plecat cu mâinile goale') + '.' + (lost ? ' Depozitul e plin: ' + lost + ' pierdute.' : '') + cl;
  terLog(TW.EX[e.t].nm + ': ' + (out.join(', ') || 'nimic')); S.ex = null; S.msel = null; go();
}
function vEx() {
  const e = S.ex, spec = TW.EX[e.t], st = spec.steps[Math.min(e.si, spec.steps.length - 1)], p = S.ter.poi.find(x => x.id === e.p);
  let h = `<section style="border-left-color:var(--ember)"><h2>${TW.poiT(e.t).ic} ${spec.nm}: pasul ${Math.min(e.si + (e.ph === 'c' ? 1 : 0), spec.steps.length)}/${spec.steps.length}</h2><div class="mute">Strâns până acum (neîncasat): <b>${exLootTxt(e.loot)}</b>. Dacă te retragi, păstrezi tot. Incidentele afectează doar prada de mai jos, niciodată depozitul tău.${e.f < 1 ? ' Vena e parțial epuizată (×' + e.f + ').' : ''}</div>`;
  if (e.log.length) h += '<div class="log">' + e.log.map(x => '<div>' + tEsc(x) + '</div>').join('') + '</div>';
  if (e.ph === 'c') {
    h += `<div style="margin:8px 0"><b>${st.n}</b><br>${st.tx}</div>`;
    st.ch.forEach((c, i) => {
      const r = TW.exRes(spec, e.si, i, S.lvl, () => 1, TP), est = [];
      const ff = e.f || 1, g = Math.round((c.g || 0) * TW.rawGold(S.lvl) * TP.ex.gm * ff), o = Math.round((c.o || 0) * TW.rawOre(S.lvl) * TP.ex.om * ff), x = Math.round((c.x || 0) * TW.rawXp(S.lvl) * TP.ex.xm);
      if (g) est.push(g + ' aur'); if (o) est.push(o + ' minereu'); if (x) est.push(x + ' exp'); if (c.m) est.push(c.m + ' materiale'); if (c.cr) est.push('cristale (' + c.cr.map(z => Math.round(z[2] * 100) + '% ' + z[1] + '× ' + mn(z[0])).join(', ') + ')'); if (c.relic) est.push('o relicvă garantată'); if (c.clue) est.push('un indiciu'); if (c.buf) est.push('binecuvântare');
      const need = c.need ? Object.entries(c.need).map(([k, n]) => `<span class="${have(k) < n ? 'r4' : ''}">${mn(k)} ${have(k)}/${n}</span>`).join(', ') : '', off = c.off ? Math.round(c.off * S.lvl) : 0;
      const risk = c.risk ? `<br><span class="r4">Risc ${Math.round(c.risk * 100)}%: ${c.loss.k === 'loot' ? 'pierzi ' + Math.round(c.loss.f * 100) + '% din prada neîncasată' : 'echipa pierde ' + Math.round(c.loss.f * 100) + '% din viață'}.</span>` : '<br><span class="r2">Fără risc.</span>';
      const ok = (!c.need || Object.keys(c.need).every(k => have(k) >= c.need[k])) && (!off || S.gold >= off);
      h += `<div class="row" style="align-items:flex-start"><span><b>${c.t}</b><br><span class="mute">Câștig: ${est.join(', ') || 'nimic direct'}${need ? '<br>Consumi: ' + need : ''}${off ? '<br>Ofrandă: ' + off + ' aur' : ''}</span>${risk}</span><button class="p" onclick="exPick(${i})"${ok ? '' : ' disabled'}>Alege</button></div>`;
    });
  } else h += `<div class="row"><span>Mergi mai adânc pentru mai multă pradă, sau pleci acum cu tot ce ai strâns.</span><span><button class="p" onclick="exNext()">Mai adânc</button> <button onclick="exEnd()">Retrage-te</button></span></div>`;
  if (e.ph === 'c') h += `<div class="row"><span class="mute">Poți pleca oricând.</span><button onclick="exEnd()">Retrage-te cu prada</button></div>`;
  return h + '</section>';
}

/* -------------------------------------------------------------- FORTĂREAȚA ---- */
function fortCheck() {
  const t = S.ter, f = t.fort, re = !!f.lost, fee = Math.round(TW.fortFee(S.lvl) * (re ? TP.conq.reFee : 1)), pts = Math.max(1, TP.fort.pts - terB('trav'));
  const n = Object.keys(t.hist).filter(k => k !== 'fort').length;
  const a = [
    { ok: !!t.dsc.fort, t: 'Fortăreața descoperită (explorează zona sau urcă într-un turn)' },
    { ok: S.lvl >= TP.fort.lv, t: 'Nivel ' + TP.fort.lv + ' (ai ' + S.lvl + ')' },
    { ok: n >= 1, t: 'Cel puțin un sat cucerit vreodată' },
    { ok: S.gold >= fee, t: 'Taxă de asediu: ' + fee + ' aur' },
    { ok: S.pts >= pts + 2, t: 'Puncte: ' + (pts + 2) + ' (intrare ' + pts + ' + lupte)' },
    { ok: S.fs.some(x => x.hp > 0) && !S.d, t: 'Echipă în stare de luptă, fără coborâre activă' }
  ];
  return { a, ok: a.every(x => x.ok), fee, pts, re };
}
function fortGo() {
  terInit(); const c = fortCheck(), t = S.ter; if (t.fort.o === 'p') { S.msg = 'Bastionul îți aparține deja.'; return go(); }
  if (!c.ok) { S.msg = 'Condițiile de asediu nu sunt îndeplinite.'; return go(); }
  cn('r'); spend(c.pts); S.gold -= c.fee; const ks = TP.fort.k.map(x => TW.kb(S.lvl) * x * (c.re ? TP.conq.reK : 1));
  S.d = { room: 1, rooms: 3, k: ks[0], ks, xs: TP.fort.xn, rw: TP.fort.rw, bn: TW.FORT.boss, di: 0, raid: -2, rn: TW.FORT.nm, lbl: 'Asediu', fort: 1, rf: 1, fx: 1, loot: { gold: 0, ore: 0, xp: 0, m: {} }, f: null, done: false, em: { nm: TW.FORT.en, hm: 1, am: 1, dm: 1.1 } };
  startF(false); terFrom(); S.tab = 'c'; S.msg = 'Asediezi ' + TW.FORT.nm + '.'; if (S.auto !== false) { autoRun(); return; } go();
}
function terFortWin(d) {
  const t = S.ter, f = t.fort, re = !!f.lost, now = Date.now(), L = d.loot, out = [TW.FORT.nm + ' e al tău! ' + TW.FORT.bd];
  if (!t.hist.fort) { const g = Math.round(TW.rawGold(S.lvl) * TW.FORT.first.g), x = Math.round(TW.rawXp(S.lvl) * TW.FORT.first.x); L.gold += g; L.xp += x; const it = mkItem(P(['w', 'a', 'h', 'b']), S.lvl, TW.FORT.first.item[0]); (L.it || (L.it = [])).push(it); out.push('Prima cucerire: +' + g + ' aur, +' + x + ' exp, ' + it.name + '.'); }
  f.o = 'p'; f.cq = now; f.sg = now + TP.fort.immuneH * 3600000; f.lost = 0; t.hist.fort = (t.hist.fort || 0) + 1; if (re) t.st.recon++; if (!t.upT) t.upT = now;
  terLog(TW.FORT.nm + (re ? ' a fost recucerit.' : ' a fost cucerit.')); d.cm = out.join(' ');
}

/* ----------------------------------------------- CÂRLIGE ÎN RL / WIN / LEAVE ---- */
function terRl(d) {
  if (d.conq) terConqWin(d); else if (d.camp) terCampWin(d); else if (d.fort) terFortWin(d); else if (d.tron) tronWin(d); else if (d.lume) lumeWin(d);
}
function terRaidStat(v) { v.rw = (v.rw || 0) + 1; S.ter.st.raid++; }
function campBoss(d) { if (d.di != null) S.camp.bk[d.di] = 1; }
function terLeave(d) {
  if (!d) return;
  if (!d.ev && !d.conq && !d.fort && !d.mb) { d.mb = 1; const n = terMatBonus(d.loot.m); if (n) d.xm = 'Bonusul satelor: +' + n + ' materiale.'; }
  if (d.loot.merc) { d.loot.merc = 0; d.xm = ((d.xm || '') + ' ' + terMerc(1)).trim(); }
}
function terDevPanel() { return DEV(); }

/* ---------------------------------------------------------------- CAMPANIE ---- */
function objDone(o) {
  const t = S.ter, c = S.camp;
  switch (o.k) {
    case 'boss': return !!c.bk[o.di];
    case 'raid': return t.st.raid >= o.n;
    case 'conq': return Object.keys(t.hist).filter(k => k !== 'fort').length >= o.n;
    case 'poi': return Object.keys(t.dsc).filter(k => k !== 'fort').length >= o.n;
    case 'poit': return Object.keys(t.poiT).length >= o.n;
    case 'clue': return Object.keys(t.cl).length >= o.n;
    case 'fort': return !!t.hist.fort;
    case 'camp': return t.st.camp >= o.n;
    case 'fog': return t.fog.length >= o.n;
    case 'own': return terOwnedV().length >= o.n;
    case 'recon': return t.st.recon >= o.n;
  }
  return false;
}
function objProg(o) {
  const t = S.ter, c = S.camp;
  const f = { raid: t.st.raid, conq: Object.keys(t.hist).filter(k => k !== 'fort').length, poi: Object.keys(t.dsc).filter(k => k !== 'fort').length, poit: Object.keys(t.poiT).length, clue: Object.keys(t.cl).length, camp: t.st.camp, fog: t.fog.length, own: terOwnedV().length, recon: t.st.recon };
  return o.n ? Math.min(o.n, f[o.k] || 0) + '/' + o.n : '';
}
const chCur = () => TW.CH.find(c => !S.camp.rw[c.id]);
const chReady = c => c && c.obj.every(objDone);
function cmpClaim(id) {
  terInit(); const c = TW.CH.find(x => x.id === id), cur = chCur();
  if (!c || !cur || cur.id !== id || S.camp.rw[id] || !chReady(c)) { S.msg = 'Capitolul nu poate fi revendicat acum.'; return go(); }
  S.camp.rw[id] = 1; S.camp.ch = id; S.msg = 'Capitolul „' + c.nm + '” încheiat. ' + c.out + ' Recompensă: ' + terGrant(c.rw, Math.max(S.lvl, c.lv)) + '.'; go();
}
function secClaim(id) {
  terInit(); const s = TW.SEC.find(x => x.id === id);
  if (!s || S.camp.sec[id] || !objDone(s)) { S.msg = 'Obiectivul nu poate fi revendicat acum.'; return go(); }
  S.camp.sec[id] = 1; S.msg = 'Obiectiv „' + s.nm + '” îndeplinit. Recompensă: ' + terGrant(s.rw, S.lvl) + '.'; go();
}
const cmpReady = () => { const c = chCur(); return (c && chReady(c) ? 1 : 0) + TW.SEC.filter(s => !S.camp.sec[s.id] && objDone(s)).length; };
function vCamp() {
  const cur = chCur(), n = TW.CH.filter(c => S.camp.rw[c.id]).length;
  let h = `<section><h2>Campania: Tronul Cenușiu</h2><div class="mute">Regele Cenușiu a stins Vatra Regală și stă pe Tronul de Argint. Șase sigilii țin Cenușa vie, fiecare păzit de un căpitan. Progresul campaniei e permanent: nu se pierde dacă pierzi un sat sau o fortăreață.</div><div class="row" style="justify-content:center;gap:10px;margin-top:8px">${TW.CH.map(c => `<span title="Sigiliul ${c.id}: ${c.nm}" style="display:inline-flex;width:30px;height:30px;border-radius:50%;align-items:center;justify-content:center;border:2px solid ${S.camp.rw[c.id] ? 'var(--gold2)' : 'var(--line)'};background:${S.camp.rw[c.id] ? 'radial-gradient(#f0d27a,#8a6a1e)' : '#0b0e10'};color:${S.camp.rw[c.id] ? '#1a1306' : 'var(--mute)'};font:700 14px Cinzel,serif">${c.id}</span>`).join('')}</div><div class="mute" style="text-align:center">${n}/${TW.CH.length} sigilii arse</div></section>`;
  if (cur) {
    const ok = chReady(cur);
    h += `<section style="border-left-color:var(--ember)"><h2>Capitolul ${cur.id}: ${cur.nm}</h2><div class="mute">${cur.reg} · recomandat nivel ${cur.lv}${S.lvl < cur.lv ? ' <b class="r4">(ai ' + S.lvl + ')</b>' : ''}</div><p>${cur.tx}</p>` + cur.obj.map(o => `<div class="${objDone(o) ? 'r2' : ''}">${objDone(o) ? '✔' : '○'} ${o.t}${o.n ? ' <span class="mute">(' + objProg(o) + ')</span>' : ''}</div>`).join('') +
      `<div class="row"><span class="mute">Recompensă unică: ${Object.entries(TW.chRw(cur.rw, Math.max(S.lvl, cur.lv))).filter(([, v]) => v).map(([k, v]) => v + ' ' + ({ g: 'aur', o: 'minereu', x: 'exp' })[k]).join(', ')}${cur.rw.item ? ', un obiect' : ''}${cur.rw.relic ? ', o relicvă' : ''}${cur.rw.mat ? ', materiale' : ''}${cur.rw.cr ? ', cristale' : ''}${cur.rw.legend ? ', Sabia Runelor' : ''}</span><button class="p" onclick="cmpClaim(${cur.id})"${ok ? '' : ' disabled'}>Încheie capitolul</button></div></section>`;
  } else h += `<section><h2>Tronul de Argint e al tău</h2><p>Toate cele șase sigilii au ars. Ținutul e liber, iar Tronul Cenușiu își așteaptă regele. Explorarea, taberele și satele rămân deschise.</p></section>`;
  h += `<section><h2>Obiective secundare</h2><div class="mute">Recompense unice pentru explorare. Se revendică o singură dată.</div>` + TW.SEC.map(s => { const d = objDone(s), cl = S.camp.sec[s.id]; return `<div class="row"><span>${cl ? '✔' : d ? '★' : '○'} <b>${s.nm}</b>: ${s.t} <span class="mute">${s.n ? '(' + objProg(s) + ')' : ''}</span></span>${cl ? '<span class="mute">Revendicat</span>' : `<button class="p" onclick="secClaim('${s.id}')"${d ? '' : ' disabled'}>Revendică</button>`}</div>`; }).join('') + '</section>';
  const cls = Object.keys(S.ter.cl);
  h += `<section><h2>Jurnal de indicii (${cls.length}/${Object.keys(TW.CLUES).length})</h2>` + (cls.length ? cls.map(k => `<div style="margin:4px 0">• ${TW.CLUES[k]}</div>`).join('') : '<p class="mute">Vizitează ruine, peșteri, sanctuare și turnuri ca să afli ce se întâmplă în ținut.</p>') + '</section>';
  const done = TW.CH.filter(c => S.camp.rw[c.id]); if (done.length) h += `<section><h2>Capitole încheiate</h2>` + done.map(c => `<div style="margin:6px 0"><b>${c.id}. ${c.nm}</b><br><span class="mute">${c.out}</span></div>`).join('') + '</section>';
  return h;
}

/* --------------------------------------------------------------- PREMIUM ----- */
/* ATENȚIE: Premium vine acum din S.prem, o valoare din browser care poate fi modificată de oricine
   (există și butonul „Premium (test)”). De aceea Premium NU atinge nicio mecanică economică sau de luptă
   în această extindere: doar aspect și confort. Drepturile reale trebuie validate pe server (docs/BACKEND.md). */
const ENT = { has: k => !!(typeof S !== 'undefined' && S && S.prem), free: { presets: 2, log: 8 }, prem: { presets: 5, log: 30 } };
const fid = f => f.id || (f.id = 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
function preSave() {
  const lim = ENT.has('cosm') ? ENT.prem.presets : ENT.free.presets; if (S.pre.length >= lim) { S.msg = 'Ai ' + lim + ' presetări' + (ENT.has('cosm') ? '.' : ' (Premium permite ' + ENT.prem.presets + ').') + ' Șterge una.'; return go(); }
  S.pre.push({ n: 'Echipa ' + (S.pre.length + 1), ids: S.fs.map(fid) }); S.msg = 'Presetare salvată.'; go();
}
function preApply(i) {
  const p = S.pre[i]; if (!p) return go(); if (S.d) { S.msg = 'Nu poți schimba echipa în timpul coborârii.'; return go(); }
  const all = [...S.fs, ...S.rs], pick = p.ids.map(id => all.find(f => f.id === id)).filter(Boolean);
  if (pick.length < 2 || !pick.some(f => f.h)) { S.msg = 'Presetarea nu mai e validă (lipsesc luptători).'; return go(); }
  S.fs = pick.slice(0, 3); S.rs = all.filter(f => !S.fs.includes(f)); S.msg = 'Echipă schimbată.'; go();
}
function preDel(i) { S.pre.splice(i, 1); go(); }
function vPre() {
  const lim = ENT.has('cosm') ? ENT.prem.presets : ENT.free.presets;
  return `<section><h2>Presetări de echipă</h2><div class="mute">Salvează componența echipei din mină și revino la ea cu un clic. ${lim} locuri${ENT.has('cosm') ? '' : ' (Premium: ' + ENT.prem.presets + ')'}. Nu schimbă puterea luptătorilor.</div>` +
    S.pre.map((p, i) => `<div class="row"><span>${tEsc(p.n)}: ${p.ids.map(id => { const f = [...S.fs, ...S.rs].find(x => x.id === id); return f ? tEsc(f.n) : '?'; }).join(', ')}</span><span><button onclick="preApply(${i})">Folosește</button> <button onclick="preDel(${i})">Șterge</button></span></div>`).join('') +
    `<div class="row"><span class="mute">Echipa curentă: ${S.fs.map(f => tEsc(f.n)).join(', ')}</span><button onclick="preSave()"${S.pre.length >= lim ? ' disabled' : ''}>Salvează echipa</button></div></section>`;
}
function cosSet(v) { if (v !== 'clasic' && !ENT.has('cosm')) { S.msg = 'Aspectul Argint este o opțiune Premium (doar vizuală).'; return go(); } S.cos.vt = v; go(); }

/* -------------------------------------------------------------- SATUL VIZUAL --- */
const BART = ST_ART;
/* Nivelul clădirii vine DOAR din starea jocului (S.bl). Funcția îl curăță (NaN, negativ, lipsă → 0) și nu scrie niciodată. */
const bLevel = k => { const v = Math.floor(Number((BL() || {})[k])); return isFinite(v) && v > 0 ? v : 0; };
/* starea imaginilor: 1 = încărcată, -1 = lipsă/eroare (din preîncărcare sau din eroarea de afișare) → se folosește desenul vectorial */
const ARTST = {};
function artPreload() {
  if (typeof Image === 'undefined') return;
  BART.allUrls().forEach(u => { const im = new Image(); im.onload = () => { ARTST[u] = 1; }; im.onerror = () => { ARTST[u] = -1; }; im.src = u; });
}
/* <img>: dacă fișierul lipsește, se înlocuiește pe loc cu desenul vectorial (fallback) */
function bBadImg(el) { ARTST[el.getAttribute('src')] = -1; el.outerHTML = bThumb(el.dataset.b, +el.dataset.lv); }
/* <image> în scenă: onload ascunde desenul vectorial, onerror îl arată */
function bOk(el) { ARTST[el.getAttribute('href')] = 1; const g = el.parentNode && el.parentNode.querySelector('.fb'); if (g) g.setAttribute('display', 'none'); }
function bBad(el) { ARTST[el.getAttribute('href')] = -1; const g = el.parentNode && el.parentNode.querySelector('.fb'); if (g) g.setAttribute('display', 'inline'); el.remove(); }
/* miniatură: imaginea nivelului (sau fallback vectorial la nivel 0 / imagine lipsă) + insignă cu nivelul */
function bArt(k, lv) {
  const u = BART.url(k, lv); if (!u || ARTST[u] === -1) return bThumb(k, lv);
  return `<img class="bimg${bUpCls(k)}" src="${u}" alt="${tEsc((BART.types[k] || {}).nm || k)}, nivel ${lv}" data-b="${k}" data-lv="${lv}" draggable="false" onerror="bBadImg(this)">`;
}
/* feedback la urcare: mesaj + scurtă sclipire a imaginii când clădirea trece la un aspect nou (doar vizual) */
const BUP = {};
function bUpMsg(k, lv) {
  const t0 = BART.tier(lv - 1, k), t1 = BART.tier(lv, k);
  if (t1 > t0) { BUP[k] = Date.now(); return `✦ ${BNAME[k]} are un aspect nou (${t1}/${BART.tiers()})!`; }
  return '';
}
const bUpCls = k => (Date.now() - (BUP[k] || 0) < 1600 ? ' bup' : '');
function bAspTxt(k) {
  const lv = bLevel(k), t = BART.tier(lv, k), nx = BART.next(lv, k);
  if (t === 0) return 'Aspect: șantier · primul aspect la nivelul 1';
  return nx ? `Aspect ${t}/${BART.tiers()} · următorul la nivelul ${nx} (încă ${nx - lv})` : `Aspect maxim (${t}/${BART.tiers()})`;
}
function bthHtml(k) { const lv = bLevel(k), rs = renStage(k); return `<span class="thumb bt${rs ? ' ren' + rs : ''}" data-b="${k}" data-lv="${lv}">${bArt(k, lv)}${rs ? `<i class="brn">${'★'.repeat(rs)}</i>` : ''}<i class="blv">${lv}</i></span>`; }
const BNAME = { f: 'Topitorie', i: 'Infirmerie', b: 'Han', d: 'Depozit', z: 'Zid' };
const bcc = n => Math.round(bc(n) * (1 - terB('bld') / 100));
function bfx(k, l) {
  switch (k) {
    case 'f': return 'timp de forjare −' + Math.round((1 - Math.pow(.96, l)) * 100) + '%';
    case 'i': return 'cost vindecare/ridicare −' + Math.round((1 - Math.pow(.96, l)) * 100) + '%';
    case 'b': return 'faimă pentru mercenari +' + 5 * l + '%';
    case 'd': return 'capacitate ' + (100 + 50 * l) + ' / material';
    case 'z': return 'apărarea satului +' + Math.round(60 * (1 - Math.pow(.92, l))) + '%';
  }
  return '';
}
function bPick(k) { S.bsel = k; go(); }
function bPal() {
  const ar = S.cos && S.cos.vt === 'argint' && ENT.has('cosm');
  return ar ? { wall: ['#555', '#9aa4ad', '#b9c2c9', '#cfd6dc', '#e6ebef'], roof: ['#444', '#5b6670', '#6e7b86', '#8793a0', '#a8b4c0'], trim: '#e6ebef', sky: ['#1b2733', '#33465a'], gr: '#34414a' }
    : { wall: ['#555', '#7a4a2e', '#7b8288', '#8a9096', '#a9a28a'], roof: ['#444', '#5a3a22', '#3f4a52', '#6b2a26', '#8a6a1e'], trim: '#f0d27a', sky: ['#161c24', '#2b2a22'], gr: '#26301f' };
}
/* Forma unei clădiri după nivel (baza la y=0). span = jumătate din lungimea zidului (doar pentru Zid). */
function bShape(k, lv, pal, span) {
  const t = TW.btier(lv), w = 22 + 5 * t, h = 14 + 5 * t, wall = pal.wall[t], roof = pal.roof[t], trim = pal.trim;
  let s = k === 'z' ? '' : `<ellipse cx="2" cy="2" rx="${w / 2 + 6}" ry="4" fill="#000" fill-opacity=".35"/>`;
  if (k !== 'z') {
    if (t === 0) s += `<rect x="-14" y="-6" width="28" height="8" fill="none" stroke="#8a7a52" stroke-dasharray="3 2"/><path d="M-10 -6l4-9M10 -6l-4-9" stroke="#8a7a52" stroke-width="1.4"/>`;
    else {
      s += `<rect x="${-w / 2}" y="${-h}" width="${w}" height="${h}" fill="${wall}" stroke="#1a1612" stroke-width=".9"/><path d="M${-w / 2 - 3} ${-h}L0 ${-h - 8 - t * 2}L${w / 2 + 3} ${-h}z" fill="${roof}" stroke="#1a1612" stroke-width=".9"/>`;
      if (t >= 2) s += `<path d="M${-w / 2} ${-h * .5}H${w / 2}" stroke="#00000033" stroke-width=".7"/>`;
      if (t >= 4) s += `<path d="M${-w / 2 - 3} ${-h}L0 ${-h - 8 - t * 2}L${w / 2 + 3} ${-h}" fill="none" stroke="${trim}" stroke-width="1.6"/><rect x="${-w / 2}" y="${-h}" width="${w}" height="2.4" fill="${trim}" fill-opacity=".7"/>`;
      s += `<rect x="-3" y="-7" width="6" height="7" fill="#1b130a"/>`;
      if (t >= 3) s += `<rect x="${-w / 2 + 4}" y="${-h + 5}" width="4" height="5" fill="#f0c36a" fill-opacity=".75"/><rect x="${w / 2 - 8}" y="${-h + 5}" width="4" height="5" fill="#f0c36a" fill-opacity=".75"/>`;
      if (k === 'f') s += `<rect x="${w / 2 - 7}" y="${-h - 14 - t}" width="5" height="${8 + t}" fill="#4a4a4a"/><circle class="st-sk" cx="${w / 2 - 4.5}" cy="${-h - 16 - t}" r="2.2" fill="#c9c3b3" fill-opacity=".7"/><rect x="${-w / 2 + 3}" y="-8" width="5" height="3" fill="#e0752b"/>${t >= 3 ? `<circle cx="${-w / 2 - 6}" cy="-4" r="3" fill="#e0752b" fill-opacity=".6"/>` : ''}`;
      if (k === 'i') s += `<rect x="-2" y="${-h + 3}" width="4" height="9" fill="#e9e1cf"/><rect x="-5" y="${-h + 6}" width="10" height="3" fill="#e9e1cf"/>${t >= 3 ? `<circle cx="${w / 2 + 5}" cy="-6" r="2.2" fill="#4fa35e"/><circle cx="${w / 2 + 9}" cy="-4" r="1.8" fill="#6fc47e"/>` : ''}`;
      if (k === 'b') s += `<rect x="${w / 2 - 2}" y="-18" width="8" height="5" fill="#8a6a1e" stroke="#2a1d10" stroke-width=".6"/><path d="M${w / 2 + 2} -13v-4" stroke="#2a1d10"/><circle cx="${-w / 2 + 5}" cy="-9" r="1.6" fill="#f0c36a"/>${t >= 2 ? `<rect x="${-w / 2 - 7}" y="-9" width="6" height="9" fill="#5a3a22" stroke="#2a1d10" stroke-width=".5"/>` : ''}`;
      if (k === 'd') { for (let i = 0; i < Math.min(6, 1 + t * 1.2); i++) s += `<rect x="${w / 2 + 2 + (i % 2) * 6}" y="${-5 - Math.floor(i / 2) * 6}" width="6" height="5" fill="#8a6a3a" stroke="#2a1d10" stroke-width=".6"/>`; if (t >= 3) s += `<rect x="${-w / 2 - 9}" y="-8" width="7" height="8" rx="3" fill="#6b5430" stroke="#2a1d10" stroke-width=".6"/>`; }
      if (t >= 3) s += `<path d="M0 ${-h - 8 - t * 2}v-9" stroke="#2a1d10"/><path class="st-fl" d="M0 ${-h - 17 - t * 2}l7 2.5-7 2.5z" fill="${t >= 4 ? trim : '#c0504a'}"/>`;
    }
  } else {
    const wl = [0, 6, 9, 12, 15][t];
    if (t > 0) {
      s += `<rect x="${-span}" y="${-wl}" width="${2 * span}" height="${wl}" fill="${t === 1 ? '#7a4a2e' : wall}" stroke="#1a1612" stroke-width=".9" opacity=".96"/>`;
      if (t === 1) for (let i = -span; i < span; i += 8) s += `<path d="M${i} 0v${-wl - 3}" stroke="#4a2c18" stroke-width="1.2"/>`;
      else for (let i = -span; i < span; i += 14) s += `<rect x="${i}" y="${-wl - 3}" width="8" height="3" fill="${wall}"/>`;
      if (t >= 3) [-span, span].forEach(tx => s += `<rect x="${tx - 9}" y="${-wl - 14}" width="18" height="${wl + 14}" fill="${wall}" stroke="#1a1612" stroke-width=".9"/><path d="M${tx - 11} ${-wl - 14}l11 -9 11 9z" fill="${roof}" stroke="#1a1612" stroke-width=".9"/>`);
      if (t >= 2) s += `<rect x="-6" y="${-wl}" width="12" height="${wl}" fill="#1b130a"/><path d="M-6 ${-wl}a6 6 0 0 1 12 0" fill="#1b130a"/>`;
    } else s += `<path d="M${-span} 0H${span}" stroke="#8a7a52" stroke-dasharray="4 4"/>`;
  }
  return s;
}
/* Scara imaginilor în scenă (unități SVG per pixel de imagine). Aceeași scară pe toate nivelurile aceleiași clădiri. */
const SC_B = .40, SC_Z = .42, ZX = 208;
function bSprite(k, lv, lx, mirror, sc) {
  const u = BART.url(k, lv); if (!u || ARTST[u] === -1) return '';
  const [cw, chh] = BART.types[k].canvas, w = +(cw * sc).toFixed(2), h = +(chh * sc).toFixed(2);
  return `<image class="bsp${bUpCls(k)}" href="${u}" x="${-w / 2}" y="${-h}" width="${w}" height="${h}" preserveAspectRatio="xMidYMax meet" transform="translate(${lx} 0)${mirror ? ' scale(-1 1)' : ''}" onload="bOk(this)" onerror="bBad(this)"/>`;
}
function bSvg(k, lv, x, pal, can, cost) {
  const u = BART.url(k, lv), sc = k === 'z' ? SC_Z : SC_B, ok = !!u && ARTST[u] !== -1, known = !!u && ARTST[u] === 1, t = TW.btier(lv), sel = S.bsel === k;
  const [cw, chh] = BART.types[k].canvas, w = cw * sc, h = chh * sc, zx = -ZX;
  let s = `<g class="bd" data-b="${k}" data-lv="${lv}" transform="translate(${x} 168)" onclick="bPick('${k}')" style="cursor:pointer" role="button" aria-label="${BNAME[k]}, nivel ${lv}">`;
  const rs = renStage(k);
  s += k === 'z' ? renGlow(rs, w, h, zx) + renGlow(rs, w, h, -zx) : renGlow(rs, w, h, 0);
  s += `<g class="fb" display="${ok && known ? 'none' : 'inline'}">${bShape(k, lv, pal, 200)}</g>`;     /* desen vectorial: șantier la nivel 0 și fallback dacă lipsește imaginea */
  if (ok) s += k === 'z' ? bSprite(k, lv, zx, false, sc) + bSprite(k, lv, -zx, true, sc) : bSprite(k, lv, 0, false, sc);
  s += k === 'z' ? renDeco(rs, w, h, zx) + renDeco(rs, w, h, -zx) : renDeco(rs, w, h, 0);
  s += `<text x="${k === 'z' ? zx : 0}" y="14" text-anchor="middle" fill="#e9e1cf" style="font:700 8px Cinzel,serif">${BNAME[k]} ${lv}</text>`;
  const top = -(ok ? h : (k === 'z' ? 30 : 14 + 5 * t + 10)) - 12;
  if (can) s += `<g transform="translate(${k === 'z' ? zx : 0} ${top})"><g class="st-fl" style="animation-duration:1.4s"><path d="M-7 -2l7 9 7 -9z" fill="#f0d27a" stroke="#6b4a06" stroke-width=".7"/></g><text y="-6" text-anchor="middle" fill="#f0d27a" style="font:700 8px Alegreya,serif">${cost}</text></g>`;
  if (sel) s += k === 'z' ? `<rect x="${zx - w / 2 - 3}" y="${-h - 3}" width="${w + 6}" height="${h + 20}" fill="none" stroke="#f0d27a" stroke-width="1.2" stroke-dasharray="3 2" pointer-events="none"/>` : `<rect x="${-w / 2 - 3}" y="${-(ok ? h : 14 + 5 * t + 10) - 3}" width="${w + 6}" height="${(ok ? h : 14 + 5 * t + 10) + 20}" fill="none" stroke="#f0d27a" stroke-width="1.2" stroke-dasharray="3 2" pointer-events="none"/>`;
  return s + '</g>';
}
/* Miniatură pentru lista de clădiri: aceeași grafică, la nivelul clădirii */
function bThumb(k, lv) {
  const pal = bPal();
  return `<svg viewBox="-32 -60 64 70" width="100%" height="100%" aria-hidden="true"><defs><linearGradient id="bt${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.sky[0]}"/><stop offset="1" stop-color="${pal.sky[1]}"/></linearGradient></defs><rect x="-32" y="-60" width="64" height="70" fill="url(#bt${k})"/><rect x="-32" y="0" width="64" height="10" fill="${pal.gr}"/>${bShape(k, lv, pal, 22)}</svg>`;
}
/* Fundalul capitalei: se schimbă cu stadiul satului (Tabără → Cetate), steaguri pentru teritorii, turnul fortăreței */
function heroBg() {
  const b = BL(), tot = BN.reduce((s, [k]) => s + (b[k] || 0), 0), st = TW.stage(tot), pal = bPal(), tr = pal.trim, own = terOwnedV().length, fort = S.ter.fort.o === 'p';
  const A = pal.wall[Math.min(4, st + 1)], R = pal.roof[Math.min(4, st + 1)];
  let s = `<svg class="hero-bg" viewBox="0 0 600 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="hbs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.sky[0]}"/><stop offset="1" stop-color="${pal.sky[1]}"/></linearGradient></defs><rect width="600" height="190" fill="url(#hbs)"/>`;
  for (let i = 0; i < 26; i++) { const r = TW.prng(i * 17 + 3); s += `<circle cx="${r() * 600 | 0}" cy="${r() * 80 | 0}" r="${(r() * .9 + .3).toFixed(1)}" fill="#e9e1cf" fill-opacity="${(r() * .5 + .2).toFixed(2)}"/>`; }
  s += `<circle cx="505" cy="48" r="15" fill="#e9e1cf" fill-opacity=".85"/><circle cx="511" cy="45" r="13" fill="${pal.sky[0]}"/>`;
  s += `<path d="M0 120L70 78 130 112 200 70 280 118 360 82 450 116 520 80 600 108V190H0z" fill="#10171a"/><path d="M0 88Q90 64 180 86T370 80T600 86V190H0z" fill="#16201a"/><rect y="100" width="600" height="90" fill="${pal.gr}"/><path d="M262 190L290 100M338 190L310 100" stroke="#6b5a3a" stroke-width="7" opacity=".55"/>`;
  if (fort) s += `<g transform="translate(548 80)"><rect x="-12" y="-44" width="24" height="44" fill="#4d555b" stroke="#1a1d20"/><path d="M-15 -44l15 -13 15 13z" fill="#3a4147"/><path class="st-fl" d="M0 -57v-12l10 3-10 3" fill="${tr}"/></g>`;
  const gy = 100;
  const house = (x, k) => `<g transform="translate(${x} ${gy})"><rect x="-9" y="-12" width="18" height="12" fill="${k ? '#56626b' : '#7a4a2e'}" stroke="#1a1612" stroke-width=".8"/><path d="M-11 -12L0 -22 11 -12z" fill="${k ? '#3f4a52' : '#5a3a22'}" stroke="#1a1612" stroke-width=".8"/><rect x="-2" y="-6" width="4" height="6" fill="#1b130a"/><rect x="3" y="-10" width="3" height="3" fill="#f0c36a" fill-opacity=".8"/></g>`;
  const tent = x => `<g transform="translate(${x} ${gy})"><path d="M-14 0L0 -22 14 0z" fill="#8a7a52" stroke="#1a1612" stroke-width=".8"/><path d="M-3 0L0 -9 3 0z" fill="#1b130a"/></g>`;
  const tower = (x, h) => `<g transform="translate(${x} ${gy})"><rect x="-10" y="${-h}" width="20" height="${h}" fill="${A}" stroke="#1a1612" stroke-width=".9"/><path d="M-12 ${-h}l12 -10 12 10z" fill="${R}" stroke="#1a1612" stroke-width=".9"/><rect x="-2" y="${-h + 8}" width="4" height="6" fill="#f0c36a" fill-opacity=".8"/></g>`;
  const flag = (x, y) => `<g transform="translate(${x} ${y})"><path d="M0 0v-14" stroke="#2a1d10"/><path class="st-fl" d="M0-14l9 3-9 3z" fill="${flagCol()}"/></g>`;
  const mark = s.length;
  if (st === 0) { s += tent(250) + tent(335) + tent(292) + `<g transform="translate(292 ${gy + 2})"><circle r="8" fill="#e0752b" fill-opacity=".25"/><path class="st-fl" d="M-3 0Q0 -10 3 0z" fill="#e0752b"/></g><circle class="st-sk" cx="292" cy="${gy - 12}" r="2.4" fill="#c9c3b3" fill-opacity=".6"/>`; }
  else if (st === 1) { s += house(240) + house(285) + house(335) + `<g transform="translate(375 ${gy})"><rect x="-4" y="-34" width="8" height="34" fill="#5a3a22" stroke="#1a1612" stroke-width=".8"/><rect x="-9" y="-40" width="18" height="7" fill="#7a4a2e" stroke="#1a1612" stroke-width=".8"/></g>` + [200, 215, 230].map(x => `<path d="M${x} ${gy}v-9" stroke="#4a2c18" stroke-width="1.6"/>`).join(''); }
  else if (st === 2) { s += [220, 255, 345, 380].map((x, i) => house(x, i % 2)).join('') + `<g transform="translate(300 ${gy})"><rect x="-22" y="-26" width="44" height="26" fill="#6f7479" stroke="#1a1612" stroke-width=".9"/><path d="M-26 -26L0 -46 26 -26z" fill="#3f4a52" stroke="#1a1612" stroke-width=".9"/><rect x="-4" y="-12" width="8" height="12" fill="#1b130a"/></g>` + `<rect x="190" y="${gy - 8}" width="220" height="8" fill="#7b8288" stroke="#1a1612" stroke-width=".7"/>`; }
  else if (st === 3) { s += `<rect x="170" y="${gy - 18}" width="260" height="18" fill="${A}" stroke="#1a1612" stroke-width=".9"/>` + Array.from({ length: 18 }, (_, i) => `<rect x="${172 + i * 14.5}" y="${gy - 22}" width="8" height="4" fill="${A}"/>`).join('') + tower(176, 38) + tower(424, 38) + `<g transform="translate(300 ${gy})"><rect x="-26" y="-58" width="52" height="58" fill="${A}" stroke="#1a1612" stroke-width=".9"/><path d="M-30 -58L0 -80 30 -58z" fill="${R}" stroke="#1a1612" stroke-width=".9"/><path d="M-9 0v-16a9 9 0 0 1 18 0v16z" fill="#1b130a"/><rect x="-14" y="-44" width="5" height="8" fill="#f0c36a" fill-opacity=".8"/><rect x="9" y="-44" width="5" height="8" fill="#f0c36a" fill-opacity=".8"/></g>` + flag(300, gy - 80); }
  else { s += `<rect x="150" y="${gy - 24}" width="300" height="24" fill="${A}" stroke="#1a1612" stroke-width=".9"/>` + Array.from({ length: 21 }, (_, i) => `<rect x="${152 + i * 14.2}" y="${gy - 28}" width="8" height="4" fill="${A}"/>`).join('') + tower(156, 52) + tower(444, 52) + tower(228, 42) + tower(372, 42) + `<g transform="translate(300 ${gy})"><rect x="-34" y="-84" width="68" height="84" fill="${A}" stroke="#1a1612" stroke-width="1"/><rect x="-34" y="-84" width="68" height="4" fill="${tr}" fill-opacity=".8"/><path d="M-40 -84L0 -116 40 -84z" fill="${R}" stroke="${tr}" stroke-width="1.6"/><path d="M-11 0v-20a11 11 0 0 1 22 0v20z" fill="#1b130a"/>${[-22, -4, 14].map(x => `<rect x="${x}" y="-66" width="6" height="10" fill="#f0c36a" fill-opacity=".85"/>`).join('')}</g>` + flag(300, gy - 116) + flag(156, gy - 66) + flag(444, gy - 66) + [[262, gy - 2], [338, gy - 2]].map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="9" fill="#e0752b" fill-opacity=".22"/><path class="st-fl" d="M-2.4 0Q0 -8 2.4 0z" fill="#e0752b"/></g>`).join(''); }
  { const k = [1, 1, 1, .8, .62][st]; s = s.slice(0, mark) + `<g transform="translate(300 ${gy}) scale(${k}) translate(-300 -${gy})">` + s.slice(mark) + '</g>'; }
  for (let i = 0; i < Math.min(own, 6); i++) s += flag(24 + i * 14, 112);
  return s + `<rect width="600" height="190" fill="#000" fill-opacity=".18"/></svg>`;
}
(function () { if (typeof document === 'undefined' || !document.head) return; const st = document.createElement('style'); st.textContent = '@media (max-width:520px){.thumb.bt{width:64px;height:64px}}.hero>svg.hero-bg{position:absolute;left:0;top:0;width:100%;height:100%;z-index:0;border-radius:3px;pointer-events:none}.hero-in,.hero-cta{position:relative;z-index:1}.thumb>svg{display:block}.bup{animation:bpop .9s ease-out}@keyframes bpop{0%{filter:brightness(2.3) drop-shadow(0 0 8px #f0d27a)}100%{filter:none}}.thumb.bt{width:76px;height:76px;background:radial-gradient(circle at 50% 75%,#2f3832,#12181a 75%)}.thumb img.bimg{object-fit:contain;object-position:center bottom;padding:3px;image-rendering:auto}.thumb.ren2 img.bimg,.thumb.ren3 img.bimg{filter:drop-shadow(0 0 5px #f0d27acc)}.thumb.ren3{box-shadow:0 0 9px #f0d27a88}.thumb .brn{position:absolute;left:3px;top:1px;z-index:2;font:10px sans-serif;font-style:normal;color:var(--gold2);text-shadow:0 0 2px #000}@keyframes bptw{0%,100%{opacity:.25}50%{opacity:1}}.tw{animation:bptw 1.6s ease-in-out infinite}.thumb .blv{position:absolute;right:3px;bottom:1px;z-index:2;font:700 12px Cinzel,serif;font-style:normal;color:var(--gold2);text-shadow:0 0 3px #000,0 0 3px #000,0 1px 1px #000}'; document.head.appendChild(st); })();
function vScene() {
  const b = BL(), mx = bmax(), tot = BN.reduce((s, [k]) => s + (b[k] || 0), 0), st = TW.stage(tot), pal = bPal();
  const xs = { f: 148, i: 226, b: 304, d: 382 }, nxt = TW.STAGES[st + 1];
  let s = `<svg viewBox="0 52 520 148" width="100%" role="img" aria-label="Satul tău: ${TW.STAGES[st][1]}" style="display:block;border:1px solid var(--line);background:${pal.sky[0]}"><defs><radialGradient id="renG"><stop offset="0" stop-color="#f0d27a" stop-opacity=".5"/><stop offset="1" stop-color="#f0d27a" stop-opacity="0"/></radialGradient><linearGradient id="vsg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pal.sky[0]}"/><stop offset="1" stop-color="${pal.sky[1]}"/></linearGradient></defs><rect y="0" width="520" height="200" fill="url(#vsg)"/>`;
  s += `<path d="M0 132Q75 106 150 126T300 120T450 128T520 114V200H0z" fill="#10171a"/><rect y="168" width="520" height="32" fill="${pal.gr}"/><path d="M0 172H520" stroke="#00000055"/>`;
  s += `<path d="M225 200L246 168M295 200L278 168" stroke="#6b5a3a" stroke-width="5" opacity=".6"/>`;
  if (S.ter.fort.o === 'p') s += `<g transform="translate(498 150)"><rect x="-10" y="-34" width="20" height="34" fill="#4d555b" stroke="#1a1d20"/><path d="M-13 -34l13 -11 13 11z" fill="#3a4147"/><path class="st-fl" d="M0 -45v-10l9 3-9 3" fill="${flagCol()}"/></g>`;
  const own = terOwnedV().length; for (let i = 0; i < Math.min(own, 5); i++) s += `<g transform="translate(${22 + i * 13} 194)"><path d="M0 0v-14" stroke="#2a1d10"/><path class="st-fl" d="M0 -14l8 3-8 3z" fill="${flagCol()}"/></g>`;
  s += bSvg('z', b.z, 260, pal, b.z < mx && S.gold >= bcc(b.z), bcc(b.z));
  ['f', 'i', 'b', 'd'].forEach(k => { const can = b[k] < mx && S.gold >= bcc(b[k]); s += bSvg(k, b[k], xs[k], pal, can, bcc(b[k])); });
  s += '</svg>';
  const sel = S.bsel && BNAME[S.bsel] ? S.bsel : null, pr = Math.min(100, Math.round(tot / Math.max(1, 5 * mx) * 100));
  let h = `<section><h2>Satul tău: ${TW.STAGES[st][1]}</h2>${s}<div class="row" style="margin-top:6px"><span class="mute">Progres general: ${tot} niveluri de clădiri (maxim ${5 * mx} la nivelul tău)${nxt ? ' · următorul aspect la ' + nxt[0] : ' · aspect maxim'}</span></div>${bar(tot, Math.max(1, nxt ? nxt[0] : tot))}`;
  if (sel) { const l = b[sel]; h += `<div class="row"><span><b>${BNAME[sel]}</b> nivel ${l}: ${bfx(sel, l)}${l < mx ? `<br><span class="mute">Nivelul ${l + 1}: ${bfx(sel, l + 1)}</span>` : '<br><span class="mute">Nivel maxim pentru nivelul tău.</span>'}<br><span class="mute">${bAspTxt(sel)}</span></span>${l < mx ? `<button class="p" onclick="build('${sel}')"${S.gold >= bcc(l) ? '' : ' disabled'}>${bcc(l)} aur</button>` : ''}</div>` + renRow(sel); }
  else h += '<div class="mute">Atinge o clădire pentru detalii. Săgeata aurie arată ce poți îmbunătăți acum.</div>';
  h += `<div class="row"><span class="mute">Aspect: </span><span><button${S.cos.vt === 'clasic' ? ' class="p"' : ''} onclick="cosSet('clasic')">Clasic</button> <button${S.cos.vt === 'argint' ? ' class="p"' : ''} onclick="cosSet('argint')">Argint${ENT.has('cosm') ? '' : ' (Premium)'}</button></span></div></section>`;
  return h;
}
function vK2() {
  const b = BL();
  return `<section><h2>Clădiri</h2><div class="mute">Nivel maxim al clădirilor la nivelul tău: ${bmax()}.${terB('bld') ? ' Cariera ta reduce costul cu ' + terB('bld') + '%.' : ''}</div>${BN.map(([k, n, d]) => `<div class="row"><span class="bl">${bth(k)}<span><b>${n}</b>, nivel ${b[k]}<br><span class="mute">${bfx(k, b[k])}${b[k] < bmax() ? ' → ' + bfx(k, b[k] + 1) : ''}</span><br><span class="mute">${bAspTxt(k)}</span>${renStage(k) || renOk(k) ? `<br><span class="mute">${renTxt(k)}</span>` : ''}</span></span><button class="p" onclick="build('${k}')"${b[k] >= bmax() ? ' disabled' : ''}>${bcc(b[k])} aur</button></div>`).join('')}</section>
  <section><h2>La ce folosește fiecare resursă</h2><div class="mute"><b>Aur:</b> clădiri, antrenament, recrutare, vindecare, taxe de cucerire și întreținerea teritoriilor.<br><b>Minereu:</b> baza oricărei forjări.<br><b>Materiale:</b> afixele obiectelor (prefixe și sufixe), plus consumabile la ruine și peșteri.<br><b>Cristale:</b> raritatea obiectelor forjate (Magic, Rar, Epic).<br><b>Puncte:</b> ritmul tuturor activităților (uși, raiduri, tabere, locuri de interes).</div></section>` + flagRow();
}
const terStage = () => { const b = BL(), n = Object.values(S.ren || {}).reduce((a, x) => a + x, 0); return TW.STAGES[TW.stage(BN.reduce((s, [k]) => s + (b[k] || 0), 0))][1] + (n ? ' · ★' + n : ''); };

/* ----------------------------------------------------- HARTA: SVG ȘI PANOURI --- */
const TCOL = '#f0d27a';
function terFog() {
  const t = S.ter; let s = '<g>';
  for (let x = 0; x < TW.GW; x++) for (let y = 0; y < TW.GH; y++) {
    if (terCell(x, y)) continue; const adj = terAdj(x, y), cx = x * SMCL, cy = y * SMCL;
    s += `<g class="st-v" onclick="terSel('z',${x},${y})" tabindex="0" role="button" aria-label="Zonă neexplorată"><rect x="${cx}" y="${cy}" width="${SMCL}" height="${SMCL}" fill="#0b0e10" fill-opacity="${adj ? .55 : .72}" stroke="#2a2418" stroke-width=".6" stroke-dasharray="2 3"/>${adj ? `<text x="${cx + SMCL / 2}" y="${cy + SMCL / 2 + 4}" text-anchor="middle" fill="${TCOL}" fill-opacity=".75" style="font:700 14px Cinzel,serif" pointer-events="none">?</text>` : ''}</g>`;
  }
  return s + '</g>';
}
function terIcon(x, y, ic, col, sel, onclick, label, badge) {
  return `<g class="st-v${sel ? ' on' : ''}" onclick="${onclick}" tabindex="0" role="button" aria-label="${label}" transform="translate(${x} ${y})"><circle r="14" fill="transparent"/><circle r="10.5" fill="#12181a" fill-opacity=".92" stroke="${col}" stroke-width="1.4"/><text y="4.2" text-anchor="middle" style="font:13px sans-serif" pointer-events="none">${ic}</text>${badge ? `<g transform="translate(8 -9)"><rect x="-8" y="-5" width="16" height="9" rx="3" fill="#0b0e10" stroke="${col}" stroke-width=".6"/><text y="2" text-anchor="middle" fill="${col}" style="font:700 6.5px Alegreya,serif" pointer-events="none">${badge}</text></g>` : ''}${sel ? `<circle r="15" fill="none" stroke="${TCOL}" stroke-width="1.6"/>` : ''}</g>`;
}
function terMarks() {
  const t = S.ter, sl = S.msel, c = p => [p.x * SMCL + SMCL / 2, p.y * SMCL + SMCL / 2]; let s = '';
  t.poi.forEach(p => { if (!terCell(p.x, p.y)) return; const [x, y] = c(p), T = TW.poiT(p.t), left = poiLeft(p); s += terIcon(x, y, T.ic, left > 0 ? '#6b6755' : '#8fb0c8', sl && sl.k === 'p' && sl.a === p.id, `terSel('p','${p.id}')`, T.nm, left > 0 ? '' : '!'); });
  { const f = t.fort; if (terCell(f.x, f.y)) { const [x, y] = c(f); s += terIcon(x, y, TW.FORT.ic, f.o === 'p' ? TCOL : '#c0504a', sl && sl.k === 'f', `terSel('f')`, TW.FORT.nm, f.o === 'p' ? 'tău' : ''); } }
  t.camps.forEach(cp => { const [x, y] = c(cp), T = TW.camp(cp.t), h = Math.max(1, Math.round((cp.exp - Date.now()) / 3600000)); s += terIcon(x, y, T.ic, '#d4564f', sl && sl.k === 'c' && sl.a === cp.id, `terSel('c','${cp.id}')`, T.nm, '☠'.repeat(T.stars) + ' ' + h + 'h'); });
  return s;
}
function terVil(v, html) {
  let x = ''; if (v.o === 'p') x = `<circle r="29.5" fill="none" stroke="${TCOL}" stroke-width="1.8"/><g transform="translate(-3 -26)"><path d="M0 0v-9" stroke="#2a1d10"/><path class="st-fl" d="M0-9l8 2.6-8 2.6z" fill="${flagCol()}" stroke="#6b4a06" stroke-width=".5"/></g>`;
  else if ((v.lost || 0) > 0) x = `<circle r="29.5" fill="none" stroke="#d4564f" stroke-width="1.4" stroke-dasharray="3 3"/>`;
  return x ? html.replace(/<\/g>$/, x + '</g>') : html;
}
function terPanel() {
  const s = S.msel, t = S.ter; let h = '';
  if (s && s.k === 'z') {
    const adj = terAdj(s.a, s.b);
    h = `<section><h2>Zonă neexplorată</h2><div class="mute">Aici pot fi ruine, peșteri, sanctuare, turnuri sau o fortăreață. Poți explora o zonă doar dacă e vecină cu una deja cunoscută.</div><div class="row"><span>Explorarea dezvăluie zona și vecinele ei. Costă ${TP.explore.cost} punct.</span><button class="p" onclick="explore(${s.a},${s.b})"${adj && S.pts >= TP.explore.cost ? '' : ' disabled'}>Explorează</button></div></section>`;
  } else if (s && s.k === 'p') {
    const p = t.poi.find(x => x.id === s.a); if (p) {
      const T = TW.poiT(p.t), left = poiLeft(p), c = poiCost(p), once = p.t === 'tu';
      h = `<section><h2>${T.ic} ${T.nm}</h2><div class="mute">${T.d}</div><div class="row"><span>Cost: <b>${c} ${c == 1 ? 'punct' : 'puncte'}</b> · ${once ? 'o singură dată' : 'revine după ' + T.cd + ' h'}<br><span class="mute">Alegerile din expediție au risc afișat clar. Nu pierzi niciodată nimic din depozit.${p.t === 'pe' ? ' Vena se epuizează dacă o storci des (până la −50%).' : ''}</span></span><button class="p" onclick="poiGo('${p.id}')"${left > 0 || S.pts < c || S.ex || S.d ? ' disabled' : ''}>${once ? 'Urcă în turn' : 'Intră'}</button></div>${left > 0 ? `<div class="mute">${once ? 'Ai urcat deja în acest turn.' : 'Epuizat acum. Revine peste ' + tDur(left) + '.'}</div>` : ''}</section>`;
    }
  } else if (s && s.k === 'c') {
    const cp = t.camps.find(x => x.id === s.a); if (cp) {
      const T = TW.camp(cp.t), r = T.rw, lv = cp.lv, rw = [Math.round(TW.rawGold(lv) * r.g) + ' aur'];
      if (r.mats) rw.push(r.mats + ' materiale'); (r.cr || []).forEach(([k, n, p]) => rw.push(Math.round(p * 100) + '% ' + n + ' × ' + mn(k))); if (r.item) rw.push('un obiect ' + (r.item[0] == r.item[1] ? QN[0] && ['', 'Magic', 'Rar', 'Epic'][r.item[0]] : 'Magic sau Rar')); if (r.merc) rw.push('un mercenar de rang superior'); if (r.relic) rw.push('o relicvă');
      const left = cp.exp - Date.now(), cost = campCost(cp);
      h = `<section><h2>${T.ic} ${T.nm}</h2><div class="row"><span>Nivel ${lv} · risc <b class="r4">${'☠'.repeat(T.stars)}</b> · ${T.fights} lupte<br><span class="mute">Inamici: ${T.en.join(', ')}. ${T.why}</span></span></div><div class="row"><span>Recompense (la căderea căpitanului): <b>${rw.join(', ')}</b></span></div><div class="row"><span class="mute">Pleacă peste <span data-end="${cp.exp}">${tDur(left)}</span> · încercări rămase: ${TP.camp.retries - cp.att}/${TP.camp.retries} · recompensa nu poate fi cerută de două ori</span><button class="p" onclick="campGo('${cp.id}')"${S.pts < cost || S.d || cp.att >= TP.camp.retries ? ' disabled' : ''}>Atacă (${cost} p)</button></div></section>`;
    }
  } else if (s && s.k === 'f') {
    const f = t.fort, c = fortCheck();
    h = `<section><h2>${TW.FORT.ic} ${TW.FORT.nm}</h2><div class="mute">Fortăreața Regelui pe marginea ținutului: 3 lupte (poartă, curte, castelan), fără odihnă între ele.</div><div class="row"><span>Beneficiu: <b>${TW.FORT.bd}</b></span></div>` +
      (f.o === 'p' ? `<div class="row"><span style="color:var(--gold2)"><b>În stăpânirea ta</b>${f.sg > Date.now() ? ' · protejat încă ' + tDur(f.sg - Date.now()) : ''}</span><span class="mute">Întreținere ${Math.round(TW.upk(S.lvl, 3, TP, f.g) * TP.fort.upkMul)} aur/zi</span></div>` + garRow('f', f) + abRow('f', 0)
        : (f.lost ? '<div class="r4">Pierdut: recucerire cu taxă redusă și apărători mai slabi.</div>' : '') + c.a.map(x => `<div class="${x.ok ? 'r2' : 'r4'}" style="font-size:15px">${x.ok ? '✔' : '✖'} ${x.t}</div>`).join('') + `<div class="row"><span class="mute">Eșecul nu pierde progresul campaniei.</span><button class="p" onclick="fortGo()"${c.ok ? '' : ' disabled'}>${c.re ? 'Recucerește' : 'Asediază'}</button></div>`) + '</section>';
  }
  return h || '<p class="mute">Atinge un sat, o tabără sau un loc de pe hartă ca să-l vezi. Zonele întunecate se explorează.</p>';
}
function terLegend() {
  return `<div class="st-lg"><span>🏛⛏✦🛒🗼 locuri de interes</span><span><i style="background:#d4564f"></i>tabere (cu timp limitat)</span><span><i style="background:${TCOL}"></i>teritoriile tale</span><span>? zonă de explorat</span></div>`;
}
function terTabs() {
  const k = S.mt || 'h', r = cmpReady();
  return `<div class="tabs">${[['h', 'Regiunea'], ['l', 'Lumea'], ['k', 'Campanie' + (r ? ' ●' : '')], ['t', 'Teritorii']].map(([x, n]) => `<button${x == k ? ' class="p"' : ''} onclick="mtab('${x}')">${n}</button>`).join('')}</div>`;
}
function mtab(k) { S.mt = k; S.msg = ''; go(); }
function vTer() {
  const t = S.ter, own = terOwnedV(), d = terDaily();
  const lines = ['gold', 'mat', 'bld', 'forge', 'pts', 'trav'].map(k => { const b = terB(k), T = TP.terr[k]; return b || k !== 'trav' && true ? `<div class="row"><span>${TW.TIPN[k][0].toUpperCase() + TW.TIPN[k].slice(1)}</span><span><b>${k === 'pts' ? '+' + b : (k === 'bld' || k === 'forge' ? '−' : '+') + b + '%'}</b> <span class="mute">/ limita ${k === 'pts' ? '+' + T.cap : T.cap + '%'}</span></span></div>` : ''; }).join('');
  let h = `<section><h2>Bonusuri active</h2><div class="mute">Se calculează doar din teritoriile în stăpânire și întreținute. Al doilea bonus de același tip valorează ${Math.round(TP.terr.dim * 100)}%, al treilea ${Math.round(TP.terr.dim * TP.terr.dim * 100)}%, și fiecare tip are o limită.</div>${lines}`;
  h += `<div class="row"><span>Întreținere: <b>${d} aur/zi</b>${t.debt ? ` · <b class="r4">datorie ${t.debt} aur: bonusurile sunt suspendate</b>` : ''}</span>${t.debt ? `<button class="p" onclick="terPay()">Plătește</button>` : ''}</div><div class="mute">Întreținerea se plătește automat din aur, o dată pe zi. Dacă nu ai aur, bonusurile se opresc, dar teritoriile nu se pierd din cauza asta. Absența nu costă mai mult de ${TP.upkeep.maxDays} zile.</div></section>`;
  h += `<section><h2>Sate (${own.length}/${S.map.vs.length})</h2>` + S.map.vs.map(v => { const I = vInfoT(v), o = v.o === 'p'; return `<div class="row"><span><b>${I.nm}</b> <span class="mute">(${v.n}, ${o ? 'al tău' : (v.lost ? 'pierdut' : 'NPC: ' + v.b)})</span><br><span class="mute">${terBTxt(I.tip, I.tier)}${o ? ' · garnizoană ' + (v.g || 0) + '/' + TP.gar.max + ' · întreținere ' + TW.upk(tLvl(v), I.tier, TP, v.g) + '/zi' : ''}</span></span><span><button onclick="tab('m');mtab('h');mv(${v.id})">Pe hartă</button></span></div>`; }).join('') + '</section>';
  const f = t.fort; h += `<section><h2>${TW.FORT.ic} ${TW.FORT.nm}</h2><div class="row"><span>${f.o === 'p' ? '<b style="color:var(--gold2)">În stăpânirea ta</b>' : !t.dsc.fort ? 'Nedescoperit' : f.lost ? '<b class="r4">Pierdut</b>' : 'Descoperit, necucerit'}<br><span class="mute">${TW.FORT.bd}</span></span><button onclick="tab('m');mtab('h');terSel('f')"${t.dsc.fort ? '' : ' disabled'}>Pe hartă</button></div></section>`;
  h += `<section><h2>Reguli</h2><div class="mute">• Cucerirea cere raiduri reușite, iscodire, taxă și 3 lupte mai grele decât un raid.<br>• Un sat cucerit e protejat ${TP.conq.immuneH} h. Dacă o oaste inamică îți sparge apărarea, poate ocupa un teritoriu (cel mult unul la ${TP.seize.cdH} h; zidul scade șansa). Poți recuceri mai ieftin și fără raiduri.<br>• Bonusul se acordă cât timp ai satul, nu la cucerire: nu poate fi încasat de două ori. Recompensa de primă cucerire se dă o singură dată pe sat.<br>• Satele din regiunea ta sunt controlate de NPC. Atacurile între jucători sunt în Lumea și nu pot cuceri teritorii.</div></section>`;
  h += `<section><h2>Jurnal</h2>${t.lg.map(x => `<div class="mute">${tEsc(x)}</div>`).join('') || '<p class="mute">Nimic încă.</p>'}</section>`;
  return h;
}
function vM() {
  if (S.mt === 'b') S.mt = 'h';   /* clasamentul s-a mutat în bara de sus */
  terTick(); const k = S.mt || 'h', tabs = terTabs();
  if (k === 'k') return tabs + vCamp();
  if (k === 'l') return tabs + vLume();
  if (k === 't') return tabs + vTer();
  let h = vMmap();
  h = h.replace('<p class="mute">Atinge un sat ca să-l vezi.</p>', terPanel());
  const i = h.indexOf('</section>'); if (i > 0) h = h.slice(0, i) + terLegend() + h.slice(i);
  return tabs + (S.ex ? vEx() : '') + h;
}

/* ===================================================================================
   SINK-URI DE AUR: garnizoane, renunțare, negustor de lux, schimb în cristale, renovări, steaguri
   (toate se plătesc doar cu aur câștigat; Premium nu intră în nicio formulă de aici)
   =================================================================================== */
/* ---- garnizoane ---- */
function garRow(kind, o) {
  const tier = kind === 'f' ? 3 : vInfoT(o).tier, g = o.g || 0, c = TW.garCost(S.lvl, tier, g, TP), id = kind === 'f' ? 0 : o.id;
  const eff = `−${Math.round(TP.gar.seizeRelief * 100)}% șansa de ocupare${kind === 'f' ? '' : `, +${Math.round(TP.gar.bonusK * 100)}% din bonusul satului (în limita plafonului)`}, +${Math.round(TP.gar.upkK * 100)}% întreținere, pe nivel. Dacă teritoriul e ocupat, pierzi ${TP.gar.loseOnSeize} niveluri.`;
  return `<div class="row"><span>Garnizoană: <b>${g}/${TP.gar.max}</b><br><span class="mute">${eff}</span></span>${c == null ? '<span class="mute">Maxim</span>' : `<button onclick="garBuy('${kind}',${id})"${S.gold >= c ? '' : ' disabled'}>${c} aur</button>`}</div>`;
}
function garBuy(kind, id) {
  terInit(); const o = kind === 'f' ? S.ter.fort : S.map.vs.find(x => x.id === id);
  if (!o || o.o !== 'p') { S.msg = 'Poți întări doar un teritoriu al tău.'; return go(); }
  const tier = kind === 'f' ? 3 : vInfoT(o).tier, g = o.g || 0, c = TW.garCost(S.lvl, tier, g, TP);
  if (c == null) { S.msg = 'Garnizoana e la nivel maxim.'; return go(); }
  if (S.gold < c) { S.msg = 'Îți trebuie ' + c + ' aur.'; return go(); }
  S.gold -= c; o.g = g + 1; terLog('Garnizoană ' + o.g + '/' + TP.gar.max + (kind === 'f' ? ' la ' + TW.FORT.nm : ' la ' + o.n) + ' (−' + c + ' aur).'); S.msg = 'Garnizoana a fost întărită la nivelul ' + o.g + '.'; go();
}
function abRow(kind, id) {
  return `<div class="row"><span class="mute">Renunți la stăpânire: oprești întreținerea și pierzi garnizoana. Ca să-l ai din nou cucerești de la zero (taxă întreagă și cerințe).</span><button onclick="terAbandon('${kind}',${id})">Renunță</button></div>`;
}
function terAbandon(kind, id) {
  terInit(); const o = kind === 'f' ? S.ter.fort : S.map.vs.find(x => x.id === id);
  if (!o || o.o !== 'p') { S.msg = 'Nu e al tău.'; return go(); }
  if (typeof confirm === 'function' && !confirm('Renunți la ' + (kind === 'f' ? TW.FORT.nm : o.n) + '? Garnizoana se pierde și va trebui să-l cucerești din nou.')) return;
  o.o = 'n'; o.g = 0; o.lost = 0; o.sg = 0; terLog('Ai renunțat la ' + (kind === 'f' ? TW.FORT.nm : o.n) + '.'); S.msg = 'Ai renunțat la stăpânire. Întreținerea s-a oprit.'; go();
}

/* ---- negustor de lux + schimb aur → cristale ---- */
const luxP = it => TW.luxPrice(ip(it), it.q, TP);
function luxGen() {
  const M = TP.mkt, L = Math.max(1, S.lvl), Wr = TW.luxRarW(L, TP), qw = {}; M.luxQw.forEach((w, i) => { qw[i] = w; });
  const wp = o => { const t = Object.values(o).reduce((a, b) => a + b, 0); let x = Math.random() * t; for (const k in o) { x -= o[k]; if (x <= 0) return +k; } return +Object.keys(o)[0]; };
  return ['w', 'a', 'h', 'b', 'j'].sort(() => Math.random() - .5).slice(0, M.luxN).map(t => mkItem(t, L, wp(Wr), undefined, undefined, wp(qw)));
}
/* marfa zilei: se generează o singură dată pe zi (și la fiecare schimb plătit) și se salvează, deci reîncărcarea nu o schimbă */
function mktRoll() {
  const m = S.mkt, d = dk();
  if (m.day !== d) { m.day = d; m.bought = {}; m.rr = 0; m.lux = []; m.gen = ''; }
  const gk = d + ':' + m.rr; if (S.lvl >= TP.mkt.luxMinLv && m.gen !== gk) { m.lux = luxGen(); m.gen = gk; }
}
function luxBuy(i) {
  terInit(); mktRoll(); const it = S.mkt.lux[i];
  if (S.lvl < TP.mkt.luxMinLv) { S.msg = 'Negustorul de lux apare la nivelul ' + TP.mkt.luxMinLv + '.'; return go(); }
  if (!it) { S.msg = 'Obiectul nu mai e disponibil.'; return go(); }
  const c = luxP(it); if (S.gold < c) { S.msg = 'Îți trebuie ' + c + ' aur.'; return go(); }
  S.gold -= c; S.mkt.lux.splice(i, 1); S.inv.push(it); S.msg = 'Ai cumpărat ' + it.name + '.'; go();
}
function luxRe() {
  terInit(); mktRoll(); if (S.lvl < TP.mkt.luxMinLv) return go();
  const c = TW.luxReroll(S.lvl, S.mkt.rr, TP); if (S.gold < c) { S.msg = 'Îți trebuie ' + c + ' aur.'; return go(); }
  S.gold -= c; S.mkt.rr++; mktRoll(); S.msg = 'Negustorul a adus marfă nouă.'; go();
}
function crBuy(r, q) {
  terInit(); mktRoll(); const key = RM[r] + q, minLv = TP.mkt.crMinLv[r - 1];
  if (!(r >= 1 && r <= 3 && q >= 0 && q <= 3)) return go();
  if (S.lvl < minLv) { S.msg = 'Disponibil de la nivelul ' + minLv + '.'; return go(); }
  const n = S.mkt.bought[key] || 0; if (n >= TW.crLim(q, TP)) { S.msg = 'Ai atins limita zilnică pentru acest cristal.'; return go(); }
  if (have(key) >= cap()) { S.msg = 'Depozitul e plin pentru acest cristal.'; return go(); }
  const c = TW.crPrice(S.lvl, r, q, TP); if (S.gold < c) { S.msg = 'Îți trebuie ' + c + ' aur.'; return go(); }
  S.gold -= c; S.mkt.bought[key] = n + 1; give(key, 1); S.msg = 'Ai cumpărat ' + MA[RM[r]] + ' (' + QN[q] + ').'; go();
}
function vLux() {
  terInit(); mktRoll(); const M = TP.mkt, m = S.mkt;
  let h = `<section><h2>Negustorul de lux</h2><div class="mute">Obiecte de calitate superioară, plătite doar cu aur. Marfa se schimbă în fiecare zi; prețul crește mult cu calitatea obiectului.</div>`;
  if (S.lvl < M.luxMinLv) h += `<p class="mute">Apare la nivelul ${M.luxMinLv}.</p>`;
  else {
    h += m.lux.length ? m.lux.map((it, i) => `<div class="row"><span class="ic-n"${itTipA(it)}>${iname(it)}</span><button class="p" onclick="luxBuy(${i})"${S.gold >= luxP(it) ? '' : ' disabled'}>${luxP(it)} aur</button></div>`).join('') : '<p class="mute">Stoc epuizat azi. Revine mâine.</p>';
    const rc = TW.luxReroll(S.lvl, m.rr, TP); h += `<div class="row"><span class="mute">Marfă nouă acum (schimburi azi: ${m.rr}; fiecare costă mai mult)</span><button onclick="luxRe()"${S.gold >= rc ? '' : ' disabled'}>${rc} aur</button></div>`;
  }
  h += '</section><section><h2>Schimb de cristale</h2><div class="mute">Cumperi cristale cu aur, la un curs prost și cu limită zilnică; pentru obținere obișnuită, raidurile și temnițele rămân mai avantajoase. Calitățile superioare dau obiecte mai puternice.</div>';
  for (let r = 1; r <= 3; r++) {
    const minLv = M.crMinLv[r - 1]; h += `<div style="margin-top:6px"><b>${MA[RM[r]]}</b> <span class="mute">(${RAR[r].n})${S.lvl < minLv ? ' · de la nivelul ' + minLv : ''}</span></div>`;
    if (S.lvl >= minLv) for (let q = 0; q <= 3; q++) { const key = RM[r] + q, left = TW.crLim(q, TP) - (m.bought[key] || 0), c = TW.crPrice(S.lvl, r, q, TP); h += `<div class="row"><span>${QN[q]} <span class="mute">· în depozit ${have(key)}/${cap()} · azi mai poți ${left}</span></span><button onclick="crBuy(${r},${q})"${left > 0 && S.gold >= c && have(key) < cap() ? '' : ' disabled'}>${c} aur</button></div>`; }
  }
  return h + '</section>';
}

/* ---- renovări de prestigiu (cosmetice) ---- */
const renStage = k => Math.max(0, Math.min(TP.ren.max, Math.floor(+((S.ren || {})[k]) || 0)));
const renOk = k => BART.keys().includes(k) && renStage(k) < TP.ren.max && bLevel(k) >= TP.ren.unlock[renStage(k)];
function renTxt(k) {
  const st = renStage(k), lv = bLevel(k); if (st >= TP.ren.max) return '★'.repeat(st) + ' Renovare de prestigiu completă';
  const need = TP.ren.unlock[st]; return lv >= need ? `Renovare de prestigiu ${st + 1}/${TP.ren.max}: ${TW.renCost(S.lvl, st, TP)} aur` : `Renovare ${st + 1}/${TP.ren.max} de la nivelul ${need} (încă ${need - lv})`;
}
function renRow(k) {
  const st = renStage(k), c = TW.renCost(S.lvl, st, TP);
  return `<div class="row"><span class="mute">${(st && st < TP.ren.max ? '★'.repeat(st) + ' ' : '') + renTxt(k)}<br>Cosmetică: steaguri, strălucire și scântei pe clădire. Nu schimbă puterea sau producția.</span>${renOk(k) ? `<button onclick="renBuy('${k}')"${S.gold >= c ? '' : ' disabled'}>${c} aur</button>` : ''}</div>`;
}
function renBuy(k) {
  terInit(); if (!renOk(k)) { S.msg = 'Renovarea nu e disponibilă acum.'; return go(); }
  const st = renStage(k), c = TW.renCost(S.lvl, st, TP); if (S.gold < c) { S.msg = 'Îți trebuie ' + c + ' aur.'; return go(); }
  S.gold -= c; S.ren[k] = st + 1; BUP[k] = Date.now(); S.msg = `✦ ${BNAME[k]}: renovare de prestigiu ${st + 1}/${TP.ren.max}!`; go();
}
/* decor vectorial peste imagine: treapta 1 steaguri, 2 + strălucire, 3 + scântei */
function renGlow(st, w, h, lx) { return st >= 2 ? `<ellipse cx="${lx}" cy="${-h * .42}" rx="${(w * .62).toFixed(1)}" ry="${(h * .6).toFixed(1)}" fill="url(#renG)" pointer-events="none"/>` : ''; }
function renDeco(st, w, h, lx) {
  if (st < 1) return ''; const col = flagCol(); let o = '';
  [-1, 1].forEach(sd => { o += `<g transform="translate(${(lx + sd * w * .4).toFixed(1)} ${(-h * .74).toFixed(1)})" pointer-events="none"><path d="M0 0v-15" stroke="#2a1d10" stroke-width="1.2"/><path class="st-fl" d="M0 -15l${sd * 9} 3l${-sd * 9} 3z" fill="${col}"/></g>`; });
  if (st >= 3) for (let i = 0; i < 3; i++) o += `<path class="tw" style="animation-delay:${i * .5}s" transform="translate(${(lx + (i - 1) * w * .3).toFixed(1)} ${(-h * (.95 - i * .12)).toFixed(1)})" d="M0 -3L.9 -.9 3 0 .9 .9 0 3 -.9 .9 -3 0 -.9 -.9z" fill="#f6e3a0" pointer-events="none"/>`;
  return o;
}

/* ---- steaguri (cosmetic, cu aur) ---- */
const flagCol = () => (TW.FLAGS.find(f => f.id === (S && S.cos && S.cos.flag)) || TW.FLAGS[0]).col;
function flagBuy(id) {
  terInit(); const f = TW.FLAGS.find(x => x.id === id); if (!f) return go();
  if (!S.cos.own[id]) { const c = TW.flagCost(S.lvl, id); if (S.gold < c) { S.msg = 'Îți trebuie ' + c + ' aur.'; return go(); } S.gold -= c; S.cos.own[id] = 1; S.msg = 'Steag ' + f.nm.toLowerCase() + ' cumpărat.'; }
  S.cos.flag = id; go();
}
function flagRow() {
  return `<section><h2>Steagul tău</h2><div class="mute">Culoarea steagurilor de pe clădiri, din capitală și de pe teritorii. Doar cosmetic, plătit cu aur.</div><div class="row" style="flex-wrap:wrap;gap:6px">${TW.FLAGS.map(f => { const own = !!S.cos.own[f.id], c = TW.flagCost(S.lvl, f.id); return `<button${S.cos.flag === f.id ? ' class="p"' : ''} onclick="flagBuy('${f.id}')" title="${own ? 'Alege' : 'Cumpără'}"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${f.col};border:1px solid #000;vertical-align:-1px"></span> ${f.nm}${own ? '' : ' · ' + c + ' aur'}</button>`; }).join('')}</div></section>`;
}

if (typeof document !== 'undefined' && typeof Image !== 'undefined') artPreload();
