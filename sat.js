/* ============================================================================
   Silver Throne — sat.js
   1) Satul ca pagină de start: clădirile ilustrate (în stilul hărții Lumii), fiecare cu starea ei;
      în interiorul unei clădiri, o bandă „‹ Sat” + celelalte clădiri, pentru trecere directă.
      S.vil = '' înseamnă pagina de start; altfel cheia clădirii (VL din index.html).
   2) Bonusurile obiectelor apar într-o fereastră mică la trecerea cursorului (pe telefon: la atingerea numelui).
      Orice element cu data-tip="…" (HTML) primește fereastra; itTip(it, cmp) o construiește pentru un obiect.
   3) Explicațiile lungi de la începutul paginilor se strâng sub „ⓘ Cum funcționează”; prima propoziție rămâne.
   Se încarcă după lume-art.js și înaintea scriptului din pagină.
   ========================================================================== */

/* ------------------------------------------------------------------ CLĂDIRILE */
const SAT_B = [
  ['a', 'Topitorie', 'forjează echipament'], ['p', 'Piață', 'cumpără echipament'], ['l', 'Negustor', 'obiecte rare'], ['h', 'Han', 'mercenarii tăi'],
  ['i', 'Infirmerie', 'vindecă și ridică'], ['t', 'Antrenament', 'Forță, Rezistență…'], ['x', 'Misiuni', 'sarcini zilnice'], ['d', 'Depozit', 'materiale'],
  ['z', 'Apărare', 'străjeri și zid'], ['g', 'Steag', 'culoarea satului'], ['q', 'Bot', 'joacă singur (premium)']
];
/* zonele din imaginile satului (imagini/sat/sat-1…3.jpg, 1152×928, aceeași așezare pe toate stadiile): poligonul pe care apeși și locul etichetei */
const SAT_W = 1152, SAT_H = 928;
const SAT_Z = {
  a: [[45, 255, 360, 255, 365, 500, 45, 500], [200, 262]],
  p: [[390, 210, 565, 210, 565, 365, 390, 365], [478, 212]],
  l: [[795, 125, 1040, 125, 1040, 370, 795, 370], [918, 140]],
  h: [[865, 380, 1152, 380, 1152, 650, 865, 650], [1012, 430]],
  i: [[45, 555, 375, 555, 375, 880, 45, 880], [210, 575]],
  t: [[640, 590, 1060, 590, 1060, 800, 640, 800], [850, 612]],
  x: [[528, 395, 630, 395, 630, 500, 528, 500], [578, 402]],
  g: [[632, 330, 692, 330, 692, 495, 632, 495], [664, 336]],
  d: [[590, 10, 735, 10, 735, 295, 590, 295], [662, 130]],
  z: [[400, 640, 640, 640, 640, 860, 400, 860], [520, 700]]
};
/* imaginea satului după stadiu: Tabără/Sătuc → 1, Sat/Târg întărit → 2, Cetate → 3 */
function satImgN() { const s = typeof terStage === 'function' ? terStage() : ''; return /Cetate/.test(s) ? 3 : /^(Sat|Târg)/.test(s) ? 2 : 1; }
const SAT_ICON = {};
function satIcon(k) {
  if (SAT_ICON[k]) return SAT_ICON[k];
  const L = LWA, I = L.I, F = L.F, ST = L.STONE, WD = L.WOOD, R = L.ROOF, WC = L.WALLC;
  const puff = (u, v, h, r, o) => { const p = I(u, v, h); return `<circle cx="${F(p[0])}" cy="${F(p[1])}" r="${r}" fill="#d6d0c4" opacity="${o}"/>`; };
  let g = L.plateau(13, 5, k.charCodeAt(0) * 97);
  if (k === 'a') {        /* topitoria: casă de piatră, horn mare cu fum, nicovală, jar în ușă */
    g += L.house(-1, 1, 10, 8, 5, 3.4, [ST[0], ST[1]], R[2], 'u');
    g += L.poly([I(-2.4, 5.05, 0), I(0.4, 5.05, 0), I(0.4, 5.05, 3.4), I(-2.4, 5.05, 3.4)], '#f08a2a') + L.poly([I(-2, 5.06, 0), I(0, 5.06, 0), I(0, 5.06, 2.4), I(-2, 5.06, 2.4)], '#ffd27a');
    g += L.box(3.6, -2.4, 2.4, 2.4, 13, ['#7d756a', '#5a534a', '#4a443c']);
    g += puff(3.6, -2.4, 16, 2.2, .5) + puff(4.8, -3.4, 19.5, 2.8, .38) + puff(6.4, -4.4, 23, 3.4, .25);
    g += L.box(6, 6, 2.6, 1.6, 1.4, ['#3d3f42', '#2a2c2e', '#55585c']) + L.box(6, 6, 3.6, 1.6, 0.7, ['#4b4e52', '#323437', '#6a6e72'], 1.4);
  } else if (k === 'h') { /* hanul: casă cu etaj, firmă cu cană */
    g += L.house(-1, -1, 11, 9, 8, 4.2, WC[0], R[1], 'v', { chim: true, smoke: true });
    g += L.winL(-4, -2.2, 3.5, 5, 7) + L.winL(1.2, 3, 3.5, 5, 7);
    const a = I(6.5, 5.5, 0), b = I(6.5, 5.5, 9);
    g += `<path d="M${F(a[0])} ${F(a[1])}V${F(b[1])}h-6" stroke="#3a2614" stroke-width="1.1" fill="none"/><rect x="${F(b[0] - 9)}" y="${F(b[1] + 1)}" width="7" height="5.5" rx="1" fill="#c9a24b" stroke="#3a2614" stroke-width=".6"/><path d="M${F(b[0] - 7.4)} ${F(b[1] + 2.2)}h2.8v3h-2.8z" fill="#7a4a1e"/>`;
  } else if (k === 't') { /* curtea: turn cu steag, manechin de antrenament, casă mică */
    g += L.house(4, -4, 7, 6, 4, 3, WC[1], R[0], 'u');
    g += L.tower(-4, -2, 5, 15, 'cren');
    const p = I(5, 6, 0), t = I(5, 6, 7);
    g += `<path d="M${F(p[0])} ${F(p[1])}V${F(t[1])}M${F(t[0] - 3.4)} ${F(t[1] + 2.4)}h6.8" stroke="#6b4a2a" stroke-width="1.2"/><circle cx="${F(t[0])}" cy="${F(t[1] - 1.4)}" r="1.6" fill="#c9a77a" stroke="#4a3220" stroke-width=".5"/><ellipse cx="${F(t[0])}" cy="${F(t[1] + 3.6)}" rx="1.8" ry="2.6" fill="#b08b5a" stroke="#4a3220" stroke-width=".5"/>`;
  } else if (k === 'x') { /* misiuni: panou cu anunțuri, colibă */
    g += L.house(-4, -4, 8, 6, 4, 3.2, WC[3], R[3], 'v');
    g += L.box(3, 3, 0.8, 0.8, 8, WD) + L.box(3, 8.6, 0.8, 0.8, 8, WD) + L.box(3, 5.8, 0.9, 6.4, 4.6, ['#8a6239', '#6b4b2c', '#a57a4b'], 3);
    for (const [v, z, c] of [[3.6, 6.4, '#efe6cf'], [5.6, 4.6, '#e8d9b0'], [7.2, 6.2, '#f3ecd8'], [5.2, 6.9, '#d9c79a']]) g += L.poly([I(3.47, v, z), I(3.47, v + 1.2, z), I(3.47, v + 1.2, z + 1.5), I(3.47, v, z + 1.5)], c, ' stroke="#5a4428" stroke-width=".2"');
    g += L.poly([I(3.47, 4, 4.4), I(3.47, 8.8, 4.4)], 'none', ' stroke="#c0504a" stroke-width=".5"');
  } else if (k === 'p') { /* piața: tarabe cu prelate în dungi */
    const stall = (u, v, c) => {   /* tejghea, patru stâlpi și o prelată în dungi, ridicată */
      const a = u - 2.8, b = u + 2.8, e = v - 2.1, f = v + 2.1, z = 4.2, zr = 5.8;
      let t = L.box(u, v + 0.6, 5, 2.4, 1.6, ['#a07a52', '#765a3b', '#c9a77a']);
      for (const [pu, pv] of [[a + 0.3, e + 0.3], [b - 0.3, e + 0.3], [a + 0.3, f - 0.3], [b - 0.3, f - 0.3]]) t += L.box(pu, pv, 0.4, 0.4, z, ['#5a3d22', '#3e2a17']);
      for (let i = 0; i < 4; i++) { const u0 = a + (b - a) * i / 4, u1 = a + (b - a) * (i + 1) / 4, col = i % 2 ? '#efe8d6' : c[0];
        t += L.poly([I(u0, v, zr), I(u1, v, zr), I(u1, e - 0.5, z - 0.3), I(u0, e - 0.5, z - 0.3)], i % 2 ? '#c9c2ae' : c[1], ' stroke="#2a1d12" stroke-width=".25"');
        t += L.poly([I(u0, f + 0.5, z - 0.3), I(u1, f + 0.5, z - 0.3), I(u1, v, zr), I(u0, v, zr)], col, ' stroke="#2a1d12" stroke-width=".25"'); }
      return t;
    };
    g += stall(-5, -4, ['#c0504a', '#8a3530']) + stall(4.5, -4.5, ['#e3dcc8', '#b5ad99']) + stall(-0.5, 4.5, ['#4f7fb0', '#36597d']);
    g += `<circle cx="${F(I(5, 5)[0])}" cy="${F(I(5, 5)[1] - 1)}" r="1.6" fill="#d9a53a"/><circle cx="${F(I(5.8, 5.6)[0])}" cy="${F(I(5.8, 5.6)[1] - 1)}" r="1.6" fill="#7aa046"/>`;
  } else if (k === 'l') { /* negustorul: căruță cu coviltir, lăzi, monede */
    g += L.box(-1, 0, 11, 5, 3.2, ['#8a6239', '#64452a', '#a57a4b'], 1.2);
    const top = [I(-6.5, -2.5, 4.4), I(4.5, -2.5, 4.4), I(4.5, 2.5, 4.4), I(-6.5, 2.5, 4.4)];
    g += `<path d="M${F(top[3][0])} ${F(top[3][1])}Q${F(I(-1, 2.5, 11)[0])} ${F(I(-1, 2.5, 11)[1])} ${F(top[2][0])} ${F(top[2][1])}L${F(top[1][0])} ${F(top[1][1])}Q${F(I(-1, -2.5, 11)[0])} ${F(I(-1, -2.5, 11)[1])} ${F(top[0][0])} ${F(top[0][1])}Z" fill="#e6dcc0" stroke="#5a4a30" stroke-width=".6"/>`;
    for (const [u, v] of [[-4.5, 2.6], [2.5, 2.6]]) { const c = I(u, v, 1.4); g += `<ellipse cx="${F(c[0])}" cy="${F(c[1])}" rx="2.4" ry="2.6" fill="none" stroke="#3a2614" stroke-width="1"/>`; }
    g += L.box(6.5, 5.5, 3, 3, 2.6, WD) + L.box(5.5, 8.5, 2.4, 2.4, 2, WD);
    for (const [u, v, z] of [[8.6, 1.5, 0], [9.6, 2.4, 0], [9, 2, 0.7]]) { const c = I(u, v, z); g += `<ellipse cx="${F(c[0])}" cy="${F(c[1])}" rx="1.6" ry=".8" fill="#f0d27a" stroke="#8a6a1e" stroke-width=".4"/>`; }
  } else if (k === 'd') { /* depozitul: hambar, lăzi, saci */
    g += L.house(-1.5, -1.5, 13, 9, 5, 4, ['#8a5a3a', '#653f28'], R[3], 'u');
    g += L.poly([I(-3.5, 3.05, 0), I(0.5, 3.05, 0), I(0.5, 3.05, 4), I(-3.5, 3.05, 4)], '#3a2614') + L.poly([I(-3.5, 3.06, 0), I(0.5, 3.06, 4)], 'none', ' stroke="#8a6239" stroke-width=".5"');
    g += L.box(6.5, 6, 3, 3, 2.6, WD) + L.box(6.5, 6, 2.4, 2.4, 2, WD, 2.6) + L.box(3, 8.5, 2.6, 2.6, 2.2, WD);
    for (const [u, v] of [[8.5, 1.5], [9, 3.4]]) { const c = I(u, v, 1); g += `<ellipse cx="${F(c[0])}" cy="${F(c[1])}" rx="2" ry="1.6" fill="#c9b48a" stroke="#6b5434" stroke-width=".4"/>`; }
  } else if (k === 'z') { /* apărarea: zid cu turnuri și poartă */
    g += L.tower(-7, -7, 4, 11, 'cren') + L.wallSeg(-7, -7, 7, -7, 'fort') + L.wallSeg(-7, -7, -7, 7, 'fort') + L.tower(7, -7, 4, 11, 'cren') + L.tower(-7, 7, 4, 11, 'cren');
    g += L.wallSeg(-7, 7, -2, 7, 'fort') + L.wallSeg(2, 7, 7, 7, 'fort') + L.gate(0, 7.7, 5) + L.wallSeg(7, -7, 7, 7, 'fort') + L.tower(7, 7, 4, 12, 'cren');
  } else if (k === 'i') { /* infirmeria: casă albă cu cruce roșie */
    g += L.house(0, 0, 11, 8, 5, 3.6, ['#e8e2d2', '#c9c2ae'], R[0], 'u');
    const c = I(0, 4.05, 3.2); g += `<rect x="${F(c[0] - 1.2)}" y="${F(c[1] - 3.4)}" width="2.4" height="6.8" fill="#c0392b"/><rect x="${F(c[0] - 3.4)}" y="${F(c[1] - 1.2)}" width="6.8" height="2.4" fill="#c0392b"/>`;
  } else if (k === 'g') { /* steagul: catarg cu flamură */
    const a = I(0, 0, 0), b = I(0, 0, 22);
    g += `<path d="M${F(a[0])} ${F(a[1])}V${F(b[1])}" stroke="#3a2614" stroke-width="1.6"/><path d="M${F(b[0])} ${F(b[1])}l13 3-3 4 3 4-13 3z" fill="#c0504a" stroke="#5a1f1a" stroke-width=".6"/>` + L.box(0, 0, 3, 3, 1.4, ['#8a8f93', '#6a6e72', '#a6abb0']);
  } else if (k === 'q') { /* botul: turn cu ceas */
    g += L.house(5, 4, 6, 5, 3.4, 2.6, WC[2], R[0], 'u');
    g += L.tower(-2, -2, 5.4, 15, R[2]);
    const c = I(-2, 0.75, 11.5);
    g += `<circle cx="${F(c[0])}" cy="${F(c[1])}" r="2.3" fill="#f3ecd8" stroke="#3a2614" stroke-width=".6"/><path d="M${F(c[0])} ${F(c[1])}v-1.6M${F(c[0])} ${F(c[1])}h1.2" stroke="#3a2614" stroke-width=".5"/>`;
  }
  return (SAT_ICON[k] = `<svg viewBox="-31 -39 62 56" aria-hidden="true">${g}</svg>`);
}
/* defs-urile desenelor (gradientele) o singură dată în pagină */
function satDefs() { return `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${LWA.defs}</defs></svg>`; }

