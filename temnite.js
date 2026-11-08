/* ============================================================================
   Silver Throne — temnite.js
   1) Coborârea ca grilă de carduri: imaginea temniței (imagini/temnite/), portretul căpitanului în colț,
      dificultatea în stele, „Recomandat” pentru temnița potrivită nivelului, cele blocate estompate.
      Cripta Furtunii (evenimentul săptămânal) are card mare, cu cheile.
   2) Căpitanul în luptă: portret (imagini/monstri/), aură în culoarea temniței, inel rotitor, scântei,
      tresărire la lovitură, aură roșie sub 30% viață. Monștrii obișnuiți rămân simpli.
   Imaginile lipsă nu strică nimic: cardul rămâne cu fundal închis, căpitanul cu cardul simplu.
   Se încarcă înaintea scriptului din pagină.
   ========================================================================== */
const TMN = { showAll: false,
  dg: { 'Mina Cenușie': 'mina-cenusie', 'Peștera Lupilor': 'pestera-lupilor', 'Catacombele Uitate': 'catacombele-uitate', 'Fortul Părăsit': 'fortul-parasit',
    'Cetatea Scufundată': 'cetatea-scufundata', 'Mlaștina Putredă': 'mlastina-putreda', 'Abisul Cenușiu': 'abisul-cenusiu', 'Forja Veche': 'forja-veche',
    'Tronul Cenușiu': 'tronul-cenusiu', 'Cripta Furtunii': 'cripta-furtunii' },
  /* căpitan → [imagine, culoarea aurei] */
  boss: { 'Căpitanul Cenușii': ['capitanul-cenusii', '#ff8a3d'], 'Alfa Haitei': ['alfa-haitei', '#ffb347'], 'Regele Oaselor': ['regele-oaselor', '#7dffb0'],
    'Comandantul Fantomă': ['comandantul-fantoma', '#9fd8ff'], 'Străjerul Furtunii': ['strajerul-furtunii', '#5cc8ff'], 'Căpitanul Înecat': ['capitanul-inecat', '#3ff0d8'],
    'Hidra Mlaștinii': ['hidra-mlastinii', '#c6f050'], 'Stăpânul Abisului': ['stapanul-abisului', '#ff5a3d'], 'Fierarul Ars': ['fierarul-ars', '#ffa024'],
    'Regele Cenușiu': ['regele-cenusiu', '#e8eef2'] }
};
const tmnImg = n => (TMN.dg[n] ? `imagini/temnite/${TMN.dg[n]}.jpg` : null);
const tmnBoss = n => TMN.boss[n] || null;
const tmnStars = lv => { const n = lv < 4 ? 1 : lv < 13 ? 2 : lv < 24 ? 3 : lv < 38 ? 4 : 5;   /* după nivelul temniței (tăria monștrilor crește odată cu tine) */ return `<span class="dg-st" title="Dificultate ${n} din 5">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`; };
const tmnMat = g => (g.rm >= 3 ? 'cristale, esențe și calități rare' : g.rm == 2 ? 'cristale rare, calități medii' : 'cristale comune');

