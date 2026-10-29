/* ============================================================================
   Silver Throne — tron.js
   „Regele Tronului”: client (interfață, legătura cu Supabase, lupta cu fantoma, revendicare).
   Serverul (funcțiile throne_* din supabase/01-throne.sql) hotărăște deținătorul, clasamentul și premiile;
   clientul calculează lupta și raportează rezultatul (suficient între prieteni; vezi docs/TRON.md).

   Se încarcă după panou.js. Regulile pure sunt în tron-logic.js (ST_T).
   ========================================================================== */
const TT = ST_T;
const TRON = { uid: null, st: null, at: 0, off: 0, err: '', loading: false, rep: false, busy: false, pub: null, pubAt: 0, repErr: '' };

function tronInit() {
  if (typeof S === 'undefined' || !S) return;
  const t = (S.tron && typeof S.tron === 'object') ? S.tron : (S.tron = {});
  t.title = typeof t.title === 'string' ? t.title.slice(0, 40) : '';
  t.grants = (t.grants && typeof t.grants === 'object') ? t.grants : {};
  if (t.cur && (typeof t.cur !== 'object' || !Number.isFinite(+t.cur.id))) t.cur = null;
}

/* ------------------------------------------------------------------ SERVER */
async function tronRpc(fn, args) {
  if (typeof supabaseClient === 'undefined' || !supabaseClient.rpc) return { error: 'Fără conexiune la server.' };
  try { const r = await supabaseClient.rpc(fn, args || {}); return r.error ? { error: r.error.message || String(r.error) } : { data: r.data }; }
  catch (e) { return { error: String((e && e.message) || e) }; }
}
async function tronUid() {
  try { const r = await supabaseClient.auth.getSession(); TRON.uid = (r && r.data && r.data.session) ? r.data.session.user.id : null; } catch (e) { TRON.uid = null; }
  return TRON.uid;
}
const tronPend = () => !!(TRON.st && TRON.st.me && TRON.st.me.pending && TRON.st.me.pending.length);
const tronNow = () => Date.now() + (TRON.off || 0);                       /* ceasul serverului, estimat */
function tronUi() { try { if (S.tab === 'm' && S.mt === 'r') render(); else if (typeof hdr === 'function') hdr(); } catch (e) { /* interfața se reîncarcă la următoarea acțiune */ } }

async function tronSync() {
  if (TRON.loading) return; TRON.loading = true;
  try {
    if (!(await tronUid())) { TRON.st = null; TRON.err = 'Conectează-te la cont ca să participi la Tron.'; return; }
    const r = await tronRpc('throne_get');
    if (r.error) { TRON.err = r.error.includes('function') || r.error.includes('does not exist') ? 'Serverul nu are încă funcțiile Tronului (rulează supabase/01-throne.sql).' : r.error; return; }
    TRON.err = ''; TRON.st = r.data; TRON.off = r.data.now - Date.now();
    /* prima dată: apărarea se publică singură (altfel butonul de provocare ar rămâne blocat de „Publică-ți apărarea”) */
    if (r.data.me && !r.data.me.level && S.lvl >= TT.CFG.minLevel && !TRON.autoPub) {
      TRON.autoPub = true;
      if (await tronPublish(true)) { const r2 = await tronRpc('throne_get'); if (!r2.error) { TRON.st = r2.data; TRON.off = r2.data.now - Date.now(); } }
    }
    if (TRON.st.me && typeof TRON.st.me.title === 'string' && TRON.st.me.title) { tronInit(); S.tron.title = TRON.st.me.title; }
  } finally { TRON.at = Date.now(); TRON.loading = false; tronUi(); }
}