/* starea fiecărei clădiri: [text, „fierbinte” (ai ceva de făcut acolo)] */
function satStatus(k) {
  try {
    const g = S.gold, now = Date.now();
    if (k === 'a') {
      const rdy = S.forge.slice(0, S.slots).filter(x => x && now >= x.end).length, busy = S.forge.slice(0, S.slots).filter(x => x && now < x.end), free = S.slots - S.forge.slice(0, S.slots).filter(Boolean).length;
      if (rdy) return [`${rdy} ${rdy === 1 ? 'obiect gata' : 'obiecte gata'} de ridicat`, 1];
      if (busy.length) return [`forjează ${busy.length}/${S.slots} · <span data-end="${Math.min(...busy.map(x => x.end))}">${fmt(Math.min(...busy.map(x => x.end)) - now)}</span>`, 0];
      return [`${free} ${free === 1 ? 'loc liber' : 'locuri libere'}`, free > 0 ? 0 : 0];
    }
    if (k === 'h') { const n = mrAll().filter(f => !f.h).length, r = typeof mxReady === 'function' ? mxReady() : 0; return [r ? `${r} ${r === 1 ? 's-a întors' : 's-au întors'} din expediție` : `${n}/5 mercenari`, mrAll().some(f => f.nn) || r > 0]; }
    if (k === 't') { const s = ST(), tc = ['f', 'r', 'a', 'p', 'n'].filter(x => s[x] < smax()).map(x => stc(s[x])).sort((a, b) => a - b)[0]; return [tc != null && tc <= g ? 'poți antrena acum' : 'Forță, Rezistență, Agilitate…', tc != null && tc <= g]; }
    if (k === 'x') { const m = dm(), r = dmReady(), d = m.list.filter(x => x.c).length, ch = typeof dcReady === 'function' && dcReady(); return [ch ? 'cufărul zilnic te așteaptă' : r ? `${r} de revendicat` : `${d}/${m.list.length} terminate azi`, r > 0 || ch]; }
    if (k === 'p') { const s = shop(), n = SH.reduce((a, [x]) => a + ((s[x] || []).length), 0); return [`${n} ${n === 1 ? 'obiect' : 'obiecte'} de vânzare`, 0]; }
    if (k === 'l') return [S.lvl < 6 ? 'se deschide la nivelul 6' : 'obiecte de calitate', 0];
    if (k === 'd') return [`minereu ${S.ore} · capacitate ${cap()}`, 0];
    if (k === 'z') { const t = (S.na || now) - now; return [`putere ${dpw()} · atac în ${sdT(t)}`, !!(S.al && S.al.length)]; }
    if (k === 'q') return [S.prem ? (S.bot && S.bot.on ? 'pornit' : 'oprit') : 'premium', 0];
    if (k === 'i') { const d = deadAll().length, h = mrAll().filter(f => f.hp > 0 && f.hp < mhp(f)).length; return [d ? `${d} ${d === 1 ? 'căzut' : 'căzuți'} de ridicat` : h ? `${h} ${h === 1 ? 'rănit' : 'răniți'}` : 'toți sănătoși', d > 0]; }
    if (k === 'g') return ['culoarea satului', 0];
  } catch (e) { /* o stare care nu se poate calcula nu oprește pagina */ }
  return ['', 0];
}
function satLvl(k) { const m = { a: 'f', h: 'b', i: 'i', d: 'd', z: 'z' }[k]; return m ? (BL()[m] || 0) : null; }

