/* ============================================================================
   Silver Throne — lume-art.js
   Desenul izometric al hărții Lumii (SVG, fără imagini): platouri, case, palisade, ziduri, turnuri,
   castel, Tronul de Argint pe podium, drumuri pavate, râu, păduri și munți.

   Satul arată după nivelul jucătorului (LWA.tier):
     1–9   trei case               10–19  palisadă de lemn cu poartă
     20–24 zid de piatră + turn de veghe în centru
     25–29 zid fortificat cu turnuri în colțuri + donjon
     30+   castel: donjon cu turnuri, ziduri și poartă
   Variațiile (acoperișuri, culori, așezare) vin din id-ul jucătorului, deci un sat arată mereu la fel.
   Pur desen: nu citește starea jocului. O folosește lume.js.
   ========================================================================== */
(function (root) {
  'use strict';
  const A = {};
  const F = n => Math.round(n * 10) / 10;
  A.F = F;
  /* proiecția izometrică: u spre dreapta-jos, v spre stânga-jos, h în sus */
  const I = (u, v, h) => [u - v, (u + v) * 0.5 - (h || 0)];
  const P = pts => pts.map(p => F(p[0]) + ',' + F(p[1])).join(' ');
  const poly = (pts, fill, extra) => `<polygon points="${P(pts)}" fill="${fill}"${extra || ''}/>`;
  const rng = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  A.rng = rng;
  const hash = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  A.hash = hash;
  const ST = ' stroke="#1d1712" stroke-width=".45" stroke-linejoin="round"';

  /* ------------------------------------------------------------------ PALETE */
  const ROOF = [['#a8813f', '#7f5f2c'], ['#9c4a32', '#6e3222'], ['#5f6b74', '#424b52'], ['#8a5a2e', '#5f3d1f'], ['#b28e52', '#86683a']];
  const WALLC = [['#d8c39a', '#a8936c'], ['#c9ae7e', '#9a8158'], ['#bfb6a4', '#8e8676'], ['#a07a52', '#765a3b']];
  const STONE = ['#b9b4a8', '#8d887d', '#cfcac0'];   /* fața stângă, dreapta, sus */
  const WOOD = ['#8a6239', '#64452a', '#a57a4b'];

  /* ------------------------------------------------------------------ PIESE */
  /* cutie: fața stângă (v = max), fața dreaptă (u = max), capacul */
  function box(u, v, w, d, h, c, z0, stroke) {
    z0 = z0 || 0; const a = u - w / 2, b = u + w / 2, e = v - d / 2, f = v + d / 2, s = stroke === false ? '' : ST;
    return poly([I(a, f, z0), I(b, f, z0), I(b, f, z0 + h), I(a, f, z0 + h)], c[0], s)
      + poly([I(b, e, z0), I(b, f, z0), I(b, f, z0 + h), I(b, e, z0 + h)], c[1], s)
      + (c[2] ? poly([I(a, e, z0 + h), I(b, e, z0 + h), I(b, f, z0 + h), I(a, f, z0 + h)], c[2], s) : '');
  }
  /* geam / ușă pe fața stângă (v = f) sau dreaptă (u = b) */
  const winL = (u1, u2, f, z1, z2, c) => poly([I(u1, f, z1), I(u2, f, z1), I(u2, f, z2), I(u1, f, z2)], c || '#2a1d12');
  const winR = (b, v1, v2, z1, z2, c) => poly([I(b, v1, z1), I(b, v2, z1), I(b, v2, z2), I(b, v1, z2)], c || '#2a1d12');
  /* casă cu acoperiș în două ape; ridge 'u' (coama spre dreapta) sau 'v' */
  function house(u, v, w, d, h, rh, wc, rc, ridge, opt) {
    opt = opt || {}; const a = u - w / 2, b = u + w / 2, e = v - d / 2, f = v + d / 2, o = 0.9;
    let s = box(u, v, w, d, h, [wc[0], wc[1]]);
    if (ridge === 'u') {
      s += winL(u - w * 0.18, u + w * 0.05, f, 1.2, h * 0.62 + 0.4) + winR(b, v - d * 0.15, v + d * 0.15, h * 0.4, h * 0.75, '#3b2a18');
      s += poly([I(a - o, v, h + rh), I(b + o, v, h + rh), I(b + o, e - o, h - 0.6), I(a - o, e - o, h - 0.6)], rc[1], ST);
      s += poly([I(b, e, h), I(b, f, h), I(b, v, h + rh)], wc[1], ST);
      s += poly([I(a - o, f + o, h - 0.6), I(b + o, f + o, h - 0.6), I(b + o, v, h + rh), I(a - o, v, h + rh)], rc[0], ST);
    } else {
      s += winL(u - w * 0.15, u + w * 0.15, f, h * 0.4, h * 0.75, '#3b2a18') + winR(b, v - d * 0.2, v + d * 0.05, 1.2, h * 0.62 + 0.4);
      s += poly([I(u, e - o, h + rh), I(u, f + o, h + rh), I(a - o, f + o, h - 0.6), I(a - o, e - o, h - 0.6)], rc[1], ST);
      s += poly([I(a, f, h), I(b, f, h), I(u, f, h + rh)], wc[0], ST);
      s += poly([I(u, e - o, h + rh), I(u, f + o, h + rh), I(b + o, f + o, h - 0.6), I(b + o, e - o, h - 0.6)], rc[0], ST);
    }
    if (opt.chim) s += box(u + w * 0.25, v - d * 0.1, 1.4, 1.4, 3, ['#6e6458', '#4f473e', '#3a332c'], h + rh * 0.45);
    if (opt.smoke) s += `<circle cx="${F(I(u + w * 0.25, v - d * 0.1, h + rh * 0.45 + 5)[0])}" cy="${F(I(u + w * 0.25, v - d * 0.1, h + rh * 0.45 + 5)[1])}" r="1.6" fill="#cfc8bb" opacity=".45"/>`;
    return s;
  }
  /* creneluri pe muchia de sus a unei cutii */
  function crenel(u, v, w, d, z, c, step) {
    step = step || 2.2; let s = '';
    const a = u - w / 2, b = u + w / 2, e = v - d / 2, f = v + d / 2;
    for (let x = a + 0.6; x < b - 0.4; x += step) s += box(x + 0.5, f - 0.5, 1, 1, 1.3, c, z, false);
    for (let y = e + 0.6; y < f - 1.2; y += step) s += box(b - 0.5, y + 0.5, 1, 1, 1.3, c, z, false);
    return s;
  }
  /* turn pătrat; roof: 'cren' (creneluri) sau culoare de acoperiș piramidal */
  function tower(u, v, w, h, roof, wall) {
    wall = wall || STONE; let s = box(u, v, w, w, h, wall);
    s += winL(u - 0.4, u + 0.4, v + w / 2, h * 0.55, h * 0.7) + winR(u + w / 2, v - 0.4, v + 0.4, h * 0.3, h * 0.45);
    if (roof === 'cren') { s += box(u, v, w + 0.8, w + 0.8, 1, [wall[0], wall[1], wall[2]], h); s += crenel(u, v, w + 0.8, w + 0.8, h + 1, wall); }
    else {
      const r = roof || ROOF[1], a = u - w / 2 - 0.6, b = u + w / 2 + 0.6, e = v - w / 2 - 0.6, f = v + w / 2 + 0.6, top = I(u, v, h + w * 1.25);
      s += poly([I(a, f, h), I(b, f, h), top], r[0], ST) + poly([I(b, e, h), I(b, f, h), top], r[1], ST);
      s += `<path d="M${F(top[0])} ${F(top[1])}V${F(top[1] - 4)}" stroke="#2a1d10" stroke-width=".5"/><path d="M${F(top[0])} ${F(top[1] - 4)}l3 .9-3 .9z" fill="#9c2f29"/>`;
    }
    return s;
  }
  /* zid de-a lungul unei laturi: 'pal' palisadă de lemn, 'st' piatră, 'fort' piatră înaltă cu creneluri */
  function wallSeg(u1, v1, u2, v2, kind) {
    const len = Math.hypot(u2 - u1, v2 - v1), alongU = Math.abs(u2 - u1) > Math.abs(v2 - v1);
    const h = kind === 'pal' ? 3.4 : kind === 'st' ? 3.2 : 4.6, t = kind === 'pal' ? 0.8 : 1.4;
    const c = kind === 'pal' ? WOOD : STONE, cu = (u1 + u2) / 2, cv = (v1 + v2) / 2;
    let s = alongU ? box(cu, cv, len, t, h, c) : box(cu, cv, t, len, h, c);
    if (kind === 'pal') {      /* vârfurile parilor */
      const n = Math.round(len / 1.1);
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n, pu = u1 + (u2 - u1) * k, pv = v1 + (v2 - v1) * k, p0 = I(pu, pv + (alongU ? t / 2 : 0), h), p1 = I(pu, pv, h + 1.1);
        s += `<path d="M${F(p0[0] - 0.5)} ${F(p0[1])}L${F(p1[0])} ${F(p1[1])}L${F(p0[0] + 0.5)} ${F(p0[1] + 0.2)}Z" fill="${WOOD[2]}" stroke="#2a1d12" stroke-width=".3"/>`;
      }
    } else {
      const n = Math.floor(len / 2.1);
      for (let i = 0; i < n; i++) { const k = (i + 0.5) / n, pu = u1 + (u2 - u1) * k, pv = v1 + (v2 - v1) * k; s += box(pu, pv, alongU ? 0.9 : t, alongU ? t : 0.9, 1.1, c, h, false); }
    }
    return s;
  }
  function gate(u, f, h, wood) {           /* poartă pe latura din față-stânga (v = f) */
    return poly([I(u - 1.6, f + 0.1, 0), I(u + 1.6, f + 0.1, 0), I(u + 1.6, f + 0.1, h * 0.7), I(u, f + 0.1, h * 0.95), I(u - 1.6, f + 0.1, h * 0.7)], wood ? '#3a2614' : '#241a12', ' stroke="#120c08" stroke-width=".4"');
  }
  /* platoul: capac de iarbă, laturi de pământ, pietre */
  function plateau(s, hp, seed) {
    const r = rng(seed), top = [I(-s, -s, 0), I(s, -s, 0), I(s, s, 0), I(-s, s, 0)];
    let g = poly([I(-s, s, 0), I(s, s, 0), I(s, s, -hp), I(-s, s, -hp)], 'url(#lwa-dl)', ST)
      + poly([I(s, -s, 0), I(s, s, 0), I(s, s, -hp), I(s, -s, -hp)], 'url(#lwa-dr)', ST);
    for (let i = 0; i < 5; i++) {           /* stânci prinse în laturi */
      const k = r() * 1.6 - 0.8, side = r() < 0.5, z = -hp * (0.4 + r() * 0.3), pt = side ? I(k * s, s, z) : I(s, k * s, z), w = 1.1 + r() * 1.3;
      g += `<path d="M${F(pt[0] - w)} ${F(pt[1] + w * 0.4)}L${F(pt[0] - w * 0.5)} ${F(pt[1] - w * 0.5)}L${F(pt[0] + w * 0.6)} ${F(pt[1] - w * 0.4)}L${F(pt[0] + w)} ${F(pt[1] + w * 0.4)}Z" fill="${side ? '#8a7e6e' : '#665c50'}" stroke="#2c241c" stroke-width=".3"/>`;
    }
    for (let i = 0; i < 3; i++) { const k = r() * 1.6 - 0.8, side = r() < 0.5, z = -hp * (0.15 + r() * 0.7), a0 = side ? I(k * s - 1.5, s, z) : I(s, k * s - 1.5, z), a1 = side ? I(k * s + 1.5, s, z) : I(s, k * s + 1.5, z); g += `<path d="M${F(a0[0])} ${F(a0[1])}L${F(a1[0])} ${F(a1[1])}" stroke="#2c1f14" stroke-width=".4" opacity=".6"/>`; }
    g += poly(top, 'url(#lwa-gr)', ' stroke="#3d5224" stroke-width=".6"');
    for (let i = 0; i < 7; i++) { const pt = I((r() * 2 - 1) * s * 0.8, (r() * 2 - 1) * s * 0.8, 0); g += `<ellipse cx="${F(pt[0])}" cy="${F(pt[1])}" rx="${F(2 + r() * 3)}" ry="${F(1 + r() * 1.4)}" fill="#89a957" opacity=".35"/>`; }
    return g;
  }

  /* ------------------------------------------------------------------ SATUL */
  A.tier = lvl => (lvl >= 30 ? 4 : lvl >= 25 ? 3 : lvl >= 20 ? 2 : lvl >= 10 ? 1 : 0);
  A.SIZE = [12.5, 14.5, 15.5, 16.5, 18.5];          /* jumătatea platoului, pe treaptă */
  /* întoarce {svg, s} cu desenul satului centrat în (0,0) = mijlocul capacului platoului */
  A.village = function (id, lvl) {
    const t = A.tier(lvl), r = rng(hash(id)), s = A.SIZE[t], hp = 7 + t * 1.2, a = s - 2.2;
    const rc = () => ROOF[(r() * ROOF.length) | 0], wcs = () => WALLC[(r() * WALLC.length) | 0];
    const RC = rc(), WC = wcs();                    /* fiecare sat are culoarea lui principală */
    const parts = [];                               /* [adâncime (u+v), svg] pentru ordinea de desen */
    const add = (u, v, svg) => parts.push([u + v, svg]);
    const H = (u, v, w, d, h, rh, ridge, opt) => add(u, v, house(u, v, w, d, h, rh, r() < 0.65 ? WC : wcs(), r() < 0.6 ? RC : rc(), ridge, opt));
    const ridge = () => (r() < 0.5 ? 'u' : 'v');
    let back = '', front = '';
    const wk = t === 1 ? 'pal' : t === 2 ? 'st' : 'fort';
    if (t >= 1) {
      back += wallSeg(-a, -a, a, -a, wk) + wallSeg(-a, -a, -a, a, wk);
      front += wallSeg(a, -a, a, a, wk);
      const gu = (r() - 0.5) * a * 0.6;               /* zidul din față, cu poartă */
      front += wallSeg(-a, a, gu - 2, a, wk) + wallSeg(gu + 2, a, a, a, wk) + gate(gu, a + (wk === 'pal' ? 0.4 : 0.7), wk === 'pal' ? 3.6 : wk === 'st' ? 3.6 : 5, wk === 'pal');
      if (t >= 3) {                                  /* turnuri în colțuri */
        const tw = t >= 4 ? 3.6 : 3.2, th = t >= 4 ? 10 : 8.5, tr = t >= 4 ? ROOF[(r() * 2) | 0 ? 1 : 2] : 'cren';
        back = tower(-a, -a, tw, th, tr) + back;
        back += tower(a, -a, tw, th, tr) + tower(-a, a, tw, th, tr);
        front += tower(a, a, tw, th, tr);
      }
    }
    if (t === 0) {
      const L = [[-5.5, -3.5], [4.5, -5], [-1, 5.5]];
      L.forEach(([u, v], i) => H(u + (r() - 0.5) * 2, v + (r() - 0.5) * 2, 5 + r() * 2, 4 + r() * 1.5, 3.4 + r(), 3 + r(), ridge(), { chim: i === 0, smoke: i === 0 }));
      add(5.5, 4.5, `<ellipse cx="${F(I(5.5, 4.5)[0])}" cy="${F(I(5.5, 4.5)[1])}" rx="2.4" ry="1.2" fill="#7a5a36"/>` + box(5.5, 4.5, 1.2, 1.2, 1.4, WOOD, 0));
    } else if (t === 1) {
      [[-5.5, -4.5], [5, -5.5], [-5.5, 5], [4, 4.5]].forEach(([u, v], i) => H(u + (r() - 0.5) * 1.6, v + (r() - 0.5) * 1.6, 4.6 + r() * 1.8, 4 + r() * 1.2, 3.4 + r(), 3 + r(), ridge(), { chim: i === 1, smoke: i === 1 }));
    } else if (t === 2) {
      [[-6.5, -5], [6, -6.5], [-6.5, 5.5], [6, 5]].forEach(([u, v], i) => H(u + (r() - 0.5) * 1.4, v + (r() - 0.5) * 1.4, 4.6 + r() * 1.4, 4 + r(), 3.6 + r(), 3 + r(), ridge(), { chim: i === 0, smoke: i === 0 }));
      add(0, 0, tower(0, 0, 3.6, 12, RC));            /* turnul de veghe din centru */
    } else if (t === 3) {
      [[-7, -6.5], [7, -7], [-7.5, 6], [6.5, 6.5]].forEach(([u, v]) => H(u, v, 4.4 + r(), 3.8 + r(), 3.6, 2.8 + r(), ridge()));
      add(0, 0, box(0, 0, 7, 7, 9, STONE) + crenel(0, 0, 7, 7, 9, STONE) + winL(-1, 1, 3.5, 4, 6.5) + tower(2.6, -2.6, 2.8, 13, RC));
    } else {
      [[-8.5, -8], [8, -8.5], [-8.5, 7.5]].forEach(([u, v]) => H(u, v, 4.2, 3.6, 3.4, 2.6, ridge()));
      /* castelul: donjon înalt, patru turnuri, steaguri */
      let k = box(0, 0, 9, 9, 6, STONE) + crenel(0, 0, 9, 9, 6, STONE);
      k = tower(-3.6, -3.6, 3.2, 15, RC) + k;
      k += box(0, 0, 5.6, 5.6, 9, STONE, 6) + crenel(0, 0, 5.6, 5.6, 15, STONE) + winL(-0.8, 0.8, 2.8, 9, 12);
      k += tower(3.6, -3.6, 3.2, 15, RC) + tower(-3.6, 3.6, 3.2, 15, RC) + tower(3.6, 3.6, 3.2, 17, RC);
      add(0, 0, k);
    }
    parts.sort((x, y) => x[0] - y[0]);
    return { s, t, hp, svg: plateau(s, hp, hash(id) ^ 99) + back + parts.map(p => p[1]).join('') + front };
  };

  /* ------------------------------------------------------------------ TRONUL */
  A.throne = function () {
    let g = `<ellipse cx="0" cy="-14" rx="78" ry="50" fill="url(#lwa-glow)"/><path d="M-10 -20L-4 -120H4L10 -20Z" fill="url(#lwa-beam)" opacity=".55"/>`;
    const SL = [['#c9d1d6', '#8e989e', '#e4e9ec'], ['#c2cad0', '#88929a', '#dde3e7'], ['#bcc5cb', '#828c93', '#d6dde2']];
    const lv = [[22, 0, 4], [16.5, 4, 4], [11, 8, 4]];
    lv.forEach(([s, z, h], i) => {
      g += box(0, 0, s * 2, s * 2, h, SL[i], z);
      for (let k = -s + 4; k < s; k += 5) g += `<path d="M${P([I(k, s, z), I(k, s, z + h)]).replace(' ', 'L').replace(/^/, '')}" stroke="#6f787e" stroke-width=".35" opacity=".7"/>`.replace('M', 'M');
      /* covorul albastru coboară spre privitor, pe fața stângă */
      g += poly([I(-3.2, s, z), I(3.2, s, z), I(3.2, s, z + h), I(-3.2, s, z + h)], '#2d5ba4', ' stroke="#183a6e" stroke-width=".4"');
      g += poly([I(-3.2, s - (i === 2 ? s : 5.5), z + h), I(3.2, s - (i === 2 ? s : 5.5), z + h), I(3.2, s, z + h), I(-3.2, s, z + h)], '#3b72c4', ' stroke="#2a5aa0" stroke-width=".3"');
      g += `<path d="M${F(I(-3.2, s, z + h)[0])} ${F(I(-3.2, s, z + h)[1])}L${F(I(3.2, s, z + h)[0])} ${F(I(3.2, s, z + h)[1])}" stroke="#f0d27a" stroke-width=".6"/>`;
    });
    /* tronul, cu fața spre privitor, pe mijlocul podiumului */
    const c = I(0, 0, 12);
    g += `<g transform="translate(${F(c[0])} ${F(c[1] + 2)})">`
      + `<ellipse cx="0" cy="1" rx="15" ry="4.5" fill="#000" opacity=".25"/>`
      + `<path d="M-11 0V-30Q-11 -40 -6 -45L0 -54L6 -45Q11 -40 11 -30V0Z" fill="url(#lwa-sv)" stroke="#2f363b" stroke-width=".8"/>`
      + `<path d="M-11 -30L-14 -36L-11 -34ZM11 -30L14 -36L11 -34Z" fill="#cfd7dc" stroke="#2f363b" stroke-width=".5"/>`
      + `<path d="M-7 -6V-29Q-7 -37 0 -46Q7 -37 7 -29V-6Z" fill="#244a86" stroke="#a9c3e6" stroke-width=".6"/>`
      + `<path d="M0 -42V-12M-4.5 -30H4.5M-3 -20H3" stroke="#7fb0ec" stroke-width=".6" opacity=".8"/>`
      + `<circle cx="0" cy="-34" r="2.3" fill="#c9ecff" stroke="#fff" stroke-width=".5"/><circle cx="0" cy="-34" r="5" fill="#9fdcff" opacity=".35"/>`
      + `<path d="M-13 -4H13L15 3H-15Z" fill="#e8edf0" stroke="#2f363b" stroke-width=".7"/><path d="M-15 3H15V6H-15Z" fill="#9aa5ab" stroke="#2f363b" stroke-width=".6"/>`
      + `<path d="M-9 -3.6H9L10 1H-10Z" fill="#3b72c4"/>`
      + `<path d="M-16 -12H-11V4H-16Z" fill="#cdd5da" stroke="#2f363b" stroke-width=".6"/><path d="M11 -12H16V4H11Z" fill="#aeb8be" stroke="#2f363b" stroke-width=".6"/>`
      + `<circle cx="-13.5" cy="-12" r="2.6" fill="#e4e9ec" stroke="#2f363b" stroke-width=".6"/><circle cx="13.5" cy="-12" r="2.6" fill="#c3ccd1" stroke="#2f363b" stroke-width=".6"/>`
      + `<path d="M-13 6V10M13 6V10" stroke="#6d777d" stroke-width="2.4" stroke-linecap="round"/>`
      + `<path d="M-5 -58l1.4-5 2 3 1.6-4.4 1.6 4.4 2-3 1.4 5z" fill="url(#lwa-gd)" stroke="#5c430c" stroke-width=".5"/>`
      + `</g>`;
    for (const [x, y, s] of [[-22, -62, 1.4], [20, -54, 1.1], [-14, -32, .9], [26, -76, 1], [-28, -44, .8], [10, -86, 1.2], [30, -30, .7]]) g += `<path d="M${x} ${y - s * 2.6}L${x + s * .6} ${y - s * .6}L${x + s * 2.6} ${y}L${x + s * .6} ${y + s * .6}L${x} ${y + s * 2.6}L${x - s * .6} ${y + s * .6}L${x - s * 2.6} ${y}L${x - s * .6} ${y - s * .6}Z" fill="#e6f6ff" opacity=".9"/>`;
    return g;
  };

  /* ------------------------------------------------------------------ TEREN */
  A.defs = `<linearGradient id="lwa-gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#86a752"/><stop offset="1" stop-color="#5f8436"/></linearGradient>
<linearGradient id="lwa-dl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a6a45"/><stop offset="1" stop-color="#5a4229"/></linearGradient>
<linearGradient id="lwa-dr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b5034"/><stop offset="1" stop-color="#3f2e1d"/></linearGradient>
<radialGradient id="lwa-glow"><stop offset="0" stop-color="#bfe6ff" stop-opacity=".75"/><stop offset=".45" stop-color="#7cc4ff" stop-opacity=".28"/><stop offset="1" stop-color="#7cc4ff" stop-opacity="0"/></radialGradient>
<linearGradient id="lwa-sv" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5f8f9"/><stop offset=".5" stop-color="#b9c3c9"/><stop offset="1" stop-color="#7b878e"/></linearGradient>
<linearGradient id="lwa-beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#cfefff" stop-opacity=".7"/><stop offset="1" stop-color="#cfefff" stop-opacity="0"/></linearGradient>
<linearGradient id="lwa-gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".5" stop-color="#f0d27a"/><stop offset="1" stop-color="#a8781c"/></linearGradient>
<radialGradient id="lwa-bg" cx="50%" cy="50%" r="75%"><stop offset="0" stop-color="#6c8d40"/><stop offset=".7" stop-color="#55743a"/><stop offset="1" stop-color="#3d5530"/></radialGradient>
<linearGradient id="lwa-mt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9aa3a6"/><stop offset=".5" stop-color="#7d878b"/><stop offset=".5" stop-color="#5c6569"/><stop offset="1" stop-color="#4a5256"/></linearGradient>`;
  const tree = (x, y, k, dark) => { const c = dark ? ['#20402a', '#2c5636', '#3a6b42'] : ['#2b5233', '#3a6b42', '#4d8452']; return `<g transform="translate(${F(x)} ${F(y)}) scale(${F(k)})"><rect x="-.6" y="-1" width="1.2" height="3" fill="#4a3220"/><path d="M0 -14L5 -4H-5Z" fill="${c[0]}"/><path d="M0 -11L5.6 -1H-5.6Z" fill="${c[1]}"/><path d="M0 -7.5L6.2 2H-6.2Z" fill="${c[2]}"/><path d="M0 -14L5 -4H0Z M0 -11L5.6 -1H0Z M0 -7.5L6.2 2H0Z" fill="#000" opacity=".18"/></g>`; };
  const oak = (x, y, k) => `<g transform="translate(${F(x)} ${F(y)}) scale(${F(k)})"><rect x="-.8" y="-2" width="1.6" height="4" fill="#4a3220"/><circle cx="0" cy="-6" r="5" fill="#3f6b33"/><circle cx="-2.6" cy="-4" r="3.4" fill="#4c7d3c"/><circle cx="2.4" cy="-4.4" r="3.2" fill="#35602c"/><circle cx="-1" cy="-8" r="2.6" fill="#5b8c45"/></g>`;
  const mountain = (x, y, k, r) => { const w = 26 * k, h = (30 + r() * 16) * k, sk = r() * 6 - 3; return `<g><path d="M${F(x - w)} ${F(y)}L${F(x + sk)} ${F(y - h)}L${F(x + w)} ${F(y)}Z" fill="url(#lwa-mt)" stroke="#2f3538" stroke-width=".7"/><path d="M${F(x + sk)} ${F(y - h)}L${F(x + sk - w * 0.28)} ${F(y - h * 0.68)}L${F(x + sk - w * 0.1)} ${F(y - h * 0.72)}L${F(x + sk + w * 0.05)} ${F(y - h * 0.62)}L${F(x + sk + w * 0.26)} ${F(y - h * 0.7)}Z" fill="#eef2f3"/></g>`; };
  const stone = (x, y, k) => `<g transform="translate(${F(x)} ${F(y)}) scale(${F(k)})"><ellipse cx="0" cy="1" rx="3.6" ry="1.4" fill="#000" opacity=".25"/><path d="M-2.6 1L-2.2 -8Q0 -10.5 2.2 -8L2.6 1Z" fill="#8b8f8c" stroke="#3a3d3b" stroke-width=".5"/><path d="M0 -7V-1M-1.2 -4.6H1.2" stroke="#4e5452" stroke-width=".6"/></g>`;

  /* drum pavat între două puncte de pe hartă */
  A.road = function (a, b) {
    const d = `M${F(a[0])} ${F(a[1])}L${F(b[0])} ${F(b[1])}`;
    return `<path d="${d}" stroke="#4b463d" stroke-width="9" stroke-linecap="round" fill="none"/><path d="${d}" stroke="#a9a493" stroke-width="7" stroke-linecap="round" fill="none"/><path d="${d}" stroke="#c4bfad" stroke-width="2.4" stroke-dasharray="3 3" stroke-linecap="round" fill="none" opacity=".7"/>`;
  };
  /* râul: o curbă care traversează harta pe sus, ocolind Tronul */
  A.river = function (B) {
    const y0 = B.y + B.h * 0.32, pts = [[B.x - 40, y0]];
    const n = 7; for (let i = 1; i <= n; i++) { const x = B.x + B.w * i / n; let y = y0 - Math.sin(i * 1.3) * B.h * 0.08 - (i / n) * B.h * 0.2; if (Math.abs(x) < 160 && y > -95) y = -95 - Math.abs(Math.sin(i)) * 20; pts.push([x, y]); }
    pts.push([B.x + B.w + 40, pts[pts.length - 1][1] - 30]);
    let d = `M${F(pts[0][0])} ${F(pts[0][1])}`; for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i], mx = (p[0] + q[0]) / 2; d += `C${F(mx)} ${F(p[1])} ${F(mx)} ${F(q[1])} ${F(q[0])} ${F(q[1])}`; }
    return `<path d="${d}" stroke="#2f4a2a" stroke-width="22" fill="none" stroke-linecap="round" opacity=".7"/><path d="${d}" stroke="#3f7898" stroke-width="15" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#5f9fc0" stroke-width="9" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#bfe3f2" stroke-width="1.6" fill="none" stroke-dasharray="10 14" opacity=".7"/>`;
  };
  /* decorul: pajiști, munți (sus, în afara satelor), păduri (jos și pe margini), pietre runice.
     inside(x, y) = punctul e prea aproape de un sat sau de Tron; R = raza zonei locuite */
  A.scenery = function (B, inside, R, seed) {
    const r = rng(seed || 1234); let low = '', mts = [], trees = [];
    low += `<rect x="${F(B.x - 300)}" y="${F(B.y - 300)}" width="${F(B.w + 600)}" height="${F(B.h + 600)}" fill="url(#lwa-bg)"/>`;
    for (let i = 0; i < 60; i++) { const x = B.x + r() * B.w, y = B.y + r() * B.h; low += `<ellipse cx="${F(x)}" cy="${F(y)}" rx="${F(20 + r() * 60)}" ry="${F(8 + r() * 22)}" fill="${r() < 0.5 ? '#7a9a48' : '#4b6a32'}" opacity="${F(0.18 + r() * 0.2)}"/>`; }
    for (let i = 0; i < 18; i++) { const x = B.x + r() * B.w, y = B.y + r() * B.h; if (!inside(x, y, 40)) low += `<ellipse cx="${F(x)}" cy="${F(y)}" rx="${F(14 + r() * 20)}" ry="${F(6 + r() * 8)}" fill="#8a7448" opacity=".35"/>`; }
    const outer = (x, y) => Math.abs(x) / (R.x) + Math.abs(y) / (R.y) > 1;
    const top = B.y + B.h * 0.3;
    /* munții: în colțurile de sus și pe marginea de sus, în afara zonei locuite */
    for (let y = B.y - 10; y < top; y += 22) for (let x = B.x - 20; x < B.x + B.w + 20; x += 30) {
      const px = x + (r() - 0.5) * 22, py = y + (r() - 0.5) * 14, edge = Math.min(px - B.x, B.x + B.w - px) / B.w;
      if (!outer(px, py) || inside(px, py, 50)) continue;
      const p = (py < B.y + B.h * 0.1 ? 0.32 : 0.08) + (edge < 0.2 ? 0.45 : edge < 0.3 ? 0.15 : 0);
      if (r() < p) mts.push([py, mountain(px, py, 0.75 + r() * 0.7, r)]);
    }
    /* codrii: pâlcuri dese în afara zonei locuite, câțiva copaci și pietre runice printre sate */
    const nC = Math.round(B.w * B.h / 26000);
    for (let c = 0; c < nC; c++) {
      const cx = B.x + r() * B.w, cy = top - 20 + r() * (B.y + B.h - top + 40);
      if (!outer(cx, cy)) continue;
      const n = 8 + ((r() * 18) | 0), sx = 26 + r() * 40, sy = 14 + r() * 22, dark = r() < 0.5;
      for (let i = 0; i < n; i++) { const a = r() * 6.28, d = Math.sqrt(r()), px = cx + Math.cos(a) * sx * d, py = cy + Math.sin(a) * sy * d; if (!inside(px, py, 40)) trees.push([py, r() < 0.15 ? oak(px, py, 1 + r() * 0.4) : tree(px, py, 1.1 + r() * 0.5, dark)]); }
    }
    for (let i = 0; i < B.w * B.h / 9000; i++) {
      const px = B.x + r() * B.w, py = top + r() * (B.y + B.h - top);
      if (inside(px, py, 44)) continue;
      const k = r(); if (k < 0.06) trees.push([py, stone(px, py, 1.1)]); else if (k < 0.5) trees.push([py, r() < 0.5 ? oak(px, py, 0.9 + r() * 0.4) : tree(px, py, 0.9 + r() * 0.3)]);
    }
    return { low, high: [...mts, ...trees].sort((a, b) => a[0] - b[0]).map(x => x[1]).join('') };
  };

  /* plăcuța de piatră cu numele */
  /* plăcuța de piatră cu numele; len = lungimea textului fără entități HTML; badge = nivelul, într-un medalion la capăt */
  A.plate = function (y, txt, mine, small, len, badge) {
    const n = len != null ? len : txt.length, w = n * (small ? 4.6 : 5.4) + 16, h = small ? 11 : 13;
    let g = `<g transform="translate(0 ${F(y)})" pointer-events="none"><rect x="${F(-w / 2 + 0.8)}" y="${F(-h / 2 + 1.2)}" width="${F(w)}" height="${h}" rx="2.5" fill="#000" opacity=".4"/><rect x="${F(-w / 2)}" y="${F(-h / 2)}" width="${F(w)}" height="${h}" rx="2.5" fill="url(#lwa-pl)" stroke="${mine ? '#f0d27a' : '#a9b0b3'}" stroke-width="${mine ? 1.1 : 0.8}"/><text y="${F(h * 0.3)}" text-anchor="middle" fill="${mine ? '#f6dc8c' : '#eef0ec'}" style="font:700 ${small ? 7.4 : 8.6}px Alegreya,Georgia,serif">${txt}</text>`;
    if (badge != null) g += `<g transform="translate(${F(w / 2 + 3)} 0)"><circle r="7" fill="#1b1508" stroke="${mine ? '#f0d27a' : '#c9a24b'}" stroke-width="1.1"/><text y="3" text-anchor="middle" fill="#f0d27a" style="font:700 ${badge > 99 ? 6.4 : 8}px Cinzel,Georgia,serif">${badge}</text></g>`;
    return g + '</g>';
  };
  A.defs += `<radialGradient id="lwa-vg" cx="50%" cy="50%" r="70%"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient><linearGradient id="lwa-pl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4c5356"/><stop offset="1" stop-color="#2a2f31"/></linearGradient>`;
  A.I = I; A.P = P;
  /* piesele de desen, folosite și pentru clădirile satului (sat.js) */
  Object.assign(A, { box, house, tower, wallSeg, gate, crenel, plateau, poly, winL, winR, ROOF, WALLC, STONE, WOOD });
  if (typeof module !== 'undefined' && module.exports) module.exports = A;
  root.LWA = A;
})(typeof globalThis !== 'undefined' ? globalThis : this);
