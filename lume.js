/* ============================================================================
   Silver Throne — lume.js
   Lumea comună: satele reale ale jucătorilor pe o hartă care crește odată cu numărul lor,
   atacuri între jucători (cu bara de atacuri care se reface singură), clasament și profiluri.

   Serverul (funcțiile world_* din supabase/02-lume.sql) dă locurile pe hartă, ține bara de atacuri,
   pauzele și evidența. Lupta se calculează aici, cu fantoma apărătorului (exact ca la Tron),
   iar prada o calculează jocul atacatorului: apărătorul nu pierde nimic.

   Se încarcă după tron.js (folosește tronRpc, tronUnits, tronGhostUnits, TT) și înainte de cont.js.
   Cârlige în joc: rl() și terRl() → lumeWin(d); go() → lumeCheck(); terTabs()/vM() → subfilele Lumea și Clasament.
   ========================================================================== */
const LW = {
  /* doar pentru afișare până sosesc valorile serverului (world_cfg); serverul decide */
  CFG: { en_max: 18, en_regen_min: 80, same_h: 6, min_level: 5 },
  CELL: 120,                     /* distanța dintre două locuri vecine pe hartă (unități SVG) */
  BOARD: [['level', 'Nivel'], ['power', 'Putere'], ['terr', 'Teritorii'], ['tron', 'Domnii la Tron']]
};
const LUME = { st: null, at: 0, off: 0, err: '', loading: false, busy: false, rep: false, repErr: '', pubSig: '', pubAt: 0,
  board: {}, bAt: {}, bLoad: {}, bErr: '', bk: 'level', sel: null, full: null, cam: null, camInit: false, noClick: 0, terr: null };

const lwNow = () => Date.now() + (LUME.off || 0);
const lwCfg = () => (LUME.st && LUME.st.cfg) || LW.CFG;
const lwF = n => Math.round(n * 10) / 10;
const lwNum = n => Math.round(+n || 0).toLocaleString('ro-RO');
function lwInit() { if (typeof S === 'undefined' || !S) return; if (!S.wr || typeof S.wr !== 'object') S.wr = { cur: null }; const c = S.wr.cur; if (c && (typeof c !== 'object' || !Number.isFinite(+c.id))) S.wr.cur = null; }
function lwHash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function lwRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function lwAgo(ms) { const s = Math.max(0, (lwNow() - ms) / 1000); if (s < 90) return 'chiar acum'; const m = s / 60; if (m < 60) return 'acum ' + Math.round(m) + ' min'; const h = m / 60; if (h < 24) return 'acum ' + Math.round(h) + ' h'; const d = Math.round(h / 24); return 'acum ' + d + (d === 1 ? ' zi' : ' zile'); }
const lwDate = ms => new Date(ms).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });

/* ------------------------------------------------------------------ INSTANTANEUL TĂU */
/* ce văd ceilalți: numele și nivelul eroului, puterea, satul, teritoriile, titlul și echipa (aceeași ca la Tron) */
function lwSnap() {
  const h = S.fs.find(f => f.h) || S.fs[0], units = tronUnits(), b = BL(), tot = BN.reduce((s, [k]) => s + (b[k] || 0), 0), si = TW.stage(tot);
  const own = S.map ? terOwnedV().length : 0, fort = S.ter && S.ter.fort && S.ter.fort.o === 'p' ? 1 : 0;
  return { name: h.n, level: S.lvl, power: Math.round(TT.power(units)), territories: own + fort, stage: si, stage_name: TW.STAGES[si][1],
    title: (S.tron && S.tron.title) || '', hero: { n: h.n, c: h.c }, units };
}

/* ------------------------------------------------------------------ SERVER */
async function lwSync0(force) {
  if (typeof CONT === 'undefined' || !CONT.user) { LUME.err = 'Conectează-te la cont.'; return; }
  LUME.loading = true;
  try {
    lwInit();
    const snap = lwSnap(), sig = JSON.stringify(snap);
    let r;
    if (force || !LUME.st || !LUME.st.me || sig !== LUME.pubSig || Date.now() - LUME.pubAt > 18e5) {
      r = await tronRpc('world_join', { p: snap });
      if (!r.error) { LUME.pubSig = sig; LUME.pubAt = Date.now(); }
    } else r = await tronRpc('world_get');
    if (r.error) { LUME.err = /Could not find the function|does not exist|schema cache/i.test(r.error) ? 'Serverul nu are încă Lumea: rulează supabase/02-lume.sql în Supabase.' : r.error; return; }
    LUME.err = ''; LUME.st = r.data; LUME.off = r.data.now - Date.now(); LUME.terr = null;
  } catch (e) { LUME.err = String((e && e.message) || e); }
  finally { LUME.at = Date.now(); LUME.loading = false; lwUi(); }
}
let _lwSync = null;
function lwSync(force) { if (_lwSync) return _lwSync; _lwSync = lwSync0(force).finally(() => { _lwSync = null; }); return _lwSync; }
function lwOnWorld() { return S && S.tab === 'm' && (S.mt === 'l' || S.mt === 'b'); }
function lwUi() { try { if (lwOnWorld()) render(); else if (typeof hdr === 'function') hdr(); } catch (e) { /* se reface la următoarea acțiune */ } }

/* bara de atacuri: se reface câte unul la en_regen_min minute, până la en_max */
function lwEn() {
  const st = LUME.st; if (!st || !st.me) return null;
  const c = lwCfg(), max = +c.en_max, per = c.en_regen_min * 6e4, v = Math.min(max, st.me.en + (lwNow() - st.me.en_at) / per), n = Math.floor(v + 1e-9);
  return { v, n, max, next: n >= max ? 0 : (n + 1 - v) * per };
}

