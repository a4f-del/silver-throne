/* ============================================================================
   Silver Throne — ghid.js
   1) Ghidul pentru jucătorii noi: fiecare pas arată DRUMUL prin meniu („Sat › Topitorie”),
      iar săgeata aurie indică pe rând butonul de urmat: meniul, grupul, fila, apoi butonul acțiunii.
      „Du-mă acolo” rămâne doar ca scurtătură mică.
   2) Sfaturi care apar la momentul lor (Lumea la nivelul 5, primul Veteran, Catacombele, Tronul).
   3) „Ce poți face acum”: când rămâi fără puncte, lista acțiunilor care NU cer puncte și pe care
      le poți face chiar acum (forjă, misiuni, antrenament, clădiri, Han, specializări, Lumea, Tronul).

   index.html folosește: TU (= GHID), tuChk, tuH, tuNext, tuSkip, tuGo (aceleași nume ca înainte) și ghIdle.
   Pasul curent e S.tu (−1 = ghid închis); sfaturile văzute: S.ghs; S.ghOff = fără sfaturi.
   Se încarcă înaintea scriptului din pagină.
   ========================================================================== */
const GH_TAB = { a: 'Sat', c: 'Coborâre', m: 'Hartă', r: 'Tron', e: 'Echipă' };
const GH_MT = { h: 'Harta', l: 'Harta', b: 'Clasament', k: 'Campanie', t: 'Teritorii' };
/* Ghidarea BETA urmeaza meniul compact, fara a schimba ghidul LIVE. */
const ghCompact = () => typeof ST_SERVER !== 'undefined' && ST_SERVER === 'beta' &&
  typeof stCompactActive === 'function' && stCompactActive();
const ghTeamLabel = () => ghCompact() ? 'Erou → Echipă și echipament' : 'Echipă';
function ghTeamNav() {
  const selector = ghCompact()
    ? 'header .st-hero-drop:not([open]) > summary, header .st-hero-drop[open] button[onclick^="stCompactHeroGo("]'
    : '#nv button[onclick="tab(\'e\')"]';
  return ghQ(selector)[0] || null;
}
function ghReplayTarget() {
  return ghQ(ghCompact()
    ? 'header .st-settings:not([open]) > summary, header .st-settings[open] button[onclick="fxToggleInstant()"]'
    : 'header .hq[onclick^="fxToggleInstant"]');
}
const ghQ = s => [...document.querySelectorAll(s)].filter(e => e.offsetParent !== null || e instanceof SVGElement);
const ghB = (s, on) => ghQ('#v button[onclick^="' + s + '"]').filter(b => !on || !b.disabled);