/* instantaneul apărării: echipa activă, cu statisticile REALE ale motorului (fără plafon; plafonul se aplică la luptă și pe server) */
function tronUnits() {
  return S.fs.slice(0, TT.CFG.maxUnits).map(f => { const b = bon(f); return { n: f.n, c: f.c, hp: mhp(f), atk: Math.round(atkOf(f)), def: Math.round(b.def * (1 + b.pf / 100) + tr(f, 'def')) }; });
}
async function tronPublish(quiet) {
  if (S.lvl < TT.CFG.minLevel) { if (!quiet) { S.msg = 'Nivel minim ' + TT.CFG.minLevel + ' pentru Tron.'; go(); } return false; }
  if (!(await tronUid())) { if (!quiet) { S.msg = 'Conectează-te la cont ca să participi la Tron.'; go(); } return false; }
  const h = S.fs.find(f => f.h) || S.fs[0], local = tronUnits();
  const r = await tronRpc('throne_publish', { p_name: h.n, p_level: S.lvl, p_ghost: { v: 1, units: local } });
  if (r.error) { if (!quiet) { S.msg = 'Nu am putut publica apărarea: ' + r.error; go(); } return false; }
  TRON.pub = r.data.units.map((u, i) => Object.assign({}, u, { capped: !!(local[i] && (local[i].hp > u.hp || local[i].atk > u.atk || local[i].def > u.def)) })); TRON.pubAt = Date.now();
  if (!quiet) { S.msg = 'Apărarea ta a fost actualizată.'; await tronSync(); go(); }
  return true;
}

/* ------------------------------------------------------------------ LUPTA */
async function tronProvoca() {
  if (TRON.busy) return; tronInit();
  if (S.d) { S.msg = 'Ești deja într-o luptă.'; return go(); }
  if (!S.fs.some(f => f.hp > 0)) { S.msg = 'Toți luptătorii sunt căzuți. Du-i la infirmerie.'; return go(); }
  if (S.tron.cur) { S.msg = 'Ai un rezultat de trimis; așteaptă o clipă.'; return go(); }
  TRON.busy = true;
  try {
    if (!(await tronPublish(true))) { S.msg = 'Nu am putut publica apărarea ta. Verifică nivelul (minim ' + TT.CFG.minLevel + ') și conexiunea.'; return; }
    const r = await tronRpc('throne_challenge_start');
    if (r.error) { S.msg = r.error; await tronSync(); return; }
    S.tron.cur = { id: r.data.id, win: false }; tronFight(r.data);
  } finally { TRON.busy = false; if (!S.d) go(); }
}
function tronFight(data) {
  const d = { room: 1, rooms: 1, k: 1, rw: 0, bn: 'Fantomă', di: 0, raid: -3, rn: 'Tronul de Argint', lbl: 'Tron', tron: 1, rf: 1, fx: 1, loot: { gold: 0, ore: 0, xp: 0, m: {} }, f: null, done: false };
  if (data.ghost && data.ghost.units) { d.ghost = data.ghost.units.map(u => TT.ghostUnit(u)); d.bn = data.holder_name || 'Regele'; d.em = { ghost: 1 }; }
  else { d.k = TW.kb(S.lvl) * TT.CFG.guardK; d.bn = 'Garda Regală'; d.em = { nm: ['Garda Regală'], hm: 1, am: 1, dm: 1 }; }
  S.d = d; startF(true); S.tab = 'c'; S.msg = 'Te lupți pentru Tronul de Argint: ' + d.bn + '.';
  if (S.auto !== false) { autoRun(); return; } go();
}
/* unitățile fantomei înlocuiesc inamicii generați (apelat din terEm) */
function tronGhostUnits(es, d) {
  es.length = 0;
  d.ghost.forEach((u, i) => es.push({ n: u.n, hp: u.hp, mh: u.hp, atk: u.atk, def: u.def, bl: 0, st: 0, b: i === 0 }));
}
/* victorie: fără pradă și fără să numere la misiunile zilnice (luptele cu fantome sunt gratuite, deci nu pot fi exploatate) */
function tronWin(d) {
  d.loot = { gold: 0, ore: 0, xp: 0, m: {} };
  if (S.cn && S.cn.w > 0) S.cn.w--;
  if (!S.ib && S.dm && Array.isArray(S.dm.list)) S.dm.list.forEach(x => { if (x.k === 'w' && x.g > 0) x.g--; });
  d.cm = 'Ai învins apărarea! Rezultatul se trimite serverului.';
  tronInit(); if (S.tron.cur) S.tron.cur.win = true;
}
/* apelat din go(): după luptă (victorie, înfrângere sau fugă) raportează rezultatul; reîncearcă dacă pică conexiunea */
function tronCheck() {
  const t = S && S.tron; if (!t || !t.cur) return;
  if (S.d && S.d.tron) { if (!S.d.done) return; S.d = null; t.cur.win = true; S.msg = 'Ai învins apărarea! Se trimite rezultatul…'; }
  if (!TRON.rep) tronReport(t.cur);
}
async function tronReport(cur) {
  TRON.rep = true;
  try {
    const r = await tronRpc('throne_challenge_finish', { p_id: cur.id, p_win: !!cur.win });
    if (r.error && !/necunoscut/i.test(r.error)) { TRON.repErr = r.error; return; }          /* rețea sau server: rămâne de trimis */
    TRON.repErr = ''; S.tron.cur = null;
    S.msg = r.error ? 'Provocarea nu mai există pe server.' : r.data.crowned ? '👑 Ai ocupat Tronul de Argint! Ține-l cât mai mult.' : cur.win ? 'Victorie, dar ' + String(r.data.reason || '').toLowerCase() + '.' : 'Ai pierdut provocarea. Poți reîncerca după pauză.';
    save();
  } finally { TRON.rep = false; }
  await tronSync(); if (S.tab !== 'c' || !S.d) go();
}

