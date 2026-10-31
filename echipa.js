/* ============================================================================
   Silver Throne — echipa.js
   1) Pagina Echipă în stil Gladiatus: sus o bandă cu toți luptătorii (portret, viață, echipamentul pe scurt),
      dedesubt, pentru luptătorul selectat: portret și statistici în stânga, echipamentul în dreapta; rucsacul mai jos.
   2) Bara de sus: luptătorii echipei (cu viață, clic → Echipă), resursele și eroul cu inel de experiență.

   Doar afișează. Echiparea, vindecarea și ridicarea căzuților sunt aceleași funcții ale jocului (sel, equip, unequip,
   heal, revive, rn). Stilurile sunt în tema.css. Se încarcă după tema.js.
   ========================================================================== */

const TM_ORD = ['h', 'j', 'w', 'a', 'b', 'r'];                 /* ordinea sloturilor în panou (coif, bijuterie, armă, armură, cizme, relicvă) */
const tmHp = f => { const m = Math.max(1, mhp(f)), v = Number.isFinite(f.hp) ? f.hp : 0; return { hp: Math.max(0, Math.min(m, v)), max: m, p: Math.max(0, Math.min(100, v / m * 100)) }; };

/* ------------------------------------------------------------ banda de luptători */
/* carduri înguste, pe un rând: portret mic, nume, clasă și viață; echipamentul se vede la luptătorul selectat */
function tmCard(f, i) {
  const c = tmHp(f), sel = f === cur(), dead = c.hp <= 0, nfs = S.fs.length;
  const where = f.h ? 'erou' : i < nfs ? '' : (S.gd || []).includes(f) ? 'strajă' : 'rezervă';
  const k = [!f.h && MP[f.c] ? RK[f.rk || 0] : f.rk ? RK[f.rk] : '', tEsc(f.c), where].filter(Boolean).join(' · ');
  return `<button class="tm-c${sel ? ' sel' : ''}${dead ? ' dead' : ''}${where === 'rezervă' || where === 'strajă' ? ' res' : ''}" onclick="sel(${i})" aria-pressed="${sel}" title="${tEsc(f.n)}: ${Math.round(c.hp)}/${c.max} viață"><span class="tm-av">${av(f, 40)}${dead ? '<b class="sk">☠</b>' : ''}</span><span class="tm-tx"><span class="tm-n">${tEsc(f.n)}</span><span class="tm-k">${k}</span><i class="tm-hp${c.p < 40 ? ' low' : ''}"><i style="width:${c.p}%"></i></i></span>${typeof spNeed === 'function' && spNeed(f) ? '<b class="nb" title="Poate primi o specializare">!</b>' : ''}</button>`;
}
function tmStrip() {
  const ro = roster();
  return `<div class="tm-strip" role="group" aria-label="Luptători">${ro.map(tmCard).join('')}</div>`;
}