/* ------------------------------------------------------------------ ATAC */
function lwCan(p) {
  const st = LUME.st, c = lwCfg(), me = st && st.me, en = lwEn();
  if (!me) return { ok: false, why: 'Se încarcă…' };
  if (p.id === me.user_id) return { ok: false, why: 'Acesta e satul tău.' };
  if (S.lvl < c.min_level) return { ok: false, why: `Poți ataca alți jucători de la nivelul ${c.min_level}.` };
  if (p.level < c.min_level) return { ok: false, why: `${tEsc(p.name)} e începător (sub nivelul ${c.min_level}) și e protejat.` };
  if (p.cd && p.cd > lwNow()) return { ok: false, why: `L-ai atacat recent. Poți din nou peste ${sdT(p.cd - lwNow())}.` };
  if (en && en.n < 1) return { ok: false, why: `Nu mai ai atacuri. Următorul se reface peste <span data-end="${Date.now() + en.next}">${fmt(en.next)}</span>.` };
  if (S.d) return { ok: false, why: 'Ești deja într-o luptă.' };
  if (S.wr && S.wr.cur) return { ok: false, why: 'Se trimite rezultatul atacului anterior…' };
  if (!S.fs.some(f => f.hp > 0)) return { ok: false, why: 'Toți luptătorii sunt căzuți. Du-i la infirmerie.' };
  return { ok: true, why: '' };
}
async function lwAttack(id) {
  if (LUME.busy) return; lwInit();
  const p = LUME.st && LUME.st.players.find(x => x.id === id);
  if (!p) { S.msg = 'Jucătorul nu mai e pe hartă.'; return go(); }
  const can = lwCan(p); if (!can.ok) { S.msg = can.why.replace(/<[^>]+>/g, ''); return go(); }
  LUME.busy = true; if (typeof lgClose === 'function') lgClose();
  try {
    if (JSON.stringify(lwSnap()) !== LUME.pubSig) await lwSync(true);       /* serverul să-ți știe nivelul de acum */
    const r = await tronRpc('world_raid_start', { p_target: id });
    if (r.error) { S.msg = r.error; await lwSync(); return; }
    if (LUME.st && LUME.st.me) { LUME.st.me.en = r.data.en; LUME.st.me.en_at = lwNow(); }
    S.wr.cur = { id: r.data.id, uid: id, name: r.data.name, win: false, gold: 0, xp: 0 };
    lwFight(r.data);
  } finally { LUME.busy = false; if (!S.d) go(); }
}
function lwFight(data) {
  const g = (data.units || []).map(u => TT.ghostUnit(u));
  const d = { room: 1, rooms: 1, k: 1, rw: 0, bn: data.name, di: 0, raid: -4, rn: 'satul lui ' + data.name, lbl: 'Atac', lume: 1, dlv: data.level,
    rf: 1, fx: 1, loot: { gold: 0, ore: 0, xp: 0, m: {} }, f: null, done: false, em: { ghost: 1 }, ghost: g };
  S.d = d; startF(true); terFrom(); S.tab = 'c'; S.msg = 'Ataci satul lui ' + data.name + '. Apărarea lui e o fantomă a echipei sale.';
  if (S.auto !== false) { autoRun(); return; } go();
}
/* victorie (apelat din terRl): prada o calculează jocul, ca la un raid pe un sat-bot de nivelul apărătorului.
   Un apărător mult mai slab dă mai puțin (fac), ca să nu merite vânați începătorii. Experiența e cu 50% mai mare. */
function lumeWin(d) {
  const A = Math.max(1, S.lvl), D = Math.max(1, +d.dlv || 1), vl = Math.min(D, A + 5), fac = Math.max(0.3, Math.min(1.2, D / A)), L = d.loot;
  L.gold += Math.round((60 + 30 * vl) * fac * (1 + terB('gold') / 100));
  L.ore += Math.round((6 + vl * 0.8) * fac);
  L.xp += Math.round((20 + 8 * vl) * fac * 1.5);
  for (let i = 0, n = Math.round(RI(2, 4) * fac); i < n; i++) lm(pm(), 1);
  if (Math.random() < 0.5 * fac) rdrop(false);
  lwInit(); if (S.wr.cur) { S.wr.cur.win = true; S.wr.cur.gold = L.gold; S.wr.cur.xp = L.xp; }
  d.cm = 'Ai învins apărarea satului lui ' + d.bn + '!';
}
/* apelat din go(): după luptă trimite rezultatul; reîncearcă dacă pică internetul */
function lumeCheck() {
  lwInit(); const c = S.wr.cur; if (!c || LUME.rep) return;
  if (S.d && S.d.lume) { if (!S.d.done) return; c.win = true; }
  else if (!c.win && !c.told) { c.told = 1; if (!S.fs.some(f => f.hp > 0)) S.msg = `Atacul asupra satului lui ${c.name} a eșuat: echipa ta a căzut. Du-ți luptătorii la infirmerie.`; }
  lwReport(c);
}
async function lwReport(c) {
  LUME.rep = true;
  try {
    const r = await tronRpc('world_raid_finish', { p_id: c.id, p_win: !!c.win, p_gold: c.gold | 0, p_xp: c.xp | 0 });
    if (r.error && !/necunoscut/i.test(r.error)) { LUME.repErr = r.error; return; }
    LUME.repErr = ''; if (S.wr.cur && S.wr.cur.id === c.id) S.wr.cur = null; save();
  } finally { LUME.rep = false; }
  await lwSync(); LUME.board = {};
}

