/* ============================================================================
   Silver Throne — fx.js
   Redarea luptei, lovitură cu lovitură: cifrele de luptă (index.html, specializari.js, trepte.js)
   nu se ating deloc. step()/enemy() înregistrează, pe lângă ce fac deja, câte un „cadru” per lovitură
   în FXQ (cine a pierdut/câștigat câtă viață și replica din jurnal); fx.js doar redă acele cadre, cu o
   pauză între ele, peste o fereastră proprie (portrete + bare de viață), independentă de restul paginii.
   Setarea „Redare rapidă” (S.fxInstant) sare direct la rezultat; prima luptă a jucătorului rămâne mereu
   animată, indiferent de setare. „Automat” din timpul luptei rămâne neschimbat (instant, ca înainte).
   ========================================================================== */
const FX = { q: [], cast: null, delay: 550, playing: false };
const FXQ = FX.q;   /* alias folosit din index.html, ca să nu depindă de ordinea de încărcare */

/* la începutul fiecărei lupte: golește coada și reține portretele/numele, pentru fereastra de redare */
function fxCast() {
  FX.q.length = 0;
  const d = S.d, f = d && d.f; if (!f) return;
  const esIcon = e => { if (e.b) { const b = typeof tmnBoss === 'function' ? tmnBoss(d.bn) : null; return b ? `imagini/monstri/${b[0]}.jpg` : null; } return typeof monImg === 'function' ? monImg(e.n) : null; };
  /* viața REALĂ de la începutul acestei lupte (echipa poate intra deja rănită, fără vindecare între monștri) */
  FX.cast = {
    fs: S.fs.map(x => ({ n: x.n, c: x.c, ic: x.ic, h: x.h, mh: mhp(x), hp: Math.max(0, x.hp) })),
    es: f.es.map(e => ({ n: e.n, c: e.c, ic: e.ic, b: e.b, mh: e.mh, hp: Math.max(0, e.hp), img: esIcon(e) })),
  };
}
/* instantaneu, înainte de fiecare lovitură */
function fxSnap() { const d = S.d, f = d && d.f; return { fs: S.fs.map(x => x.hp), es: f ? f.es.map(e => e.hp) : [] }; }
/* după lovitură: dacă s-a schimbat ceva (sau avem o replică de arătat), adaugă un cadru */
function fxPush(pre, txt, actor) {
  const d = S.d, f = d && d.f; if (!f || !pre) return;
  const dFs = S.fs.map((x, i) => x.hp - (pre.fs[i] || 0)).map((v, i) => v ? { i, v, mh: mhp(S.fs[i]) } : null).filter(Boolean);
  const dEs = f.es.map((e, i) => e.hp - (pre.es[i] || 0)).map((v, i) => v ? { i, v, mh: f.es[i].mh } : null).filter(Boolean);
  if (!dFs.length && !dEs.length && !(txt && txt.trim())) return;
  if (FX.cast && f.es.length > FX.cast.es.length) for (let i = FX.cast.es.length; i < f.es.length; i++) FX.cast.es.push({ n: f.es[i].n, mh: f.es[i].mh, hp: f.es[i].mh, img: null });   /* ajutoare chemate în luptă, apărute după începutul redării */
  FX.q.push({ fs: dFs, es: dEs, txt: txt || '', actor: actor ? (actor.h || !S.fs.includes(actor) ? { side: actor.h !== undefined && S.fs.includes(actor) ? 'fs' : (f.es.includes(actor) ? 'es' : null), i: S.fs.includes(actor) ? S.fs.indexOf(actor) : f.es.indexOf(actor) } : null) : null });
}
/* pentru modul manual: marchează unde începe lovitura curentă, ca să redăm doar cadrele noi */
let FX_MARK = 0, FX_FIRST = false;
function fxBeforeStep() { FX_MARK = FX.q.length; FX_FIRST = typeof C === 'function' && C('w') === 0; }
function fxPlayNew(cb) { const frames = FX.q.slice(FX_MARK); fxPlay(frames, cb, FX_FIRST); }
/* folosit de startD (clic pe un monstru din listă): rulează lupta exact ca autoRun(), apoi o redă */
function fxAutoRun() {
  if (!S.d || !S.d.f) return;
  const first = typeof C === 'function' && C('w') === 0;   /* capturat ÎNAINTE de rezolvare: lupta asta îi schimbă valoarea */
  const q0 = FX.q.length, lg = S.d.f.log;
  for (let g = 0; g < 300 && S.d && S.d.f; g++) step(auto1());
  S.fl = lg.slice(-6);
  fxPlay(FX.q.slice(q0), go, first);
}
const fxWantPlay = first => first || !S.fxInstant;