/* ------------------------------------------------------------------ COBORÂREA */
function vDung() {
  const list = DG.map((g, i) => [g, i]).filter(([g]) => !g.ev).sort((a, b) => a[0].lv - b[0].lv);
  const openEntry = list.find(([g, i]) => S.lvl >= g.lv && typeof dOpen === 'function' && dOpen(i));
  if (openEntry) return typeof trPage === 'function' ? trPage(openEntry[1]) : '';   /* pagina dedicată, odată intrat */
  const open = list.filter(([g]) => S.lvl >= g.lv), rec = open.length ? open[open.length - 1][1] : -1;
  const card = ([g, i]) => {
    const lock = S.lvl < g.lv, b = tmnBoss(g.bn), img = tmnImg(g.n);
    return `<div class="dg-card${i === rec ? ' rec' : ''}${lock ? ' lock' : ''}">`
      + `<div class="dg-img">${img ? `<img class="dg-bg" src="${img}" alt="" loading="lazy" onerror="this.remove()">` : ''}`
      + (i === rec ? '<span class="dg-tag">Recomandat</span>' : '') + (lock ? `<span class="dg-lock">🔒 nivel ${g.lv}</span>` : '')
      + (b ? `<span class="dg-boss" style="--aura:${b[1]}" title="Căpitan: ${g.bn}"><img src="imagini/monstri/${b[0]}.jpg" alt="" loading="lazy" onerror="this.parentNode.remove()"></span>` : '') + '</div>'
      + `<div class="dg-b"><div class="dg-h"><b>${g.n}</b>${tmnStars(g.lv)}</div><div class="mute dg-i">nivel ${g.lv} · ${g.rooms - 1} monștri + căpitan · căpitan: ${g.bn}</div><div class="mute dg-i">Pradă: ${tmnMat(g)}</div>${tmnCtr(g)}`
      + `${!lock ? `<button class="p dg-enter" onclick="dToggle(${i})">Intră</button>` : ''}</div></div>`;
  };
  const shown = list.filter(([g]) => S.lvl + 10 >= g.lv);   /* ca înainte: temnițele mult peste nivel rămân ascunse */
  if (typeof ST_SERVER !== 'undefined' && ST_SERVER === 'beta')
    return tmnHubBeta(open, rec, card, shown);
  return tmnEvent() + (typeof heroSoloControl==='function'?heroSoloControl():'') + `<section class="dg-sec"><h2>Temnițe</h2><div class="dg-grid">${shown.map(card).join('')}</div></section>`;
}
/* BETA — Coborâre ca o alegere principală + două activități compacte.
   Tot conținutul vechi rămâne accesibil. Nu modifică progres/recompense. */
