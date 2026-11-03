/* ============================================================================
   Silver Throne — recompense.js
   Recompensele, animate: ce ai câștigat (aur, minereu, materiale, experiență, puncte, obiecte, nivel nou)
   apare cu numere care urcă și obiecte care se întorc pe rând, ca o carte.
   • Momentele mari (căpitan învins, ieșirea din Turn, raid, misiuni, cufărul zilei, Drumul eroului,
     capitole, expediții, premiul Tronului, orice nivel nou): fereastră în mijloc, cu „Preia”.
   • Monștrii obișnuiți: o bandă mică jos, care dispare singură după câteva secunde.
   Nu schimbă nicio regulă: învelește funcțiile care dau recompense și compară starea dinainte cu cea de după.
   Când botul joacă sau e cerută mișcare redusă, numerele apar direct, fără animație.
   Se poate încărca oriunde: legăturile se fac după ce pagina s-a încărcat (rwHook).
   ========================================================================== */
const RW = { q: [], open: false };

const rwXpTot = () => { let t = S.xp || 0; for (let l = 1; l < S.lvl; l++) t += need(l); return t; };
function rwSnap() {
  return { g: S.gold || 0, o: S.ore || 0, p: S.pts || 0, x: rwXpTot(), l: S.lvl, f: S.frag || 0, m: Object.assign({}, S.mat || {}), inv: new Set(S.inv || []), n: (S.inv || []).length,
    eq: new Set([...(S.fs || []), ...(S.rs || []), ...(S.gd || [])].flatMap(f => Object.values(f.eq || {})).filter(Boolean)) };
}
function rwDiff(a) {
  const m = {}; for (const k in (S.mat || {})) { const d = (S.mat[k] || 0) - (a.m[k] || 0); if (d > 0) m[k] = d; }
  return { g: Math.max(0, (S.gold || 0) - a.g), o: Math.max(0, (S.ore || 0) - a.o), p: Math.max(0, (S.pts || 0) - a.p), x: Math.max(0, rwXpTot() - a.x),
    l: S.lvl > a.l ? S.lvl : 0, f: Math.max(0, (S.frag || 0) - a.f), m, it: rwNewItems(a) };
}
/* obiectele cu adevărat noi: nu erau nici în rucsac, nici echipate (o piesă scoasă de pe cineva nu e pradă),
   și nu mai multe decât a crescut rucsacul; obiectele noi se adaugă la sfârșitul rucsacului */
function rwNewItems(a) {
  const inv = S.inv || [], grow = Math.max(0, inv.length - a.n);
  let it = inv.filter(x => !a.inv.has(x) && !a.eq.has(x));
  if (it.length > grow) it = grow ? inv.slice(-grow).filter(x => !a.inv.has(x)) : [];
  return it;
}
const rwEmpty = r => !r.g && !r.o && !r.p && !r.x && !r.l && !r.f && !Object.keys(r.m).length && !r.it.length;
const rwQuiet = () => (typeof S !== 'undefined' && S.prem && S.bt && S.bt.on) || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

/* învelește o funcție a jocului: dacă după ea ai câștigat ceva, arată-l */
function rwWrap(name, how) {
  const f = window[name]; if (typeof f !== 'function' || f.__rw) return;
  const w = function (...a) {
    const ctx = how.before ? how.before(...a) : null, loot = how.items ? how.items(ctx) : null, s0 = rwSnap(), r = f.apply(this, a);
    const done = () => { try { const d = rwDiff(s0); if (loot) d.it = loot; if (!rwEmpty(d)) rwShow(d, how.title(ctx, d, ...a), how.big(ctx, d, ...a)); } catch (e) { /* recompensa nu blochează jocul */ } };
    if (r && typeof r.then === 'function') r.then(done, done); else done();
    return r;
  };
  w.__rw = 1; window[name] = w;
}