/* ------------------------------------------------------------------ PAȘII */
/* p = unde se face pasul {t: filă, v: subfila Satului, m: subfila Hărții}; c = când e gata; k = ținta săgeții acolo; r = recompensă */
const GHID = [
  { t: 'Bine ai venit!', n: 1,
    d: 'Ești eroul unui sat. Cobori în temnițe după pradă, forjezi echipament și îți strângi o echipă. Ghidul te duce pas cu pas, în ritmul tău: urmează săgeata aurie.' },
  { t: 'Redarea luptelor', p: { t: 'c' }, n: 1, k: ghReplayTarget,
    d: (typeof ST_SERVER !== 'undefined' && ST_SERVER === 'beta')
      ? 'În <b>Coborâre</b>, luptele se văd lovitură cu lovitură. Apasă <b>⚙ Setări</b> în bara de sus, apoi <b>Redare lupte</b> ca să schimbi între animație și rezultat direct.<details><summary>Mai multe</summary>Prima luptă se vede mereu, ca să înțelegi cum funcționează. În același meniu găsești și <b>Botul</b> (premium).</details>'
      : 'În <b>Coborâre</b> te lupți cu monștri. Fiecare luptă se vede <b>lovitură cu lovitură</b>. Butonul <b>Redare</b> din bara de sus (săgeata) o pornește sau o oprește: oprită, sari direct la rezultat.<details><summary>Mai multe</summary>Prima ta luptă se vede mereu, ca să înțelegi cum merge. Butonul de lângă el pornește <b>Botul</b> (premium).</details>' },
  { t: 'Prima coborâre', p: { t: 'c' }, c: () => C('l') >= 1, r: { g: 30, o: 15 },
    k: () => { if (!S.d) return (typeof dOpen === 'function' && !dOpen(0)) ? ghB('dToggle(0)') : ghB('startD(0)'); if (S.d.f) return []; const d = ghB('startD(', 1), l = ghB('leave('); return d.length ? [...d, ...l] : l; },
    d: 'Apasă <b>„Intră”</b> la <b>Mina Cenușie</b> și ia monștrii pe rând: fiecare costă 1 punct. Înaintea fiecărui pas vezi <b>șansele de câștig</b>. Când vrei să te oprești, apasă <b>„Ieși cu prada”</b>.<details><summary>Mai multe</summary>Lista se termină cu un căpitan (2 puncte, cu o abilitate specială). Locul din listă se păstrează; după căpitan, lista o ia de la capăt.</details>' },
  { t: 'Forjează o armă', p: { t: 'a', v: 'a' }, c: () => C('f') >= 1, r: { g: 30, o: 10 },
    k: () => { const u = S.ui || {}; if (u.t != 'w') return ghQ('#v select[onchange^="ui(\'t\'"]'); if (+u.r !== 0) return ghQ('#v select[onchange^="ui(\'r\'"]'); return ghB('craft('); },
    d: 'Echipamentul se face în <b>Topitorie</b>. Alege <b>Armă</b>, raritatea <b>Comun</b> și apasă <b>„Forjează”</b>.<details><summary>Mai multe</summary>Forja lucrează câteva clipe. Dacă eșuează, primești jumătate din materiale și mai încerci o dată.</details>' },
  { t: 'Pune arma pe erou', p: () => (S.inv.some(it => it.t === 'w') && !roster().some(f => E(f).w)) ? { t: 'e' } : { t: 'a', v: 'a' }, c: () => C('e') >= 1, r: { g: 30, o: 5 },
    k: () => {
      const hasW = S.inv.some(it => it.t === 'w');
      if (!hasW) { const c = ghB('collect('); if (c.length) return c; const t = ghQ('#v .fslot [data-end], #v [data-end]'); if (t.length) return t.slice(0, 1); return ghB('craft('); }
      const m = ghQ('#lgm .ipk-c button.p'); if (m.length) return m.slice(0, 1); const w = ghQ('#v button[onclick="invPick(\'w\')"]'); return w.length ? w : ghB('invPick(').concat(ghB('equip(')).slice(0, 1);
    },
    d: (typeof ST_SERVER !== 'undefined' && ST_SERVER === 'beta'
      ? 'Când arma e gata, apasă <b>„Ridică”</b> în Topitorie. Din bara de sus deschide <b>Erou → Echipă și echipament</b>, apoi pune arma pe erou.'
      : 'Când arma e gata, apasă <b>„Ridică”</b> în Topitorie. Apoi du-te în <b>Echipă</b>: la <b>Armă</b> apasă <b>„Alege”</b>, apoi <b>„Pune”</b>.') },
  { t: 'Antrenează eroul', p: { t: 'a', v: 't' }, c: () => C('t') >= 1, r: { g: 60 }, k: () => ghB('train(', 1).slice(0, 1),
    d: 'În <b>zona de antrenament</b> transformi aurul în putere pentru erou. Antrenează o dată.<details><summary>Mai multe</summary>Forță, Rezistență și Agilitate cresc eroul (iar mercenarii își trag puterea din el). Pricepere și Negoț ajută toată echipa.</details>' },
  { t: 'Hanul', p: { t: 'a', v: 'h' }, c: () => mrHas('Războinic') && !mrAll().some(f => f.nn), r: { g: 40 },
    k: () => { if ((S.mrOff || []).includes('Războinic')) return ghB("mrRecruit('Războinic')"); const n = ghQ('#mr-m button[onclick="mrName()"]'); return n.length ? n : ghQ('#v .mr-hc').slice(0, 1); },
    d: 'La <b>Han</b> stau mercenarii tăi. Aici ți se alătură <b>Războinicul</b>: apasă „Recrutează”, apoi dă-i un nume.<details><summary>Mai multe</summary>Ai câte un mercenar din fiecare clasă, pentru totdeauna. Echipa are 3 locuri; ceilalți stau în rezervă. Mercenarii cresc în rang luptând.</details>' },
  { t: 'Misiunile zilnice', p: { t: 'a', v: 'x' }, c: () => S.tab === 'a' && S.vil === 'x', r: { g: 30 }, k: () => ghB('claim'),
    d: 'În <b>Misiuni</b> primești în fiecare zi 3 sarcini cu recompense. Le termini jucând normal; revino aici să le revendici.<details><summary>Mai multe</summary>Pe măsură ce înaintezi, mai apar mercenari de recrutat la Han: un mesaj discret și un semn pe clădire te anunță.</details>' },
  { t: 'Jefuiește un sat', p: { t: 'm', m: 'l' }, c: () => C('r') >= 1, r: { g: 80, o: 20 },
    k: () => { if (typeof ST_SERVER !== 'undefined' && ST_SERVER === 'beta') return ghQ('#v g[onclick^="wnPick("]'); const r = ghB('raid('); return r.length ? r : ghQ('#v g[onclick^="mv("]'); },
    d: (typeof ST_SERVER !== 'undefined' && ST_SERVER === 'beta') ? 'În <b>Hartă → Lumea</b>, atinge un sat NPC comun și alege <b>„Jefuiește”</b>. Poți reveni la același sat după o oră.' : 'Pe <b>Hartă</b>, în chenarul auriu, e <b>ținutul tău</b>: sate conduse de alții. Atinge unul și apasă <b>„Jefuiește”</b>.<details><summary>Mai multe</summary>Mai târziu le poți și cuceri, ca teritorii.</details>' },
  { t: 'Când rămâi fără puncte', n: 1,
    d: 'Ai o <b>rezervă de 120 de puncte</b> (sus, lângă fulger) care îți umple bara când se golește. Când nu mai ai puncte, ai destule de făcut fără ele: forjă, antrenament, clădiri, misiuni. Apare în <b>Sat</b> lista <b>„Ce poți face acum”</b>.<details><summary>Mai multe</summary>Până la nivelul 10, fiecare nivel nou îți <b>adaugă</b> 30 de puncte. După aceea punctele se refac singure, câte unul la 6 minute. De la nivelul 5 se deschide <b>Lumea</b>, cu atacuri asupra altor jucători care nu costă puncte.</details>' },
  { t: 'Ești pregătit', e: 1,
    d: 'De aici urcă în nivel și deblochează temnițe noi (Catacombele Uitate la nivelul 8). Când se deschide ceva nou, îți spun aici. Mult succes!' }
];
/* pauza dintre pași: după un pas terminat, următorul apare abia după câteva secunde (sau când apeși „Continuă”) */
const TU_REST = 8000;

