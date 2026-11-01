/* ============================================================================
   Silver Throne — lume-pictat.js
   Harta Lumii, pictată: iarba se repetă fără cusături (imagini/lume/iarba.jpg), satele jucătorilor
   sunt iconițe pictate pe 5 trepte de nivel, decorul (păduri, munți, pietre runice) se așază singur,
   iar Tronul de Argint e mare, pe podium, cu efecte animate.
   Înlocuiește doar desenul din lume.js (lwPos, lwTerrain, lwThrone, lwVil); clicurile, atacurile,
   coroanele și plăcuțele rămân aceleași. Se încarcă după lume.js.
   ========================================================================== */
const LWP = {
  /* treapta satului (LWA.tier: 1–9, 10–19, 20–24, 25–29, 30+) → iconița, lățimea pe hartă */
  tier: [['harta/sat-mic', 363, 380, 104], ['harta/sat-mare', 353, 380, 112], ['lume/sat-zid', 354, 380, 118], ['harta/capitala', 379, 380, 126], ['lume/castel-mare', 379, 380, 156]],
  deco: { padure: [353, 380], munte: [420, 344], pietre: [420, 399] },
  TW: 320      /* lățimea Tronului pe hartă (castelul cu tronul) */
};
LW.IA = 172; LW.IB = 104;    /* sate mai mari → mai mult loc între ele */
const lpF = n => Math.round(n * 10) / 10;
const lpImg = (src, w, h, x, y, extra) => `<image href="imagini/${src}.webp" x="${lpF(x)}" y="${lpF(y)}" width="${lpF(w)}" height="${lpF(h)}"${extra || ''}/>`;

/* defs în plus: iarba, strălucirea și raza Tronului */
LWA.defs += `<pattern id="lw-grass" patternUnits="userSpaceOnUse" width="440" height="440"><image href="imagini/lume/iarba.jpg" width="440" height="440"/></pattern>
<radialGradient id="lw-tg"><stop offset="0" stop-color="#9fdcff" stop-opacity=".75"/><stop offset=".45" stop-color="#5cb6ff" stop-opacity=".28"/><stop offset="1" stop-color="#5cb6ff" stop-opacity="0"/></radialGradient>
<radialGradient id="lw-fl"><stop offset="0" stop-color="#e6f7ff" stop-opacity=".95"/><stop offset=".4" stop-color="#7cc8ff" stop-opacity=".55"/><stop offset="1" stop-color="#7cc8ff" stop-opacity="0"/></radialGradient>
<linearGradient id="lw-beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#cfefff" stop-opacity=".75"/><stop offset=".55" stop-color="#9fdcff" stop-opacity=".22"/><stop offset="1" stop-color="#9fdcff" stop-opacity="0"/></linearGradient>`;

/* locul pe hartă: mai departe de centru, ca Tronul mare să aibă loc */
lwPos = function (p) {
  const h = lwHash(p.id), jx = ((h & 255) / 255 - 0.5) * 18, jy = (((h >>> 8) & 255) / 255 - 0.5) * 12, X = (p.x - p.y) * LW.IA, Y = (p.x + p.y) * LW.IB, d = Math.hypot(X, Y * 1.6) || 1;
  return [X + X / d * 128 + jx, Y + Y / d * 128 * (Y < 0 ? 1.35 : 1.25) + jy];
};