function tmnHubToggle(event) {
  if (event && event.target && event.target.id === 'tmn-hub-all')
    TMN.showAll = !!event.target.open;
}
function tmnHubBeta(open, rec, card, shown) {
  const progressed = open.filter(([g,i]) => typeof dPos === 'function'
    && dPos(i,typeof trTier === 'function' ? trTier(i) : 0)>0);
  const current = progressed.length ? progressed[progressed.length-1] : open[open.length-1];
  let main = '';
  if (current) {
    const [g,i] = current, image = tmnImg(g.n), boss = tmnBoss(g.bn);
    const tier = typeof trTier === 'function' ? trTier(i) : 0;
    const step = Math.max(0,Math.min(g.rooms-1,typeof dPos==='function' ? Number(dPos(i,tier))||0 : 0));
    const progress = Math.round(step / Math.max(1,g.rooms) * 100);
    main = `<section class="cb-feature">
      <div class="cb-feature-art">${image?'<img src="'+image+'" alt="" loading="lazy" onerror="this.remove()">':''}
        <span class="cb-feature-tag">${step>0?'În desfășurare':'Recomandată pentru tine'}</span>
        ${boss?'<img class="cb-feature-boss" src="imagini/monstri/'+boss[0]+'.jpg" alt="" loading="lazy" onerror="this.remove()">':''}
      </div>
      <div class="cb-feature-info"><small class="cb-eyebrow">AVENTURA PRINCIPALĂ</small><h3>${g.n}</h3>
        <p class="mute">Nivel ${g.lv} · ${g.rooms-1} monștri și un căpitan</p>
        <div class="cb-progress-top"><span>Progresul tău</span><strong>${step+1} / ${g.rooms}</strong></div>
        <div class="cb-progress" role="progressbar" aria-label="Progresul temniței" aria-valuemin="0" aria-valuemax="${g.rooms}" aria-valuenow="${step}"><i style="width:${progress}%"></i></div>
        <p class="cb-loot">Pradă: ${tmnMat(g)}</p>
        <button class="p cb-action" onclick="dToggle(${i})">⚔ ${step?'Continuă aventura':'Intră în temniță'}</button>
      </div>
    </section>`;
  } else {
    main = '<section class="cb-feature cb-feature-empty"><h3>Pregătește-ți eroul</h3><p>Prima temniță va apărea aici când atingi nivelul necesar.</p></section>';
  }
  const eIndex = DG.findIndex(g=>g.ev);
  let relic = '';
  if (eIndex>=0) {
    const g=DG[eIndex],e=evs(),image=tmnImg(g.n),ok=S.lvl>=g.lv;
    const keys = [0,1,2].map(k=>'<span class="'+(k<e.k?'cb-key-on':'cb-key-off')+'">🗝</span>').join('');
    relic = `<article class="cb-mini cb-relic">
      <div class="cb-mini-visual">${image?'<img src="'+image+'" alt="" loading="lazy" onerror="this.remove()">':''}<span>RELICVĂ SĂPTĂMÂNALĂ</span></div>
      <div class="cb-mini-body"><h3>${g.n}</h3>
        <p class="mute">3 chei pe săptămână · 60% șansă de relicvă la căpitan</p>
        <div class="cb-keyline">${keys}<span>${e.k}/3 chei disponibile</span></div>
        <button class="p cb-action" onclick="startD(${eIndex})" ${ok&&e.k>0?'':'disabled'}>${!ok?'Disponibil de la nivelul '+g.lv:e.k>0?'Intră · 1 cheie':'Fără chei disponibile'}</button>
        <details class="cb-info"><summary>ⓘ Reguli și recompense</summary><p>Fără puncte la intrare și la căpitan. O cheie se consumă la începutul incursiunii; cheile se reînnoiesc săptămânal. Căpitan: ${g.bn}. Următoarea reînnoire în ${evLeft()} ${evLeft()===1?'zi':'zile'}.</p></details>
      </div>
    </article>`;
  }
  let tower = '';
  if (typeof TWR !== 'undefined' && typeof twSt === 'function') {
    const t=twSt(),lock=S.lvl<TWR.lv,available=typeof twLeft==='function'?twLeft():0;
    const canStart=!lock&&available>0&&S.pts>=TWR.cost;
    tower = `<article class="cb-mini cb-tower">
      <div class="cb-mini-visual"><img src="imagini/lume/turn.webp" alt="" loading="lazy" onerror="this.remove()"><span>PROVOCARE ENDGAME</span></div>
      <div class="cb-mini-body"><h3>Turnul</h3>
        <p class="mute">100 de etaje · record ${t.best?'etajul '+t.best:'—'}</p>
        <p class="cb-mini-stat">${lock?'Se deschide la nivelul '+TWR.lv:available+' / '+TWR.day+' urcări rămase astăzi'}</p>
        <button class="p cb-action" onclick="twEnter()" ${canStart?'':'disabled'}>${lock?'Blocat · nivel '+TWR.lv:available<=0?'Încercări epuizate':'Intră · '+TWR.cost+' puncte'}</button>
        ${!lock?`<details class="cb-info"><summary>ⓘ Etaje, puncte de control și legendare</summary>
          ${typeof twProgress==='function'?twProgress(t):''}
          ${typeof twStartControls==='function'?twStartControls(t):''}
          ${typeof twLgRow==='function'?twLgRow(t):''}
          <p>Recordul deblochează treptele superioare de Fierărie. Etajele sărite de la punctele de control nu acordă recompense.</p>
        </details>`:''}
      </div>
    </article>`;
  }
  return '<div class="cb-hub">'+main+
    (typeof heroSoloControl==='function'?'<div class="cb-party-option">'+heroSoloControl()+'</div>':'')+
    '<div class="cb-options">'+relic+tower+'</div>'+
    `<details id="tmn-hub-all" class="cb-all" ontoggle="tmnHubToggle(event)" ${TMN.showAll?'open':''}>
      <summary><span><b>Toate temnițele</b><small>Alege altă temniță sau verifică ce urmează să deblochezi</small></span><span class="cb-all-count">${shown.length} disponibile în listă ▾</span></summary>
      <div class="dg-grid">${shown.map(card).join('')}</div>
    </details>`+'</div>';
}
/* pe card: ce clasă contracarează căpitanul (trepte.js: TR_C) și dacă o ai în echipă */
function tmnCtr(g) {
  const D = typeof trDef === 'function' && trDef(g.n), c = D && typeof TR_C !== 'undefined' && TR_C[D.a]; if (!c) return '';
  const on = S.fs.some(f => f.c === c), any = [...S.fs, ...S.rs].some(f => f.c === c);
  return `<div class="dg-i dg-ctr${on ? ' on' : ''}" title="${tEsc(TR_A[D.a])}">${on ? '✔' : '⚑'} Căpitanul e mai slab contra: <b>${c}</b>${on ? '' : any ? ' (e în rezervă)' : ''}</div>`;
}
function tmnEvent() {
  const i = DG.findIndex(g => g.ev); if (i < 0) return '';
  const g = DG[i], e = evs(), ok = S.lvl >= g.lv, b = tmnBoss(g.bn), img = tmnImg(g.n), keys = [0, 1, 2].map(k => `<i class="${k < e.k ? 'on' : ''}">🗝</i>`).join('');
  return `<section class="dg-ev"><div class="dg-img">${img ? `<img class="dg-bg" src="${img}" alt="" loading="lazy" onerror="this.remove()">` : ''}<span class="dg-tag ev">Eveniment săptămânal</span>${b ? `<span class="dg-boss big" style="--aura:${b[1]}"><img src="imagini/monstri/${b[0]}.jpg" alt="" loading="lazy" onerror="this.parentNode.remove()"></span>` : ''}</div>`
    + `<div class="dg-b"><div class="dg-h"><b>${g.n}</b>${tmnStars(13)}</div><div class="dg-keys">${keys}<span class="mute">${e.k} din 3 chei · se refac în ${evLeft()} ${evLeft() == 1 ? 'zi' : 'zile'}</span></div>`
    + `<div class="mute dg-i"><b class="dg-free">Fără puncte la intrare</b>: cere doar o cheie, iar căpitanul nu costă nimic; vindecarea între camere costă tot 2 puncte. Căpitan: ${g.bn}; la el ai 60% șansă la o relicvă de nivelul tău.</div>`
    + `<button class="p" onclick="startD(${i})"${ok && e.k > 0 ? '' : ' disabled'}>Intră (1 cheie)${ok ? '' : ', nivel ' + g.lv}</button></div></section>`;
}

