/* ============================================================================
   Silver Throne — profil.js
   Profilul de personaj (eroul și mercenarii), într-o singură fereastră: în stânga numele, nivelul, titlul,
   progresul (experiența eroului / faima mercenarului) și statisticile; în dreapta portretul mare, cu cele
   6 sloturi de echipament de o parte și de alta, iar dedesubt rucsacul. ✕ sau Esc închide.
   Echiparea și scoaterea sunt aceleași funcții ale jocului (equip / unequip), pentru luptătorul din profil.
   Se deschide cu prOpen(i), unde i e poziția în roster() (echipă, apoi rezervă, apoi străjeri).
   Se încarcă după echipa.js.
   ========================================================================== */
const PR = { i: -1 };
const prF = () => roster()[PR.i];
const prPct = v => (v > 0 ? '+' : '−') + Math.abs(v) + '%';

function prOpen(i) { if (!roster()[i]) return; PR.i = i; prDraw(); }
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
  return rows.map(([i, n, v, c]) => `<div class="pr-sr${c ? ' ' + c : ''}"><i>${i}</i><span>${n}</span><b>${v}</b></div>`).join('');
}
function prSlot(f, k) {
  const it = E(f)[k];
  if (!it) return `<div class="pr-sl em" title="${SLN[k]}: gol">${UI(UISL[k])}<small>${SLN[k]}</small></div>`;
  return `<div class="pr-sl q${it.lg ? 'l' : it.r}"${typeof itTipA === 'function' ? itTipA(it) : ` title="${tEsc(it.name)}"`}>${iic(it)}<button class="pr-un" onclick="prUn('${k}')" title="Scoate ${tEsc(it.name)}" aria-label="Scoate ${tEsc(it.name)}">✕</button></div>`;
}
function prBag(f) {
  const inv = S.inv || [];
  if (!inv.length) return '<div class="mute pr-empty">Rucsacul e gol.</div>';
  const cells = inv.map((it, i) => {
    const cur = E(f)[it.t], up = typeof bsc === 'function' && (!cur || bsc(it, f) > bsc(cur, f) * 1.02);
    return `<button class="pr-it q${it.lg ? 'l' : it.r}${up ? ' up' : ''}" onclick="prEq(${i})"${typeof itTipA === 'function' ? itTipA(it, cur) : ` title="${tEsc(it.name)}"`} aria-label="Echipează ${tEsc(it.name)}">${iic(it)}${up ? '<b class="pr-up">▲</b>' : ''}</button>`;
  }).join('');
  return `<div class="pr-grid">${cells}</div>`;
}
function prDraw() {
  const f = prF(); if (!f) return prClose();
  let o = document.getElementById('pr-m');
  if (!o) { o = document.createElement('div'); o.id = 'pr-m'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'pr-n'); o.onclick = e => { if (e.target === o) prClose(); }; document.body.appendChild(o); document.addEventListener('keydown', prKey); }
  const src = typeof tmFullSrc === 'function' ? tmFullSrc(f) : null, pg = prProg(f), dead = f.hp <= 0, n = roster().length;
  const lvl = f.h ? S.lvl : (f.lv || S.lvl), cls = CL[f.c] || CL.Campion;
  const spec = f.sp && typeof spDef0 === 'function' && spDef0(f);
  const traits = (f.t || []).map(x => `<span class="pr-tag" title="${tEsc(x.d || '')}">${tEsc(x.n)}</span>`).join('');
  const train = f.h ? (s => `<div class="pr-tr"><span>Forță <b>${s.f}</b></span><span>Rezistență <b>${s.r}</b></span><span>Agilitate <b>${s.a}</b></span><small>din ${smax()}</small></div>`)(ST()) : '';
  const L = ['h', 'a', 'b'], R = ['w', 'j', 'r'];
  o.innerHTML = `<div class="pr-c${dead ? ' dead' : ''}">
<button class="pr-x" onclick="prClose()" aria-label="Închide profilul" title="Închide (Esc)">✕</button>
<section class="pr-l">
  <div class="pr-ban">${n > 1 ? `<button class="pr-nav" onclick="prNext(-1)" aria-label="Personajul anterior">‹</button>` : ''}<h2 id="pr-n">${tEsc(f.n)}</h2>${n > 1 ? `<button class="pr-nav" onclick="prNext(1)" aria-label="Personajul următor">›</button>` : ''}</div>
  <div class="pr-lv"><span class="pr-lvn" title="Nivel">${lvl}</span><div class="pr-pg">${pg ? `<div class="pr-pgl"><span>${pg.lbl}</span></div><i class="pr-bar"><i style="width:${pg.p}%"></i></i><small>${pg.sub}</small>` : ''}</div></div>
  <div class="pr-ti">${tEsc(prTitle(f))}${typeof roleOf === 'function' && f.c !== 'Gardian' ? ` <span class="pr-role r-${roleOf(f)}">${roleOf(f)}</span>` : ''}</div>
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
  <div class="pr-bh"><b>Rucsac</b><span class="mute">${(S.inv || []).length} obiecte · atinge un obiect ca să-l echipezi pe ${tEsc(f.n)} · ▲ e mai bun decât ce poartă</span></div>
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
.pr-up{position:absolute;top:1px;right:3px;font-size:11px;color:#7fd88c;text-shadow:0 1px 2px #000}
.pr-empty{font-size:13.5px}
.pr-open{width:auto}
.tm-full .pr-open{position:absolute;top:8px;right:8px;z-index:2;min-height:0;padding:4px 10px;font-size:12.5px;background:#0b0e10cc;border:1px solid var(--gold)}
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