/* ------------------------------------------------------------------ SFATURI
   Fiecare mecanism nou primește un sfat, o singură dată, când apare prima dată.
   when = când devine util; p = unde se află (drumul și săgeata); done = s-a rezolvat singur (de ex. ai vizitat locul);
   k2 = ținta săgeții odată ajuns acolo. Ordinea contează: întâi ce e urgent, apoi ce s-a deschis. */
const ghFirst = () => !ghActive() && (S.tu < 0 || (GHID[S.tu] && GHID[S.tu].e));   /* doar după ghidul de început */
function ghHints() {
  const L = [], seen = S.ghs || {}, own = () => (S.map ? terOwnedV().length : 0);
  L.push({ k: 'fall', when: () => !S.d && S.fs.some(f => f.hp <= 0), p: { t: 'e' }, done: () => !S.fs.some(f => f.hp <= 0), t: 'Un luptător a căzut',
    k2: () => { const a = ghB('reviveAll('), r = ghB('revive('); return a.length ? a.slice(0, 1) : r.length ? r.slice(0, 1) : ghQ('#v .tm-c.dead').slice(0, 1); },
    d: 'Luptătorii căzuți nu mai intră în luptă până nu îi ridici. În <b>Echipă</b> apasă <b>„Ridică toți căzuții”</b> (sau „Ridică” la unul singur): costă aur și le lasă câte o cicatrice (−3 viață maximă). Răniții se vindecă mai ieftin, tot de acolo. Infirmeria din sat le face pe amândouă și le scade costul.' });
  L.push({ k: 'atac', when: () => !!(S.al && S.al.length), p: { t: 'a', v: 'z' }, done: () => S.tab === 'a' && S.vil === 'z', t: 'Satul tău a fost atacat',
    d: 'Satele din regiune te atacă din când în când. Dacă apărarea ține, primești tribut; dacă nu, pierzi puțin aur și minereu. În <b>Apărare</b> angajezi străjeri și îmbunătățești Zidul.' });
  L.push({ k: 'spec', when: () => typeof spNeedN === 'function' && spNeedN() > 0, p: { t: 'e' }, done: () => typeof spNeedN === 'function' && spNeedN() === 0, t: 'Prima specializare',
    k2: () => { const c = ghQ('#v .tm-c .nb'); if (c.length && !spNeed(cur())) return [c[0].closest('.tm-c')]; return ghQ('#v .sp-pick button').slice(0, 1); },
    d: 'Un luptător a ajuns <b>Veteran</b> (sau eroul la nivelul 10) și poate primi o <b>specializare</b>: fiecare clasă are două, cu câte 4 trepte care se deblochează odată cu rangul. În <b>Echipă</b>, alege-l pe cel cu „!”. Prima alegere e gratuită; mai târziu o poți schimba contra aur.' });
  L.push({ k: 'cmp', when: () => typeof chCur === 'function' && chReady(chCur()), p: { t: 'm', m: 'k' }, done: () => S.tab === 'm' && S.mt === 'k', t: 'Capitol de campanie terminat',
    d: 'Ai îndeplinit obiectivele unui capitol din <b>Campanie</b>. Revendică recompensa; capitolul următor îți arată ce urmează.' });
  L.push({ k: 'leg', when: () => S.inv.some(x => x && x.lg), p: { t: 'e' }, done: () => S.tab === 'e', t: 'Un obiect legendar',
    d: 'Ai primit un obiect <b>legendar</b>: are un efect special pe care nu-l găsești la forjă. În <b>Echipă</b>, la slotul lui, apasă „Alege” sau „Înlocuiește” și pune-l pe luptătorul potrivit.' });
  L.push({ k: 'lume', when: () => S.lvl >= 5, p: { t: 'm', m: 'l' }, done: () => S.tab === 'm' && S.mt === 'l', t: 'S-a deschis Lumea',
    d: 'Ai ajuns la nivelul 5. În <b>Hartă › Lumea</b> vezi satele celorlalți jucători și îi poți ataca. Atacurile au bara lor (18 pe zi), <b>nu costă puncte</b>, iar cel atacat nu pierde nimic. În <b>Clasament</b> vezi cine e cel mai puternic.' });
  /* fiecare temniță nouă */
  DG.forEach((g, i) => { if (i > 0 && !g.ev && g.lv > 1) L.push({ k: 'dg' + i, when: () => S.lvl >= g.lv, p: { t: 'c' }, done: () => S.tab === 'c', t: 'Temniță nouă: ' + g.n,
    d: `La nivelul ${g.lv} s-a deschis <b>${g.n}</b>, în Coborâre: ${g.rooms} camere, căpitanul ${g.bn}${g.rm >= 2 ? ' și materiale mai rare' : ''}. Lupte mai grele, pradă mai bună.` }); });
  if (typeof ST_SERVER === 'undefined' || ST_SERVER !== 'beta') L.push({ k: 'camp', when: () => S.lvl >= 2 && !!(S.ter && S.ter.camps && S.ter.camps.length), p: { t: 'm', m: 'l' }, done: () => S.tab === 'm' && (S.mt === 'h' || !S.mt ? 'l' : S.mt) === 'h', t: 'Tabere pe hartă',
    d: 'Pe <b>Hartă</b>, în Regiune, apar <b>tabere</b> de bandiți care pleacă după câteva ore. Au mai multe lupte la rând și un căpitan, iar prada e mai bună decât la un jaf. Le vezi și în panoul „Acum”, cu timpul rămas.' });
  if (typeof ST_SERVER === 'undefined' || ST_SERVER !== 'beta') L.push({ k: 'conq', when: () => !!S.map && MPV().vs.some(v => v.o !== 'p' && (v.rw || 0) >= TP.conq.raids), p: { t: 'm', m: 'l' }, done: () => own() > 0, t: 'Poți cuceri un sat',
    d: `Ai jefuit un sat de ${TP.conq.raids} ori: acum îl poți <b>cuceri</b>. Pe Hartă, atinge-l și alege „Cucerește” (costă puncte și o taxă în aur). Un sat cucerit îți aduce bonusuri zilnice, dar are și o întreținere; le vezi la <b>Teritorii</b>.` });
  if (typeof ST_SERVER === 'undefined' || ST_SERVER !== 'beta') L.push({ k: 'fort', when: () => S.lvl >= TP.fort.lv && own() >= 1, p: { t: 'm', m: 't' }, done: () => S.tab === 'm' && S.mt === 't', t: 'Cetatea regiunii',
    d: `De la nivelul ${TP.fort.lv}, cu cel puțin un sat cucerit, poți asedia <b>cetatea</b> regiunii. E cel mai greu obiectiv de pe hartă și dă cele mai mari bonusuri. Condițiile le vezi la <b>Teritorii</b>.` });
  L.push({ k: 'tron', when: () => S.lvl >= 10, p: { t: 'r' }, done: () => S.tab === 'r', t: 'Tronul de Argint',
    d: 'De la nivelul 10 poți lupta pentru <b>Tron</b>. Învingi fantoma regelui (sau Garda Regală, dacă Tronul e gol) și devii rege. Cine îl ține cel mai mult într-o săptămână primește titlul și materiale rare. Provocările sunt gratuite.' });
  L.push({ k: 'lv10', when: () => S.lvl > 10, t: 'Ai trecut de nivelul 10',
    d: 'Până acum, fiecare nivel nou îți <b>adăuga</b> 30 de puncte. De acum, un nivel nou doar <b>umple</b> bara până la 30. Ritmul devine mai calm: revii, cheltuiești punctele, pleci. Între timp, Lumea, Tronul și forja nu cer puncte.' });
  L.push({ k: 'bp0', when: () => !!S.bpEnd, t: 'Rezerva de început s-a terminat',
    d: 'Ai folosit cele 120 de puncte de rezervă primite la început. De acum punctele vin doar din regenerare (unul la 6 minute, până la 30) și din nivelurile noi. Când rămâi fără ele, în Sat apare lista „Ce poți face acum”.' });
  return L;
}
/* ------------------------------------------------------------------ DRUMUL PRIN MENIU */
const ghGroup = v => (typeof TEMA_G !== 'undefined' ? TEMA_G.findIndex(g => g[2].includes(v)) : -1);
const ghVilN = v => (Object.fromEntries(VL)[v] || v);
/* elementul următor din drum (butonul din meniu, grupul, fila) sau null dacă ești deja acolo */
function ghPath(p) {
  if (!p) return null;
  p = typeof p === 'function' ? p() : p; if (!p) return null;
  if (S.tab !== p.t) return p.t === 'e' ? ghTeamNav() : ghQ(`#nv button[onclick="tab('${p.t}')"]`)[0] || null;
  if (p.v && S.vil !== p.v) return ghQ(`#v .vh-lb[data-v="${p.v}"], #v .vh-card[data-v="${p.v}"], #v .vb-c[data-v="${p.v}"]`)[0] || null;   /* pagina de start a satului sau banda din clădiri */
  if (p.m && (S.mt === 'h' || !S.mt ? 'l' : S.mt) !== p.m) return ghQ(`#v button[onclick="mtab('${p.m}')"]`)[0] || null;
  return null;
}
const ghThere = p => { p = typeof p === 'function' ? p() : p; return !p || (S.tab === p.t && (!p.v || S.vil === p.v) && (!p.m || (S.mt === 'h' || !S.mt ? 'l' : S.mt) === p.m)); };
/* „Unde: Sat › Producție › Topitorie”, cu bucățile deja parcurse bifate */
function ghCrumb(p) {
  p = typeof p === 'function' ? p() : p; if (!p) return '';
  const seg = [[p.t === 'e' ? ghTeamLabel() : GH_TAB[p.t], S.tab === p.t]];
  if (p.v) seg.push([ghVilN(p.v), S.tab === p.t && S.vil === p.v]);
  if (p.m) seg.push([GH_MT[p.m], S.tab === p.t && (S.mt === 'h' || !S.mt ? 'l' : S.mt) === p.m]);
  let cur = true;
  return `<div class="gh-path"><span class="mute">Unde:</span> ${seg.map(([n, ok]) => { const now = cur && !ok; if (!ok) cur = false; return `<span class="${ok ? 'ok' : now ? 'now' : ''}">${n}</span>`; }).join('<i>›</i>')}</div>`;
}

