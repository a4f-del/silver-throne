/* ============================================================================
   Silver Throne — lupta-vs.js
   Cardul „VS” de la începutul fiecărei lupte: echipa ta (stânga) față în față cu adversarul (dreapta),
   cu Viață, Atac, Apărare și Critic pentru fiecare parte și o estimare a șanselor.
   Apare peste joc fără să blocheze nimic și dispare singur: mare la căpitani, raiduri, Lume și Tron,
   mic la luptele obișnuite din camere. Un clic îl închide; S.vsOff îl oprește (comutatorul e în Coborâre).
   Apelat din startF (index.html), după ce inamicii sunt pregătiți. Se încarcă înaintea scriptului din pagină.
   ========================================================================== */
const VS = { el: null, timer: null };

function vsSide(list, isTeam, enemyDefAvg) {
  const al = list.filter(x => x.hp > 0);
  const hp = al.reduce((s, x) => s + x.hp, 0), mh = al.reduce((s, x) => s + (isTeam ? mhp(x) : x.mh), 0);
  const atk = al.reduce((s, x) => s + (isTeam ? atkOf(x) : x.atk), 0);
  const def = al.length ? al.reduce((s, x) => s + (isTeam ? bon(x).def + tr(x, 'def') : x.def), 0) / al.length : 0;
  const crit = isTeam && al.length ? al.reduce((s, f) => s + 5 + bon(f).crit + tr(f, 'crit') + (f.h ? ST().a * 0.8 : 0) + (typeof spCrit === 'function' ? spCrit(f) : 0), 0) / al.length : 0;
  /* atac efectiv: ce trece de apărarea celeilalte părți, pe fiecare luptător */
  const eff = al.reduce((s, x) => s + Math.max(1, (isTeam ? atkOf(x) : x.atk) - (enemyDefAvg || 0)), 0);
  return { al, hp, mh, atk: Math.round(atk), def: Math.round(def), crit: Math.round(crit), eff };
}
function vsOdds(a, b) {
  const r = (a.hp * a.eff) / Math.max(1, b.hp * b.eff);
  return r > 1.8 ? ['Avantaj clar', 'g2'] : r > 1.15 ? ['Avantaj', 'g1'] : r > 0.85 ? ['Echilibrat', 'n'] : r > 0.5 ? ['Dezavantaj', 'b1'] : ['Foarte periculos', 'b2'];
}
const vsStats = s => `<div class="vs-st"><span><i>❤</i><b>${Math.round(s.hp)}</b><small>/${Math.round(s.mh)} viață</small></span><span><i>⚔</i><b>${s.atk}</b><small>atac</small></span><span><i>🛡</i><b>${s.def}</b><small>apărare</small></span><span><i>✦</i><b>${s.crit}%</b><small>critic</small></span></div>`;
const vsMonster = `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="vs-mg"><stop offset="0" stop-color="#5a2420"/><stop offset="1" stop-color="#1a0c0a"/></radialGradient></defs><circle cx="32" cy="32" r="31" fill="url(#vs-mg)"/><path d="M18 46L30 20M26 48L38 22M34 50L46 24" stroke="#e8837b" stroke-width="4" stroke-linecap="round" opacity=".9"/></svg>`;

