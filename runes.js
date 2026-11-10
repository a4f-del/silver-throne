/* ============================================================================
   Silver Throne — runes.js
   Runele: moneda premium. Soldul, Premium, Pactul Nicovalei și skinurile cumpărate stau pe server
   (supabase/44-beta-rune.sql, doar BETA); jocul doar le afișează și cere cumpărările.
   Dacă funcțiile SQL nu există (LIVE sau SQL44 nerulat), nimic din acest fișier nu apare.
   La lansare: pachetele de Rune se plătesc prin Google Play Billing / Stripe; până atunci
   administratorul simulează plata din magazin sau din panoul 🛠.
   ========================================================================== */
const RN = { ok: 0, off: 0, busy: 0, st: null, cf: null, m: '', skew: 0 };
const rnNow = () => Date.now() + RN.skew;
const rnCat = () => (RN.st && RN.st.catalog) || {};
const rnFmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const rnIco = '<span class="rn-i" aria-hidden="true">ᚱ</span>';
/* skinul e al jucătorului pentru totdeauna ('umbra' = eroul; altfel clasa mercenarului) */
const rnOwn = k => !!(RN.ok && RN.st && Array.isArray(RN.st.skins) && RN.st.skins.includes(k));
/* bonusul Pactului Nicovalei la șansa de forjare (procente), 0 dacă nu e activ */
const rnPact = () => (RN.ok && RN.st && RN.st.pact_until && RN.st.pact_until > rnNow()) ? (+rnCat().pact_pct || 0) : 0;
const rnLeft = t => { const ms = Math.max(0, t - rnNow()), d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5), m = Math.ceil(ms % 36e5 / 6e4);
  return d ? `${d} ${d === 1 ? 'zi' : 'zile'} ${h} h` : h ? `${h} h ${m} min` : `${m} min`; };

/* Premium = abonamentul de pe server, sau comutatorul de test din panoul 🛠 (S.premT) */
function rnApply(d) {
  if (d) {
    if (typeof d !== 'object' || typeof d.runes !== 'number' || !d.catalog) { RN.off = 1; RN.ok = 0; return; }   /* răspuns necunoscut: Runele rămân ascunse */
    RN.st = d; RN.ok = 1; RN.skew = (+d.now || Date.now()) - Date.now();
  }
  if (!RN.ok || typeof S === 'undefined' || !S) return;
  const p = !!(RN.st.prem_until && RN.st.prem_until > rnNow()) || !!S.premT;
  if (p !== !!S.prem) { S.prem = p; if (typeof save === 'function') save(); }
}
function rnRefresh() {
  try { if (typeof hdr === 'function') hdr(); } catch (e) { /* antetul se redesenează la următoarea acțiune */ }
  if (document.getElementById('rn-shop')) rnShop();
}
async function rnLoad() {
  if (RN.busy || RN.off || typeof tronRpc !== 'function' || typeof CONT === 'undefined' || !CONT.user || !CONT.booted || !S) return;
  RN.busy = 1;
  const r = await tronRpc('rune_state');
  RN.busy = 0;
  if (r.error) { if (/Could not find the function|does not exist|schema cache|neautorizat/i.test(r.error)) RN.off = 1; return; }
  const was = RN.ok; rnApply(r.data);
  if (!was && typeof go === 'function') go(); else rnRefresh();
}

/* ------------------------------------------------------------------ CUMPĂRARE (cu confirmare) */
/* primul clic arată „Confirmă”, al doilea (în 5 secunde) cumpără */
function rnAsk(k) { const ok = RN.cf && RN.cf.k === k && Date.now() - RN.cf.t < 5000; if (!ok) RN.cf = { k, t: Date.now() }; return ok; }
const rnCfOn = k => !!(RN.cf && RN.cf.k === k && Date.now() - RN.cf.t < 5000);
async function rnRpc(fn, args) {
  if (RN.busy) return null;
  RN.busy = 1; RN.m = ''; const r = await tronRpc(fn, args); RN.busy = 0; RN.cf = null;
  if (r.error) { RN.m = r.error.replace(/^.*?ERROR:\s*/, ''); rnRefresh(); return null; }
  rnApply(r.data); return r.data;
}
async function rnBuy(item, label) {
  if (!rnAsk('b:' + item)) return rnShop();
  const d = await rnRpc('rune_buy', { p_item: item, p_arg: null });
  if (!d) return;
  const g = d.grant || {};
  if (g.pts) { S.bp = (S.bp || 0) + g.pts; S.bpEnd = 0; }
  RN.m = `Cumpărat: ${label} (−${rnFmt(d.cost)} Rune).`;
  if (typeof toast === 'function') toast(RN.m);
  if (typeof go === 'function') go();
  rnShop();
}
async function rnAdmin(op, n, label) {
  const d = await rnRpc('rune_admin', { p_op: op, p_n: n || 0 });
  if (!d) return;
  RN.m = label || 'Gata.'; if (typeof toast === 'function') toast(RN.m);
  if (typeof go === 'function') go();
  if (document.getElementById('rn-shop')) rnShop();
  if (typeof admDraw === 'function') admDraw();
}