/* ------------------------------------------------------------------ CĂPITANUL ÎN LUPTĂ */
/* cardul unui inamic; căpitanii cu portret primesc prezentarea de boss */
function enCard(e, i, t) {
  const st = `${e.bl ? ' · sângerează' : ''}${e.st ? ' · amețit' : ''}${e.bu ? ' · arde' : ''}${e.po ? ' · otrăvit' : ''}`;
  const b = e.b && tmnBoss(e.n);
  const mimg = !e.c && typeof monImg === 'function' ? monImg(e.n) : null;
  if (!b) return `<button class="en${t ? ' t' : ''}${e.c || mimg ? ' en-c' : ''}" onclick="tgt(${i})">${e.c && typeof av === 'function' ? `<span class="en-av">${av({ n: e.n, c: e.c, ic: e.ic }, 34)}</span>` : mimg ? `<span class="en-av"><img src="${mimg}" alt="" loading="lazy" onerror="const r=this.closest('.en');this.parentNode.remove();if(r)r.classList.remove('en-c')"></span>` : ''}${e.n}${e.c ? ` <small class="mute">${e.c === 'Campion' ? 'erou' : e.c}</small>` : ''}${st}${bar(e.hp, e.mh, 'e')}<span class="mute">${e.hp}/${e.mh} viață</span></button>`;
  const hit = e._ph != null && e.hp < e._ph, low = e.hp / e.mh < 0.3; e._ph = e.hp;
  return `<button class="en en-boss${t ? ' t' : ''}${hit ? ' hit' : ''}${low ? ' low' : ''}" style="--aura:${low ? '#ff3b30' : b[1]}" onclick="tgt(${i})" aria-label="${e.n}, căpitanul temniței, ${e.hp} din ${e.mh} viață">`
    + `<span class="eb-por"><span class="eb-ring"></span><img src="imagini/monstri/${b[0]}.jpg" alt="" onerror="this.style.display='none'">${'<i class="eb-em"></i>'.repeat(6)}</span>`
    + `<span class="eb-tx"><small class="eb-tag">♛ Căpitanul temniței</small><b>${e.n}</b><span class="eb-st">${st.replace(/^ · /, '')}</span>${bar(e.hp, e.mh, 'e')}<span class="mute">${e.hp}/${e.mh} viață</span></span></button>`;
}
/* portret mic pe „Poarta căpitanului” */
function bossMini(n) { const b = tmnBoss(n); return b ? `<span class="eb-mini" style="--aura:${b[1]}" title="${n}"><img src="imagini/monstri/${b[0]}.jpg" alt="" onerror="this.parentNode.remove()"></span>` : ''; }

