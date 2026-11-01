/* ============================================================================
   Silver Throne — echipa.js
   1) Pagina Echipă, după schița „interfata_echipa”: sus file mici (E = erou, M1…M3 = mercenarii din echipă,
      R = rezervă, S = strajă); dedesubt o grilă 2×2 cu rândurile aliniate:
          ┌ avatar + nume + viață ┬ echipament echipat ┐
          └ statusuri             ┴ rucsac (inventar)  ┘
      Coloana din stânga ocupă ~1/3 din lățime. Pe ecran îngust, celulele se așază una sub alta.
   2) Bara de sus: resursele și eroul cu inel de experiență.

   Doar afișează. Echiparea, vindecarea și ridicarea căzuților sunt aceleași funcții ale jocului (sel, equip, unequip,
   heal, revive, rn). Stilurile sunt la sfârșitul fișierului. Se încarcă după tema.js.
   ========================================================================== */

const TM_ORD = ['h', 'j', 'w', 'a', 'b', 'r'];                 /* ordinea sloturilor în panou (coif, bijuterie, armă, armură, cizme, relicvă) */
const tmHp = f => { const m = Math.max(1, mhp(f)), v = Number.isFinite(f.hp) ? f.hp : 0; return { hp: Math.max(0, Math.min(m, v)), max: m, p: Math.max(0, Math.min(100, v / m * 100)) }; };

/* ------------------------------------------------------------ filele luptătorilor */
/* Grupat: «Echipa» (E = erou, M1… = mercenarii care luptă), apoi «Rezervă» (R1…) și «Strajă» (S1…). Fiecare filă arată numele și viața. */
const TM_MAX = 3;   /* câți luptători încap în echipă (eroul + 2 mercenari) */
function tmTabs() {
  const ro = roster(), nfs = S.fs.length, gd = S.gd || [], me = cur();
  let m = 0, r = 0, g = 0;
  const team = [], res = [], gua = [];
  ro.forEach((f, i) => {
    const c = tmHp(f), sel = f === me, dead = c.hp <= 0, inTeam = f.h || i < nfs, strajer = !inTeam && gd.includes(f);
    const lb = f.h ? 'E' : inTeam ? 'M' + (++m) : strajer ? 'S' + (++g) : 'R' + (++r);
    const rol = f.h ? 'erou, în echipă' : inTeam ? 'în echipă' : strajer ? 'strajă' : 'rezervă';
    const t = `<button class="tm-t${sel ? ' sel' : ''}${dead ? ' dead' : ''}" role="tab" aria-selected="${sel}" onclick="sel(${i})" title="${tEsc(f.n)} · ${tEsc(f.c)} · ${rol}: ${Math.round(c.hp)}/${c.max} viață"><span class="tm-tl">${lb}</span><span class="tm-tn">${tEsc(f.n)}</span><i class="tm-tb${c.p < 40 ? ' low' : ''}"><i style="width:${c.p}%"></i></i>${dead ? '<b class="sk" aria-label="căzut">☠</b>' : ''}${typeof spNeed === 'function' && spNeed(f) ? '<b class="nb" title="Poate primi o specializare">!</b>' : ''}</button>`;
    (inTeam ? team : strajer ? gua : res).push(t);
  });
  const grp = (cls, title, arr) => arr.length ? `<div class="tm-tg ${cls}" role="group" aria-label="${title}"><span class="tm-gl">${title}</span><div class="tm-gt">${arr.join('')}</div></div>` : '';
  return `<div class="tm-tabs" role="tablist" aria-label="Luptători">${grp('team', `⚔ Echipa · ${nfs}/${TM_MAX}`, team)}${grp('res', 'Rezervă', res)}${grp('gd', 'Strajă', gua)}</div>`;
}

/* ----------------------------------------------------- luptătorul selectat */
function tmPortrait(f) {
  return `<div class="tm-bigav">${av(f, 200)}</div>`;   /* portretele pictate vin din av() */
}
/* butoanele de skin ale eroului */
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

