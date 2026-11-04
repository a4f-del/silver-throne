/* ============================================================================
   Silver Throne — bazar.js
   Bazarul între jucători: a treia filă a Pieței (Piață › Bazar; piata.js), cheia 'y'.
   Serverul (supabase/07-bazar.sql) ține obiectele puse la vânzare și mută aurul; clientul nu schimbă niciodată
   singur aurul din bazar: totul vine prin wallet_sync (pend_gold), deci după fiecare operație apelăm pfSync().
     Cumpără        — ofertele altor jucători (bazar_browse), cu filtre; „Cumpără” → bazar_buy
     Vinde          — rucsacul; alegi prețul → bazar_list; doar dacă serverul acceptă, obiectul iese din rucsac
     Ofertele mele  — ofertele tale (bazar_mine), „Retrage” → bazar_cancel
   Cutia poștală: obiectele cumpărate, retrase sau expirate (bazar_claim) intră în rucsac la pornire, la intrarea în Bazar
   și o dată pe minut; fereastra de recompense le arată cu titlul „Bazar”.
   Legendarele nu se vând (sunt legate de cont). Bazarul se deschide la nivelul 15. Botul nu-l folosește.
   Imaginea clădirii: imagini/ui/bazar.webp (dacă lipsește, apare o iconiță de rezervă).
   ========================================================================== */
const BZ = {
  tab: 'c', f: { t: '', r: '', lmin: 1, lmax: 60 }, page: 0,
  rows: null, total: 0, mine: null, inbox: 0, open: 0,
  busy: 0, msg: '', err: '', px: new WeakMap(), lastClaim: 0, off: 0
};
const BZ_MIN = 15, BZ_FEE = 0.02, BZ_CUT = 0.05, BZ_MULT = 5000;
const BZ_T = [['', 'Toate'], ['w', 'Arme'], ['a', 'Armuri'], ['h', 'Coifuri'], ['b', 'Cizme'], ['j', 'Bijuterii'], ['r', 'Relicve']];
const bzShop = it => 4 + it.l * 3 * (it.r + 1);                                   /* ca la Piață: sell() */
const bzMax = it => Math.floor(bzShop(it) * BZ_MULT * (1 + (it.up || 0) / 3));
const bzN = n => Math.round(n).toLocaleString('ro-RO');
const bzE = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const bzSellable = it => it && !it.lg && !it.lk;
const bzOn = () => typeof CONT !== 'undefined' && CONT.user && typeof tronRpc === 'function';

/* curăță mesajele de eroare venite de la server ("... CONTEXT: ...") */
const bzErr = e => String(e || 'Eroare.').replace(/\s*CONTEXT:[\s\S]*$/, '').replace(/^ERROR:\s*/, '');
const bzMissing = e => /Could not find the function|does not exist|schema cache/i.test(e || '');

async function bzCall(fn, args) {
  const r = await tronRpc(fn, args);
  if (r.error && bzMissing(r.error)) BZ.off = 1;
  return r;
}
/* portofelul la zi: așteaptă o sincronizare deja pornită, apoi încă una */
async function bzSync() {
  if (typeof pfSync !== 'function') return;
  for (let i = 0; i < 40 && typeof PF !== 'undefined' && PF.busy; i++) await new Promise(r => setTimeout(r, 150));
  await pfSync();
}
function bzUi() { try { if (S.tab === 'a' && S.vil === 'p' && S.pt === 'y') go(); } catch (e) { /* se redesenează la următoarea acțiune */ } }

/* ------------------------------------------------------------------ CUTIA POȘTALĂ */
async function bzClaim(force) {
  if (!bzOn() || BZ.off || typeof S === 'undefined' || !S) return;
  if (!force && Date.now() - BZ.lastClaim < 50000) return;
  BZ.lastClaim = Date.now();
  const r = await bzCall('bazar_claim');
  if (r.error || !Array.isArray(r.data) || !r.data.length) return;
  const got = r.data.map(x => x.item).filter(it => it && typeof it === 'object' && it.t);
  if (!got.length) return;
  S.inv = S.inv || []; got.forEach(it => S.inv.push(it)); BZ.inbox = 0;
  const why = r.data.map(x => x.reason), n = got.length;
  const t = why.every(x => x === 'cumparat') ? (n === 1 ? 'Bazar: obiectul cumpărat' : 'Bazar: obiectele cumpărate')
    : why.every(x => x !== 'cumparat') ? (n === 1 ? 'Bazar: obiect întors în rucsac' : 'Bazar: obiecte întoarse în rucsac') : 'Bazar';
  save();
  if (typeof rwShow === 'function') rwShow({ g: 0, o: 0, p: 0, x: 0, l: 0, f: 0, m: {}, it: got }, t, true);
  else S.msg = `${t}: ${got.map(it => it.name).join(', ')}.`;
  go();
}

