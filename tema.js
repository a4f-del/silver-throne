/* ============================================================================
   Silver Throne — tema.js
   Interfața: navigare cu Tron, banner Tron pe ecranul Sat, file grupate în Sat, sloturi de forjă vizuale,
   notificări (toast) și tranziții între file. Stilurile sunt în tema.css.

   Doar afișează; nu modifică reguli de joc. Se încarcă după tron.js.
   ========================================================================== */

/* ---------------------------------------------------------------- NAVIGARE */
const TEMA_NAV = [['a', 'Sat', '<img class="uii" src="imagini/ui/nav-sat.webp" alt="">'], ['c', 'Coborâre', '<img class="uii" src="imagini/ui/nav-coborare.webp" alt="">'], ['m', 'Hartă', '<img class="uii" src="imagini/ui/nav-harta.webp" alt="">'], ['r', 'Tron', '<img class="uii" src="imagini/ui/nav-tron.webp" alt="">'], ['e', 'Echipă', '<img class="uii" src="imagini/ui/nav-echipa.webp" alt="">']];   /* iconițe pictate: imagini/ui/ */
const temaOn = k => S.tab === k;
function temaNav() {
  return TEMA_NAV.map(([k, n, i]) => {
    const act = `tab('${k}')`;
    return `<button class="${temaOn(k) ? 'on' : ''}${k === 'r' ? ' tr' : ''}" onclick="${act}"><span class="ni">${i}</span><span>${n}${navBadge(k)}</span></button>`;
  }).join('');
}

/* ------------------------------------------------------------ BANNER TRON (Sat) */
function tronBanner() {
  try {
    const st = TRON.st;
    if (!TRON.loading && tronNeedSync()) tronSync();
    let ic = '♛', t = 'Tronul de Argint', sub = 'Se încarcă…', cta = 'Vezi', hot = false;
    if (S.lvl < TT.CFG.minLevel) { sub = `Evenimentul săptămânal începe la nivelul ${TT.CFG.minLevel}.`; cta = 'Detalii'; }
    else if (!st) {
      const e = TRON.err || '';
      sub = /Conectează/.test(e) ? 'Conectează-te la cont ca să lupți pentru Tron.' : /funcțiile Tronului/.test(e) ? 'Evenimentul se pregătește.' : e ? 'Nu am putut citi starea Tronului.' : 'Se încarcă…';
      cta = 'Deschide';
    } else {
      const left = st.week_end - tronNow(), ho = st.holder, me = st.me;
      if (me.pending.length) { sub = `Ai ${me.pending.length === 1 ? 'un premiu' : me.pending.length + ' premii'} de revendicat!`; cta = 'Revendică'; hot = true; }
      else if (!ho) { sub = 'Tronul e gol! Învinge Garda Regală și devii rege.'; cta = 'Provoacă'; hot = me.can_challenge; }
      else if (ho.user_id === me.user_id) { sub = `Tu ții Tronul! Se închide în ${sdT(left)}.`; cta = 'Vezi'; hot = true; }
      else { sub = `👑 ${tEsc(ho.name)} ține Tronul · se închide în ${sdT(left)}`; cta = me.can_challenge ? 'Provoacă' : 'Vezi'; hot = me.can_challenge; }
    }
    return `<div class="tr-banner${hot ? ' hot' : ''}" onclick="tab('r')" role="button" tabindex="0"><span class="trb-ic">${ic}</span><span class="trb-t"><b>${t}</b><span>${sub}</span></span><button class="p" tabindex="-1">${cta}</button></div>`;
  } catch (e) { return ''; }
}

/* ------------------------------------------------------ FILE GRUPATE ÎN SAT */
const TEMA_G = [['Producție', '⚒', ['a', 'd', 't']], ['Oraș', '🏘️', ['h', 'p', 'l']], ['Strategie', '🛡️', ['z', 'x', 'q']]];
function temaVTabs(k) {
  const names = Object.fromEntries(VL), gi = Math.max(0, TEMA_G.findIndex(g => g[2].includes(k))), att = dmReady() > 0;
  const grp = TEMA_G.map(([n, ic, ks], i) => `<button${i === gi ? ' class="p"' : ''} onclick="vil('${ks.includes(k) ? k : ks[0]}')"><span class="gi">${ic}</span> ${n}${ks.includes('x') && att ? ' <b class="nb">●</b>' : ''}</button>`).join('');
  const sub = TEMA_G[gi][2].map(x => `<button${x === k ? ' class="p"' : ''} onclick="vil('${x}')">${names[x]}${x === 'x' && att ? ' ●' : ''}</button>`).join('');
  return `<div class="tabs grp">${grp}</div><div class="tabs sub">${sub}</div>`;
}

