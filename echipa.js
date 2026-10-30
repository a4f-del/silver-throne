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
function tmCard(f, i) {
  const c = tmHp(f), e = E(f), sel = f === cur(), dead = c.hp <= 0, nfs = S.fs.length;
  const pips = TM_ORD.filter(k => SL.includes(k)).map(k => { const it = e[k]; return it ? `<i class="pip ${it.lg ? 'rl' : 'q' + it.r}" title="${tEsc(it.name)} (niv. ${it.l})">${IG[k]}</i>` : `<i class="pip empty" title="${SLN[k]}: gol">${IG[k]}</i>`; }).join('');
  const where = f.h ? 'Erou' : i < nfs ? 'În echipă' : (S.gd || []).includes(f) ? 'Gardian' : 'Rezervă';
  return `<button class="tm-c${sel ? ' sel' : ''}${dead ? ' dead' : ''}" onclick="sel(${i})" aria-pressed="${sel}" title="${tEsc(f.n)}: ${Math.round(c.hp)}/${c.max} viață"><span class="tm-av">${av(f, 54)}${dead ? '<b class="sk">☠</b>' : ''}</span><span class="tm-n">${tEsc(f.n)}</span><span class="tm-k">${f.rk ? RK[f.rk] + ' ' : ''}${tEsc(f.c)}${!f.h && f.lv ? ' · nv ' + f.lv : ''}</span>${spNeed(f) ? '<b class="nb" title="Poate primi o specializare">!</b>' : ''}<i class="tm-hp${c.p < 40 ? ' low' : ''}"><i style="width:${c.p}%"></i></i><span class="tm-pips">${pips}</span><small class="tm-w">${where}</small></button>`;
}
function tmStrip() {
  const ro = roster(), room = S.fs.length + S.rs.length < 8;
  return `<div class="tm-strip" role="group" aria-label="Luptători">${ro.map(tmCard).join('')}${room ? `<button class="tm-c tm-add" onclick="sdGo('a','vil','h')" title="Angajează un mercenar la Han"><span class="tm-plus">＋</span><span class="tm-n">Angajează</span><small class="tm-w">${S.fs.length + S.rs.length}/8 luptători</small></button>` : ''}</div>`;
}

/* ----------------------------------------------------- luptătorul selectat */
const TM_IMG = { 'Campion': 'campion', 'Arcaș': 'arcasa', 'Paznic': 'paznic' };       /* portrete existente; restul folosesc avatarul */
function tmPortrait(f) {
  if (f.h) return portrait(f);
  const k = TM_IMG[f.c];
  return `<div class="tm-bigav">${av(f, 200)}${k ? `<img src="imagini/${k}.jpeg" alt="${tEsc(f.n)}" onerror="this.remove()">` : ''}</div>`;
}
const tmDef = f => bon(f).def + tr(f, 'def');
function tmChar() {
  const f = cur(), ro = roster(), i = ro.indexOf(f), c = tmHp(f), b = bon(f), nfs = S.fs.length;
  const extra = [['crit', 'critic', b.crit + tr(f, 'crit')], ['bleed', 'sângerare', b.bleed], ['loot', 'aur în plus', b.loot + tr(f, 'loot')], ['heal', 'vindecare', b.heal]].filter(x => x[2]).map(x => `<span>${x[2]}% ${x[1]}</span>`).join('');
  const reviveCost = Math.round(15 * S.lvl * Math.pow(.96, BL().i)), healCost = Math.round(6 * S.lvl * Math.pow(.96, BL().i));
  const rv = c.hp <= 0 && i < nfs + S.rs.length ? `<button class="d" onclick="${i < nfs ? `revive(${i})` : `revive(${i - nfs},1)`}">Ridică (${reviveCost} aur)</button>` : '';
  const hurt = [...S.fs, ...S.rs].some(x => x.hp > 0 && x.hp < mhp(x));
  const hero = f.h ? `<div class="tm-nm"><span class="mute">Numele eroului</span><input maxlength="14" value="${tEsc(f.n)}" onchange="rn(this.value)"></div>` : '';
  const xp = f.h ? `<div class="tm-xp"><span class="mute">Nivel ${S.lvl} · ${S.xp}/${need(S.lvl)} exp.</span><i class="xpb"><i style="width:${Math.min(100, S.xp / need(S.lvl) * 100)}%"></i></i></div>` : '';
  let h = `<div class="tm-char"><section class="tm-left"><div class="tm-por">${tmPortrait(f)}</div><h2 class="tm-h">${tEsc(f.n)}</h2><div class="tm-sub mute">${f.h ? 'erou, ' : 'nivel ' + (f.lv || '?') + ', '}${RK[f.rk || 0]} ${tEsc(f.c)}${f.sp && spDef0(f) ? ' · ' + spDef0(f).n : ''}${f.sc ? ', ' + f.sc + ' cicatrice' : ''}${f.t && f.t.length ? '<br>' + f.t.map(x => tEsc(x.n)).join(', ') : ''}</div>`;
  h += `<div class="tm-hpbar"><span>${c.hp <= 0 ? '☠ căzut' : Math.round(c.hp) + ' / ' + c.max + ' viață'}</span><i class="bar${c.hp <= 0 ? ' e' : ''}"><i style="width:${c.p}%"></i></i></div>`;
  h += `<div class="tm-stats"><div><b>${c.max}</b><span>Viață</span></div><div><b>${Math.round(atkOf(f))}</b><span>Atac</span></div><div><b>${tmDef(f)}</b><span>Apărare</span></div></div>${extra ? `<div class="chips">${extra}</div>` : ''}`;
  h += `<div class="tm-sp"><b>${tEsc(CL[f.c].sp)}</b> <span class="mute">${tEsc(CL[f.c].d)}. Se reîncarcă după ${spCd(f)} ${spCd(f) === 1 ? 'tură' : 'ture'}.</span></div>${typeof spPanel === 'function' ? spPanel(f) : ''}${hero}${xp}<div class="tm-act">${rv}${hurt ? `<button onclick="heal()">Vindecă răniții · ${healCost} aur</button>` : ''}</div></section>`;
  h += `<section class="tm-right"><h2>Echipament · ${tEsc(f.n)}</h2>${vSlots()}<div class="mute">Apasă „În rucsac” la un slot ca să vezi doar obiectele potrivite, apoi „Pune pe ${tEsc(f.n)}”.</div></section></div>`;
  return h;
}
function vEquipTop() { return tmStrip() + tmChar(); }

