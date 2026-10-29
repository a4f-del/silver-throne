/* ============================================================================
   Silver Throne — tron-logic.js
   Logica PURĂ pentru „Regele Tronului” (fără DOM, fără starea jocului, fără rețea).
   O folosesc: clientul (tron.js), serverul simulat din teste (dev/fake-throne.js) și testele.
   SQL-ul din supabase/ implementează ACELEAȘI reguli (aceleași valori sunt în tabelul throne_config).
   ========================================================================== */
(function (root) {
  'use strict';
  const T = {};
  const W = (typeof module !== 'undefined' && module.exports) ? require('./world-data.js') : root.ST_W;

  /* ------------------------------------------------------------- CONFIGURARE */
  T.CFG = {
    tz: 'Europe/Bucharest',
    /* Sfârșitul primei săptămâni (test): vineri 30 octombrie 2026, 15:00 ora României. Următoarele: din 7 în 7 zile,
       tot la 15:00 ORA LOCALĂ (se ține cont de schimbarea orei de vară/iarnă). */
    anchorLocal: { y: 2026, m: 10, d: 30, h: 15, mi: 0 },
    weekDays: 7,
    minLevel: 10,               /* nivel minim pentru participare */
    ghostCapLevel: 40,          /* plafon: statisticile fantomei nu depășesc ale unui luptător de nivel 40 cu echipament Epic complet */
    maxUnits: 3,                /* luptători în fantomă */
    protectMin: 30,             /* minute de protecție pentru un rege proaspăt încoronat */
    cooldownS: 120,             /* pauză între două provocări ale aceluiași jucător (secunde) */
    dailyCap: 10,               /* provocări pe zi (zi = ora României); provocarea e GRATUITĂ, fără puncte */
    ghostAtkMult: 1.62,         /* fantoma lovește doar normal, fără abilități și critice; multiplicatorii compensează (calibrat în dev/calibrate-ghost.js) */
    ghostHpMult: 1,
    guardK: 2.75,               /* dificultatea Gărzii Regale (Tron gol): multiplicator peste k(nivel). Calibrat în dev/calibrate-guard.js: la nivelul minim un jucător slab câștigă ~85–90%, unul bine echipat ~100% */
    prize: { king: 1.5, k2: 1, k3: 0.6, part: 0.25 },    /* × n, unde n = 2 + nivel ÷ 5 (cât cere un afix la o forjare) */
    titles: { king: 'Regele Tronului', k2: 'Cavaler al Coroanei', k3: 'Cavaler al Coroanei', part: 'Pretendent la Tron' }
  };

  /* Plafonul pe clasă: ce are un luptător de nivel 40 cu echipament Epic calitate 2 (calculat cu motorul real:
     dev/calc-ghost-cap.js → dev/out/ghost-cap.json). atk e FĂRĂ multiplicatorul fantomei. */
  T.CAP = {
    'Campion': { hp: 2870, atk: 345, def: 243 }, 'Arcaș': { hp: 1322, atk: 281, def: 124 }, 'Paznic': { hp: 1338, atk: 228, def: 162 },
    'Războinic': { hp: 1262, atk: 245, def: 167 }, 'Mag': { hp: 1264, atk: 233, def: 121 }, 'Vraci': { hp: 1164, atk: 287, def: 160 }, 'Gardian': { hp: 1396, atk: 223, def: 217 }
  };

  /* --------------------------------------------------------------- FUS ORAR */
  /* decalajul (ms) al fusului T.CFG.tz față de UTC la momentul dat; ține cont de ora de vară */
  T.tzOffsetMs = function (utcMs) {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: T.CFG.tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(new Date(utcMs));
    const g = k => +p.find(x => x.type === k).value;
    return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - Math.floor(utcMs / 1000) * 1000;
  };
  /* ora locală (an, lună, zi, oră, minut) → milisecunde UTC */
  T.localToUtc = function (y, m, d, h, mi) {
    const naive = Date.UTC(y, m - 1, d, h, mi, 0);
    let guess = naive - T.tzOffsetMs(naive);
    guess = naive - T.tzOffsetMs(guess);       /* a doua trecere corectează în jurul schimbării orei */
    return guess;
  };
  /* sfârșitul săptămânii k (k = 0: săptămâna de test, care se încheie la ancoră) */
  T.weekEndMs = function (k) { const a = T.CFG.anchorLocal; return T.localToUtc(a.y, a.m, a.d + k * T.CFG.weekDays, a.h, a.mi); };
  /* începutul săptămânii k = sfârșitul lui k−1 (pentru k = 0 nu există început: de la începutul timpului) */
  T.weekStartMs = k => (k <= 0 ? -Infinity : T.weekEndMs(k - 1));
  /* indicele săptămânii care conține momentul dat */
  T.weekIndex = function (nowMs) { let k = 0; while (nowMs >= T.weekEndMs(k)) k++; return k; };
  /* ziua calendaristică locală (pentru limita zilnică) */
  T.localDay = function (utcMs) { return new Intl.DateTimeFormat('en-CA', { timeZone: T.CFG.tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(utcMs)); };

  /* ----------------------------------------------------------------- PREMII */
  T.n = L => 2 + Math.floor(Math.max(0, L) / 5);                       /* unități cerute de un afix la o forjare */
  T.rank2kind = r => (r === 1 ? 'king' : r === 2 ? 'k2' : r === 3 ? 'k3' : 'part');
  T.amount = function (kind, L) { const m = T.CFG.prize[kind], a = Math.ceil(m * T.n(L) - 1e-9); return Math.max(1, a); };
  T.title = kind => T.CFG.titles[kind];
  /* materialele rare deblocate la nivelul L (aceleași praguri ca în joc: W.MLV) */
  T.rareOptions = L => Object.keys(W.MLV).filter(k => L >= W.MLV[k]).sort((a, b) => W.MLV[a] - W.MLV[b]);

  /* ----------------------------------------------------------------- CLASAMENT */
  /* domnii: [{user, from, to|null}] (ms). Întoarce [{user, seconds, rank, firstFrom}] pentru fereastra [start, end),
     pentru utilizatorii cu timp de deținere > 0; egalitățile le câștigă cine a încoronat primul în fereastră. */
  T.ranking = function (reigns, startMs, endMs, nowMs) {
    const lim = Math.min(endMs, nowMs), acc = {};
    for (const r of reigns) {
      const a = Math.max(r.from, startMs), b = Math.min(r.to == null ? lim : r.to, endMs, lim);
      if (b > a) { const o = acc[r.user] || (acc[r.user] = { user: r.user, ms: 0, firstFrom: a }); o.ms += b - a; o.firstFrom = Math.min(o.firstFrom, a); }
    }
    const list = Object.values(acc).filter(o => o.ms >= 1000).sort((p, q) => q.ms - p.ms || p.firstFrom - q.firstFrom);
    return list.map((o, i) => ({ user: o.user, seconds: Math.floor(o.ms / 1000), rank: i + 1, firstFrom: o.firstFrom }));
  };

  /* ----------------------------------------------------------------- FANTOMA */
  const fin = (v, d) => (Number.isFinite(+v) ? +v : d);
  /* aplică plafonul și multiplicatorul unei unități {n,c,hp,atk,def} → unitate de luptă pentru motor */
  T.ghostUnit = function (u, cfg) {
    cfg = cfg || T.CFG; const cap = T.CAP[u.c] || T.CAP['Campion'];
    const hp = Math.max(1, Math.round(Math.min(Math.round(fin(u.hp, 1)), cap.hp) * (cfg.ghostHpMult || 1)));
    const atk = Math.max(1, Math.min(Math.round(fin(u.atk, 1) * cfg.ghostAtkMult), Math.round(cap.atk * cfg.ghostAtkMult)));
    const def = Math.max(0, Math.min(Math.round(fin(u.def, 0)), cap.def));
    return { n: String(u.n || 'Luptător').slice(0, 20), c: u.c, hp, atk, def };
  };
  /* validare pe server/client a unui instantaneu: 1..3 unități, clase cunoscute, valori finite */
  T.validGhost = function (g) {
    if (!g || !Array.isArray(g.units) || g.units.length < 1 || g.units.length > T.CFG.maxUnits) return false;
    return g.units.every(u => u && typeof u.c === 'string' && T.CAP[u.c] && Number.isFinite(+u.hp) && Number.isFinite(+u.atk) && Number.isFinite(+u.def) && +u.hp > 0 && +u.atk >= 0 && +u.def >= 0);
  };
  /* puterea unei fantome (pentru afișare): suma hp + 6·atk + 10·def */
  T.power = units => units.reduce((s, u) => s + u.hp + 6 * u.atk + 10 * u.def, 0);

  if (typeof module !== 'undefined' && module.exports) module.exports = T;
  root.ST_T = T;
})(typeof globalThis !== 'undefined' ? globalThis : this);
