/* ============================================================================
   Silver Throne — fx-plus.js
   Efecte vizuale în plus pentru redarea luptei (fx.js). NU schimbă nimic din calculul luptei:
   primește doar cadrele deja calculate și le „îmbracă”.
   - atacatorul se avântă spre țintă; ținta primește o tăietură (aurie și mai mare la critic, cu zguduirea ecranului);
   - abilitățile au efectul lor: sângerare, foc, gheață, otravă, amețeală, scut, fulger, vindecare;
   - cine cade se prăbușește, cu un craniu;
   - viteza redării: 1× / 2× / 4× (se ține minte în S.fxSpeed), istoric scurt de lovituri;
   - la final: „Victorie” sau „Înfrângere”, o clipă, înainte de rezultat.
   Respectă „mișcare redusă”: atunci nu se adaugă nicio animație.
   ========================================================================== */
const FXP = { base: 550 };
const fxpReduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const fxpSpeed = () => { const v = typeof S !== 'undefined' && S ? +S.fxSpeed : 1; return v === 2 || v === 4 ? v : 1; };
function fxpApplySpeed() { if (typeof FX !== 'undefined') FX.delay = Math.round(FXP.base / fxpSpeed()); }
function fxpSetSpeed(v, btn) {
  if (typeof S !== 'undefined' && S) S.fxSpeed = v;
  fxpApplySpeed();
  const bar = btn && btn.closest('.fxp-sp');
  if (bar) bar.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === v)));
}

/* comenzile din fereastra luptei: viteza + istoricul */
function fxPlusMount(m) {
  fxpApplySpeed();
  const box = m.querySelector('.fx-c'); if (!box) return;
  const sp = document.createElement('div'); sp.className = 'fxp-sp'; sp.setAttribute('role', 'group'); sp.setAttribute('aria-label', 'Viteza redării');
  sp.innerHTML = [1, 2, 4].map(v => `<button type="button" data-v="${v}" aria-pressed="${fxpSpeed() === v}" onclick="fxpSetSpeed(${v},this)">${v}×</button>`).join('');
  box.appendChild(sp);
  const hist = document.createElement('div'); hist.className = 'fxp-hist'; hist.setAttribute('aria-hidden', 'true');
  const log = box.querySelector('#fx-log'); if (log) log.before(hist);
}

const FXP_ABIL = [
  [/sânger/i, 'bleed'], [/arde|foc|flăc/i, 'burn'], [/îngheț|gheaț/i, 'freeze'], [/otrăv/i, 'poison'],
  [/ameți/i, 'stun'], [/scut/i, 'shield'], [/fulger/i, 'bolt'], [/vindec|leagă rănile|renaște/i, 'heal']
];
function fxpCard(m, side, i) { return m.querySelector(`.fx-r[data-s="${side}"][data-i="${i}"]`); }
function fxpOnce(el, cls, ms) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); }
function fxpAdd(host, html, ms) {
  if (!host) return; const w = document.createElement('div'); w.className = 'fxp-layer'; w.innerHTML = html; host.appendChild(w); setTimeout(() => w.remove(), ms);
}
const FXP_SLASH = (c1, c2, big) => `<svg class="fxp-slash${big ? ' big' : ''}" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="fxpg${big ? 'c' : 'n'}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}" stop-opacity="0"/><stop offset=".5" stop-color="${c2}"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></linearGradient></defs><path d="M12 82 Q50 52 88 14" stroke="url(#fxpg${big ? 'c' : 'n'})" stroke-width="${big ? 9 : 6}" fill="none" stroke-linecap="round"/>${big ? '<path d="M18 30 Q52 48 84 78" stroke="url(#fxpgc)" stroke-width="6" fill="none" stroke-linecap="round"/>' : ''}</svg>`;
const fxpSparks = (n, cls) => Array.from({ length: n }, (_, k) => `<i class="${cls}" style="--a:${Math.round(k * 360 / n + Math.random() * 30)}deg;--d:${(.15 + Math.random() * .25).toFixed(2)}s"></i>`).join('');

