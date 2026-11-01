/* ============================================================================
   Silver Throne — harta.js
   Harta regiunii, pictată: fundal dintr-o imagine (imagini/harta/regiune-1…5.jpg, ales o dată pentru
   fiecare jucător și păstrat în S.map.bgi), drumurile peste el, iar satele, capitala, taberele,
   Bastionul și locurile de interes ca iconițe pictate (imagini/harta/*.webp).
   Logica hărții nu se schimbă: aceleași locuri, aceleași clicuri, aceeași ceață.
   Terenul desenat vechi rămâne dedesubt: dacă o imagine lipsește, se vede el.
   Se încarcă după teritorii.js (înlocuiește terIcon) și înaintea scriptului din pagină.
   ========================================================================== */
const HR = {
  N: 5,
  /* mărimea reală a fiecărei iconițe (px), ca să păstrăm proporțiile */
  sz: { 'bastion': [357, 380],
    'sat-mic': [363, 380],
    'loc-sanctuar': [380, 371],
    'capitala': [379, 380],
    'loc-ruine': [377, 380],
    'loc-caravana': [363, 380],
    'sat-mare': [353, 380],
    'loc-turn': [342, 380],
    'tabara': [380, 361],
    'loc-mina': [362, 380] },
  /* simbolul locului din joc → iconița pictată */
  ic: { '🏛': 'loc-ruine', '⛏': 'loc-mina', '✦': 'loc-sanctuar', '🛒': 'loc-caravana', '🗼': 'loc-turn', '🏰': 'bastion' }
};
const hrF = n => Math.round(n * 10) / 10;
const hrFit = (k, bw, bh) => { const [w, h] = HR.sz[k] || [1, 1], s = Math.min(bw / w, bh / h); return [w * s, h * s]; };
const hrImg = (k, w, h, y) => `<image href="imagini/harta/${k}.webp" x="${hrF(-w / 2)}" y="${hrF(y)}" width="${hrF(w)}" height="${hrF(h)}"/>`;

/* fundalul regiunii: ales o dată, după așezarea satelor, apoi păstrat */
function hrBgN() {
  const m = S.map; if (!m) return 1;
  if (!(m.bgi >= 1 && m.bgi <= HR.N)) { let h = 7; for (const c of m.vs.map(v => v.x + ',' + v.y).join('|')) h = (h * 31 + c.charCodeAt(0)) | 0; m.bgi = 1 + Math.abs(h) % HR.N; }
  return m.bgi;
}
function hrTerrain(T) {
  const roads = Object.values(T.roads || {}).map(r => `<path d="${r.d}" fill="none" stroke="#2a1d10" stroke-opacity=".5" stroke-width="5" stroke-linecap="round"/><path d="${r.d}" fill="none" stroke="#b39566" stroke-opacity=".85" stroke-width="3" stroke-linecap="round"/><path d="${r.d}" fill="none" stroke="#d8c296" stroke-opacity=".55" stroke-width=".7" stroke-dasharray="3 4"/>`).join('');
  return `${T.s}<image href="imagini/harta/regiune-${hrBgN()}.jpg" x="0" y="0" width="${SMW}" height="${SMH}" preserveAspectRatio="none"/><rect width="${SMW}" height="${SMH}" fill="#0b0e10" fill-opacity=".12"/>${roads}`;
}

/* capitala jucătorului */
function hrCapital() {
  const [x, y] = SMN, [w, h] = hrFit('capitala', 66, 46);
  return `<g transform="translate(${x} ${y})" pointer-events="none"><circle r="36" fill="url(#st-gl)"/><ellipse cx="0" cy="${hrF(h * .3)}" rx="${hrF(w * .46)}" ry="${hrF(w * .15)}" fill="#000" fill-opacity=".4"/>${hrImg('capitala', w, h, -h * .62)}`
    + `<g transform="translate(0 25)"><rect x="-22" y="-7" width="44" height="12" rx="3" fill="#0b0e10" fill-opacity=".88" stroke="#f0d27a" stroke-opacity=".85" stroke-width=".8"/><text y="1.8" text-anchor="middle" fill="#f0d27a" style="font:700 8px Cinzel,Georgia,serif">Tu · Capitala</text></g></g>`;
}