/* cât timp se redă lupta (fx.js) sau e deschisă altă fereastră a jocului, recompensa așteaptă: nu strică finalul luptei */
function rwShow(r, title, big) {
  const busy = () => (typeof FX !== 'undefined' && FX.playing) || document.getElementById('fx-m') || document.getElementById('lgm') || document.getElementById('mr-m');
  /* lupta se rezolvă înainte să înceapă redarea (fxAutoRun): verificăm după ce s-a terminat apelul curent */
  setTimeout(() => {
    if (!busy()) return rwShow0(r, title, big);
    let n = 0; const t = setInterval(() => { if (!busy() || ++n > 240) { clearInterval(t); rwShow0(r, title, big); } }, 250);
  }, 0);
}
function rwShow0(r, title, big) {
  if (r.l || r.it.some(it => it.lg)) big = true;                 /* nivel nou sau obiect legendar: mereu fereastra mare */
  if (rwQuiet() && S.prem && S.bt && S.bt.on) big = false;       /* botul joacă: doar banda mică */
  if (big) { RW.q.push([r, title]); if (!RW.open) rwNext(); } else rwToast(r, title);
}

/* ------------------------------------------------------------------ PIESELE */
const rwN = n => Math.round(n).toLocaleString('ro-RO');
function rwChips(r) {
  const c = [];
  if (r.x) c.push(['x', '<b class="rw-xp">✦</b>', r.x, 'experiență']);
  if (r.g) c.push(['g', IC.g, r.g, 'aur']);
  if (r.o) c.push(['o', IC.o, r.o, 'minereu']);
  if (r.p) c.push(['p', IC.p || '⚡', r.p, 'puncte']);
  if (r.f) c.push(['f', '<b class="rw-fr">◆</b>', r.f, r.f === 1 ? 'fragment epic' : 'fragmente epice']);
  return c;
}
const rwMats = r => Object.entries(r.m).map(([k, n]) => `<span class="rw-mt" title="${tEsc((typeof mn === 'function' ? mn(k) : (MA && MA[k])) || k)}">+${n} ${tEsc((typeof mn === 'function' ? mn(k) : (MA && MA[k])) || k)}</span>`).join('');
const rwItem = (it, i) => `<div class="rw-it q${it.lg ? 'l' : it.r}" style="--d:${(0.35 + i * 0.16).toFixed(2)}s"${typeof itTipA === 'function' ? itTipA(it) : ''}><div class="rw-in"><div class="rw-back"></div><div class="rw-front">${iic(it)}</div></div><small>${tEsc(it.name)}</small></div>`;

/* numerele urcă de la 0 (ease-out), în ~0,9 s */
function rwCount(root, quick) {
  const els = [...root.querySelectorAll('[data-to]')];
  if (quick) { els.forEach(e => { e.textContent = rwN(+e.dataset.to); }); return; }
  const t0 = performance.now(), T = 900;
  const tick = t => { const k = Math.min(1, (t - t0) / T), e = 1 - Math.pow(1 - k, 3); els.forEach(el => { el.textContent = rwN(+el.dataset.to * e); }); if (k < 1 && root.isConnected) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

/* ------------------------------------------------------------------ FEREASTRA MARE */
function rwNext() {
  const n = RW.q.shift(); if (!n) { RW.open = false; return; }
  RW.open = true; const [r, title] = n, quick = rwQuiet();
  const o = document.createElement('div'); o.id = 'rw-m'; o.className = quick ? 'quick' : ''; o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'rw-t');
  const chips = rwChips(r).map(([k, ic, v, lbl], i) => `<div class="rw-ch" style="--d:${(i * 0.08).toFixed(2)}s" title="${lbl}"><span class="rw-ic">${ic}</span><b data-to="${v}">0</b><small>${lbl}</small></div>`).join('');
  o.innerHTML = `<div class="rw-c">
  <div class="rw-top"><span class="rw-orn"></span><h2 id="rw-t">${tEsc(title)}</h2><span class="rw-orn r"></span></div>
  ${r.l ? `<div class="rw-lv"><span>Nivel nou</span><b>${r.l}</b></div>` : ''}
  ${chips ? `<div class="rw-sub">Recompense</div><div class="rw-chs">${chips}</div>` : ''}
  ${Object.keys(r.m).length ? `<div class="rw-mts">${rwMats(r)}</div>` : ''}
  ${r.it.length ? `<div class="rw-sub">${r.it.length === 1 ? 'Obiect găsit' : 'Obiecte găsite'}</div><div class="rw-its">${r.it.map(rwItem).join('')}</div>` : ''}
  <button class="p rw-ok" onclick="rwClose()">Preia</button>
</div>`;
  document.body.appendChild(o); rwCount(o, quick);
  RW.key = e => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); rwClose(); } };
  document.addEventListener('keydown', RW.key);
  setTimeout(() => o.querySelector('.rw-ok')?.focus(), 50);
}
function rwClose() {
  const o = document.getElementById('rw-m'); if (RW.key) document.removeEventListener('keydown', RW.key);
  if (!o) return rwNext();
  o.classList.add('out'); setTimeout(() => { o.remove(); rwNext(); }, rwQuiet() ? 0 : 180);
}