/* ------------------------------------------------------------------ TEREN */
lwTerrain = function (ps, F) {
  const key = 'p|' + ps.map(p => p.id + p.x + ',' + p.y).join('|') + '|' + Math.round(F.w);
  if (LUME.terr && LUME.terr.key === key) return LUME.terr;
  const cell = new Map(ps.map(p => [p.x + ',' + p.y, p])), pos = new Map(ps.map(p => [p.id, lwPos(p)])), R = lwHull(ps), r = LWA.rng(4242);
  /* drumuri: spre vecinul de pe inelul dinăuntru sau spre Tron */
  const segs = [];
  for (const p of ps) {
    let x = p.x, y = p.y, par = null;
    while (x || y) { const q = Math.max(Math.abs(x), Math.abs(y)); if (Math.abs(x) === q) x -= Math.sign(x); if (Math.abs(y) === q) y -= Math.sign(y); par = cell.get(x + ',' + y); if (par) break; }
    segs.push([pos.get(p.id), par ? pos.get(par.id) : [0, 40]]);
  }
  const nearSeg = (x, y, m) => segs.some(([a, b]) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L)); return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) < m; });
  const nearVil = (x, y, m) => ps.some(p => { const [vx, vy] = pos.get(p.id); return Math.hypot(x - vx, (y - vy) * 1.4) < m; });
  const inside = (x, y, m) => Math.hypot(x, y * 1.35) < LWP.TW * 0.62 + m * 0.4 || nearVil(x, y, m + 62) || nearSeg(x, y, 16 + m * 0.2) || (typeof tnInside === 'function' && tnInside(x, y)) || (typeof wnNear === 'function' && (wnList(), wnNear(x, y)));
  const outer = (x, y) => Math.abs(x) / R.x + Math.abs(y) / R.y > 1;
  let low = `<rect x="${lpF(F.x - 600)}" y="${lpF(F.y - 600)}" width="${lpF(F.w + 1200)}" height="${lpF(F.h + 1200)}" fill="url(#lw-grass)"/>`;
  for (let i = 0; i < Math.round(F.w * F.h / 22000); i++) { const x = F.x + r() * F.w, y = F.y + r() * F.h; low += `<ellipse cx="${lpF(x)}" cy="${lpF(y)}" rx="${lpF(60 + r() * 140)}" ry="${lpF(26 + r() * 60)}" fill="${r() < 0.5 ? '#5f7a45' : '#16241a'}" opacity="${lpF(0.1 + r() * 0.14)}"/>`; }
  /* râul, ca înainte, pe marginea de sus a zonei locuite */
  const rv = []; for (let i = 0; i <= 8; i++) { const k = i / 8, x = -R.x - 80 + k * (R.x + 80) * 1.9, base = x <= 0 ? -(R.y / R.x) * (x + R.x) : -R.y + (R.y / R.x) * x * 0.6; rv.push([x, base - 90 - Math.sin(i * 1.7) * 18]); }
  let d = `M${lpF(F.x - 40)} ${lpF(rv[0][1] + 30)}`, pr = [F.x - 40, rv[0][1] + 30];
  for (const q of rv) { const mx = (pr[0] + q[0]) / 2; d += `C${lpF(mx)} ${lpF(pr[1])} ${lpF(mx)} ${lpF(q[1])} ${lpF(q[0])} ${lpF(q[1])}`; pr = q; }
  d += `C${lpF(pr[0] + 60)} ${lpF(pr[1])} ${lpF(F.x + F.w)} ${lpF(F.y - 20)} ${lpF(F.x + F.w + 40)} ${lpF(F.y - 40)}`;
  low += `<path d="${d}" stroke="#24391f" stroke-width="30" fill="none" stroke-linecap="round" opacity=".55"/><path d="${d}" stroke="#3a6f86" stroke-width="21" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#5c9cb8" stroke-width="13" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#cdeaf5" stroke-width="2" fill="none" stroke-dasharray="12 16" opacity=".7"/>`;
  low += segs.map(([a, b]) => { const p = `M${lpF(a[0])} ${lpF(a[1])}L${lpF(b[0])} ${lpF(b[1])}`; return `<path d="${p}" stroke="#2a1d10" stroke-opacity=".45" stroke-width="13" stroke-linecap="round" fill="none"/><path d="${p}" stroke="#a88d5c" stroke-width="9" stroke-linecap="round" fill="none"/><path d="${p}" stroke="#d6c08f" stroke-opacity=".55" stroke-width="2.4" stroke-dasharray="5 6" stroke-linecap="round" fill="none"/>`; }).join('');
  /* decorul pictat: munți sus și în colțuri, păduri pe margini, câteva pâlcuri și pietre printre sate */
  const items = [], put = (k, x, y, w) => { const [iw, ih] = LWP.deco[k], h = w * ih / iw, flip = r() < 0.5;   /* jumătate întoarse în oglindă, ca să nu pară copiate */
    items.push([y, `<ellipse cx="${lpF(x)}" cy="${lpF(y + h * 0.12)}" rx="${lpF(w * 0.42)}" ry="${lpF(w * 0.13)}" fill="#000" opacity=".28"/>` + (flip ? `<g transform="translate(${lpF(2 * x)} 0) scale(-1 1)">` : '') + lpImg('lume/' + k, w, h, x - w / 2, y - h * 0.62) + (flip ? '</g>' : '')]); };
  const top = F.y + F.h * 0.32;
  for (let y = F.y - 20; y < top; y += 70) for (let x = F.x - 40; x < F.x + F.w + 40; x += 120) {
    const px = x + (r() - 0.5) * 70, py = y + (r() - 0.5) * 40, edge = Math.min(px - F.x, F.x + F.w - px) / F.w;
    if (!outer(px, py) || inside(px, py, 70)) continue;
    if (r() < (py < F.y + F.h * 0.1 ? 0.4 : 0.12) + (edge < 0.18 ? 0.3 : 0)) put('munte', px, py, 140 + r() * 110);
  }
  for (let y = top - 40; y < F.y + F.h + 60; y += 95) for (let x = F.x - 40; x < F.x + F.w + 60; x += 135) {
    const px = x + (r() - 0.5) * 80, py = y + (r() - 0.5) * 50;
    if (inside(px, py, 60)) continue;
    if (outer(px, py)) { if (r() < 0.42) put('padure', px, py, 95 + r() * 120); }
    else { const k = r(); if (k < 0.09) put('padure', px, py, 80 + r() * 30); else if (k < 0.13) put('pietre', px, py, 78 + r() * 18); }
  }
  LUME.terr = { key, low, high: items.sort((a, b) => a[0] - b[0]).map(x => x[1]).join('') };
  return LUME.terr;
};