/* ------------------------------------------------------------------ HARTA LUMII */
function lwPos(p) { const h = lwHash(p.id), jx = ((h & 255) / 255 - 0.5) * 44, jy = (((h >>> 8) & 255) / 255 - 0.5) * 34; return [p.x * LW.CELL + jx, p.y * LW.CELL * 0.82 + jy]; }
const lwVB = () => { const c = LUME.cam || LUME.full; return `${lwF(c.x)} ${lwF(c.y)} ${lwF(c.w)} ${lwF(c.h)}`; };
function lwClamp(c) {
  const F = LUME.full; c.w = Math.min(F.w, Math.max(F.w / 8, Math.max(260, c.w))); c.w = Math.min(c.w, F.w); c.h = c.w * F.h / F.w;
  c.x = Math.min(F.x + F.w - c.w, Math.max(F.x, c.x)); c.y = Math.min(F.y + F.h - c.h, Math.max(F.y, c.y)); return c;
}
function lwApply() { const s = document.getElementById('lwmap'); if (s) s.setAttribute('viewBox', lwVB()); }
function lwZoom(k, fx = 0.5, fy = 0.5) { if (!LUME.full) return; const c = Object.assign({}, LUME.cam || LUME.full), px = c.x + fx * c.w, py = c.y + fy * c.h; c.w /= k; c.h = c.w * LUME.full.h / LUME.full.w; c.x = px - fx * c.w; c.y = py - fy * c.h; LUME.cam = lwClamp(c); lwApply(); }
function lwReset() { LUME.cam = null; lwApply(); }
const lwNarrow = () => typeof window !== 'undefined' && window.innerWidth < 600;
function lwCenter(p) { if (!p || !LUME.full) return; const [x, y] = lwPos(p), F = LUME.full, w = Math.min(F.w, lwNarrow() ? 480 : 760); LUME.cam = lwClamp({ x: x - w / 2, y: y - w * F.h / F.w / 2, w, h: w * F.h / F.w }); }
function lwPick(id) { if (Date.now() - LUME.noClick < 250) return; LUME.sel = LUME.sel === id ? null : id; S.msg = ''; render(); }
function lwFind() { const st = LUME.st, me = st && st.me && st.players.find(p => p.id === st.me.user_id); if (me) { LUME.sel = me.id; lwCenter(me); render(); } }