function vsFlash() {
  try {
    const d = S.d, f = d && d.f; if (!f || S.vsOff || typeof document === 'undefined') return;
    const es = f.es, boss = es.some(e => e.b), big = boss || d.lume || d.tron || d.raid != null;
    const enDef = es.length ? es.reduce((s, e) => s + e.def, 0) / es.length : 0;
    const me = vsSide(S.fs, true, enDef), en = vsSide(es, false, me.def), [odds, oc] = vsOdds(me, en);
    const hero = S.fs.find(x => x.h) || S.fs[0], mates = me.al.filter(x => x !== hero).slice(0, 3);
    const ctx = d.lume ? 'Atac în Lume' : d.tron ? 'Lupta pentru Tron' : d.raid != null ? (d.lbl || 'Raid') + ': ' + (d.rn || d.bn) : (DG[d.di || 0] || {}).n + (boss ? ' · căpitanul' : ` · camera ${d.room} din ${d.rooms}`);
    /* dreapta: căpitanul cu portret, jucătorul atacat, sau monștri obișnuiți */
    const b = boss && typeof tmnBoss === 'function' ? tmnBoss(es[0].n) : null;
    let por, name;
    if (b) { por = `<span class="vs-por boss" style="--aura:${b[1]}"><img src="imagini/monstri/${b[0]}.jpg" alt=""></span>`; name = es[0].n; }
    else if (d.lume || d.tron) { por = `<span class="vs-por pvp">${d.vsh && typeof av === 'function' ? av({ n: d.bn, c: d.vsh.c || 'Campion', ic: d.vsh.ic }, 84) : vsMonster}</span>`; name = d.bn; }
    else { por = `<span class="vs-por mob">${vsMonster}</span>`; name = es.length > 1 ? es[0].n + ` <small>+${es.length - 1}</small>` : es[0].n; }
    const el = VS.el || (VS.el = Object.assign(document.createElement('div'), { id: 'vs-fl' }));
    if (!el.isConnected) document.body.appendChild(el);
    el.className = big ? 'full' : 'mini'; el.setAttribute('role', 'status');
    el.innerHTML = `<div class="vs-card" onclick="vsHide()" title="Închide"><div class="vs-ctx">${ctx}</div><div class="vs-row">`
      + `<div class="vs-side l"><div class="vs-ph">${av(hero, big ? 84 : 56)}${mates.length ? `<span class="vs-mates">${mates.map(x => av(x, big ? 30 : 22)).join('')}</span>` : ''}</div><div class="vs-nm">${tEsc(hero.n)}${mates.length ? ` <small>+${mates.length}</small>` : ''}</div>${vsStats(me)}</div>`
      + `<div class="vs-mid"><b>VS</b><small class="vs-odds ${oc}">${odds}</small></div>`
      + `<div class="vs-side r"><div class="vs-ph">${por}</div><div class="vs-nm">${name}</div>${vsStats(en)}</div></div></div>`;
    el.classList.remove('out'); void el.offsetWidth; el.classList.add('in');
    clearTimeout(VS.timer); VS.timer = setTimeout(vsHide, big ? 2600 : 1400);
  } catch (e) { /* cardul nu trebuie să oprească lupta */ }
}
function vsHide() { const el = VS.el; if (!el) return; clearTimeout(VS.timer); el.classList.remove('in'); el.classList.add('out'); }
function vsToggle() { S.vsOff = !S.vsOff; S.msg = S.vsOff ? 'Cardurile de luptă sunt oprite.' : 'Cardurile de luptă sunt pornite.'; go(); }

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `
#vs-fl{position:fixed;left:50%;top:max(150px,20%);z-index:20000;transform:translateX(-50%);pointer-events:none;width:min(640px,94vw);opacity:0}
#vs-fl.in{animation:vsIn .35s ease-out forwards}#vs-fl.out{animation:vsOut .4s ease-in forwards}
#vs-fl.mini{top:calc(108px + env(safe-area-inset-top,0px));width:min(480px,92vw)}
#vs-fl.mini .vs-card{pointer-events:none}   /* cel mic nu prinde atingeri: butoanele de dedesubt rămân apăsabile */
@media (min-width:960px){#vs-fl.mini{top:auto;bottom:28px}}
.vs-card{pointer-events:auto;cursor:pointer;padding:10px 14px 14px;border-radius:14px;background:radial-gradient(ellipse at 50% 0,#2a3236f2,#101416f5 70%);border:1px solid var(--gold);box-shadow:0 18px 50px #000d,inset 0 1px 0 #ffffff14}
.vs-ctx{text-align:center;font:700 12px Cinzel,serif;letter-spacing:.08em;color:var(--gold2);text-transform:uppercase;margin-bottom:8px}
.vs-row{display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:center}
.vs-side{display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;min-width:0}
.vs-side.l{animation:vsL .45s ease-out both}.vs-side.r{animation:vsR .45s ease-out both}
.vs-ph{position:relative;display:flex;align-items:flex-end;justify-content:center}
.vs-mates{display:flex;margin-left:-8px}.vs-mates>*{margin-left:-6px;border-radius:50%;box-shadow:0 0 0 2px #101416}
.vs-por{display:block;width:84px;height:84px;border-radius:50%;overflow:hidden;border:2px solid var(--gold)}
.vs-por img,.vs-por svg{width:100%;height:100%;object-fit:cover;display:block}
.vs-por.boss{border-color:var(--gold2);box-shadow:0 0 0 2px #101416,0 0 22px var(--aura)}
.vs-por.mob{border-color:#a0443c}
.vs-nm{font:700 15px Cinzel,Georgia,serif;color:var(--ink);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vs-nm small{color:var(--mute);font-size:12px}
.vs-st{display:grid;grid-template-columns:1fr 1fr;gap:3px 10px;font-size:13px;width:100%}
.vs-st span{display:flex;align-items:baseline;gap:4px;justify-content:center;white-space:nowrap}.vs-st i{font-style:normal;font-size:12px}.vs-st b{color:#fff}.vs-st small{color:var(--mute);font-size:11px}
.vs-mid{display:flex;flex-direction:column;align-items:center;gap:6px}
.vs-mid b{font:900 40px/1 Cinzel,Georgia,serif;background:linear-gradient(180deg,#fff4c2,#f0d27a 45%,#9b7424);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 2px 0 #000) drop-shadow(0 0 12px #f0d27a77);animation:vsSlam .5s cubic-bezier(.2,1.6,.4,1) .15s both}
.vs-odds{font:700 11.5px Cinzel,serif;padding:2px 8px;border-radius:9px;white-space:nowrap;border:1px solid}
.vs-odds.g2{color:#9be0a6;border-color:#4fa35e}.vs-odds.g1{color:#c6e8a0;border-color:#7aa046}.vs-odds.n{color:#f0d27a;border-color:#9b7424}.vs-odds.b1{color:#f0b07b;border-color:#c0703a}.vs-odds.b2{color:#ff8a80;border-color:#d4564f}
#vs-fl.mini .vs-card{padding:7px 10px 9px}#vs-fl.mini .vs-ctx{font-size:10.5px;margin-bottom:4px}
#vs-fl.mini .vs-por{width:56px;height:56px}#vs-fl.mini .vs-mid b{font-size:26px}#vs-fl.mini .vs-nm{font-size:13px}
#vs-fl.mini .vs-st{font-size:11.5px;gap:1px 6px}#vs-fl.mini .vs-st small{display:none}
@keyframes vsIn{from{opacity:0;transform:translate(-50%,-10px) scale(.97)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
@keyframes vsOut{from{opacity:1}to{opacity:0;transform:translate(-50%,-6px)}}
@keyframes vsL{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:none}}
@keyframes vsR{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:none}}
@keyframes vsSlam{from{opacity:0;transform:scale(2.2)}to{opacity:1;transform:scale(1)}}
@media (max-width:520px){.vs-por{width:64px;height:64px}.vs-mid b{font-size:30px}.vs-st{grid-template-columns:1fr;font-size:12px}.vs-st small{display:none}.vs-nm{font-size:13.5px}}
@media (prefers-reduced-motion:reduce){#vs-fl.in,#vs-fl.out,.vs-side.l,.vs-side.r,.vs-mid b{animation:none!important;opacity:1}#vs-fl.out{display:none}}
`;
  document.head.appendChild(st);
})();