/* ----------------------------------------------------- luptătorul selectat */
const TM_IMG = { 'Campion': 'campion', 'Arcaș': 'arcasa', 'Paznic': 'paznic' };       /* portrete existente; restul folosesc avatarul */
function tmPortrait(f) {
  const k = f.h ? null : TM_IMG[f.c];
  return `<div class="tm-bigav">${av(f, 110)}</div>`;   /* portretele pictate vin din av() */
}
/* butoanele de skin ale eroului (înainte stăteau sub portretul mare) */
function tmSkin(f) {
  if (!f.h) return '';
  const look = typeof hcEdit === 'function' ? `<button class="${f.ic ? '' : 'p'}" onclick="hcEdit()">${f.ic ? 'Schimbă aspectul' : 'Alege-ți portretul'}</button>` : '';
  return look + tmSkin0(f);
}
function tmSkin0(f) {
  if (skinOn(f)) return `<button onclick="skinView()">Portret mare</button><button onclick="skinSet('clasic')">Skin clasic</button>`;
  return S.prem ? `<button onclick="skinView()">Portret mare</button><button class="p" onclick="skinSet('umbra')">Skin Umbra Runelor</button>` : `<button onclick="skinView()">Skin premium</button>`;
}
const tmDef = f => bon(f).def + tr(f, 'def');
function tmChar(inv) {
  const f = cur(), ro = roster(), i = ro.indexOf(f), c = tmHp(f), b = bon(f), nfs = S.fs.length;
  const extra = [['crit', 'critic', b.crit + tr(f, 'crit')], ['bleed', 'sângerare', b.bleed], ['loot', 'aur în plus', b.loot + tr(f, 'loot')], ['heal', 'vindecare', b.heal]].filter(x => x[2]).map(x => `<span>${x[2]}% ${x[1]}</span>`).join('');
  const reviveCost = Math.round(15 * S.lvl * Math.pow(.96, BL().i)), healCost = Math.round(6 * S.lvl * Math.pow(.96, BL().i));
  const rv = c.hp <= 0 && i < nfs + S.rs.length ? `<button class="d" onclick="${i < nfs ? `revive(${i})` : `revive(${i - nfs},1)`}">Ridică (${reviveCost} aur)</button>` : '';
  const hurt = [...S.fs, ...S.rs].some(x => x.hp > 0 && x.hp < mhp(x));
  const hero = '';   /* numele se schimbă doar din Cont › Nume (mercenari.js) */
  const xp = f.h ? `<div class="tm-xp"><span class="mute">Nivel ${S.lvl} · ${S.xp}/${need(S.lvl)} exp.</span><i class="xpb"><i style="width:${Math.min(100, S.xp / need(S.lvl) * 100)}%"></i></i></div>` : '';
  const sub = `${f.h ? 'erou' : 'nivel ' + S.lvl + ' · ' + RK[f.rk || 0]} · ${tEsc(f.c)}${f.sp && typeof spDef0 === 'function' && spDef0(f) ? ' · ' + spDef0(f).n : ''}${f.sc ? ' · ' + f.sc + ' cicatrice' : ''}${f.t && f.t.length ? '<br>' + f.t.map(x => tEsc(x.n)).join(', ') : ''}`;
  const cd = typeof spCd === 'function' ? spCd(f) : 2;
  let h = `<div class="tm-char"><section class="tm-left"><div class="tm-por">${tmPortrait(f)}</div><h2 class="tm-h">${tEsc(f.n)}</h2><div class="tm-sub mute">${sub}</div>`;
  h += `<div class="tm-hpbar"><span>${c.hp <= 0 ? '☠ căzut' : Math.round(c.hp) + ' / ' + c.max + ' viață'}</span><i class="bar${c.hp <= 0 ? ' e' : ''}"><i style="width:${c.p}%"></i></i></div>`;
  h += `<div class="tm-stats"><div><b>${c.max}</b><span>Viață</span></div><div><b>${Math.round(atkOf(f))}</b><span>Atac</span></div><div><b>${tmDef(f)}</b><span>Apărare</span></div></div>${extra ? `<div class="chips">${extra}</div>` : ''}`;
  h += `<div class="tm-sp"><b>${tEsc(CL[f.c].sp)}</b> <span class="mute">${tEsc(CL[f.c].d)}; se reîncarcă după ${cd} ${cd === 1 ? 'tură' : 'ture'}.</span></div>${typeof spPanel === 'function' ? spPanel(f) : ''}${hero}${xp}<div class="tm-act">${deadAll().length > 1 || (deadAll().length === 1 && c.hp > 0) ? reviveAllBtn() : ''}${rv}${hurt && !S.d ? `<button onclick="heal()">Vindecă răniții · ${healCost} aur</button>` : ''}${tmSkin(f)}</div></section>`;
  h += `<div class="tm-right"><section class="tm-eq"><h2>Echipament · ${tEsc(f.n)}</h2>${vSlots()}</section>${inv || ''}</div></div>`;
  return h;
}
function vEquipTop(inv) { return tmStrip() + tmChar(inv); }