/* ------------------------------------------------------------------ STAREA GHIDULUI */
const ghActive = () => S.tu != null && S.tu >= 0 && GHID[S.tu] && !GHID[S.tu].e;
function ghHint() {
  if (!S || S.ghOff || !ghFirst()) return null;
  const s = S.ghs || (S.ghs = {});
  for (const h of ghHints()) { try { if (!s[h.k] && h.when()) return h; } catch (e) { /* un sfat stricat nu oprește jocul */ } }
  return null;
}
/* salvările cu ghidul vechi (9 pași): trecem la cel nou fără să dăm recompensele de două ori */
function ghMig() {
  if (!S || S.tuv === 3) return;
  if (S.tuv === 2) {   /* ghidul cu 8 pași → cel cu pauze și pași mai mici (se adaugă „Redarea luptelor”, iar arma are doi pași) */
    if (S.tu != null && S.tu > 0) { const o = S.tu; S.tu = o <= 1 ? o : o === 2 ? (C('f') >= 1 ? 4 : 3) : o + 2; if (o >= 8) S.tu = Math.min(S.tu, GHID.length - 1); }
  } else if (S.tu != null && S.tu > 0) { let i = 2; while (i < GHID.length - 1 && GHID[i].c && GHID[i].c()) i++; S.tu = i; }   /* salvările cu ghidul vechi (9 pași) */
  S.ghs = S.ghs || {};
  S.tuv = 3;
}
/* jucătorii existenți nu primesc dintr-odată sfaturile pentru tot ce au descoperit deja */
function ghMigH() {
  if (S.ghv === 2) return; S.ghs = S.ghs || {};
  if (S.lvl > 1 || S.xp > 0 || C('d') > 0) for (const h of ghHints()) { try { if (!['spec', 'cmp', 'fall', 'leg'].includes(h.k) && h.when()) ghSeen(h); } catch (e) { /* ignorat */ } }
  S.ghv = 2;
}
function tuChk() {
  /* Noua poveste are propria recompensa si propriul parcurs; nu rula recompensele tutorialului. */
  if (typeof jeEnabled === 'function' && jeEnabled()) return;
  if (S.tu == null) S.tu = 0;
  if (S.tuv !== 3) ghMig();
  if (S.ghv !== 2) ghMigH();
  const h = !ghActive() && ghHint(); if (h && h.done && h.done()) ghSeen(h);
  /* sfatul afișat ultima dată s-a rezolvat între timp (de ex. ai ales specializarea): nu mai apare */
  if (S.ghCur && S.ghs && !S.ghs[S.ghCur]) { const c = ghHints().find(x => x.k === S.ghCur); try { if (c && c.done && c.done()) ghSeen(c); } catch (e) { /* ignorat */ } }
  if (S.tu < 0) return;
  if (S.tuRest > Date.now()) return;   /* pauză între pași: nu trecem mai departe până nu se termină */
  const st = GHID[S.tu];
  if (st && st.c && st.c()) {
    const r = st.r || {}; S.gold += r.g || 0; S.ore += r.o || 0; S.tu++;
    if (GHID[S.tu] && !GHID[S.tu].e) S.tuRest = Date.now() + TU_REST;
    S.msg = (S.msg ? S.msg + ' ' : '') + 'Ghid: pas terminat' + (r.g || r.o ? ` (+${r.g || 0} aur, +${r.o || 0} minereu)` : '') + '.';
  }
}
function tuGo() { const p = (ghActive() ? GHID[S.tu] : ghHint() || {}).p; if (!p) return; S.tab = p.t; if (p.v) S.vil = p.v; if (p.m) S.mt = p.m; S.msg = ''; go(); }
function tuNext() { S.tu++; S.tuRest = 0; go(); }
function tuSkip() { S.tu = -1; S.tuRest = 0; go(); }
function tuGoOn() { S.tuRest = 0; go(); }
/* după pauză, ecranul se reîmprospătează singur (dar nu în mijlocul redării unei lupte) */
function ghRestWait() {
  if (window.__tuT || !(S.tuRest > Date.now())) return;
  const run = () => { window.__tuT = null; if (typeof FX !== 'undefined' && FX.playing) { window.__tuT = setTimeout(run, 2000); return; } if (S.tuRest > 0) go(); };
  window.__tuT = setTimeout(run, Math.max(50, S.tuRest - Date.now() + 50));
}
function ghSeen(h) { S.ghs[h.k] = 1; (h.also || []).forEach(k => { S.ghs[k] = 1; }); }
function ghHintOk() { const h = ghHint(); if (h) ghSeen(h); go(); }
function ghHintOff() { S.ghOff = 1; go(); }

