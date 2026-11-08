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
  const esIcon = e => { if (e.b) { const b = typeof tmnBoss === 'function' ? tmnBoss(d.bn) : null; if(b)return `imagini/monstri/${b[0]}.jpg`; if(d.tw&&ST_SERVER==='beta'&&typeof twMob==='function'&&typeof monImg==='function')return monImg(twMob(d.room)); return null; } return typeof monImg === 'function' ? monImg(e.n) : null; };
  /* viața REALĂ de la începutul acestei lupte (echipa poate intra deja rănită, fără vindecare între monștri) */
  FX.cast = {
    adventure: typeof ST_SERVER!=='undefined'&&ST_SERVER==='beta'&&!!(d.one||d.tw||d.lume||d.tron),
    pvp: typeof ST_SERVER!=='undefined'&&ST_SERVER==='beta'&&!!(d.lume||d.tron),
    adventureTitle: d.lume?'Atac în Lume · '+(d.bn||'Satul adversarului'):d.tron?'Duel pentru Tron · '+(d.bn||'Apărarea Tronului'):d.tw?'Turnul · Etajul '+Math.max(1,d.room):(DG[d.di||0]||{}).n||'Temniță',
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
  /* Același identificator de actor pentru erou, mercenari și fantome PvP.
     În vechea expresie mercenarii fără actor.h pierdeau animația de atac. */
  const fi=actor?S.fs.indexOf(actor):-1,ei=actor?f.es.indexOf(actor):-1;
  const tagged=typeof ST_SERVER!=='undefined'&&ST_SERVER==='beta'
    ? (fi>=0?{side:'fs',i:fi}:ei>=0?{side:'es',i:ei}:null)
    : (actor ? (actor.h || !S.fs.includes(actor) ? { side: actor.h !== undefined && S.fs.includes(actor) ? 'fs' : (f.es.includes(actor) ? 'es' : null), i: S.fs.includes(actor) ? S.fs.indexOf(actor) : f.es.indexOf(actor) } : null) : null);
  FX.q.push({ fs:dFs, es:dEs, txt:txt||'', actor:tagged });
}
/* pentru modul manual: marchează unde începe lovitura curentă, ca să redăm doar cadrele noi */
let FX_MARK = 0, FX_FIRST = false;
function fxBeforeStep() { FX_MARK = FX.q.length; FX_FIRST = typeof C === 'function' && C('w') === 0; }
function fxPlayNew(cb) { const frames = FX.q.slice(FX_MARK); fxPlay(frames, cb, FX_FIRST, FX_MARK); }
/* folosit de startD (clic pe un monstru din listă): rulează lupta exact ca autoRun(), apoi o redă */
function fxAutoRun() {
  if (!S.d || !S.d.f) return;
  const first = typeof C === 'function' && C('w') === 0;   /* capturat ÎNAINTE de rezolvare: lupta asta îi schimbă valoarea */
  const q0 = FX.q.length, lg = S.d.f.log;
  for (let g = 0; g < 300 && S.d && S.d.f; g++) step(auto1());
  S.fl = lg.slice(-6);
  fxPlay(FX.q.slice(q0), go, first, q0);
}
/* BETA: preferința de accesibilitate are prioritate chiar față de prima luptă. */
const fxWantPlay = first => {
 if(typeof ST_SERVER!=='undefined'&&ST_SERVER==='beta'&&
    typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)return false;
 return first||!S.fxInstant;
};

/* ------------------------------------------------------------------ FEREASTRA DE REDARE */
/* Portrete mari, unul în spatele celuilalt (primul din față); bara de viață stă sub fiecare portret.
   Cel care atacă sau e lovit „vine în față” (se mărește și urcă deasupra celorlalți) pe durata loviturii. */