/* ----------------------------------------------------------------- bara de sus */
function hdrSel(i) { S.sel = i; S.tab = 'e'; S.msg = ''; go(); }
function temaHdr() {
  const h = S.fs.find(f => f.h) || S.fs[0], nd = need(S.lvl), xp = Math.max(0, Math.min(1, S.xp / Math.max(1, nd))), R = 25, C = 2 * Math.PI * R;
  const team = S.fs.map((f, i) => { const c = tmHp(f), dead = c.hp <= 0; return `<button class="hm${f === cur() && S.tab === 'e' ? ' on' : ''}${dead ? ' dead' : ''}" onclick="hdrSel(${S.fs.indexOf(f)})" title="${tEsc(f.n)} · ${Math.round(c.hp)}/${c.max} viață${f.h ? ' (erou)' : ''}"><span class="hm-av">${av(f, 36)}${dead ? '<b>☠</b>' : ''}</span><i class="hm-hp${c.p < 40 ? ' low' : ''}"><i style="width:${c.p}%"></i></i></button>`; }).join('');
  return ''   /* echipa nu mai apare în bara de sus: e în meniul și panoul din stânga, și în fila Echipă */
    + `<span class="rc" title="Puncte">${IC.p}<span><b id="pp">${S.pts}/${MXP()}</b><small id="pt">${S.bp > 0 ? 'rezervă +' + S.bp : S.pts < MXP() ? '(+1 în ' + fmt(PT - (Date.now() - S.ptsT)) + ')' : S.pts > MXP() ? 'peste maxim' : 'Puncte'}</small></span></span>`
    + `<span class="rc" title="Aur">${IC.g}<span><b>${S.gold}</b><small>Aur</small></span></span><span class="rc" title="Minereu">${IC.o}<span><b>${S.ore}</b><small>Minereu</small></span></span>`
    + `<button class="hh" onclick="hdrSel(${Math.max(0, S.fs.indexOf(h))})" title="Eroul: nivel ${S.lvl}, ${S.xp}/${nd} experiență"><span class="hh-r"><svg viewBox="0 0 56 56" aria-hidden="true"><circle class="bg" cx="28" cy="28" r="${R}"/><circle class="fg" cx="28" cy="28" r="${R}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - xp)).toFixed(1)}"/></svg><span class="hh-a">${av(h, 40)}</span><b class="hh-l">${S.lvl}</b></span><span class="hh-t"><b>${tEsc(h.n)}</b><small>Nivel ${S.lvl} · ${S.xp}/${nd}</small></span></button>`;
}

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  /* pagina Echipă, compactă: se încarcă după tema.css, deci înlocuiește regulile de acolo pentru aceste elemente */
  st.textContent = `
.tm-strip{gap:8px;padding:2px 2px 8px;margin:0 0 10px}
.tm-c{width:auto;min-width:150px;max-width:200px;flex-direction:row;align-items:center;gap:8px;padding:6px 12px 6px 6px;text-align:left}
.tm-c.sel{transform:none}.tm-c.res{opacity:.82}.tm-c.res.sel{opacity:1}
.tm-c .nb{position:absolute;top:-5px;right:-5px;margin:0}
.tm-tx{display:flex;flex-direction:column;flex:1;min-width:0;gap:1px}
.tm-c .tm-n{font-size:14px}.tm-c .tm-k{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tm-c .tm-hp{height:5px;margin-top:3px}
.tm-add{min-width:140px}.tm-add .tm-plus{font-size:24px;width:40px;text-align:center}
.tm-char{grid-template-columns:minmax(250px,290px) minmax(0,1fr);gap:14px;margin-bottom:14px}
.tm-left{position:sticky;top:72px;max-height:calc(100vh - 84px);overflow-y:auto;display:grid;grid-template-columns:110px minmax(0,1fr);column-gap:12px;align-content:start;text-align:left}
.tm-left>*{grid-column:1/-1}
.tm-left>.tm-por{grid-column:1;grid-row:1/span 3;margin:0;align-self:start}
.tm-left>.tm-h,.tm-left>.tm-sub,.tm-left>.tm-hpbar{grid-column:2}
.tm-left h2.tm-h{text-align:left;font-size:20px;margin:2px 0 0;line-height:1.2;overflow-wrap:anywhere}
.tm-left .tm-sub{font-size:13px;line-height:1.35;margin:2px 0 0}
.tm-left .tm-hpbar{margin:6px 0 0;font-size:13px}.tm-left .tm-hpbar .bar{height:8px}
.tm-bigav{width:110px;height:110px;max-width:none;border-radius:10px}.tm-bigav .avw{transform:none}
.tm-left .tm-stats{margin:10px 0 4px;gap:6px}.tm-left .tm-stats div{padding:6px 2px 5px;border-radius:8px;text-align:center}
.tm-left .tm-stats b{font-size:19px}.tm-left .tm-stats span{font-size:11px}
.tm-left .chips{justify-content:flex-start}
.tm-left .tm-sp{font-size:14px;margin:6px 0 0;line-height:1.35}
.tm-left .tm-nm{margin:8px 0 0}.tm-left .tm-xp{margin:6px 0 0}
.tm-left .tm-act{justify-content:flex-start;margin-top:10px;gap:6px}.tm-left .tm-act button{font-size:13px;padding:5px 10px}
.tm-right{display:flex;flex-direction:column;gap:14px;min-width:0}
.tm-right>section{margin:0}
.tm-right h2{font-size:18px}
.tm-right .slotgrid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0}
.tm-right .slotgrid{align-items:start}.scard.emp .sc-e{display:none}.scard.emp .ic-a{margin-top:6px}
.tm-right .scard{min-height:0;padding:7px 9px;border-radius:8px}
.tm-right .scard .ico{width:32px;height:32px;font-size:17px;margin:0 8px 2px 0;border-radius:6px}
.scard .sc-k{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin-bottom:2px}
.tm-right .scard .ic-n{font-size:14px;line-height:1.3}
.tm-right .scard .chips{margin:3px 0 0}.tm-right .scard .chips span{font-size:12px;padding:0 6px}
.tm-right .scard .ic-a{margin-top:5px;gap:4px}.tm-right .scard .ic-a button{padding:3px 8px;font-size:12.5px}
.scard.emp::before{top:6px;right:8px;font-size:28px}
.scard.emp .sc-e{margin:2px 0 0;font-size:13px}
.tm-right .igrid{grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:6px}
.tm-right .icard{padding:6px 8px}
.tm-right .icard .ic-n{font-size:14px;line-height:1.3}
.tm-right .icard .chips{margin:3px 0 0}.tm-right .icard .chips span{font-size:12px;padding:0 6px}
.tm-right .icard .ic-a{margin-top:5px;gap:4px}.tm-right .icard .ic-a button{padding:3px 8px;font-size:12.5px}
.tm-right .invbar{margin:6px 0;gap:4px}.tm-right .invbar button{padding:3px 8px;font-size:13px}
.tm-right .pager{margin:6px 0}
@media (max-width:1100px){.tm-right .slotgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:860px){.tm-char{grid-template-columns:1fr}.tm-left{position:static;max-height:none;overflow:visible}}
@media (max-width:520px){
  .tm-c{min-width:132px;padding:5px 10px 5px 5px}
  .tm-left{grid-template-columns:84px minmax(0,1fr)}
  .tm-bigav{width:84px;height:84px}
  .tm-left h2.tm-h{font-size:18px}
  .tm-right .slotgrid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .tm-right .igrid{grid-template-columns:1fr}
  .tm-right .invbar{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}.tm-right .invbar>*{flex:none}
  .tm-left .tm-stats div{padding:4px 2px 3px}.tm-left .tm-stats b{font-size:17px}
}
`;
  document.head.appendChild(st);
})();