function tuH() {
  if (S.tu == null) return '';
  if (S.tu >= 0 && GHID[S.tu] && S.tuRest > Date.now() && !GHID[S.tu].e) {   /* pauză: un moment de respiro între pași */
    ghRestWait();
    return `<section class="gh rest"><h2>Bine lucrat!</h2><div class="gh-d">Ți-ai făcut treaba. Respiră o clipă: ghidul continuă în câteva secunde.<div class="mute">Urmează: ${GHID[S.tu].t}</div></div><div class="gh-a"><button class="p" onclick="tuGoOn()">Continuă</button><button class="gh-l" onclick="tuSkip()">Sari peste ghid</button></div></section>`;
  }
  if (S.tu >= 0 && GHID[S.tu]) {
    const st = GHID[S.tu], n = GHID.length - 2, there = ghThere(st.p);
    const btn = st.e ? `<button class="p" onclick="tuSkip()">Închide ghidul</button>` : st.n && there ? `<button class="p" onclick="tuNext()">${S.tu === 0 ? 'Începe' : S.tu === 1 ? 'Am înțeles' : 'Mai departe'}</button>` : '';
    return `<section class="gh"><h2>Ghid${S.tu > 0 && !st.e ? ` <span class="gh-n">${S.tu}/${n}</span>` : ''}: ${st.t}</h2><div class="gh-d">${st.d}</div>${st.p ? ghCrumb(st.p) : ''}`
      + `<div class="gh-a">${btn}${st.p && !there ? `<button class="gh-l" onclick="tuGo()">Nu găsesc, du-mă acolo</button>` : ''}${st.e ? '' : `<button class="gh-l" onclick="tuSkip()">Sari peste ghid</button>`}</div></section>`;
  }
  const h = ghHint(); if (!h) return '';
  const there = ghThere(h.p); S.ghCur = h.k;
  return `<section class="gh hint"><h2>Sfat nou: ${h.t}</h2><div class="gh-d">${h.d}</div>${h.p ? ghCrumb(h.p) : ''}<div class="gh-a"><button class="${there ? 'p' : ''}" onclick="ghHintOk()">Am înțeles</button>${there ? '' : `<button class="gh-l" onclick="tuGo()">Du-mă acolo</button>`}<button class="gh-l" onclick="ghHintOff()">Fără sfaturi</button></div></section>`;
}