/* pagina de start a Satului: imaginea satului, cu zone pe care apeși și etichete cu starea fiecărei clădiri */
function vHub() {
  const N = Object.fromEntries(SAT_B.map(([k, n]) => [k, n]));
  let zones = '', labels = '';
  for (const k in SAT_Z) {
    const [pts, [lx, ly]] = SAT_Z[k], [st, hot] = satStatus(k), lv = satLvl(k);
    zones += `<polygon class="vh-z${hot ? ' hot' : ''}" data-z="${k}" points="${pts.join(' ')}" onclick="vil('${k}')"/>`;
    labels += `<button class="vh-lb${hot ? ' hot' : ''}" data-v="${k}" style="left:${(lx / SAT_W * 100).toFixed(2)}%;top:${(ly / SAT_H * 100).toFixed(2)}%" onclick="vil('${k}')" onmouseenter="satHov('${k}',1)" onmouseleave="satHov('${k}',0)" aria-label="${N[k]}${lv != null ? ', nivel ' + lv : ''}: ${st.replace(/<[^>]+>/g, '')}"><b>${N[k]}${lv != null ? ` <small>${lv}</small>` : ''}</b><span>${st}</span></button>`;
  }
  const [bs] = satStatus('q');
  return `<section class="vh vh-sat"><h2>${typeof terStage === 'function' ? 'Satul tău · ' + terStage() : 'Satul tău'}</h2><div class="vh-map"><img src="imagini/sat/sat-${satImgN()}.jpg" alt="Satul tău, cu clădirile pe care le poți deschide" width="1152" height="928"><svg viewBox="0 0 1152 928" preserveAspectRatio="none" aria-hidden="true">${zones}</svg>${labels}</div>`
    + `<div class="vh-more"><button class="vb-c" data-v="q" onclick="vil('q')"><span class="vb-i">${satIcon('q')}</span><span>Bot · ${bs}</span></button><span class="mute">Atinge o clădire ca s-o deschizi.</span></div></section>${typeof tronBanner === 'function' ? tronBanner() : ''}`;
}
function satHov(k, on) { const z = document.querySelector(`.vh-z[data-z="${k}"]`); if (z) z.classList.toggle('on', !!on); }
/* banda din interiorul unei clădiri: înapoi la Sat + celelalte clădiri */
function vBar(k) {
  return `${satDefs()}<div class="vb"><button class="vb-back" onclick="vil('')" aria-label="Înapoi la Sat">‹ Sat</button><div class="vb-ch">${SAT_B.map(([x, n]) => { const hot = satStatus(x)[1]; return `<button class="vb-c${x === k ? ' on' : ''}${hot ? ' hot' : ''}" data-v="${x}" onclick="vil('${x}')" aria-current="${x === k}"><span class="vb-i">${satIcon(x)}</span><span>${n}</span></button>`; }).join('')}</div></div>`;
}

