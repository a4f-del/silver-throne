/* ============================================================================
   Silver Throne — profil.js
   Profilul de personaj (eroul și mercenarii), într-o singură fereastră: în stânga numele, nivelul, titlul,
   progresul (experiența eroului / faima mercenarului) și statisticile; în dreapta portretul mare, cu cele
   6 sloturi de echipament de o parte și de alta, iar dedesubt rucsacul. ✕ sau Esc închide.
   Echiparea și scoaterea sunt aceleași funcții ale jocului (equip / unequip), pentru luptătorul din profil.
   Se deschide cu prOpen(i), unde i e poziția în roster() (echipă, apoi rezervă, apoi străjeri).
   Se încarcă după echipa.js.
   ========================================================================== */
const PR = { i: -1, bagFilter: 'all', bagQuery: '' };
const prF = () => roster()[PR.i];
const prPct = v => (v > 0 ? '+' : '−') + Math.abs(v) + '%';

function prOpen(i) { if (!roster()[i]) return; PR.i = i; PR.bagFilter = 'all'; PR.bagQuery = ''; prDraw(); }
function prClose() { PR.i = -1; document.getElementById('pr-m')?.remove(); document.removeEventListener('keydown', prKey); }
function prKey(e) { if (e.key === 'Escape') prClose(); }
/* acțiunile din profil lucrează pe luptătorul din profil, apoi redesenează fereastra */
function prAct(fn) { const f = prF(); if (!f) return prClose(); S.sel = PR.i; fn(); PR.i = roster().indexOf(f); prDraw(); }
function prEq(i) { prAct(() => equip(i)); }
function prUn(k) { prAct(() => unequip(k)); }
function prNext(d) { const n = roster().length; if (n) { PR.i = (PR.i + d + n) % n; prDraw(); } }