/* ------------------------------------------------------------------ ÎNCĂRCARE */
async function bzBrowse(page) {
  if (BZ.busy) return; BZ.busy = 1; BZ.err = ''; if (page != null) BZ.page = Math.max(0, page);
  const f = BZ.f, r = await bzCall('bazar_browse', { p_t: f.t || null, p_lmin: +f.lmin || 1, p_lmax: +f.lmax || 60, p_r: f.r === '' ? null : +f.r, p_page: BZ.page });
  BZ.busy = 0;
  if (r.error) { BZ.err = bzErr(r.error); BZ.rows = BZ.rows || []; }
  else { BZ.rows = (r.data && r.data.rows) || []; BZ.total = (r.data && r.data.total) || 0; }
  bzUi();
}
async function bzMine() {
  if (BZ.busy) return; BZ.busy = 1; BZ.err = '';
  const r = await bzCall('bazar_mine');
  BZ.busy = 0;
  if (r.error) { BZ.err = bzErr(r.error); BZ.mine = BZ.mine || []; }
  else { BZ.mine = (r.data && r.data.rows) || []; BZ.inbox = (r.data && r.data.inbox) || 0; BZ.open = BZ.mine.filter(x => x.state === 'open').length; }
  bzUi();
}
function bzTab(k) { BZ.tab = k; BZ.msg = ''; BZ.err = ''; if (k === 'c') BZ.rows = null; if (k === 'm') BZ.mine = null; go(); }
function bzFilter() {
  const v = id => { const e = document.getElementById(id); return e ? e.value : ''; };
  BZ.f = { t: v('bz-ft'), r: v('bz-fr'), lmin: Math.max(1, +v('bz-fl') || 1), lmax: Math.min(60, +v('bz-fh') || 60) };
  if (BZ.f.lmax < BZ.f.lmin) BZ.f.lmax = BZ.f.lmin;
  bzBrowse(0);
}

/* ------------------------------------------------------------------ ACȚIUNI */
async function bzBuy(id) {
  const o = (BZ.rows || []).find(x => x.id === id); if (!o || BZ.busy) return;
  if ((S.gold || 0) < o.price) { BZ.err = `Îți trebuie ${bzN(o.price)} aur.`; return go(); }
  if (!confirm(`Cumperi „${o.item.name}” cu ${bzN(o.price)} aur?`)) return;
  BZ.busy = 1; BZ.err = ''; BZ.msg = 'Se cumpără…'; go();
  await bzSync();                                         /* serverul trebuie să știe aurul tău de acum */
  const r = await bzCall('bazar_buy', { p_id: id });
  BZ.busy = 0;
  if (r.error) { BZ.msg = ''; BZ.err = bzErr(r.error); BZ.rows = null; return go(); }
  BZ.msg = `Ai cumpărat „${o.item.name}”.`; BZ.rows = (BZ.rows || []).filter(x => x.id !== id); BZ.total = Math.max(0, BZ.total - 1);
  await bzSync();                                         /* aurul scade prin portofel */
  await bzClaim(true);                                    /* obiectul vine din cutia poștală */
  go();
}
function bzPx(i, v) { const it = S.inv[i]; if (it) BZ.px.set(it, Math.max(0, Math.floor(+v || 0))); const e = document.getElementById('bz-fee-' + i); if (e) e.textContent = bzN(Math.ceil((+v || 0) * BZ_FEE)); }
async function bzList(i) {
  const it = S.inv[i]; if (!bzSellable(it) || BZ.busy) return;
  const inp = document.getElementById('bz-p-' + i), price = Math.floor(+(inp ? inp.value : BZ.px.get(it)) || 0), mn = bzShop(it), mx = bzMax(it);
  if (price < mn || price > mx) { BZ.err = `Prețul pentru „${it.name}” trebuie să fie între ${bzN(mn)} și ${bzN(mx)} aur.`; return go(); }
  const fee = Math.ceil(price * BZ_FEE);
  if ((S.gold || 0) < fee) { BZ.err = `Taxa de listare e ${bzN(fee)} aur.`; return go(); }
  BZ.busy = 1; BZ.err = ''; BZ.msg = 'Se pune la vânzare…'; go();
  await bzSync();
  const item = JSON.parse(JSON.stringify(it));
  const r = await bzCall('bazar_list', { p_item: item, p_price: price });
  BZ.busy = 0;
  if (r.error) { BZ.msg = ''; BZ.err = bzErr(r.error); return go(); }
  const k = S.inv.indexOf(it); if (k >= 0) S.inv.splice(k, 1);     /* abia acum iese din rucsac */
  BZ.px.delete(it); BZ.open++; BZ.mine = null;
  save();
  BZ.msg = `„${it.name}” e la vânzare cu ${bzN(price)} aur (taxă ${bzN(fee)}).`;
  await bzSync();
  go();
}
async function bzCancel(id) {
  if (BZ.busy) return;
  BZ.busy = 1; BZ.err = ''; go();
  const r = await bzCall('bazar_cancel', { p_id: id });
  BZ.busy = 0;
  if (r.error) { BZ.err = bzErr(r.error); BZ.mine = null; return go(); }
  BZ.msg = 'Oferta a fost retrasă; obiectul se întoarce în rucsac.'; BZ.mine = null;
  await bzClaim(true); go();
}