/* teren: copaci, drumuri spre interior; se recalculează doar când se schimbă jucătorii */
function lwTerrain(ps, F) {
  const key = ps.map(p => p.id + p.x + ',' + p.y).join('|') + '|' + Math.round(F.w);
  if (LUME.terr && LUME.terr.key === key) return LUME.terr.svg;
  const cell = new Map(ps.map(p => [p.x + ',' + p.y, p])), pos = new Map(ps.map(p => [p.id, lwPos(p)]));
  let s = `<rect x="${lwF(F.x - 400)}" y="${lwF(F.y - 400)}" width="${lwF(F.w + 800)}" height="${lwF(F.h + 800)}" fill="url(#st-bg)"/>`;
  /* drumuri: fiecare sat se leagă de vecinul de pe inelul dinăuntru (sau de Tron), deci rețeaua crește odată cu harta */
  let roads = '';
  for (const p of ps) {
    let x = p.x, y = p.y, par = null;
    while (x || y) { const r = Math.max(Math.abs(x), Math.abs(y)); if (Math.abs(x) === r) x -= Math.sign(x); if (Math.abs(y) === r) y -= Math.sign(y); par = cell.get(x + ',' + y); if (par) break; }
    const [ax, ay] = pos.get(p.id), [bx, by] = par ? pos.get(par.id) : [0, 0], rg = lwRng(lwHash(p.id) ^ 77), mx = (ax + bx) / 2 + (rg() - 0.5) * 30, my = (ay + by) / 2 + (rg() - 0.5) * 30;
    const d = `M${lwF(ax)} ${lwF(ay)}Q${lwF(mx)} ${lwF(my)} ${lwF(bx)} ${lwF(by)}`;
    roads += `<path d="${d}" fill="none" stroke="#3a2f1d" stroke-opacity=".55" stroke-width="5" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#a68a5b" stroke-opacity=".55" stroke-width="2" stroke-linecap="round" stroke-dasharray="7 5"/>`;
  }
  /* copaci și dealuri, departe de sate și de Tron */
  let trees = ''; const rg = lwRng(9173), sy = LW.CELL * 0.82;
  for (let y = F.y - 40; y < F.y + F.h + 40; y += 44) for (let x = F.x - 40; x < F.x + F.w + 40; x += 50) {
    if (rg() > 0.42) continue;
    const tx = x + (rg() - 0.5) * 40, ty = y + (rg() - 0.5) * 34;
    if (Math.hypot(tx, ty) < 78) continue;
    const gx = Math.round(tx / LW.CELL), gy = Math.round(ty / sy); let near = false;
    for (let i = -1; i <= 1 && !near; i++) for (let j = -1; j <= 1 && !near; j++) { const q = cell.get((gx + i) + ',' + (gy + j)); if (q) { const [qx, qy] = pos.get(q.id); if (Math.hypot(tx - qx, ty - qy) < 50) near = true; } }
    if (near) continue;
    const k = rg(); trees += k < 0.08 ? `<ellipse cx="${lwF(tx)}" cy="${lwF(ty)}" rx="${lwF(14 + rg() * 10)}" ry="${lwF(6 + rg() * 4)}" fill="#33452f" fill-opacity=".7"/>` : `<use href="#st-t${(k * 4) | 0}" transform="translate(${lwF(tx)} ${lwF(ty)}) scale(${lwF(1.2 + rg() * 0.6)})"/>`;
  }
  s += trees + roads;
  LUME.terr = { key, svg: s };
  return s;
}
function lwThrone() {
  return `<g pointer-events="none"><circle r="52" fill="url(#st-gl)"/><circle r="36" fill="#c9a24b" fill-opacity=".06" stroke="#f0d27a" stroke-opacity=".6" stroke-width="1.2" stroke-dasharray="6 3"/>`
    + `<g transform="translate(-21 -27) scale(.35)"><path d="M41 21 L45 3 L53 13 L60 0 L67 13 L75 3 L79 21 Z" fill="#f0d27a" stroke="#5c430c" stroke-width="3"/><path d="M36 50 Q36 26 60 24 Q84 26 84 50 L84 88 L36 88 Z" fill="#c3ccd1" stroke="#2a3134" stroke-width="4"/><path d="M45 54 Q45 35 60 33 Q75 35 75 54 L75 84 L45 84 Z" fill="#1d2427"/><circle cx="60" cy="49" r="5" fill="#f0d27a"/><rect x="24" y="72" width="16" height="16" rx="3" fill="#aab4ba" stroke="#2a3134" stroke-width="4"/><rect x="80" y="72" width="16" height="16" rx="3" fill="#aab4ba" stroke="#2a3134" stroke-width="4"/><rect x="26" y="86" width="68" height="12" rx="3" fill="#c3ccd1" stroke="#2a3134" stroke-width="4"/><path d="M32 98V122M88 98V122" stroke="#7c878d" stroke-width="8" stroke-linecap="round"/></g>`
    + `<g transform="translate(0 46)"><rect x="-48" y="-8" width="96" height="14" rx="3" fill="#0b0e10" fill-opacity=".88" stroke="#f0d27a" stroke-width=".8"/><text y="2.4" text-anchor="middle" fill="#f0d27a" style="font:700 9px Cinzel,Georgia,serif">Tronul de Argint</text></g></g>`;
}
function lwVil(p, sel, mine) {
  const [cx, cy] = lwPos(p), c = lwCfg(), st = Math.max(0, Math.min(4, p.stage | 0)), rg = lwRng(lwHash(p.id)), n = [3, 4, 5, 7, 9][st];
  const prot = p.level < c.min_level, cd = p.cd && p.cd > lwNow(), col = mine ? '#f0d27a' : prot ? '#7b7f82' : '#c9d1d6', ph = rg() * 6.28, H = [];
  for (let i = 0; i < n; i++) { const a = i * 2.39996 + ph, r = 4.6 * Math.sqrt(i + 0.6); H.push([Math.cos(a) * r, Math.sin(a) * r * 0.9, (rg() - 0.5) * 26, 1 + ((rg() * 3) | 0)]); }
  H.sort((a, b) => a[1] - b[1]);
  const lbl = (mine ? 'Tu · ' : '') + p.name, w = lbl.length * 5.2 + 14;
  let h = `<g class="st-v lw-v${sel ? ' on' : ''}" onclick="lwPick('${p.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();lwPick('${p.id}')}" tabindex="0" role="button" aria-label="${tEsc(p.name)}, nivel ${p.level}${mine ? ', satul tău' : ''}" transform="translate(${lwF(cx)} ${lwF(cy)})"><circle r="28" fill="transparent"/>`;
  h += `<circle r="27" fill="${col}" fill-opacity=".07" stroke="${col}" stroke-opacity="${mine ? 0.9 : 0.5}" stroke-width="${mine ? 1.6 : 1}"${mine ? '' : ' stroke-dasharray="5 3"'}/><circle r="19" fill="url(#st-gr)"/>`;
  if (st >= 3) h += `<circle r="18" fill="none" stroke="#25292c" stroke-width="3.6"/><circle r="18" fill="none" stroke="#8a9096" stroke-width="2.6" stroke-dasharray="2.4 .8"/>`;
  else h += `<circle r="17" fill="none" stroke="#6b5434" stroke-width="1.1" stroke-dasharray="1.2 1.8"/>`;
  H.forEach(([x, y, r, k]) => { h += `<use href="#st-h${k}" transform="translate(${lwF(x)} ${lwF(y)}) rotate(${lwF(r)}) scale(${lwF(0.92 + st * 0.04)})"/>`; });
  h += `<g class="st-fl" transform="translate(-14 -6)"><path d="M0 0V-9" stroke="#2a1d10" stroke-width=".9"/><path d="M0-9l6 2.2-6 2.2z" fill="${mine ? '#f0d27a' : prot || cd ? '#7b7f82' : '#c0504a'}" stroke="#12181a" stroke-width=".4"/></g>`;
  h += `<g transform="translate(15 -15)"><circle r="7.4" fill="#12181a" stroke="${mine ? '#f0d27a' : '#c9a24b'}" stroke-width="1.1"/><text y="3.3" text-anchor="middle" fill="#f0d27a" style="font:700 ${p.level > 99 ? 7 : 9}px Cinzel,Georgia,serif">${p.level}</text></g>`;
  h += `<circle class="st-sel" r="23" fill="none" stroke="#f0d27a" stroke-opacity=".28" stroke-width="5"/><circle class="st-sel" r="23" fill="none" stroke="#f0d27a" stroke-width="1.5"/>`;
  return h + `<g transform="translate(0 33)" pointer-events="none"><rect x="${lwF(-w / 2)}" y="-8" width="${lwF(w)}" height="13" rx="3" fill="#0b0e10" fill-opacity=".86" stroke="${mine ? '#f0d27a' : '#c9a24b'}" stroke-opacity=".7" stroke-width=".7"/><text y="1.8" text-anchor="middle" fill="${mine ? '#f0d27a' : '#e9e1cf'}" style="font:600 8.6px Alegreya,Georgia,serif">${tEsc(lbl)}</text></g></g>`;
}
function lwMap() {
  const st = LUME.st, ps = st.players, meId = st.me && st.me.user_id;
  let x0 = 0, x1 = 0, y0 = 0, y1 = 0;
  for (const p of ps) { const [x, y] = lwPos(p); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  x0 -= 95; x1 += 95; y0 -= 80; y1 += 95;
  let w = x1 - x0, h = y1 - y0;
  if (w < 640) { x0 -= (640 - w) / 2; w = 640; }
  if (w / h < 1.6) { const nw = h * 1.6; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / 1.6; y0 -= (nh - h) / 2; h = nh; }
  LUME.full = { x: x0, y: y0, w, h };
  if (LUME.cam) LUME.cam = lwClamp(LUME.cam);
  else if (!LUME.camInit && meId && (w > 1300 || (lwNarrow() && w > 600))) lwCenter(ps.find(p => p.id === meId));
  LUME.camInit = true;
  const vs = [...ps].sort((a, b) => (a.id === LUME.sel) - (b.id === LUME.sel) || lwPos(a)[1] - lwPos(b)[1]);
  return `<div class="st-map lw-map"><svg id="lwmap" viewBox="${lwVB()}" role="group" aria-label="Harta lumii, ${ps.length} ${ps.length === 1 ? 'sat' : 'sate'}"><defs>${SMDEFS}</defs>${lwTerrain(ps, LUME.full)}${lwThrone()}${vs.map(p => lwVil(p, p.id === LUME.sel, p.id === meId)).join('')}<rect x="${lwF(x0)}" y="${lwF(y0)}" width="${lwF(w)}" height="${lwF(h)}" fill="url(#st-vg)" pointer-events="none"/></svg>`
    + `<div class="st-zc"><button class="st-zb" onclick="lwZoom(1.35)" aria-label="Mărește">+</button><button class="st-zb" onclick="lwZoom(1/1.35)" aria-label="Micșorează">−</button><button class="st-zb" onclick="lwReset()" aria-label="Toată lumea" title="Toată lumea">⌂</button><button class="st-zb" onclick="lwFind()" aria-label="Satul meu" title="Satul meu">◎</button></div></div>`;
}
function lwEnBar() {
  const e = lwEn(); if (!e) return '';
  const pips = Math.min(30, e.max), full = Math.min(pips, e.n), part = e.n < e.max ? e.v - e.n : 0;
  let p = ''; for (let i = 0; i < pips; i++) p += `<i class="${i < full ? 'on' : ''}">${i === full && part > 0 ? `<b style="width:${Math.round(part * 100)}%"></b>` : ''}</i>`;
  return `<div class="lw-en" role="img" aria-label="Atacuri disponibile: ${e.n} din ${e.max}"><span class="lw-en-t">⚔ Atacuri <b>${e.n}/${e.max}</b></span><span class="lw-pips">${p}</span><small>${e.n >= e.max ? 'Bara e plină' : `Următorul peste <span data-end="${Math.round(Date.now() + e.next)}">${fmt(e.next)}</span>`}</small></div>`;
}
function lwSelPanel() {
  const st = LUME.st, p = LUME.sel && st.players.find(x => x.id === LUME.sel);
  if (!p) return '<p class="mute">Atinge un sat ca să vezi cine locuiește acolo.</p>';
  const mine = st.me && p.id === st.me.user_id, can = mine ? null : lwCan(p), myP = Math.round(TT.power(tronUnits()));
  const cmp = mine ? '' : p.power > myP * 1.25 ? '<span class="r4">mai puternic decât tine</span>' : p.power < myP * 0.8 ? '<span class="lw-ok">mai slab decât tine</span>' : 'cam cât tine';
  return `<section class="lw-sel"><div class="lw-sel-h">${av({ n: p.hero && p.hero.n || p.name, c: (p.hero && p.hero.c) || 'Campion' }, 56)}<div><h2>${tEsc(p.name)}${mine ? ' <span class="mute">(tu)</span>' : ''}</h2><div class="mute">${p.title ? '♛ ' + tEsc(p.title) + ' · ' : ''}${tEsc(p.stage_name)} · văzut ${lwAgo(p.seen)}</div></div></div>`
    + `<div class="lw-stats"><div><b>${p.level}</b><span>Nivel</span></div><div><b>${lwNum(p.power)}</b><span>Putere</span></div><div><b>${p.territories}</b><span>Teritorii</span></div></div>`
    + (mine ? '' : `<div class="mute">Puterea echipei lui: ${cmp} (a ta: ${lwNum(myP)}).</div>`)
    + `<div class="row lw-act"><span class="mute">${mine ? 'Satul tău, așa cum îl văd ceilalți.' : can.ok ? 'Dacă învingi, iei prada și experiența. El nu pierde nimic.' : can.why}</span><span>${mine ? '' : `<button class="p" onclick="lwAttack('${p.id}')"${can.ok && !LUME.busy ? '' : ' disabled'}>Atacă · 1 ⚔</button> `}<button onclick="lwProfile('${p.id}')">Vezi profilul</button></span></div></section>`;
}
function lwLog() {
  const l = (LUME.st && LUME.st.log) || []; if (!l.length) return '';
  return `<section><h2>Jurnalul atacurilor</h2>${l.map(x => {
    const o = `<button class="lw-lnk" onclick="lwProfile('${x.other_id}')">${tEsc(x.other)}</button>`;
    const t = x.att ? (x.win ? `Ai atacat satul lui ${o} și ai câștigat: +${lwNum(x.gold)} aur, +${lwNum(x.xp)} exp.` : `Ai atacat satul lui ${o} și ai pierdut.`)
      : (x.win ? `${o} ți-a atacat satul și a câștigat. Nu ai pierdut nimic.` : `${o} ți-a atacat satul și a fost respins.`);
    return `<div class="row"><span>${x.att ? '⚔' : '🛡'} ${t}</span><span class="mute">${lwAgo(x.t)}</span></div>`;
  }).join('')}</section>`;
}
function vLume() {
  if (!LUME.loading && (!LUME.st || Date.now() - LUME.at > 45000 || (Date.now() - LUME.at > 8000 && JSON.stringify(lwSnap()) !== LUME.pubSig))) lwSync();
  if (!LUME.st) return `<section><h2>Lumea</h2><p class="mute">${LUME.err ? tEsc(LUME.err) : 'Se încarcă harta lumii…'}</p>${LUME.err ? '<button onclick="lwSync(true)">Încearcă din nou</button>' : ''}</section>`;
  const n = LUME.st.players.length, c = lwCfg();
  let h = `<section><h2>Lumea</h2><div class="mute">Satele tuturor jucătorilor, în jurul Tronului de Argint. Fiecare jucător nou primește un loc la marginea hărții, așa că lumea crește odată cu voi. Acum: <b>${n}</b> ${n === 1 ? 'sat' : 'sate'}.</div>${LUME.err ? `<p class="r4">${tEsc(LUME.err)}</p>` : ''}${LUME.repErr ? `<p class="r4">Rezultatul ultimului atac nu a ajuns la server (${tEsc(LUME.repErr)}). Se retrimite automat.</p>` : ''}${lwEnBar()}${lwMap()}`;
  h += `<div class="st-lg"><span><i style="background:#f0d27a"></i>Satul tău</span><span><i style="background:#c0504a"></i>Poate fi atacat</span><span><i style="background:#7b7f82"></i>Începător (sub nivelul ${c.min_level}) sau atacat recent de tine</span><span>Zidurile apar de la stadiul „Târg întărit”</span></div></section>`;
  return h + lwSelPanel() + lwLog() + `<section><h2>Reguli</h2><div class="mute">• Bara are ${c.en_max} atacuri și se reface câte unul la ${c.en_regen_min} de minute, adică ${Math.round(24 * 60 / c.en_regen_min)} pe zi.<br>• Același jucător îl poți ataca o dată la ${c.same_h} ore. Începătorii (sub nivelul ${c.min_level}) nu pot fi atacați și nu pot ataca.<br>• Lupți cu fantoma echipei lui, cu aceleași plafoane ca la Tron. Dacă învingi, iei prada calculată de joc și experiență în plus. Apărătorul nu pierde niciodată nimic, doar află din jurnal.<br>• Satele din Lume nu se pot cuceri; teritoriile rămân în regiunea ta.</div></section>`;
}

/* ------------------------------------------------------------------ CLASAMENT */
async function lwBoard(k, force) {
  if (LUME.bLoad[k] || (!force && LUME.board[k] && Date.now() - (LUME.bAt[k] || 0) < 60000)) return;
  LUME.bLoad[k] = 1;
  try {
    if (!LUME.pubAt) await lwSync();                   /* ca să apari și tu în clasament */
    const r = await tronRpc('world_board', { p_kind: k });
    if (r.error) LUME.bErr = /Could not find the function|does not exist|schema cache/i.test(r.error) ? 'Serverul nu are încă Lumea: rulează supabase/02-lume.sql în Supabase.' : r.error;
    else { LUME.bErr = ''; LUME.board[k] = r.data; }
  } finally { LUME.bLoad[k] = 0; LUME.bAt[k] = Date.now(); lwUi(); }
}
function lwBk(k) { LUME.bk = k; render(); }
function lwVal(k, r) {
  if (k === 'power') return lwNum(r.power);
  if (k === 'terr') return r.territories + (r.territories === 1 ? ' teritoriu' : ' teritorii');
  if (k === 'tron') return tronHM(r.seconds) + ` <small class="mute">· ${r.crowns} ${r.crowns === 1 ? 'încoronare' : 'încoronări'}</small>`;
  return 'Nivel ' + r.level;
}
function vBoard() {
  const k = LUME.bk, b = LUME.board[k], me = LUME.st && LUME.st.me && LUME.st.me.user_id;
  if (!LUME.bLoad[k] && (!b || Date.now() - (LUME.bAt[k] || 0) > 60000)) lwBoard(k);
  const tabs = `<div class="tabs lw-bt">${LW.BOARD.map(([x, n]) => `<button${x === k ? ' class="p"' : ''} onclick="lwBk('${x}')">${n}</button>`).join('')}</div>`;
  let h = `<section><h2>Clasament</h2>${tabs}`;
  if (!b) return h + `<p class="mute">${LUME.bErr ? tEsc(LUME.bErr) : 'Se încarcă…'}</p></section>`;
  if (!b.rows.length) return h + `<p class="mute">${k === 'tron' ? 'Nu sunt încă date despre domnii la Tron.' : 'Nimeni în clasament încă.'}</p></section>`;
  const medal = r => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r);
  h += `<div class="lw-board">${b.rows.map(r => `<button class="lw-br${r.id === me ? ' me' : ''}" onclick="lwProfile('${r.id}')"><span class="lw-rk">${medal(r.rank)}</span>${av({ n: r.name, c: (r.hero && r.hero.c) || 'Campion' }, 36)}<span class="lw-bn"><b>${tEsc(r.name)}${r.id === me ? ' <span class="mute">(tu)</span>' : ''}</b><small>${r.title ? '♛ ' + tEsc(r.title) + ' · ' : ''}${tEsc(r.stage_name)}${k !== 'level' ? ' · nivel ' + r.level : ''}</small></span><span class="lw-bv">${lwVal(k, r)}</span></button>`).join('')}</div>`;
  if (b.me && !b.rows.some(r => r.id === me)) h += `<div class="lw-br me static"><span class="lw-rk">${b.me.rank}</span><span class="lw-bn"><b>Tu</b><small>din ${b.total}</small></span><span class="lw-bv">${lwVal(k, b.me)}</span></div>`;
  return h + `<div class="mute" style="margin-top:8px">${b.total > 50 ? `Primii 50 din ${b.total} de jucători.` : `Toți cei ${b.total} ${b.total === 1 ? 'jucător' : 'jucători'}.`} Puterea e suma echipei active: viață + 6 × atac + 10 × apărare. Datele se actualizează când fiecare jucător intră în joc.</div></section>`;
}

