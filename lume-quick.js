/* Silver Throne — actiuni contextuale direct pe harta Lumii.
   Interceptam selectiile numai in SVG-ul Lumii; mecanicile sunt cele existente. */
(function () {
  'use strict';
  let current = null;
  function map() { return document.querySelector('.lw-map'); }
  function close() {
    const panel = document.getElementById('lw-quick-actions');
    if (panel) panel.remove();
    current = null;
  }
  function button(text, action, primary, disabled) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    if (primary) b.className = 'p';
    b.disabled = !!disabled;
    b.addEventListener('click', function (event) { event.stopPropagation(); close(); action(); });
    return b;
  }
  function show(kind, id) {
    const host = map();
    if (!host || typeof LUME === 'undefined' || !LUME.st) return;
    const key = kind + ':' + (id || '');
    if (current === key) { close(); return; }
    close();
    let title = '', detail = '';
    const actions = [];
    if (kind === 'village') {
      const p = LUME.st.players.find(function (v) { return String(v.id) === String(id); });
      if (!p) return;
      const mine = !!(LUME.st.me && p.id === LUME.st.me.user_id);
      const can = mine ? null : lwCan(p);
      title = (mine ? 'Satul tău · ' : '') + p.name;
      detail = 'Nivel ' + p.level + ' · Putere ' + Math.round(p.power || 0).toLocaleString('ro-RO');
      if (!mine) {
        actions.push(button('⚔ Atacă · 1', function () { lwAttack(p.id); }, true, !can.ok || LUME.busy));
        if (!can.ok) detail += ' · Atac indisponibil';
      }
      actions.push(button('Vezi profilul', function () { lwProfile(p.id); }, false, false));
    } else if (kind === 'tower') {
      title = 'Turnul celor 100 de Niveluri';
      const best = (S.tw && S.tw.best) || 0;
      detail = '100 de etaje' + (best ? ' · Record: ' + best : '');
      actions.push(button('Deschide Turnul', function () { S.tab = 'c'; go(); }, true, false));
    } else if (kind === 'throne') {
      title = 'Tronul de Argint';
      detail = 'Competiția săptămânală';
      actions.push(button('Deschide Tronul', function () { tab('r'); }, true, false));
    } else return;
    const panel = document.createElement('div');
    panel.id = 'lw-quick-actions';
    panel.className = 'lw-quick-actions-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Acțiuni pentru ' + title);
    const closeButton = button('×', close, false, false);
    closeButton.className = 'lw-quick-close';
    closeButton.setAttribute('aria-label', 'Închide meniul');
    const heading = document.createElement('strong');
    heading.textContent = title;
    const info = document.createElement('small');
    info.textContent = detail;
    const buttons = document.createElement('div');
    buttons.className = 'lw-quick-buttons';
    actions.forEach(function (b) { buttons.appendChild(b); });
    panel.append(closeButton, heading, info, buttons);
    host.appendChild(panel);
    current = key;
  }
  function targetInfo(el) {
    const svg = el.closest && el.closest('#lwmap');
    if (!svg) return null;
    const v = el.closest('.lw-v[onclick*="lwPick"]');
    if (v) {
      const call = v.getAttribute('onclick') || '';
      const match = call.match(/lwPick\('([^']+)'\)/);
      if (match) return ['village', match[1]];
    }
    if (el.closest('.lw-tr')) return ['throne', null];
    const tower = el.closest('g[onclick*="S.tab"]');
    if (tower && /Turnul/.test(tower.getAttribute('aria-label') || '')) return ['tower', null];
    return null;
  }
  document.addEventListener('click', function (event) {
    const host = map();
    if (!host) { current = null; return; }
    if (event.target.closest && event.target.closest('#lw-quick-actions')) return;
    const info = targetInfo(event.target);
    if (info) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      show(info[0], info[1]);
    } else if (current && event.target.closest && event.target.closest('.lw-map')) close();
  }, true);
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { close(); return; }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const info = targetInfo(event.target);
    if (!info) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    show(info[0], info[1]);
  }, true);
})();