/* titlul: eroul după treapta satului și Tron, mercenarii după rang și specializare */
function prTitle(f) {
  if (f.h) {
    const st = typeof terStage === 'function' ? terStage().split(' · ')[0] : '';
    const tr = typeof TRON !== 'undefined' && TRON.st && TRON.st.me && TRON.st.me.title;
    return tr || (st ? `Stăpânul satului · ${st}` : 'Erou');
  }
  if (f.c === 'Gardian') return 'Străjer al satului';
  const sp = f.sp && typeof spDef0 === 'function' && spDef0(f);
  return `${RK[f.rk || 0]} · ${f.c}${sp ? ' · ' + sp.n : ''}`;
}
/* progresul: experiența eroului sau faima mercenarului până la rangul următor */
function prProg(f) {
  if (f.h && typeof LMAX !== 'undefined' && S.lvl >= LMAX) return { lbl: 'Nivel maxim', p: 100, sub: 'Ai atins nivelul ' + LMAX + ': coroana de aur e a ta.' };
  if (f.h) { const n = need(S.lvl), p = Math.min(100, S.xp / Math.max(1, n) * 100); return { lbl: `Experiență ${S.xp} / ${n}`, p, sub: `Nivel ${S.lvl + 1} la ${n} exp.` }; }
  if (f.c === 'Gardian' || typeof SP === 'undefined') return null;
  const fm = Math.floor(f.fm || 0), rk = f.rk || 0;
  if (rk >= 4) return { lbl: `Faimă ${fm}`, p: 100, sub: 'Rang maxim: Legendă' };
  const a = SP.RKF[rk], b = SP.RKF[rk + 1];
  return { lbl: `Faimă ${fm} / ${b}`, p: Math.max(0, Math.min(100, (fm - a) / (b - a) * 100)), sub: `${RK[rk + 1]} la ${b} faimă` };
}
/* ce înseamnă fiecare statistică (fereastra la trecerea cursorului; pe telefon, la atingere) */
function prTipTxt(n, f) {
  const cm = typeof spCm === 'function' ? spCm(f) : 1.5, bl = 2 + Math.floor(S.lvl / 2);
  const T = {
    'Viață': 'Câte daune poate primi luptătorul. La 0 cade din luptă; îl ridici la Infirmerie, dar rămâne cu o cicatrice.',
    'Atac': 'Daunele unei lovituri normale (variază cu ±15%). Din ele se scade apărarea inamicului; abilitățile lovesc de mai multe ori atacul.',
    'Apărare': 'Se scade din fiecare lovitură primită (orice lovitură face cel puțin 1). Contează mult contra monștrilor care lovesc des.',
    'Critic': `Șansa ca o lovitură să fie critică: face ×${String(cm).replace('.', ',')} daune. Toți pornesc de la 5%.`,
    'Sângerare': `Șansa ca o lovitură normală să facă inamicul să sângereze: pierde ${bl} viață pe tură, 3 ture.`,
    'Vindecare': 'Crește puterea vindecărilor. La Vraci, Vindecarea lui crește cu acest procent.',
    'Aur în plus': 'Aur în plus la ieșirea din temnițe și raiduri. Se adună procentele întregii echipe active.',
    'Atac în plus': 'Procent adăugat la atacul total, după echipament.',
    'Viață în plus': 'Procent adăugat la viața maximă, după echipament.',
    'Apărare în plus': 'Procent adăugat la apărare, după echipament.',
    'Cicatrici': 'Primite când luptătorul cade. Fiecare scade viața maximă; se vindecă la Infirmerie, cu aur.',
    'Forță': 'Antrenament: +2% atac pe rang, doar pentru erou (Sat › Antrenament).',
    'Rezistență': 'Antrenament: +3% viață pe rang, doar pentru erou (Sat › Antrenament).',
    'Agilitate': 'Antrenament: +0,8% șansă de critic pe rang, doar pentru erou (Sat › Antrenament).',
    'Tank': 'Rol: atrage loviturile și protejează echipa.', 'DPS': 'Rol: face daunele.', 'Suport': 'Rol: ține echipa în viață (vindecare, întăriri).'
  };
  return T[n] || '';
}
const prTipA = (n, f) => { const t = prTipTxt(n, f); return t ? ` data-tip="${typeof tipAttr === 'function' ? tipAttr(`<b>${n}</b><br>${t}`) : tEsc(t)}" tabindex="0"` : ''; };
function prStats(f) {
  const b = bon(f), m = mhp(f), hp = Math.max(0, Math.round(f.hp)), crit = 5 + b.crit + tr(f, 'crit') + (f.h ? ST().a * 0.8 : 0) + (typeof spCrit === 'function' ? spCrit(f) : 0);
  const rows = [
    ['❤', 'Viață', `${hp} / ${m}`, hp <= 0 ? 'bad' : hp < m * 0.4 ? 'low' : ''],
    ['⚔', 'Atac', Math.round(atkOf(f))],
    ['🛡', 'Apărare', Math.round(b.def + tr(f, 'def'))],
    ['✦', 'Critic', Math.round(crit) + '%'],
    ['🩸', 'Sângerare', b.bleed ? b.bleed + '%' : ''],
    ['✚', 'Vindecare', b.heal ? prPct(b.heal) : ''],
    ['🪙', 'Aur în plus', (b.loot + tr(f, 'loot')) ? (b.loot + tr(f, 'loot')) + '%' : ''],
    ['◈', 'Atac în plus', b.pd ? prPct(b.pd) : ''],
    ['◈', 'Viață în plus', b.ph ? prPct(b.ph) : ''],
    ['◈', 'Apărare în plus', b.pf ? prPct(b.pf) : ''],
    ['☠', 'Cicatrici', f.sc ? `${f.sc} (−${typeof scL === 'function' ? scL(f) : ''} viață)` : '', 'low']
  ].filter(r => r[2] !== '' && r[2] != null);
  return rows.map(([i, n, v, c]) => `<div class="pr-sr${c ? ' ' + c : ''}"${prTipA(n, f)}><i>${i}</i><span>${n}</span><b>${v}</b></div>`).join('');
}
function prSlot(f, k) {
  const it = E(f)[k];
  if (!it) return `<div class="pr-sl em" title="${SLN[k]}: gol">${UI(UISL[k])}<small>${SLN[k]}</small></div>`;
  return `<div class="pr-sl q${it.lg ? 'l' : it.r}"${typeof itTipA === 'function' ? itTipA(it) : ` title="${tEsc(it.name)}"`}>${iic(it)}<button class="pr-un" onclick="prUn('${k}')" title="Scoate ${tEsc(it.name)}" aria-label="Scoate ${tEsc(it.name)}">✕</button></div>`;
}
/* Filtre exclusiv de prezentare: indexul real din inventar rămâne neschimbat la equip(i). */
const prBagMatches = it => {
  const k = PR.bagFilter;
  const category = k === 'all' || (k === 'w' && it.t === 'w') ||
    (k === 'armor' && ['a','h','b'].includes(it.t)) ||
    (k === 'accessory' && ['j','r'].includes(it.t));
  const query = (PR.bagQuery || '').trim().toLocaleLowerCase('ro-RO');
  return category && (!query || String(it.name || '').toLocaleLowerCase('ro-RO').includes(query));
};
const prEscapeAttr = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function prBagCells(f) {
  const inv = S.inv || [];
  const visible = inv.map((it,i) => ({it,i})).filter(({it}) => prBagMatches(it));
  const cells = visible.map(({it,i}) => {
    const cur = E(f)[it.t], ok = typeof wfOk !== 'function' || wfOk(f, it), up = ok && typeof bsc === 'function' && (!cur || bsc(it, f) > bsc(cur, f) * 1.02);
    return `<button class="pr-it q${it.lg ? 'l' : it.r}${up ? ' up' : ''}${ok ? '' : ' no'}" onclick="prEq(${i})"${typeof itTipA === 'function' ? itTipA(it, cur) : ` title="${tEsc(it.name)}"`} aria-label="Echipează ${tEsc(it.name)}">${iic(it)}${up ? '<b class="pr-up">▲</b>' : ''}</button>`;
  }).join('');
  return {count:visible.length,html:cells || '<p class="pr-empty pr-bag-none">Niciun obiect găsit. Încearcă alt filtru.</p>'};
}
function prBag(f) {
  const inv = S.inv || [];
  if (!inv.length) return '<div class="mute pr-empty">Rucsacul e gol.</div>';
  return `<div class="pr-grid" id="pr-bag-items" role="region" aria-label="Obiectele din rucsac">${prBagCells(f).html}</div>`;
}
function prBagTools() {
  const options = [['all','Toate'],['w','Arme'],['armor','Armuri'],['accessory','Accesorii']];
  const buttons = options.map(([k,t]) => `<button type="button" data-pr-filter="${k}" class="${PR.bagFilter === k ? 'on' : ''}" aria-pressed="${PR.bagFilter === k}" onclick="prBagFilter('${k}')">${t}</button>`).join('');
  return `<div class="pr-bag-tools" aria-label="Filtre rucsac"><div class="pr-bag-tabs" role="group" aria-label="Tip obiect">${buttons}</div><input class="pr-bag-search" type="search" placeholder="Caută obiect…" aria-label="Caută în rucsac" value="${prEscapeAttr(PR.bagQuery)}" oninput="prBagSearch(this.value)"></div>`;
}
function prBagRefresh() {
  const box = document.getElementById('pr-bag-items'), f = prF();
  if (!box || !f) return;
  const rows = prBagCells(f);
  box.innerHTML = rows.html;
  box.scrollTop = 0;
  const count = document.getElementById('pr-bag-count');
  if (count) count.textContent = rows.count + ' / ' + (S.inv || []).length;
  document.querySelectorAll('#pr-m [data-pr-filter]').forEach(btn => {
    const on = btn.getAttribute('data-pr-filter') === PR.bagFilter;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', String(on));
  });
}
function prBagFilter(value) { if (['all','w','armor','accessory'].includes(value)) { PR.bagFilter = value; prBagRefresh(); } }
function prBagSearch(value) { PR.bagQuery = String(value || ''); prBagRefresh(); }
function prDraw() {
  const f = prF(); if (!f) return prClose();
  let o = document.getElementById('pr-m');
  if (!o) { o = document.createElement('div'); o.id = 'pr-m'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'pr-n'); o.onclick = e => { if (e.target === o) prClose(); }; document.body.appendChild(o); document.addEventListener('keydown', prKey); }
  const src = typeof tmFullSrc === 'function' ? tmFullSrc(f) : null, pg = prProg(f), dead = f.hp <= 0, n = roster().length;
  const lvl = f.h ? S.lvl : (f.lv || S.lvl), cls = CL[f.c] || CL.Campion;
  const spec = f.sp && typeof spDef0 === 'function' && spDef0(f);
  const traits = (f.t || []).map(x => `<span class="pr-tag" title="${tEsc(x.d || '')}">${tEsc(x.n)}</span>`).join('');
  const train = f.h ? (s => `<div class="pr-tr"><span${prTipA('Forță', f)}>Forță <b>${s.f}</b></span><span${prTipA('Rezistență', f)}>Rezistență <b>${s.r}</b></span><span${prTipA('Agilitate', f)}>Agilitate <b>${s.a}</b></span><small>din ${smax()}</small></div>`)(ST()) : '';
  const L = ['h', 'a', 'b'], R = ['w', 'j', 'r'];
  o.innerHTML = `<div class="pr-c${dead ? ' dead' : ''}${f.h&&typeof egTitleGet==='function'&&egTitleGet()?' eg-cosmetic':''} pr-beta">
<button class="pr-x" onclick="prClose()" aria-label="Închide profilul" title="Închide (Esc)">✕</button>
<section class="pr-l">
  <div class="pr-ban">${n > 1 ? `<button class="pr-nav" onclick="prNext(-1)" aria-label="Personajul anterior">‹</button>` : ''}<h2 id="pr-n">${tEsc(f.n)}</h2>${n > 1 ? `<button class="pr-nav" onclick="prNext(1)" aria-label="Personajul următor">›</button>` : ''}</div>
  <div class="pr-lv"><span class="pr-lvn" title="Nivel">${lvl}</span><div class="pr-pg">${pg ? `<div class="pr-pgl"><span>${pg.lbl}</span></div><i class="pr-bar"><i style="width:${pg.p}%"></i></i><small>${pg.sub}</small>` : ''}</div></div>
  <div class="pr-ti">${tEsc(prTitle(f))}${f.h&&typeof egTitleGet==='function'&&egTitleGet()?` <span class="eg-title-medal">${tEsc(egTitleGet())}</span>`:''}${typeof roleOf === 'function' && f.c !== 'Gardian' ? ` <span class="pr-role r-${roleOf(f)}"${prTipA(roleOf(f), f)}>${roleOf(f)}</span>` : ''}</div>
  ${traits ? `<div class="pr-tags">${traits}</div>` : ''}
  <div class="pr-st">${prStats(f)}</div>
  ${typeof setLine === 'function' ? setLine(f) : ''}
  ${train}
  <div class="pr-ab"><b>${tEsc(cls.sp)}</b> <span>${tEsc(cls.d)}</span>${spec ? `<div><b>${tEsc(spec.n)}</b> <span>${tEsc(spec.r || '')}</span></div>` : ''}</div>
</section>
<section class="pr-r">
  <div class="pr-doll">
    <div class="pr-col">${L.map(k => prSlot(f, k)).join('')}</div>
    <div class="pr-por">${src ? `<img src="${src}" alt="${tEsc(f.n)}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'pr-av'}))">` : `<span class="pr-av">${av(f, 180)}</span>`}${dead ? '<b class="pr-dead">☠ căzut</b>' : ''}</div>
    <div class="pr-col">${R.map(k => prSlot(f, k)).join('')}</div>
  </div>
  <div class="pr-bh"><b>Rucsac</b><span class="pr-bag-count" id="pr-bag-count" aria-live="polite">${prBagCells(f).count} / ${(S.inv || []).length}</span><span class="mute">Atinge pentru echipare · ▲ îmbunătățire</span></div>
  ${prBagTools()}
  ${prBag(f)}
</section></div>`;
}

