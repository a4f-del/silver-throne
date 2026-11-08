/* ============================================================================
   Silver Throne — trepte.js
   Temnițele pe pași: fiecare pas e un monstru anume, apoi căpitanul; fără vindecare între pași.
   Căpitanii au câte o abilitate specială. Temnițele de la nivelul 12 au trei dificultăți (Normal, Greu, Coșmar),
   deblocate pe rând prin căpitan. Înaintea fiecărui pas, jocul estimează șansele de câștig prin simulare.
   Cârligele din motorul de luptă (index.html): trStart, trDmg, trBoss, trTeamTick, trRb, trWin, trTier.
   ========================================================================== */
const TR_T = { n: ['Normal', 'Greu', 'Coșmar'], k: [1, 1.15, 1.45], rw: [1, 1.25, 1.5], lv: 12 };   /* reglat prin simulare: Greu cere echipament Epic, Coșmar Epic +5 de la Fierărie */
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
/* BETA: ecoul mecanicii căpitanului apare și la monștrii obișnuiți.
   Un singur efect ușor per Temniță; LIVE, raidurile, Turnul și PvP nu sunt afectate. */
const TR_MOB={
 call:'Minerii se mobilizează la prima tură (+8% atac).',
 howl:'Haita devine puțin mai agresivă la fiecare 3 ture (+8% atac).',
 drain:'Strigoii se refac puțin la fiecare 2 ture (6% viață).',
 shield:'Prima lovitură întâlnește o armură fisurată (−25% daune).',
 wave:'La fiecare 3 ture, un val slab lovește toată echipa.',
 poison:'La fiecare 3 ture, un inamic aplică otravă scurtă unui luptător.',
 invuln:'La fiecare 3 ture, umbra atenuează următoarea lovitură.',
 burn:'La fiecare 3 ture, jarul provoacă o arsură scurtă.',
 rebirth:'Un adversar se ridică o singură dată, cu 12% viață.',
 storm:'La fiecare 3 ture, un fulger slab lovește un luptător.'
};
function trMobInfo(i){
 if(typeof ST_SERVER==='undefined'||ST_SERVER!=='beta')return '';
 const g=DG[i],d=g&&trDef(g.n);return d&&TR_MOB[d.a]||'';
}
function trMobTurn(e,al,L){
 if(ST_SERVER!=='beta'||!S.d||!S.d.one||S.d.tw||S.d.raid!=null||e.b||!TR_MOB[e.tm])return;
 e.tmc=(e.tmc||0)+1;
 switch(e.tm){
  case 'call':if(e.tmc===1){e.atk=Math.max(1,Math.round(e.atk*1.08));L.push(e.n+' se mobilizează (+8% atac).')}break;
  case 'howl':if(e.tmc%3===0){e.atk=Math.max(1,Math.round(e.atk*1.08));L.push(e.n+' urlă: atacul crește puțin.')}break;
  case 'drain':if(e.tmc%2===0&&e.hp<e.mh){const h=Math.min(e.mh-e.hp,Math.max(1,Math.round(e.mh*.06)));e.hp+=h;L.push(e.n+' se reface (+'+h+' viață).')}break;
  case 'wave':if(e.tmc%3===0){L.push(e.n+' ridică un val!');al.forEach(f=>trHurt(f,e.atk*.12,L,'Valul atinge'));}break;
  case 'poison':if(e.tmc%3===0&&al.length){const f=P(al);f.ps=Math.max(f.ps||0,1);f.psd=Math.max(f.psd||0,Math.max(1,Math.round(e.atk*.12)));L.push(e.n+' otrăvește pe '+f.n+' pentru o tură.')}break;
  case 'invuln':if(e.tmc%3===0){e.tmBarrier=1;L.push(e.n+' se ascunde în umbră: următoarea lovitură este slăbită.')}break;
  case 'burn':if(e.tmc%3===0&&al.length){const f=P(al);f.ps=Math.max(f.ps||0,1);f.psd=Math.max(f.psd||0,Math.max(1,Math.round(e.atk*.12)));L.push(e.n+' arde pe '+f.n+' pentru o tură.')}break;
  case 'storm':if(e.tmc%3===0&&al.length){L.push(e.n+' descarcă un fulger!');trHurt(P(al),e.atk*.15,L,'Fulgerul lovește');}break;
 }
}
const MON_SLUG = {
  'Arbaletier': 'arbaletier', 'Broască otrăvită': 'broasca-otravita', 'Campion cenușiu': 'campion-cenusiu', 'Cavaler al tronului': 'cavaler-al-tronului',
  'Cavaler înecat': 'cavaler-inecat', 'Corb al tunetului': 'corb-al-tunetului', 'Crab de turn': 'crab-de-turn', 'Curtean de cenușă': 'curtean-de-cenusa',
  'Demon mărunt': 'demon-marunt', 'Dezertor': 'dezertor', 'Duh al furtunii': 'duh-al-furtunii', 'Duh de jar': 'duh-de-jar', 'Elementar de vânt': 'elementar-de-vant',
  'Fierar blestemat': 'fierar-blestemat', 'Gardă regală căzută': 'garda-regala-cazuta', 'Ghoul de mină': 'ghoul-de-mina', 'Golem de zgură': 'golem-de-zgura',
  'Lipitoare uriașă': 'lipitoare-uriasa', 'Lup de peșteră': 'lup-de-pestera', 'Lup fioros': 'lup-fioros', 'Lup tânăr': 'lup-tanar', 'Mag al regelui': 'mag-al-regelui',
  'Miner blestemat': 'miner-blestemat', 'Ochi din adânc': 'ochi-din-adanc', 'Paznic al criptei': 'paznic-al-criptei', 'Paznic de fier': 'paznic-de-fier',
  'Paznic de piatră': 'paznic-de-piatra', 'Pază coruptă': 'paza-corupta', 'Salamandră': 'salamandra', 'Schelet': 'schelet', 'Sergent renegat': 'sergent-renegat',
  'Sirenă palidă': 'sirena-palida', 'Strajă de cenușă': 'straja-de-cenusa', 'Strigoi': 'strigoi', 'Troll de mlaștină': 'troll-de-mlastina', 'Umbră': 'umbra',
  'Vrăjitoare de mlaștină': 'vrajitoare-de-mlastina', 'Vânător din abis': 'vanator-din-abis', 'Înecat': 'inecat', 'Șobolan de mină': 'sobolan-de-mina'
};
/* portretul unui monstru obișnuit (temniță sau Turn); fără imagine încă → fără portret, doar textul */
const monImg = n => MON_SLUG[n] ? `imagini/monstri/${MON_SLUG[n]}.jpg` : null;
const trDef = n => TR_D[n] || null;
/* contracarări: fiecare abilitate e slăbită dacă în echipă e o anumită clasă (în viață); un ajutor, nu o obligație */
const TR_C = { call: 'Mag', howl: 'Paznic', drain: 'Războinic', shield: 'Arcaș', wave: 'Paznic', poison: 'Vraci', invuln: 'Mag', burn: 'Războinic', rebirth: 'Vraci', storm: 'Arcaș' };
const TR_CE = { call: 'ajutoarele vin cu jumătate din viață', howl: 'urletul întărește haita doar pe jumătate', drain: 'se vindecă doar pe jumătate', shield: 'orice lovitură de Arcaș sparge scutul',
  wave: 'echipa primește cu 40% mai puține daune din val', poison: 'otrava ține o singură tură', invuln: 'vraja Magului trece prin invulnerabilitate', burn: 'armura nu-i mai crește',
  rebirth: 'renaște doar cu o șesime din viață', storm: '2 fulgere în loc de 3' };