/* ------------------------------------------------------------------ PREMII */
async function tronClaim(week, mat) {
  tronInit(); const p = TRON.st && TRON.st.me.pending.find(x => x.week === week);
  if (!p || !p.options.includes(mat)) { S.msg = 'Alegere invalidă.'; return go(); }
  if (have(mat) + p.amount > cap()) { S.msg = `Depozitul nu are loc pentru ${p.amount} × ${mn(mat)} (ai ${have(mat)}/${cap()}). Fă loc și încearcă din nou.`; return go(); }
  const r = await tronRpc('throne_claim', { p_week: week, p_material: mat });
  if (r.error) { S.msg = r.error; await tronSync(); return go(); }
  give(mat, r.data.amount); S.tron.title = r.data.title; S.tron.grants[week] = { mat, amount: r.data.amount };
  S.msg = `Ai primit ${r.data.amount} × ${mn(mat)} și titlul „${r.data.title}”.`; save(); await tronSync(); go();
}

/* ------------------------------------------------------------------ INTERFAȚĂ */
const tronHM = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? h + ' h ' + String(m).padStart(2, '0') + ' min' : m + ' min'; };
const tronKindTxt = k => ({ king: 'Rege', k2: 'Loc 2', k3: 'Loc 3', part: 'Participare' })[k] || k;
/* ce arată panoul lateral (panou.js): un rând, sau null dacă nu avem date */
function tronRow() {
  const st = TRON.st; if (!st || TRON.err) return null; const left = st.week_end - tronNow(), pend = st.me.pending.length;
  if (pend) return sdRow('♛', 'Tron: premiu de revendicat', '', "sdGo('m','mt','r')", true);
  return sdRow('♛', st.holder ? 'Tronul: ' + tEsc(st.holder.name) : 'Tronul e gol', sdT(left), "sdGo('m','mt','r')", false);
}
function tronNeedSync() {
  const st = TRON.st, n = tronNow();
  if (!TRON.st) return Date.now() - TRON.at > 60000 || !TRON.at;
  if (Date.now() - TRON.at > 60000) return true;
  if (n >= st.week_end) return true;                                                        /* s-a închis săptămâna */
  if (st.me.cooldown_until && n >= st.me.cooldown_until && /Pauză/.test(st.me.reason || '')) return true;
  if (st.holder && n >= st.holder.protect_until && /protejat/.test(st.me.reason || '')) return true;
  return false;
}
function vTron() {
  tronInit(); const st = TRON.st; if (tronNeedSync() && !TRON.loading) tronSync();
  const unit = u => `${tEsc(u.n)} <span class="mute">${u.c} · ${u.hp} viață, ${u.atk} atac, ${u.def} apărare${u.capped ? ' (plafonat)' : ''}</span>`;
  let h = `<section><h2>♛ Tronul de Argint</h2><div class="mute">Regele e cine ține Tronul cel mai mult timp într-o săptămână. Provocarea e <b>gratuită</b>: lupți cu „fantoma” (echipa salvată) a deținătorului; dacă o învingi, Tronul e al tău. Săptămâna se încheie vineri la 15:00 (ora României). Nivel minim ${TT.CFG.minLevel}.</div>`;
  if (!st) {
    h += `<p class="${TRON.err ? 'r4' : 'mute'}">${TRON.err || (TRON.loading ? 'Se încarcă starea Tronului…' : 'Se încarcă…')}</p>${TRON.err ? '<div class="row"><span class="mute">Reîncearcă după ce te conectezi sau după ce serverul e pregătit.</span><button onclick="tronSync()">Reîncearcă</button></div>' : ''}</section>`;
    return h + vTronPrizes();
  }
  const left = st.week_end - tronNow(), me = st.me, ho = st.holder;
  h += `<div class="row"><span>Săptămâna <b>${st.week + 1}</b> se închide în <b>${tronHM(left / 1000)}</b><br><span class="mute">${st.participants} ${st.participants === 1 ? 'participant' : 'participanți'} săptămâna aceasta</span></span><button onclick="tronSync()">Actualizează</button></div></section>`;
  h += `<section style="border-left-color:var(--ember)"><h2>${ho ? '👑 ' + tEsc(ho.name) : 'Tronul e gol'}</h2>`;
  if (ho) { const prot = ho.protect_until - tronNow(); h += `<div class="mute">Nivel ${ho.level} · ține Tronul de ${tronHM((tronNow() - ho.since) / 1000)}${prot > 0 ? ` · protejat încă <span data-end="${ho.protect_until - TRON.off}">${fmt(prot)}</span>` : ''}</div>`; }
  else h += '<div class="mute">Îl apără Garda Regală. Cine o învinge devine rege.</div>';
  const cd = me.cooldown_until - tronNow(), low = S.lvl < TT.CFG.minLevel;
  if (low) { me.can_challenge = false; me.reason = 'Nivel minim ' + TT.CFG.minLevel + ' (ai ' + S.lvl + ')'; }
  h += `<div class="row"><span>${me.can_challenge ? 'Poți provoca acum.' : `<span class="r4">${tEsc(me.reason || 'Indisponibil')}</span>${/Pauză/.test(me.reason || '') && cd > 0 ? ` <span data-end="${me.cooldown_until - TRON.off}">${fmt(cd)}</span>` : ''}`}<br><span class="mute">Provocări azi: ${me.challenges_today}/${me.daily_cap}</span></span><button class="p" onclick="tronProvoca()"${me.can_challenge && !S.d && !TRON.busy && !(S.tron && S.tron.cur) ? '' : ' disabled'}>Provoacă (gratuit)</button></div>`;
  if (S.tron && S.tron.cur) h += `<div class="row"><span class="r4">Rezultatul ultimei lupte nu a ajuns încă la server${TRON.repErr ? ' (' + tEsc(TRON.repErr) + ')' : ''}. Se reîncearcă automat.</span><button onclick="tronCheck()">Trimite acum</button></div>`;
  h += '</section>';
  if (me.pending.length) h += `<section style="border-left-color:var(--gold2)"><h2>Premii de revendicat</h2>` + me.pending.map(p => `<div style="margin:8px 0"><b>Săptămâna ${p.week + 1}: ${tronKindTxt(p.kind)}</b> · titlu „${tEsc(p.title)}” · <b>${p.amount}</b> materiale rare<div class="row" style="flex-wrap:wrap;gap:6px;justify-content:flex-start">${p.options.map(m => `<button onclick="tronClaim(${p.week},'${m}')">${tEsc(mn(m))} (${have(m)}/${cap()})</button>`).join('')}</div></div>`).join('') + '</section>';
  h += `<section><h2>Clasamentul săptămânii</h2>` + (st.ranking.length ? st.ranking.map(r => `<div class="row"><span>${r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank + '.'} <b>${tEsc(r.name)}</b>${r.is_holder ? ' 👑' : ''}${r.user_id === me.user_id ? ' <span class="mute">(tu)</span>' : ''}</span><span>${tronHM(r.seconds)}</span></div>`).join('') : '<p class="mute">Nimeni nu a ținut încă Tronul în această săptămână.</p>') + '</section>';
  h += `<section><h2>Apărarea ta (fantoma)</h2><div class="mute">Așa te văd ceilalți când te provoacă. Statisticile sunt plafonate la ce are un luptător de nivel ${TT.CFG.ghostCapLevel} cu echipament Epic complet, ca diferențele mari de nivel să nu decidă totul. Fantoma lovește doar normal (fără abilități speciale).</div>`;
  const u = TRON.pub || null; h += u ? u.map(x => `<div class="row"><span>${unit(x)}</span></div>`).join('') : '<p class="mute">Încă nepublicată.</p>';
  h += `<div class="row"><span class="mute">${TRON.pubAt ? 'Actualizată acum ' + tronHM((Date.now() - TRON.pubAt) / 1000) : 'Se publică automat când provoci.'}</span><button onclick="tronPublish()">Actualizează apărarea</button></div></section>`;
  h += vTronPrizes(me.level || S.lvl);
  if (st.hall.length) h += `<section><h2>Sala Faimei</h2>` + st.hall.map(x => `<div class="row" style="align-items:flex-start"><span><b>Săptămâna ${x.week + 1}</b></span><span style="text-align:right">${x.top.map(t => `${t.rank === 1 ? '👑' : t.rank === 2 ? '🥈' : '🥉'} ${tEsc(t.name)} <span class="mute">(${tronHM(t.seconds)})</span>`).join('<br>')}</span></div>`).join('') + '</section>';
  return h;
}
function vTronPrizes(L) {
  L = L || S.lvl; const ops = TT.rareOptions(L).map(k => mn(k)).join(', ') || 'niciunul încă (de la nivelul 5)';
  return `<section><h2>Premii (la nivelul tău: ${L})</h2><div class="mute">Materiale rare la alegere (${tEsc(ops)}) și un titlu. Premiul crește cu nivelul tău.</div>` +
    ['king', 'k2', 'k3', 'part'].map(k => `<div class="row"><span>${tronKindTxt(k)} · <span class="mute">${TT.title(k)}</span></span><span><b>${TT.amount(k, L)}</b> materiale</span></div>`).join('') + '</section>';
}

/* pornire: citește starea o dată și reîncearcă periodic ce n-a ajuns la server */
if (typeof document !== 'undefined' && typeof setInterval === 'function') {
  setTimeout(() => { try { tronInit(); if (typeof supabaseClient !== 'undefined') tronSync(); } catch (e) { /* fără server */ } }, 2500);
  setInterval(() => {
    try {
      if (S && S.tron && S.tron.cur && !TRON.rep && (!S.d || !S.d.tron)) tronCheck();
      if (S && S.tab === 'm' && S.mt === 'r' && !TRON.loading && tronNeedSync()) tronSync();
      else if (!TRON.loading && TRON.st && Date.now() - TRON.at > 300000) tronSync();
      if (TRON.st && TRON.st.me && TRON.st.me.level && S.lvl >= TT.CFG.minLevel && TRON.pubAt && Date.now() - TRON.pubAt > 600000) tronPublish(true);   /* apărarea rămâne la zi */
    } catch (e) { /* ignorat: se reia la următorul ciclu */ }
  }, 30000);
}
