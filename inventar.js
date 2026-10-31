/* ============================================================================
   Silver Throne — inventar.js
   Interfața inventarului: filtre pe tip, sortare, pagini, carduri cu comparație față de
   obiectul echipat, blocare 🔒, curățenie rapidă și grila de sloturi echipate.

   Nu schimbă regulile jocului: echiparea, vânzarea și dezmembrarea sunt aceleași funcții
   (equip / sell / dis) apelate cu INDEXUL REAL din S.inv, nu cu poziția din lista afișată.
   Se încarcă după teritorii.js; folosește helperii jocului (E, cur, iname, desc, cost, give, go,
   SL, SLN, RAR, QN) doar la apelare. Randarea nu modifică starea (doar acțiunile o fac).
   ========================================================================== */
/* obiecte pe pagină: 8 pe ecran mare, 6 pe telefon (mai puțin de derulat) */
const invPageSize = () => (typeof window !== 'undefined' && window.innerWidth && window.innerWidth <= 520 ? 6 : 8);
const INV_FILTERS = [['all', 'Toate'], ['w', 'Arme'], ['a', 'Armuri'], ['h', 'Coifuri'], ['b', 'Cizme'], ['j', 'Bijuterii'], ['r', 'Relicve']];
const INV_SORTS = [['rar', 'Raritate'], ['niv', 'Nivel'], ['cal', 'Calitate'], ['val', 'Valoare'], ['nou', 'Cele mai noi'], ['nume', 'Nume']];
const INV_L = { dmg: 'atac', def: 'apărare', hp: 'viață', bleed: '% sângerare', crit: '% critic', loot: '% aur', heal: '% vindecare', vd: '% ap. sat', pd: '% atac', ph: '% viață', pf: '% apărare' };

/* preferințele de afișare (filtru, sortare, pagină), validate; nu scrie în stare */
function invUiV() {
  const u = (typeof S !== 'undefined' && S && S.iui && typeof S.iui === 'object') ? S.iui : {};
  return { f: INV_FILTERS.some(x => x[0] === u.f) ? u.f : 'all', s: INV_SORTS.some(x => x[0] === u.s) ? u.s : 'rar', p: Math.max(0, Math.floor(+u.p || 0)) };
}
function invSet(patch) { S.iui = Object.assign(invUiV(), patch); S.msg = ''; go(); }
const invF = f => invSet({ f, p: 0 });
const invS = s => invSet({ s, p: 0 });
const invP = p => invSet({ p });
const invVal = it => 4 + it.l * 3 * (it.r + 1);                       /* aceeași formulă ca în sell() */
const invOre = it => Math.floor(cost(it.l, it.r) / 2);                /* aceeași formulă ca în dis() */
const invRarKey = it => (it.lg ? 9 : it.r);

/* lista afișată: [{it, i}] cu i = indexul REAL din S.inv */
function invList() {
  const u = invUiV(), a = S.inv.map((it, i) => ({ it, i })).filter(x => x.it && (u.f === 'all' || x.it.t === u.f));
  const keys = { rar: x => -(invRarKey(x.it) * 10 + (x.it.q || 0)), niv: x => -x.it.l, cal: x => -(x.it.q || 0), val: x => -invVal(x.it), nou: x => -x.i };
  if (u.s === 'nume') a.sort((p, q) => String(p.it.name).localeCompare(String(q.it.name), 'ro') || p.i - q.i);
  else a.sort((p, q) => keys[u.s](p) - keys[u.s](q) || q.it.l - p.it.l || p.i - q.i);
  return a;
}
function invPage(list) { const n = invPageSize(), pages = Math.max(1, Math.ceil(list.length / n)), p = Math.min(invUiV().p, pages - 1); return { pages, p, size: n, items: list.slice(p * n, (p + 1) * n) }; }

/* comparație față de obiectul echipat în același slot, la luptătorul selectat */
function invCmp(it) {
  const eq = E(cur())[it.t]; if (eq === it) return '';
  const keys = Object.keys(INV_L).filter(k => (it.s[k] || 0) || (eq && (eq.s[k] || 0))), out = [];
  for (const k of keys) { const d = (it.s[k] || 0) - ((eq && eq.s[k]) || 0); if (d) out.push(`<span class="dl ${d > 0 ? 'up' : 'dn'}">${d > 0 ? '▲ +' : '▼ −'}${Math.abs(d)} ${INV_L[k]}</span>`); }
  if (!eq) return `<div class="chips"><span class="mute">slot gol la ${tEsc(cur().n)}: totul e câștig</span></div>`;   /* statisticile sunt deja afișate mai sus */
  return out.length ? `<div class="chips"><span class="mute">față de ${tEsc(eq.name)}:</span>${out.join('')}</div>` : `<div class="chips"><span class="mute">la fel ca ${tEsc(eq.name)}</span></div>`;
}
const invChips = it => { const c = Object.keys(INV_L).filter(k => it.s[k]).map(k => `<span>+${it.s[k]} ${INV_L[k]}</span>`); return c.length ? `<div class="chips">${c.join('')}</div>` : ''; };
const invCls = it => (it.lg ? 'rl' : 'r' + (it.r + 1));