/* ------------------------------------------------------------------ PAGINA */
const BZ_ST = { open: ['activă', 'bz-on'], sold: ['vândută', 'bz-ok'], cancelled: ['retrasă', ''], expired: ['expirată', ''] };
function bzLeft(t) { const ms = new Date(t).getTime() - Date.now(); if (!(ms > 0)) return 'expiră acum'; const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60; return h ? `${h} h ${m} min` : `${m} min`; }
function bzItem(it) { return `<span class="ic-n"${typeof itTipA === 'function' ? itTipA(it) : ''}>${typeof iname === 'function' ? iname(it) : bzE(it.name)}</span>`; }

function bzBuyTab() {
  if (BZ.rows === null) { setTimeout(() => bzBrowse(), 0); return '<p class="mute">Se încarcă ofertele…</p>'; }
  const f = BZ.f, sel = (id, opts, v) => `<select id="${id}">${opts.map(([k, n]) => `<option value="${k}"${String(v) === String(k) ? ' selected' : ''}>${n}</option>`).join('')}</select>`;
  const filt = `<div class="bz-f">${sel('bz-ft', BZ_T, f.t)}${sel('bz-fr', [['', 'Orice raritate'], ...RAR.map((x, i) => [i, x.n])], f.r)}`
    + `<label>niv. <input id="bz-fl" type="number" min="1" max="60" value="${f.lmin}"></label><label>– <input id="bz-fh" type="number" min="1" max="60" value="${f.lmax}"></label>`
    + `<button onclick="bzFilter()">Caută</button></div>`;
  const rows = BZ.rows.length ? BZ.rows.map(o => {
    const can = !o.mine && (S.gold || 0) >= o.price;
    return `<div class="row bz-r"><span>${bzItem(o.item)}<br><span class="mute">de la ${bzE(o.seller_name)} · ${bzLeft(o.expires_at)}</span></span>`
      + (o.mine ? '<span class="mute">oferta ta</span>' : `<button class="p"${can && !BZ.busy ? '' : ' disabled'} onclick="bzBuy(${o.id})">Cumpără · ${bzN(o.price)} aur</button>`) + '</div>';
  }).join('') : '<p class="mute">Nicio ofertă pentru filtrele alese.</p>';
  const pages = Math.ceil(BZ.total / 30), nav = pages > 1 ? `<div class="row"><button${BZ.page ? '' : ' disabled'} onclick="bzBrowse(${BZ.page - 1})">‹ Înapoi</button><span class="mute">pagina ${BZ.page + 1} din ${pages}</span><button${BZ.page + 1 < pages ? '' : ' disabled'} onclick="bzBrowse(${BZ.page + 1})">Înainte ›</button></div>` : '';
  return filt + `<div class="mute bz-tot">${bzN(BZ.total)} ${BZ.total === 1 ? 'ofertă' : 'oferte'}, de la cea mai ieftină · <a href="#" onclick="bzBrowse();return false">reîmprospătează</a></div>` + rows + nav;
}
function bzSellTab() {
  const inv = (S.inv || []).map((it, i) => [it, i]).filter(([it]) => bzSellable(it));
  const hidden = (S.inv || []).filter(it => it && (it.lg || it.lk)).length;
  const head = `<p class="mute">Alegi prețul; la listare plătești o taxă de ${BZ_FEE * 100}% din preț (nu se returnează). Când cineva cumpără, primești prețul minus ${BZ_CUT * 100}% comision. Oferta stă 48 de ore, apoi obiectul se întoarce în rucsac. Cel mult 10 oferte active.</p>`;
  if (!inv.length) return head + '<p class="mute">Nu ai obiecte de pus la vânzare în rucsac.</p>';
  return head + inv.map(([it, i]) => {
    const mn = bzShop(it), sug = BZ.px.get(it) || mn * 3;
    return `<div class="row bz-r"><span>${bzItem(it)}<br><span class="mute">între ${bzN(mn)} și ${bzN(bzMax(it))} aur · taxă <b id="bz-fee-${i}">${bzN(Math.ceil(sug * BZ_FEE))}</b></span></span>`
      + `<span class="bz-sell"><input id="bz-p-${i}" type="number" min="${mn}" max="${bzMax(it)}" step="1" value="${sug}" oninput="bzPx(${i},this.value)" aria-label="Preț pentru ${bzE(it.name)}"><button class="p"${BZ.busy ? ' disabled' : ''} onclick="bzList(${i})">Vinde</button></span></div>`;
  }).join('') + (hidden ? `<p class="mute">${hidden} ${hidden === 1 ? 'obiect nu apare' : 'obiecte nu apar'}: legendarele nu se vând, iar cele blocate 🔒 trebuie deblocate întâi.</p>` : '');
}
function bzMineTab() {
  if (BZ.mine === null) { setTimeout(() => bzMine(), 0); return '<p class="mute">Se încarcă ofertele tale…</p>'; }
  const box = BZ.inbox ? `<div class="row"><span>${BZ.inbox} ${BZ.inbox === 1 ? 'obiect te așteaptă' : 'obiecte te așteaptă'} în cutia poștală</span><button class="p" onclick="bzClaim(true)">Ridică</button></div>` : '';
  if (!BZ.mine.length) return box + '<p class="mute">Nu ai oferte în ultimele 7 zile. Pune ceva la vânzare din fila „Vinde”.</p>';
  return box + BZ.mine.map(o => {
    const [st, cl] = BZ_ST[o.state] || [o.state, ''], net = o.price - Math.floor(o.price * BZ_CUT);
    const info = o.state === 'open' ? `${bzN(o.price)} aur · mai are ${bzLeft(o.expires_at)}` : o.state === 'sold' ? `vândută cu ${bzN(o.price)} · ai primit ${bzN(net)} aur` : `${bzN(o.price)} aur · obiectul s-a întors în rucsac`;
    return `<div class="row bz-r"><span>${bzItem(o.item)}<br><span class="mute"><b class="bz-st ${cl}">${st}</b> · ${info}</span></span>`
      + (o.state === 'open' ? `<button${BZ.busy ? ' disabled' : ''} onclick="bzCancel(${o.id})">Retrage</button>` : '') + '</div>';
  }).join('');
}
function vBazar() {
  let body;
  if (!bzOn()) body = '<p class="mute">Bazarul e între jucători: conectează-te cu un cont ca să cumperi și să vinzi.</p>';
  else if (BZ.off) body = '<p class="mute">Bazarul nu e încă deschis pe server. (Administratorul trebuie să ruleze supabase/07-bazar.sql.)</p>';
  else if ((S.lvl || 1) < BZ_MIN) body = `<p class="mute">Bazarul se deschide la nivelul ${BZ_MIN}. Până atunci poți cumpăra din celelalte două file.</p>`;
  else {
    if (Date.now() - BZ.lastClaim > 50000) setTimeout(() => bzClaim(), 0);
    const tabs = [['c', 'Cumpără'], ['v', 'Vinde'], ['m', 'Ofertele mele' + (BZ.inbox ? ` <b class="bz-dot">${BZ.inbox}</b>` : '')]];
    body = `<div class="tm-tabs bz-tabs" role="tablist">${tabs.map(([k, t]) => `<button role="tab" aria-selected="${BZ.tab === k}" class="${BZ.tab === k ? 'on' : ''}" onclick="bzTab('${k}')">${t}</button>`).join('')}</div>`
      + (BZ.err ? `<p class="bz-err" role="alert">${bzE(BZ.err)}</p>` : '') + (BZ.msg ? `<p class="bz-msg" role="status">${bzE(BZ.msg)}</p>` : '')
      + (BZ.tab === 'v' ? bzSellTab() : BZ.tab === 'm' ? bzMineTab() : bzBuyTab());
  }
  return `<section class="bz"><h2>Bazar</h2><div class="bz-hd"><span class="bz-img">${satIcon('y')}</span><span class="mute">Cumpără și vinde echipament cu alți jucători. Aurul se mută prin server; ai <b>${bzN(S.gold || 0)}</b> aur.</span></div>${body}</section>`;
}