/* ------------------------------------------------------------------ FEREASTRA DE REDARE */
function fxPlay(frames, cb, first) {
  if (!frames || !frames.length || !fxWantPlay(first) || !FX.cast) { cb(); return; }
  const cast = FX.cast, hp = { fs: cast.fs.map(x => x.hp), es: cast.es.map(x => x.hp) };   /* viața reală de la începutul luptei, salvată în fxCast() */
  FX.playing = true;
  const m = document.createElement('div'); m.id = 'fx-m'; m.setAttribute('role', 'status'); m.setAttribute('aria-live', 'polite');
  const row = (side, x, i) => `<div class="fx-r" data-s="${side}" data-i="${i}"><span class="fx-av">${x.img ? `<img src="${x.img}" alt="">` : av({ n: x.n, c: x.c, ic: x.ic, h: x.h }, 44)}</span><span class="fx-b"><b>${tEsc(x.n)}</b><i class="fx-hp"><i style="width:${Math.round(hp[side][i] / x.mh * 100)}%"></i></i><small>${hp[side][i]}/${x.mh}</small></span></div>`;
  m.innerHTML = `<div class="fx-c"><div class="fx-side">${cast.fs.map((x, i) => row('fs', x, i)).join('')}</div><div class="fx-vs">VS</div><div class="fx-side">${cast.es.map((x, i) => row('es', x, i)).join('')}</div><div class="fx-log" id="fx-log"></div><button class="fx-skip" onclick="fxSkip()">Sari peste ›</button></div>`;
  document.body.appendChild(m);
  let n = 0;
  const finish = () => { FX.playing = false; m.remove(); window.__fxSkip = null; cb(); };
  const showFrame = fr => {
    const log = document.getElementById('fx-log'); if (log) { log.textContent = fr.txt; log.classList.remove('go'); void log.offsetWidth; log.classList.add('go'); }
    let crit = /critic/i.test(fr.txt), ability = /sângerea|ameți|îngheață|arde|otrăv|cheamă|urlă|renaște|scut|vindec|leagă rănile|fulger/i.test(fr.txt);
    for (const side of ['fs', 'es']) for (const d of fr[side]) {
      hp[side][d.i] = Math.max(0, Math.min(cast[side][d.i].mh, hp[side][d.i] + d.v));
      const r = m.querySelector(`.fx-r[data-s="${side}"][data-i="${d.i}"]`); if (!r) continue;
      const bar = r.querySelector('.fx-hp i'), txt = r.querySelector('.fx-b small'), av0 = r.querySelector('.fx-av');
      if (bar) bar.style.width = Math.round(hp[side][d.i] / cast[side][d.i].mh * 100) + '%';
      if (txt) txt.textContent = `${hp[side][d.i]}/${cast[side][d.i].mh}`;
      const num = document.createElement('span'); num.className = 'fx-num ' + (d.v < 0 ? (crit ? 'crit' : 'dmg') : 'heal'); num.textContent = (d.v > 0 ? '+' : '') + d.v; r.appendChild(num);
      setTimeout(() => num.remove(), 1000);
      if (crit && d.v < 0 && av0) { av0.classList.remove('shake'); void av0.offsetWidth; av0.classList.add('shake'); }
      if (hp[side][d.i] <= 0) r.classList.add('down');
    }
    if (ability) { const act = fr.actor; const r = act && act.side ? m.querySelector(`.fx-r[data-s="${act.side}"][data-i="${act.i}"] .fx-av`) : null; if (r) { r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash'); } }
  };
  const step1 = () => {
    if (n >= frames.length) return finish();
    showFrame(frames[n++]);
    window.__fxTimer = setTimeout(step1, FX.delay);
  };
  window.__fxSkip = () => { clearTimeout(window.__fxTimer); while (n < frames.length) showFrame(frames[n++]); setTimeout(finish, 260); };
  setTimeout(step1, 120);
}
function fxSkip() { if (window.__fxSkip) window.__fxSkip(); }
function fxToggleInstant() { S.fxInstant = !S.fxInstant; go(); }

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `#fx-m{position:fixed;inset:0;z-index:24000;display:flex;align-items:center;justify-content:center;padding:14px;background:#05070ae0;backdrop-filter:blur(2px)}
.fx-c{width:100%;max-width:640px;background:#12161a;border:1px solid var(--gold2,#f0d27a);border-radius:14px;padding:16px 16px 54px;box-shadow:0 20px 60px #000a;position:relative}
.fx-side{display:flex;flex-direction:column;gap:8px;margin:6px 0}
.fx-vs{text-align:center;font:700 13px Cinzel,serif;color:var(--gold2,#f0d27a);letter-spacing:.1em;margin:6px 0}
.fx-r{display:flex;align-items:center;gap:10px;position:relative;transition:opacity .3s}.fx-r.down{opacity:.4}
.fx-av{width:44px;height:44px;border-radius:50%;overflow:hidden;flex:none;position:relative;box-shadow:0 0 0 1px #0006}
.fx-av img,.fx-av svg{width:100%;height:100%;object-fit:cover}
.fx-b{flex:1;min-width:0}.fx-b b{display:block;font-size:13.5px}
.fx-hp{display:block;width:100%;height:7px;border-radius:4px;background:#1c2226;overflow:hidden;margin:3px 0 2px}
.fx-hp i{display:block;height:100%;background:linear-gradient(90deg,#4a8f55,#7fd88c);transition:width .45s ease-out}
.fx-r[data-s="es"] .fx-hp i{background:linear-gradient(90deg,#8a3a32,#e8837b)}
.fx-b small{color:var(--mute);font-size:11px}
.fx-num{position:absolute;left:46px;top:-4px;font:700 15px Cinzel,serif;pointer-events:none;animation:fxrise .9s ease-out forwards}
.fx-num.dmg{color:#ff8a7a}.fx-num.crit{color:#ffb347;font-size:20px}.fx-num.heal{color:#8fe3a0}
@keyframes fxrise{0%{opacity:0;transform:translateY(4px) scale(.8)}15%{opacity:1;transform:translateY(-6px) scale(1.15)}100%{opacity:0;transform:translateY(-34px) scale(1)}}
.fx-av.shake{animation:fxshake .4s}@keyframes fxshake{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(2px)}30%,50%,70%{transform:translateX(-4px)}40%,60%{transform:translateX(4px)}}
.fx-av.flash{animation:fxflash .5s}@keyframes fxflash{0%,100%{box-shadow:0 0 0 1px #0006}40%{box-shadow:0 0 0 3px var(--gold2,#f0d27a),0 0 16px var(--gold2,#f0d27a)}}
.fx-log{min-height:34px;margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);font-size:12.5px;color:#cfd3d6;opacity:0}
.fx-log.go{animation:fxlog .35s ease-out forwards}@keyframes fxlog{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
.fx-skip{position:absolute;right:14px;bottom:14px;padding:6px 12px;font-size:12.5px}
@media (prefers-reduced-motion:reduce){.fx-num,.fx-av.shake,.fx-av.flash,.fx-log.go{animation:none}.fx-hp i{transition:none}}`;
  document.head.appendChild(st);
})();
