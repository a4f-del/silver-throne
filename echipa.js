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
/* rolul clasei, pentru cardul mare: Tank / DPS / Suport */
const ROLE = { Paznic: 'Tank', Războinic: 'DPS', Arcaș: 'DPS', Mag: 'DPS', Vraci: 'Suport', Campion: 'DPS' };
const roleOf = f => ROLE[f.h ? 'Campion' : f.c] || 'DPS';
/* un sfat scurt despre echipament, legat de rol */
function tmRoleTip(f) {
  const w = E(f).w, ideal = typeof WFC !== 'undefined' ? WFC[f.h ? 'Campion' : f.c] : null;
  if (!w) return 'Fără armă echipată.';
  if (ideal && typeof wfOf === 'function' && wfOf(w) !== ideal) return `Arma potrivită pentru acest rol: ${WF[ideal].n}.`;
  if (!E(f).a) return 'Fără armură echipată.';
  return 'Bine echipat pentru rolul lui.';
}
/* cardul mare, pentru cei trei (sau patru) din echipa activă: portret, rol, viață, rang, specializare, echipament, sfat */
function tmBigCard(f, i) {
  const sel = f === cur(), c = tmHp(f), dead = c.hp <= 0, src = tmFullSrc(f), role = roleOf(f);
  const rank = f.h ? '' : RK[f.rk || 0], spec = f.sp && typeof spDef0 === 'function' && spDef0(f) ? spDef0(f).n : '';
  const eq = SL.map(k => { const it = E(f)[k]; return `<span class="tm-eqi${it ? '' : ' em'}" title="${it ? tEsc(it.name) : SLN[k] + ': gol'}">${it ? iic(it) : UI(UISL[k])}</span>`; }).join('');
  return `<button class="tm-big${sel ? ' sel' : ''}${dead ? ' dead' : ''}" onclick="sel(${i})" ondblclick="if(typeof prOpen==='function')prOpen(${i})" title="${tEsc(f.n)} · ${tmRoleTip(f)} Dublu clic: profilul" aria-pressed="${sel}">`
    + `<span class="tm-big-role r-${role}">${role}</span>`
    + `<span class="tm-big-av">${src ? `<img src="${src}" alt="" onerror="this.style.display='none'">` : av(f, 96)}${dead ? '<b class="sk">☠</b>' : ''}</span>`
    + `<span class="tm-big-n">${tEsc(f.n)}</span><span class="tm-big-k mute">${[rank, spec].filter(Boolean).join(' · ') || tEsc(f.c)}</span>`
    + `<span class="tm-big-hp${c.p < 40 ? ' low' : ''}"><i style="width:${c.p}%"></i></span><span class="tm-big-hpn mute">${Math.round(c.hp)}/${c.max} viață</span>`
    + `<span class="tm-big-eq">${eq}</span><span class="tm-big-tip">${tmRoleTip(f)}</span></button>`;
}
/* sus: doar cardurile mari ale echipei active; rezerva stă ascunsă după un buton-scurtătură care deschide panoul de schimb */
let tmRO = false, tmRP = -1;   /* panoul rezervei deschis? / indexul (în S.rs) al celui ales pentru schimb */
function tmResT() { tmRO = !tmRO; tmRP = -1; go(); }
function tmResP(j) { tmRP = tmRP === j ? -1 : j; go(); }
function tmResSwap(ri, ti) { tmRO = false; tmRP = -1; S.sel = ti; swapTeam(ri, ti); }
function tmResIn(ri) { tmRO = false; tmRP = -1; S.sel = S.fs.length; toParty(ri); }
function tmResView(i) { tmRO = false; tmRP = -1; sel(i); }
const tmBusy = f => typeof mxBusy === 'function' && mxBusy(f);
/* butonul-scurtătură: avatarele mici ale celor din rezervă, numărul lor și un semn dacă cineva are nevoie de atenție */
function tmResBtn(rest) {
  const nfs = S.fs.length, curIn = S.sel >= nfs && rest.includes(cur());
  const alert = rest.some(f => (typeof mxDone === 'function' && !f.h && mxDone(f)) || (typeof spNeed === 'function' && spNeed(f)));
  const avs = rest.slice(0, 4).map(f => `<span class="tm-rb-a${f.hp <= 0 ? ' dead' : ''}">${av(f, 28)}</span>`).join('');
  return `<button class="tm-rb${tmRO ? ' on' : ''}${curIn ? ' cur' : ''}" onclick="tmResT()" aria-expanded="${tmRO}" title="Vezi rezerva și schimbă luptătorii">`
    + `<span class="tm-rb-s">${avs}</span><span class="tm-rb-t"><b>⇄ Rezervă · ${rest.length}</b><small>${curIn ? 'vezi acum: ' + tEsc(cur().n) : 'apasă ca să schimbi pe cineva'}</small></span>`
    + `${alert ? '<b class="nb">!</b>' : ''}<span class="tm-rb-ch">${tmRO ? '▴' : '▾'}</span></button>`;
}
/* panoul rezervei: alegi pe cineva din rezervă, apoi pe cine înlocuiește din echipă */
function tmResPanel() {
  const nfs = S.fs.length, rs = S.rs, gd = S.gd || [], room = S.fs.length < TMAX();
  if (tmRP >= rs.length) tmRP = -1;
  const card = (f, i, j, guard) => {
    const c = tmHp(f), dead = c.hp <= 0, busy = !guard && tmBusy(f), pick = !guard && tmRP === j;
    const st = guard ? 'strajă · păzește satul' : busy ? (typeof mxDone === 'function' && mxDone(f) ? 's-a întors din expediție' : 'plecat în expediție') : dead ? '☠ căzut' : `${Math.round(c.hp)}/${c.max} viață`;
    let act = '';
    if (!guard && !busy && !S.d) act = room ? `<button class="p" onclick="tmResIn(${j})">Pune în echipă</button>` : `<button class="${pick ? 'p' : ''}" onclick="tmResP(${j})" aria-pressed="${pick}">${pick ? 'Anulează' : '⇄ Schimbă'}</button>`;
    act += typeof prBtn === 'function' ? `<button onclick="tmRO=false;tmRP=-1;prOpen(${i})">Profil</button>` : `<button onclick="tmResView(${i})">Echipament</button>`;
    return `<div class="tm-rp-c${pick ? ' on' : ''}${dead ? ' dead' : ''}${busy || guard ? ' off' : ''}"><span class="tm-rp-av">${av(f, 44)}</span>`
      + `<span class="tm-rp-tx"><b>${tEsc(f.n)}</b><small>${[!f.h && f.c !== 'Gardian' ? RK[f.rk || 0] : '', tEsc(f.c), roleOf(f)].filter(Boolean).join(' · ')}</small>`
      + `<i class="tm-hp${c.p < 40 ? ' low' : ''}"><i style="width:${c.p}%"></i></i><small class="mute">${st}</small></span><span class="tm-rp-x">${act}</span></div>`;
  };
  let h = `<div class="tm-rp" role="region" aria-label="Rezervă">`;
  if (S.d) h += `<div class="mute tm-rp-n">Nu poți schimba echipa în timpul coborârii.</div>`;
  h += `<div class="tm-rp-l">${rs.map((f, j) => card(f, nfs + j, j, false)).join('')}${gd.map((f, k) => card(f, nfs + rs.length + k, -1, true)).join('')}</div>`;
  if (tmRP >= 0 && rs[tmRP]) {
    const a = rs[tmRP], tg = S.fs.map((x, i) => [x, i]).filter(([x]) => !x.h);
    h += `<div class="tm-rp-sw"><div class="tm-rp-q">Pune pe <b>${tEsc(a.n)}</b> (${tEsc(a.c)}) în locul lui:</div><div class="tm-rp-tg">`
      + tg.map(([x, i]) => { const c = tmHp(x); return `<button onclick="tmResSwap(${tmRP},${i})"><span class="tm-rp-av">${av(x, 36)}</span><span class="tm-rp-tx"><b>${tEsc(x.n)}</b><small>${tEsc(x.c)} · ${roleOf(x)} · ${Math.round(c.hp)}/${c.max}</small></span></button>`; }).join('')
      + `</div></div>`;
  }
  return h + `</div>`;
}
function tmStrip() {
  const ro = roster(), nfs = S.fs.length, rest = ro.slice(nfs);
  const squad = `<div class="tm-squad" role="group" aria-label="Echipa activă">${ro.slice(0, nfs).map((f, i) => tmBigCard(f, i)).join('')}</div>`;
  if (!rest.length) { tmRO = false; return `<div class="tm-top">${squad}</div>`; }
  return `<div class="tm-top">${squad}<div class="tm-res">${tmResBtn(rest)}${tmRO ? tmResPanel() : ''}</div></div>`;
}