/* ------------------------------------------------------------------ BANDA MICĂ */
function rwToast(r, title) {
  let box = document.getElementById('rw-ts'); if (!box) { box = document.createElement('div'); box.id = 'rw-ts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  const quick = rwQuiet(), t = document.createElement('div'); t.className = 'rw-t' + (quick ? ' quick' : '');
  const chips = rwChips(r).map(([k, ic, v, lbl]) => `<span class="rw-tc" title="${lbl}"><span class="rw-ic">${ic}</span>+<b data-to="${v}">0</b></span>`).join('');
  const mats = Object.values(r.m).reduce((a, b) => a + b, 0);
  t.innerHTML = `<b class="rw-tt">${tEsc(title)}</b>${chips}${mats ? `<span class="rw-tc">+${mats} materiale</span>` : ''}${r.it.map(it => `<span class="rw-ti q${it.lg ? 'l' : it.r}"${typeof itTipA === 'function' ? itTipA(it) : ''}>${iic(it)}</span>`).join('')}`;
  box.appendChild(t); while (box.children.length > 3) box.firstChild.remove();
  rwCount(t, quick);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 3400);
}

/* ------------------------------------------------------------------ LEGĂTURILE */
/* funcțiile jocului (leave, claim…) sunt definite de scriptul din pagină, care vine după acest fișier: legăturile se fac la încărcare */
function rwHook() {
  const big = () => true;
  rwWrap('leave', {
    before: () => S.d,
    items: d => d && d.loot && d.loot.it ? d.loot.it.slice() : [],
    title: d => !d ? 'Pradă' : d.tw ? 'Ai ieșit din Turn' : d.lume ? 'Atac reușit' : d.raid != null ? (d.done ? 'Raid încheiat' : 'Pradă') : d.done ? 'Căpitan învins!' : 'Pradă',
    big: d => !!d && (d.done || !!d.tw || d.raid != null || !!d.lume)
  });
  rwWrap('claim', { title: () => 'Misiune îndeplinită!', big });
  rwWrap('claimB', { title: () => 'Bonusul zilei', big });
  rwWrap('dcOpen', { title: () => 'Cufărul zilei', big });
  rwWrap('drumClaim', { title: () => 'Drumul eroului', big });
  rwWrap('cmpClaim', { title: () => 'Capitol încheiat!', big });
  rwWrap('secClaim', { title: () => 'Obiectiv îndeplinit!', big });
  rwWrap('mxClaim', { title: () => 'Expediție încheiată', big });
  rwWrap('tronClaim', { title: () => 'Premiul Tronului', big });
}
if (typeof window !== 'undefined') { if (document.readyState === 'complete') rwHook(); else window.addEventListener('load', rwHook); }

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `
#rw-m{position:fixed;inset:0;z-index:26000;display:flex;align-items:center;justify-content:center;padding:16px;background:radial-gradient(ellipse at 50% 45%,#2a2010cc,#05070ae8 70%);animation:rwFade .25s ease-out}
#rw-m.out{animation:rwFade .18s ease-in reverse forwards}
.rw-c{position:relative;width:min(560px,100%);max-height:calc(100vh - 32px);overflow-y:auto;padding:0 18px 18px;text-align:center;border:2px solid var(--gold);border-radius:14px;background:linear-gradient(180deg,#1b2124,#0c0f11);box-shadow:0 0 0 1px #000,0 0 40px #f0d27a33,0 24px 70px #000e;animation:rwPop .4s cubic-bezier(.2,1.4,.4,1)}
.rw-top{display:flex;align-items:center;justify-content:center;gap:10px;margin:0 -18px 12px;padding:14px 18px 12px;background:linear-gradient(180deg,#2b2416,#151a1c);border-bottom:1px solid #f0d27a55;border-radius:12px 12px 0 0}
.rw-top h2{margin:0;padding:0;border:0;background:none;font:700 23px Cinzel,Georgia,serif;letter-spacing:.06em;color:#f6ead0;text-shadow:0 0 14px #f0d27a66,0 2px 4px #000}
.rw-top h2::before,.rw-top h2::after{display:none!important;content:none!important}
.rw-orn{width:44px;height:2px;background:linear-gradient(90deg,transparent,#f0d27a)}.rw-orn.r{transform:scaleX(-1)}
.rw-sub{margin:10px 0 8px;font:700 12px Cinzel,serif;letter-spacing:.12em;text-transform:uppercase;color:#c9b27a}
.rw-chs{display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.rw-ch{display:flex;align-items:center;gap:6px;padding:6px 12px;border:1px solid #f0d27a44;border-radius:9px;background:#0b0e10;animation:rwUp .4s ease-out both;animation-delay:var(--d)}
.rw-ch b{font:700 19px Cinzel,serif;color:#fff;font-variant-numeric:tabular-nums;min-width:2ch;text-align:right}.rw-ch small{font-size:12px;color:var(--mute)}
.rw-ic{display:inline-flex;width:24px;height:24px;align-items:center;justify-content:center}.rw-ic svg{width:24px;height:24px}
.rw-xp{font-size:20px;line-height:1;color:#9fdcff;text-shadow:0 0 8px #5cb6ff}.rw-fr{color:#c58cff;font-size:18px}
.rw-mts{display:flex;flex-wrap:wrap;justify-content:center;gap:5px;margin-top:8px}.rw-mt{font-size:12.5px;padding:2px 9px;border-radius:9px;border:1px solid #ffffff22;color:#d6d9db;animation:rwUp .4s ease-out .3s both}
.rw-lv{display:inline-flex;align-items:baseline;gap:10px;margin:2px auto 4px;padding:6px 18px;border-radius:10px;border:1px solid #9fdcff88;background:radial-gradient(ellipse,#1d3a4a,#0b0e10);box-shadow:0 0 22px #5cb6ff55;animation:rwLv .7s cubic-bezier(.2,1.6,.4,1) both}
.rw-lv span{font:700 13px Cinzel,serif;color:#9fdcff;letter-spacing:.08em;text-transform:uppercase}.rw-lv b{font:900 30px Cinzel,serif;color:#fff;text-shadow:0 0 12px #9fdcff}
.rw-its{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;padding:12px;border-radius:10px;background:linear-gradient(180deg,#0a0c0e,#151012);box-shadow:inset 0 0 18px #000}
.rw-it{width:84px;display:flex;flex-direction:column;align-items:center;gap:5px;perspective:600px}
.rw-in{position:relative;width:68px;height:68px;transform-style:preserve-3d;animation:rwFlip .6s cubic-bezier(.3,1.3,.5,1) both;animation-delay:var(--d)}
.rw-back,.rw-front{position:absolute;inset:0;border-radius:9px;backface-visibility:hidden;display:flex;align-items:center;justify-content:center}
.rw-back{background:repeating-linear-gradient(45deg,#3a2a10 0 6px,#2a1e0c 6px 12px);border:2px solid #9b7424;transform:rotateY(180deg)}
.rw-front{border:2px solid #4a4f52;background:radial-gradient(circle,#2a1a14,#0b0e10);box-shadow:inset 0 0 14px #000}
.rw-front .ico,.rw-front .uii{width:50px;height:50px;font-size:26px;margin:0}
.rw-it.q1 .rw-front{border-color:#4f86c6}.rw-it.q2 .rw-front{border-color:#e0c040;box-shadow:inset 0 0 14px #000,0 0 12px #e0c04044}.rw-it.q3 .rw-front{border-color:#a35cd8;box-shadow:inset 0 0 14px #000,0 0 14px #a35cd866}
.rw-it.ql .rw-front{border-color:#e8722c;background:radial-gradient(circle,#5a2410,#1a0c08);box-shadow:inset 0 0 14px #000,0 0 22px #e8722caa;animation:rwGlow 1.6s ease-in-out infinite alternate}
.rw-it small{font-size:11px;line-height:1.2;color:#c9cdcf;max-width:84px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;animation:rwUp .3s ease-out both;animation-delay:calc(var(--d) + .35s)}
.rw-ok{min-width:160px;margin-top:16px;padding:10px 28px;font:700 16px Cinzel,serif;letter-spacing:.06em}
#rw-m.quick *,#rw-ts .quick,#rw-ts .quick *{animation:none!important}
#rw-ts{position:fixed;left:50%;bottom:18px;z-index:24500;display:flex;flex-direction:column;align-items:center;gap:6px;transform:translateX(-50%);pointer-events:none;width:max-content;max-width:calc(100vw - 24px)}
@media (max-width:959px){#rw-ts{bottom:88px}}
.rw-t{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px 10px;padding:7px 14px;border:1px solid var(--gold);border-radius:22px;background:linear-gradient(180deg,#1d2427f5,#111618f5);box-shadow:0 8px 24px #000c;font-size:14px;pointer-events:auto;animation:rwUp .3s ease-out both}
.rw-t.out{transition:opacity .4s,transform .4s;opacity:0;transform:translateY(8px)}
.rw-tt{font:700 13px Cinzel,serif;color:var(--gold2)}.rw-tc{display:inline-flex;align-items:center;gap:3px;color:#d6d9db}.rw-tc b{color:#fff}.rw-tc .rw-ic,.rw-tc .rw-ic svg{width:18px;height:18px}
.rw-ti{display:inline-flex;width:28px;height:28px;align-items:center;justify-content:center;border:1px solid #4a4f52;border-radius:6px;background:#0b0e10;animation:rwPopI .4s cubic-bezier(.2,1.6,.4,1) .2s both}.rw-ti .ico,.rw-ti .uii{width:22px;height:22px;font-size:13px;margin:0}
.rw-ti.q1{border-color:#4f86c6}.rw-ti.q2{border-color:#e0c040}.rw-ti.q3{border-color:#a35cd8}.rw-ti.ql{border-color:#e8722c}
@keyframes rwFade{from{opacity:0}to{opacity:1}}
@keyframes rwPop{from{opacity:0;transform:scale(.85) translateY(10px)}to{opacity:1;transform:none}}
@keyframes rwUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes rwFlip{0%{opacity:0;transform:rotateY(180deg) scale(.6)}40%{opacity:1}100%{opacity:1;transform:rotateY(0) scale(1)}}
@keyframes rwLv{from{opacity:0;transform:scale(1.8)}to{opacity:1;transform:none}}
@keyframes rwGlow{from{box-shadow:inset 0 0 14px #000,0 0 14px #e8722c88}to{box-shadow:inset 0 0 14px #000,0 0 30px #ff9a4ccc}}
@keyframes rwPopI{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:none}}
@media (max-width:520px){.rw-top h2{font-size:19px}.rw-orn{width:22px}.rw-it{width:72px}.rw-in{width:58px;height:58px}.rw-front .ico,.rw-front .uii{width:42px;height:42px}}`;
  document.head.appendChild(st);
})();