/* ------------------------------------------------------------------ CE POȚI FACE ACUM */
/* doar acțiunile disponibile ACUM și fără puncte; apare în Sat și Coborâre când nu mai ai puncte */
function ghIdle() {
  try {
    if (!S || S.d || !(S.tab === 'a' || S.tab === 'c') || S.pts >= 1 || ghActive()) return '';
    const it = [], g = S.gold, now = Date.now();
    const add = (ic, t, act) => it.push(`<button class="gh-i" onclick="${act}"><span class="gh-ic">${ic}</span><span>${t}</span><b>›</b></button>`);
    const rdy = typeof sdForgeReady === 'function' ? sdForgeReady() : 0, free = S.forge.slice(0, S.slots).some(x => !x);
    if (rdy) add('✔', `Ridică ${rdy === 1 ? 'obiectul forjat' : rdy + ' obiecte forjate'}`, "sdGo('a','vil','a')");
    else if (free) add('⚒', 'Forjează: ai un loc liber în Topitorie', "sdGo('a','vil','a')");
    if (dmReady() > 0) add('🎯', 'Revendică recompensele misiunilor', "sdGo('a','vil','x')");
    const s = ST(), tc = ['f', 'r', 'a', 'p', 'n'].filter(k => s[k] < smax()).map(k => stc(s[k])).sort((a, b) => a - b)[0];
    if (tc != null && tc <= g) add('💪', `Antrenează eroul (de la ${tc} aur)`, "sdGo('a','vil','t')");
    const b = BL(), bc = ['f', 'i', 'b', 'd', 'z'].filter(k => (b[k] || 0) < bmax()).map(k => bcc(b[k] || 0)).sort((a, b) => a - b)[0];
    if (typeof dcReady === 'function' && dcReady()) add('🎁', 'Deschide cufărul zilnic', "sdGo('a','vil','x')");
    { const mp = typeof dm === 'function' ? dm().list.filter(x => x.p && !x.c) : []; if (mp.length) add('⚡', `${mp.length} ${mp.length === 1 ? 'misiune' : 'misiuni'} fără puncte, care îți dau puncte`, "sdGo('a','vil','x')"); }
    { const r = typeof mxReady === 'function' ? mxReady() : 0, free = typeof mxBusy === 'function' ? S.rs.filter(f => !f.h && !mxBusy(f) && f.hp > 0).length : 0;
      if (r) add('🧭', `${r} ${r === 1 ? 'mercenar s-a întors' : 'mercenari s-au întors'} din expediție`, "sdGo('a','vil','h')"); else if (free) add('🧭', `Trimite ${free === 1 ? 'mercenarul din rezervă' : free + ' mercenari din rezervă'} în expediție`, "sdGo('a','vil','h')"); }
    if (bc != null && bc <= g) add('🏗', `Îmbunătățește o clădire (de la ${bc} aur)`, "sdGo('a')");
    if (typeof spNeedN === 'function' && spNeedN() > 0) add('⭐', 'Alege o specializare pentru un mercenar', "sdGo('e')");
    const dead = S.fs.filter(f => f.hp <= 0).length;
    if (dead) add('☠', `Ridică ${dead === 1 ? 'luptătorul căzut' : 'toți cei ' + dead + ' căzuți'} (${dead * revCost()} aur)`, 'reviveAll()');
    else if (S.fs.some(f => f.hp > 0 && f.hp < mhp(f))) add('➕', 'Vindecă-ți răniții la Infirmerie', "sdGo('a','vil','i')");
    const en = typeof lwEn === 'function' ? lwEn() : null;
    if (S.lvl >= 5 && en && en.n >= 1) add('⚔', `Atacă alți jucători în Lume (${en.n} atacuri, fără puncte)`, "sdGo('m','mt','l')");
    else if (S.lvl < 5) it.push(`<div class="gh-i off"><span class="gh-ic">🔒</span><span>Lumea, cu atacuri fără puncte, se deschide la nivelul 5</span></div>`);
    const ts = typeof TRON !== 'undefined' && TRON.st;
    if (S.lvl >= 10 && ts && ts.me && ts.me.can_challenge) add('♛', 'Provoacă Tronul (gratuit)', "tab('r')");
    const next = PTX() - (now - S.ptsT), full = next + (MXP() - S.pts - 1) * PTX();
    return `<section class="gh-idle"><h2>Ce poți face acum</h2><div class="mute gh-pt">Nu mai ai puncte. Următorul vine peste <b data-end="${now + next}">${fmt(next)}</b>; toate ${MXP()} sunt înapoi în ${sdT(full)}.</div>`
      + (it.length ? `<div class="gh-list">${it.join('')}</div>` : '<p class="mute">Deocamdată nimic. Revino când se refac punctele.</p>') + '</section>';
  } catch (e) { return ''; }
}