/* grila 2×2: avatar | echipament  /  statusuri | rucsac (inv = HTML-ul rucsacului, venit din vE) */
function tmChar(inv) {
  const f = cur(), ro = roster(), i = ro.indexOf(f), c = tmHp(f), b = bon(f), nfs = S.fs.length;
  const extra = [['crit', 'critic', b.crit + tr(f, 'crit')], ['bleed', 'sângerare', b.bleed], ['loot', 'aur în plus', b.loot + tr(f, 'loot')], ['heal', 'vindecare', b.heal]].filter(x => x[2]).map(x => `<span>${x[2]}% ${x[1]}</span>`).join('');
  const reviveCost = Math.round(15 * S.lvl * Math.pow(.96, BL().i)), healCost = Math.round(6 * S.lvl * Math.pow(.96, BL().i));
  const rv = c.hp <= 0 && i < nfs + S.rs.length ? `<button class="d" onclick="${i < nfs ? `revive(${i})` : `revive(${i - nfs},1)`}">Ridică (${reviveCost} aur)</button>` : '';
  const hurt = [...S.fs, ...S.rs].some(x => x.hp > 0 && x.hp < mhp(x));
  const xp = f.h ? `<div class="tm-xp"><span class="mute">Nivel ${S.lvl} · ${S.xp}/${need(S.lvl)} exp.</span><i class="xpb"><i style="width:${Math.min(100, S.xp / need(S.lvl) * 100)}%"></i></i></div>` : '';
  const sub = `${f.h ? 'erou' : 'nivel ' + S.lvl + ' · ' + RK[f.rk || 0]} · ${tEsc(f.c)}${f.sp && typeof spDef0 === 'function' && spDef0(f) ? ' · ' + spDef0(f).n : ''}${f.sc ? ' · ' + f.sc + ' cicatrice' : ''}${f.t && f.t.length ? '<br>' + f.t.map(x => tEsc(x.n)).join(', ') : ''}`;
  const cd = typeof spCd === 'function' ? spCd(f) : 2;
  const skins = tmSkin(f);
  const inTeam = f.h || i < nfs, strajer = !inTeam && (S.gd || []).includes(f);
  const rol = f.h ? 'Erou · în echipă' : inTeam ? 'În echipă' : strajer ? 'Strajă' : 'Rezervă';
  const acts = `${deadAll().length > 1 || (deadAll().length === 1 && c.hp > 0) ? reviveAllBtn() : ''}${rv}${hurt && !S.d ? `<button onclick="heal()">Vindecă răniții · ${healCost} aur</button>` : ''}`;

  /* celula 1 — avatar */
  let h = `<div class="tm-frame"><section class="tm-cell tm-av-c"><div class="tm-por">${tmPortrait(f)}</div><div class="tm-id"><div class="tm-role${inTeam ? ' in' : ''}">${inTeam ? '⚔ ' : ''}${rol}</div><div class="tm-h" role="heading" aria-level="2">${tEsc(f.n)}</div><div class="tm-sub mute">${sub}</div>`
    + `<div class="tm-hpbar"><span>${c.hp <= 0 ? '☠ căzut' : Math.round(c.hp) + ' / ' + c.max + ' viață'}</span><i class="bar${c.hp <= 0 ? ' e' : ''}"><i style="width:${c.p}%"></i></i></div>${xp}</div>${skins ? `<div class="tm-act">${skins}</div>` : ''}</section>`;
  /* celula 3 — statusuri (în stânga, sub avatar) */
  h += `<section class="tm-cell tm-st-c"><div class="tm-ct">Statusuri</div>`
    + `<div class="tm-stats"><div><b>${c.max}</b><span>Viață</span></div><div><b>${Math.round(atkOf(f))}</b><span>Atac</span></div><div><b>${tmDef(f)}</b><span>Apărare</span></div></div>${extra ? `<div class="chips">${extra}</div>` : ''}`
    + `<div class="tm-sp"><b>${tEsc(CL[f.c].sp)}</b> <span class="mute">${tEsc(CL[f.c].d)}; se reîncarcă după ${cd} ${cd === 1 ? 'tură' : 'ture'}.</span></div>${typeof spPanel === 'function' ? spPanel(f) : ''}${acts ? `<div class="tm-act">${acts}</div>` : ''}</section>`;
  /* celula 2 — echipamentul echipat; celula 4 — rucsacul */
  h += `<div class="tm-cell tm-eq-c tm-right"><section class="tm-eq"><h2>Echipament · ${tEsc(f.n)}</h2>${vSlots()}</section></div>`;
  h += `<div class="tm-cell tm-inv-c tm-right">${inv || ''}</div></div>`;
  return h;
}
function vEquipTop(inv) { return tmTabs() + tmChar(inv); }

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
  /* pagina Echipă (după schiță). Se încarcă după tema.css, deci înlocuiește regulile de acolo pentru aceste elemente */
  st.textContent = `
/* file: grupul „Echipa” (E, M1, M2) e evidențiat cu auriu; „Rezervă” și „Strajă” sunt estompate, cu chenar punctat */
.tm-tabs{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px 16px;margin:0 0 8px 2px}
.tm-tg{display:flex;flex-direction:column;gap:3px;min-width:0}
.tm-gl{font:700 11px Cinzel,serif;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);padding-left:3px}
.tm-tg.team .tm-gl{color:var(--gold)}
.tm-gt{display:flex;flex-wrap:wrap;gap:4px}
.tm-t{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;column-gap:8px;row-gap:6px;min-width:108px;max-width:176px;padding:7px 12px 6px 9px;text-align:left;font:700 14px Cinzel,serif;line-height:1;color:var(--mute);border:1px solid var(--line);border-radius:8px 8px 3px 3px;background:linear-gradient(180deg,#171e21,#0e1214);cursor:pointer;box-shadow:none;transform:none}
.tm-t:hover:not(.sel){border-color:#8f7630;color:var(--ink)}
.tm-tl{font:700 12px Cinzel,serif;color:var(--gold);background:#0008;border:1px solid var(--line);border-radius:4px;padding:3px 5px;line-height:1}
.tm-tn{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ink);letter-spacing:.02em}
.tm-tg.team .tm-t{border-top:2px solid var(--gold);background:linear-gradient(180deg,#2a2412,#12100a)}
.tm-tg.res .tm-t,.tm-tg.gd .tm-t{border-style:dashed;opacity:.8}
.tm-t.sel{color:var(--gold2);border-color:var(--gold);background:linear-gradient(180deg,#4a3b1a,#1d1809);box-shadow:inset 0 1px 0 #f0d27a40,0 0 14px #c9a24b44;opacity:1}
.tm-t.sel .tm-tn{color:var(--gold2)}
.tm-t.dead{filter:grayscale(.55)}
.tm-tb{grid-column:1/-1;display:block;height:4px;background:#000;border:1px solid #3d3319;border-radius:3px;overflow:hidden}
.tm-tb i{display:block;height:100%;background:linear-gradient(90deg,#2d6b3a,#5fbf70)}
.tm-tb.low i{background:linear-gradient(90deg,#8a5a1a,var(--ember))}
.tm-t.dead .tm-tb i{background:var(--blood)}
.tm-t .sk{position:absolute;top:2px;right:5px;font-size:11px;line-height:1}
.tm-t .nb{position:absolute;top:-6px;right:-5px;margin:0}

/* grila 2×2: stânga ≈ 1/3, dreapta ≈ 2/3; rândurile sunt aliniate între coloane */
.tm-frame{display:grid;grid-template-columns:minmax(270px,32%) minmax(0,1fr);grid-template-rows:minmax(300px,auto) auto;grid-template-areas:"av eq" "st inv";gap:12px;align-items:stretch;margin:0 0 14px}
.tm-frame>*{margin:0;min-width:0}
.tm-av-c{grid-area:av}.tm-st-c{grid-area:st}.tm-eq-c{grid-area:eq}.tm-inv-c{grid-area:inv}

/* avatar */
.tm-av-c{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:14px}
.tm-av-c .tm-por{margin:0}
.tm-bigav{width:200px;height:200px;max-width:100%;margin:0 auto;border-radius:12px;overflow:hidden}
/* portretul întreg, pătrat, fără decupare în cerc (colțurile și mâinile nu se mai taie) */
.tm-bigav .avw,.tm-bigav>img{width:100%!important;height:100%!important;transform:none;border-radius:12px!important;overflow:hidden}
.tm-bigav .avw img,.tm-bigav>img{border-radius:12px!important;border:0!important;object-fit:contain!important;object-position:center!important;background:#0b0e10}
.tm-bigav .hav>svg{border-radius:12px}
.tm-role{display:inline-block;margin:0 0 6px;padding:2px 10px;font:700 11px Cinzel,serif;letter-spacing:.12em;text-transform:uppercase;border:1px dashed var(--line);border-radius:10px;color:var(--mute)}
.tm-role.in{color:#1a1306;background:var(--gold);border:1px solid var(--gold2);box-shadow:0 0 8px #c9a24b66}
.tm-id{width:100%}
.tm-h{font:700 22px Cinzel,serif;color:var(--ink);line-height:1.15;overflow-wrap:anywhere}
.tm-sub{font-size:13px;line-height:1.35;margin:3px 0 0}
.tm-hpbar{text-align:left;font-size:13px;margin:8px 0 0}.tm-hpbar .bar{height:9px}
.tm-xp{text-align:left;font-size:13px;margin:8px 0 0}
.tm-av-c .tm-act{margin-top:auto;justify-content:center;gap:6px}.tm-av-c .tm-act button{font-size:13px;padding:5px 10px}

/* statusuri */
.tm-st-c{display:flex;flex-direction:column;gap:8px;padding:14px}
.tm-ct{font:700 12px Cinzel,serif;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.tm-st-c .tm-stats{margin:0;gap:6px}.tm-st-c .tm-stats div{padding:7px 2px 6px;border-radius:8px;text-align:center}
.tm-st-c .tm-stats b{font-size:20px}.tm-st-c .tm-stats span{font-size:11px}
.tm-st-c .chips{justify-content:flex-start;margin:0}
.tm-st-c .tm-sp{margin:0;font-size:14px;line-height:1.4;text-align:left}
.tm-st-c .tm-act{margin-top:auto;justify-content:flex-start;gap:6px;padding-top:4px}.tm-st-c .tm-act button{font-size:13px;padding:5px 10px}

/* dreapta: echipament + rucsac */
.tm-right{display:flex;flex-direction:column;min-width:0}
.tm-right>section{flex:1;margin:0}
.tm-right h2{font-size:18px}
.tm-eq{display:flex;flex-direction:column}
.tm-right .slotgrid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:0}
.tm-eq .slotgrid{flex:1;grid-auto-rows:1fr;align-items:stretch}
.scard.emp .sc-e{display:none}.scard.emp .ic-a{margin-top:6px}
.tm-right .scard{min-height:0;padding:7px 9px;border-radius:8px}
.tm-right .scard .ico{width:32px;height:32px;font-size:17px;margin:0 8px 2px 0;border-radius:6px}
.scard .sc-k{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin-bottom:2px}
.tm-right .scard .ic-n{font-size:14px;line-height:1.3}
.tm-right .scard .chips{margin:3px 0 0}.tm-right .scard .chips span{font-size:12px;padding:0 6px}
.tm-right .scard .ic-a{margin-top:5px;gap:4px}.tm-right .scard .ic-a button{padding:3px 8px;font-size:12.5px}
.scard.emp::before{top:6px;right:8px;font-size:28px}
.scard.emp .sc-e{margin:2px 0 0;font-size:13px}
.tm-right .igrid{grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px}
.tm-right .icard{padding:6px 8px}
.tm-right .icard .ic-n{font-size:14px;line-height:1.3}
.tm-right .icard .chips{margin:3px 0 0}.tm-right .icard .chips span{font-size:12px;padding:0 6px}
.tm-right .icard .ic-a{margin-top:5px;gap:4px}.tm-right .icard .ic-a button{padding:3px 8px;font-size:12.5px}
.tm-right .invbar{margin:6px 0;gap:4px}.tm-right .invbar button{padding:3px 8px;font-size:13px}
.tm-right .pager{margin:6px 0}

@media (max-width:1100px){.tm-right .slotgrid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:860px){
  .tm-frame{grid-template-columns:1fr;grid-template-rows:auto;grid-template-areas:"av" "st" "eq" "inv"}
}
@media (max-width:520px){
  .tm-t{min-width:96px;max-width:140px;padding:6px 9px 5px 7px;font-size:13px}
  .tm-tabs{gap:6px 10px}
  .tm-av-c{display:grid;grid-template-columns:96px minmax(0,1fr);column-gap:12px;align-items:start;text-align:left;padding:12px}
  .tm-av-c .tm-por{grid-column:1}.tm-av-c .tm-id{grid-column:2}.tm-av-c .tm-act{grid-column:1/-1;justify-content:flex-start}
  .tm-bigav{width:96px;height:96px}
  .tm-av-c{grid-template-columns:96px minmax(0,1fr)}
  .tm-h{font-size:19px}
  .tm-right .slotgrid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .tm-right .igrid{grid-template-columns:1fr}
  .tm-right .invbar{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;scrollbar-width:thin}.tm-right .invbar>*{flex:none}
}
`;
  document.head.appendChild(st);
})();