/* ------------------------------------------------------------------ SATELE */
lwVil = function (p, sel, mine, K) {
  const t = LWA.tier(p.level), [src, iw, ih, W] = LWP.tier[t], H = W * ih / iw, [cx, cy] = lwPos(p), c = lwCfg();
  const prot = p.level < c.min_level, cd = p.cd && p.cd > lwNow(), won = K && K.win && K.win.id === p.id, cur = K && K.cur && K.cur.id === p.id;
  const nm = (mine ? 'Tu · ' : '') + p.name, top = -H * 0.62;
  let h = `<g class="st-v lw-v${sel ? ' on' : ''}${mine ? ' me' : ''}" onclick="lwPick('${p.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();lwPick('${p.id}')}" tabindex="0" role="button" aria-label="${tEsc(p.name)}, nivel ${p.level}${mine ? ', satul tău' : ''}" transform="translate(${lpF(cx)} ${lpF(cy)})">`;
  h += `<rect x="${lpF(-W / 2)}" y="${lpF(top)}" width="${lpF(W)}" height="${lpF(H)}" fill="transparent"/>`;
  h += `<ellipse cx="0" cy="${lpF(H * 0.3)}" rx="${lpF(W * 0.46)}" ry="${lpF(W * 0.15)}" fill="#000" opacity=".32"/>`;
  h += `<ellipse class="st-sel" cx="0" cy="${lpF(H * 0.18)}" rx="${lpF(W * 0.6)}" ry="${lpF(W * 0.26)}" fill="none" stroke="#f0d27a" stroke-opacity=".3" stroke-width="7"/>`;
  if (mine) h += `<ellipse cx="0" cy="${lpF(H * 0.2)}" rx="${lpF(W * 0.58)}" ry="${lpF(W * 0.24)}" fill="#f0d27a" fill-opacity=".1" stroke="#f0d27a" stroke-width="1.6" stroke-dasharray="6 4"/>`;
  h += lpImg(src, W, H, -W / 2, top);
  const fl = mine ? '#f0d27a' : prot || cd ? '#8a8f93' : '#c0504a';
  h += `<g transform="translate(${lpF(-W * 0.44)} ${lpF(-H * 0.12)})"><path d="M0 0V-18" stroke="#2a1d10" stroke-width="1.1"/><path d="M0 -18l9 3-9 3z" fill="${fl}" stroke="#12181a" stroke-width=".5"/></g>`;
  if (won || cur) h += `<g transform="translate(0 ${lpF(top - 8)}) scale(1.3)"><title>${won ? 'Regele săptămânii ' + K.week : ''}${won && cur ? ' · ' : ''}${cur ? 'Ține Tronul acum' : ''}</title><path d="M-9 4L-7-6-3-1 0-8 3-1 7-6 9 4Z" fill="${won ? 'url(#lwa-gd)' : '#d7dde0'}" stroke="#5c430c" stroke-width="1" stroke-linejoin="round"/>${won && cur ? '<ellipse cx="0" cy="-1" rx="1.6" ry="1.6" fill="#c0504a"/>' : ''}</g>`;
  h += `<ellipse class="st-sel" cx="0" cy="${lpF(H * 0.18)}" rx="${lpF(W * 0.6)}" ry="${lpF(W * 0.26)}" fill="none" stroke="#f0d27a" stroke-width="1.8"/>`;
  return h + `<g transform="scale(1.2)">${LWA.plate((H * 0.4 + 12) / 1.2, tEsc(nm), mine, false, nm.length, p.level)}</g></g>`;
};