function fxPlusFrame(m, fr, info) {
  const txt = fr.txt || '';
  /* istoric: ultimele 3 replici, cele vechi estompate */
  const hist = m.querySelector('.fxp-hist');
  if (hist && txt.trim()) {
    const prev = m.querySelector('#fx-log');
    if (prev && prev.dataset.last) { const l = document.createElement('div'); l.textContent = prev.dataset.last; hist.appendChild(l); while (hist.children.length > 2) hist.firstChild.remove(); }
    if (prev) prev.dataset.last = txt;
  }
  if (fxpReduced()) return;
  const box = m.querySelector('.fx-c');
  const actor = fr.actor && fr.actor.side ? fxpCard(m, fr.actor.side, fr.actor.i) : null;
  const dmg = [], heal = [];
  for (const side of ['fs', 'es']) for (const d of fr[side] || []) (d.v < 0 ? dmg : heal).push([side, d.i]);
  /* avântul atacatorului (modul cu cărți are deja „dash”-ul lui) */
  if (actor && !info.cardMode && dmg.length && !dmg.some(([s, i]) => s === fr.actor.side && i === fr.actor.i)) {
    fxpOnce(actor.querySelector('.fx-av'), fr.actor.side === 'fs' ? 'fxp-lunge-r' : 'fxp-lunge-l', 380);
  }
  const kind = (FXP_ABIL.find(([re]) => re.test(txt)) || [])[1];
  for (const [side, i] of dmg) {
    const r = fxpCard(m, side, i), face = r && r.querySelector('.fx-av'); if (!face) continue;
    fxpAdd(face, (info.crit ? FXP_SLASH('#fff3c4', '#ffd36a', true) : FXP_SLASH('#ffffff', side === 'es' ? '#ffd0c4' : '#ff9b8a', false)) + fxpSparks(info.crit ? 10 : 6, 'fxp-spark'), 600);
    fxpOnce(face, 'fxp-hit', 320);
    if (kind === 'bleed') fxpAdd(face, fxpSparks(7, 'fxp-drop'), 900);
    if (kind === 'burn') fxpAdd(face, '<div class="fxp-burn"></div>', 900);
    if (kind === 'freeze') fxpAdd(face, '<div class="fxp-ice"></div>', 1000);
    if (kind === 'poison') fxpAdd(face, fxpSparks(6, 'fxp-bub'), 1000);
    if (kind === 'stun') fxpAdd(face, '<div class="fxp-stars"><i>✦</i><i>✧</i><i>✦</i></div>', 1100);
    if (kind === 'bolt') fxpAdd(face, '<svg class="fxp-bolt" viewBox="0 0 40 100" aria-hidden="true"><path d="M24 0 L8 52 H20 L12 100 L34 40 H22 Z" fill="#e9f6ff" stroke="#7cc8ff" stroke-width="2"/></svg>', 500);
    /* căzut acum? prăbușire + craniu (o singură dată) */
    if (info.hp[side][i] <= 0 && r && !r.dataset.fxpDown) { r.dataset.fxpDown = '1'; fxpOnce(face, 'fxp-die', 900); fxpAdd(face, '<b class="fxp-skull">☠</b>', 1400); }
  }
  for (const [side, i] of heal) {
    const face = fxpCard(m, side, i)?.querySelector('.fx-av'); if (face) fxpAdd(face, '<div class="fxp-heal-ring"></div>' + fxpSparks(8, 'fxp-leaf'), 1000);
  }
  if (kind === 'shield' && actor) fxpAdd(actor.querySelector('.fx-av'), '<div class="fxp-shield"></div>', 1100);
  if (info.crit && dmg.length && box) { fxpOnce(box, 'fxp-quake', 360); fxpAdd(box, '<div class="fxp-flash"></div>', 260); }
}