/* ------------------------------------------------------------------ PROFIL */
async function lwProfile(id) {
  mdl('<div class="lwp"><p class="mute" style="margin:24px 0">Se încarcă profilul…</p></div>', 'lwp-b');
  const r = await tronRpc('world_profile', { p_user: id });
  if (!document.getElementById('lgm')) return;                                  /* fereastra a fost închisă între timp */
  if (r.error) return mdl(`<div class="lwp"><p class="r4" style="margin:24px 0">${tEsc(r.error)}</p></div>`, 'lwp-b');
  const p = r.data, rk = p.ranks || {}, t = p.tron, wp = LUME.st && LUME.st.players.find(x => x.id === id);
  const can = !p.me && wp ? lwCan(Object.assign({}, wp, { cd: p.cd })) : null;
  const units = (p.units || []).map(u => `<div class="lwp-u"><b>${tEsc(u.n)}</b><span class="mute">${tEsc(u.c)}</span><span>${lwNum(u.hp)} viață · ${lwNum(u.atk)} atac · ${lwNum(u.def)} apărare</span></div>`).join('');
  const rec = (p.recent || []).map(x => `<div class="row"><span>${x.att ? (x.win ? '⚔ A învins satul lui ' : '⚔ A pierdut la satul lui ') : (x.win ? '🛡 A fost învins de ' : '🛡 L-a respins pe ')}${tEsc(x.other)}</span><span class="mute">${lwAgo(x.t)}</span></div>`).join('');
  mdl(`<div class="lwp"><div class="lwp-hd">${av({ n: p.hero.n || p.name, c: p.hero.c || 'Campion' }, 76)}<div><h3>${tEsc(p.name)}${p.me ? ' <span class="mute">(tu)</span>' : ''}</h3><div class="lwp-t">${p.title ? '♛ ' + tEsc(p.title) : '<span class="mute">Fără titlu</span>'}</div><div class="mute">${tEsc(p.stage_name)} · joacă din ${lwDate(p.joined)}</div></div></div>`
    + `<div class="lw-stats"><div><b>${p.level}</b><span>Nivel</span></div><div><b>${lwNum(p.power)}</b><span>Putere</span></div><div><b>${p.territories}</b><span>Teritorii</span></div></div>`
    + `<div class="lwp-rk mute">Locul <b>${rk.level}</b> la nivel și <b>${rk.power}</b> la putere, din ${rk.total} jucători.</div>`
    + `<h4>Echipa</h4>${units || '<p class="mute">Nepublicată.</p>'}`
    + `<h4>Lupte</h4><div class="lwp-g"><div><b>${p.raids_won}</b><span>atacuri câștigate</span></div><div><b>${p.raids_lost}</b><span>atacuri pierdute</span></div><div><b>${p.def_won}</b><span>atacuri respinse</span></div><div><b>${p.def_lost}</b><span>ori învins acasă</span></div></div>`
    + (t ? `<h4>Tronul de Argint</h4><div class="mute">${t.crowns} ${t.crowns === 1 ? 'încoronare' : 'încoronări'} · ${tronHM(t.seconds)} pe Tron, în total</div>` : '')
    + (rec ? `<h4>Ultimele lupte</h4><div class="lwp-rec">${rec}</div>` : '')
    + `<div class="mute lwp-seen">Văzut ${lwAgo(p.seen)}</div><div class="lwp-a"><button onclick="lwShow('${p.id}')">Vezi pe hartă</button>${can ? `<button class="p" onclick="lwAttack('${p.id}')"${can.ok ? '' : ' disabled'}>Atacă · 1 ⚔</button>` : ''}</div>${can && !can.ok ? `<div class="mute" style="font-size:14px">${can.why}</div>` : ''}</div>`, 'lwp-b');
}
function lwShow(id) { lgClose(); S.tab = 'm'; S.mt = 'l'; S.msg = ''; LUME.sel = id; const p = LUME.st && LUME.st.players.find(x => x.id === id); if (p && LUME.full) lwCenter(p); else LUME.camInit = false; go(); }