/* ------------------------------------------------------------------ STILURI */
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.dg-ctr{font-size:12.5px;color:#f0b07b}.dg-ctr.on{color:#9be0a6}


/* BETA hub: o alegere principală, două provocări compacte și lista extensibilă.
   Scoped la .cb-*; stilurile din Temnițe/Turn/LIVE rămân neschimbate. */
.cb-hub{display:flex;flex-direction:column;gap:13px}
.cb-feature{display:grid;grid-template-columns:minmax(175px,33%) minmax(0,1fr);overflow:hidden;border:1px solid var(--gold);border-radius:12px;background:linear-gradient(120deg,#1c211e,#111617);box-shadow:0 5px 22px #0005}
.cb-feature-art{position:relative;min-height:205px;background:radial-gradient(circle at 40% 40%,#4b3b2a,#101517);overflow:hidden}
.cb-feature-art>img:not(.cb-feature-boss){width:100%;height:100%;position:absolute;inset:0;object-fit:cover}
.cb-feature-art:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,#0e1315aa,transparent 65%);pointer-events:none}
.cb-feature-tag{position:absolute;z-index:1;top:11px;left:11px;font-size:11px;font-weight:700;letter-spacing:.02em;border-radius:12px;padding:4px 9px;background:var(--gold2);color:#1b160c}
.cb-feature-boss{position:absolute;z-index:1;bottom:10px;right:10px;width:66px;height:66px;object-fit:cover;border:2px solid var(--gold2);border-radius:50%;box-shadow:0 3px 12px #0009}
.cb-feature-info{padding:17px 19px;display:flex;flex-direction:column;justify-content:center;gap:6px;min-width:0}
.cb-feature-info h3,.cb-mini h3{margin:0;color:var(--ink);font:700 clamp(18px,2.3vw,23px) Cinzel,serif}
.cb-eyebrow{color:var(--gold2);letter-spacing:.12em;font-size:10px;font-weight:800}
.cb-feature-info p,.cb-mini p{margin:0;font-size:13px}
.cb-progress-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:9px;font-size:12px;color:var(--mute)}
.cb-progress-top strong{color:var(--ink)}
.cb-progress{height:8px;border:1px solid #ffffff21;border-radius:7px;overflow:hidden;background:#080d10}
.cb-progress i{display:block;height:100%;background:linear-gradient(90deg,#9a7035,var(--gold2));border-radius:7px}
.cb-loot{margin:6px 0!important}
.cb-action{align-self:flex-start;min-width:144px;margin-top:4px}
.cb-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.cb-mini{min-width:0;overflow:hidden;display:flex;flex-direction:column;border:1px solid var(--line);border-radius:12px;background:#11181b}
.cb-mini.cb-relic{border-color:#5cc8ff66}
.cb-mini-visual{position:relative;height:106px;overflow:hidden;background:#1a252a}
.cb-mini-visual img{width:100%;height:100%;object-fit:cover;display:block;filter:brightness(.8)}
.cb-mini-visual span{position:absolute;left:10px;bottom:9px;letter-spacing:.08em;font-weight:800;font-size:10px;color:#fff;text-shadow:0 1px 6px #000}
.cb-mini-body{padding:12px 14px 13px;display:flex;flex-direction:column;gap:8px;flex:1}
.cb-mini-body h3{font-size:18px}
.cb-mini-body .cb-action{margin-top:auto}
.cb-keyline{display:flex;gap:3px;align-items:center;font-size:12px}
.cb-keyline span:last-child{margin-left:6px;color:var(--mute)}
.cb-key-off{opacity:.25;filter:grayscale(1)}
.cb-mini-stat{color:var(--gold2)}
.cb-info{border-top:1px solid #ffffff18;padding-top:8px;font-size:12px;color:var(--mute)}
.cb-info summary{cursor:pointer;color:var(--gold2)}
.cb-info[open]>summary{margin-bottom:9px}
.cb-info .tw-progress,.cb-info .tw-lg{margin:8px 0}
.cb-all{border:1px solid var(--line);border-radius:11px;background:#111619}
.cb-all>summary{cursor:pointer;padding:15px 17px;display:flex;align-items:center;justify-content:space-between;gap:12px;list-style:none}
.cb-all>summary::-webkit-details-marker{display:none}
.cb-all>summary span:first-child{display:flex;flex-direction:column;gap:3px}
.cb-all>summary b{font-family:Cinzel,serif;color:var(--ink)}
.cb-all>summary small,.cb-all-count{font-size:12px;color:var(--mute)}
.cb-all[open]>summary{border-bottom:1px solid var(--line)}
.cb-all>.dg-grid{padding:12px}
.cb-party-option{font-size:12px}
.cb-head{padding:13px 17px!important;margin:0 0 12px!important}
.cb-head-title{display:flex;justify-content:space-between;gap:14px;align-items:start}
.cb-head h2{margin:2px 0 4px!important}
.cb-head p{margin:0;font-size:13px}
.cb-head details{max-width:360px;font-size:12px;color:var(--mute);text-align:right}
.cb-head details summary{cursor:pointer;color:var(--gold2)}
.cb-head details[open]{max-width:480px}
@media(max-width:640px){.cb-feature{grid-template-columns:1fr}.cb-feature-art{min-height:150px;max-height:165px}.cb-feature-info{padding:12px 13px}.cb-options{grid-template-columns:1fr}.cb-mini-visual{height:84px}.cb-head-title{flex-direction:column}.cb-head details{text-align:left}.cb-all-count{font-size:11px}}

/* BETA · gestionarea rapida a mercenarilor la Coborare. */
.cb-party-manage{border:1px solid #65512e;border-radius:10px;background:#101719;padding:9px 11px;display:flex;flex-direction:column;gap:7px}
.cb-party-manage-top{display:flex;flex-wrap:wrap;align-items:center;gap:7px}
.cb-party-manage-top>div{flex:1;min-width:155px;display:flex;flex-direction:column;gap:2px}
.cb-party-manage-top b{font:700 13px Cinzel,Georgia,serif;color:#e9c77b}
.cb-party-manage-top small{font-size:11px;color:var(--mute)}
.cb-party-manage-top button,.cb-party-reserve button{padding:5px 9px;min-height:32px;font-size:12px}
.cb-party-reserves{display:flex;flex-wrap:wrap;gap:6px}
.cb-party-reserve{display:flex;align-items:center;gap:6px;min-width:0;border:1px solid #443b31;border-radius:8px;padding:4px 7px;background:#161b1d}
.cb-party-reserve b{font-size:12px;color:var(--ink);max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cb-party-reserve small{font-size:10px;color:var(--mute);white-space:nowrap}
.cb-party-reserve button{margin-left:auto}
.cb-party-reserve button:disabled{opacity:.55}
@media(max-width:640px){.cb-party-reserves{display:grid;grid-template-columns:1fr}.cb-party-reserve{width:100%}.cb-party-reserve b{max-width:40vw}}

.dg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
.dg-card{display:flex;flex-direction:column;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#101416;box-shadow:0 6px 18px #0009;transition:transform .15s,border-color .15s}
.dg-card:hover{transform:translateY(-2px);border-color:var(--gold)}
.dg-card.rec{border-color:var(--gold2);box-shadow:0 0 0 1px var(--gold2),0 0 22px #f0d27a40,0 6px 18px #0009}
.dg-img{position:relative;aspect-ratio:16/9;background:radial-gradient(ellipse at 50% 40%,#2a3236,#0b0e10)}
.dg-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.dg-img::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 45%,#101416f2 100%);pointer-events:none}
.dg-card.lock .dg-img{filter:grayscale(.85) brightness(.55)}
.dg-tag{position:absolute;z-index:2;top:8px;left:8px;padding:2px 9px;border-radius:10px;font:700 12px Cinzel,serif;color:#1a1306;background:var(--gold2);box-shadow:0 0 10px #f0d27a88}
.dg-tag.ev{background:linear-gradient(90deg,#5cc8ff,#9fe3ff);color:#06202c;box-shadow:0 0 12px #5cc8ff88}
.dg-lock{position:absolute;z-index:2;top:50%;left:50%;transform:translate(-50%,-50%);padding:4px 12px;border-radius:12px;background:#000c;border:1px solid #ffffff30;font:700 14px Cinzel,serif;color:#e9e1cf}
.dg-boss{position:absolute;z-index:2;right:10px;bottom:-22px;width:58px;height:58px;border-radius:50%;overflow:hidden;border:2px solid var(--gold);box-shadow:0 0 0 2px #0b0e10,0 0 14px var(--aura)}
.dg-boss.big{width:74px;height:74px;bottom:-26px}
.dg-boss img{width:100%;height:100%;object-fit:cover}
.dg-card.lock .dg-boss{filter:grayscale(1) brightness(.6);box-shadow:0 0 0 2px #0b0e10}
.dg-b{display:flex;flex-direction:column;gap:3px;padding:10px 12px 12px;flex:1}
.dg-h{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding-right:62px}
.dg-h b{font:700 17px Cinzel,Georgia,serif;color:var(--ink)}
.dg-st{flex:none;color:var(--gold2);font-size:12px;letter-spacing:1px}.dg-st i{font-style:normal;color:#ffffff22}
.dg-i{font-size:13.5px;line-height:1.35}
.dg-b button{margin-top:auto;align-self:flex-start;min-width:110px}
.dg-b .dg-i+button{margin-top:8px}
.dg-ev{padding:0!important;overflow:hidden;border-color:#5cc8ff66!important;box-shadow:0 0 0 1px #5cc8ff44,0 0 26px #5cc8ff22!important}
.dg-ev .dg-img{aspect-ratio:21/7}
.dg-ev .dg-b{padding:12px 16px 14px}.dg-ev .dg-h{padding-right:84px}
.dg-free{color:#7fd88c}.en.en-c{display:grid;grid-template-columns:auto 1fr;column-gap:10px;align-items:center}.en .en-av img{width:34px;height:34px;border-radius:50%;object-fit:cover;display:block;box-shadow:0 0 0 1px #0006}.en.en-c .en-av{grid-row:span 3}.en.en-c>.bar,.en.en-c>.mute,.en.en-c>i{grid-column:2}.dg-acts{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.dg-tip{margin:2px 0 6px;font-size:13.5px}.dg-auto{border-top:1px dashed #ffffff1a;padding-top:8px}.dg-next span small{font-size:12.5px}
.dg-keys{display:flex;align-items:center;gap:4px;font-size:13.5px}.dg-keys i{font-style:normal;filter:grayscale(1) opacity(.35)}.dg-keys i.on{filter:drop-shadow(0 0 4px #5cc8ff)}.dg-keys span{margin-left:6px}
/* căpitanul în luptă */
.en-boss{display:flex!important;align-items:center;gap:14px;padding:10px 14px!important;margin:6px 0 10px!important;border:1px solid var(--gold)!important;border-radius:12px!important;background:radial-gradient(ellipse at 15% 50%,color-mix(in srgb,var(--aura) 14%,transparent),transparent 60%),linear-gradient(180deg,#221a12,#120e0a)!important;box-shadow:0 0 0 1px #000,0 0 18px color-mix(in srgb,var(--aura) 30%,transparent)!important}
.en-boss.t{border-color:var(--gold2)!important;box-shadow:0 0 0 2px var(--gold2),0 0 24px color-mix(in srgb,var(--aura) 45%,transparent)!important}
.eb-por{position:relative;flex:none;width:122px;height:122px;margin:4px}
.eb-por img{position:relative;z-index:2;width:100%;height:100%;border-radius:50%;object-fit:cover;border:2px solid var(--gold2);animation:ebBreath 3.2s ease-in-out infinite}
.eb-ring{position:absolute;z-index:1;inset:-7px;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 20%,var(--aura) 30%,transparent 42% 62%,var(--aura) 72%,transparent 84%);filter:blur(1px);opacity:.85;animation:ebSpin 5s linear infinite}
.eb-por::before{content:'';position:absolute;z-index:0;inset:-16px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--aura) 55%,transparent) 0,transparent 68%);animation:ebPulse 2.4s ease-in-out infinite}
.eb-em{position:absolute;z-index:3;bottom:8px;width:4px;height:4px;border-radius:50%;background:var(--aura);box-shadow:0 0 6px var(--aura);opacity:0;animation:ebRise 2.8s ease-out infinite}
.eb-em:nth-of-type(1){left:14%;animation-delay:0s}.eb-em:nth-of-type(2){left:30%;animation-delay:.5s}.eb-em:nth-of-type(3){left:48%;animation-delay:1.1s}
.eb-em:nth-of-type(4){left:64%;animation-delay:.3s}.eb-em:nth-of-type(5){left:80%;animation-delay:1.6s}.eb-em:nth-of-type(6){left:40%;animation-delay:2.1s}
.eb-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;text-align:left}
.eb-tag{font:700 11.5px Cinzel,serif;letter-spacing:.06em;color:var(--gold2);text-shadow:0 0 8px #f0d27a66}
.eb-tx b{font:700 19px Cinzel,Georgia,serif;color:#fff;text-shadow:0 0 10px color-mix(in srgb,var(--aura) 60%,transparent)}
.eb-st{font-size:13px;color:#e8837b;min-height:1em}
.en-boss.hit .eb-por{animation:ebHit .45s ease}
.en-boss.hit .eb-por img{box-shadow:0 0 0 3px #ff3b30aa}
.en-boss.low .eb-ring{animation-duration:1.8s}.en-boss.low .eb-por::before{animation-duration:1s}
.eb-mini{display:inline-block;vertical-align:middle;width:30px;height:30px;margin-right:8px;border-radius:50%;overflow:hidden;border:1.5px solid var(--gold);box-shadow:0 0 8px var(--aura)}
.eb-mini img{width:100%;height:100%;object-fit:cover}
@keyframes ebSpin{to{transform:rotate(360deg)}}
@keyframes ebPulse{0%,100%{opacity:.55;transform:scale(.94)}50%{opacity:1;transform:scale(1.05)}}
@keyframes ebBreath{0%,100%{transform:scale(1)}50%{transform:scale(1.03)}}
@keyframes ebRise{0%{opacity:0;transform:translateY(0) scale(.6)}15%{opacity:1}100%{opacity:0;transform:translateY(-70px) scale(1.1)}}
@keyframes ebHit{0%,100%{transform:none}20%{transform:translateX(-5px) rotate(-2deg)}40%{transform:translateX(5px) rotate(2deg)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
@media (max-width:600px){.dg-grid{grid-template-columns:1fr}.eb-por{width:84px;height:84px}.eb-tx b{font-size:17px}.dg-ev .dg-img{aspect-ratio:16/8}}
@media (prefers-reduced-motion:reduce){.eb-ring,.eb-por::before,.eb-por img,.eb-em,.en-boss.hit .eb-por{animation:none!important}.eb-em{display:none}}
`;
  document.head.appendChild(st);
})();