/* sfârșitul redării: un banner scurt; întoarce cât să mai stea fereastra deschisă (ms) */
function fxPlusEnd(m, cast, hp, skipped) {
  const box = m && m.querySelector('.fx-c'); if (!box || !cast) return 0;
  const esDown = hp.es.every(v => v <= 0), fsDown = hp.fs.every(v => v <= 0);
  if (!esDown && !fsDown) return 0;
  const win = esDown && !fsDown;
  const b = document.createElement('div'); b.className = 'fxp-end ' + (win ? 'win' : 'lose'); b.setAttribute('role', 'status');
  b.innerHTML = `<span>${win ? '⚔ Victorie' : '☠ Înfrângere'}</span>`;
  box.appendChild(b);
  if (win && !fxpReduced()) fxpAdd(b, fxpSparks(16, 'fxp-gold'), 1400);
  return skipped ? 700 : Math.round(1200 / Math.sqrt(fxpSpeed()));
}

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.fxp-sp{position:absolute;left:14px;bottom:14px;display:flex;gap:4px;z-index:5}
.fxp-sp button{width:auto;min-height:0;padding:5px 10px;font:700 12px Cinzel,serif;border-radius:7px;background:#0b0e10;border:1px solid var(--line);color:var(--mute);box-shadow:none}
.fxp-sp button[aria-pressed="true"]{color:var(--gold2,#f0d27a);border-color:#f0d27a88;background:#2a2312}
.fxp-hist{margin-top:12px;display:flex;flex-direction:column;gap:2px;font-size:12.5px;color:#8b9196;min-height:0}
.fxp-hist div:first-child:not(:last-child){opacity:.55}
.fxp-hist+.fx-log{margin-top:4px}
.fx-av{overflow:visible!important}
.fx-av>img,.fx-av>svg:not(.fxp-slash),.fx-av>.avw{border-radius:inherit}
.fx-r .fx-av{isolation:isolate}
.fxp-layer{position:absolute;inset:0;pointer-events:none;z-index:6}
.fxp-slash{position:absolute;inset:-8%;width:116%;height:116%;animation:fxpSlash .42s ease-out forwards}
.fxp-slash.big{inset:-18%;width:136%;height:136%;filter:drop-shadow(0 0 8px #ffd36a)}
@keyframes fxpSlash{0%{opacity:0;clip-path:inset(0 100% 0 0)}25%{opacity:1}60%{clip-path:inset(0 0 0 0);opacity:1}100%{opacity:0}}
.fxp-spark,.fxp-gold{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px;border-radius:50%;background:#ffd9a0;box-shadow:0 0 6px #ffb347;animation:fxpBurst .5s ease-out var(--d) both}
.fxp-gold{background:#fff1b8;box-shadow:0 0 10px #f0d27a;animation-duration:1.1s}
@keyframes fxpBurst{from{transform:rotate(var(--a)) translateX(0);opacity:1}to{transform:rotate(var(--a)) translateX(calc(var(--fz,96px)*.75));opacity:0}}
.fx-av.fxp-hit{animation:fxpHit .32s ease-out}
@keyframes fxpHit{0%{filter:none}30%{filter:brightness(1.8) saturate(.4)}100%{filter:none}}
.fx-av.fxp-lunge-r{animation:fxpLR .38s cubic-bezier(.3,1.5,.5,1)}.fx-av.fxp-lunge-l{animation:fxpLL .38s cubic-bezier(.3,1.5,.5,1)}
@keyframes fxpLR{40%{translate:34px -6px;rotate:4deg}100%{translate:0 0}}@keyframes fxpLL{40%{translate:-34px -6px;rotate:-4deg}100%{translate:0 0}}
.fx-av.fxp-die{animation:fxpDie .9s ease-in forwards}
@keyframes fxpDie{0%{transform:none}35%{transform:translateY(-6px) rotate(-4deg)}100%{transform:translateY(10px) rotate(8deg) scale(.92)}}
.fxp-skull{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);font-size:calc(var(--fz,96px)*.42);color:#e8e2d0;text-shadow:0 0 12px #000,0 0 4px #000;animation:fxpSkull 1.4s ease-out forwards}
@keyframes fxpSkull{0%{opacity:0;transform:translate(-50%,-30%) scale(.4)}25%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}100%{opacity:0;transform:translate(-50%,-80%) scale(1)}}
.fxp-drop{position:absolute;left:calc(20% + var(--a) / 6);top:30%;width:5px;height:9px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:#c4221a;animation:fxpDrip .9s ease-in var(--d) both}
@keyframes fxpDrip{from{transform:translateY(0);opacity:1}to{transform:translateY(calc(var(--fz,96px)*.6));opacity:0}}
.fxp-burn{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 50% 80%,#ffb34788,#ff5a1f55 40%,transparent 70%);mix-blend-mode:screen;animation:fxpBurn .9s ease-out forwards}
@keyframes fxpBurn{0%{opacity:0;transform:scale(.8)}30%{opacity:1}100%{opacity:0;transform:translateY(-14%) scale(1.15)}}
.fxp-ice{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle,#cfefff66,#7cc8ff44 60%,transparent 72%);box-shadow:inset 0 0 18px #bfe8ff;animation:fxpFade 1s ease-out forwards}
.fxp-bub{position:absolute;left:calc(25% + var(--a) / 8);bottom:15%;width:8px;height:8px;border-radius:50%;border:2px solid #7fd860;background:#7fd86033;animation:fxpRise 1s ease-out var(--d) both}
@keyframes fxpRise{from{transform:translateY(0) scale(.6);opacity:1}to{transform:translateY(calc(var(--fz,96px)*-.7)) scale(1.1);opacity:0}}
.fxp-stars{position:absolute;left:50%;top:-6%;width:70%;height:24%;transform:translateX(-50%);animation:fxpSpin 1.1s linear forwards}
.fxp-stars i{position:absolute;font-style:normal;color:#ffe680;text-shadow:0 0 6px #ffb347;font-size:16px}.fxp-stars i:nth-child(1){left:0;top:30%}.fxp-stars i:nth-child(2){left:45%;top:0}.fxp-stars i:nth-child(3){right:0;top:30%}
@keyframes fxpSpin{0%{opacity:0;transform:translateX(-50%) rotate(0)}20%{opacity:1}100%{opacity:0;transform:translateX(-50%) rotate(300deg)}}
.fxp-bolt{position:absolute;left:30%;top:-30%;width:40%;height:120%;filter:drop-shadow(0 0 10px #7cc8ff);animation:fxpFade .5s steps(3) forwards}
.fxp-heal-ring{position:absolute;inset:-6%;border-radius:50%;border:3px solid #8fe3a0;box-shadow:0 0 18px #8fe3a0aa;animation:fxpRing 1s ease-out forwards}
@keyframes fxpRing{from{transform:scale(.7);opacity:1}to{transform:scale(1.15);opacity:0}}
.fxp-leaf{position:absolute;left:calc(20% + var(--a) / 6);bottom:10%;width:6px;height:6px;border-radius:50%;background:#b8f5c4;box-shadow:0 0 8px #8fe3a0;animation:fxpRise 1s ease-out var(--d) both}
.fxp-shield{position:absolute;inset:-10%;border-radius:50%;border:2px solid #9fd0ff;background:radial-gradient(circle,transparent 55%,#7cc8ff33);box-shadow:0 0 20px #7cc8ff88;animation:fxpRing 1.1s ease-out forwards}
@keyframes fxpFade{0%{opacity:0}20%{opacity:1}100%{opacity:0}}
.fx-c.fxp-quake{animation:fxpQuake .36s}
@keyframes fxpQuake{20%{translate:-5px 2px}40%{translate:5px -2px}60%{translate:-3px 1px}80%{translate:2px 0}}
.fxp-flash{position:absolute;inset:0;border-radius:inherit;background:#fff6d6;opacity:0;animation:fxpFlash .26s ease-out}
@keyframes fxpFlash{30%{opacity:.18}100%{opacity:0}}
.fxp-end{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border-radius:inherit;background:#05070acc;z-index:8;animation:fxpFade2 .3s ease-out}
.fxp-end span{font:700 clamp(30px,6vw,56px) Cinzel,serif;letter-spacing:.08em;animation:fxpBanner .6s cubic-bezier(.2,1.5,.4,1)}
.fxp-end.win span{color:#f6dc8e;text-shadow:0 0 24px #f0d27a99,0 4px 10px #000}
.fxp-end.lose span{color:#e8837b;text-shadow:0 0 20px #a0443c99,0 4px 10px #000}
@keyframes fxpFade2{from{opacity:0}to{opacity:1}}
@keyframes fxpBanner{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
@media (max-width:520px){.fxp-sp{bottom:12px}.fxp-sp button{padding:4px 8px}#fx-m:not(.ac-fx-mode) .fx-r .fx-t{visibility:hidden}#fx-m:not(.ac-fx-mode) .fx-r.front .fx-t{visibility:visible}}
@media (prefers-reduced-motion:reduce){.fxp-layer,.fxp-end span{animation:none!important}}`;
  document.head.appendChild(st);
})();