/* un sat din regiune: mic sau mare după puterea lui; numele, nivelul, steagul și selecția ca înainte */
function hrVillage(v, sel) {
  const [cx, cy] = smXY(v), vl = Math.max(1, S.lvl + v.dl), sc = v.sc && Date.now() - v.sc < 18e5, rich = wf(v) > .5, st = sc ? v.st : '';
  const col = { agr: '#c0504a', neg: '#d9a23a', zid: '#8fb0c8' }[st] || '#9a947e', k = v.dl >= 2 ? 'sat-mare' : 'sat-mic', [w, h] = hrFit(k, 52, 40);
  let g = `<g class="st-v${sel ? ' on' : ''}" onclick="mv(${v.id})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();mv(${v.id})}" tabindex="0" role="button" aria-label="${v.n}, nivel ${vl}${sc ? ', ' + STN[v.st] : ''}" transform="translate(${cx} ${cy})"><circle r="26" fill="transparent"/>`;
  g += `<ellipse cx="0" cy="${hrF(h * .3)}" rx="${hrF(w * .5)}" ry="${hrF(w * .17)}" fill="#000" fill-opacity=".35"/><ellipse cx="0" cy="${hrF(h * .26)}" rx="${hrF(w * .56)}" ry="${hrF(w * .21)}" fill="none" stroke="${col}" stroke-opacity="${sc ? .9 : .45}" stroke-width="${sc ? 1.4 : 1}" stroke-dasharray="${sc ? '5 3' : '2 4'}"/>`;
  g += hrImg(k, w, h, -h * .62);
  g += `<g class="st-fl" transform="translate(${hrF(-w * .48)} -2)"><path d="M0 0V-10" stroke="#2a1d10" stroke-width=".9"/><path d="M0-10l6.5 2.3-6.5 2.3z" fill="${rich ? '#4fa35e' : '#7b7f82'}" stroke="#12181a" stroke-width=".4"/></g>`;
  g += `<g transform="translate(${hrF(w * .34)} ${hrF(-h * .5)})"><circle r="6.8" fill="#12181a" stroke="#c9a24b" stroke-width="1.1"/><text y="3.3" text-anchor="middle" fill="#f0d27a" style="font:700 9px Cinzel,Georgia,serif">${vl}</text></g>`;
  g += `<ellipse class="st-sel" cx="0" cy="${hrF(h * .1)}" rx="27" ry="21" fill="none" stroke="#f0d27a" stroke-opacity=".28" stroke-width="5"/><ellipse class="st-sel" cx="0" cy="${hrF(h * .1)}" rx="27" ry="21" fill="none" stroke="#f0d27a" stroke-width="1.5"/>`;
  const nw = v.n.length * 5.1 + 12, ly = cy > SMH - 48 ? -34 : 30;
  return g + `<g class="st-nm" transform="translate(0 ${ly})"><rect x="${hrF(-nw / 2)}" y="-8" width="${hrF(nw)}" height="13" rx="3" fill="#0b0e10" fill-opacity=".88" stroke="#c9a24b" stroke-opacity=".7" stroke-width=".7"/><text y="1.8" text-anchor="middle" fill="#e9e1cf" style="font:600 8.4px Alegreya,Georgia,serif">${v.n}</text></g></g>`;
}

/* taberele, Bastionul și locurile de interes (înlocuiește iconița cu simbol din teritorii.js) */
terIcon = function (x, y, ic, col, sel, onclick, label, badge) {
  const k = HR.ic[ic] || 'tabara', big = k === 'bastion', [w, h] = hrFit(k, big ? 46 : 40, big ? 48 : 36);
  return `<g class="st-v${sel ? ' on' : ''}" onclick="${onclick}" tabindex="0" role="button" aria-label="${label}" transform="translate(${x} ${y})"><circle r="18" fill="transparent"/>`
    + `<ellipse cx="0" cy="${hrF(h * .3)}" rx="${hrF(w * .44)}" ry="${hrF(w * .15)}" fill="#000" fill-opacity=".38"/><ellipse cx="0" cy="${hrF(h * .27)}" rx="${hrF(w * .52)}" ry="${hrF(w * .19)}" fill="none" stroke="${col}" stroke-width="1.3" stroke-opacity=".9"/>`
    + hrImg(k, w, h, -h * .62)
    + (badge ? `<g transform="translate(${hrF(w * .38)} ${hrF(-h * .58)})"><rect x="-9" y="-5" width="18" height="9.5" rx="3" fill="#0b0e10" fill-opacity=".92" stroke="${col}" stroke-width=".7"/><text y="2" text-anchor="middle" fill="${col}" style="font:700 6.5px Alegreya,serif" pointer-events="none">${badge}</text></g>` : '')
    + (sel ? `<ellipse cx="0" cy="${hrF(h * .05)}" rx="${hrF(w * .62)}" ry="${hrF(h * .62)}" fill="none" stroke="#f0d27a" stroke-width="1.6"/>` : '') + '</g>';
};