const trHas = c => S.fs.some(f => f.c === c && f.hp > 0);
const trCtr = a => !!TR_C[a] && trHas(TR_C[a]);
/* pansamentele Vraciului: după fiecare monstru învins în temniță, +15% viață pentru toți cei în picioare */
function trBand() { if (!trHas('Vraci')) return ''; S.fs.forEach(f => { if (f.hp > 0) f.hp = Math.min(mhp(f), f.hp + Math.round(mhp(f) * 0.15)); }); return ' Vraciul leagă rănile (+15% viață).'; }
/* dificultatea aleasă pentru temnița i (doar de la nivelul 12; Greu și Coșmar se deblochează prin căpitan) */
function trUnl(i) { return Math.min(2, (S.dtr || {})[i] || 0); }
function trTier(i) { const g = DG[i]; if (!g || g.ev || g.lv < TR_T.lv) return 0; return Math.min(trUnl(i), (S.dts || {})[i] || 0); }
function trPick(i, t) {
  if(ST_SERVER!=='beta'){(S.dts=S.dts||{})[i]=Math.min(+t,trUnl(i));return go();}
  // BETA: dificultatea se alege in ecranul mare, inainte de prima lupta.
  // Dupa prima lupta se pastreaza pana la retragere (progres separat per dificultate).
  if(ST_SERVER==='beta' && (S.d || (S.adventure && S.adventure.tierLocked))) return;
  const tier = Number(t);
  if(!Number.isInteger(tier)||tier<0||tier>trUnl(i))return;
  (S.dts = S.dts || {})[i] = tier;
  // Previzualizarea monstrului selectat trebuie sa urmeze progresul noii dificultati.
  if(ST_SERVER==='beta'&&S.adventure&&S.adventure.di===i){
    const key=dKey(i,tier);
    if(S.dsel) delete S.dsel[key];
  }
  go();
}
function trChips(i) {
  const g = DG[i]; if (!g || g.ev || g.lv < TR_T.lv) return '';
  const u=trUnl(i),cur=trTier(i);
  const locked=ST_SERVER==='beta'&&S.adventure&&S.adventure.di===i&&S.adventure.tierLocked;
  return `<div class="tr-ch">${TR_T.n.map((n,t) => `<button class="${t===cur?'p':''}" onclick="trPick(${i},${t})"${locked||t>u?` disabled title="${locked?'Retrage-te din temniță pentru a schimba dificultatea.':'Bate căpitanul pe '+TR_T.n[t-1]+' ca s-o deblochezi'}"`:''}>${t>u?'🔒 ':''}${n}</button>`).join('')}</div>`;
}
/* la începutul fiecărei lupte: numele monstrului pasului și abilitatea căpitanului */
function trStart(es, d, b) {
  if (d && d.tw && typeof twMob === 'function') { if (b) { const e = es[0]; if (e) { e.ba = twAb(d.room); e.tc = 0; if (e.ba === 'shield') e.sh = 1; if (trCtr(e.ba)) { e.ctr = 1; e.atk = Math.round(e.atk * 0.85); } } } else es.forEach(e => { e.n = twMob(d.room); }); return; }   /* Turnul */
  if (!d || d.raid != null || d.ghost) return; const g = DG[d.di || 0], D = g && trDef(g.n); if (!D) return;
  if (b) { const e = es[0]; if (e) { e.ba = D.a; e.tc = 0; if (D.a === 'shield') e.sh = 1; if (trCtr(D.a)) { e.ctr = 1; e.atk = Math.round(e.atk * 0.85); } } }   /* slăbiciunea căpitanului în fața clasei potrivite */
  else { const nm = D.m[Math.min(d.room, D.m.length - 1)]; es.forEach(e => { e.n = nm; e.hp = e.mh = Math.max(1, Math.round(e.mh * 0.8)); e.atk = Math.round(e.atk * 0.8); if(ST_SERVER==='beta'&&d.one)e.tm=D.a; }); }   /* identitate tactică doar pe monștrii din Temnițe BETA */
}
/* daunele primite de căpitan: scut, invulnerabilitate */
function trDmg(e, dm, cr, L, a) {
  if(ST_SERVER==='beta'&&S.d&&S.d.one&&!e.b&&e.tm==='shield'&&!e.tmShieldUsed){e.tmShieldUsed=1;L.push('Armura lui '+e.n+' oprește prima lovitură.');return Math.max(1,Math.round(dm*.75));}
  if(ST_SERVER==='beta'&&S.d&&S.d.one&&!e.b&&e.tm==='invuln'&&e.tmBarrier){e.tmBarrier=0;L.push('Umbra atenuează lovitura!');return Math.max(1,Math.round(dm*.7));}
  if (e.iv && !(a && a.c === 'Mag' && e.ba === 'invuln')) { L.push(`${e.n} nu poate fi rănit acum.`); return 0; }
  if (e.sh) { if (cr || (a && a.c === 'Arcaș')) { e.sh = 0; L.push(`Scutul lui ${e.n} se sparge!`); } else return Math.max(1, Math.round(dm * 0.5)); }
  return e.ctr ? Math.round(dm * 1.2) : dm;
}
const trDef0 = f => { const b = bon(f); return Math.round(b.def * (1 + (b.pf || 0) / 100) + tr(f, 'def')); };
function trHurt(f, x, L, why) { const dm = Math.max(1, Math.round(x - trDef0(f) * 0.5)); f.hp -= dm; L.push(`${why} ${f.n} (-${dm}).`); if (f.hp <= 0) L.push(f.n + ' cade.'); }
/* rândul căpitanului: abilitatea (întoarce true dacă i-a ocupat tura) */
function trBoss(e, al, L, f) {
  if (!e.ba) return false; e.tc = (e.tc || 0) + 1; if (e.iv) e.iv = 0;
  switch (e.ba) {
    case 'call': if (!e.cl && e.hp < e.mh / 2) { e.cl = 1; const ah = Math.round(e.mh * 0.18 * (trCtr('call') ? 0.5 : 1)); for (let i = 0; i < 2; i++) f.es.push({ n: 'Ajutor de mină', hp: ah, mh: ah, atk: Math.round(e.atk * 0.45), def: 0, bl: 0, st: 0, b: false }); L.push(`${e.n} își cheamă 2 ajutoare!`); return true; } return false;
    case 'howl': if (e.tc % 3 === 0) { f.es.forEach(x => { if (x.hp > 0) x.atk = Math.round(x.atk * (trCtr('howl') ? 1.075 : 1.15)); }); L.push(`${e.n} urlă: haita lovește mai tare!`); return true; } return false;
    case 'drain': { const before = al.reduce((s, x) => s + x.hp, 0); spEnemyHit(e, al, L); const dd = before - al.reduce((s, x) => s + Math.max(0, x.hp), 0); if (dd > 0) { const h = Math.min(e.mh - e.hp, Math.max(1, Math.round(dd / (trCtr('drain') ? 6 : 3)))); if (h > 0) { e.hp += h; L.push(`${e.n} se hrănește (+${h}).`); } } return true; }
    case 'wave': if (e.tc % 3 === 0) { L.push(`${e.n} ridică un val!`); al.forEach(x => trHurt(x, e.atk * 0.55 * (trCtr('wave') ? 0.6 : 1), L, 'Valul lovește')); return true; } return false;
    case 'poison': if (e.tc % 4 === 0) { al.forEach(x => { x.ps = trCtr('poison') ? 1 : 3; x.psd = Math.max(1, Math.round(e.atk * 0.18)); }); L.push(`${e.n} otrăvește toată echipa!`); return true; } return false;
    case 'invuln': if (e.tc % 4 === 0) { e.iv = 1; L.push(`${e.n} se învăluie în umbre: nu poate fi atins o tură.`); return true; } return false;
    case 'burn': { if (!trCtr('burn')) e.def += 1; const before = al.map(x => x.hp); spEnemyHit(e, al, L); al.forEach((x, i) => { if (x.hp < before[i] && x.hp > 0) { x.ps = 2; x.psd = Math.max(1, Math.round(e.atk * 0.15)); L.push(`${x.n} arde.`); } }); return true; }
    case 'storm': if (e.tc % 2 === 0) { L.push(`${e.n} cheamă furtuna!`); for (let i = 0; i < (trCtr('storm') ? 2 : 3); i++) { const t = al.filter(x => x.hp > 0); if (!t.length) break; trHurt(P(t), e.atk * 0.45, L, 'Fulgerul lovește'); } return true; } return false;
  }
  return false;
}
/* otrava și arsura pe echipă, la începutul rândului inamicilor */
function trTeamTick(f, L) { for (const x of S.fs) if (x.hp > 0 && x.ps > 0) { x.hp -= x.psd || 1; x.ps--; L.push(`${x.n} suferă (-${x.psd || 1}).`); if (x.hp <= 0) L.push(x.n + ' cade.'); } }
/* renașterea Tronului Cenușiu */
function trRb(f, log) { for (const e of f.es) { if(ST_SERVER==='beta'&&S.d&&S.d.one&&!e.b&&e.tm==='rebirth'&&e.hp<=0&&!e.rb){e.rb=1;e.hp=Math.max(1,Math.round(e.mh*.12));log.push(e.n+' se ridică din cenușă cu puțină viață!');} if (e.ba === 'rebirth' && e.hp <= 0 && !e.rb) { e.rb = 1; e.hp = Math.round(e.mh / (trCtr('rebirth') ? 6 : 3)); log.push(`${e.n} se ridică din cenușă!`); } } }
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
  if(typeof GUILD!=='undefined')GUILD.preview=true;
  window.go = window.render = window.vsFlash = window.bhPush = window.bhAdd = () => {};
  let w = 0;
  try {
    for (let i = 0; i < N; i++) { S = JSON.parse(snap); S.d.room++; if (S.d.tw) twFloor(S.d); startF(boss);   /* ca în door(): lupta e la pasul următor */ let g = 0; while (S.d && S.d.f && g++ < 400) autoRun(); if (S.d && !S.d.f) w++; }
  } catch (e) { w = -1; }
  finally { S = JSON.parse(snap); Object.assign(window, { go: keep.go, render: keep.render, vsFlash: keep.vs, bhPush: keep.bp, bhAdd: keep.ba }); if(typeof GUILD!=='undefined')GUILD.preview=false; }
  const v = w < 0 ? null : Math.round(w / N * 100); S.d.oddk = key; S.d.odds = v; return v;
}
/* textul pasului și al căpitanului, pe ecranul dintre pași */
function trStepTxt(d) { if (d.tw) return `<b>${twMob(d.room + 1)}</b>`; const g = DG[d.di || 0], D = g && trDef(g.n); return D ? `<b>${D.m[Math.min(d.room, D.m.length - 1)]}</b>` : DR.l; }
function trCtrTxt(a) { const c = TR_C[a]; return c ? `<span class="tr-ct${trHas(c) ? ' on' : ''}">Contracarat de: <b>${c}</b>${trHas(c) ? ' (îl ai în echipă: ' + TR_CE[a] + ')' : ''}</span>` : ''; }
function trBossTxt(d) { if (d.tw) { const a = twAb(d.room + 1); return `<b>Străjerul etajului ${d.room + 1}</b><span class="tr-ab">Abilitate: ${TR_A[a]}</span>${trCtrTxt(a)}`; } const g = DG[d.di || 0], D = g && trDef(g.n); return D ? `<span class="tr-ab">Abilitate: ${TR_A[D.a]}</span>${trCtrTxt(D.a)}` : ''; }
/* lista de monștri a temniței i, cu progresul tău */
function trNames(i) { const g = DG[i], D = trDef(g.n); return D ? [...Array(g.rooms - 1)].map((_, k) => D.m[Math.min(k, D.m.length - 1)]).concat([g.bn]) : null; }
function trList(i) {
  const g = DG[i], n = trNames(i); if (!n) return ''; const p = dMk(i).room;
  const D = trDef(g.n);
  return `<ol class="tr-ls">${n.map((x, k) => `<li class="${k < p ? 'ok' : k === p ? 'now' : ''}${k === n.length - 1 ? ' boss' : ''}">${k < p ? '✓ ' : k === n.length - 1 ? '♛ ' : ''}${x}</li>`).join('')}</ol>${D ? `<div class="tr-bx"><span class="tr-ab">Căpitanul: ${TR_A[D.a]}</span>${trCtrTxt(D.a)}</div>` : ''}`;
}
function trNextLbl(i) { const n = trNames(i), d = dMk(i), c = dCostAt(i); return `${d.room >= d.rooms - 1 ? 'Căpitanul' : 'Luptă'}: ${n ? n[d.room] : 'monstru'} · ${c ? c + ' p' : 'gratuit'}`; }
/* șansele pentru monstrul următor din listă (fără să intri): aceeași luptă, simulată pe o copie a jocului */
const TR_OC = {};
function dOddsAt(i, N) {
  N = N || 24; if (S.d) return null;
  const d0 = dMk(i), key = [i, d0.tier, d0.room, S.lvl, S.fs.map(f => f.hp + '/' + mhp(f)).join(',')].join('|');
  if (TR_OC[i] && TR_OC[i].k === key) return TR_OC[i].v;
  const snap = JSON.stringify(S), keep = { go: window.go, render: window.render, vs: window.vsFlash, bp: window.bhPush, ba: window.bhAdd };
  if(typeof GUILD!=='undefined')GUILD.preview=true;
  window.go = window.render = window.vsFlash = window.bhPush = window.bhAdd = () => {};
  let w = 0;
  try { for (let j = 0; j < N; j++) { S = JSON.parse(snap); const d = dMk(i); d.one = 0; S.d = d; startF(d.room >= d.rooms - 1); let g = 0; while (S.d && S.d.f && g++ < 400) autoRun(); if (S.d && !S.d.f) w++; } }
  catch (e) { w = -1; }
  finally { S = JSON.parse(snap); Object.assign(window, { go: keep.go, render: keep.render, vsFlash: keep.vs, bhPush: keep.bp, bhAdd: keep.ba }); if(typeof GUILD!=='undefined')GUILD.preview=false; }
  const v = w < 0 ? null : Math.round(w / N * 100); TR_OC[i] = { k: key, v }; return v;
}
/* „Toți până la căpitan” (butonul a fost scos, noiembrie 2026; funcția rămâne nefolosită): ia monștrii pe rând, cât timp ai puncte și șansele sunt de cel puțin 50%; se oprește la căpitan */
function trAutoL(i) {
  let n = 0, why = ''; const R = window.go; window.go = () => {}; (S.deo = S.deo || {})[i] = true;
  try {
    for (; n < 12; n++) {
      if (S.d) break; const d = dMk(i); if (d.room >= d.rooms - 1) { why = 'Ai ajuns la căpitan: înfruntă-l când ești gata.'; break; }
      if (!S.fs.some(f => f.hp > 0)) { why = 'Echipa a căzut.'; break; }
      const c = dCostAt(i); if (S.pts < c) { why = 'Nu mai ai puncte.'; break; }
      const od = dOddsAt(i); if (od != null && od < 50) { why = `Șansele cu ${trNames(i)[d.room]} sunt ${od}%: oprit.`; break; }
      startD(i); if (S.d && S.d.f) { let g = 0; while (S.d && S.d.f && g++ < 400) autoRun(); }
      if (S.d) break;
    }
  } finally { window.go = R; }
  S.msg = (S.msg ? S.msg + ' ' : '') + (why || ''); go();
}
/* lista interactivă, odată ce ai apăsat „Intră”: un buton pe monstru, deblocat doar după ce l-ai trecut pe cel dinaintea lui */
function trListBtns(i) {
  const g = DG[i], n = trNames(i); if (!n) return trEvBtn(i);
  const d = dMk(i), p = d.room, c = dCostAt(i), lastIdx = n.length - 1;
  const ic = x => { const m = monImg(x); return m ? `<img class="tr-bi" src="${m}" alt="" loading="lazy" onerror="this.remove()">` : ''; };
  const items = n.map((x, k) => {
    if (k < p) return `<button class="tr-b done" disabled>${ic(x)}✓ ${x}</button>`;
    if (k === p) { const boss = k === lastIdx, od = dOddsAt(i); return `<button class="tr-b now${boss ? ' boss' : ''}" onclick="startD(${i})">${ic(x)}${boss ? 'Înfruntă căpitanul' : 'Luptă'}: ${x} · ${c ? c + ' p' : 'gratuit'}</button>${trOddsTag(od)}`; }
    return `<button class="tr-b locked" disabled>${ic(x)}🔒 ${x}</button>`;
  });
  const D = trDef(g.n), boss = p >= lastIdx;
  return `<div class="tr-blist">${items.join('')}</div>`
    + (boss && D ? `<div class="tr-bx"><span class="tr-ab">Abilitate: ${TR_A[D.a]}</span>${trCtrTxt(D.a)}</div>` : '')
    + `<button class="tr-close" onclick="dToggle(${i})">‹ Închide</button>`;
}
/* Cripta Furtunii (eveniment): fără listă de nume, un singur buton */
function trEvBtn(i) { const g = DG[i], c = dCostAt(i); return `<button class="tr-b now" onclick="startD(${i})">Intră · ${c ? c + ' p' : 'gratuit, cu o cheie'}</button><button class="tr-close" onclick="dToggle(${i})">‹ Închide</button>`; }
/* statisticile aproximative ale unui monstru de pe poziția idx (0 = primul), pentru previzualizare; aceeași formulă ca în luptă */
function monStatsAt(i, idx, boss) {
  const d = dMk(i), k = d.k || 1;
  const hp = Math.round((12 + 5 * S.lvl + idx * 3) * (boss ? 2.4 : 1) * k * ENK);
  const atk = Math.round((3 + S.lvl * 1.1 + idx * .5) * (boss ? 1.4 : 1) * k * ENK);
  return { hp, atk };
}
/* echipament recomandat, după dificultatea temniței (aproximativ, nu o garanție) */
function recGear(k) {
  if (k < 1.8) return 'orice, chiar și Comun';
  if (k < 3.5) return 'Magic sau Rar';
  if (k < 5.5) return 'Rar; ideal Epic pentru căpitan';
  return 'Epic; la Coșmar, Epic îmbunătățit la Fierărie';
}
/* fila aleasă pentru previzualizare: urmărește progresul (sare înainte după fiecare victorie), dar poți naviga liber */
function trSel(i) { const d = dMk(i), k = d.dk; const cur = (S.dsel = S.dsel || {})[k]; if (cur == null || cur < d.room) { S.dsel[k] = d.room; return d.room; } return Math.min(cur, d.rooms - 1); }
function trSelSet(i, k) { const d = dMk(i); (S.dsel = S.dsel || {})[d.dk] = Math.min(k, d.rooms - 1); go(); }
/* pagina dedicată a unei temnițe, odată intrat: titlu, înapoi, banda cu toți monștrii, panoul de detalii pentru fila aleasă */
function trPage(i) {
  if(ST_SERVER==='beta'&&S.adventure&&typeof acDungeonPage==='function'){const h=acDungeonPage(i);if(h)return h;}
  const g = DG[i], n = trNames(i);
  if(!n&&ST_SERVER==='beta'&&S.adventure&&S.adventure.di===i){
    const d=dMk(i),c=dCostAt(i),boss=d.room>=d.rooms-1;
    return '<section class="dg-page"><h2>'+g.n+' · pasul '+(d.room+1)+'/'+d.rooms+'</h2><p>Ai plecat din Sat. Poți continua sau te poți retrage.</p><div class="row"><button class="p" onclick="startD('+i+')">'+(boss?'Înfruntă căpitanul':'Continuă')+' · '+(c?c+' p':'gratuit')+'</button><button onclick="adventureExit()">Retrage-te</button></div></section>';
  }
  if (!n) return '';
  const d = dMk(i), p = d.room, lastIdx = n.length - 1, bossNow = p >= lastIdx, D = trDef(g.n), B = tmnBoss(g.bn);
  const sel = trSel(i), selBoss = sel === lastIdx, selName = n[sel];
  const tabIco = (x, boss) => { const m = boss && B ? `imagini/monstri/${B[0]}.jpg` : monImg(x); return m ? `<img src="${m}" alt="" loading="lazy" onerror="this.remove()">` : ''; };
  const tabs = n.map((x, k) => `<button class="tr-tab ${k < p ? 'done' : k === p ? 'now' : 'locked'}${k === sel ? ' sel' : ''}" onclick="trSelSet(${i},${k})">${tabIco(x, k === lastIdx)}<span>${k < p ? '✓ ' : k === lastIdx ? '♛ ' : ''}${x}</span></button>`).join('');
  const stats = monStatsAt(i, sel, selBoss);
  let det = `<div class="tr-det"><div class="tr-det-h">${tabIco(selName, selBoss) || ''}<b>${selName}</b>${selBoss ? ' <small class="mute">căpitan</small>' : ''}</div>`
    + `<div class="tr-det-row"><b>Statistici</b><span>${stats.hp} viață · ${stats.atk} atac</span></div>`;
  if (selBoss && D) det += `<div class="tr-det-row"><b>Abilitate</b><span>${TR_A[D.a]}</span></div>${trCtrTxt(D.a)}`;
  det += sel === p ? `<div class="tr-det-row"><b>Șanse de câștig</b>${trOddsTag(dOddsAt(i))}</div>`
    : sel < p ? `<div class="tr-det-row mute">L-ai trecut deja.</div>`
    : `<div class="tr-det-row mute">Șansele apar când ajungi aici.</div>`;
  det += `<div class="tr-det-row"><b>Echipament recomandat</b><span>${recGear(d.k)}</span></div>`;
  if (sel === p) { const c = dCostAt(i); det += `<button class="p tr-fight${selBoss ? ' boss' : ''}" onclick="startD(${i})">${selBoss ? 'Înfruntă căpitanul' : 'Luptă'} · ${c ? c + ' p' : 'gratuit'}</button>`; }
  det += '</div>';
  return `<section class="dg-page"><div class="dg-page-top"><button class="tr-back" onclick="${ST_SERVER==='beta'&&S.adventure?'adventureExit()':'dToggle('+i+')'}">${ST_SERVER==='beta'&&S.adventure?'‹ Retrage-te':'‹ Înapoi'}</button><h2>${g.n}</h2>${typeof trChips === 'function' && !(ST_SERVER==='beta'&&S.adventure) ? trChips(i) : ''}</div>`
    + (ST_SERVER==='beta'&&S.adventure?'':typeof heroSoloControl==='function'?heroSoloControl():'') + `<div class="tr-tabs">${tabs}</div>${det}`
    + '</section>';
}
const trOddsTag = v => v == null ? '' : `<span class="tr-odds ${v >= 75 ? 'ok' : v >= 45 ? 'mid' : 'bad'}">Șanse: ${v}%</span>`;
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.tr-ch{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}.tr-ch button{padding:4px 10px;font-size:13px}
.tr-odds{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:9px;font-size:12.5px;font-weight:700}.tr-odds.ok{background:#1f4a2a;color:#9fe3ad}.tr-odds.mid{background:#4a3c14;color:#f0d27a}.tr-odds.bad{background:#4a1f1f;color:#f1a29b}
.tr-ab{display:block;margin-top:2px;color:#f1a29b;font-size:13px}
.tr-ls{list-style:none;margin:6px 0;padding:0;display:flex;flex-wrap:wrap;gap:4px}.tr-ls li{font-size:12px;padding:2px 8px;border-radius:9px;border:1px solid var(--line);color:var(--mute)}.tr-ls li.ok{color:#9fe3ad;border-color:#2f5d3a}.tr-ls li.now{color:#f0d27a;border-color:#f0d27a;font-weight:700}.tr-ls li.boss{border-style:dashed}.tr-ct{display:block;font-size:12.5px;color:var(--mute)}.tr-ct.on{color:#9fe3ad}.tr-bx{margin:0 0 6px}.tr-bx .tr-ab{font-size:12.5px}
.tr-nx{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.dg-enter{width:100%;margin-top:4px}
.tr-blist{display:flex;flex-direction:column;gap:5px;margin:6px 0}
.tr-b{width:100%;display:flex;align-items:center;gap:8px;text-align:left;padding:6px 12px;border-radius:8px;border:1px solid var(--line);background:#0e1214;color:var(--mute);font-size:13.5px}.tr-bi{width:28px;height:28px;border-radius:50%;object-fit:cover;flex:none;box-shadow:0 0 0 1px #0006}
.tr-b.done{color:#9fe3ad;border-color:#2f5d3a;opacity:.75}
.tr-b.locked{opacity:.5;cursor:not-allowed}
.tr-b.now{color:#fff;border-color:var(--gold2,#f0d27a);background:linear-gradient(180deg,#3a2f10,#1c1608);font-weight:700;cursor:pointer}
.tr-b.now.boss{border-color:#c0504a;background:linear-gradient(180deg,#3a1612,#1c0a08)}
.tr-auto,.tr-close{padding:5px 10px;font-size:13px;margin-top:2px}
.tr-close{opacity:.75}
.dg-page{background:#12161a;border:1px solid var(--line);border-radius:12px;padding:14px 16px 18px;margin-bottom:14px}
.dg-page-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.dg-page-top h2{margin:0;font-size:19px;flex:1;min-width:120px}
.tr-back{padding:5px 12px;font-size:13px}
.tr-tabs{display:flex;gap:7px;overflow-x:auto;padding-bottom:6px;margin-bottom:10px}
.tr-tab{flex:none;display:flex;flex-direction:column;align-items:center;gap:4px;width:84px;padding:8px 6px;border-radius:10px;border:1px solid var(--line);background:#0e1214;color:var(--mute);font-size:11.5px;text-align:center}
.tr-tab img{width:40px;height:40px;border-radius:50%;object-fit:cover}
.tr-tab span{line-height:1.2}
.tr-tab.done{color:#9fe3ad;border-color:#2f5d3a;opacity:.8}
.tr-tab.locked{opacity:.55}
.tr-tab.now{color:var(--gold2,#f0d27a);border-color:var(--gold2,#f0d27a)}
.tr-tab.sel{box-shadow:0 0 0 2px var(--gold2,#f0d27a)}
.tr-det{border:1px solid var(--line);border-radius:10px;padding:12px 14px;background:#0e1214;margin-bottom:10px}
.tr-det-h{display:flex;align-items:center;gap:10px;margin-bottom:8px;font-size:16px}
.tr-det-h img{width:40px;height:40px;border-radius:50%;object-fit:cover}
.tr-det-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:5px 0;border-top:1px dashed var(--line);font-size:13.5px}
.tr-det-row:first-of-type{border-top:none}
.tr-fight{width:100%;margin-top:8px}
@media (max-width:600px){.tr-tab{width:72px}}`;
  document.head.appendChild(st);
})();