/* ------------------------------------------------------------------ GRĂBIRE (forjă și expediții) */
const rnRushCost = end => { const c = rnCat(), min = Math.max(0, end - Date.now()) / 6e4; return Math.max(+c.rush_min || 1, Math.min(+c.rush_max || 600, Math.ceil(min / (+c.rush_per_min || 10)))); };
function rnRushBtn(kind, id, end) {
  if (!RN.ok || Date.now() >= end) return '';
  const k = `r:${kind}:${id}`, c = rnRushCost(end);
  return `<button class="rn-rush${rnCfOn(k) ? ' cf' : ''}" onclick="event.stopPropagation();rnRush('${kind}','${id}')" title="Termină acum cu Rune">${rnCfOn(k) ? 'Confirmă ' : '⚡ '}${c} ${rnIco}</button>`;
}
async function rnRush(kind, id) {
  const slot = kind === 'f' ? S.forge[+id] : (S.mx || {})[id];
  if (!slot || Date.now() >= slot.end) return go();
  if (!rnAsk(`r:${kind}:${id}`)) return go();
  const cost = rnRushCost(slot.end);
  const d = await rnRpc('rune_buy', { p_item: 'rush', p_arg: cost });
  if (!d) { if (typeof toast === 'function' && RN.m) toast(RN.m); return go(); }
  slot.end = Date.now() - 1;
  S.msg = kind === 'f' ? `Forja s-a terminat pe loc (−${cost} Rune).` : `Expediția s-a întors pe loc (−${cost} Rune).`;
  go();
}

/* ------------------------------------------------------------------ ANTET, SKINURI, PACT */
function rnChip() {
  if (!RN.ok) return '';
  return `<button type="button" class="st-res rn-chip" onclick="rnShop()" title="Rune · magazin">${rnIco}<b>${rnFmt(RN.st.runes)}</b><small>Rune</small></button>`;
}
/* butonul de cumpărare permanentă din previzualizarea unui skin ('umbra' sau clasa mercenarului) */
function rnSkinBuyBtn(k) {
  if (!RN.ok) return '';
  if (rnOwn(k)) return '<div class="mute rn-own">Skinul e al tău pentru totdeauna.</div>';
  const c = rnCat(), p = k === 'umbra' ? c.skin_umbra : c.skin_merc;
  return `<div class="row" style="justify-content:center"><button class="p" onclick="rnBuy('skin:${k}','skin ${k === 'umbra' ? 'Umbra Runelor' : (typeof MSK !== 'undefined' && MSK[k]) || k}')">${rnCfOn('b:skin:' + k) ? 'Confirmă' : 'Cumpără permanent'} · ${rnFmt(p)} ${rnIco}</button></div>`;
}
function rnPactLine() {
  if (!RN.ok) return '';
  const p = rnPact();
  return p ? `<div class="rn-pact on">🜂 Pactul Nicovalei: <b>+${p}%</b> șansă la forjare încă ${rnLeft(RN.st.pact_until)}</div>`
    : `<div class="rn-pact"><button onclick="rnShop('pact')">🜂 Pactul Nicovalei · +${rnCat().pact_pct || 8}% șansă la forjare</button></div>`;
}