/* ------------------------------------------------------ SLOTURI DE FORJĂ */
function forgeSlots() {
  const now = Date.now(); let h = '<div class="fgrid">';
  for (let i = 0; i < S.slots; i++) {
    const s = S.forge[i];
    if (!s) h += '<div class="fslot"><span class="fi">⚒</span><b>Slot liber</b><span class="mute">Forjează un obiect mai jos</span></div>';
    else if (now < s.end) h += `<div class="fslot busy"><span class="fi">🔥</span><b>${s.label}</b><span class="fti" data-end="${s.end}">${fmt(s.end - now)}</span></div>`;
    else h += `<div class="fslot rdy"><span class="fi">✔</span><b>${s.label}</b><button class="p" onclick="collect(${i})">Ridică</button></div>`;
  }
  return h + '</div>';
}

/* ------------------------------------------------ VERIFICARE DE VERSIUNE */
/* Dacă tema.css e din altă versiune decât tema.js (de exemplu o încărcare incompletă pe GitHub sau un cache vechi), jocul
   arată stricat fără explicație. Avertismentul de mai jos spune exact ce s-a întâmplat. Stil inline: se vede și fără tema.css. */
const TEMA_V = '2026.10.30-3';
function temaVerCheck() {
  try {
    if (document.getElementById('tema-warn')) return;
    const css = String(getComputedStyle(document.documentElement).getPropertyValue('--tema-v') || '').replace(/["'\s]/g, '');
    if (css === TEMA_V) return;
    const w = document.createElement('div'); w.id = 'tema-warn'; w.setAttribute('role', 'alert');
    w.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:99999;padding:10px 14px;background:#7a1d1d;color:#fff;font:15px/1.4 Arial,sans-serif;box-shadow:0 4px 18px #000a';
    w.innerHTML = '<b>Jocul s-a actualizat doar pe jumătate.</b> ' + (css ? 'Stilurile (tema.css) sunt din versiunea ' + css + ', iar jocul cere ' + TEMA_V + '.' : 'Fișierul de stiluri (tema.css) lipsește sau e vechi.') + ' Apasă Ctrl+F5. Dacă mesajul rămâne, încarcă din nou fișierul <b>tema.css</b> pe GitHub (și așteaptă 1–2 minute). <button style="margin-left:8px;padding:4px 10px" onclick="this.parentNode.remove()">Închide</button>';
    document.body.appendChild(w);
  } catch (e) { /* verificarea nu trebuie să blocheze jocul */ }
}
let _tmVer = false;

/* ------------------------------------------- DUPĂ RANDARE: tranziții și notificări */
let _tmKey = '', _tmMsg = '', _tmT = null;
function temaPost() {
  if (!_tmVer) { _tmVer = true; temaVerCheck(); }
  try {
    const v = document.getElementById('v'); if (!v) return;
    const key = S.tab + '|' + S.mt + '|' + S.vil;
    if (key !== _tmKey) { _tmKey = key; v.classList.add('tfade'); setTimeout(() => v.classList.remove('tfade'), 450); }
    const el = v.querySelector('.msg');
    if (!el) { _tmMsg = ''; return; }
    if (S.msg === _tmMsg) el.classList.add('again');
    else {
      _tmMsg = S.msg; clearTimeout(_tmT);
      _tmT = setTimeout(() => { if (S.msg === _tmMsg) { S.msg = ''; const e = document.querySelector('#v .msg'); if (e) { e.classList.add('out'); setTimeout(() => e.remove(), 420); } } _tmMsg = ''; }, 7000);
    }
    el.onclick = () => { S.msg = ''; _tmMsg = ''; el.classList.add('out'); setTimeout(() => el.remove(), 300); };
  } catch (e) { /* aspectul nu trebuie să blocheze jocul */ }
}