/* ------------------------------------------------------------------ LEGAREA ÎN SAT */
function bzHook() {
  if (typeof VL === 'undefined' || typeof SAT_B === 'undefined') return;
  if (typeof SAT_ICON !== 'undefined') SAT_ICON.y = '<img class="bz-ico" src="imagini/ui/bazar.webp" alt="" onerror="this.outerHTML=\'<span class=&quot;bz-ico bz-ico-f&quot;>⚖️</span>\'">';
  /* pagina și butonul din Sat le face piata.js (Piață › Bazar) */
  if (typeof satStatus === 'function' && !satStatus.__bz) {
    const f = satStatus;
    window.satStatus = function (k) {
      if (k !== 'y') return f(k);
      if ((S.lvl || 1) < BZ_MIN) return [`se deschide la nivelul ${BZ_MIN}`, 0];
      return [BZ.inbox ? `${BZ.inbox} ${BZ.inbox === 1 ? 'obiect' : 'obiecte'} de ridicat` : BZ.open ? `${BZ.open} ${BZ.open === 1 ? 'ofertă activă' : 'oferte active'}` : 'schimb între jucători', BZ.inbox > 0];
    };
    window.satStatus.__bz = 1;
  }
  /* cutia poștală: la pornire (după ce contul s-a încărcat) și o dată pe minut */
  let n = 0; const t = setInterval(() => { if (typeof CONT !== 'undefined' && CONT.booted && CONT.user) { clearInterval(t); bzClaim(true); } else if (++n > 120) clearInterval(t); }, 1000);
  setInterval(() => { if (typeof CONT !== 'undefined' && CONT.booted && !(S.prem && S.bt && S.bt.on && document.hidden)) bzClaim(); }, 60000);
}
if (typeof window !== 'undefined') { if (document.readyState === 'complete') bzHook(); else window.addEventListener('load', bzHook); }

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.bz-hd{display:flex;align-items:center;gap:12px;margin:0 0 12px}
.bz-img{flex:0 0 64px;width:64px;height:64px;display:grid;place-items:center}
.bz-ico{width:100%;height:100%;object-fit:contain;border-radius:8px}.bz-ico-f{display:grid;place-items:center;font-size:30px;line-height:1}
.vb-i .bz-ico-f{font-size:20px}
.bz-f{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 8px}
.bz-f select,.bz-f input,.bz-sell input{background:#0b0e10;color:var(--ink);border:1px solid var(--line);border-radius:6px;padding:6px 8px;font:inherit}
.bz-f input{width:64px}.bz-f label{display:flex;align-items:center;gap:4px;color:var(--mute)}
.bz-f button{width:auto}
.bz-tot{margin:0 0 6px}.bz-tot a{color:var(--gold2)}
.bz-r{gap:10px;align-items:center}
.bz-sell{display:flex;gap:6px;align-items:center;flex:0 0 auto}.bz-sell input{width:104px}
.bz-sell button,.bz-r>button{width:auto;white-space:nowrap}
.bz-err{color:#ffb0a8;background:#3a1512;border:1px solid #d4564f66;border-radius:6px;padding:8px 10px;margin:0 0 10px}
.bz-msg{color:#cfe9c7;background:#14261a;border:1px solid #4fa35e66;border-radius:6px;padding:8px 10px;margin:0 0 10px}
.bz-st{font-weight:700}.bz-st.bz-on{color:var(--gold2)}.bz-st.bz-ok{color:#8fd49a}
.bz-dot{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--blood);color:#fff;font:700 11px system-ui,sans-serif;margin-left:4px}
@media (max-width:600px){.bz-r{flex-wrap:wrap}.bz-sell{width:100%}.bz-sell input{flex:1}}`;
  document.head.appendChild(st);
})();
