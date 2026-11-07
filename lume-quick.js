/* Actiuni pe harta Lumii.
   BETA: meniu compact, ancorat de satul apasat. LIVE pastreaza meniul precedent.
   Refoloseste API-urile existente lwAttack, lwProfile, wnRaid; fara modificari de server. */
(function () {
  'use strict';
  let current = null;
  let currentAnchor = null;
  const beta = () => typeof ST_SERVER !== 'undefined' && ST_SERVER === 'beta';
  const map = () => document.querySelector('.lw-map');
  function close() {
    document.getElementById('lw-quick-actions')?.remove();
    current = null; currentAnchor = null;
  }
  function button(text, action, primary, disabled, label) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    if (primary) b.className = 'p';
    if (label) b.setAttribute('aria-label', label);
    b.disabled = !!disabled;
    b.addEventListener('click', event => {
      event.stopPropagation();
      if (b.disabled) return;
      close(); action();
    });
    return b;
  }
  function iconButton(icon, title, action, disabled, explanation) {
    const b = button(icon, action, false, disabled, title);
    b.className = 'lwqa-icon';
    b.title = explanation || title;
    const hint = document.createElement('span');
    hint.className = 'lwqa-text'; hint.textContent = title;
    b.appendChild(hint);
    return b;
  }
  function place(panel, target) {
    const host=map();
    if(!host||!target||!target.getBoundingClientRect)return;
    const H=host.getBoundingClientRect(),R=target.getBoundingClientRect();
    const padding=8,gap=8;
    const width=Math.min(228,Math.max(120,H.width-2*padding));
    panel.style.width=width+'px';
    // După inserare putem măsura înălțimea REALĂ a meniului, nu o valoare fixă.
    // Pe mobil aceasta variază în funcție de text și de numărul acțiunilor.
    const minCenter=width/2+padding,maxCenter=H.width-width/2-padding;
    const center=R.left+R.width/2-H.left;
    panel.style.left=Math.max(minCenter,Math.min(Math.max(minCenter,maxCenter),center))+'px';
    // Constrânge meniul la partea vizibilă a hărții și a ferestrei.
    const viewTop=Math.max(padding,padding-H.top);
    const viewBottom=Math.min(H.height-padding,
      (typeof window==='undefined'?H.height:window.innerHeight-H.top)-padding);
    const available=Math.max(1,viewBottom-viewTop);
    panel.style.maxHeight=Math.max(48,available)+'px';
    panel.style.overflowY='auto';
    const height=Math.min(panel.getBoundingClientRect().height||panel.offsetHeight||100,available);
    const above=R.top-H.top-gap,below=R.bottom-H.top+gap;
    const fitsAbove=above-height>=viewTop;
    const fitsBelow=below+height<=viewBottom;
    // Favorizăm sub sat când este sus; deasupra când satul este jos.
    const useBelow=fitsBelow&&(!fitsAbove||below-viewTop<above-viewTop)
      ||(!fitsAbove&&!fitsBelow&&viewBottom-below>=above-viewTop);
    const top=useBelow?Math.max(viewTop,Math.min(below,viewBottom-height)):
      Math.max(viewTop,Math.min(above-height,viewBottom-height));
    if(useBelow){
      panel.classList.add('lwqa-below');
      panel.style.top=top+'px';
    }else{
      panel.classList.remove('lwqa-below');
      // În modul "above" transform: translateY(-100%) este activ.
      panel.style.top=top+height+'px';
    }
  }
  function showBeta(kind, id, target) {
    const host = map();
    if (!host || !LUME.st) return;
    const key = kind + ':' + (id || '');
    if (current === key) { close(); return; }
    close();
    let title = '', detail = '';
    const actions = [];
    if (kind === 'village') {
      const p = LUME.st.players.find(p => String(p.id) === String(id));
      if (!p) return;
      const mine = !!(LUME.st.me && p.id === LUME.st.me.user_id);
      title = (mine ? 'Satul tău · ' : '') + p.name;
      detail = 'Nivel ' + p.level;
      if (!mine) {
        const can = lwCan(p);
        actions.push(iconButton('⚔', 'Atacă', () => lwAttack(p.id), !can.ok || !!LUME.busy,
          can.ok ? 'Atacă satul · 1 atac' : can.why.replace(/<[^>]*>/g, '')));
        if (!can.ok) detail += ' · Atac indisponibil';
      }
      actions.push(iconButton('👤', 'Profil', () => lwProfile(p.id), false));
      if (!mine) actions.push(iconButton('✉', 'Mesaj', () => wmCompose(p.id,p.name), false,
        'Trimite mesaj privat'));
    } else if (kind === 'npc') {
      const v = typeof wnList === 'function' && wnList().find(v => String(v.id) === String(id));
      if (!v) return;
      title = v.n + ' · NPC'; detail = 'Sat comun · nivel ' + v.lvl;
      const left = wnLeft(v);
      const why = left ? 'Disponibil peste ' + sdT(left) :
        S.d ? 'Termină mai întâi lupta' :
        S.pts < 1 ? 'Nu ai puncte' :
        !(S.fs || []).some(f => f.hp > 0) ? 'Echipa este căzută' : '';
      actions.push(iconButton('⚔', 'Jefuiește', () => wnRaid(v.id), !!why || !!WN.busy,
        why || 'Jefuiește · 1 punct'));
      if (left) detail += ' · ' + sdT(left);
    } else {
      // Tronul și Turnul păstrează acțiunile cunoscute.
      return showLegacy(kind, id);
    }
    const panel = document.createElement('div');
    panel.id = 'lw-quick-actions';
    panel.className = 'lw-quick-actions-panel lwqa-map';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Acțiuni: ' + title);
    const head = document.createElement('div'); head.className = 'lwqa-head';
    const name = document.createElement('strong'); name.textContent = title;
    const dismiss = button('×', close, false, false, 'Închide meniul');
    dismiss.className = 'lw-quick-close'; head.append(name, dismiss);
    const info = document.createElement('small'); info.textContent = detail;
    const buttons = document.createElement('div'); buttons.className = 'lw-quick-buttons';
    actions.forEach(b => buttons.appendChild(b));
    panel.append(head, info, buttons);
    host.appendChild(panel);
    current = key; currentAnchor = target;
    place(panel, target);
  }
  function showLegacy(kind, id) {
    const host = map();
    if (!host || typeof LUME === 'undefined' || !LUME.st) return;
    const key = kind + ':' + (id || '');
    if (current === key) { close(); return; }
    close();
    let title = '', detail = '';
    const actions = [];
    if (kind === 'village') {
      const p = LUME.st.players.find(v => String(v.id) === String(id));
      if (!p) return;
      const mine = !!(LUME.st.me && p.id === LUME.st.me.user_id);
      const can = mine ? null : lwCan(p);
      title = (mine ? 'Satul tău · ' : '') + p.name;
      detail = 'Nivel ' + p.level + ' · Putere ' + Math.round(p.power || 0).toLocaleString('ro-RO');
      if (!mine) {
        actions.push(button('⚔ Atacă · 1', () => lwAttack(p.id), true, !can.ok || LUME.busy));
        if (!can.ok) detail += ' · Atac indisponibil';
      }
      actions.push(button('Vezi profilul', () => lwProfile(p.id), false, false));
    } else if (kind === 'tower') {
      title = 'Turnul celor 100 de Niveluri';
      const best = (S.tw && S.tw.best) || 0;
      detail = '100 de etaje' + (best ? ' · Record: ' + best : '');
      actions.push(button('Deschide Turnul', () => { S.tab = 'c'; go(); }, true, false));
    } else if (kind === 'throne') {
      title = 'Tronul de Argint';
      detail = 'Competiția săptămânală';
      actions.push(button('Deschide Tronul', () => tab('r'), true, false));
    } else return;
    const panel = document.createElement('div');
    panel.id = 'lw-quick-actions';
    panel.className = 'lw-quick-actions-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Acțiuni pentru ' + title);
    const closeButton = button('×', close, false, false);
    closeButton.className = 'lw-quick-close';
    closeButton.setAttribute('aria-label', 'Închide meniul');
    const heading = document.createElement('strong'); heading.textContent = title;
    const info = document.createElement('small'); info.textContent = detail;
    const buttons = document.createElement('div'); buttons.className = 'lw-quick-buttons';
    actions.forEach(b => buttons.appendChild(b));
    panel.append(closeButton, heading, info, buttons);
    host.appendChild(panel);
    current = key;
  }
  function targetInfo(el) {
    const svg = el.closest && el.closest('#lwmap');
    if (!svg) return null;
    const player = el.closest('.lw-v[onclick*="lwPick"]');
    if (player) {
      const match = (player.getAttribute('onclick') || '').match(/lwPick\('([^']+)'\)/);
      if (match) return {kind:'village', id:match[1], el:player};
    }
    if (beta()) {
      const npc = el.closest('g[onclick*="wnPick"]');
      if (npc) {
        const match = (npc.getAttribute('onclick') || '').match(/wnPick\('([^']+)'\)/);
        if (match) return {kind:'npc', id:match[1], el:npc};
      }
    }
    if (el.closest('.lw-tr')) return {kind:'throne', id:null, el:el.closest('.lw-tr')};
    const tower = el.closest('g[onclick*="S.tab"]');
    if (tower && /Turnul/.test(tower.getAttribute('aria-label') || ''))
      return {kind:'tower', id:null, el:tower};
    return null;
  }
  document.addEventListener('click', event => {
    const host = map();
    if (!host) { current = null; return; }
    if (event.target.closest && event.target.closest('#lw-quick-actions')) return;
    const info = targetInfo(event.target);
    if (info) {
      event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
      if (beta()) showBeta(info.kind, info.id, info.el);
      else showLegacy(info.kind, info.id);
    } else if (current && event.target.closest && event.target.closest('.lw-map')) close();
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') { close(); return; }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const info = targetInfo(event.target);
    if (!info) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (beta()) showBeta(info.kind, info.id, info.el);
    else showLegacy(info.kind, info.id);
  }, true);
  // SVG viewBox is changed while dragging/zooming; close instead of leaving a menu floating in empty space.
  document.addEventListener('pointerdown', event => {
    if (current && event.target.closest && event.target.closest('#lwmap') &&
        !targetInfo(event.target)) close();
  }, true);
  document.addEventListener('wheel', event => {
    if (current && event.target.closest && event.target.closest('#lwmap')) close();
  }, {passive:true, capture:true});
  if (typeof window !== 'undefined') window.addEventListener('resize', close);
  if (typeof document !== 'undefined' && document.head) {
    const style = document.createElement('style');
    style.textContent = `
.lwqa-map{position:absolute;z-index:9;transform:translate(-50%,-100%);width:min(228px,calc(100% - 16px));box-sizing:border-box;line-height:1.25;padding:6px 8px;border:1px solid #c9a24b;border-radius:10px;background:#151c1fee;box-shadow:0 7px 24px #000b;backdrop-filter:blur(6px);animation:lwqa-in .18s ease-out}
.lwqa-map.lwqa-below{transform:translateX(-50%)}
.lwqa-head{display:flex;justify-content:space-between;align-items:center;gap:7px}
.lwqa-head strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11.5px;color:var(--gold2)}
.lwqa-map>small{display:block;color:var(--mute);font-size:9.5px;margin:1px 0 5px}
.lwqa-map .lw-quick-buttons{display:flex;justify-content:center;gap:7px}
.lwqa-map .lwqa-icon{min-width:50px;min-height:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;padding:3px 6px;border-radius:8px;font-size:18px;color:#f0d27a;border:1px solid #75603d;background:#253034;box-shadow:0 2px 7px #0006}
.lwqa-map .lwqa-icon:hover:not(:disabled){background:#354347;transform:translateY(-2px)}
.lwqa-map .lwqa-icon:disabled{opacity:.45;cursor:not-allowed}
.lwqa-map .lwqa-text{display:block;font-size:9.5px;white-space:nowrap}
.lwqa-map .lw-quick-close{border:0;background:transparent;box-shadow:none;font-size:23px;color:#d8c7a1;min-height:30px;padding:0 4px}
@keyframes lwqa-in{from{opacity:0}to{opacity:1}}
@media(prefers-reduced-motion:reduce){.lwqa-map{animation:none}.lwqa-map .lwqa-icon{transition:none}}
`;
    document.head.appendChild(style);
  }
})();