const FX_OV = 0.38;   /* cât din portret acoperă vecinul din spate */
function fxStartHp(cast, offset) {
  const hp={fs:cast.fs.map(x=>x.hp),es:cast.es.map(x=>x.hp)};
  /* Redări succesive în BETA: reconstruim HP din cadrele deja executate,
     ca manual → automat să nu afișeze viața de la începutul luptei. */
  if(typeof ST_SERVER!=='undefined'&&ST_SERVER==='beta'&&cast.adventure&&offset>0){
    for(const fr of FX.q.slice(0,offset)) for(const side of ['fs','es']) for(const d of fr[side]||[]){
      if(hp[side][d.i]==null||!cast[side][d.i])continue;
      hp[side][d.i]=Math.max(0,Math.min(cast[side][d.i].mh,hp[side][d.i]+d.v));
    }
  }
  return hp;
}
function fxPlay(frames, cb, first, offset) {
  if (!frames || !frames.length || !fxWantPlay(first) || !FX.cast) { cb(); return; }
  const cast = FX.cast, hp = fxStartHp(cast, offset || 0);
  FX.playing = true;
  const previousFocus=typeof document!=='undefined'?document.activeElement:null;
  const m = document.createElement('div'); m.id = 'fx-m'; m.setAttribute('role', 'status'); m.setAttribute('aria-live', 'polite');
  /* mărimea portretelor: cât încape pe lățime (ambele grămezi + „VS”), cu plafon pe înălțime */
  const stackW = n => 1 + Math.max(0, n - 1) * (1 - FX_OV), avail = Math.min(innerWidth, 940) - 28 - 56 - 56;
  const FZ = Math.round(Math.max(48, Math.min(176, innerHeight * 0.34, avail / (stackW(cast.fs.length) + stackW(cast.es.length)))));
  m.style.setProperty('--fz', FZ + 'px');
  const stack = (side, list) => `<div class="fx-side" data-s="${side}">${list.map((x, i) => {
    const w = i === list.length - 1 ? FZ : Math.round(FZ * (1 - FX_OV));   /* coloana ultimului portret e întreagă, celelalte arată doar partea vizibilă */
    return `<div class="fx-r" data-s="${side}" data-i="${i}" style="width:${w}px;z-index:${20 - i}"><span class="fx-nm">${tEsc(x.n)}</span><span class="fx-av">${x.img ? `<img src="${x.img}" alt="">` : av({ n: x.n, c: x.c, ic: x.ic, h: x.h }, FZ)}</span><i class="fx-hp"><i style="width:${Math.round(hp[side][i] / x.mh * 100)}%"></i></i><small class="fx-t">${hp[side][i]}/${x.mh}</small></div>`;
  }).join('')}</div>`;
  const cardMode=!!cast.adventure&&typeof acFxMarkup==='function';
  if(cardMode){
    m.classList.add('ac-fx-mode');
    m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');
    m.setAttribute('aria-label','Redarea luptei');m.removeAttribute('aria-live');
  }
  m.innerHTML=cardMode?acFxMarkup(cast,hp):`<div class="fx-c"><div class="fx-row">${stack('fs', cast.fs)}<div class="fx-vs">VS</div>${stack('es', cast.es)}</div><div class="fx-log" id="fx-log"></div><button class="fx-skip" onclick="fxSkip()">Sari peste ›</button></div>`;
  document.body.appendChild(m);
  if(cardMode){const skip=m.querySelector('.fx-skip');if(skip&&typeof skip.focus==='function')skip.focus();}
  let n = 0, frontT = null, ending=false, finished=false;
  const finish = () => {
    if(finished)return;finished=true;FX.playing = false;
    clearTimeout(frontT);clearTimeout(window.__fxTimer);m.remove();window.__fxSkip = null;
    if(cardMode&&previousFocus&&previousFocus.isConnected&&typeof previousFocus.focus==='function')previousFocus.focus();
    cb();
  };
  const front = (list, ms) => {   /* aduce în față luptătorii din listă [[side, i], ...] */
    m.querySelectorAll('.fx-r.front').forEach(r => r.classList.remove('front'));
    list.forEach(([sd, i]) => { const r = m.querySelector(`.fx-r[data-s="${sd}"][data-i="${i}"]`); if (r) r.classList.add('front'); });
    clearTimeout(frontT); frontT = setTimeout(() => m.querySelectorAll('.fx-r.front').forEach(r => r.classList.remove('front')), ms);
  };
  const showFrame = fr => {
    const log = document.getElementById('fx-log'); if (log) { log.textContent = fr.txt; log.classList.remove('go'); void log.offsetWidth; log.classList.add('go'); }
    let crit = /critic/i.test(fr.txt), ability = /sângerea|ameți|îngheață|arde|otrăv|cheamă|urlă|renaște|scut|vindec|leagă rănile|fulger/i.test(fr.txt);
    const act = fr.actor && fr.actor.side ? [[fr.actor.side, fr.actor.i]] : [];
    front([...act, ...['fs', 'es'].flatMap(sd => fr[sd].map(d => [sd, d.i]))], Math.max(350, FX.delay - 80));
    if(cardMode&&typeof acFxAnimate==='function')acFxAnimate(m,fr);
    for (const side of ['fs', 'es']) for (const d of fr[side]) {
      hp[side][d.i] = Math.max(0, Math.min(cast[side][d.i].mh, hp[side][d.i] + d.v));
      const r = m.querySelector(`.fx-r[data-s="${side}"][data-i="${d.i}"]`); if (!r) continue;
      const bar = r.querySelector('.fx-hp i'), txt = r.querySelector('.fx-t'), av0 = r.querySelector('.fx-av');
      if (bar) bar.style.width = Math.round(hp[side][d.i] / cast[side][d.i].mh * 100) + '%';
      if (txt) txt.textContent = `${hp[side][d.i]}/${cast[side][d.i].mh}`;
      const num = document.createElement('span'); num.className = 'fx-num ' + (d.v < 0 ? (crit ? 'crit' : 'dmg') : 'heal'); num.textContent = (d.v > 0 ? '+' : '') + d.v; r.appendChild(num);
      setTimeout(() => num.remove(), 1000);
      if (crit && d.v < 0 && av0) { av0.classList.remove('shake'); void av0.offsetWidth; av0.classList.add('shake'); }
      if (hp[side][d.i] <= 0) r.classList.add('down');
    }
    if (ability) { const r = act.length ? m.querySelector(`.fx-r[data-s="${act[0][0]}"][data-i="${act[0][1]}"] .fx-av`) : null; if (r) { r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash'); } }
  };
  const step1 = () => {
    if(ending||finished)return;
    if (n >= frames.length) return finish();
    showFrame(frames[n++]);
    window.__fxTimer = setTimeout(step1, FX.delay);
  };
  window.__fxSkip = () => {
    if(ending||finished)return;ending=true;
    clearTimeout(window.__fxTimer);
    while(n<frames.length)showFrame(frames[n++]);
    setTimeout(finish,260);
  };
  if(cardMode&&typeof m.addEventListener==='function')m.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();window.__fxSkip?.();}
  });
  setTimeout(step1,120);
}
function fxSkip() { if (window.__fxSkip) window.__fxSkip(); }
function fxToggleInstant() { S.fxInstant = !S.fxInstant; go(); }

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `#fx-m{position:fixed;inset:0;z-index:24000;display:flex;align-items:center;justify-content:center;padding:14px;background:#05070ae0;backdrop-filter:blur(2px)}
.fx-c{width:100%;max-width:940px;max-height:100%;overflow:visible;background:#12161a;border:1px solid var(--gold2,#f0d27a);border-radius:14px;padding:68px 28px 58px;box-shadow:0 20px 60px #000a;position:relative}
.fx-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.fx-side{display:flex;align-items:flex-start;min-width:0}.fx-side[data-s="es"]{flex-direction:row-reverse}
.fx-vs{align-self:center;text-align:center;font:700 clamp(16px,4vw,26px) Cinzel,serif;color:var(--gold2,#f0d27a);letter-spacing:.1em;flex:none;margin-top:calc(var(--fz,96px) * -.2)}
.fx-r{position:relative;display:flex;flex-direction:column;align-items:flex-start;flex:none;transition:opacity .3s}
.fx-side[data-s="es"] .fx-r{align-items:flex-end}
.fx-r.down{opacity:.45}.fx-r.down .fx-av{filter:grayscale(1) brightness(.6)}
.fx-av{width:var(--fz,96px);height:var(--fz,96px);border-radius:50%;overflow:hidden;flex:none;position:relative;box-shadow:0 0 0 3px var(--gold,#c9a24b),0 6px 18px #000a;transition:transform .25s cubic-bezier(.2,1.4,.4,1),box-shadow .25s;transform-origin:50% 100%}
.fx-r[data-s="es"] .fx-av{box-shadow:0 0 0 3px #a0443c,0 6px 18px #000a}
.fx-r.front .fx-av{transform:translateY(-12px) scale(1.14);box-shadow:0 0 0 3px var(--gold2,#f0d27a),0 0 26px #f0d27a99,0 10px 24px #000c}
.fx-r.front[data-s="es"] .fx-av{box-shadow:0 0 0 3px #e8837b,0 0 26px #e8837b88,0 10px 24px #000c}
.fx-av img,.fx-av svg,.fx-av .avw{width:100%!important;height:100%!important;object-fit:cover;display:block}
.fx-nm{position:absolute;top:calc(var(--fz,96px) * -.3 - 14px);left:0;right:auto;white-space:nowrap;font:700 14px Cinzel,serif;color:var(--ink,#eee);text-shadow:0 1px 3px #000;opacity:0;transition:opacity .2s;pointer-events:none}
.fx-side[data-s="es"] .fx-nm{left:auto;right:0}.fx-r.front .fx-nm{opacity:1}
.fx-hp{display:block;width:100%;height:9px;border-radius:5px;background:#1c2226;overflow:hidden;margin:9px 0 3px;border:1px solid #000a}
.fx-hp i{display:block;height:100%;background:linear-gradient(90deg,#4a8f55,#7fd88c);transition:width .45s ease-out}
.fx-r[data-s="es"] .fx-hp i{background:linear-gradient(90deg,#8a3a32,#e8837b)}
.fx-t{color:var(--mute);font-size:12.5px;white-space:nowrap}
.fx-num{position:absolute;top:calc(var(--fz,96px) * .25);left:6px;font:700 22px Cinzel,serif;text-shadow:0 2px 4px #000;pointer-events:none;animation:fxrise .9s ease-out forwards;z-index:30}
.fx-side[data-s="es"] .fx-num{left:auto;right:6px}
.fx-num.dmg{color:#ff8a7a}.fx-num.crit{color:#ffb347;font-size:30px}.fx-num.heal{color:#8fe3a0}
@keyframes fxrise{0%{opacity:0;transform:translateY(4px) scale(.8)}15%{opacity:1;transform:translateY(-8px) scale(1.15)}100%{opacity:0;transform:translateY(-40px) scale(1)}}
.fx-av.shake{animation:fxshake .4s}@keyframes fxshake{10%,90%{translate:-1px}20%,80%{translate:2px}30%,50%,70%{translate:-4px}40%,60%{translate:4px}}
.fx-av.flash{animation:fxflash .5s}@keyframes fxflash{0%,100%{filter:none}40%{filter:brightness(1.5) drop-shadow(0 0 12px var(--gold2,#f0d27a))}}
.fx-log{min-height:38px;margin-top:14px;padding-top:10px;border-top:1px dashed var(--line);font-size:14.5px;color:#cfd3d6;opacity:0}
.fx-log.go{animation:fxlog .35s ease-out forwards}@keyframes fxlog{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
.fx-skip{position:absolute;right:14px;bottom:14px;padding:6px 12px;font-size:12.5px}
@media (prefers-reduced-motion:reduce){.fx-num,.fx-av.shake,.fx-av.flash,.fx-log.go{animation:none}.fx-hp i,.fx-av{transition:none}}`;
  document.head.appendChild(st);
})();