/* ------------------------------------------------------------------ PANOUL LATERAL */
function lumeRow() {
  const e = lwEn(); if (!e) return null;
  return sdRow('⚔', `Atacuri în Lume: ${e.n}/${e.max}`, e.n >= e.max ? 'pline' : sdT(e.next), "sdGo('m','mt','l')", e.n >= e.max);
}

/* ------------------------------------------------------------------ TRAGERE / ZOOM PE HARTĂ */
if (typeof document !== 'undefined') {
  let drag = null;
  document.addEventListener('pointerdown', e => {
    const s = e.target.closest && e.target.closest('#lwmap'); if (!s || e.button > 0 || !LUME.full) return;
    const r = s.getBoundingClientRect(), c = LUME.cam || LUME.full;
    drag = { s, x: e.clientX, y: e.clientY, c: Object.assign({}, c), k: c.w / r.width, m: false, id: e.pointerId };
  });
  document.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.m && Math.hypot(dx, dy) < 6) return;
    if (!drag.m) { drag.m = true; drag.s.classList.add('drag'); }
    const c = Object.assign({}, drag.c); c.x -= dx * drag.k; c.y -= dy * drag.k; LUME.cam = lwClamp(c); lwApply(); e.preventDefault();
  });
  const end = () => { if (drag && drag.m) { LUME.noClick = Date.now(); drag.s.classList.remove('drag'); } drag = null; };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  document.addEventListener('wheel', e => {
    const s = e.target.closest && e.target.closest('#lwmap'); if (!s) return;
    e.preventDefault(); const r = s.getBoundingClientRect(); lwZoom(e.deltaY < 0 ? 1.2 : 1 / 1.2, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
  }, { passive: false });
}