/* ----------------------------------------------------- luptătorul selectat */
const TM_IMG = { 'Campion': 'campion', 'Arcaș': 'arcasa', 'Paznic': 'paznic' };       /* portrete existente; restul folosesc avatarul */
function tmPortrait(f) {
  const k = f.h ? null : TM_IMG[f.c];
  return `<div class="tm-bigav">${av(f, 110)}</div>`;   /* portretele pictate vin din av() */
}
/* portretul întreg al luptătorului ales (eroul: portretul ales sau skinul; mercenarii: portretul clasei) */
function tmFullSrc(f) {
  if (f.h) { if (typeof skinOn === 'function' && skinOn(f) && typeof HS !== 'undefined') return HS.umbra.av; return typeof heroId === 'function' && f.ic ? `imagini/eroi/${heroId(f.ic)}.jpg` : null; }
  return typeof MPIC !== 'undefined' && MPIC[f.c] ? (typeof mpic === 'function' ? mpic(f) : `imagini/mercenari/${MPIC[f.c]}.jpg`) : null;
}
function tmFull(f, sub, i) {
  const src = tmFullSrc(f);
  return `<div class="tm-full${f.hp <= 0 ? ' dead' : ''}">${typeof prBtn === 'function' && i >= 0 ? prBtn(i) : ''}${src ? `<img src="${src}" alt="${tEsc(f.n)}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'tm-full-av'}))">` : `<div class="tm-full-av">${av(f, 140)}</div>`}`
    + `<div class="tm-full-tx"><h2 class="tm-h">${tEsc(f.n)}</h2><div class="tm-sub">${sub}</div></div></div>`;
}
/* butoanele de skin ale eroului (înainte stăteau sub portretul mare) */
function tmSkin(f) {
  if (!f.h) return tmMSkin(f);
  const look = typeof hcEdit === 'function' ? `<button class="${f.ic ? '' : 'p'}" onclick="hcEdit()">${f.ic ? 'Schimbă aspectul' : 'Alege-ți portretul'}</button>` : '';
  return look + tmSkin0(f);
}
function tmSkin0(f) {
  if (skinOn(f)) return `<button onclick="skinView()">Portret mare</button><button onclick="skinSet('clasic')">Skin clasic</button>`;
  return S.prem || (typeof rnOwn === 'function' && rnOwn('umbra')) ? `<button onclick="skinView()">Portret mare</button><button class="p" onclick="skinSet('umbra')">Skin Umbra Runelor</button>` : `<button onclick="skinView()">Skin premium</button>`;
}
/* skinul premium al mercenarului: comutare (Premium) sau previzualizare */
function tmMSkin(f) {
  if (typeof MSK === 'undefined' || !MSK[f.c]) return '';
  const c = f.c.replace(/'/g, "\\'");
  if (mskOn(f)) return `<button onclick="mskView('${c}')">Portret premium</button><button onclick="mskSet('${c}','clasic')">Skin clasic</button>`;
  return S.prem || (typeof rnOwn === 'function' && rnOwn(f.c)) ? `<button class="p" onclick="mskSet('${c}','p')">Skin ${MSK[f.c]}</button>` : `<button onclick="mskView('${c}')">Skin premium</button>`;
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
  let h = `<div class="tm-char"><section class="tm-left tm-left2">${tmFull(f, sub, i)}`;
  h += `<div class="tm-hpbar"><span>${c.hp <= 0 ? '☠ căzut' : Math.round(c.hp) + ' / ' + c.max + ' viață'}</span><i class="bar${c.hp <= 0 ? ' e' : ''}"><i style="width:${c.p}%"></i></i></div>`;
  h += `<div class="tm-stats"><div><b>${c.max}</b><span>Viață</span></div><div><b>${Math.round(atkOf(f))}</b><span>Atac</span></div><div><b>${tmDef(f)}</b><span>Apărare</span></div></div>${extra ? `<div class="chips">${extra}</div>` : ''}`;
  h += `<div class="tm-sp"><b>${tEsc(CL[f.c].sp)}</b> <span class="mute">${tEsc(CL[f.c].d)}; se reîncarcă după ${cd} ${cd === 1 ? 'tură' : 'ture'}.</span></div>${typeof spPanel === 'function' ? spPanel(f) : ''}${hero}${xp}<div class="tm-act">${typeof teamCtl === 'function' ? teamCtl(f) : ''}${rv}${tmSkin(f)}</div></section>`;
  h += `<div class="tm-right"><section class="tm-eq"><h2>Echipament · ${tEsc(f.n)}</h2>${vSlots()}</section>${inv || ''}</div></div>`;
  return h;
}
/* indicator de sinergie: ce aduce echipa activă (S.fs), după clasele din ea, nu echipament */
const SYN_LBL = ['Slabă', 'Medie', 'Bună', 'Foarte bună'];
const synLbl = v => SYN_LBL[Math.max(0, Math.min(3, v))];
function tmSynergy() {
  const cls = S.fs.filter(f => !f.h).map(f => f.c);
  let res = 1, dmg = 1, heal = 0;   /* eroul dă o bază solidă de rezistență și daune */
  if (cls.includes('Paznic')) res += 2;
  if (cls.includes('Războinic')) { res += 1; dmg += 1; }
  if (cls.includes('Arcaș')) dmg += 2;
  if (cls.includes('Mag')) dmg += 2;
  const vr = S.fs.find(f => f.c === 'Vraci');
  if (vr) heal = (vr.rk || 0) >= 3 ? 3 : 2;
  const rows = [['Rezistență', res], ['Daune', dmg], ['Vindecare', heal]];
  let tip = '';
  if (!cls.includes('Paznic') && !cls.includes('Războinic')) tip = 'Un Paznic absoarbe lovituri și protejează restul echipei.';
  else if (!cls.includes('Arcaș') && !cls.includes('Mag') && !cls.includes('Războinic')) tip = 'Un Arcaș sau un Mag ar grăbi luptele.';
  else if (!vr) tip = 'Un Vraci e cel mai bun în luptele lungi: în Turn, la căpitanii care otrăvesc sau renasc, și îngrijește echipa după fiecare victorie. La căpitanii care lovesc tare, un Arcaș termină lupta mai repede.';
  else tip = 'Vraciul ține echipa în viață în Turn și în luptele lungi și o îngrijește după fiecare victorie (+15%). Contra căpitanilor care lovesc tare, schimbă-l pe un Arcaș sau un Mag.';
  return `<section class="tm-syn"><h2>Compoziția echipei</h2><div class="tm-syn-rows">${rows.map(([n, v]) => `<div class="tm-syn-r"><span>${n}</span><b class="syn-${v >= 3 ? 'g2' : v >= 2 ? 'g1' : v >= 1 ? 'n' : 'b1'}">${synLbl(v)}</b></div>`).join('')}</div><div class="mute tm-syn-tip">Sfat: ${tip}</div></section>`;
}
/* pagina Echipă pe file: Echipament (portret, statistici, sloturi; pe ecran lat și rucsacul), Rucsac (doar pe telefon), Compoziție (sinergie + presetări) */
let tmTab = 'eq';
function tmTabSet(t) { tmTab = t; go(); }
function vEquipTop(inv, pre) {
  const wide = typeof matchMedia === 'function' && matchMedia('(min-width:960px)').matches;
  if (wide && tmTab === 'inv') tmTab = 'eq';
  const n = (S.inv || []).length, f = cur();
  const tabs = [['eq', 'Echipament'], ...(wide ? [] : [['inv', `Rucsac${n ? ' · ' + n : ''}`]]), ['co', 'Compoziție și presetări']];
  /* îngrijirea echipei stă mereu la vedere, în bara de file: nu mai cauți „Ridică toți căzuții” în josul coloanei */
  const hurt = !S.d && [...S.fs, ...S.rs].some(x => x.hp > 0 && x.hp < mhp(x)), healCost = Math.round(6 * S.lvl * Math.pow(.96, BL().i));
  const care = (typeof reviveAllBtn === 'function' ? reviveAllBtn('d tm-care-b') : '') + (hurt ? `<button class="tm-care-b" onclick="heal()">✚ Vindecă răniții · ${healCost} aur</button>` : '');
  const bar = `<div class="tm-tabs" role="tablist">${tabs.map(([k, t]) => `<button role="tab" aria-selected="${tmTab === k}" class="${tmTab === k ? 'on' : ''}" onclick="tmTabSet('${k}')">${t}</button>`).join('')}${care ? `<span class="tm-care">${care}</span>` : ''}</div>`;
  let body;
  if (tmTab === 'co') body = tmSynergy() + (typeof mrTeamPresetPanel==='function'?mrTeamPresetPanel():'') + (typeof egEndgamePanel==='function'?egEndgamePanel():'') + (pre || '');
  else if (tmTab === 'inv') body = `<div class="tm-for mute">Echipezi pe <b>${tEsc(f.n)}</b> · alege altul din cardurile de sus.</div><div class="tm-right">${inv || ''}</div>`;
  else body = tmChar(wide ? inv : '');
  setTimeout(tmFit, 0);
  return tmStrip() + bar + body;
}
/* pe ecran lat, pagina Echipă încape în fereastră: coloanele primesc înălțimea rămasă și se derulează fiecare în parte */
const TM_FIT_MQ = '(min-width:1200px) and (min-height:640px)';
function tmFit() {
  if (typeof document === 'undefined') return;
  const c = document.querySelector('.tm-char');
  if (!c) return;
  if (typeof matchMedia !== 'function' || !matchMedia(TM_FIT_MQ).matches) { c.style.removeProperty('--tm-h'); return; }
  const top = c.getBoundingClientRect().top + (window.scrollY || 0);
  c.style.setProperty('--tm-h', Math.max(400, Math.floor(window.innerHeight - top - 24)) + 'px');
}
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('resize', () => tmFit());

/* ----------------------------------------------------------------- bara de sus */
function hdrSel(i) { if(typeof adventureActive==='function'&&adventureActive())return; S.sel = i; S.tab = 'e'; S.msg = ''; go(); }
function temaHdr() {
  const h = S.fs.find(f => f.h) || S.fs[0], nd = need(S.lvl), xp = Math.max(0, Math.min(1, S.xp / Math.max(1, nd))), R = 25, C = 2 * Math.PI * R;
  const team = S.fs.map((f, i) => { const c = tmHp(f), dead = c.hp <= 0; return `<button class="hm${f === cur() && S.tab === 'e' ? ' on' : ''}${dead ? ' dead' : ''}" onclick="hdrSel(${S.fs.indexOf(f)})" title="${tEsc(f.n)} · ${Math.round(c.hp)}/${c.max} viață${f.h ? ' (erou)' : ''}"><span class="hm-av">${av(f, 36)}${dead ? '<b>☠</b>' : ''}</span><i class="hm-hp${c.p < 40 ? ' low' : ''}"><i style="width:${c.p}%"></i></i></button>`; }).join('');
  const botOn = !!(S.prem && S.bt && S.bt.on), fxOn = !S.fxInstant, fxLock = typeof C === 'function' && C('w') === 0;
  const ctl = ''   /* comenzi rapide: botul și redarea luptei, lovitură cu lovitură */
    + `<button class="hq${botOn ? ' on' : ''}" onclick="${S.prem ? "btog('on')" : "tab('a');vil('q')"}" aria-pressed="${botOn}" title="${S.prem ? (botOn ? 'Bot pornit: apasă ca să-l oprești' : 'Bot oprit: apasă ca să-l pornești') : 'Botul joacă singur (premium)'}"><span class="hq-i">${typeof satIcon === 'function' ? satIcon('q') : '🤖'}</span><span class="hq-t">Bot<small>${S.prem ? (botOn ? 'pornit' : 'oprit') : 'premium'}</small></span></button>`
    + `<button class="hq${fxOn || fxLock ? ' on' : ''}" onclick="fxToggleInstant()"${fxLock ? ' disabled' : ''} aria-pressed="${fxOn || fxLock}" title="${fxLock ? 'La prima luptă se vede mereu.' : fxOn ? 'Redarea luptei e pornită: apasă ca să sari direct la rezultat' : 'Redarea luptei e oprită: apasă ca s-o pornești'}"><span class="hq-i">⚔</span><span class="hq-t">Redare<small>${fxOn || fxLock ? 'pornită' : 'oprită'}</small></span></button>`;
  return ''   /* echipa nu mai apare în bara de sus: e în meniul și panoul din stânga, și în fila Echipă */
    + `<span class="rc" title="Puncte">${IC.p}<span><b id="pp">${S.pts}/${MXP()}</b><small id="pt">${S.bp > 0 ? 'rezervă +' + S.bp : S.pts < MXP() ? '(+1 în ' + fmt(PTX() - (Date.now() - S.ptsT)) + ')' : S.pts > MXP() ? 'peste maxim' : 'Puncte'}</small></span></span>`
    + `<span class="rc" title="Aur">${IC.g}<span><b>${S.gold}</b><small>Aur</small></span></span><span class="rc" title="Minereu">${IC.o}<span><b>${S.ore}</b><small>Minereu</small></span></span>`
    + ctl
    + `<button class="hh" onclick="hdrSel(${Math.max(0, S.fs.indexOf(h))})" title="Eroul: nivel ${S.lvl}, ${S.xp}/${nd} experiență"><span class="hh-r"><svg viewBox="0 0 56 56" aria-hidden="true"><circle class="bg" cx="28" cy="28" r="${R}"/><circle class="fg" cx="28" cy="28" r="${R}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - xp)).toFixed(1)}"/></svg><span class="hh-a">${av(h, 40)}</span><b class="hh-l">${S.lvl}</b></span><span class="hh-t"><b>${tEsc(h.n)}</b><small>Nivel ${S.lvl} · ${S.xp}/${nd}</small></span></button>`;
}

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  /* pagina Echipă, compactă: se încarcă după tema.css, deci înlocuiește regulile de acolo pentru aceste elemente */
  st.textContent = `
.hq{display:flex;align-items:center;gap:7px;padding:4px 12px 4px 8px;border-radius:6px;background:linear-gradient(180deg,#0e1214,#161b1e);border:1px solid var(--line);box-shadow:inset 0 0 0 1px #000;color:var(--mute);white-space:nowrap;min-height:0;flex:none}
.hq:hover:not(:disabled){border-color:var(--gold);transform:none}.hq:disabled{opacity:.75;cursor:default}
.hq-i{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;font-size:20px;line-height:1}.hq-i svg{width:26px;height:26px}
.hq-t{display:flex;flex-direction:column;text-align:left;font:700 14px/1.1 Cinzel,serif;color:var(--ink)}.hq-t small{font:400 12px/1.1 Alegreya,Georgia,serif;color:var(--mute)}
.hq.on{border-color:#4fa35e;box-shadow:inset 0 0 0 1px #000,0 0 8px #4fa35e44}.hq.on .hq-t small{color:#9be0a6}
@media (max-width:959px){.hq{padding:3px 6px;gap:4px}.hq-t{display:none}.hq-i{width:22px;height:22px;font-size:17px}.hq-i svg{width:22px;height:22px}}
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

/* pagina Echipă: portretul întreg sus în stânga, statisticile dedesubt; echipamentul și rucsacul în dreapta */
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.tm-left2{display:block!important}
.tm-full{position:relative;margin:0 0 12px;border-radius:12px;overflow:hidden;border:1px solid var(--gold2,#f0d27a);box-shadow:0 8px 24px #000a,inset 0 0 0 1px #0006;aspect-ratio:1/1;background:#0e1214}
.tm-full>img{display:block;width:100%;height:100%;object-fit:cover;object-position:center 22%}
.tm-full.dead>img{filter:grayscale(1) brightness(.6)}
.tm-full-av{display:flex;align-items:center;justify-content:center;width:100%;height:100%}
.tm-full-tx{position:absolute;left:0;right:0;bottom:0;padding:34px 14px 10px;background:linear-gradient(180deg,transparent,#0b0e10e6 55%)}
.tm-full-tx .tm-h{margin:0;font-size:22px;text-shadow:0 2px 6px #000}.tm-full-tx .tm-sub{color:#d6d9db;font-size:13.5px;line-height:1.35}
@media (max-width:600px){.tm-full{aspect-ratio:5/4}}
@media (min-width:960px){.tm-full{aspect-ratio:4/5}.tm-char{grid-template-columns:minmax(280px,320px) minmax(0,1fr)!important}}`;
  document.head.appendChild(st);
})();

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.tm-syn{margin-bottom:14px}.tm-syn-rows{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
.tm-syn-r{flex:1;min-width:110px;display:flex;flex-direction:column;gap:3px;border:1px solid var(--line);border-radius:9px;padding:8px 10px;background:#0e1214}
.tm-syn-r span{font-size:12px;color:var(--mute)}.tm-syn-r b{font-size:14.5px}
.syn-b1{color:#e8837b}.syn-n{color:#d6c56a}.syn-g1{color:#9fe3ad}.syn-g2{color:#7fd88c}
.tm-syn-tip{font-size:13px}`;
  document.head.appendChild(st);
})();

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.tm-squad{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:6px}
.tm-big{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;padding:30px 10px 10px;border:1px solid var(--line);border-radius:12px;background:#0e1214;text-align:center;cursor:pointer}
.tm-big.sel{border-color:var(--gold2,#f0d27a);box-shadow:0 0 0 1px var(--gold2,#f0d27a),0 0 16px #f0d27a33}
.tm-big.dead{opacity:.6}
.tm-big-role{position:absolute;top:8px;left:8px;font:700 10.5px Cinzel,serif;letter-spacing:.04em;padding:2px 8px;border-radius:8px}
.tm-big-role.r-Tank{background:#17324a;color:#7fb3ff}.tm-big-role.r-DPS{background:#4a2414;color:#f0a06a}.tm-big-role.r-Suport{background:#1f4a2a;color:#9fe3ad}
.tm-big-av{width:84px;height:84px;border-radius:50%;overflow:hidden;background:#161b1e;display:flex;align-items:center;justify-content:center;position:relative}
.tm-big-av img{width:100%;height:100%;object-fit:cover;object-position:center 20%}
.tm-big .sk{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:28px;background:#000a}
.tm-big-n{font:700 14.5px Cinzel,serif;margin-top:2px}.tm-big-k{font-size:11.5px}
.tm-big-hp{display:block;width:100%;height:6px;border-radius:3px;background:#1c2226;overflow:hidden;margin-top:2px}
.tm-big-hp i{display:block;height:100%;background:linear-gradient(90deg,#4a8f55,#7fd88c)}.tm-big-hp.low i{background:linear-gradient(90deg,#8a3a32,#e8837b)}
.tm-big-hpn{font-size:11px}
.tm-big-eq{display:flex;gap:3px;flex-wrap:wrap;justify-content:center;margin-top:3px}
.tm-eqi{width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:5px;background:#161b1e}
.tm-eqi img,.tm-eqi .uii{width:16px;height:16px}.tm-eqi.em{opacity:.35}
.tm-big-tip{font-size:10.5px;color:var(--mute);line-height:1.25;min-height:2.4em}
.tm-res{margin:8px 0 12px}
.tm-rb{position:relative;display:flex;align-items:center;gap:10px;width:auto;min-height:0;padding:6px 12px 6px 8px;border:1px solid var(--line);border-radius:10px;background:linear-gradient(180deg,#151a1d,#0e1214);color:var(--ink);text-align:left;cursor:pointer}
.tm-rb:hover{border-color:var(--gold);transform:none}.tm-rb.on,.tm-rb.cur{border-color:var(--gold2,#f0d27a);box-shadow:0 0 0 1px #f0d27a55}
.tm-rb-s{display:flex}.tm-rb-a{display:inline-flex;width:28px;height:28px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 2px #0e1214}.tm-rb-a+.tm-rb-a{margin-left:-9px}.tm-rb-a.dead{filter:grayscale(1) brightness(.6)}
.tm-rb-t{display:flex;flex-direction:column}.tm-rb-t b{font:700 13.5px Cinzel,serif}.tm-rb-t small{font-size:12px;color:var(--mute)}
.tm-rb-ch{color:var(--mute);font-size:13px;margin-left:2px}.tm-rb .nb{position:absolute;top:-6px;right:-6px;margin:0}
.tm-rp{margin-top:8px;padding:10px;border:1px solid var(--line);border-radius:12px;background:#0b0e10;animation:tmRp .18s ease-out}
.tm-rp-n{font-size:13px;margin:0 0 8px}
.tm-rp-l{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}
.tm-rp-c{display:flex;align-items:center;gap:10px;padding:7px 9px;border:1px solid var(--line);border-radius:10px;background:#11161a}
.tm-rp-c.on{border-color:var(--gold2,#f0d27a);box-shadow:0 0 0 1px var(--gold2,#f0d27a)}.tm-rp-c.off{opacity:.7}.tm-rp-c.dead .tm-rp-av{filter:grayscale(1) brightness(.6)}
.tm-rp-av{flex:none;display:inline-flex;border-radius:50%;overflow:hidden}
.tm-rp-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}.tm-rp-tx b{font:700 13.5px Cinzel,serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tm-rp-tx small{font-size:11.5px;color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tm-rp-tx .tm-hp{height:5px;margin:2px 0 1px}
.tm-rp-x{flex:none;display:flex;flex-direction:column;gap:4px}.tm-rp-x button{padding:3px 9px;font-size:12.5px;min-height:0}
.tm-rp-sw{margin-top:10px;padding-top:10px;border-top:1px solid #ffffff1a}.tm-rp-q{font-size:13.5px;margin-bottom:6px}
.tm-rp-tg{display:flex;flex-wrap:wrap;gap:8px}.tm-rp-tg button{display:flex;align-items:center;gap:8px;width:auto;min-width:180px;padding:5px 12px 5px 5px;text-align:left;border-radius:10px}
.tm-rp-tg button:hover{border-color:var(--gold2,#f0d27a);transform:none}
@keyframes tmRp{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.tm-rp{animation:none}}
@media (max-width:520px){.tm-squad{grid-template-columns:repeat(2,minmax(0,1fr))}.tm-rb{width:100%}.tm-rp-l{grid-template-columns:1fr}.tm-rp-tg button{flex:1 1 100%}}`;
  document.head.appendChild(st);
})();

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.tm-tabs{display:flex;gap:4px;margin:0 0 12px;padding:4px;border:1px solid var(--line);border-radius:10px;background:#0b0e10;overflow-x:auto;scrollbar-width:none}
.tm-tabs button{flex:0 0 auto;width:auto;min-height:0;padding:7px 12px;font:700 13.5px Cinzel,serif;border:0;border-radius:7px;background:transparent;color:var(--mute);box-shadow:none;white-space:nowrap}
.tm-care{display:flex;gap:6px;margin-left:auto;align-items:center}
.tm-tabs .tm-care .tm-care-b{flex:0 0 auto;padding:6px 12px;font:700 13px Cinzel,serif;border-radius:7px;box-shadow:none;color:#f6ead0;border:1px solid #f0d27a55;background:linear-gradient(180deg,#2a3a2a,#18241a)}
.tm-tabs .tm-care .tm-care-b.d{background:linear-gradient(180deg,#6a2018,#3e120d);border-color:#e8837b88;animation:tmCare 1.8s ease-in-out infinite}
@keyframes tmCare{50%{box-shadow:0 0 12px #e8837b88}}
@media (prefers-reduced-motion:reduce){.tm-tabs .tm-care .tm-care-b.d{animation:none}}
@media (max-width:959px){.tm-tabs{flex-wrap:wrap}.tm-care{margin-left:0;width:100%}.tm-tabs .tm-care .tm-care-b{flex:1 1 auto;white-space:normal}}
.tm-tabs button:hover{color:var(--ink);transform:none}.tm-tabs button.on{background:linear-gradient(180deg,#3a2e12,#241c0b);color:var(--gold2,#f0d27a);box-shadow:inset 0 0 0 1px #f0d27a55}
.tm-for{font-size:13.5px;margin:0 0 8px}
@media (max-width:959px){.tm-tabs button{flex:1 0 auto}}
@media (max-width:520px){.tm-squad{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px}.tm-big{padding:24px 4px 8px}.tm-big-av{width:56px;height:56px}.tm-big-n{font-size:12.5px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tm-big-k{font-size:10.5px}.tm-big-eq,.tm-big-tip{display:none}.tm-big-role{top:5px;left:5px;font-size:9.5px;padding:1px 6px}}
@media (max-width:859px){.tm-full{aspect-ratio:auto!important;height:200px}.tm-full>img{object-position:center 18%}}`;
  document.head.appendChild(st);
})();

/* Echipă pe ecran lat (≥1200px): totul încape în fereastră, fără derularea paginii.
   Sus: echipa pe un rând de carduri compacte + rezerva; jos: trei coloane (luptătorul, echipamentul, rucsacul). */
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.tm-eqi{overflow:hidden}.tm-eqi .ico{width:20px!important;height:20px!important;margin:0!important;font-size:13px;box-shadow:none}.tm-eqi .ico img{width:100%;height:100%;object-fit:contain}.tm-eqi .ico::before,.tm-eqi .ico::after,.tm-eqi .rn{display:none!important}
@media (min-width:1200px) and (min-height:640px){
main#v:has(.tm-char){max-width:min(1480px,100%)}
.tm-top{display:flex;align-items:stretch;gap:10px;margin:0 0 10px}
.tm-top .tm-squad{flex:1;min-width:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;margin:0}
.tm-big{display:grid;grid-template-columns:54px minmax(0,1fr) auto;grid-template-areas:"av n role" "av k hpn" "av hp hp";column-gap:10px;row-gap:3px;align-items:center;padding:8px 12px 9px 9px;text-align:left;border-radius:11px;background:linear-gradient(180deg,#141a1d,#0d1113)}
.tm-big:hover:not(.sel){border-color:#8f7630;transform:none}
.tm-big.sel{background:linear-gradient(180deg,#2a2312,#120f08)}
.tm-big-av{grid-area:av;width:54px;height:54px;box-shadow:0 0 0 2px #0b0e10,0 0 0 3px var(--gold,#c9a54a)}
.tm-big.sel .tm-big-av{box-shadow:0 0 0 2px #0b0e10,0 0 0 3px var(--gold2,#f0d27a),0 0 12px #f0d27a55}
.tm-big-role{grid-area:role;position:static;justify-self:end;font-size:9.5px;padding:1px 7px}
.tm-big-n{grid-area:n;margin:0;font-size:15px;line-height:1.15;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tm-big-k{grid-area:k;font-size:12px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tm-big-hpn{grid-area:hpn;justify-self:end;font-size:11.5px;white-space:nowrap}
.tm-big-hp{grid-area:hp;margin:2px 0 0;height:6px}
.tm-big-eq,.tm-big-tip{display:none}
.tm-top .tm-res{position:relative;flex:none;margin:0;display:flex}
.tm-top .tm-rb{flex-direction:column;justify-content:center;gap:5px;min-width:150px;padding:8px 14px;border-radius:11px}
.tm-top .tm-rb-t{align-items:center;text-align:center}.tm-top .tm-rb-t small{max-width:130px;white-space:normal;line-height:1.25}
.tm-top .tm-rb-ch{position:absolute;bottom:4px;right:8px}
.tm-top .tm-rp{position:absolute;z-index:30;top:calc(100% + 6px);right:0;width:min(780px,calc(100vw - 340px));max-height:min(520px,70vh);overflow:auto;margin:0;box-shadow:0 18px 40px #000c}
.tm-tabs{margin:0 0 10px}
.tm-char{grid-template-columns:290px minmax(0,1fr)!important;gap:12px;margin:0;height:var(--tm-h,auto);align-items:stretch}
.tm-char>section,.tm-char>div{min-height:0}
.tm-left,.tm-left2{position:static!important;height:100%;max-height:none!important;overflow-y:auto;padding:12px 14px!important}
.tm-left .tm-full{aspect-ratio:auto!important;height:clamp(170px,calc(var(--tm-h,600px) * .34),250px);margin:0 0 8px}
.tm-left .tm-hpbar{margin:4px 0 0}
.tm-left .tm-stats{margin:8px 0 4px}
.tm-right{display:grid!important;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:12px!important;height:100%;min-height:0}
.tm-right>section{height:100%;min-height:0;overflow-y:auto;padding:12px 14px}
.tm-right>section>h2{position:sticky;top:-12px;z-index:2;margin:-12px -14px 10px;padding:12px 14px 8px;background:linear-gradient(180deg,#141a1d 80%,#141a1d00)}
.tm-right .slotgrid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px}
.tm-right .scard{padding:8px 10px}.tm-right .scard .ic-n{font-size:13.5px}.tm-right .scard .ic-a{flex-wrap:nowrap}.tm-right .scard .ic-a button{white-space:nowrap}
.tm-right .igrid{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
.tm-left,.tm-right>section,.tm-top .tm-rp{scrollbar-width:thin;scrollbar-color:#5a4a22 transparent}
.tm-left::-webkit-scrollbar,.tm-right>section::-webkit-scrollbar{width:8px}
.tm-left::-webkit-scrollbar-thumb,.tm-right>section::-webkit-scrollbar-thumb{background:#5a4a22;border-radius:4px}
}
@media (min-width:1200px) and (min-height:640px) and (max-width:1399px){
.tm-char{grid-template-columns:250px minmax(0,1fr)!important}
.tm-right{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.tm-right .slotgrid{grid-template-columns:1fr!important}
.tm-top .tm-squad{grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.tm-big{grid-template-columns:46px minmax(0,1fr) auto;grid-template-areas:"av n n" "av role hpn" "av hp hp";column-gap:8px}
.tm-big-av{width:46px;height:46px}.tm-big-k{display:none}.tm-big-role{justify-self:start}
}`;
  document.head.appendChild(st);
})();