/* ------------------------------------------------------------------ MAGAZINUL */
function rnShop(focus) {
  if (!RN.ok) return;
  const s = RN.st, c = rnCat(), now = rnNow(), adm = !!s.admin;
  const prem = s.prem_until && s.prem_until > now, pact = s.pact_until && s.pact_until > now;
  const buy = (item, price, label, dis, desc) => `<button class="${rnCfOn('b:' + item) ? 'd' : 'p'}" onclick="rnBuy('${item}','${(desc || label).replace(/'/g, '')}')"${dis || s.runes < price ? ' disabled' : ''}>${rnCfOn('b:' + item) ? 'Confirmă' : label} · ${rnFmt(price)} ${rnIco}</button>`;
  const ptsLeft = Math.max(0, (c.pts_day_max || 5) - (s.pts_today || 0));
  const skins = [['umbra', 'Umbra Runelor', 'erou', c.skin_umbra]].concat(typeof MSK !== 'undefined' ? Object.keys(MSK).map(k => [k, MSK[k], k, c.skin_merc]) : []);
  const pay = (eur, op, n, label) => adm ? `<button class="p" onclick="rnAdmin('${op}',${n},'${label}')">Simulează plata · ${eur.toFixed(2).replace('.', ',')} €</button>` : `<button disabled title="Plata reală se deschide la lansare">${eur.toFixed(2).replace('.', ',')} €</button>`;
  const h = `<div id="rn-shop"><div class="rn-top"><h3>Magazinul de Rune</h3><div class="rn-bal">${rnIco}<b>${rnFmt(s.runes)}</b> Rune</div></div>
${RN.m ? `<p class="rn-m">${tEsc(RN.m)}</p>` : ''}
<section class="rn-s rn-prem"><h4>👑 Premium${prem ? ` <small class="rn-on">activ încă ${rnLeft(s.prem_until)}</small>` : ''}</h4>
<ul><li>Botul care joacă singur</li><li>Skinurile premium pentru erou și toți mercenarii</li><li>5 echipe salvate (în loc de 2) și jurnal de 30 de lupte</li></ul>
<div class="rn-bs">${buy('prem15', c.prem15, '15 zile', 0, 'Premium 15 zile')}${buy('prem30', c.prem30, '30 de zile', 0, 'Premium 30 de zile')}</div>${prem ? '<small class="mute">Zilele noi se adaugă la cele rămase.</small>' : ''}</section>
<section class="rn-s${focus === 'pact' ? ' rn-hl' : ''}"><h4>🜂 Pactul Nicovalei${pact ? ` <small class="rn-on">activ încă ${rnLeft(s.pact_until)}</small>` : ''}</h4>
<p class="mute">+${c.pact_pct}% șansă la fiecare forjare cât ține pactul (tot plafonat la 95%).</p>
<div class="rn-bs">${buy('pact1', c.pact1, '1 zi', 0, 'Pactul Nicovalei 1 zi')}${buy('pact7', c.pact7, '7 zile', 0, 'Pactul Nicovalei 7 zile')}</div></section>
<section class="rn-s"><h4>⚡ Puncte de expediție</h4><p class="mute">Se adaugă la rezervă și umplu punctele pe măsură ce le folosești. Încă ${ptsLeft} cumpărări azi.</p>
<div class="rn-bs">${buy('pts30', c.pts30, '+30 puncte', !ptsLeft)}${buy('pts100', c.pts100, '+100 puncte', !ptsLeft)}</div></section>
<section class="rn-s"><h4>🎭 Skinuri permanente</h4><p class="mute">Rămân ale tale și fără Premium.</p><div class="rn-sk">${skins.map(([k, n, who, p]) => `<div class="rn-skc${rnOwn(k) ? ' own' : ''}"><img src="${k === 'umbra' ? 'imagini/erou-premium-avatar.jpg' : 'imagini/mercenari/' + MPIC[k] + '-p.jpg'}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><b>${n}</b><small>${who}</small>${rnOwn(k) ? '<span class="rn-on">al tău</span>' : buy('skin:' + k, p, 'Cumpără', 0, 'skin ' + n)}</div>`).join('')}</div></section>
<section class="rn-s"><h4>🎁 Pachetul de început <small class="mute">o singură dată</small></h4>
${s.starter ? '<p class="rn-on">L-ai folosit deja.</p>' : `<p class="mute">${c.starter_runes} Rune + ${c.starter_days} zile Premium + skinul Umbra Runelor.</p><div class="rn-bs">${pay(+c.starter_eur || 2.99, 'starter', 0, 'Pachetul de început a fost adăugat')}</div>`}</section>
<section class="rn-s"><h4>${rnIco} Pachete de Rune</h4><div class="rn-pk">${(c.packs || []).map(p => `<div class="rn-pkc"><b>${rnFmt(p.n)}</b><small>Rune</small>${pay(+p.eur, 'pack', p.n, '+' + rnFmt(p.n) + ' Rune')}</div>`).join('')}</div>
${adm ? '' : '<p class="mute">Cumpărarea cu bani reali se deschide la lansare.</p>'}</section>
<p class="mute rn-f">Grăbirea forjei și a expedițiilor apare direct lângă cronometru (⚡ 1 Rună la fiecare ${c.rush_per_min || 10} minute rămase).</p></div>`;
  if (document.getElementById('rn-shop') && document.getElementById('lgm')) { document.getElementById('rn-shop').outerHTML = h; return; }
  if (typeof mdl === 'function') mdl(h, 'rn-modal');
}

/* ------------------------------------------------------------------ PANOUL 🛠 */
function rnAdminHtml() {
  if (!RN.ok) return RN.off ? '<div class="adm-g"><span>Rune</span><div class="adm-bs"><small>Rulează supabase/44-beta-rune.sql pe BETA ca să apară Runele.</small></div></div>' : '';
  const s = RN.st, b = (op, n, t, l) => `<button onclick="rnAdmin('${op}',${n},'${l}')">${t}</button>`;
  return `<div class="adm-g"><span>Rune · ${rnFmt(s.runes)}</span><div class="adm-bs">${b('add', 100, '+100', '+100 Rune')}${b('add', 1000, '+1.000', '+1.000 Rune')}${b('add', 10000, '+10.000', '+10.000 Rune')}`
    + `<input id="adm-rn" type="number" min="0" placeholder="Rune" aria-label="Setează Runele"><button onclick="rnAdmin('set',+document.getElementById('adm-rn').value||0,'Rune setate')">Setează</button>`
    + `<button onclick="rnShop()">Magazin</button>${b('prem_off', 0, 'Oprește Premium și pactul', 'Premium și pactul oprite')}<button class="d" onclick="if(rnAsk('reset'))rnAdmin('reset',0,'Portofelul de Rune a fost golit');else admDraw()">${rnCfOn('reset') ? 'Sigur? Golește' : 'Golește portofelul'}</button></div></div>`;
}

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.rn-i{font-family:serif;font-weight:700;color:#b9a7ff;text-shadow:0 0 6px rgba(150,120,255,.7)}
.rn-chip{cursor:pointer;border:1px solid rgba(150,120,255,.45);background:rgba(60,40,110,.25);border-radius:8px;color:inherit;font:inherit}
.rn-chip:hover{border-color:#b9a7ff}
#rn-shop .rn-top{display:flex;justify-content:space-between;align-items:center;gap:10px;padding-right:44px;flex-wrap:wrap}#rn-shop h3{margin:0}
.rn-bal{font-size:1.15em}.rn-m{background:rgba(232,198,106,.12);border:1px solid rgba(232,198,106,.4);border-radius:8px;padding:6px 10px}
.rn-s{border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 12px;margin:10px 0;background:rgba(255,255,255,.02)}
.rn-s h4{margin:0 0 6px}.rn-s ul{margin:4px 0 8px;padding-left:18px;text-align:left}.rn-prem{border-color:rgba(232,198,106,.45)}
.rn-hl{border-color:#b9a7ff;box-shadow:0 0 12px rgba(150,120,255,.35)}
.rn-bs{display:flex;flex-wrap:wrap;gap:8px}.rn-on{color:#8fd18f;font-weight:600}
.rn-sk{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:8px}
.rn-skc{display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:6px}
.rn-skc img{width:72px;height:72px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px #e8c66a}.rn-skc small{opacity:.7}.rn-skc button{font-size:.85em}
.rn-skc.own{border-color:rgba(143,209,143,.5)}
.rn-pk{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}.rn-pkc{display:flex;flex-direction:column;align-items:center;gap:4px;border:1px solid rgba(150,120,255,.3);border-radius:8px;padding:8px}
.rn-pkc b{font-size:1.3em}.rn-rush{margin-left:auto;font-size:.85em;padding:2px 8px}.rn-rush.cf{border-color:#e8c66a}
.rn-pact{margin:6px 0}.rn-pact.on{color:#c9b8ff}.rn-own{text-align:center}.rn-f{font-size:.85em}`;
  document.head.appendChild(st);
})();
if (typeof window !== 'undefined') { setTimeout(rnLoad, 3500); setInterval(() => { rnLoad(); rnApply(); }, 60000); }