function invCard(x) {
  const it = x.it, i = x.i;
  return `<div class="icard ${invCls(it)}${it.lk ? ' lk' : ''}" data-i="${i}" data-t="${it.t}"><div class="ic-n"${itTipA(it, invCmp(it))}>${iname(it)}${it.lk ? ' <span title="Blocat">🔒</span>' : ''}</div>${invVerdict(it)}` +
    `<div class="ic-a"><button class="p" onclick="equip(${i})" aria-label="Pune pe ${tEsc(cur().n)}" title="Pune pe ${tEsc(cur().n)}">Pune</button><button onclick="invLock(${i})" title="${it.lk ? 'Deblochează' : 'Blochează: nu poate fi vândut sau dezmembrat'}">${it.lk ? '🔓' : '🔒'}</button><button onclick="dis(${i})"${it.lk ? ' disabled' : ''}>Dezmembrează</button><button onclick="sell(${i})"${it.lk ? ' disabled' : ''}>${invVal(it)} aur</button></div></div>`;
}
/* semnul mic de pe card: merită pus? (aceeași formulă de putere ca la alegerea din slot) */
function invVerdict(it) {
  const eq = E(cur())[it.t]; if (eq === it) return '';
  if (!eq) return '<span class="ic-v nw">slot gol</span>';
  const g = invScore(it) - invScore(eq);
  return g > 0 ? '<span class="ic-v up">▲ mai bun</span>' : g < 0 ? '<span class="ic-v dn">▼ mai slab</span>' : '<span class="ic-v">≈ la fel</span>';
}
function invLock(i) { const it = S.inv[i]; if (it) it.lk = it.lk ? 0 : 1; go(); }

/* curățenie rapidă: Comun și Magic, neblocate, fără legendare */
const invBulkSet = () => S.inv.map((it, i) => ({ it, i })).filter(x => x.it && !x.it.lk && !x.it.lg && x.it.r <= 1);
function invBulk(kind) {
  const set = invBulkSet(); if (!set.length) { S.msg = 'Nimic de curățat.'; return go(); }
  const gold = set.reduce((s, x) => s + invVal(x.it), 0), ore = set.reduce((s, x) => s + invOre(x.it), 0);
  const q = kind === 'sell' ? `Vinzi ${set.length} obiecte (Comun și Magic, neblocate) pentru ${gold} aur?` : `Dezmembrezi ${set.length} obiecte (Comun și Magic, neblocate)? Primești ${ore} minereu și materialele afixelor.`;
  if (typeof confirm === 'function' && !confirm(q)) return;
  const ids = new Set(set.map(x => x.i));
  if (kind === 'sell') S.gold += gold; else { S.ore += ore; set.forEach(x => (x.it.m || []).forEach(k => give(k, 1))); }
  S.inv = S.inv.filter((_, i) => !ids.has(i)); S.msg = kind === 'sell' ? `Ai vândut ${set.length} obiecte: +${gold} aur.` : `Ai dezmembrat ${set.length} obiecte: +${ore} minereu.`; go();
}

/* ------------------------------------------------ ALEGEREA DIN SLOT
   Butonul „Înlocuiește / Alege” de pe un slot deschide o fereastră cu obiectele de acel tip din rucsac,
   comparate cu ce poartă luptătorul. Ordinea: cât adaugă la putere (aceeași formulă ca la Tron:
   viață + 6 × atac + 10 × apărare, cu procentele aproximate). Echiparea e funcția equip() a jocului. */