/* ------------------------------------------------------------------ SĂGEATA */
(function () {
  if (typeof document === 'undefined') return;
  const st = document.createElement('style');
  st.textContent = `
.gh{border-left-color:var(--ember)!important}.gh.hint{border-left-color:var(--gold)!important}
.gh h2 .gh-n{font-size:.75em;color:var(--mute);letter-spacing:0}
.gh-d{line-height:1.5}.gh-d details{margin-top:8px}.gh-d summary{cursor:pointer;color:var(--gold2);font-size:14px}.gh-d details[open] summary{margin-bottom:4px}.gh.rest{border-left-color:#4fa35e!important}.gh.rest .mute{margin-top:6px}
.gh-path{display:flex;flex-wrap:wrap;align-items:center;gap:4px 6px;margin:10px 0 2px;font-size:15px}
.gh-path>span:not(.mute){padding:2px 9px;border:1px solid var(--line);border-radius:12px;background:#0b0e10aa;color:var(--mute)}
.gh-path>span.ok{color:#7fd88c;border-color:#4fa35e77}.gh-path>span.ok::before{content:'✔ '}
.gh-path>span.now{color:#1a1306;background:var(--gold2);border-color:var(--gold2);font-weight:700}
.gh-path i{color:var(--mute);font-style:normal}
.gh-a{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:10px}
.gh-l{background:none!important;border:0!important;box-shadow:none!important;padding:2px 0;color:var(--mute);text-decoration:underline;text-underline-offset:3px;font-size:14px}
.gh-l:hover{color:var(--gold2)}
.gh-idle{border-left-color:var(--gold)!important}
.gh-pt{margin-bottom:8px}
.gh-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:6px}
.gh-i{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:8px 10px;font-size:15px;border:1px solid var(--line);border-radius:6px;background:linear-gradient(180deg,#181e21,#0e1214);color:var(--ink)}
.gh-i:hover{border-color:var(--gold)}.gh-i>span:nth-child(2){flex:1}.gh-i b{color:var(--gold2)}
.gh-i.off{opacity:.65}
.gh-ic{flex:none;width:24px;text-align:center}
`;
  document.head.appendChild(st);
  addEventListener('DOMContentLoaded', () => {
    const ar = document.createElement('div'); ar.id = 'tu-arrow'; ar.setAttribute('aria-hidden', 'true');
    ar.innerHTML = '<i><svg viewBox="0 0 64 64"><defs><linearGradient id="tuG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".45" stop-color="#f2c14e"/><stop offset="1" stop-color="#b8860b"/></linearGradient></defs><path d="M22 4h20v28h14L32 60 8 32h14z" fill="url(#tuG)" stroke="#6b4a06" stroke-width="2.5" stroke-linejoin="round"/></svg></i>';
    document.body.appendChild(ar);
    /* ținta: întâi drumul prin meniu, apoi butonul pasului */
    function targets() {
      if (typeof S === 'undefined' || !S || S.tu == null || (typeof jeFocusActive==='function'&&jeFocusActive())) return [];
      if (document.getElementById('gate') && !document.getElementById('gate').classList.contains('g-out')) return [];
      if (S.tu >= 0 && S.tuRest > Date.now()) return ghQ('#v .gh.rest button.p');   /* în pauză, săgeata arată doar „Continuă” */
      let step = null, k = null;
      if (ghActive()) { step = GHID[S.tu]; k = step.k; }
      else if (S.tu >= 0 && GHID[S.tu] && GHID[S.tu].e) return ghQ('#v button[onclick="tuSkip()"]').filter(b => b.classList.contains('p'));
      else { const h = ghHint(); if (h) { step = h; k = h.k2; if (!h.p) return ghQ('#v button[onclick="ghHintOk()"]'); } }
      if (!step) return [];
      if (!step.p) return ghQ('#v button[onclick="tuNext()"]');
      const nav = ghPath(step.p); if (nav) return [nav];
      if (step.n && !k && !step.k) return ghQ('#v button[onclick="tuNext()"]');
      if (step.n && step.k) { const t = step.k(); return t.length ? t : ghQ('#v button[onclick="tuNext()"]'); }
      return k ? k() : [];
    }
    let lit = [], lastEl = null;
    function tick() {
      let t = []; try { t = targets(); } catch (e) { t = []; }
      lit.forEach(e => { if (!t.includes(e)) e.classList.remove('tu-glow'); });
      t.forEach(e => e.classList.add('tu-glow')); lit = t;
      const el = t[0], r = el && el.getBoundingClientRect();
      if (!r || !r.width) { ar.style.display = 'none'; return requestAnimationFrame(tick); }
      /* ținta nouă e în afara ecranului: o aducem în vedere o singură dată (nu la fiecare cadru, ca să nu te împiedice să derulezi) */
      if (el !== lastEl) {
        lastEl = el;
        const hb = (document.querySelector('header') || {}).getBoundingClientRect?.().bottom || 0, nb = innerWidth < 960 ? ((document.getElementById('nv') || {}).offsetHeight || 0) : 0;
        if (!el.closest('#nv') && (r.top < hb || r.bottom > innerHeight - nb)) el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
      ar.style.display = 'block';
      const s = ar.offsetWidth, vh = innerHeight, vw = document.documentElement.clientWidth,
        top = (document.querySelector('header') || {}).getBoundingClientRect?.().bottom || 0,
        inNav = !!el.closest('#nv'), bot = vh - (innerWidth < 960 && !inNav ? ((document.getElementById('nv') || {}).offsetHeight || 0) : 0);
      let x = Math.max(4, Math.min(vw - s - 4, r.left + r.width / 2 - s / 2)), y, rot = 0;
      if (inNav && innerWidth >= 960) { x = Math.min(vw - s - 4, r.right + 6); y = r.top + r.height / 2 - s / 2; rot = 90; }  /* meniul din stânga: săgeata stă în dreapta butonului */
      else if (r.top > bot) y = bot - s - 6;
      else if (r.bottom < top) { y = top + 6; rot = 180; }
      else if (r.top - s - 6 >= top) y = r.top - s - 6;
      else { y = r.bottom + 6; rot = 180; }
      ar.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px) rotate(${rot}deg)`;
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
})();
