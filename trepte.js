/* ============================================================================
   Silver Throne — trepte.js
   Temnițele pe pași: fiecare pas e un monstru anume, apoi căpitanul; fără vindecare între pași.
   Căpitanii au câte o abilitate specială. Temnițele de la nivelul 12 au trei dificultăți (Normal, Greu, Coșmar),
   deblocate pe rând prin căpitan. Înaintea fiecărui pas, jocul estimează șansele de câștig prin simulare.
   Cârligele din motorul de luptă (index.html): trStart, trDmg, trBoss, trTeamTick, trRb, trWin, trTier.
   ========================================================================== */
const TR_T = { n: ['Normal', 'Greu', 'Coșmar'], k: [1, 1.3, 1.6], rw: [1, 1.25, 1.5], lv: 12 };   /* reglat prin simulare: Greu cere echipament Epic, Coșmar Epic îmbunătățit la Fierărie */
/* monștrii fiecărei temnițe, în ordinea pașilor, și abilitatea căpitanului */
const TR_D = {
  'Mina Cenușie': { m: ['Șobolan de mină', 'Miner blestemat', 'Ghoul de mină'], a: 'call' },
  'Peștera Lupilor': { m: ['Lup tânăr', 'Lup de peșteră', 'Lup fioros'], a: 'howl' },
  'Catacombele Uitate': { m: ['Schelet', 'Paznic al criptei', 'Strigoi'], a: 'drain' },
  'Fortul Părăsit': { m: ['Dezertor', 'Arbaletier', 'Pază coruptă', 'Sergent renegat'], a: 'shield' },
  'Cetatea Scufundată': { m: ['Înecat', 'Crab de turn', 'Sirenă palidă', 'Cavaler înecat'], a: 'wave' },
  'Mlaștina Putredă': { m: ['Lipitoare uriașă', 'Broască otrăvită', 'Vrăjitoare de mlaștină', 'Troll de mlaștină'], a: 'poison' },
  'Abisul Cenușiu': { m: ['Umbră', 'Demon mărunt', 'Vânător din abis', 'Ochi din adânc', 'Strajă de cenușă'], a: 'invuln' },
  'Forja Veche': { m: ['Golem de zgură', 'Fierar blestemat', 'Duh de jar', 'Paznic de fier', 'Salamandră'], a: 'burn' },
  'Tronul Cenușiu': { m: ['Curtean de cenușă', 'Gardă regală căzută', 'Mag al regelui', 'Campion cenușiu', 'Cavaler al tronului'], a: 'rebirth' },
  'Cripta Furtunii': { m: ['Duh al furtunii', 'Paznic de piatră', 'Corb al tunetului', 'Elementar de vânt'], a: 'storm' }
};
const TR_A = {
  call: 'la jumătate din viață cheamă 2 ajutoare', howl: 'la fiecare 3 ture urlă, iar haita lovește tot mai tare',
  drain: 'se vindecă cu o treime din daunele pe care le face', shield: 'are un scut care înjumătățește daunele, până îl spargi cu o lovitură critică',
  wave: 'la fiecare 3 ture lovește toată echipa cu un val', poison: 'la fiecare 4 ture otrăvește toată echipa',
  invuln: 'la fiecare 4 ture devine de neatins o tură', burn: 'arde ținta la fiecare lovitură și își întărește armura în timp',
  rebirth: 'renaște o dată, cu o treime din viață', storm: 'la fiecare 2 ture trimite 3 fulgere asupra echipei'
};
const trDef = n => TR_D[n] || null;
/* dificultatea aleasă pentru temnița i (doar de la nivelul 12; Greu și Coșmar se deblochează prin căpitan) */
function trUnl(i) { return Math.min(2, (S.dtr || {})[i] || 0); }
function trTier(i) { const g = DG[i]; if (!g || g.ev || g.lv < TR_T.lv) return 0; return Math.min(trUnl(i), (S.dts || {})[i] || 0); }
function trPick(i, t) { (S.dts = S.dts || {})[i] = Math.min(+t, trUnl(i)); go(); }
function trChips(i) {
  const g = DG[i]; if (!g || g.ev || g.lv < TR_T.lv) return '';
  const u = trUnl(i), cur = trTier(i);
  return `<div class="tr-ch">${TR_T.n.map((n, t) => `<button class="${t === cur ? 'p' : ''}" onclick="trPick(${i},${t})"${t > u ? ` disabled title="Bate căpitanul pe ${TR_T.n[t - 1]} ca s-o deblochezi"` : ''}>${t > u ? '🔒 ' : ''}${n}</button>`).join('')}</div>`;
}
/* la începutul fiecărei lupte: numele monstrului pasului și abilitatea căpitanului */
function trStart(es, d, b) {
  if (!d || d.raid != null || d.ghost) return; const g = DG[d.di || 0], D = g && trDef(g.n); if (!D) return;
  if (b) { const e = es[0]; if (e) { e.ba = D.a; e.tc = 0; if (D.a === 'shield') e.sh = 1; } }
  else { const nm = D.m[Math.min(d.room, D.m.length - 1)]; es.forEach(e => { e.n = nm; }); }
}
/* daunele primite de căpitan: scut, invulnerabilitate */
function trDmg(e, dm, cr, L) {
  if (e.iv) { L.push(`${e.n} nu poate fi rănit acum.`); return 0; }
  if (e.sh) { if (cr) { e.sh = 0; L.push(`Scutul lui ${e.n} se sparge!`); } else return Math.max(1, Math.round(dm * 0.5)); }
  return dm;
}
const trDef0 = f => { const b = bon(f); return Math.round(b.def * (1 + (b.pf || 0) / 100) + tr(f, 'def')); };
function trHurt(f, x, L, why) { const dm = Math.max(1, Math.round(x - trDef0(f) * 0.5)); f.hp -= dm; L.push(`${why} ${f.n} (-${dm}).`); if (f.hp <= 0) L.push(f.n + ' cade.'); }
/* rândul căpitanului: abilitatea (întoarce true dacă i-a ocupat tura) */
function trBoss(e, al, L, f) {
  if (!e.ba) return false; e.tc = (e.tc || 0) + 1; if (e.iv) e.iv = 0;
  switch (e.ba) {
    case 'call': if (!e.cl && e.hp < e.mh / 2) { e.cl = 1; for (let i = 0; i < 2; i++) f.es.push({ n: 'Ajutor de mină', hp: Math.round(e.mh * 0.18), mh: Math.round(e.mh * 0.18), atk: Math.round(e.atk * 0.45), def: 0, bl: 0, st: 0, b: false }); L.push(`${e.n} își cheamă 2 ajutoare!`); return true; } return false;
    case 'howl': if (e.tc % 3 === 0) { f.es.forEach(x => { if (x.hp > 0) x.atk = Math.round(x.atk * 1.15); }); L.push(`${e.n} urlă: haita lovește mai tare!`); return true; } return false;
    case 'drain': { const before = al.reduce((s, x) => s + x.hp, 0); spEnemyHit(e, al, L); const dd = before - al.reduce((s, x) => s + Math.max(0, x.hp), 0); if (dd > 0) { const h = Math.min(e.mh - e.hp, Math.max(1, Math.round(dd / 3))); if (h > 0) { e.hp += h; L.push(`${e.n} se hrănește (+${h}).`); } } return true; }
    case 'wave': if (e.tc % 3 === 0) { L.push(`${e.n} ridică un val!`); al.forEach(x => trHurt(x, e.atk * 0.55, L, 'Valul lovește')); return true; } return false;
    case 'poison': if (e.tc % 4 === 0) { al.forEach(x => { x.ps = 3; x.psd = Math.max(1, Math.round(e.atk * 0.18)); }); L.push(`${e.n} otrăvește toată echipa!`); return true; } return false;
    case 'invuln': if (e.tc % 4 === 0) { e.iv = 1; L.push(`${e.n} se învăluie în umbre: nu poate fi atins o tură.`); return true; } return false;
    case 'burn': { e.def += 1; const before = al.map(x => x.hp); spEnemyHit(e, al, L); al.forEach((x, i) => { if (x.hp < before[i] && x.hp > 0) { x.ps = 2; x.psd = Math.max(1, Math.round(e.atk * 0.15)); L.push(`${x.n} arde.`); } }); return true; }
    case 'storm': if (e.tc % 2 === 0) { L.push(`${e.n} cheamă furtuna!`); for (let i = 0; i < 3; i++) { const t = al.filter(x => x.hp > 0); if (!t.length) break; trHurt(P(t), e.atk * 0.45, L, 'Fulgerul lovește'); } return true; } return false;
  }
  return false;
}
/* otrava și arsura pe echipă, la începutul rândului inamicilor */
function trTeamTick(f, L) { for (const x of S.fs) if (x.hp > 0 && x.ps > 0) { x.hp -= x.psd || 1; x.ps--; L.push(`${x.n} suferă (-${x.psd || 1}).`); if (x.hp <= 0) L.push(x.n + ' cade.'); } }
/* renașterea Tronului Cenușiu */
function trRb(f, log) { for (const e of f.es) if (e.ba === 'rebirth' && e.hp <= 0 && !e.rb) { e.rb = 1; e.hp = Math.round(e.mh / 3); log.push(`${e.n} se ridică din cenușă!`); } }
/* după căpitan: dificultatea următoare se deblochează */
function trWin(d) {
  if (!d || d.raid != null || d.ev || d.ghost) return; const g = DG[d.di || 0]; if (!g || g.lv < TR_T.lv) return;
  const t = d.tier || 0, u = trUnl(d.di || 0);
  if (t >= u && u < 2) { (S.dtr = S.dtr || {})[d.di || 0] = u + 1; d.cm = (d.cm ? d.cm + ' ' : '') + `Ai deblocat dificultatea ${TR_T.n[u + 1]} pentru ${g.n}!`; }
  S.fs.forEach(x => { x.ps = 0; });
}
/* șansele de câștig pentru pasul următor: aceeași luptă, simulată de 40 de ori pe o copie a jocului */
function dOdds(boss, N) {
  N = N || 40; if (!S.d) return null;
  const key = [S.d.di, S.d.tier, S.d.room, boss ? 1 : 0, S.fs.map(f => f.hp).join(',')].join('|');
  if (S.d.oddk === key) return S.d.odds;
  const snap = JSON.stringify(S), keep = { go: window.go, render: window.render, vs: window.vsFlash, bp: window.bhPush, ba: window.bhAdd };
  window.go = window.render = window.vsFlash = window.bhPush = window.bhAdd = () => {};
  let w = 0;
  try {
    for (let i = 0; i < N; i++) { S = JSON.parse(snap); startF(boss); let g = 0; while (S.d && S.d.f && g++ < 400) autoRun(); if (S.d && !S.d.f) w++; }
  } catch (e) { w = -1; }
  finally { S = JSON.parse(snap); Object.assign(window, { go: keep.go, render: keep.render, vsFlash: keep.vs, bhPush: keep.bp, bhAdd: keep.ba }); }
  const v = w < 0 ? null : Math.round(w / N * 100); S.d.oddk = key; S.d.odds = v; return v;
}
/* textul pasului și al căpitanului, pe ecranul dintre pași */
function trStepTxt(d) { const g = DG[d.di || 0], D = g && trDef(g.n); return D ? `<b>${D.m[Math.min(d.room, D.m.length - 1)]}</b>` : DR.l; }
function trBossTxt(d) { const g = DG[d.di || 0], D = g && trDef(g.n); return D ? `<span class="tr-ab">Abilitate: ${TR_A[D.a]}</span>` : ''; }
const trOddsTag = v => v == null ? '' : `<span class="tr-odds ${v >= 75 ? 'ok' : v >= 45 ? 'mid' : 'bad'}">Șanse: ${v}%</span>`;
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.tr-ch{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}.tr-ch button{padding:4px 10px;font-size:13px}
.tr-odds{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:9px;font-size:12.5px;font-weight:700}.tr-odds.ok{background:#1f4a2a;color:#9fe3ad}.tr-odds.mid{background:#4a3c14;color:#f0d27a}.tr-odds.bad{background:#4a1f1f;color:#f1a29b}
.tr-ab{display:block;margin-top:2px;color:#f1a29b;font-size:13px}`;
  document.head.appendChild(st);
})();