/* ------------------------------------------------------------------ TRONUL */
lwThrone = function (K) {
  const W = LWP.TW, H = W * 640 / 600, x0 = -W / 2, y0 = -H * 0.6, P = (u, v) => [x0 + u * W, y0 + v * H];
  const [gx, gy] = P(0.658, 0.186), [dx, dy] = P(0.55, 0.52), br = [[0.35, 0.425], [0.322, 0.49], [0.563, 0.58], [0.703, 0.555]].map(([u, v]) => P(u, v));   /* poziții măsurate pe imagini/lume/tron.webp */
  let g = `<g class="lw-tr" onclick="tab('r')" onkeydown="if(event.key==='Enter'){tab('r')}" tabindex="0" role="button" aria-label="Tronul de Argint">`;
  g += `<ellipse class="lt-glow" cx="${lpF(dx)}" cy="${lpF(dy + 20)}" rx="${lpF(W * 0.72)}" ry="${lpF(W * 0.34)}" fill="url(#lw-tg)"/>`;
  /* cercul de rune de pe pământ, care se rotește */
  g += `<g transform="translate(${lpF(dx)} ${lpF(dy + 34)})"><ellipse class="lt-rune a" rx="${lpF(W * 0.56)}" ry="${lpF(W * 0.21)}" fill="none" stroke="#8fd6ff" stroke-width="2.4" stroke-dasharray="3 9 14 6 6 12" opacity=".8"/><ellipse class="lt-rune b" rx="${lpF(W * 0.62)}" ry="${lpF(W * 0.235)}" fill="none" stroke="#cfefff" stroke-width="1.2" stroke-dasharray="20 10 4 10" opacity=".55"/></g>`;
  g += `<ellipse cx="0" cy="${lpF(H * 0.3)}" rx="${lpF(W * 0.44)}" ry="${lpF(W * 0.13)}" fill="#000" opacity=".35"/>`;
  g += lpImg('lume/tron', W, H, x0, y0);
  /* flăcările albastre din vase și piatra prețioasă */
  g += br.map(([x, y], i) => `<circle class="lt-fl" style="animation-delay:-${i * 0.37}s" cx="${lpF(x)}" cy="${lpF(y - 6)}" r="17" fill="url(#lw-fl)"/>`).join('');
  g += `<rect class="lt-beam" x="${lpF(gx - 15)}" y="${lpF(gy - 300)}" width="30" height="300" fill="url(#lw-beam)"/><circle class="lt-gem" cx="${lpF(gx)}" cy="${lpF(gy)}" r="22" fill="url(#lw-fl)"/>`;
  /* scântei care urcă */
  const rr = LWA.rng(99); for (let i = 0; i < 14; i++) { const x = dx + (rr() - 0.5) * W * 0.7, y = dy + (rr() - 0.3) * W * 0.18, s = 1.2 + rr() * 1.8; g += `<path class="lt-sp" style="animation-delay:-${lpF(rr() * 4)}s;animation-duration:${lpF(3 + rr() * 2.5)}s" d="M${lpF(x)} ${lpF(y - s * 2.6)}L${lpF(x + s * .6)} ${lpF(y - s * .6)}L${lpF(x + s * 2.6)} ${lpF(y)}L${lpF(x + s * .6)} ${lpF(y + s * .6)}L${lpF(x)} ${lpF(y + s * 2.6)}L${lpF(x - s * .6)} ${lpF(y + s * .6)}L${lpF(x - s * 2.6)} ${lpF(y)}L${lpF(x - s * .6)} ${lpF(y - s * .6)}Z" fill="#e6f7ff"/>`; }
  /* plăcuțele: numele, regele săptămânii, cine ține Tronul acum */
  const t1 = 'Tronul de Argint', t2 = K.win ? `👑 ${K.win.name} · regele săptămânii ${K.week}` : null, t3 = K.cur ? `Pe Tron acum: ${K.cur.name}` : 'Tronul e gol acum';
  let y = H * 0.42 + 16, lb = `<g transform="scale(1.45)">` + LWA.plate(y / 1.45, t1, true);
  if (t2) { y += 20; lb += LWA.plate(y / 1.45, tEsc(t2), true, true, t2.length); }
  y += 19; lb += LWA.plate(y / 1.45, tEsc(t3), false, true, t3.length) + '</g>';
  return g + lb + '</g>';
};

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `
.lw-tr{cursor:pointer}
.lt-glow{animation:ltPulse 3.6s ease-in-out infinite}
.lt-rune{transform-box:fill-box;transform-origin:center}
.lt-rune.a{animation:ltDash 9s linear infinite}.lt-rune.b{animation:ltDash 14s linear infinite reverse}
.lt-fl{transform-box:fill-box;transform-origin:center;animation:ltFlick 1.3s ease-in-out infinite}
.lt-gem{transform-box:fill-box;transform-origin:center;animation:ltGem 2.6s ease-in-out infinite}
.lt-beam{animation:ltBeam 4.2s ease-in-out infinite}
.lt-sp{transform-box:fill-box;transform-origin:center;animation-name:ltRise;animation-timing-function:ease-out;animation-iteration-count:infinite;opacity:0}
@keyframes ltPulse{0%,100%{opacity:.65}50%{opacity:1}}
@keyframes ltDash{to{stroke-dashoffset:-200}}
@keyframes ltFlick{0%,100%{opacity:.75;transform:scale(1)}30%{opacity:1;transform:scale(1.15)}60%{opacity:.6;transform:scale(.92)}}
@keyframes ltGem{0%,100%{opacity:.55;transform:scale(.85)}50%{opacity:1;transform:scale(1.2)}}
@keyframes ltBeam{0%,100%{opacity:.5}50%{opacity:.95}}
@keyframes ltRise{0%{opacity:0;transform:translateY(0) scale(.6)}20%{opacity:1}100%{opacity:0;transform:translateY(-110px) scale(1.1)}}
@media (prefers-reduced-motion:reduce){.lt-glow,.lt-rune,.lt-fl,.lt-gem,.lt-beam{animation:none!important}.lt-sp{display:none}}
`;
  document.head.appendChild(st);
})();
