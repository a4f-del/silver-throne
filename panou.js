/* ============================================================================
   Silver Throne — panou.js
   Panoul din bara laterală (doar pe ecran lat, ≥ 960 px): cardul eroului, starea echipei,
   „Acum” (ce se întâmplă și ce așteaptă să fie ridicat) și insigne numerice pe navigare.

   Doar CITEȘTE starea jocului; singura acțiune directă e „Vindecă”, care apelează heal()
   (aceeași funcție și același cost ca butonul din Echipă). Se încarcă după inventar.js.
   Dacă ceva eșuează, bara de navigare rămâne funcțională (sideHtml prinde erorile).
   ========================================================================== */

/* mergi la o filă (și, opțional, la o subfilă) cu o singură randare */
function sdGo(t, sub, val) {
  S.tab = t; S.msg = '';
  if (sub === 'vil') S.vil = val; else if (sub === 'mt') S.mt = val; else if (t === 'a') S.vil = '';   /* „Sat” fără clădire = imaginea satului */
  go();
}

/* insigna numerică de pe butoanele de navigare ('' dacă nu e nimic de făcut) */
function navBadge(k) {
  let n = 0;
  try {
    if (k === 'a') n = dmReady() + sdForgeReady();
    else if (k === 'c') n = S.d ? 1 : 0;
    else if (k === 'm') n = cmpReady() + (S.ex ? 1 : 0);
    else if (k === 'r') n = (typeof tronPend === 'function' && tronPend()) ? 1 : 0;
    else if (k === 'e') n = S.fs.filter(f => f.hp <= 0).length + (typeof spNeedN === 'function' ? spNeedN() : 0);
  } catch (e) { n = 0; }
  return n > 0 ? `<b class="nb" aria-label="${n} de făcut">${n}</b>` : '';
}

/* sloturile de forjă gata de ridicat / în lucru */
/* timp scurt pentru bara îngustă: „1h 40m”, „35m” */
const sdT = ms => { const m = Math.max(0, Math.ceil(ms / 60000)); return m >= 60 ? Math.floor(m / 60) + 'h ' + String(m % 60).padStart(2, '0') + 'm' : m + 'm'; };
const sdFin = x => !!x && typeof x === 'object' && Number.isFinite(+x.end);          /* intrări de forjă valide */
const sdForgeReady = () => (S.forge || []).filter(x => sdFin(x) && +x.end <= Date.now()).length;
const sdForgeBusy = () => (S.forge || []).filter(x => sdFin(x) && +x.end > Date.now());

function sdHero() {
  const h = S.fs.find(f => f.h) || S.fs[0], xp = Math.min(100, S.xp / Math.max(1, need(S.lvl)) * 100);
  return `<div class="sd-hero">${av(h, 52)}<div class="sd-hm"><b>${tEsc(h.n)}</b><small>Nivel ${S.lvl} · ${terStage()}</small>${S.tron && S.tron.title ? `<small class="sd-title">♛ ${tEsc(S.tron.title)}</small>` : ''}<i class="xpb"><i style="width:${xp}%"></i></i><small>${S.xp}/${need(S.lvl)} exp.</small></div></div>`;
}

function sdTeam() {
  const hurt = S.fs.some(f => f.hp > 0 && f.hp < mhp(f)), cost = Math.round(6 * S.lvl * Math.pow(.96, BL().i));
  const rows = S.fs.map(f => {
    const hp = Number.isFinite(f.hp) ? f.hp : 0, m = Math.max(1, mhp(f)), p = Math.max(0, Math.min(100, hp / m * 100)), cls = hp <= 0 ? 'dead' : p < 40 ? 'low' : '';
    return `<div class="sd-f ${cls}"><span class="sd-fn">${tEsc(f.n)}</span><span class="sd-fh">${hp <= 0 ? '☠ căzut' : hp + '/' + m}</span><i class="sdb"><i style="width:${p}%"></i></i></div>`;
  }).join('');
  const bench = (S.rs || []).length;
  return `<div class="sd-t">Echipa${bench ? ` <span class="mute">· +${bench} în rezervă</span>` : ''}</div>${rows}${hurt && !S.d ? `<button class="sd-heal" onclick="heal()">Vindecă răniții · ${cost} aur</button>` : ''}${typeof reviveAllBtn === 'function' ? reviveAllBtn('sd-heal') : ''}`;
}

/* simbolurile vechi → iconițele pictate (imagini/ui/) */
const SD_UI = { '⚔': 'ui-tabara', '🎯': 'ui-misiuni', '👑': 'ui-campanie', '✔': 'ui-forja', '⚒': 'ui-forja', '⛏': 'nav-coborare', '🧭': 'nav-harta', '✦': 'slot-relicva' };
function sdRow(ic, txt, right, onclick, hot) {
  const im = SD_UI[ic] ? `<img class="uii" src="imagini/ui/${SD_UI[ic]}.webp" alt="">` : ic;
  return `<button class="sd-r${hot ? ' hot' : ''}" onclick="${onclick}"><span class="sd-i">${im}</span><span class="sd-x">${txt}</span><span class="sd-v">${right || ''}</span></button>`;
}

