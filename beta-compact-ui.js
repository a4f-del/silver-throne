/* Silver Throne — navigare compacta BETA, numai prezentare.
   LIVE si logica de joc raman neschimbate. */
const stCompactActive = () => typeof ST_SERVER !== 'undefined' && ST_SERVER === 'beta';
const stCompactAvailable = () => !(typeof adventureActive === 'function' && adventureActive());
/* Tronul are un singur punct de acces: stânga. Starea vine din răspunsul serverului,
   nu dintr-o estimare de luptă și nu generează cereri noi la fiecare randare. */
function stTronSidebarState() {
  const state = typeof TRON !== 'undefined' && TRON ? TRON.st : null;
  const me = state && state.me;
  if (!me) return null;
  const pending = Array.isArray(me.pending) ? me.pending.length : 0;
  const holder = state.holder;
  const eligible = typeof TT === 'undefined' || !TT.CFG || S.lvl >= TT.CFG.minLevel;
  const canChallenge = !!me.can_challenge && eligible;
  const left = Number(state.week_end) - (typeof tronNow === 'function' ? tronNow() : Date.now());
  const time = Number.isFinite(left) && left > 0 && typeof sdT === 'function' ? sdT(left) : '';
  if (pending) return {kind:'hot',line:'🎁 Premiu de revendicat',detail: pending + (pending === 1 ? ' premiu disponibil' : ' premii disponibile')};
  if (!holder) return {kind:canChallenge?'hot':'quiet',line:'Tronul este liber',detail:canChallenge?'⚔ Poți provoca acum':(time?'Se închide în '+time:'Garda Regală îl apără')};
  if (String(holder.user_id) === String(me.user_id))
    return {kind:'king',line:'👑 Tu deții Tronul',detail:time?'Se închide în '+time:'Regele săptămânii'};
  const name = String(holder.name || 'Regele').trim().slice(0,22);
  return {kind:canChallenge?'hot':'holder',line:'👑 '+name+' ține Tronul',
    detail:canChallenge?'⚔ Provoacă acum':(time?'Se închide în '+time:'Vezi deținătorul')};
}
function stCompactNav() {
  const throne = stTronSidebarState();
  return TEMA_NAV.filter(([k]) => k !== 'e').map(([k, name, icon]) => {
    const status = k === 'r' ? throne : null;
    const statusClass = status ? ' st-tron-' + status.kind : '';
    const label = status
      ? '<span class="st-tron-nav-lines"><span class="st-tron-title">' + name + navBadge(k) +
        '</span><small class="st-tron-owner">' + (typeof tEsc === 'function' ? tEsc(status.line) : status.line) +
        '</small><small class="st-tron-detail">' + (typeof tEsc === 'function' ? tEsc(status.detail) : status.detail) + '</small></span>'
      : '<span>' + name + navBadge(k) + '</span>';
    return '<button class="' + (temaOn(k) ? 'on' : '') + (k === 'r' ? ' tr st-tron-nav' + statusClass : '') +
      '" onclick="tab(\'' + k + '\')"><span class="ni">' + icon + '</span>' + label + '</button>';
  }).join('');
}
function stCompactHeroGo(t) {
  if (!stCompactAvailable()) return;
  const hero = S.fs.findIndex(f => f.h);
  S.sel = Math.max(0, hero);
  tmTab = t === 'inv' ? 'inv' : 'eq';
  S.tab = 'e'; S.msg = ''; go();
}
function stCompactToggleAccount() {
  if (!stCompactAvailable()) return;
  const b = document.getElementById('auth-toggle');
  if (b) b.click();
}
function stCompactHdr() {
  const hero = S.fs.find(f => f.h) || S.fs[0];
  const nd = need(S.lvl);
  const hurt = typeof navBadge === 'function' ? navBadge('e') : '';
  const locked = !stCompactAvailable();
  const botOn = !!(S.prem && S.bt && S.bt.on);
  const fxOn = !S.fxInstant;
  const fxLock = typeof C === 'function' && C('w') === 0;
  const act = locked ? ' disabled' : '';
  const res = '<div class="st-hres">' +
    '<span class="st-res" title="Puncte de aventură">' + IC.p + '<b id="pp">' + S.pts + '/' + MXP() + '</b><small id="pt">' + (S.bp > 0 ? 'rezervă +' + S.bp : 'Puncte') + '</small></span>' +
    '<span class="st-res" title="Aur">' + IC.g + '<b>' + S.gold + '</b></span>' +
    '<span class="st-res" title="Minereu">' + IC.o + '<b>' + S.ore + '</b></span></div>';
  const mail = locked ? '' : (typeof wmHeader === 'function' ? wmHeader() : '');
  const fight = '<button class="st-icon-action" type="button" onclick="bhOpen()" title="Istoricul luptelor" aria-label="Lupte"' + act + '>⚔</button>';
  const heroMenu = '<details class="st-drop st-hero-drop"><summary title="Erou și echipă" aria-label="Meniu erou">' +
    '<span class="st-hero-av">' + av(hero, 35) + '</span><span class="st-hero-level">' + S.lvl + '</span>' + hurt +
    '<span class="st-drop-caption">Erou</span></summary><div class="st-drop-panel">' +
    '<div class="st-drop-head"><b>' + tEsc(hero.n) + '</b><small>Nivel ' + S.lvl + ' · ' + S.xp + '/' + nd + ' exp.</small></div>' +
    '<button onclick="stCompactHeroGo(\'eq\')" ' + act + '>⚔ Echipă și echipament</button>' +
    '<button onclick="stCompactHeroGo(\'inv\')" ' + act + '>🎒 Inventar</button>' +
    (locked ? '' :
      '<button onclick="tab(\'k\')">🏆 Clasament</button>' +
      (typeof wfHeader === 'function' ? '<div class="st-social-link">' + wfHeader() + '</div>' : '') +
      (typeof guildHeader === 'function' ? '<div class="st-social-link">' + guildHeader() + '</div>' : '') +
      '<button onclick="stCompactToggleAccount()">👑 Cont și profil</button>') +
    '</div></details>';
  const settings = '<details class="st-drop st-settings"><summary title="Setări rapide" aria-label="Setări rapide">⚙</summary>' +
    '<div class="st-drop-panel st-settings-panel"><div class="st-drop-head"><b>Setări rapide</b></div>' +
    '<button ' + act + ' onclick="' + (S.prem ? "btog('on')" : "tab('a');vil('q')") + '">🤖 Bot · ' + (S.prem ? (botOn ? 'pornit' : 'oprit') : 'premium') + '</button>' +
    '<button ' + (locked || fxLock ? 'disabled' : '') + ' onclick="fxToggleInstant()">⚔ Redare lupte · ' + (fxOn || fxLock ? 'pornită' : 'oprită') + '</button>' +
    '</div></details>';
  return res + '<div class="st-hquick">' + mail + fight + heroMenu + settings + '</div>';
}
/* Evenimentele raman vizibile, dar explicatiile nu imping aventura sub fold. */
function stCompactEvent() {
  if (typeof rtBanner !== 'function') return '';
  if (typeof S === 'undefined' || !S || S.d || !(S.tab === 'c' || (S.tab === 'a' && !S.vil))) return '';
  if (typeof ghActive === 'function' && ghActive()) return '';
  const gold = rtGold(), start = rtStart(), now = rtNow(), week = rtWeek();
  const left = gold ? start + 3600e3 - now : start - now;
  const clock = left <= 3600e3 ? '<span data-end="' + (Date.now() + left) + '">' + fmt(left) + '</span>' : sdT(left);
  return '<details class="st-event' + (gold ? ' on' : '') + '"><summary>' +
    '<span><b>⚡ ' + (gold ? 'Ora de aur activă' : 'Ora de aur') + '</b> · ' + week.n + '</span>' +
    '<span class="st-event-time">' + (gold ? 'mai ai ' : 'începe în ') + clock + ' <span aria-hidden="true">⌄</span></span>' +
    '</summary><div class="st-event-detail"><div>' + (gold ? 'Punctele se refac de ' + RT.mult + '×.' : 'Interval: ' + RT.h + ':00–' + (RT.h + 1) + ':00 (ora României).') + '</div>' +
    '<div>' + week.d + '</div><small>Modificatorul se schimbă vineri la 15:00, odată cu Tronul. Bonusul orei de aur se pierde dacă bara de puncte e plină.</small></div></details>';
}
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const css = document.createElement('style');
  css.textContent = `
body.st-compact header{gap:10px;padding-right:12px!important}
body.st-compact header h1{font-size:18px;letter-spacing:.04em}
body.st-compact header .hs{gap:10px;justify-content:flex-end}
body.st-compact #hdr-act{display:none!important}
/* Un singur Tron, în navigația din stânga. Informații server fără banner redundant în Sat. */
body.st-compact nav button.st-tron-nav{position:relative;align-items:center;min-width:0}
body.st-compact nav button.st-tron-nav .ni{flex:none}
body.st-compact .st-tron-nav-lines{display:flex;flex-direction:column;align-items:flex-start;gap:1px;min-width:0;flex:1;text-align:left;line-height:1.18}
body.st-compact .st-tron-title{font:700 15px Cinzel,Georgia,serif;white-space:nowrap}
body.st-compact .st-tron-owner,body.st-compact .st-tron-detail{display:block;width:100%;font:400 11px/1.25 Alegreya,Georgia,serif;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;color:#d6c39a}
body.st-compact .st-tron-detail{color:#a89c81}
body.st-compact nav button.st-tron-nav.st-tron-holder:not(.on){border-color:#9d7e32;box-shadow:inset 3px 0 #b69a4a,0 0 10px #c9a24b19}
body.st-compact nav button.st-tron-nav.st-tron-hot:not(.on){border-color:#d6ab50;box-shadow:inset 4px 0 #e9c76e,0 0 14px #e3b74c44;background:linear-gradient(180deg,#423316,#1d180c)}
body.st-compact nav button.st-tron-nav.st-tron-hot .st-tron-detail{color:#f6da8f}
body.st-compact nav button.st-tron-nav.st-tron-king:not(.on){border-color:#e1bf63;box-shadow:inset 4px 0 #efd585,0 0 13px #e9cd6b40}
body.st-compact nav button.st-tron-nav:focus-visible{outline:2px solid #f0d27a;outline-offset:3px}
@media(max-width:959px){
 body.st-compact .st-tron-owner,body.st-compact .st-tron-detail{display:none}
 body.st-compact .st-tron-title{font-size:inherit}
}
body.st-compact .st-hres,body.st-compact .st-hquick{display:flex;align-items:center;gap:8px}
body.st-compact .st-hres{margin-right:auto;min-width:0}
body.st-compact .st-res{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;border:1px solid var(--line);border-radius:8px;background:#10171a;padding:5px 9px;line-height:1.1}
body.st-compact .st-res svg{width:24px;height:24px}
body.st-compact .st-res b{font:700 15px Alegreya,Georgia,serif}
body.st-compact .st-res small{font-size:11px;color:var(--mute)}
body.st-compact .st-icon-action,body.st-compact .st-drop>summary,body.st-compact .st-hquick .wm-open{display:inline-flex;align-items:center;justify-content:center;min-width:41px;height:39px;padding:6px 9px;border:1px solid var(--line);border-radius:8px;background:linear-gradient(180deg,#252b2e,#111619);color:var(--gold2);font-size:20px;box-shadow:none;cursor:pointer}
body.st-compact .st-hquick .wm-word{display:none}
body.st-compact .st-hquick .wm-open{position:relative}
body.st-compact .st-drop{position:relative;flex:none}
body.st-compact .st-drop>summary{list-style:none;user-select:none}
body.st-compact .st-drop>summary::-webkit-details-marker{display:none}
body.st-compact .st-drop[open]>summary{border-color:var(--gold2);background:#322a19}
body.st-compact .st-hero-drop>summary{gap:6px;min-width:76px;padding:3px 7px;font-size:13px}
body.st-compact .st-hero-av{width:35px;height:35px;display:inline-flex;align-items:center;justify-content:center}
body.st-compact .st-hero-av .avw{flex:none}
body.st-compact .st-hero-level{font:700 14px Cinzel,serif}
body.st-compact .st-drop-caption{font:700 12px Cinzel,serif}
body.st-compact .st-hero-drop .nb{margin-left:0}
body.st-compact .st-drop-panel{position:absolute;right:0;top:calc(100% + 9px);z-index:10010;min-width:230px;max-width:calc(100vw - 24px);padding:10px;background:linear-gradient(180deg,#222b2f,#0e1417);border:1px solid var(--gold);border-radius:10px;box-shadow:0 14px 35px #000e}
body.st-compact .st-drop-head{display:flex;flex-direction:column;padding:6px 8px 10px;border-bottom:1px solid var(--line);margin-bottom:8px}
body.st-compact .st-drop-head b{font:700 15px Cinzel,serif;color:var(--gold2)}
body.st-compact .st-drop-head small{font-size:12px;color:var(--mute)}
body.st-compact .st-drop-panel>button,body.st-compact .st-social-link>button{display:flex;width:100%;gap:8px;align-items:center;justify-content:flex-start;padding:9px;border-radius:6px;margin:2px 0;text-align:left;font-size:14px;background:transparent;border:1px solid transparent;box-shadow:none}
body.st-compact .st-drop-panel>button:hover,body.st-compact .st-social-link>button:hover{background:#ffffff10;border-color:var(--gold)}
body.st-compact .st-social-link .wf-open,body.st-compact .st-social-link .guild-head{position:relative;min-height:40px;color:var(--ink);font:inherit}
body.st-compact .st-event{border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:10px;padding:0;margin:0 0 12px;background:linear-gradient(180deg,#1d2427,#13191b)}
body.st-compact .st-event.on{border-color:var(--gold2)}
body.st-compact .st-event>summary{display:flex;align-items:center;justify-content:space-between;gap:8px 15px;padding:10px 14px;cursor:pointer;font-size:14px;list-style:none}
body.st-compact .st-event>summary::-webkit-details-marker{display:none}
body.st-compact .st-event b{color:var(--gold2)}
body.st-compact .st-event-time{white-space:nowrap;color:var(--mute)}
body.st-compact .st-event-detail{padding:8px 14px 12px;border-top:1px solid var(--line);font-size:14px}
body.st-compact .st-event-detail>div{margin-bottom:3px}
body.st-compact .st-event-detail small{display:block;font-size:12px;color:var(--mute)}
@media(min-width:960px){
 body.st-compact nav{overflow-y:auto}
 body.st-compact nav .side{display:none!important}
 body.st-compact nav{gap:7px}
 body.st-compact nav button{padding:10px 12px}
}
@media(max-width:1100px){
 body.st-compact header h1 .hd-nm{display:none}
 body.st-compact .st-res{padding:4px 6px}
 body.st-compact .st-res svg{width:21px;height:21px}
 body.st-compact .st-res small{display:none}
}
@media(max-width:959px){
 body.st-compact header{padding-right:8px!important;gap:5px}
 body.st-compact header .hs{flex:1 1 auto;overflow:visible;min-width:0;justify-content:flex-end}
 body.st-compact header h1{font-size:14px}
 body.st-compact .st-hres{gap:4px}
 body.st-compact .st-hquick{gap:4px}
 body.st-compact .st-res{padding:4px}
 body.st-compact .st-res b{font-size:12px}
 body.st-compact .st-res svg{width:18px;height:18px}
 body.st-compact .st-icon-action,body.st-compact .st-drop>summary,body.st-compact .st-hquick .wm-open{min-width:33px;height:36px;padding:4px 6px}
 body.st-compact .st-drop-caption{display:none}
 body.st-compact .st-hero-drop>summary{min-width:52px}
}
@media(max-width:590px){
 body.st-compact header h1{display:none}
 body.st-compact header .hs{flex:1 1 100%}
 body.st-compact .st-res svg{width:16px;height:16px}
 body.st-compact .st-res b{font-size:11px}
 body.st-compact .st-hero-av{width:28px;height:28px;overflow:hidden}
 body.st-compact .st-hero-level{font-size:12px}
 body.st-compact .st-hero-drop>summary{min-width:47px}
 body.st-compact .st-event>summary{font-size:12px;padding:8px 10px}
}
body.st-adventure.st-compact .st-hquick{display:none!important}
`;
  document.head.appendChild(css);
})();