const INV_W = { hp: 1, dmg: 6, def: 10, crit: 4, bleed: 3, heal: 2, loot: 1, vd: 0.5, pd: 7, ph: 5, pf: 7 };
const invScore = it => (it ? Object.keys(INV_W).reduce((s, k) => s + (it.s[k] || 0) * INV_W[k], 0) : 0);
function invPick(k) {
  const f = cur(), eq = E(f)[k], base = invScore(eq);
  const list = S.inv.map((it, i) => ({ it, i })).filter(x => x.it && x.it.t === k)
    .sort((p, q) => invScore(q.it) - invScore(p.it) || invRarKey(q.it) - invRarKey(p.it) || q.it.l - p.it.l);
  const card = x => { const g = invScore(x.it) - base;
    return `<div class="ipk-c icard ${invCls(x.it)}"><div class="ic-n"${itTipA(x.it, eq ? invCmp(x.it) : '')}>${iname(x.it)}${x.it.lk ? ' 🔒' : ''}</div><div class="ipk-a">${eq ? `<span class="ipk-g ${g > 0 ? 'up' : g < 0 ? 'dn' : ''}">${g > 0 ? '▲ mai bun' : g < 0 ? '▼ mai slab' : '≈ la fel'}</span>` : ''}<button class="${!eq || g >= 0 ? 'p' : ''}" onclick="invPickEq(${x.i})">${eq ? 'Înlocuiește' : 'Pune'}</button></div></div>`; };
  mdl(`<div class="ipk"><h3>${SLN[k]} · ${tEsc(f.n)}</h3>`
    + `<div class="ipk-now"><span class="mute">Acum:</span> ${eq ? `<span class="ic-n"${itTipA(eq)}>${iname(eq)}</span> <button onclick="invPickOff('${k}')">Scoate</button>` : '<span class="mute">nimic echipat</span>'}</div>`
    + `<div class="ipk-l">${list.length ? list.map(card).join('') : '<p class="mute">Nu ai în rucsac obiecte de acest tip.</p>'}</div>`
    + `<div class="ipk-f mute">${list.length > 1 ? 'Ordonate după cât adaugă la putere. ' : ''}<button class="lw-lnk" onclick="invPickAll('${k}')">Vezi în rucsac (vânzare, dezmembrare)</button></div></div>`, 'ipk-b');
}
function invPickEq(i) { lgClose(); equip(i); }
function invPickOff(k) { lgClose(); unequip(k); }
function invPickAll(k) { lgClose(); invF(k); setTimeout(() => { const g = document.querySelector('.igrid') || document.querySelector('.invbar'); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60); }

/* sloturile echipate ale luptătorului selectat, ca grilă */
function vSlots() {
  return '<div class="slotgrid">' + SL.map(k => {
    const it = E(cur())[k], n = S.inv.filter(x => x && x.t === k).length;
    return `<div class="scard${it ? ' ' + invCls(it) : ' emp'}" data-k="${k}" data-g="${IG[k]}"><span class="sc-k">${SLN[k]}</span>` +
      (it ? `<div class="ic-n"${itTipA(it)}>${iname(it)}</div><div class="ic-a"><button onclick="unequip('${k}')">Scoate</button><button class="${n ? 'p' : ''}" onclick="invPick('${k}')"${n ? '' : ' disabled'}>${n ? `Înlocuiește (${n})` : 'Nimic în rucsac'}</button></div>` : `<div class="mute sc-e">gol</div><div class="ic-a"><button class="${n ? 'p' : ''}" onclick="invPick('${k}')"${n ? '' : ' disabled'}>${n ? `Alege (${n})` : 'Nimic în rucsac'}</button></div>`) + '</div>';
  }).join('') + '</div>';
}

/* rucsacul: antet cu rezumat, filtre, sortare, pagini, carduri, curățenie rapidă */
function vInv() {
  const u = invUiV(), all = S.inv.filter(Boolean), list = invList(), pg = invPage(list);
  const cnt = [0, 1, 2, 3].map(r => all.filter(x => !x.lg && x.r === r).length), leg = all.filter(x => x.lg).length, locked = all.filter(x => x.lk).length;
  let h = `<section><h2>Rucsac <span class="mute" style="font-size:15px;font-weight:400">· ${all.length} ${all.length === 1 ? 'obiect' : 'obiecte'}</span></h2>`;
  if (!all.length) return h + '<p class="mute">Gol. Forjează ceva în atelier sau cumpără de la negustori.</p></section>';
  h += `<div class="chips">${RAR.map((r, i) => cnt[i] ? `<span class="r${i + 1}">${r.n} ${cnt[i]}</span>` : '').join('')}${leg ? `<span class="rl">Legendar ${leg}</span>` : ''}${locked ? `<span>🔒 ${locked}</span>` : ''}</div>`;
  h += `<div class="invbar">${INV_FILTERS.map(([k, n]) => { const c = k === 'all' ? all.length : all.filter(x => x.t === k).length; return `<button${u.f === k ? ' class="p"' : ''} onclick="invF('${k}')">${n} <span class="mute" style="color:inherit;opacity:.75">${c}</span></button>`; }).join('')}</div>`;
  h += `<div class="invbar"><span class="mute">Sortare:</span><select onchange="invS(this.value)" aria-label="Sortare">${INV_SORTS.map(([k, n]) => `<option value="${k}"${u.s === k ? ' selected' : ''}>${n}</option>`).join('')}</select><span class="mute">· ${list.length} afișate</span></div>`;
  h += list.length ? `<div class="igrid">${pg.items.map(invCard).join('')}</div>` : '<p class="mute">Niciun obiect de acest tip.</p>';
  if (pg.pages > 1) h += `<div class="pager"><button onclick="invP(0)"${pg.p === 0 ? ' disabled' : ''} aria-label="Prima pagină">«</button><button onclick="invP(${pg.p - 1})"${pg.p === 0 ? ' disabled' : ''} aria-label="Pagina anterioară">‹</button><span>Pagina <b>${pg.p + 1}</b> din ${pg.pages}</span><button onclick="invP(${pg.p + 1})"${pg.p >= pg.pages - 1 ? ' disabled' : ''} aria-label="Pagina următoare">›</button><button onclick="invP(${pg.pages - 1})"${pg.p >= pg.pages - 1 ? ' disabled' : ''} aria-label="Ultima pagină">»</button></div>`;
  const bs = invBulkSet(), bg = bs.reduce((s, x) => s + invVal(x.it), 0), bo = bs.reduce((s, x) => s + invOre(x.it), 0);
  h += `<div class="row" style="flex-wrap:wrap;gap:8px"><span class="mute">Curățenie rapidă: obiectele Comune și Magic, fără cele blocate 🔒 și fără legendare (${bs.length}).</span><span><button onclick="invBulk('sell')"${bs.length ? '' : ' disabled'}>Vinde (${bg} aur)</button> <button onclick="invBulk('dis')"${bs.length ? '' : ' disabled'}>Dezmembrează (${bo} minereu)</button></span></div>`;
  return h + '</section>';
}

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = '.chips{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0}.chips span{font-size:13px;padding:1px 8px;border:1px solid #ffffff14;border-radius:10px;background:#0b0e10aa;color:var(--ink)}'
    + '.chips .mute{border-color:transparent;background:none;color:var(--mute)}.dl.up{color:#7fd88c!important;border-color:#4fa35e77!important}.dl.dn{color:#e8837b!important;border-color:#d4564f77!important}'
    + '.invbar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0}.invbar button{padding:5px 10px;font-size:14px}.invbar select{padding:4px 8px}'
    + '.igrid,.slotgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:8px;margin:8px 0}.slotgrid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}'
    + '.icard,.scard{background:linear-gradient(180deg,#171e21,#11171a);border:1px solid var(--line);border-left:3px solid #6b6757;border-radius:4px;padding:8px 10px;box-shadow:inset 0 0 14px #0006}'
    + '.icard.r1,.scard.r1{border-left-color:#c4bfae}.icard.r2,.scard.r2{border-left-color:#5fc470}.icard.r3,.scard.r3{border-left-color:var(--ember)}.icard.r4,.scard.r4{border-left-color:var(--blood)}'
    + '.icard.rl,.scard.rl{border-left-color:#f0d27a;box-shadow:inset 0 0 14px #0006,0 0 10px #c9a24b33}.icard.lk{outline:1px dashed #f0d27a55}'
    + '.ic-a{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.ic-a button{padding:5px 10px;font-size:14px}'
    + '.pager{display:flex;align-items:center;justify-content:center;gap:8px;margin:10px 0}.pager button{min-width:38px}'
    + '@media (max-width:520px){.igrid,.slotgrid{grid-template-columns:1fr}}'
    + '.lgm-b.ipk-b{width:min(94vw,520px);text-align:left;max-height:88vh;display:flex;flex-direction:column}'
    + '.ipk{display:flex;flex-direction:column;min-height:0}.ipk h3{font:700 19px Cinzel,serif;color:var(--gold2);margin:2px 36px 8px 0}'
    + '.ipk-now{padding:6px 8px;margin-bottom:8px;border:1px dashed var(--line);border-radius:4px;font-size:14px}.ipk-now .ic-n{display:inline}.ipk-now button{margin-top:4px;padding:3px 10px;font-size:13px}'
    + '.ipk-l{overflow-y:auto;display:flex;flex-direction:column;gap:6px;padding-right:2px;min-height:0}'
    + '.ipk-c{padding:6px 8px}.ipk-c .ic-n{font-size:14px;line-height:1.3}.ipk-c .chips span{font-size:12px;padding:0 6px}'
    + '.ipk-a{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:4px}.ipk-a button{padding:4px 14px;font-size:14px}'
    + '.ipk-g{font-size:13px;margin-right:auto;color:var(--mute)}.ipk-g.up{color:#7fd88c}.ipk-g.dn{color:#e8837b}'
    + '.ipk-f{margin-top:8px;font-size:13px}.ipk-f .lw-lnk{background:none;border:0;box-shadow:none;padding:0;color:var(--gold2);text-decoration:underline;text-underline-offset:3px;font:inherit;cursor:pointer}';
  document.head.appendChild(st);
})();
