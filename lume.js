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
    title: (S.tron && S.tron.title) || '', hero: { n: h.n, c: h.c, ic: h.ic || '' }, units };
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
function lwOnWorld() { return S && (S.tab === 'k' || (S.tab === 'm' && S.mt === 'l')); }
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
  const d = { room: 1, rooms: 1, k: 1, rw: 0, bn: data.name, di: 0, raid: -4, rn: 'satul lui ' + data.name, lbl: 'Atac', lume: 1, dlv: data.level, vsh: data.hero || null,
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

/* ------------------------------------------------------------------ HARTA LUMII
   Desenul (sate, Tron, teren) e în lume-art.js. Aici: așezarea izometrică, ordinea, interacțiunea.
   Locul (x, y) dat de server se vede ca romb în jurul Tronului, ca pe o hartă desenată. */
LW.IA = 128; LW.IB = 78; LW.VS = 1.45;     /* un pas pe grilă = (IA, IB) pe ecran; VS = mărimea satelor */
function lwPos(p) {
  const h = lwHash(p.id), jx = ((h & 255) / 255 - 0.5) * 16, jy = (((h >>> 8) & 255) / 255 - 0.5) * 10, X = (p.x - p.y) * LW.IA, Y = (p.x + p.y) * LW.IB, d = Math.hypot(X, Y * 1.6) || 1;
  return [X + X / d * 34 + jx, Y + Y / d * 34 * (Y < 0 ? 1.5 : 1) + jy];     /* loc în jurul Tronului pentru podium și plăcuțe */
}
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

/* raza zonei locuite (rombul), pentru decor */
function lwHull(ps) { const R = Math.max(1, ...ps.map(p => Math.max(Math.abs(p.x), Math.abs(p.y)))) + 0.75; return { x: R * 2 * LW.IA, y: R * 2 * LW.IB }; }
/* teren: pajiști, râu, drumuri pavate, munți și păduri; se recalculează doar când se schimbă jucătorii */
function lwTerrain(ps, F) {
  const key = ps.map(p => p.id + p.x + ',' + p.y + ':' + LWA.tier(p.level)).join('|') + '|' + Math.round(F.w);
  if (LUME.terr && LUME.terr.key === key) return LUME.terr;
  const cell = new Map(ps.map(p => [p.x + ',' + p.y, p])), pos = new Map(ps.map(p => [p.id, lwPos(p)])), R = lwHull(ps);
  /* drumurile: fiecare sat se leagă de vecinul de pe inelul dinăuntru (sau de Tron) */
  const segs = [];
  for (const p of ps) {
    let x = p.x, y = p.y, par = null;
    while (x || y) { const r = Math.max(Math.abs(x), Math.abs(y)); if (Math.abs(x) === r) x -= Math.sign(x); if (Math.abs(y) === r) y -= Math.sign(y); par = cell.get(x + ',' + y); if (par) break; }
    segs.push([pos.get(p.id), par ? pos.get(par.id) : [0, 0]]);
  }
  const nearSeg = (x, y, m) => segs.some(([a, b]) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L)); return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) < m; });
  const inside = (x, y, m) => Math.hypot(x, y * 1.3) < 135 || ps.some(p => { const [vx, vy] = pos.get(p.id); return Math.hypot(x - vx, (y - vy) * 1.4) < m + 52; }) || nearSeg(x, y, 14);
  const sc = LWA.scenery(F, inside, R, 7919);
  /* râul curge pe marginea de sus a zonei locuite, deci nu trece prin sate */
  const riv = (() => { const o = 70, pts = []; for (let i = 0; i <= 8; i++) { const k = i / 8, x = -R.x - 60 + k * (R.x + 60) * 1.9, base = x <= 0 ? -(R.y / R.x) * (x + R.x) : -R.y + (R.y / R.x) * x * 0.6; pts.push([x, base - o - Math.sin(i * 1.7) * 14]); } let d = `M${lwF(F.x - 40)} ${lwF(pts[0][1] + 30)}`; let pr = [F.x - 40, pts[0][1] + 30]; for (const q of pts) { const mx = (pr[0] + q[0]) / 2; d += `C${lwF(mx)} ${lwF(pr[1])} ${lwF(mx)} ${lwF(q[1])} ${lwF(q[0])} ${lwF(q[1])}`; pr = q; } d += `C${lwF(pr[0] + 60)} ${lwF(pr[1])} ${lwF(F.x + F.w)} ${lwF(F.y - 20)} ${lwF(F.x + F.w + 40)} ${lwF(F.y - 40)}`;
    return `<path d="${d}" stroke="#2f4a2a" stroke-width="24" fill="none" stroke-linecap="round" opacity=".6"/><path d="${d}" stroke="#3f7898" stroke-width="16" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#5f9fc0" stroke-width="10" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#c4e6f4" stroke-width="1.6" fill="none" stroke-dasharray="10 14" opacity=".7"/>`; })();
  LUME.terr = { key, low: sc.low + riv + segs.map(([a, b]) => LWA.road(a, b)).join(''), high: sc.high };
  return LUME.terr;
}
/* cine e pe Tron: câștigătorul ultimei săptămâni încheiate (Sala Faimei) și regele de acum, din datele Tronului (tron.js) */
function lwKings(ps) {
  const st = typeof TRON !== 'undefined' && TRON.st, out = { win: null, week: 0, cur: null };
  if (!st) return out;
  const h = (st.hall || []).reduce((a, x) => (!a || x.week > a.week ? x : a), null), w = h && (h.top || []).find(t => t.rank === 1);
  const idOf = t => t.user_id || (() => { const m = ps.filter(p => p.name === t.name); return m.length === 1 ? m[0].id : null; })();
  if (w) { out.win = { name: w.name, id: idOf(w) }; out.week = h.week + 1; }
  if (st.holder) out.cur = { name: st.holder.name, id: st.holder.user_id };
  return out;
}
function lwThrone(K) {
  const t1 = 'Tronul de Argint', t2 = K.win ? `👑 ${K.win.name} · regele săptămânii ${K.week}` : null, t3 = K.cur ? `Pe Tron acum: ${K.cur.name}` : 'Tronul e gol acum';
  let y = 46, lb = `<g transform="scale(1.15)">` + LWA.plate(y / 1.15, t1, true);
  if (t2) { y += 16; lb += LWA.plate(y / 1.15, tEsc(t2), true, true, t2.length); }
  y += 15; lb += LWA.plate(y / 1.15, tEsc(t3), false, true, t3.length) + '</g>';
  return `<g class="lw-tr" onclick="tab('r')" onkeydown="if(event.key==='Enter'){tab('r')}" tabindex="0" role="button" aria-label="Tronul de Argint${K.win ? ', regele săptămânii: ' + tEsc(K.win.name) : ''}, ${tEsc(t3)}"><g transform="scale(1.4)">${LWA.throne()}</g>${lb}</g>`;
}
function lwVil(p, sel, mine, K) {
  const vk = p.id + ':' + LWA.tier(p.level), vc = LUME.vc || (LUME.vc = {}), v = vc[vk] || (vc[vk] = LWA.village(p.id, p.level));   /* desenul satului se schimbă doar cu treapta */
  const [cx, cy] = lwPos(p), c = lwCfg(), s = v.s;
  const prot = p.level < c.min_level, cd = p.cd && p.cd > lwNow(), won = K && K.win && K.win.id === p.id, cur = K && K.cur && K.cur.id === p.id;
  const top = -(s * 0.5 + 12 + v.t * 4.5), nm = (mine ? 'Tu · ' : '') + p.name;
  let h = `<g class="st-v lw-v${sel ? ' on' : ''}${mine ? ' me' : ''}" onclick="lwPick('${p.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();lwPick('${p.id}')}" tabindex="0" role="button" aria-label="${tEsc(p.name)}, nivel ${p.level}${mine ? ', satul tău' : ''}" transform="translate(${lwF(cx)} ${lwF(cy)})">`;
  const k = LW.VS;
  h += `<ellipse cx="0" cy="${lwF((s * 0.55 + v.hp) * k)}" rx="${lwF((2 * s + 6) * k)}" ry="${lwF(s * 0.6 * k)}" fill="#000" opacity=".22"/>`;
  h += `<ellipse class="st-sel" cx="0" cy="0" rx="${lwF((2 * s + 10) * k)}" ry="${lwF((s + 7) * k)}" fill="none" stroke="#f0d27a" stroke-opacity=".28" stroke-width="5"/>`;
  if (mine) h += `<ellipse cx="0" cy="0" rx="${lwF((2 * s + 8) * k)}" ry="${lwF((s + 5) * k)}" fill="#f0d27a" fill-opacity=".08" stroke="#f0d27a" stroke-width="1.3" stroke-dasharray="5 3"/>`;
  h += `<polygon points="0,${lwF((top - 6) * k)} ${lwF((2 * s + 6) * k)},0 0,${lwF((s + v.hp + 4) * k)} ${lwF((-2 * s - 6) * k)},0" fill="transparent"/>`;
  h += `<g transform="scale(${LW.VS})">` + v.svg;
  const fl = mine ? '#f0d27a' : prot || cd ? '#8a8f93' : '#c0504a';
  h += `<g transform="translate(${lwF(-2 * s + 5)} -1)"><path d="M0 0V-15" stroke="#2a1d10" stroke-width=".9"/><path d="M0 -15l7.5 2.5-7.5 2.5z" fill="${fl}" stroke="#12181a" stroke-width=".4"/></g>`;
  if (won || cur) h += `<g transform="translate(0 ${lwF(top - 4)})"><title>${won ? 'Regele săptămânii ' + K.week : ''}${won && cur ? ' · ' : ''}${cur ? 'Ține Tronul acum' : ''}</title><path d="M-9 4L-7-6-3-1 0-8 3-1 7-6 9 4Z" fill="${won ? 'url(#lwa-gd)' : '#d7dde0'}" stroke="#5c430c" stroke-width="1" stroke-linejoin="round"/>${won && cur ? '<ellipse cx="0" cy="-1" rx="1.6" ry="1.6" fill="#c0504a"/>' : ''}</g>`;
  h += `<ellipse class="st-sel" cx="0" cy="0" rx="${lwF((2 * s + 10) * k)}" ry="${lwF((s + 7) * k)}" fill="none" stroke="#f0d27a" stroke-width="1.5"/>`;
  return h + '</g>' + `<g transform="scale(1.15)">${LWA.plate((s + v.hp) * LW.VS / 1.15 + 9, tEsc(nm), mine, false, nm.length, p.level)}</g></g>`;
}
function lwMap() {
  const st = LUME.st, ps = st.players, meId = st.me && st.me.user_id, R = lwHull(ps);
  let x0 = -R.x - 90, x1 = R.x + 90, y0 = -R.y - 140, y1 = R.y + 110;
  let w = x1 - x0, h = y1 - y0;
  if (w < 900) { x0 -= (900 - w) / 2; w = 900; }
  if (w / h < 1.6) { const nw = h * 1.6; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / 1.6; y0 -= (nh - h) / 2; h = nh; }
  LUME.full = { x: x0, y: y0, w, h };
  if (LUME.cam) LUME.cam = lwClamp(LUME.cam);
  else if (!LUME.camInit && meId && (w > 1300 || (lwNarrow() && w > 600))) lwCenter(ps.find(p => p.id === meId));
  LUME.camInit = true;
  const K = lwKings(ps), T = lwTerrain(ps, LUME.full);
  /* ordinea de desen: de sus în jos (cele din spate întâi); Tronul la locul lui; satul selectat ultimul */
  const items = ps.map(p => [lwPos(p)[1] + (p.id === LUME.sel ? 1e6 : 0), lwVil(p, p.id === LUME.sel, p.id === meId, K)]);
  items.push([0, lwThrone(K)]);
  items.sort((a, b) => a[0] - b[0]);
  const n = ps.length, ts = typeof TRON !== 'undefined' && TRON.st;
  return `<div class="st-map lw-map"><div class="lw-ttl"><b>Câmpia Tronului de Argint</b><small>${n} ${n === 1 ? 'sat' : 'sate'}${ts && ts.week_end ? ' · săptămâna se închide în ' + sdT(ts.week_end - tronNow()) : ''}</small></div><svg id="lwmap" viewBox="${lwVB()}" role="group" aria-label="Harta lumii, ${n} ${n === 1 ? 'sat' : 'sate'}"><defs>${LWA.defs}</defs>${T.low}${T.high}${items.map(x => x[1]).join('')}<rect x="${lwF(x0)}" y="${lwF(y0)}" width="${lwF(w)}" height="${lwF(h)}" fill="url(#lwa-vg)" pointer-events="none"/></svg>`
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
  return `<section class="lw-sel"><div class="lw-sel-h">${av({ n: p.hero && p.hero.n || p.name, c: (p.hero && p.hero.c) || 'Campion', ic: p.hero && p.hero.ic }, 56)}<div><h2>${tEsc(p.name)}${mine ? ' <span class="mute">(tu)</span>' : ''}</h2><div class="mute">${p.title ? '♛ ' + tEsc(p.title) + ' · ' : ''}${tEsc(p.stage_name)} · văzut ${lwAgo(p.seen)}</div></div></div>`
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
  h += `<div class="st-lg"><span><i style="background:#f0d27a"></i>Satul tău</span><span><i style="background:#c0504a"></i>Poate fi atacat</span><span><i style="background:#7b7f82"></i>Începător (sub nivelul ${c.min_level}) sau atacat recent de tine</span><span>👑 auriu: regele săptămânii · argintiu: pe Tron acum</span><span>Satul crește cu nivelul jucătorului: palisadă la 10, zid și turn la 20, fortificații la 25, castel de la 30</span></div></section>`;
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
  h += `<div class="lw-board">${b.rows.map(r => `<button class="lw-br${r.id === me ? ' me' : ''}" onclick="lwProfile('${r.id}')"><span class="lw-rk">${medal(r.rank)}</span>${av({ n: r.name, c: (r.hero && r.hero.c) || 'Campion', ic: r.hero && r.hero.ic }, 36)}<span class="lw-bn"><b>${tEsc(r.name)}${r.id === me ? ' <span class="mute">(tu)</span>' : ''}</b><small>${r.title ? '♛ ' + tEsc(r.title) + ' · ' : ''}${tEsc(r.stage_name)}${k !== 'level' ? ' · nivel ' + r.level : ''}</small></span><span class="lw-bv">${lwVal(k, r)}</span></button>`).join('')}</div>`;
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
  mdl(`<div class="lwp"><div class="lwp-hd">${av({ n: p.hero.n || p.name, c: p.hero.c || 'Campion', ic: p.hero.ic }, 76)}<div><h3>${tEsc(p.name)}${p.me ? ' <span class="mute">(tu)</span>' : ''}</h3><div class="lwp-t">${p.title ? '♛ ' + tEsc(p.title) : '<span class="mute">Fără titlu</span>'}</div><div class="mute">${tEsc(p.stage_name)} · joacă din ${lwDate(p.joined)}</div></div></div>`
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
.lw-map{position:relative;border:7px solid #4a3220;border-radius:6px;box-shadow:inset 0 0 0 2px #8a6a3e,0 0 0 1px #1a120a,0 10px 30px #000a;background:#3d5530}
.lw-map::after{content:'';position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 40px #0008;border-radius:2px}
.lw-ttl{position:absolute;top:8px;left:50%;transform:translateX(-50%);z-index:2;pointer-events:none;text-align:center;padding:4px 16px 5px;background:linear-gradient(180deg,#3e4447ee,#22272aee);border:1px solid #a9b0b3;border-radius:4px;box-shadow:0 3px 10px #0008;max-width:80%}
.lw-ttl b{display:block;font:700 15px/1.25 Cinzel,Georgia,serif;color:#f1efe8;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lw-ttl small{display:block;font-size:12px;line-height:1.3;color:#c9cfd2}
@media (max-width:520px){.lw-map{border-width:5px}.lw-ttl{top:5px;padding:2px 10px}.lw-ttl b{font-size:11.5px}.lw-ttl small{display:none}}
.lw-tr{cursor:pointer;outline:none}.lw-tr:focus-visible>circle:nth-child(2){stroke-width:2.5}
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
@media (max-width:600px){.lw-bt{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:thin}.lw-bt button{flex:none}}
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