function sdTasks() {
  const r = [], now = Date.now();
  if (S.d) r.push(sdRow('⛏', 'În coborâre', '', "sdGo('c')", true));
  if (S.ex) r.push(sdRow('🧭', 'Expediție în curs', 'continuă', "sdGo('m','mt','l')", true));
  const busy = sdForgeBusy(), ready = sdForgeReady(), slots = (S.forge || []).length;
  if (ready) r.push(sdRow('✔', `Forjă: ${ready} ${ready === 1 ? 'obiect gata' : 'obiecte gata'}`, 'ridică', "sdGo('a','vil','a')", true));
  if (busy.length) { const nx = Math.min(...busy.map(x => +x.end)); r.push(sdRow('⚒', `Forjă ${busy.length}/${slots}`, `<span data-end="${nx}">${fmt(nx - now)}</span>`, "sdGo('a','vil','a')")); }
  const cp = ((S.ter && S.ter.camps) || []).filter(c => c && Number.isFinite(+c.exp));
  if (cp.length) { const nx = Math.min(...cp.map(c => +c.exp)); r.push(sdRow('⚔', `Tabere: ${cp.length}`, sdT(nx - now), "sdGo('m','mt','l')")); }
  for (const b of ((S.ter && S.ter.buf) || [])) if (b && Number.isFinite(+b.exp) && Number.isFinite(+b.v) && b.exp > now) r.push(sdRow('✦', `+${b.v}% ${({ pd: 'atac', pf: 'apărare', ph: 'viață' })[b.k] || b.k}`, `<span data-end="${b.exp}">${fmt(b.exp - now)}</span>`, "sdGo('m','mt','l')"));
  const m = dm(), dr = dmReady(), done = m.list.filter(x => x.c).length;
  r.push(sdRow('🎯', 'Misiuni zilnice', dr ? `${dr} de ridicat` : `${done}/${m.list.length}`, "sdGo('a','vil','x')", dr > 0));
  const ch = chCur();
  if (ch) { const d = ch.obj.filter(objDone).length, rd = chReady(ch); r.push(sdRow('👑', `Cap. ${ch.id}: ${tEsc(ch.nm)}`, rd ? 'gata!' : `${d}/${ch.obj.length}`, "sdGo('m','mt','k')", rd)); }
  else r.push(sdRow('👑', 'Campanie încheiată', '✔', "sdGo('m','mt','k')"));
  if (typeof tronRow === 'function') { const x = tronRow(); if (x) r.push(x); }
  if (typeof lumeRow === 'function') { const x = lumeRow(); if (x) r.push(x); }
  const own = terOwnedV().length, debt = S.ter && S.ter.debt > 0;
  r.push(sdRow(debt ? '⚠' : '🚩', `Teritorii: ${own}/${S.map.vs.length}`, debt ? 'datorie' : '', "sdGo('m','mt','t')", debt));
  return `<div class="sd-t">Acum</div>${r.join('')}`;
}

function sideHtml() {
  try { return `<div class="side">${sdHero()}${sdTeam()}${sdTasks()}<div class="sd-end">♛</div></div>`; }
  catch (e) { if (typeof console !== 'undefined') console.error('panou lateral:', e); return ''; }
}

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = '.nb{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;margin-left:6px;border-radius:9px;background:var(--gold);color:#1a1306;font:700 12px sans-serif;line-height:1;box-shadow:0 0 6px #c9a24b88}'
    + '.side{display:none}'
    + '@media (min-width:960px){nav{overflow-y:auto}.side{display:block;margin-top:10px;padding-top:12px;border-top:1px solid var(--line)}'
    + '.sd-hero{display:flex;gap:10px;align-items:center;padding:8px;background:linear-gradient(180deg,#1d2427,#141a1c);border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:4px;margin-bottom:12px}'
    + '.sd-hm{min-width:0;flex:1}.sd-hm b{display:block;font:700 16px Cinzel,serif;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sd-hm small{display:block;font-size:12px;color:var(--mute);line-height:1.25}'
    + '.sd-title{color:var(--gold2)!important}.sd-t{font:700 12px Cinzel,serif;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);margin:12px 2px 6px}'
    + '.sd-f{padding:3px 2px}.sd-fn{font-size:14px;color:var(--ink)}.sd-fh{float:right;font-size:12px;color:var(--mute)}.sd-f.low .sd-fh{color:var(--ember)}.sd-f.dead .sd-fh,.sd-f.dead .sd-fn{color:var(--blood)}'
    + '.sdb{display:block;height:5px;background:#000;border:1px solid var(--line);margin-top:3px;clear:both}.sdb i{display:block;height:100%;background:linear-gradient(90deg,#2d6b3a,#4fa35e)}.sd-f.low .sdb i{background:linear-gradient(90deg,#8a5a1a,var(--ember))}.sd-f.dead .sdb i{background:var(--blood)}'
    + '.sd-heal{width:100%;margin-top:8px;padding:7px 10px;font-size:13px}'
    + '.sd-r{display:flex;align-items:center;gap:8px;width:100%;margin:0 0 5px;padding:7px 9px;text-align:left;font-size:13px;border:1px solid var(--line);border-radius:4px;background:linear-gradient(180deg,#181e21,#0e1214);color:var(--ink)}'
    + '.sd-r:hover{border-color:var(--gold)}.sd-r.hot{border-color:var(--gold);box-shadow:inset 3px 0 var(--gold),0 0 8px #c9a24b33}'
    + '.sd-i{flex:none;width:20px;text-align:center}.sd-x{flex:1;min-width:0}.sd-v{flex:none;font-size:12px;color:var(--mute);white-space:nowrap}.sd-r.hot .sd-v{color:var(--gold2)}'
    + '.sd-end{text-align:center;margin:14px 0 4px;color:var(--line);font-size:20px}}';
  document.head.appendChild(st);
})();