/* ----------------------------------------------------------------- bara de sus */
function hdrSel(i) { S.sel = i; S.tab = 'e'; S.msg = ''; go(); }
function temaHdr() {
  const h = S.fs.find(f => f.h) || S.fs[0], nd = need(S.lvl), xp = Math.max(0, Math.min(1, S.xp / Math.max(1, nd))), R = 25, C = 2 * Math.PI * R;
  const team = S.fs.map((f, i) => { const c = tmHp(f), dead = c.hp <= 0; return `<button class="hm${f === cur() && S.tab === 'e' ? ' on' : ''}${dead ? ' dead' : ''}" onclick="hdrSel(${S.fs.indexOf(f)})" title="${tEsc(f.n)} · ${Math.round(c.hp)}/${c.max} viață${f.h ? ' (erou)' : ''}"><span class="hm-av">${av(f, 36)}${dead ? '<b>☠</b>' : ''}</span><i class="hm-hp${c.p < 40 ? ' low' : ''}"><i style="width:${c.p}%"></i></i></button>`; }).join('');
  return `<span class="hm-team" aria-label="Echipa">${team}</span>`
    + `<span class="rc" title="Puncte">${IC.p}<span><b id="pp">${S.pts}/${MXP()}</b><small id="pt">${S.pts < MXP() ? '(+1 în ' + fmt(PT - (Date.now() - S.ptsT)) + ')' : 'Puncte'}</small></span></span>`
    + `<span class="rc" title="Aur">${IC.g}<span><b>${S.gold}</b><small>Aur</small></span></span><span class="rc" title="Minereu">${IC.o}<span><b>${S.ore}</b><small>Minereu</small></span></span>`
    + `<button class="hh" onclick="hdrSel(${Math.max(0, S.fs.indexOf(h))})" title="Eroul: nivel ${S.lvl}, ${S.xp}/${nd} experiență"><span class="hh-r"><svg viewBox="0 0 56 56" aria-hidden="true"><circle class="bg" cx="28" cy="28" r="${R}"/><circle class="fg" cx="28" cy="28" r="${R}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - xp)).toFixed(1)}"/></svg><span class="hh-a">${av(h, 40)}</span><b class="hh-l">${S.lvl}</b></span><span class="hh-t"><b>${tEsc(h.n)}</b><small>Nivel ${S.lvl} · ${S.xp}/${nd}</small></span></button>`;
}