/* sincronizare periodică: rezultatele netrimise, bara de atacuri, instantaneul tău */
if (typeof setInterval === 'function') setInterval(() => {
  try {
    if (typeof CONT === 'undefined' || !CONT.booted || !CONT.user || !S) return;
    if (S.wr && S.wr.cur && !LUME.rep) lumeCheck();
    if (LUME.loading) return;
    if (lwOnWorld() ? Date.now() - LUME.at > 45000 : Date.now() - LUME.at > 300000) lwSync();
  } catch (e) { /* se reia la următorul ciclu */ }
}, 20000);

/* ------------------------------------------------------------------ STILURI */
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `
#lwmap{display:block;width:100%;aspect-ratio:16/10;cursor:grab;touch-action:none}
#lwmap.drag{cursor:grabbing}
.lw-map .st-zc{gap:4px}
.lw-en{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin:10px 0;padding:8px 10px;background:linear-gradient(180deg,#181e21,#0e1214);border:1px solid var(--line);border-left:3px solid var(--blood);border-radius:4px}
.lw-en-t{font:700 15px Cinzel,serif;color:var(--ink)}.lw-en-t b{color:var(--gold2)}
.lw-pips{display:flex;gap:3px;flex:1;min-width:180px}
.lw-pips i{position:relative;flex:1;height:10px;max-width:22px;background:#000;border:1px solid #4e4224;border-radius:2px;overflow:hidden}
.lw-pips i.on{background:linear-gradient(180deg,#e0766e,#9c2f29);border-color:#d4564f}
.lw-pips i b{position:absolute;left:0;top:0;bottom:0;background:#d4564f66}
.lw-en small{color:var(--mute);font-size:13px}
.lw-sel-h{display:flex;gap:12px;align-items:center;margin-bottom:8px}.lw-sel-h h2{margin:0}
.lw-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0}
.lw-stats div{text-align:center;padding:6px 4px;background:#0b0e10aa;border:1px solid var(--line);border-radius:4px}
.lw-stats b{display:block;font:700 19px Cinzel,serif;color:var(--gold2)}.lw-stats span{font-size:13px;color:var(--mute)}
.lw-act{flex-wrap:wrap;gap:8px}.lw-act>span:last-child{display:flex;gap:6px;flex-wrap:wrap}
.lw-ok{color:#7fd88c}
.lw-lnk{background:none!important;border:0!important;box-shadow:none!important;padding:0;color:var(--gold2);text-decoration:underline;text-underline-offset:3px;font:inherit}
.lw-bt{flex-wrap:wrap}
.lw-board{display:flex;flex-direction:column;gap:4px;margin-top:8px}
.lw-br{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:6px 10px;background:linear-gradient(180deg,#181e21,#0e1214);border:1px solid var(--line);border-radius:4px;color:var(--ink)}
.lw-br.me{border-color:var(--gold);box-shadow:inset 3px 0 var(--gold)}.lw-br.static{margin-top:8px}
.lw-rk{flex:none;width:30px;text-align:center;font:700 16px Cinzel,serif;color:var(--gold2)}
.lw-bn{flex:1;min-width:0}.lw-bn b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lw-bn small{display:block;font-size:13px;color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lw-bv{flex:none;text-align:right;font-weight:700;color:var(--ink)}
.lgm-b.lwp-b{width:min(94vw,440px);text-align:left}
.lwp-hd{display:flex;gap:14px;align-items:center;margin:4px 30px 10px 0}.lwp-hd h3{margin:0;font:700 22px Cinzel,serif;color:var(--ink)}
.lwp-t{color:var(--gold2);margin:2px 0}
.lwp h4{font:700 14px Cinzel,serif;color:var(--gold);margin:14px 0 6px;letter-spacing:.04em}
.lwp-u{display:flex;flex-wrap:wrap;gap:2px 8px;align-items:baseline;padding:5px 0;border-bottom:1px solid #ffffff10}.lwp-u span:last-child{flex-basis:100%;font-size:14px}
.lwp-g{display:grid;grid-template-columns:repeat(2,1fr);gap:6px}.lwp-g div{padding:5px 8px;background:#0b0e10aa;border:1px solid var(--line);border-radius:4px}.lwp-g b{font:700 17px Cinzel,serif;color:var(--gold2);margin-right:6px}.lwp-g span{font-size:13px;color:var(--mute)}
.lwp-rec .row{font-size:14px;padding:3px 0}
.lwp-seen{margin-top:12px;font-size:13px}
.lwp-a{display:flex;gap:8px;margin:10px 0 4px}.lwp-a button{flex:1}
@media (max-width:520px){.lw-stats b{font-size:17px}}
`;
  document.head.appendChild(st);
})();