/* intrările: portretul mare din Echipă și un buton în rândul de acțiuni (echipa.js le cheamă dacă există) */
const prBtn = i => `<button class="pr-open" onclick="prOpen(${i})">👤 Profil</button>`;

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `
#pr-m{position:fixed;inset:0;z-index:25500;display:flex;align-items:center;justify-content:center;padding:14px;background:#05070ad9;backdrop-filter:blur(3px)}
.pr-c{position:relative;display:grid;grid-template-columns:minmax(260px,330px) minmax(0,1fr);width:min(980px,100%);max-height:calc(100vh - 28px);overflow:hidden;border:1px solid var(--gold);border-radius:14px;background:linear-gradient(180deg,#171c1f,#0c0f11);box-shadow:0 24px 70px #000e;animation:prIn .22s ease-out}
.pr-c>section{margin:0!important;border-radius:0!important;border-top:0!important;border-bottom:0!important;border-left:0!important;box-shadow:none!important}
.pr-c>section.pr-r{border-right:0!important}
.pr-x{position:absolute;top:8px;right:8px;z-index:3;width:36px;height:36px;min-height:0;padding:0;border-radius:50%;font-size:17px;line-height:1;background:#0b0e10e6;border:1px solid var(--gold)}
.pr-l{padding:0 0 14px;border-right:1px solid #f0d27a33;overflow-y:auto;background:linear-gradient(180deg,#141a1d,#0e1214)}
.pr-ban{display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 12px;background:linear-gradient(90deg,#5a1a16,#7a2a20 50%,#5a1a16);border-bottom:1px solid #f0d27a55}
.pr-ban h2{border:0!important;padding:0!important;background:none!important;margin:0;font:700 21px Cinzel,Georgia,serif;color:#f6ead0;text-shadow:0 2px 4px #000;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pr-ban h2::before,.pr-ban h2::after{display:none!important;content:none!important}
.pr-nav{width:28px;height:28px;min-height:0;padding:0;border-radius:6px;font-size:18px;line-height:1;background:#0006;border:1px solid #f0d27a55}
.pr-lv{display:flex;align-items:center;gap:10px;padding:12px 14px 4px}
.pr-lvn{flex:none;display:flex;align-items:center;justify-content:center;width:44px;height:44px;border:2px solid var(--gold);border-radius:8px;background:#0b0e10;font:700 20px Cinzel,serif;color:var(--gold2)}
.pr-pg{flex:1;min-width:0}.pr-pgl{font-size:12.5px;color:#d6d9db}.pr-pg small{font-size:11.5px;color:var(--mute)}
.pr-bar{display:block;height:8px;margin:3px 0;border-radius:4px;background:#000;border:1px solid #4e4224;overflow:hidden}.pr-bar i{display:block;height:100%;background:linear-gradient(90deg,#9b7424,#f0d27a)}
.pr-ti{padding:6px 14px 0;font:700 13.5px Cinzel,serif;color:var(--gold2)}
.pr-role{margin-left:4px;font:700 10px Cinzel,serif;padding:1px 7px;border-radius:8px;vertical-align:middle}.pr-role.r-Tank{background:#17324a;color:#7fb3ff}.pr-role.r-DPS{background:#4a2414;color:#f0a06a}.pr-role.r-Suport{background:#1f4a2a;color:#9fe3ad}
.pr-tags{display:flex;flex-wrap:wrap;gap:4px;padding:6px 14px 0}.pr-tag{font-size:11.5px;padding:1px 7px;border-radius:8px;border:1px solid #ffffff22;color:#d6d9db}
.pr-st{margin:10px 10px 0;border:1px solid #ffffff14;border-radius:8px;overflow:hidden}
.pr-sr{display:grid;grid-template-columns:22px 1fr auto;align-items:center;gap:6px;padding:6px 10px;font-size:14px;background:#0f1416}.pr-sr:nth-child(even){background:#131a1d}
.pr-sr{cursor:help}.pr-sr:hover,.pr-sr:focus{background:#1c2428;outline:none}.pr-tr span,.pr-role{cursor:help}
.pr-sr i{font-style:normal;text-align:center;font-size:13px}.pr-sr span{color:#c9cdcf}.pr-sr b{color:#fff;font-variant-numeric:tabular-nums}.pr-sr.low b{color:#f0b07b}.pr-sr.bad b{color:#e8837b}
.pr-tr{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline;padding:8px 14px 0;font-size:12.5px;color:var(--mute)}.pr-tr b{color:var(--ink)}
.pr-ab{margin:10px 14px 0;font-size:13px;line-height:1.4;color:var(--mute)}.pr-ab b{color:var(--ink)}.pr-ab div{margin-top:4px}
.pr-r{display:flex;flex-direction:column;min-width:0;overflow-y:auto;padding:14px}
.pr-doll{display:grid;grid-template-columns:64px minmax(0,1fr) 64px;gap:10px;align-items:center;padding:10px;border:1px solid #f0d27a33;border-radius:10px;background:radial-gradient(ellipse at 50% 30%,#2a2418,#0c0f11 75%)}
.pr-col{display:flex;flex-direction:column;gap:12px}
.pr-sl{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;width:64px;height:64px;border:2px solid #6b5a30;border-radius:8px;background:#0b0e10;box-shadow:inset 0 0 12px #000}
.pr-sl .ico,.pr-sl .uii{width:46px;height:46px;font-size:24px;margin:0}.pr-sl.em .uii{width:34px;height:34px;opacity:.35}.pr-sl small{font-size:9.5px;color:var(--mute);margin-top:1px}
.pr-sl.q1{border-color:#4f86c6}.pr-sl.q2{border-color:#e0c040}.pr-sl.q3{border-color:#a35cd8}.pr-sl.ql{border-color:#e8722c;box-shadow:inset 0 0 12px #000,0 0 10px #e8722c66}
.pr-un{position:absolute;top:-7px;right:-7px;width:20px;height:20px;min-height:0;padding:0;border-radius:50%;font-size:10px;line-height:1;opacity:0;transition:opacity .15s}
.pr-sl:hover .pr-un,.pr-sl:focus-within .pr-un{opacity:1}
@media (hover:none){.pr-un{opacity:.85}}
.pr-por{position:relative;aspect-ratio:1/1;max-height:360px;justify-self:center;width:100%;max-width:360px;border-radius:10px;overflow:hidden;border:1px solid #f0d27a55;background:#0e1214}
.pr-por img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 20%}
.pr-av{display:flex;align-items:center;justify-content:center;width:100%;height:100%}
.pr-c.dead .pr-por img{filter:grayscale(1) brightness(.55)}
.pr-dead{position:absolute;left:0;right:0;bottom:10px;text-align:center;font:700 16px Cinzel,serif;color:#e8837b;text-shadow:0 2px 4px #000}
.pr-bh{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;margin:14px 0 8px}.pr-bh b{font:700 15px Cinzel,serif;color:var(--gold2)}.pr-bh .mute{font-size:12px}
.pr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(50px,1fr));gap:5px}
.pr-it{position:relative;display:flex;align-items:center;justify-content:center;aspect-ratio:1/1;width:auto;min-height:0;padding:0;border:2px solid #3a3f42;border-radius:7px;background:#0b0e10;box-shadow:inset 0 0 8px #000}
.pr-it:hover{transform:none;border-color:var(--gold2)}.pr-it .ico,.pr-it .uii{width:36px;height:36px;font-size:20px;margin:0}
.pr-it.q1{border-color:#4f86c6aa}.pr-it.q2{border-color:#e0c040aa}.pr-it.q3{border-color:#a35cd8aa}.pr-it.ql{border-color:#e8722c}
.pr-it.no{opacity:.35;filter:grayscale(.7)}
.pr-up{position:absolute;top:1px;right:3px;font-size:11px;color:#7fd88c;text-shadow:0 1px 2px #000}
.pr-empty{font-size:13.5px}
.pr-open{width:auto}
.tm-full .pr-open{position:absolute;top:8px;right:8px;z-index:2;min-height:0;padding:4px 10px;font-size:12.5px;background:#0b0e10cc;border:1px solid var(--gold)}
/* BETA · Profil refăcut: portret și echipament echilibrate, rucsac independent. */
#pr-m:has(.pr-beta){background:#03080de0;backdrop-filter:blur(7px)}
.pr-c.pr-beta{grid-template-columns:minmax(288px,318px) minmax(0,1fr);width:min(1200px,calc(100vw - 32px));height:min(850px,calc(100dvh - 30px));max-height:calc(100dvh - 30px);border:1px solid #a88645;border-radius:16px;background:linear-gradient(140deg,#222c30,#0a1013 65%);box-shadow:0 0 0 1px #000,0 32px 90px #000f,0 0 30px #d4a95720}
.pr-beta .pr-l{min-height:0;scrollbar-width:thin;scrollbar-color:#846c37 transparent;background:linear-gradient(165deg,#27323a,#12191d 43%,#0c1215)}
.pr-beta .pr-ban{position:sticky;top:0;z-index:2;padding:10px 12px;background:linear-gradient(90deg,#243746,#314755 50%,#223442);border-color:#967844;box-shadow:0 4px 16px #0007}
.pr-beta .pr-ban h2{font-size:20px;letter-spacing:.05em;color:#f8e8b6}
.pr-beta .pr-nav{border-color:#9e874f;background:#111c22cc;color:#edd18c}
.pr-beta .pr-lv{padding:13px 16px 5px}
.pr-beta .pr-lvn{width:48px;height:48px;border-color:#d6b36b;border-radius:11px;background:linear-gradient(135deg,#3d311c,#161b20);box-shadow:inset 0 0 10px #e9c77b20}
.pr-beta .pr-ti{font-size:12px;line-height:1.5;padding:6px 16px 1px}
.pr-beta .pr-st{margin:11px 12px 0;border-radius:10px;border-color:#7c663d60}
.pr-beta .pr-sr{grid-template-columns:23px minmax(0,1fr) auto;gap:7px;padding:7px 11px;background:#101a1e}
.pr-beta .pr-sr:nth-child(even){background:#182328}
.pr-beta .pr-sr:hover,.pr-beta .pr-sr:focus{background:#2b363c}
.pr-beta .pr-sr span{font-size:13px}
.pr-beta .pr-sr b{font-size:13px}
.pr-beta .pr-tr,.pr-beta .pr-ab{margin-left:3px;margin-right:3px}
.pr-beta .pr-r{display:grid;grid-template-rows:minmax(0,auto) auto auto minmax(0,1fr);gap:0;padding:13px 14px 14px;min-height:0;overflow:hidden;background:radial-gradient(ellipse at 50% 0%,#263840 0,#10191d 43%,#0b1215 100%)}
.pr-beta .pr-doll{grid-template-columns:minmax(64px,1fr) minmax(215px,295px) minmax(64px,1fr);gap:10px;min-width:0;padding:10px 12px;min-height:0;border-color:#a88a4c88;border-radius:13px;background:radial-gradient(ellipse at 50% 45%,#314956 0,#121e24 63%,#0a1115 100%);box-shadow:inset 0 0 25px #0008}
.pr-beta .pr-col{align-items:center;justify-content:space-evenly;gap:7px;height:100%}
.pr-beta .pr-sl{width:58px;height:58px;border-radius:10px;box-shadow:inset 0 0 12px #000c,0 2px 10px #0005}
.pr-beta .pr-sl .ico,.pr-beta .pr-sl .uii{width:42px;height:42px}
.pr-beta .pr-por{width:100%;max-width:295px;max-height:295px;border-radius:12px;border-color:#bb9c64;box-shadow:0 0 0 3px #0b161b,0 8px 20px #000a}
.pr-beta .pr-x{top:8px;right:8px;z-index:5;border-color:#b39353;background:#0b151be9}
.pr-beta .pr-bh{align-items:center;gap:6px 10px;margin:10px 0 7px;padding:0 3px}
.pr-beta .pr-bh b{font-size:17px}
.pr-beta .pr-bag-count{font-size:12px;font-weight:700;white-space:nowrap;color:#e0c27c;border:1px solid #79633d;border-radius:12px;padding:2px 8px;background:#211f18}
.pr-beta .pr-bh .mute{margin-left:auto;font-size:11px}
.pr-bag-tools{display:flex;align-items:center;gap:9px;margin-bottom:8px;min-width:0}
.pr-bag-tabs{display:flex;gap:4px;flex-wrap:wrap}
.pr-bag-tabs button{min-height:0;padding:5px 10px;border:1px solid #525b56;border-radius:7px;color:#c1c8c7;background:#101a1e;font:600 12px Alegreya,Georgia,serif}
.pr-bag-tabs button.on{color:#f8e4aa;border-color:#d7ad5e;background:linear-gradient(180deg,#524321,#262319);box-shadow:inset 0 1px #fbe5a328}
.pr-bag-tabs button:focus-visible,.pr-bag-search:focus-visible{outline:2px solid #e5c47b;outline-offset:2px}
.pr-bag-search{box-sizing:border-box;flex:1;min-width:110px;max-width:240px;min-height:31px;padding:5px 10px;border-radius:7px;border:1px solid #666b60;background:#0c161a;color:#f3ead7;font-size:12px}
.pr-bag-search::placeholder{color:#9ca6a6}
.pr-beta .pr-grid{align-content:start;grid-template-columns:repeat(auto-fill,minmax(53px,1fr));gap:7px;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#816839 #11191c;padding:7px;border:1px solid #68573577;border-radius:10px;background:linear-gradient(180deg,#080e11,#111a1e)}
.pr-beta .pr-it{align-self:start;border-radius:9px;min-width:0;box-shadow:inset 0 0 12px #000b,0 2px 5px #0005}
.pr-beta .pr-it:hover,.pr-beta .pr-it:focus-visible{transform:translateY(-1px);box-shadow:0 0 0 1px #d9bb74,0 0 14px #cda9514d;outline:none}
.pr-bag-none{grid-column:1/-1;padding:15px;color:#c5c0ac;font-size:13px;text-align:center}
@media(min-width:761px) and (max-height:760px){
 .pr-c.pr-beta{height:calc(100dvh - 16px);max-height:calc(100dvh - 16px)}
 .pr-beta .pr-doll{padding:7px 10px}
 .pr-beta .pr-por{max-width:230px;max-height:230px}
 .pr-beta .pr-sl{width:53px;height:53px}
 .pr-beta .pr-r{padding:10px}
}
@media(min-width:761px) and (max-width:1080px){
 .pr-c.pr-beta{grid-template-columns:minmax(255px,290px) minmax(0,1fr)}
 .pr-beta .pr-doll{grid-template-columns:54px minmax(150px,1fr) 54px;padding:8px;gap:7px}
 .pr-beta .pr-sl{width:52px;height:52px}
 .pr-beta .pr-por{max-width:250px}
 .pr-bag-tools{flex-wrap:wrap}
}
@media(max-width:760px){
 .pr-c.pr-beta{width:100%;height:100dvh;max-height:none;display:block;overflow-y:auto;border-radius:0}
 .pr-beta .pr-l,.pr-beta .pr-r{overflow:visible}
 .pr-beta .pr-r{display:flex;flex-direction:column;min-height:0;padding:12px}
 .pr-beta .pr-doll{grid-template-columns:48px minmax(0,1fr) 48px;padding:7px;gap:7px}
 .pr-beta .pr-sl{width:48px;height:48px}
 .pr-beta .pr-sl .ico,.pr-beta .pr-sl .uii{width:36px;height:36px}
 .pr-beta .pr-por{max-width:270px}
 .pr-beta .pr-bh{flex-wrap:wrap}
 .pr-beta .pr-bh .mute{margin-left:0}
 .pr-bag-tools{flex-wrap:wrap}
 .pr-bag-tabs{flex:1}
 .pr-bag-search{max-width:none;flex-basis:100%}
 .pr-beta .pr-grid{overflow:visible;max-height:none;grid-template-columns:repeat(auto-fill,minmax(48px,1fr))}
}
@keyframes prIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.pr-c{animation:none}}
@media (max-width:760px){
  #pr-m{padding:0;align-items:stretch}
  .pr-c{grid-template-columns:1fr;max-height:none;height:100%;border-radius:0;overflow-y:auto}
  .pr-l,.pr-r{overflow:visible}.pr-l{border-right:0;border-bottom:1px solid #f0d27a33;order:1}.pr-r{order:2;padding:12px}
  .pr-ban{padding-right:52px;padding-left:52px}
  .pr-doll{grid-template-columns:54px minmax(0,1fr) 54px;gap:8px;padding:8px}.pr-sl{width:54px;height:54px}.pr-sl .ico,.pr-sl .uii{width:38px;height:38px}
  .pr-grid{grid-template-columns:repeat(auto-fill,minmax(46px,1fr))}
}`;
  document.head.appendChild(st);
})();
