/* ============================================================================
   Silver Throne — world-data.js
   Date și formule PURE pentru extinderea „Explorare, teritorii, campanie”.
   - nu atinge DOM, nu citește starea jocului (S); primește totul prin parametri;
   - este încărcat de index.html înaintea scriptului principal ȘI de simulatorul
     din dev/ (aceleași valori în joc și în simulări);
   - toate valorile de echilibru sunt în W.P (singurul loc de ajustat).
   ========================================================================== */
(function (root) {
  'use strict';
  const W = {};

  /* Configurare de livrare. La publicare: ST_PROD=true ascunde panoul „Opțiuni de test”
     (butoane pentru +aur, +niveluri, Premium de test). Implicit false, ca până acum. */
  W.CFG = { prod: false };

  /* ---------------------------------------------------------------- PARAMETRI
     Valorile de aici au fost alese cu simulatorul din dev/ (vezi RAPORT-ECHILIBRU.md). */
  W.P = {
    terr: {
      /* bonus pe treapta satului [mic, mijlociu, mare]; cap = limita totală a tipului */
      gold:  { v: [5, 8, 12],  cap: 15 },   /* % aur din raiduri */
      mat:   { v: [6, 10, 14], cap: 20 },   /* % materiale de afixe la ieșirea cu prada */
      bld:   { v: [4, 7, 10],  cap: 12 },   /* % reducere cost clădiri */
      forge: { v: [4, 7, 10],  cap: 12 },   /* % reducere timp forjare (peste Topitorie) */
      pts:   { v: [1, 2, 4],   cap: 6 },    /* puncte maxime în plus (ales prin simulare, vezi RAPORT secțiunea H) */
      trav:  { v: [1, 1, 1],   cap: 1 },    /* doar fortăreața: -1 punct la drumuri lungi */
      dim: 0.75                             /* al 2-lea bonus de același tip valorează 75%, etc. */
    },
    /* RITMUL DE NIVEL. În jocul original un nivel costa ~4-7 puncte (la nivelurile 6-18) iar fiecare nivel nou
       reumplea 30 de puncte: un jucător continuu ajungea la nivelul ~46 într-o zi (măsurat cu motorul real).
       need(L) devine puncte-pe-nivel(L) × xp-pe-punct(L), cu puncte-pe-nivel = a·L^b. on:false restabilește jocul original. */
    pace: { on: true, a: 2.76, b: 1.5, xa: 20, xb: 4.1 },
    wallFlat: 1.0,              /* componenta fixă a zidului în puterea de apărare (calibrat cu dev/measure-defense.js) */
    kl: 0.055,                  /* curba de dificultate de bază: k(L) = 1 + kl·min(L,40), ca la temnițe */
    conq: {
      raids: 2,                 /* raiduri reușite pe acel sat înainte de a putea fi cucerit */
      feeBase: 90, feePerLv: 45, feeTier: [1, 1.25, 1.6],
      ck: [1.95, 2.0, 1.85],      /* multiplicator peste k(L), pe treaptă (calibrat cu dev/calibrate.js) */
      rw: 1.0,                  /* multiplicator fix al prăzii din lupte (nu crește cu dificultatea) */
      xn: [0, 0, 1],            /* inamici în plus în prima luptă */
      reLoot: 0.4,              /* prada la cucerire = 40% dintr-un raid normal */
      reFee: 0.5, reK: 0.9,     /* recucerire: taxă 50%, apărători ×0.9 */
      immuneH: 24,              /* ore de protecție după cucerire */
      first: { gold: 2.5, xp: 2.0 } /* recompensă unică la prima cucerire (× baza unui raid) */
    },
    /* Întreținere: baza crește cu nivelul satului, plus o componentă PROGRESIVĂ (de la nivelul `from` la `to`) ca sink de aur
       la nivelurile mijlocii; la nivel 35 ≈ ×4,8 față de baza veche, la 40+ ×6. Calibrat cu dev/sim-economy.js (secțiunea K):
       cu k=9 jucătorii casual plăteau ~27% din venit, prea mult față de bonusurile obținute. */
    upkeep: { base: 3, perLv: 1.2, tier: [1, 1.3, 1.7], maxDays: 3, prog: { from: 10, to: 40, k: 5, pow: 1.5 } },
    /* Garnizoane (sink de aur la teritorii): nivel 0..max; cost = pradă de raid × costK[nivel] × treaptă. Efect pe nivel:
       −12% șansa de ocupare, +4% din bonusul satului (plafoanele rămân), +15% întreținere. La ocupare se pierd `loseOnSeize` niveluri. */
    gar: { max: 5, costK: [3, 6, 12, 24, 48], tier: [1, 1.25, 1.6], seizeRelief: .12, bonusK: .04, upkK: .15, loseOnSeize: 2 },
    /* Negustorul de lux și schimbul aur → cristale (sink de aur pentru putere; se plătește doar cu aur câștigat).
       Prețuri ancorate la pradă de raid, deci scalează cu nivelul. Limite zilnice salvate în S.mkt. */
    mkt: {
      luxMinLv: 10, luxN: 4,
      luxMult: [6, 10, 16, 26, 40],                         /* preț = preț de magazin × multiplicator pe calitate (0..4) */
      luxQw: [20, 30, 25, 18, 7],                           /* ponderi calitate */
      luxRar: [[0, { 1: 70, 2: 30 }], [16, { 1: 20, 2: 65, 3: 15 }], [28, { 2: 40, 3: 60 }]],   /* [de la nivel, ponderi raritate] */
      rerollK: .8, rerollGrow: 1.6,                         /* cost schimb de marfă = pradă × K × grow^schimburi_azi */
      crMinLv: [8, 16, 28],                                 /* nivel minim pentru cristale de raritate Magic / Rar / Epic */
      crTier: [.8, 1.6, 3.2], crQ: [1, 2.5, 6, 15], crLim: [10, 6, 3, 1]   /* preț = pradă × crTier[raritate] × crQ[calitate]; limită/zi pe (tip, calitate) */
    },
    /* Renovări de prestigiu (cosmetice, fără efect de joc): 3 trepte pe clădire, deblocate de nivelul clădirii. */
    ren: { unlock: [12, 22, 32], costK: [25, 80, 200], max: 3 },
    seize: { p: 0.006, wallRelief: 0.5, cdH: 24, fortMul: 0.5 },
    fort: { lv: 12, pts: 4, feeBase: 450, feePerLv: 60, rw: 1.2, k: [1.4, 1.63, 1.9], xn: [0, 1, 0], immuneH: 48, upkMul: 2.0 },
    camp: { slotH: 3, max: 4, retries: 2, rw: 1.15 },
    ex: { gm: 1.0, xm: 1.0, om: 1.0, hpFloor: 1 },
    explore: { cost: 1, radius: 1, first: { gold: 8, xp: 4 } }   /* per nivel de jucător */
  };

  /* ------------------------------------------------------------- UTILITARE */
  W.hash = function (s) { s = String(s); let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
  W.prng = function (a) { a = a | 0; return function () { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  W.GW = 7; W.GH = 5; W.CAP = [3, 2];
  W.need0 = L => Math.round(30 * L * (1 + Math.max(0, L - 20) * .35));
  W.paceK = L => { const p = W.P.pace; if (!p.on) return 1; return Math.max(1, p.a * Math.pow(L, p.b) * (p.xa + p.xb * L) / W.need0(L)); };
  /* începutul mai rapid: la nivelul 1 trebuie 45% din experiența normală, crescând treptat până la 100% la nivelul 12 (măsurat: nivelul 5 în ~15 minute) */
  W.early = L => (L <= 12 ? 0.45 + 0.55 * (L - 1) / 11 : 1);
  W.need = L => Math.round(W.need0(L) * W.paceK(L) * W.early(L));
  W.kb = L => 1 + W.P.kl * Math.min(L, 40);
  W.cheb = (x, y) => Math.max(Math.abs(x - W.CAP[0]), Math.abs(y - W.CAP[1]));
  W.cellKey = (x, y) => x + ',' + y;
  W.AFM = ['zim', 'sng', 'bli', 'cal', 'vul', 'pra', 'rab', 'izv', 'pia', 'ven', 'fie', 'cen', 'osn'];
  W.MLV = { osn: 5, fie: 6, ven: 12, cen: 20 };
  W.pickMat = (rng, lvl) => { const a = W.AFM.filter(k => (W.MLV[k] || 0) <= lvl); return a[Math.floor(rng() * a.length)]; };
  W.rawGold = lvl => 60 + 30 * lvl;                    /* baza de aur a unui raid (identică cu rl() din joc) */
  W.rawXp = lvl => 20 + 8 * lvl;
  W.rawOre = lvl => 6 + 0.8 * lvl;

  /* ----------------------------------------------------------- SATE (8 identități)
     Numele satelor sunt fixe în joc pe id (mapGen), deci identitatea poate fi legată de id.
     tip: gold | mat | bld | forge | pts. tier: 1 mic, 2 mijlociu, 3 mare (scalează bonusul ȘI apărarea). */
  W.VIL = [
    { id: 0, tip: 'gold',  tier: 2, nm: 'Hambarul Văii',        d: 'Hambare pline de grâu pe care negustorii îl plătesc scump.', def: ['Paznic de hambar', 'Țăran înarmat', 'Pândar'] },
    { id: 1, tip: 'mat',   tier: 1, nm: 'Cărările Pârâului',    d: 'Culegători care știu unde se găsesc cele mai bune materiale.', def: ['Culegător', 'Pescar înarmat', 'Hoț de pârâu'] },
    { id: 2, tip: 'bld',   tier: 3, nm: 'Cariera Stâncii',      d: 'Piatră ieftină și meșteri zidari pentru toate construcțiile tale.', def: ['Cioplitor', 'Paznic de carieră', 'Mesteșugar blindat'] },
    { id: 3, tip: 'forge', tier: 2, nm: 'Fierăria Morii',       d: 'Un foc care nu se stinge niciodată: topitoria ta lucrează mai repede.', def: ['Fierar', 'Ucenic de topitorie', 'Morar'] },
    { id: 4, tip: 'pts',   tier: 3, nm: 'Turnul Corbilor',      d: 'Cel mai înalt turn din ținut. Iscoade bune înseamnă mai multă energie de luptă.', def: ['Străjer', 'Arcaș de turn', 'Corbar'] },
    { id: 5, tip: 'pts',   tier: 1, nm: 'Vama Podului',         d: 'O vamă mică, dar drumul liber îți păstrează puterea de a lupta.', def: ['Vameș', 'Paznic de pod', 'Cărăuș înarmat'] },
    { id: 6, tip: 'mat',   tier: 2, nm: 'Fântâna Ascunsă',      d: 'Izvoare și peșteri ascunse, bogate în materiale rare.', def: ['Paznic de izvor', 'Pustnic', 'Lup flămând'] },
    { id: 7, tip: 'pts',   tier: 2, nm: 'Hanul Plaiului',       d: 'Un han unde oastea se odihnește mai repede.', def: ['Hangiu', 'Paznic de han', 'Călăreț'] }
  ];
  W.TIPN = {
    gold: 'aur din raiduri', mat: 'materiale la ieșirea cu prada', bld: 'cost clădiri',
    forge: 'timp de forjare', pts: 'puncte de luptă maxime', trav: 'cost de drum'
  };
  W.TIPD = {
    gold: 'Se aplică doar aurului obținut din raiduri asupra satelor. Nu se aplică temnițelor, taberelor, ruinelor sau misiunilor.',
    mat: 'Se aplică materialelor de afixe (nu minereului și nu cristalelor) din temnițe obișnuite, raiduri și tabere, la ieșirea cu prada.',
    bld: 'Reduce costul în aur al îmbunătățirii clădirilor satului.',
    forge: 'Reduce timpul de forjare, înmulțit peste reducerea Topitoriei.',
    pts: 'Mărește plafonul de puncte (nu ritmul de regenerare): ajută mai ales cine intră rar în joc.',
    trav: 'Raidurile, taberele și locurile aflate la 3 zone distanță (marginea hărții) costă cu 1 punct mai puțin.'
  };
  W.vil = id => W.VIL.find(x => x.id === id);
  /* valoarea brută a unui bonus pentru o treaptă */
  W.bVal = (tip, tier) => (W.P.terr[tip].v[tier - 1]) || 0;
  /* Total pe tip, cu randament descrescător și plafon.
     owned = [{tip,tier}, ...] doar teritoriile ACTIVE (în stăpânire, întreținute). */
  W.bonusOf = function (tip, owned, P) {
    P = P || W.P; const T = P.terr[tip]; if (!T) return 0;
    const vals = owned.filter(o => o.tip === tip).map(o => (T.v[o.tier - 1] || 0) * (o.m || 1)).sort((a, b) => b - a);
    let s = 0, m = 1; for (const v of vals) { s += v * m; m *= (T.dim != null ? T.dim : P.terr.dim); }
    s = Math.min(T.cap, s); return tip === 'pts' ? Math.floor(s + 1e-9) : Math.round(s * 10) / 10; /* punctele sunt întregi */
  };
  W.conqFee = (vl, tier, re, P) => { P = P || W.P; const c = P.conq; return Math.round((c.feeBase + c.feePerLv * vl) * c.feeTier[tier - 1] * (re ? c.reFee : 1)); };
  W.upk = (vl, tier, P, g) => { P = P || W.P; const u = P.upkeep; return Math.round((u.base + u.perLv * vl) * u.tier[tier - 1] * W.upkMul(vl, P) * (1 + (g || 0) * P.gar.upkK)); };
  W.upkMul = (L, P) => { P = P || W.P; const u = P.upkeep.prog, x = Math.max(0, Math.min(1, (L - u.from) / (u.to - u.from))); return 1 + u.k * Math.pow(x, u.pow); };
  W.garCost = (L, tier, lv, P) => { P = P || W.P; return lv >= P.gar.max ? null : Math.round(W.rawGold(L) * P.gar.costK[lv] * P.gar.tier[tier - 1]); };
  W.luxPrice = (shopPrice, q, P) => { P = P || W.P; return Math.round(shopPrice * P.mkt.luxMult[Math.max(0, Math.min(4, q | 0))]); };
  W.luxReroll = (L, n, P) => { P = P || W.P; return Math.round(W.rawGold(L) * P.mkt.rerollK * Math.pow(P.mkt.rerollGrow, n)); };
  W.luxRarW = (L, P) => { P = P || W.P; let w = P.mkt.luxRar[0][1]; for (const [lv, ww] of P.mkt.luxRar) if (L >= lv) w = ww; return w; };
  W.crPrice = (L, r, q, P) => { P = P || W.P; return Math.round(W.rawGold(L) * P.mkt.crTier[r - 1] * P.mkt.crQ[q]); };
  W.crLim = (q, P) => (P || W.P).mkt.crLim[q];
  W.renCost = (L, stage, P) => { P = P || W.P; return stage >= P.ren.max ? null : Math.round(W.rawGold(L) * P.ren.costK[stage]); };
  /* Steaguri (cosmetic, cumpărate cu aur; costul = k × pradă de raid la nivelul de la cumpărare) */
  W.FLAGS = [{ id: 'aur', nm: 'Auriu', col: '#f0d27a', k: 0 }, { id: 'rosu', nm: 'Roșu', col: '#c0504a', k: 3 }, { id: 'albastru', nm: 'Albastru', col: '#5b8fd6', k: 3 },
    { id: 'verde', nm: 'Verde', col: '#4fa35e', k: 3 }, { id: 'mov', nm: 'Mov regal', col: '#a173d9', k: 8 }, { id: 'alb', nm: 'Alb', col: '#ece6d6', k: 8 }, { id: 'argintiu', nm: 'Argintiu', col: '#aab4be', k: 15 }];
  W.flagCost = (L, id) => { const f = W.FLAGS.find(x => x.id === id); return f ? Math.round(W.rawGold(L) * f.k) : null; };
  W.fortFee = (lv, P) => { P = P || W.P; return Math.round(P.fort.feeBase + P.fort.feePerLv * lv); };

  /* ------------------------------------------------------------- TABERE DE BANDIȚI
     dl = nivel față de jucător; stars = risc afișat; dur = ore de existență; fights = lupte (ultima = căpitan).
     hm/am/dm = multiplicatori viață/atac/apărare ai inamicilor. */
  W.CAMPS = [
    { id: 'av', km: 2.0, nm: 'Avanpost de tâlhari', ic: '⚔', dl: -1, stars: 1, dur: 8, fights: 2, xn: 0, hm: .95, am: .95, dm: 1, w: 30, minLv: 1,
      en: ['Tâlhar', 'Hoț de drumuri', 'Pungaș'], drops: ['pra'], bn: 'Căpitanul tâlharilor',
      rw: { g: 1.25, o: .8, x: .8 }, why: 'Aur rapid, risc mic. Bun pentru recuperare după o înfrângere.' },
    { id: 'ct', km: 1.85, nm: 'Tabără de contrabandiști', ic: '📦', dl: 0, stars: 2, dur: 6, fights: 2, xn: 1, hm: 1, am: .9, dm: 1.5, w: 25, minLv: 3,
      en: ['Contrabandist', 'Paznic de depozit', 'Hamal înarmat'], drops: ['pra', 'izv'], bn: 'Șeful contrabandiștilor',
      rw: { g: .6, o: 1, x: 1, mats: 5, cr: [['jwf0', 2, .9], ['jwb0', 1, .25]] }, why: 'Materiale și cristale pentru forjare. Inamicii au apărare mare.' },
    { id: 'va', km: 1.9, nm: 'Vânători de recompense', ic: '🏹', dl: 2, stars: 3, dur: 5, fights: 2, xn: 0, hm: .8, am: 1.35, dm: 1, w: 20, minLv: 6,
      en: ['Arcaș vânător', 'Țintaș', 'Urmăritor'], drops: ['vul'], bn: 'Căpitanul vânătorilor', bleed: 1,
      rw: { g: .8, o: .6, x: 1.2, item: [1, 2] }, why: 'Obiect garantat (Magic sau Rar). Lovesc tare, dar cad repede.' },
    { id: 'ca', km: 1.9, nm: 'Tabăra cu prizonier', ic: '⛓', dl: 1, stars: 2, dur: 10, fights: 2, xn: 0, hm: 1, am: 1, dm: 1, w: 15, minLv: 4,
      en: ['Gardian al prizonierului', 'Paznic corupt'], drops: ['cal'], bn: 'Temnicerul',
      rw: { g: .5, o: .5, x: 1, merc: 1 }, why: 'Eliberezi un mercenar de rang mai mare, fără taxa de la Han.' },
    { id: 'ra', km: 1.45, nm: 'Hoarda de război', ic: '💀', dl: 4, stars: 4, dur: 12, fights: 3, xn: 1, hm: 1.1, am: 1.1, dm: 1.2, w: 10, minLv: 8,
      en: ['Berserker', 'Războinic al hoardei', 'Ucigaș'], drops: ['sng', 'osn'], bn: 'Căpetenia hoardei',
      rw: { g: 1.0, o: 1.2, x: 2.2, relic: 1, cr: [['jwb0', 1, .6]] }, why: 'Relicvă și experiență mare. Foarte periculoasă: vino pregătit.' }
  ];
  W.camp = id => W.CAMPS.find(c => c.id === id);
  /* Alege tipul unei tabere pentru un slot; ponderi după nivelul jucătorului */
  W.campType = function (rng, lvl) {
    const a = W.CAMPS.filter(c => lvl >= c.minLv); let t = a.reduce((s, c) => s + c.w, 0), x = rng() * t;
    for (const c of a) { x -= c.w; if (x <= 0) return c; } return a[0];
  };
  /* Taberele unui slot de timp. Determinist după (cheie, slot): reîncărcarea nu schimbă nimic. */
  W.campsForSlot = function (key, slot, lvl, taken, P) {
    P = P || W.P; const rng = W.prng(W.hash(key + '|camp|' + slot)), out = [];
    const free = []; for (let x = 0; x < W.GW; x++) for (let y = 0; y < W.GH; y++) if (!taken.has(W.cellKey(x, y))) free.push([x, y]);
    if (!free.length) return out;
    const n = 1; /* o tabără nouă la fiecare slot */
    for (let i = 0; i < n; i++) {
      const t = W.campType(rng, lvl), c = free.splice(Math.floor(rng() * free.length), 1)[0];
      out.push({ id: slot + '-' + i, t: t.id, x: c[0], y: c[1], lv: Math.max(1, lvl + t.dl), sl: slot, exp: slot * P.camp.slotH * 3600000 + t.dur * 3600000, att: 0, sd: Math.floor(rng() * 1e9) });
    }
    return out;
  };

  /* ------------------------------------------------------------- LOCURI DE INTERES */
  W.POI = [
    { id: 'ru', nm: 'Ruină antică', ic: '🏛', n: 2, cd: 24, pts: 2, d: 'Ruine cu relicve, inscripții și o cameră sigilată. Fiecare pas e o alegere.' },
    { id: 'pe', nm: 'Peșteră', ic: '⛏', n: 2, cd: 12, pts: 2, d: 'Minereu și materiale rare. Vena se epuizează dacă o storci des.' },
    { id: 'sa', nm: 'Sanctuar', ic: '✦', n: 1, cd: 20, pts: 1, d: 'Primești o binecuvântare temporară în schimbul unei ofrande.' },
    { id: 'dr', nm: 'Drum comercial abandonat', ic: '🛒', n: 1, cd: 8, pts: 1, d: 'Căruțe părăsite și un depozit al tâlharilor. Aur și materiale.' },
    { id: 'tu', nm: 'Turn de observație', ic: '🗼', n: 2, cd: 0, pts: 1, d: 'Urci în vârf și dezvălui zonele din jur. O singură dată.' }
  ];
  W.poiT = id => W.POI.find(p => p.id === id);
  /* Amplasare deterministă: fortăreața pe marginea hărții (distanța 3), apoi locurile de interes.
     vs = [{x,y}] satele existente. Returnează {fort:{x,y}, poi:[{id,t,x,y}]} */
  W.layout = function (key, vs) {
    const rng = W.prng(W.hash(key + '|poi')), taken = new Set([W.cellKey(W.CAP[0], W.CAP[1])]);
    vs.forEach(v => taken.add(W.cellKey(v.x, v.y)));
    const edge = []; for (let y = 0; y < W.GH; y++) { edge.push([0, y]); edge.push([W.GW - 1, y]); }
    let ef = edge.filter(c => !taken.has(W.cellKey(c[0], c[1])));
    if (!ef.length) { ef = []; for (let x = 0; x < W.GW; x++) for (let y = 0; y < W.GH; y++) if (!taken.has(W.cellKey(x, y)) && W.cheb(x, y) >= 2) ef.push([x, y]); }
    const f = ef[Math.floor(rng() * ef.length)]; taken.add(W.cellKey(f[0], f[1]));
    const free = []; for (let x = 0; x < W.GW; x++) for (let y = 0; y < W.GH; y++) if (!taken.has(W.cellKey(x, y))) free.push([x, y]);
    const poi = []; let n = 0;
    W.POI.forEach(t => { for (let i = 0; i < t.n; i++) { if (!free.length) break; const c = free.splice(Math.floor(rng() * free.length), 1)[0]; poi.push({ id: t.id + i, t: t.id, x: c[0], y: c[1] }); n++; } });
    return { fort: { x: f[0], y: f[1] }, poi };
  };

  /* ------------------------------------------------------------- EXPEDIȚII (alegeri)
     Fiecare alegere: g/o/x = multiplicatori pe baza unui raid de nivelul jucătorului; m = materiale;
     risk = probabilitate de incident (afișată jucătorului); loss = ce se întâmplă:
       {k:'loot',f}  pierzi f din prada neîncasată a expediției (nu atinge depozitul);
       {k:'hp',f}    echipa pierde f din viața maximă (nu poate scădea sub 1).
     need = materiale consumate. Retragerea păstrează tot ce ai strâns. */
  W.EX = {
    ru: { nm: 'Ruină antică', steps: [
      { n: 'Poarta dărâmată', tx: 'Zidurile au căzut peste intrare. Printre blocuri se văd fragmente de piatră gravată.', ch: [
        { t: 'Culegi ce se vede la suprafață', g: .22, m: 1, x: .3, risk: 0 },
        { t: 'Sapi sub dărâmături', g: .5, m: 2, x: .5, risk: .2, loss: { k: 'loot', f: .5 } } ] },
      { n: 'Sala coloanelor', tx: 'Coloane înalte, încă drepte. Pe jos, o urnă sigilată și rune gravate în dale.', ch: [
        { t: 'Copiezi inscripțiile', g: 0, x: 1.2, clue: 1, risk: 0 },
        { t: 'Spargi sigiliul urnei', g: .8, m: 2, risk: .3, loss: { k: 'loot', f: .5 } },
        { t: 'Treci peste podeaua cu rune', g: 1.0, m: 1, risk: .35, loss: { k: 'hp', f: .2 } } ] },
      { n: 'Camera sigilată', tx: 'Un zid de piatră neagră, cu o crăpătură prin care se vede lumină. Poți arde sigiliul cu rășină.', ch: [
        { t: 'Arzi sigiliul (consumi 3 × Rășină)', need: { rab: 3 }, g: 1.4, x: 1, relic: 1, risk: 0 } ] } ] },
    pe: { nm: 'Peșteră', steps: [
      { n: 'Intrarea', tx: 'Aer rece și umed. Pe pereți se văd vine de minereu.', ch: [
        { t: 'Aduni minereu de la suprafață', o: 1.4, risk: 0 },
        { t: 'Sapi o galerie laterală', o: 2.4, m: 1, risk: .15, loss: { k: 'loot', f: .4 } } ] },
      { n: 'Galeria adâncă', tx: 'Tavanul scârțâie, dar în fund licăre o venă groasă.', ch: [
        { t: 'Spargi vena de metal', o: 1.2, m: 3, risk: .3, loss: { k: 'loot', f: .5 } },
        { t: 'Urmezi apa subterană', g: .2, m: 2, mk: 'izv', risk: 0 } ] },
      { n: 'Peștera de cristal', tx: 'O boltă de cristale. Fără lumină vie nu poți desprinde nimic.', ch: [
        { t: 'Aprinzi torțele (consumi 3 × Cărbune de forjă)', need: { cal: 3 }, o: .6, cr: [['jwf0', 2, 1], ['jwb0', 1, .35]], risk: 0 } ] } ] },
    dr: { nm: 'Drum comercial abandonat', steps: [
      { n: 'Caravana răsturnată', tx: 'Căruțe răsturnate, butoaie sparte. Cineva a plecat în grabă.', ch: [
        { t: 'Cauți prin căruțe', g: .5, m: 1, mk: 'pra', risk: 0 },
        { t: 'Descui cufărul căpitanului', g: .95, risk: .25, loss: { k: 'loot', f: .5 } } ] },
      { n: 'Urmele tâlharilor', tx: 'Urme proaspete duc spre un adăpost ascuns între stânci.', ch: [
        { t: 'Urmărești urmele până la depozit', g: 1.3, m: 2, risk: .3, loss: { k: 'loot', f: .5 } },
        { t: 'Te mulțumești cu ce ai găsit', g: .15, risk: 0 } ] } ] },
    sa: { nm: 'Sanctuar', steps: [
      { n: 'Altarele', tx: 'Trei altare vechi. Fiecare cere o ofrandă în aur; binecuvântarea ține o oră.', ch: [
        { t: 'Altarul Vulturului: +10% atac, 60 min', buf: { k: 'pd', v: 10, min: 60 }, off: 22, clue: 1, risk: 0 },
        { t: 'Altarul Străjerului: +10% apărare, 60 min', buf: { k: 'pf', v: 10, min: 60 }, off: 22, clue: 1, risk: 0 },
        { t: 'Altarul Vieții: +10% viață, 60 min', buf: { k: 'ph', v: 10, min: 60 }, off: 22, clue: 1, risk: 0 },
        { t: 'Rugăciune simplă (fără ofrandă): +4% atac, 30 min', buf: { k: 'pd', v: 4, min: 30 }, off: 0, risk: 0 } ] } ] }
  };
  W.exRes = function (spec, si, ci, lvl, rng, P) {
    P = P || W.P; const c = spec.steps[si].ch[ci], r = { g: 0, o: 0, x: 0, m: {}, cr: {}, clue: !!c.clue, relic: !!c.relic, buf: c.buf || null, off: c.off ? Math.round(c.off * lvl) : 0, inc: null, need: c.need || null };
    r.g = Math.round((c.g || 0) * W.rawGold(lvl) * P.ex.gm); r.o = Math.round((c.o || 0) * W.rawOre(lvl) * P.ex.om); r.x = Math.round((c.x || 0) * W.rawXp(lvl) * P.ex.xm);
    for (let i = 0; i < (c.m || 0); i++) { const k = c.mk || W.pickMat(rng, lvl); r.m[k] = (r.m[k] || 0) + 1; }
    (c.cr || []).forEach(([k, n, p]) => { if (rng() < p) r.cr[k] = (r.cr[k] || 0) + n; });
    if (c.risk && rng() < c.risk) r.inc = c.loss;
    return r;
  };

  /* ------------------------------------------------------------- INDICII (cod)
     Un indiciu per loc de interes vizitat prima oară. Se leagă de campanie. */
  W.CLUES = {
    ru0: 'O urnă veche poartă semnul Corbului. Corbii păzeau drumul către Catacombe pentru Regele Cenușiu.',
    ru1: 'Pe un perete se citește: „Cinci sigilii țin Cenușa. Al șaselea se află pe tron.”',
    pe0: 'Minerii spun că Mina Cenușie a fost săpată ca să ajungă sub Tron, nu ca să scoată minereu.',
    pe1: 'Într-un colț, un cuțit cu mâner de corn: aparținea unei iscoade a Regelui, ucisă de propriii oameni.',
    sa0: 'Preotul sanctuarului a plecat în Furtună. Cheia către Cripta Furtunii se păstrează acolo, la Străjer.',
    dr0: 'Caravana ducea tribut către Bastionul Corbilor. Cineva a prădat-o, nu tâlharii.',
    tu0: 'Din turn se vede o fortăreață pe marginea ținutului: Bastionul Corbilor, vama Regelui.',
    tu1: 'Spre sud, o lumină verzuie pe apă: Cetatea Scufundată nu e pierdută, doar ascunsă.'
  };
  W.CLUE_FORT = 'tu0';     /* indiciul care dezvăluie locul Bastionului (și turnurile îl dezvăluie oricum prin rază) */

  /* ------------------------------------------------------------- FORTĂREAȚA */
  W.FORT = { nm: 'Bastionul Corbilor', ic: '🏰', boss: 'Castelanul Corbilor', en: ['Gardian de poartă', 'Arbaletier', 'Cavaler al Corbilor'],
    bonus: 'trav', bd: 'Drum liber: raidurile, taberele și locurile de la marginea hărții (3 zone distanță) costă cu 1 punct mai puțin. Steagul tău flutură pe hartă.',
    first: { g: 4, x: 3, item: [2, 2] } };

  /* ------------------------------------------------------------- CAMPANIA
     Obiectivele se evaluează din progresul PERMANENT (S.camp.bk = boss-uri înfrânte pe index DG,
     S.ter.st = contoare, S.ter.hist = sate cucerite vreodată, S.ter.dsc = locuri descoperite).
     Pierderea unui teritoriu nu anulează nimic. */
  W.CH = [
    { id: 1, nm: 'Cenușa din Mină', lv: 1, reg: 'Mina Cenușie',
      tx: 'Tronul de Argint stă gol de când Regele Cenușiu a stins Vatra Regală. Cenușa lui coboară din mină peste satul tău. Căpitanul Cenușii poartă la gât un sigiliu: primul dintre cele șase care țin Cenușa vie.',
      obj: [{ k: 'boss', di: 0, t: 'Înfrânge Căpitanul Cenușii (Mina Cenușie)' }, { k: 'raid', n: 1, t: 'Jefuiește un sat' }],
      rw: { g: 3, o: 2, x: 2, mat: 4 }, out: 'Sigiliul Cenușii e al tău. Sub el era o hartă a ținutului: drumurile duc spre alți căpitani.' },
    { id: 2, nm: 'Drumul Lupilor', lv: 4, reg: 'Peștera Lupilor',
      tx: 'Satele din jur plătesc tribut Regelui Cenușiu și drumurile sunt păzite de haite dresate. Alfa Haitei ține al doilea sigiliu. Dacă vrei să stăpânești drumul, trebuie să ai sate care ți se supun.',
      obj: [{ k: 'boss', di: 4, t: 'Înfrânge Alfa Haitei (Peștera Lupilor)' }, { k: 'conq', n: 1, t: 'Cucerește un sat' }, { k: 'poi', n: 2, t: 'Descoperă 2 locuri de interes' }],
      rw: { g: 4, o: 3, x: 3, item: [1, 1] }, out: 'Prima ta stăpânire pe hartă. Drumul spre Catacombe e deschis.' },
    { id: 3, nm: 'Bastionul Corbilor', lv: 8, reg: 'Catacombele Uitate',
      tx: 'Corbii Regelui păzesc singurul drum către Catacombe, din fortăreața de pe marginea ținutului. Dincolo de ea, Regele Oaselor ține al treilea sigiliu.',
      obj: [{ k: 'clue', n: 3, t: 'Adună 3 indicii din ținut' }, { k: 'fort', t: 'Cucerește Bastionul Corbilor' }, { k: 'boss', di: 1, t: 'Înfrânge Regele Oaselor (Catacombele Uitate)' }],
      rw: { g: 6, o: 4, x: 5, item: [2, 2] }, out: 'Bastionul îți aparține. Corbii au plecat, iar Catacombele sunt deschise.' },
    { id: 4, nm: 'Furtuna', lv: 13, reg: 'Fortul Părăsit și Cripta Furtunii',
      tx: 'O furtună nu se mai oprește deasupra Fortului Părăsit. Comandantul Fantomă își apără oamenii morți; în Cripta Furtunii, Străjerul păstrează cheia ultimei părți a ținutului. Cripta se deschide doar în evenimentul săptămânal.',
      obj: [{ k: 'boss', di: 5, t: 'Înfrânge Comandantul Fantomă (Fortul Părăsit)' }, { k: 'boss', di: 9, t: 'Înfrânge Străjerul Furtunii (Cripta Furtunii, eveniment săptămânal)' }],
      rw: { g: 8, o: 5, x: 7, mat: 8, cr: ['jwb0', 2] }, out: 'Furtuna s-a liniștit. Cheia Străjerului deschide drumul spre ape.' },
    { id: 5, nm: 'Apele Întunecate', lv: 18, reg: 'Cetatea Scufundată și Mlaștina Putredă',
      tx: 'Sub ape, Căpitanul Înecat își păzește cetatea, iar în mlaștină, Hidra îngroapă ce a rămas din cei care au încercat înaintea ta. Cunoașterea ținutului îți va fi mai de folos decât sabia.',
      obj: [{ k: 'boss', di: 2, t: 'Înfrânge Căpitanul Înecat (Cetatea Scufundată)' }, { k: 'boss', di: 6, t: 'Înfrânge Hidra Mlaștinii (Mlaștina Putredă)' }, { k: 'camp', n: 5, t: 'Elimină 5 tabere de bandiți' }, { k: 'poit', n: 4, t: 'Vizitează 4 tipuri diferite de locuri' }],
      rw: { g: 12, o: 8, x: 10, item: [3, 3] }, out: 'Ținutul e al tău. Mai rămâne doar Tronul.' },
    { id: 6, nm: 'Tronul Cenușiu', lv: 30, reg: 'Abisul, Forja Veche și Tronul Cenușiu',
      tx: 'Cele cinci sigilii arse. Al șaselea e pe Tron. Sub el, Stăpânul Abisului și Fierarul Ars își apără stăpânul: Regele Cenușiu.',
      obj: [{ k: 'boss', di: 3, t: 'Înfrânge Stăpânul Abisului' }, { k: 'boss', di: 7, t: 'Înfrânge Fierarul Ars (Forja Veche)' }, { k: 'boss', di: 8, t: 'Înfrânge Regele Cenușiu (Tronul Cenușiu)' }],
      rw: { g: 30, o: 20, x: 25, legend: 'runic' }, out: 'Tronul de Argint are din nou un stăpân.' }
  ];
  /* Obiective secundare: recompense unice, pentru explorare */
  W.SEC = [
    { id: 'cart', nm: 'Cartograf', t: 'Dezvăluie întreaga hartă', k: 'fog', n: 35, rw: { g: 2, o: 1, mat: 4 } },
    { id: 'pust', nm: 'Pustnic', t: 'Vizitează toate cele 5 tipuri de locuri', k: 'poit', n: 5, rw: { g: 2, x: 2, item: [1, 2] } },
    { id: 'stap', nm: 'Stăpân de văi', t: 'Controlează 3 sate în același timp', k: 'own', n: 3, rw: { g: 4, x: 2 } },
    { id: 'vana', nm: 'Vânătorul de tabere', t: 'Elimină 10 tabere de bandiți', k: 'camp', n: 10, rw: { g: 3, x: 3, relic: 1 } },
    { id: 'rasb', nm: 'Răzbunare', t: 'Recucerește un sat pierdut', k: 'recon', n: 1, rw: { g: 2, x: 1, mat: 4 } }
  ];
  W.chRw = (rw, lvl) => ({ g: Math.round((rw.g || 0) * W.rawGold(lvl)), o: Math.round((rw.o || 0) * W.rawOre(lvl) * 4), x: Math.round((rw.x || 0) * W.rawXp(lvl)) });

  /* ------------------------------------------------------------- STAGIILE SATULUI (vizual) */
  W.STAGES = [[0, 'Tabără'], [6, 'Sătuc'], [18, 'Sat'], [36, 'Târg întărit'], [60, 'Cetate']];
  W.stage = function (total) { let s = 0; for (let i = 0; i < W.STAGES.length; i++) if (total >= W.STAGES[i][0]) s = i; return s; };
  W.btier = lv => lv <= 0 ? 0 : lv <= 2 ? 1 : lv <= 5 ? 2 : lv <= 9 ? 3 : 4;

  if (typeof module !== 'undefined' && module.exports) module.exports = W;
  root.ST_W = W; if (root.ST_PROD !== undefined) W.CFG.prod = !!root.ST_PROD;
})(typeof globalThis !== 'undefined' ? globalThis : this);