/* ------------------------------------------------------------------ FEREASTRA CU BONUSURI */
const tipAttr = h => String(h).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/* conținutul ferestrei pentru un obiect; cmp = comparația față de cel echipat (HTML) */
function itTip(it, cmp) {
  const L = typeof INV_L !== 'undefined' ? INV_L : {}, rows = Object.keys(it.s || {}).filter(k => it.s[k]).map(k => `<li class="${it.s[k] < 0 ? 'neg' : ''}"><b>${it.s[k] > 0 ? '+' : '−'}${Math.abs(it.s[k])}</b> ${L[k] || k}</li>`).join('');
  const wt = typeof WF !== 'undefined' && it.t === 'w' && WF[wfOf(it)], wcl = wt && (wt.c === 'Campion' ? 'erou' : wt.c), wline = wt ? `<div class="tp-w">${wt.n} · potrivită pentru ${wcl} (+30% din atacul armei)<br><span>${wt.d}</span></div>` : '';
  const r = it.lg ? 'Legendar' : RAR[it.r].n;
  return `<div class="tp-h ${it.lg ? 'rl' : 'r' + (it.r + 1)}">${it.name}</div><div class="tp-s">nivel ${it.l} · ${r}${it.q != null ? ' · ' + QN[it.q] : ''}</div>${wline}${rows ? `<ul class="tp-l">${rows}</ul>` : ''}${it.lg && typeof LG !== 'undefined' && LG[it.lg] && LG[it.lg].d ? `<div class="tp-x">${LG[it.lg].d}</div>` : ''}${cmp ? `<div class="tp-c">${cmp}</div>` : ''}`;
}
const itTipA = (it, cmp) => ` data-tip="${tipAttr(itTip(it, cmp))}" tabindex="0"`;
(function () {
  if (typeof document === 'undefined') return;
  let el = null, cur = null, touch = false;
  const hide = () => { if (el) el.classList.remove('on'); cur = null; };
  function show(t) {
    if (!el) { el = document.createElement('div'); el.id = 'itip'; el.setAttribute('role', 'tooltip'); document.body.appendChild(el); }
    el.innerHTML = t.getAttribute('data-tip'); el.classList.add('on'); cur = t;
    const r = t.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight, vw = document.documentElement.clientWidth, top = ((document.querySelector('header') || {}).getBoundingClientRect?.().bottom || 0) + 6;
    let x = Math.max(6, Math.min(vw - w - 6, r.left + r.width / 2 - w / 2)), y = r.top - h - 8;
    if (y < top) y = r.bottom + 8;
    el.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
  }
  window.tipHide = hide;
  document.addEventListener('pointerover', e => {
    touch = e.pointerType === 'touch'; if (touch) return;
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t) { if (t !== cur) show(t); } else if (cur) hide();
  });
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (t && touch) { if (t === cur) hide(); else show(t); return; }   /* pe telefon: atingerea numelui arată / ascunde */
    if (!t && cur && !(e.target.closest && e.target.closest('#itip'))) hide();
  });
  document.addEventListener('focusin', e => { const t = e.target.closest && e.target.closest('[data-tip]'); if (t) show(t); });
  document.addEventListener('focusout', e => { if (cur && e.target === cur) hide(); });
  addEventListener('scroll', hide, { passive: true }); addEventListener('resize', hide);
})();

