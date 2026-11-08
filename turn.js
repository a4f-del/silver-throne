/* ============================================================================
   Silver Throne — turn.js
   Turnul (endgame, de la nivelul 20): etaje succesive, câte o luptă pe etaj, un străjer la fiecare 10.
   Intrarea costă 6 puncte, etajele sunt gratuite, 3 încercări pe zi. Fiecare intrare o ia de la etajul 1;
   rămân recordul din toate timpurile și cel al săptămânii. Fără vindecare, în afară de un foc de tabără
   după fiecare străjer. Recordul deblochează treptele +6…+9 la Fierărie (etajele 10, 20, 40, 60).
   Noiembrie 2026: 100 de etaje. Dificultatea urcă repede până la 20, apoi tot mai încet (twG), ca etajul 100 să fie
   vârful jocului (nivel 50, cel mai bun echipament, legendare). Legendarele (legendare.js) se câștigă prima dată la
   etajele 20, 25, 30, 40, 50, 60, 70, 80, 90, 100; după aceea mai pot cădea, rar, de la străjeri.
   Prada obișnuită: un obiect la fiecare străjer (din 10 în 10).
   Folosește motorul temnițelor (S.d cu tw:1); cârligele sunt în index.html, trepte.js și istoric.js.
   ========================================================================== */
const TWR = { lv: 20, cost: 6, day: 3, up: [10, 20, 40, 60], ab: ['call', 'howl', 'drain', 'shield', 'wave', 'poison', 'invuln', 'burn', 'storm', 'rebirth'] };
/* etajul n are monștri de nivelul 12 + n, indiferent de nivelul tău, și cu 3% mai grei pe etaj (reglat prin simulare:
   nivel 20 cu Rar ≈ etajul 13, nivel 30 cu Epic ≈ 22, nivel 40 cu Epic +5 ≈ 32, nivel 50 cu Epic +9 ≈ 39–41) */
/* etajul real → „etajul vechi” (cât de greu e): 1:1 până la 20, ½ până la 60, 0,3 până la 80, apoi 0,4 (100 ≈ vechiul 54).
   Reglat prin simulare, nivel 50: Epic ≈ etajul 65, Epic +5 ≈ 85, Epic +9 ≈ 92, Epic +9 cu legendarele ≈ 100+ */
const twG = n => n <= 20 ? n : n <= 60 ? 20 + (n - 20) * 0.5 : n <= 80 ? 40 + (n - 60) * 0.3 : 46 + (n - 80) * 0.4;
TWR.kf = n => { const m = twG(n); return 2.6 * Math.pow(1.03, Math.max(0, m - 1)) * (3 + 1.1 * (12 + m)) / (3 + 1.1 * Math.max(1, S.lvl)); };
/* legendarele Turnului: etajul la care se câștigă prima dată */
const TW_LG = [[20, 'maree'], [25, 'pasi'], [30, 'violet'], [40, 'fum'], [50, 'smarald'], [60, 'ametist'], [70, 'izvor'], [80, 'tunet'], [90, 'zori'], [100, 'rege']];
const twK = n => TWR.kf(n);
const twWid = () => String(Math.floor((Date.now() - Date.UTC(2024, 0, 5, 13, 0, 0)) / 6048e5));   /* săptămâna se închide vinerea la 15:00, ca la Tron */
function twSt() { const t = S.tw || (S.tw = { best: 0, wk: '', wb: 0, day: '', n: 0, v: 2 });
  if (t.v !== 2) { const cv = b => b <= 20 ? b : b <= 40 ? 20 + (b - 20) * 2 : Math.min(100, Math.round(60 + (b - 40) / 0.3)); t.best = cv(t.best || 0); t.wb = cv(t.wb || 0); t.v = 2; }   /* recordurile vechi, pe noua scară (păstrează treptele Fierăriei) */
  t.lg = t.lg || {}; if (t.wk !== twWid()) { t.wk = twWid(); t.wb = 0; } if (t.day !== dk()) { t.day = dk(); t.n = 0; } return t; }
const twLeft = () => Math.max(0, TWR.day - twSt().n);
const twUpMax = () => { const b = (S.tw && S.tw.best) || 0; return 5 + TWR.up.filter(f => b >= f).length; };
/* numele monștrilor: urcă prin monștrii temnițelor pe măsură ce urci etajele */
function twMob(n) { const L = Object.values(TR_D).flatMap(x => x.m); return L[Math.min(L.length - 1, Math.floor((twG(n) - 1) * L.length / 50))]; }
const twAb = n => TWR.ab[(Math.floor(n / 10) - 1) % TWR.ab.length];
/* BETA: pornește după un prag DEJA ÎNVINS. Nu se acordă XP sau pradă
   pentru etajele sărite, nici recompensele lor legendare. Costul rămâne 6p. */