/* ------------------------------------------------------------------ EXPLICAȚIILE STRÂNSE */
const SAT_OPEN = new Set();
function satFold() {
  const v = document.getElementById('v'); if (!v) return;
  v.querySelectorAll('section').forEach(sec => {
    if (sec.classList.contains('gh') || sec.classList.contains('gh-idle') || sec.classList.contains('vh')) return;
    const h2 = sec.querySelector(':scope > h2'); if (!h2) return;
    const m = h2.nextElementSibling;
    if (!m || !m.classList.contains('mute') || m.querySelector('button,select,input,a,[data-end]') || m.textContent.trim().length < 150) return;
    const key = h2.textContent.trim(), html = m.innerHTML;
    /* prima propoziție rămâne la vedere (adesea e o stare: „În mină: 3/3”), restul se strânge */
    let i = html.search(/\.\s+(?=[A-ZĂÂÎȘȚ„<])/), lead = '', rest = html;
    if (i > 0 && i < 170 && (html.slice(0, i).split('<').length === html.slice(0, i).split('>').length)) { lead = html.slice(0, i + 1); rest = html.slice(i + 1).trim(); }
    const d = document.createElement('div'); d.className = 'info';
    d.innerHTML = `${lead ? `<div class="mute">${lead}</div>` : ''}<details${SAT_OPEN.has(key) ? ' open' : ''}><summary>ⓘ Cum funcționează</summary><div class="mute">${rest}</div></details>`;
    d.querySelector('details').addEventListener('toggle', ev => { if (ev.target.open) SAT_OPEN.add(key); else SAT_OPEN.delete(key); });
    m.replaceWith(d);
  });
}
function satPost() { try { if (typeof tipHide === 'function') tipHide(); satFold(); const c = document.getElementById('hdr-cl'); if (c) c.classList.toggle('on', S.tab === 'k'); } catch (e) { /* aspectul nu blochează jocul */ } }