const TW_STARTS=[1,21,41,61,81];
function twStartChoice(t){
 const n=Number(t.start||1);
 return TW_STARTS.includes(n)&&(n===1||(t.best||0)>=n-1)?n:1;
}
function twStartSet(n){
 if(S.d||
   (typeof adventureActive==='function'&&adventureActive()))return;
 const t=twSt();n=Number(n);
 if(!TW_STARTS.includes(n)||(n>1&&(t.best||0)<n-1))return;
 t.start=n;S.msg='';go();
}
function twStartControls(t){
 const current=twStartChoice(t);
 const options=TW_STARTS.map(n=>
  '<option value="'+n+'"'+(n>1&&(t.best||0)<n-1?' disabled':'')+
  (n===current?' selected':'')+'>'+
  (n===1?'Etajul 1':'Etajul '+n+' (după record '+(n-1)+')')+'</option>'
 ).join('');
 return '<div class="tw-faststart"><label for="tw-start">Startul următoarei urcări</label>'+
  '<select id="tw-start" onchange="twStartSet(this.value)">'+options+'</select>'+
  '<small>Etajele sărite NU dau aur, minereu, XP, obiecte sau recompense legendare. O urcare costă tot 6 puncte și consumă una dintre cele 3 încercări.</small></div>';
}
/* Repere compacte deja existente în Turn, fără nouă sursă de recompense. */
function twProgress(t){
 const best=Math.max(0,Math.min(100,Number(t.best)||0));
 const guard=best>=100?null:Math.min(100,Math.floor(best/10)*10+10);
 const next=TWR.up.find(n=>best<n),prev=[0,...TWR.up.filter(n=>n<=best)].at(-1);
 const pct=next?Math.round((best-prev)/(next-prev)*100):100;
 const craft=next?'Următorul prag Fierărie: etajul '+next+' (+'+(6+TWR.up.indexOf(next))+')':'Toate treptele Fierăriei deblocate';
 return '<div class="tw-progress"><div class="tw-progress-info">'+
  '<span><b>Următorul străjer</b>'+(guard?'Etajul '+guard:'Toți străjerii învinși')+'</span>'+
  '<span><b>Progres în Fierărie</b>'+craft+'</span></div>'+
  '<div class="tw-progress-meter" role="progressbar" aria-label="Progres până la următorul prag de Fierărie" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+pct+'"><i style="width:'+pct+'%"></i></div></div>';
}
function twEnter() {
  const t = twSt();
  if (S.lvl < TWR.lv) { S.msg = `Turnul se deschide la nivelul ${TWR.lv}.`; return go(); }
  if (S.d || (typeof adventureActive==='function' && adventureActive())) { S.msg = 'Termină întâi aventura în care ești.'; return go(); }
  if (!S.fs.some(f => f.hp > 0)) { S.msg = 'Toți luptătorii sunt căzuți. Du-i la Infirmerie.'; return go(); }
  if (t.n >= TWR.day) { S.msg = 'Ai folosit toate cele 3 urcări de azi. Revino mâine.'; return go(); }
  if (S.pts < TWR.cost) { S.msg = `Intrarea în Turn costă ${TWR.cost} puncte.`; return go(); }
  const start=typeof twStartChoice==='function'?twStartChoice(t):1;
  spend(TWR.cost); t.n++;
  let di = 0; DG.forEach((g, i) => { if (!g.ev && S.lvl >= g.lv) di = i; });   /* materialele vin ca din cea mai mare temniță deschisă */
  S.d = { tw: 1, room: start-1, rooms: 9999, k: twK(start), rw: 1, bn: 'Străjerul', di, tier: 0, loot: { gold: 0, ore: 0, xp: 0, m: {} }, f: null, done: false };
  S.d.twStart=start;
  S.d.doors = doors(); S.tab = 'c'; S.msg = start>1?'Începi urcarea la etajul '+start+'. Etajele sărite nu acordă pradă sau XP. Primești recompense numai pentru etajele câștigate.':'Intri în Turn. Fiecare etaj e mai greu decât cel dinainte; poți ieși oricând cu prada.'; cn('d'); go();
}
/* înainte de fiecare etaj (din door): dificultatea, prada și numele străjerului */
function twFloor(d) { const n = d.room; d.k = twK(n); d.rw = 1 + twG(n) * 0.04; if (n % 10 === 0) d.bn = `Străjerul etajului ${n}`; }
/* după fiecare etaj câștigat (din win) */
function twWin(d, b) {
  const n = d.room, t = twSt(), was = t.best, msg = [`Etajul ${n} trecut.`];
  if (n > t.best) t.best = n; if (n > t.wb) t.wb = n;
  for (const f of TWR.up) if (was < f && t.best >= f) msg.push(`Ai deblocat +${5 + TWR.up.indexOf(f) + 1} la Fierărie!`);
  const add = it => { if (it) { (d.loot.it || (d.loot.it = [])).push(it); msg.push(`Printre prăzi: ${it.name}.`); } };
  if (n % 10 === 0) {   /* un obiect la fiecare străjer (din 10 în 10); mai bun cu cât urci */
    const g = twG(n), r = g >= 30 ? (Math.random() < 0.6 ? 3 : 2) : g >= 15 ? (Math.random() < 0.35 ? 3 : 2) : (Math.random() < 0.7 ? 2 : 1);
    add(lootItem(['w', 'a', 'h', 'b', 'j'], S.lvl, r, null, null, 0));
    /* după ce ai câștigat legendare, străjerii de la etajul 30 în sus mai pot da, rar, unul dintre ele (pentru alt luptător) */
    const own = TW_LG.filter(([f, id]) => t.lg[id] && f <= n).map(([, id]) => id);
    if (n >= 30 && own.length && Math.random() < 0.04) { add(mkLegendary(P(own), S.lvl)); msg.push('Un legendar!'); }
  }
  for (const [f, id] of TW_LG) if (n === f && !t.lg[id] && typeof LG !== 'undefined' && LG[id]) {   /* prima dată la etajul lui: legendarul e garantat */
    t.lg[id] = 1; add(mkLegendary(id, S.lvl)); msg.push(`Ai câștigat un legendar: ${LG[id].n}!`);
  }
  if (b) {   /* străjer: fragment și foc de tabără */
    if (Math.random() < 0.5) { S.frag = (S.frag || 0) + 1; msg.push('Ai găsit un fragment epic.'); }
    S.fs.forEach(f => { if (f.hp > 0) f.hp = Math.min(mhp(f), f.hp + Math.round(mhp(f) * 0.3)); });
    msg.push('Echipa se odihnește la un foc de tabără (+30% viață).');
  }
  S.msg = msg.join(' ');
}
/* rândul cu legendarele Turnului: câștigate (colorate) și următorul de câștigat */
function twLgRow(t) {
  if (typeof LG === 'undefined') return '';
  const nx = TW_LG.find(([, id]) => !t.lg[id]);
  return `<div class="tw-lg">${TW_LG.map(([f, id]) => { const d = LG[id]; if (!d) return ''; const got = t.lg[id]; return `<span class="tw-lgi${got ? ' on' : ''}" title="${tEsc(d.n)} · etajul ${f}${got ? ' · câștigat' : ''}${d.cls ? ' · doar ' + (d.cls === 'Campion' ? 'eroul' : d.cls) : ''}&#10;${tEsc(d.d || '')}"><img src="${d.ico}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"><b>${f}</b></span>`; }).join('')}</div>`
    + `<div class="mute tw-lgn">${nx ? `Următorul legendar: <b>${tEsc(LG[nx[1]] ? LG[nx[1]].n : '')}</b> la etajul ${nx[0]}.` : 'Ai câștigat toate legendarele Turnului.'}</div>`;
}
/* cardul din Coborâre */
function twCard() {
  if (S.lvl < TWR.lv - 5) return '';   /* la nivelul 1 nu are rost: apare abia cu 5 niveluri înainte de deblocare */
  const t = twSt(), lock = S.lvl < TWR.lv, nx = TWR.up.find(f => t.best < f);
  return `<section class="tw-c"><div class="tw-img"><img src="imagini/lume/turn.webp" alt=""></div><div><h2>Turnul</h2>`
    + `<div class="info"><div class="mute">Etaje tot mai grele, câte o luptă pe etaj.</div><details><summary>ⓘ Cum funcționează</summary><div class="mute">100 de etaje, un străjer la fiecare 10, cu un obiect la fiecare străjer. După recorduri de 20/40/60/80 poți porni direct de la 21/41/61/81, fără pradă pentru etajele sărite. Fără vindecare, în afară de Vraci și de un foc de tabără după fiecare străjer. Recordul deblochează treptele +6…+9 la Fierărie (etajele 10, 20, 40, 60). La etajele 20, 25, 30, 40, 50… 100 câștigi câte un legendar, prima dată când ajungi acolo.</div></details></div>`
    + (lock ? `<div class="row"><span class="mute">Se deschide la nivelul ${TWR.lv}.</span></div>` :
      `<div class="tw-st"><span>Recordul tău<b>${t.best ? 'etajul ' + t.best : '—'}</b></span><span>Săptămâna asta<b>${t.wb ? 'etajul ' + t.wb : '—'}</b></span><span>Urcări azi<b>${twLeft()} / ${TWR.day}</b></span><span>Fierăria<b>până la +${twUpMax()}</b></span></div>`
      + twProgress(t) + twStartControls(t)
      + twLgRow(t)
      + `<div class="row"><span class="mute">${nx ? `Următoarea treaptă (+${5 + TWR.up.indexOf(nx) + 1}) la etajul ${nx}.` : 'Ai deblocat toate treptele Fierăriei.'}</span><button class="p" onclick="twEnter()"${twLeft() && !S.d ? '' : ' disabled'}>Intră · ${TWR.cost} puncte</button></div>`)
    + `</div></section>`;
}
/* pe harta Lumii: la nord-vest, cu recordul tău; clic → pagina Turnului */
function twPos() {
  const ps = (LUME.st && LUME.st.players) || [];
  const R = lwHull(ps);
  /* Nord-vest, departe de Tron, dincolo de râu și în apropierea munților.
     Poziția rămâne deterministă pentru aceeași hartă, fără date salvate noi. */
  let x = -Math.max(340, R.x * .68), y = -Math.max(250, R.y * .75);
  /* Nu acoperim sate când lumea crește sau când apar jucători noi. */
  for (let n = 0; n < 8 && ps.some(p => {
    const [vx, vy] = lwPos(p);
    return Math.abs(vx - x) < 180 && Math.abs(vy - y) < 225;
  }); n++) x -= 85;
  return [Math.round(x), Math.round(y)];
}
const twNear = (x, y) => { const p = twPos(); return Math.hypot(x - p[0], (y - p[1]) * 1.2) < 170; };
function lwTwr() {
  const [x, y] = twPos(), W = 178, H = Math.round(W * 3 / 2), b = (S.tw && S.tw.best) || 0;
  return `<g class="st-v lw-v" onclick="S.tab='c';go()" tabindex="0" role="button" aria-label="Turnul${b ? ', recordul tău: etajul ' + b : ''}" transform="translate(${x} ${y})">`
    + `<ellipse cx="0" cy="${Math.round(H * 0.36)}" rx="${W * 0.55}" ry="${W * 0.16}" fill="#000" opacity=".35"/>`
    + `<image href="imagini/lume/turn-100.webp" x="${-W / 2}" y="${-Math.round(H * 0.62)}" width="${W}" height="${H}"/>`
    + `<circle cx="0" cy="${-Math.round(H * 0.47)}" r="10" fill="#9fdcff" opacity=".34" class="tw-glow"/>`
    + LWA.plate(Math.round(H * 0.42) + 12, 'Turnul' + (b ? ' · record ' + b : ''), false, true, 14, null) + '</g>';
}
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.tw-lg{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 4px}.tw-lgi{position:relative;width:46px;height:46px;border-radius:8px;overflow:hidden;border:1px solid #ffffff22;background:#0b0e10;cursor:help}.tw-lgi img{width:100%;height:100%;object-fit:cover;filter:grayscale(1) brightness(.35)}.tw-lgi b{position:absolute;right:2px;bottom:1px;font:700 11px Cinzel,serif;color:#fff;text-shadow:0 1px 2px #000}.tw-lgi.on{border-color:#f0d27a;box-shadow:0 0 8px #f0d27a66}.tw-lgi.on img{filter:none}.tw-lgn{font-size:13px;margin-bottom:4px}
.tw-c{display:grid;grid-template-columns:96px 1fr;gap:16px;align-items:start}.tw-img img{width:96px;height:auto;filter:drop-shadow(0 6px 10px #000a)}
.tw-st{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}.tw-st span{border:1px solid var(--line);border-radius:8px;padding:6px 8px;font-size:12px;color:var(--mute);background:#0e1214}.tw-st b{display:block;font-size:15px;color:var(--gold2)}
@media (max-width:600px){.tw-c{grid-template-columns:64px 1fr}.tw-img img{width:64px}.tw-st{grid-template-columns:repeat(2,minmax(0,1fr))}}
.tw-glow{animation:twg 2.4s ease-in-out infinite}@keyframes twg{50%{opacity:.15}}@media (prefers-reduced-motion:reduce){.tw-glow{animation:none}}`;
  st.textContent += `
.tw-progress{border:1px solid var(--line);background:#13191d;border-radius:9px;padding:9px;margin:10px 0}
.tw-progress-info{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.tw-progress-info span{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--mute)}
.tw-progress-info b{font-size:12px;color:var(--gold2)}
.tw-progress-meter{height:5px;border-radius:4px;background:#4b463c;margin-top:8px;overflow:hidden}
.tw-progress-meter i{display:block;height:100%;background:linear-gradient(90deg,#987143,#e9c673)}
.tw-faststart{display:flex;flex-direction:column;gap:5px;margin:9px 0}
.tw-faststart label{font-size:13px;color:var(--gold2);font-weight:700}
.tw-faststart select{max-width:100%;min-height:38px}
.tw-faststart small{font-size:12px;line-height:1.4;color:var(--mute)}
@media(max-width:500px){.tw-progress-info{grid-template-columns:1fr}.tw-progress{padding:7px}}
`;
  document.head.appendChild(st);
})();