/* ------------------------------------------------------------------ STILURI */
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `
.vh .vh-grid{margin-top:4px}
.uii{display:inline-block;width:1.3em;height:1.3em;object-fit:contain;vertical-align:middle;filter:drop-shadow(0 1px 2px #000a)}
.ni .uii{width:30px;height:30px}.rc .uii{width:28px;height:28px;flex:none}.sd-i .uii{width:22px;height:22px}#hdr-cl .uii{width:20px;height:20px}
.ico .uii{width:82%;height:82%}
.scard.emp[data-k]::before{content:''!important;position:absolute;right:12px;top:30px;width:56px;height:56px;background:center/contain no-repeat;opacity:.28;filter:grayscale(.3)!important;font-size:0!important;pointer-events:none}
.scard.emp[data-k="w"]::before{background-image:url(imagini/ui/slot-arma.webp)}.scard.emp[data-k="a"]::before{background-image:url(imagini/ui/slot-armura.webp)}
.scard.emp[data-k="h"]::before{background-image:url(imagini/ui/slot-coif.webp)}.scard.emp[data-k="b"]::before{background-image:url(imagini/ui/slot-cizme.webp)}
.scard.emp[data-k="j"]::before{background-image:url(imagini/ui/slot-bijuterie.webp)}.scard.emp[data-k="r"]::before{background-image:url(imagini/ui/slot-relicva.webp)}
.vh-sat h2{margin-bottom:10px}
.vh-map{position:relative;border-radius:12px;overflow:hidden;border:1px solid var(--gold);box-shadow:0 8px 24px #000a;line-height:0}
.vh-map img{display:block;width:100%;height:auto}
.vh-map svg{position:absolute;inset:0;width:100%;height:100%}
.vh-z{fill:#f0d27a;fill-opacity:0;stroke:#f0d27a;stroke-opacity:0;stroke-width:3;cursor:pointer;transition:fill-opacity .15s,stroke-opacity .15s}
.vh-z:hover,.vh-z.on{fill-opacity:.16;stroke-opacity:.9}
.vh-lb{position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:1px;padding:3px 9px 4px!important;min-height:0!important;line-height:1.15;border-radius:8px;border:1px solid #c9a24bcc!important;background:linear-gradient(180deg,#1d2427ee,#0e1214ee)!important;color:var(--ink)!important;box-shadow:0 3px 10px #000b!important;white-space:nowrap;z-index:2}
.vh-lb b{font:700 13px Cinzel,Georgia,serif;color:var(--gold2)}.vh-lb b small{font:600 11px Alegreya,serif;color:var(--mute);margin-left:2px}
.vh-lb span{font-size:11.5px;color:var(--mute);max-width:190px;overflow:hidden;text-overflow:ellipsis}
.vh-lb.hot{border-color:var(--gold2)!important;box-shadow:0 0 0 1px var(--gold2),0 0 14px #f0d27a66!important}.vh-lb.hot span{color:var(--gold2)}
.vh-lb.hot::after{content:'';position:absolute;top:-4px;right:-4px;width:9px;height:9px;border-radius:50%;background:var(--gold2);box-shadow:0 0 8px var(--gold2)}
.vh-lb:hover{border-color:var(--gold2)!important}
.vh-more{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}
header h1{text-shadow:none!important}header h1 .hd-tron{display:block;height:40px;width:auto;filter:drop-shadow(0 2px 4px #000c)}
header h1 .hd-nm{text-shadow:none!important;font:700 21px/1 Cinzel,Georgia,serif;letter-spacing:.08em;text-transform:uppercase;background:linear-gradient(180deg,#ffffff 0,#dfe5e9 38%,#9aa6ad 62%,#5f6b72 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;filter:drop-shadow(0 1px 0 #000) drop-shadow(0 0 6px #c9d1d633)}
@media (max-width:959px){header h1 .hd-tron{height:30px}header h1 .hd-nm{font-size:16px}}
#v>.hero:first-child{min-height:170px}
.vh-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:10px}
.vh-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 8px 10px;text-align:center;border:1px solid var(--line);border-radius:12px;background:radial-gradient(ellipse at 50% 38%,#2b3a2c 0,#16201a 55%,#101416 100%);box-shadow:inset 0 1px 0 #ffffff10,0 4px 12px #0008;transition:transform .15s,border-color .15s}
.vh-card:hover{transform:translateY(-2px);border-color:var(--gold)}
.vh-card.hot{border-color:var(--gold2);box-shadow:0 0 0 1px var(--gold2),0 0 18px #f0d27a40,inset 0 1px 0 #ffffff10}
.vh-card.hot::after{content:'';position:absolute;top:8px;right:8px;width:10px;height:10px;border-radius:50%;background:var(--gold2);box-shadow:0 0 8px var(--gold2)}
.vh-art svg{display:block;width:134px;height:121px;filter:drop-shadow(0 4px 6px #0009)}
.vh-n{font:700 16px Cinzel,Georgia,serif;color:var(--ink)}.vh-n small{font:600 12px Alegreya,Georgia,serif;color:var(--gold)}
.vh-d{font-size:13.5px;color:var(--mute);line-height:1.3;min-height:2.6em}.vh-card.hot .vh-d{color:var(--gold2)}
.vb{display:flex;align-items:stretch;gap:8px;margin:0 0 14px}
.vb-back{flex:none;padding:6px 12px;font:700 15px Cinzel,serif;border-radius:10px}
.vb-ch{display:flex;gap:6px;overflow-x:auto;padding:2px 2px 6px;scrollbar-width:thin;flex:1;min-width:0}
.vb-c{flex:none;display:flex;align-items:center;gap:6px;padding:3px 10px 3px 4px;border-radius:10px;font-size:14px;background:linear-gradient(180deg,#1b2226,#101517)!important;border:1px solid var(--line)!important;color:var(--mute);position:relative}
.vb-c .vb-i svg{display:block;width:36px;height:33px}
.vb-c.on{border-color:var(--gold2)!important;color:var(--gold2);background:linear-gradient(180deg,#2a2412,#15110a)!important}
.vb-c.hot::after{content:'';position:absolute;top:3px;right:3px;width:7px;height:7px;border-radius:50%;background:var(--gold2)}
#itip{position:fixed;left:0;top:0;z-index:30000;display:none;max-width:290px;padding:8px 11px 9px;background:linear-gradient(180deg,#1d2427f5,#111618f5);border:1px solid var(--gold);border-radius:8px;box-shadow:0 10px 26px #000c;font-size:14px;color:var(--ink);pointer-events:none}
#itip.on{display:block}
.tp-h{font:700 15px Cinzel,Georgia,serif;line-height:1.25}.tp-s{font-size:12.5px;color:var(--mute);margin:1px 0 4px}
.tp-l{list-style:none;margin:0;padding:0}.tp-l li.neg b{color:#e8837b}.tp-w{margin:0 0 4px;font-size:12.5px;color:var(--gold2)}.tp-w span{color:var(--mute)}.tp-l li{padding:1px 0}.tp-l b{color:#7fd88c}
.tp-x{margin-top:5px;color:var(--gold2);font-size:13px}
.tp-c{margin-top:6px;padding-top:6px;border-top:1px solid #ffffff1a}.tp-c .chips{margin:0}
[data-tip]{cursor:help;outline:none}[data-tip]:focus-visible{box-shadow:0 0 0 2px var(--gold2);border-radius:4px}
.ic-n[data-tip]>span[class^="r"],.ic-n[data-tip]>span.rl{text-decoration:underline dotted #ffffff40;text-underline-offset:3px}
.ic-v{display:inline-block;margin:3px 0 0;font-size:12.5px;padding:0 7px;border-radius:9px;border:1px solid #ffffff1a;color:var(--mute)}
.ic-v.up{color:#7fd88c;border-color:#4fa35e77}.ic-v.dn{color:#e8837b;border-color:#d4564f77}.ic-v.nw{color:var(--gold2);border-color:#c9a24b77}
.info>details{margin-top:2px}.info summary{cursor:pointer;color:var(--gold2);font-size:13.5px;list-style:none;display:inline-block;padding:2px 0}
.info summary::-webkit-details-marker{display:none}.info details[open] summary{margin-bottom:4px}
@media (max-width:600px){
  .vh-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .vh-lb{padding:2px 6px 3px!important}.vh-lb b{font-size:10.5px}.vh-lb span{display:none}.vh-lb.hot span{display:block;font-size:9.5px;max-width:110px}
  .vh-art svg{width:116px;height:105px}.vh-n{font-size:15px}.vh-d{font-size:12.5px}
  .vb-c span:last-child{display:none}.vb-c{padding:3px 4px}.vb-c.on span:last-child{display:inline;padding-right:6px}
  .fgrid{grid-template-columns:1fr 1fr!important;gap:8px!important}.fslot{min-height:86px!important;padding:8px!important;gap:3px!important}.fslot .fi{font-size:24px!important}.fslot>span.mute{font-size:12px}
  header .hs{display:flex;flex-wrap:nowrap;align-items:center;gap:4px;width:100%;overflow:hidden}
  header .rc{padding:3px 6px;gap:4px;min-width:0}header .rc small{display:none}header .rc #pt{display:block;font-size:10px;white-space:nowrap}
  header .rc svg,header .rc img{width:18px!important;height:18px!important}header .rc b{font-size:13px}
  header .hm-team{display:none}   /* pe telefon echipa se vede în fila Echipă; bara păstrează resursele întregi */
  header .rc{flex:none}
  header .hh{padding:0;margin-left:auto}header .hh-r{width:38px;height:38px}header .hh-a .avw{width:30px!important;height:30px!important}header .hh-a .avw>svg,header .hh-a .avw>img{width:100%!important;height:100%!important}header .hh-l{min-width:17px;height:17px;font-size:11px}
}
`;
  document.head.appendChild(st);
})();
