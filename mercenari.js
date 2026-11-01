/* ============================================================================
   Silver Throne — mercenari.js
   Mercenarii permanenți: câte unul din fiecare clasă (Războinic, Arcaș, Paznic, Mag, Vraci), primiți pe
   parcursul ghidului și numiți de jucător. Nu se mai angajează și nu se concediază; rangul crește prin faimă,
   ca înainte. Statisticile lor vin din erou (formulele sunt în index.html: MP, RF, mhp, atkOf, bon).
   Tot aici: paginile satului Han, Infirmerie, Antrenament, Steag și rândul de îmbunătățire al fiecărei clădiri.
   Se încarcă după ghid.js și înaintea scriptului din pagină.
   ========================================================================== */
const MR = {
  /* ordinea și pasul din ghid la care se alătură fiecare */
  order: [['Paznic', null], ['Arcaș', null], ['Războinic', 'Hanul'], ['Vraci', 'Misiunile zilnice'], ['Mag', 'Jefuiește un sat']],
  rol: { 'Războinic': 'luptător echilibrat, lovește greu și poate ameți', 'Arcaș': 'atac mare de la distanță, provoacă sângerare', 'Paznic': 'atrage loviturile și apără echipa', 'Mag': 'cel mai mare atac, ignoră apărarea', 'Vraci': 'vindecă echipa în luptă' },
  sug: { 'Războinic': ['Radu', 'Bogdan', 'Mircea'], 'Arcaș': ['Ilinca', 'Lia', 'Anca'], 'Paznic': ['Toma', 'Petru', 'Costea'], 'Mag': ['Ioana', 'Dana', 'Sorin'], 'Vraci': ['Matei', 'Vlad', 'Dragoș'] }
};
const mrAll = () => [...S.fs, ...S.rs];
const mrHas = c => mrAll().some(f => !f.h && f.c === c);
const mrStep = t => (typeof GHID !== 'undefined' ? GHID.findIndex(s => s.t === t) : -1);
function mrDue(step) {
  if (step == null) return true;
  if (S.tu == null || S.tu < 0 || (GHID[S.tu] && GHID[S.tu].e)) return true;   /* ghid terminat sau sărit: toți */
  const i = mrStep(step); return i < 0 || S.tu >= i;
}
function mrNew(c) {
  const f = { n: c, c, hp: 0, sc: 0, t: [], rk: 0, fm: 0, nn: 1, eq: { w: null, a: null } };
  f.hp = mhp(f); (S.fs.length < 3 && !S.d ? S.fs : S.rs).push(f); return f;
}
/* la fiecare desenare: se alătură cine a ajuns la pasul lui */
function mrTick() { if (!S || S.mrv !== 2) return; for (const [c, st] of MR.order) if (!mrHas(c) && mrDue(st)) mrNew(c); }

/* jucătorii existenți: pentru fiecare clasă rămâne mercenarul cu cea mai multă faimă; echipamentul celorlalți intră în rucsac */
function mrMig() {
  if (!S || S.mrv === 2) return;
  const keep = {}, out = [];
  for (const f of mrAll()) {
    if (f.h || !MP[f.c]) continue;
    const k = keep[f.c];
    if (!k || (f.fm || 0) > (k.fm || 0) || ((f.fm || 0) === (k.fm || 0) && (f.rk || 0) > (k.rk || 0))) { if (k) out.push(k); keep[f.c] = f; } else out.push(f);
  }
  for (const f of out) { const e = f.eq || {}; for (const s in e) if (e[s]) S.inv.push(e[s]); }
  const hero = mrAll().find(f => f.h), kept = Object.values(keep).map(f => { delete f.lv; return f; });
  S.fs = [hero, ...kept.slice(0, 2)].filter(Boolean); S.rs = kept.slice(2);
  S.fs.concat(S.rs).forEach(f => { f.hp = Math.min(f.hp, mhp(f)); });
  if (out.length) S.msg = (S.msg ? S.msg + ' ' : '') + `Mercenarii sunt acum permanenți: a rămas cel mai faimos din fiecare clasă${out.some(f => Object.values(f.eq || {}).some(Boolean)) ? ', iar echipamentul celorlalți e în rucsac' : ''}.`;
  S.mrv = 2;   /* semnul trecerii la mercenarii permanenți (S.mv e satul selectat pe hartă) */
}

/* ------------------------------------------------------------------ NUMIREA */
function mrName() {
  const f = mrAll().find(x => x.nn), inp = document.getElementById('mr-in');
  if (!f || !inp) return;
  const v = inp.value.trim().replace(/\s+/g, ' ').slice(0, 16);
  if (!v) { inp.focus(); inp.classList.add('err'); return; }
  f.n = v; delete f.nn; S.msg = `${v} (${f.c}) s-a alăturat ${S.fs.includes(f) ? 'echipei' : 'rezervei'}.`;
  document.getElementById('mr-m')?.remove(); go();
}
function mrPost() {
  try {
    mrTick();
    const f = mrAll().find(x => x.nn), old = document.getElementById('mr-m');
    const gate = document.getElementById('gate'), busy = (gate && !gate.classList.contains('g-out')) || document.querySelector('.hc');
    if (!f || busy) { if (old && !f) old.remove(); if (f && busy && !MR.wait) { MR.wait = 1; setTimeout(() => { MR.wait = 0; mrPost(); }, 500); } return; }   /* ecranul eroului e încă deschis: încearcă din nou */
    if (old && old.dataset.c === f.c) return;
    if (old) old.remove();
    const used = new Set(mrAll().map(x => x.n)), sg = MR.sug[f.c].find(n => !used.has(n)) || MR.sug[f.c][0];
    const sp = (typeof SP !== 'undefined' && SP.T[f.c] || []).map(s => s.n).join(' sau ');
    const m = document.createElement('div'); m.id = 'mr-m'; m.dataset.c = f.c; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'mr-t');
    m.innerHTML = `<div class="mr-c"><div class="mr-k">Un nou tovarăș</div><div class="mr-av">${av({ c: f.c, n: f.c }, 96)}</div><h3 id="mr-t">${f.c}</h3><p class="mute">${MR.rol[f.c]}.${sp ? ` De la rangul Veteran își alege o specializare: ${sp}.` : ''}</p>`
      + `<label for="mr-in">Cum se numește?</label><input id="mr-in" maxlength="16" value="${sg}" autocomplete="off" onkeydown="if(event.key==='Enter')mrName()">`
      + `<button class="p" onclick="mrName()">Primește-l în echipă</button><p class="mute mr-f">Mercenarii rămân cu tine pentru totdeauna și cresc în rang luptând.</p></div>`;
    document.body.appendChild(m); setTimeout(() => { const i = document.getElementById('mr-in'); if (i) { i.focus(); i.select(); } }, 60);
  } catch (e) { /* numirea nu blochează jocul */ }
}

/* ------------------------------------------------------------------ SCHIMBAREA NUMELUI (Cont › Nume)
   Numele se aleg la început (erou) și la deblocare (mercenari) și rămân fixe. Din Cont, fiecare personaj
   își poate schimba numele o dată gratuit (f.rnf = folosit); după aceea va costa monede (NM.cost, când apar). */
const NM = { cost: null };   /* prețul în monede; null = monedele nu există încă */
function nmPanel() {
  if (typeof S === 'undefined' || !S || !S.fs) return '';
  const rows = mrAll().filter(f => !f.nn).map((f, i) => {
    const k = mrAll().indexOf(f), free = !f.rnf, lbl = free ? 'Schimbă · gratuit' : NM.cost ? `Schimbă · ${NM.cost} monede` : 'Monede · în curând';
    return `<div class="nm-r"><span><b>${tEsc(f.n)}</b><small>${f.h ? 'erou' : f.c}</small></span><button type="button" onclick="nmOpen(${k})"${free || NM.cost ? '' : ' disabled title="A doua schimbare va costa monede, care vor apărea în curând."'}>${lbl}</button></div>`;
  }).join('');
  return `<div class="nm-p"><div class="nm-h">Nume</div><p class="nm-n">Prima schimbare e gratuită pentru fiecare personaj.</p>${rows}</div>`;
}
function nmOpen(k) {
  const f = mrAll()[k]; if (!f) return;
  document.getElementById('auth-panel')?.classList.add('auth-hidden');
  mdl(`<h3>Schimbă numele</h3><p class="mute">${f.h ? 'Eroul tău' : f.c} se numește acum <b>${tEsc(f.n)}</b>.${f.rnf ? '' : ' Prima schimbare e gratuită; următoarele vor costa monede.'}</p><input id="nm-in" maxlength="${f.h ? 14 : 16}" value="${tEsc(f.n)}" autocomplete="off" onkeydown="if(event.key==='Enter')nmSave(${k})" style="width:100%;box-sizing:border-box;padding:9px 11px;font-size:17px"><p class="g-msg" id="nm-msg" role="status"></p><button class="p" onclick="nmSave(${k})" style="width:100%">Salvează numele</button>`, 'nm-b');
  setTimeout(() => { const i = document.getElementById('nm-in'); if (i) { i.focus(); i.select(); } }, 50);
}
function nmSave(k) {
  const f = mrAll()[k], i = document.getElementById('nm-in'), m = document.getElementById('nm-msg'); if (!f || !i) return;
  const v = i.value.replace(/[<>"&]/g, '').replace(/\s+/g, ' ').trim().slice(0, f.h ? 14 : 16);
  const say = t => { if (m) { m.className = 'g-msg err'; m.textContent = t; } };
  if (v.length < 2) return say('Numele trebuie să aibă cel puțin 2 litere.');
  if (v === f.n) return lgClose();
  if (f.rnf && !NM.cost) return say('A doua schimbare va costa monede, care vor apărea în curând.');
  const old = f.n; f.n = v; f.rnf = 1; lgClose(); S.msg = `${old} se numește acum ${v}.`; go();
  if (typeof contChip === 'function') contChip();
  if (f.h && typeof lwSync === 'function' && typeof CONT !== 'undefined' && CONT.user) setTimeout(() => lwSync(true), 0);   /* ceilalți jucători văd noul nume */
}

/* ------------------------------------------------------------------ PAGINILE SATULUI */
/* rândul de îmbunătățire al unei clădiri (același ca la vechea Curte) */
function mrBld(k) {
  const b = BL(), n = (BN.find(x => x[0] === k) || [])[1] || k;
  return `<section class="mr-bl"><h2>Clădirea: ${n}</h2><div class="row"><span class="bl">${bth(k)}<span><b>${n}</b>, nivel ${b[k] || 0}<br><span class="mute">${bfx(k, b[k] || 0)}${(b[k] || 0) < bmax() ? ' → ' + bfx(k, (b[k] || 0) + 1) : ''}</span><br><span class="mute">${bAspTxt(k)} · nivel maxim acum: ${bmax()}</span></span></span><button class="p" onclick="build('${k}')"${(b[k] || 0) >= bmax() ? ' disabled' : ''}>${bcc(b[k] || 0)} aur</button></div></section>`;
}
function mrTrain() {
  const s = ST();
  return `<section><h2>Zona de antrenament</h2><div class="mute">Aurul antrenează eroul. Pricepere și Negoț ajută întreaga echipă, iar mercenarii își trag puterea din erou, deci tot ce câștigă el îi întărește și pe ei. Rang maxim la nivelul ${S.lvl}: ${smax()}.</div>${STS.map(([k, n, d]) => `<div class="row"><span><b>${n}</b>, rang ${s[k]}<br><span class="mute">${d}</span></span><button class="p" onclick="train('${k}')"${s[k] >= smax() ? ' disabled' : ''}>${stc(s[k])} aur</button></div>`).join('')}</section>`;
}
function mrInf() {
  const al = mrAll(), hurt = al.filter(f => f.hp > 0 && f.hp < mhp(f)), hc = Math.round(6 * S.lvl * Math.pow(.96, BL().i));
  const rows = al.map((f, i) => { const m = mhp(f), d = f.hp <= 0; return `<div class="row"><span style="display:flex;gap:10px;align-items:center">${av(f, 36)}<span><b>${tEsc(f.n)}</b> <span class="mute">${f.h ? 'erou' : f.c}</span><br>${bar(Math.max(0, f.hp), m, d ? 'e' : '')}<span class="mute">${d ? 'căzut' : f.hp + '/' + m + ' viață'}${f.sc ? ` · ${f.sc} ${f.sc === 1 ? 'cicatrice' : 'cicatrici'}` : ''}</span></span></span>${d && !S.d ? `<button class="d" onclick="revive(${S.fs.includes(f) ? S.fs.indexOf(f) : S.rs.indexOf(f)},${S.fs.includes(f) ? 0 : 1})">Ridică · ${revCost()} aur</button>` : ''}</div>`; }).join('');
  return `<section><h2>Infirmeria</h2><div class="mute">Răniții se vindecă toți deodată. Căzuții revin la jumătate din viață, cu o cicatrice (−3 viață maximă).</div><div class="mr-act">${S.d ? '<span class="r4">Ești într-o temniță: Infirmeria te așteaptă după ce ieși.</span>' : ''}${hurt.length && !S.d ? `<button class="p" onclick="heal()">Vindecă răniții (${hurt.length}) · ${hc} aur</button>` : ''}${reviveAllBtn()}${!hurt.length && !deadAll().length ? '<span class="mute">Toți sunt sănătoși.</span>' : ''}</div>${rows}</section>` + mrBld('i');
}
function mrHan() {
  const fm = f => Math.floor(f.fm || 0), nx = f => (f.rk || 0) < 4 ? SP.RKF[(f.rk || 0) + 1] : null;
  const cards = MR.order.map(([c, st]) => {
    const f = mrAll().find(x => !x.h && x.c === c);
    if (!f) return `<div class="mr-hc lock"><div class="mr-hp">${av({ c, n: c }, 56)}<b>🔒</b></div><div><b>${c}</b><div class="mute">${MR.rol[c]}</div><div class="mute">Se alătură la pasul „${st}” din ghid.</div></div></div>`;
    const i = S.fs.indexOf(f), j = S.rs.indexOf(f), n = nx(f), p0 = SP.RKF[f.rk || 0] || 0, pc = n ? Math.min(100, Math.round((fm(f) - p0) / (n - p0) * 100)) : 100;
    const spn = f.sp && typeof spDef0 === 'function' && spDef0(f) ? spDef0(f).n : (f.rk ? 'alege specializarea în Echipă' : 'specializare de la Veteran');
    return `<div class="mr-hc"><div class="mr-hp">${av(f, 56)}</div><div class="mr-hb"><b>${tEsc(f.n)}</b> <span class="mute">${f.c} · ${RK[f.rk || 0]}</span><div class="mute">${spn}</div>`
      + `<div class="mr-fm"><i style="width:${pc}%"></i></div><div class="mute">${n ? `faimă ${fm(f)}/${n} până la ${RK[(f.rk || 0) + 1]}` : 'rang maxim: Legendă'} · ${Math.round(mhp(f))} viață · ${Math.round(atkOf(f))} atac</div>${typeof mxRow === 'function' ? mxRow(f) : ''}</div>`
      + `<div class="mr-hx">${i >= 0 ? (f.h ? '' : `<button onclick="toBench(${i})">La rezervă</button>`) : (mxBusy(f) ? '<button disabled>Plecat</button>' : `<button class="p" onclick="toParty(${j})"${S.fs.length >= 3 ? ' disabled title="Echipa are deja 3 luptători"' : ''}>În echipă</button>`)}</div></div>`;
  }).join('');
  const bb = BL().b || 0;
  return `<section><h2>Hanul: mercenarii tăi</h2><div class="mute">Cinci tovarăși, câte unul din fiecare clasă, care rămân cu tine pentru totdeauna. Trei intră în luptă alături de erou; ceilalți așteaptă în rezervă. Puterea lor vine din erou: un Recrut are cam 85% din forța de bază a eroului în specialitatea lui, o Legendă cam 98%, dar nimeni nu trece de 95% din viața, atacul sau apărarea eroului. Faima: +1 la fiecare luptă câștigată, +3 la căpitani și raiduri${bb ? `, plus ${bb * 5}% de la Han` : ''}. Cei din rezervă pot pleca în <b>expediții</b> de 1, 4 sau 8 ore, din care se întorc cu aur, materiale și faimă.</div><div class="mr-list">${cards}</div></section>` + mrBld('b');
}
function mrFlag() { return `<section><h2>Steagul satului</h2><div class="mute">Culoarea steagurilor de pe clădiri, din capitală și de pe teritorii. Doar de aspect.</div></section>` + (typeof flagRow === 'function' ? flagRow() : ''); }
function mrRes() { return `<section><h2>La ce folosește fiecare resursă</h2><div class="mute"><b>Aur:</b> clădiri, antrenament, vindecare, taxe de cucerire și întreținerea teritoriilor.<br><b>Minereu:</b> baza oricărei forjări.<br><b>Materiale:</b> afixele obiectelor, plus consumabile la ruine și peșteri.<br><b>Cristale:</b> raritatea obiectelor forjate.<br><b>Puncte:</b> ritmul temnițelor, raidurilor, taberelor și locurilor de interes.</div></section>`; }

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `
#mr-m{position:fixed;inset:0;z-index:25000;display:flex;align-items:center;justify-content:center;padding:16px;background:#05070acc;backdrop-filter:blur(3px)}
.mr-c{width:min(420px,100%);padding:18px 20px 16px;text-align:center;border-radius:14px;border:1px solid var(--gold);background:radial-gradient(ellipse at 50% 0,#2a3236,#101416 70%);box-shadow:0 20px 60px #000e;animation:mrIn .35s ease-out}
.mr-k{font:700 12px Cinzel,serif;letter-spacing:.1em;text-transform:uppercase;color:var(--gold2)}
.mr-av{display:flex;justify-content:center;margin:10px 0 4px}.mr-av>*{border-radius:50%;box-shadow:0 0 0 2px var(--gold),0 0 24px #f0d27a44}
.mr-c h3{margin:4px 0 2px;font:700 22px Cinzel,Georgia,serif;color:var(--ink)}
.mr-c label{display:block;margin:12px 0 4px;text-align:left;font-weight:700}
.mr-c input{width:100%;box-sizing:border-box;padding:10px 12px;font-size:17px;border-radius:8px;border:1px solid var(--line);background:#0b0e10;color:var(--ink)}
.mr-c input.err{border-color:#d4564f}
.mr-c button{margin-top:12px;width:100%;padding:10px}
.mr-f{font-size:13px;margin:10px 0 0}
@keyframes mrIn{from{opacity:0;transform:translateY(10px) scale(.97)}to{opacity:1;transform:none}}
.mr-list{display:grid;gap:8px;margin-top:10px}
.mr-hc{display:flex;align-items:center;gap:12px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:linear-gradient(180deg,#181e21,#0e1214)}
.mr-hc.lock{opacity:.6}.mr-hp{position:relative;flex:none}.mr-hc.lock .mr-hp>:first-child{filter:grayscale(1) brightness(.5)}.mr-hp>b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:22px}
.mr-hb{flex:1;min-width:0}.mr-hx{flex:none}
.mr-fm{height:6px;margin:5px 0 3px;border-radius:3px;background:#ffffff14;overflow:hidden}.mr-fm i{display:block;height:100%;background:linear-gradient(90deg,#9b7424,#f0d27a)}
.nm-p{margin:10px 0 8px;padding-top:10px;border-top:1px solid #ffffff1a}.nm-h{font:700 13px Cinzel,serif;color:var(--gold2);letter-spacing:.06em}.nm-n{margin:2px 0 6px;font-size:12.5px;color:var(--mute)}
.nm-r{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:3px 0}.nm-r span{min-width:0}.nm-r b{display:block;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.nm-r small{color:var(--mute);font-size:12px}
#auth-panel .nm-r button{width:auto!important;margin:0!important;flex:none;padding:3px 9px;font-size:12px}
.mr-act{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0 6px}
@media (max-width:600px){.mr-hc{flex-wrap:wrap}.mr-hx{width:100%}.mr-hx button{width:100%}}
@media (prefers-reduced-motion:reduce){.mr-c{animation:none}}
`;
  document.head.appendChild(st);
})();

/* ============================================================================
   Expedițiile mercenarilor: cei din rezervă pleacă 1, 4 sau 8 ore și se întorc cu aur, materiale și faimă.
   S.mx[clasă] = { end, k } (un singur mercenar pe clasă, deci clasa e cheia). Cât e plecat nu intră în echipă.
   ========================================================================== */
const MX = { T: { s: ['Pază la mină', 1, 3, 0, 0], m: ['Escortă de caravană', 4, 8, 1, .05], l: ['Vânătoare în codri', 8, 15, 2, .2] } };   /* [nume, ore, faimă, materiale, șansă obiect] */
const mxOf = f => S.mx && S.mx[f.c], mxBusy = f => !!mxOf(f), mxDone = f => mxBusy(f) && Date.now() >= mxOf(f).end;
const mxReady = () => mrAll().filter(f => !f.h && mxDone(f)).length;
function mxSend(c, k) {
  const f = mrAll().find(x => !x.h && x.c === c), t = MX.T[k]; if (!f || !t) return;
  if (S.d) { S.msg = 'Termină întâi lupta.'; return go(); }
  if (!S.rs.includes(f)) { S.msg = 'Doar mercenarii din rezervă pot pleca în expediție.'; return go(); }
  if (mxBusy(f)) { S.msg = f.n + ' e deja plecat.'; return go(); }
  if (f.hp <= 0) { S.msg = f.n + ' e căzut: ridică-l întâi la Infirmerie.'; return go(); }
  (S.mx = S.mx || {})[c] = { end: Date.now() + t[1] * 3600e3, k }; cn('x');
  S.msg = `${f.n} a plecat: ${t[0].toLowerCase()} (${t[1]} ${t[1] === 1 ? 'oră' : 'ore'}).`; go();
}
function mxClaim(c) {
  const f = mrAll().find(x => !x.h && x.c === c); if (!f || !mxDone(f)) return;
  const t = MX.T[mxOf(f).k], L = S.lvl, g = Math.round((8 + 5 * L) * t[1] ** .85); S.gold += g;
  let m = `+${g} aur, +${t[2]} faimă`;
  if (t[3]) { const k = P(AFM.filter(x => (MLV[x] || 0) <= L)), n = t[3] + RI(0, 1); give(k, n); m += `, ${n} × ${MA[k]}`; }
  if (Math.random() < t[4]) { const it = mkItem(P(['w', 'a', 'h', 'b', 'j']), L, P([1, 1, 2, 2, 3])); S.inv.push(it); m += `, obiect: ${it.name}`; }
  f.fm = (f.fm || 0) + t[2]; let up = '';
  while ((f.rk || 0) < 4 && f.fm >= SP.RKF[(f.rk || 0) + 1]) { f.rk = (f.rk || 0) + 1; up = ` ${f.n} a urcat la rangul ${RK[f.rk]}!`; }
  delete S.mx[c]; S.msg = `${f.n} s-a întors din expediție: ${m}.${up}`; go();
}
function mxRow(f) {
  if (f.h || !S.rs.includes(f)) return '';
  if (mxDone(f)) return `<div class="mx-r"><span class="r4">S-a întors din expediție.</span><button class="p" onclick="mxClaim('${f.c}')">Primește prada</button></div>`;
  if (mxBusy(f)) { const o = mxOf(f); return `<div class="mx-r mute">În expediție: ${MX.T[o.k][0].toLowerCase()} · se întoarce în <span data-end="${o.end}">${fmt(o.end - Date.now())}</span></div>`; }
  return `<div class="mx-r"><span class="mute">Trimite în expediție:</span>${Object.entries(MX.T).map(([k, t]) => `<button onclick="mxSend('${f.c}','${k}')" title="${t[0]}: aur, +${t[2]} faimă${t[3] ? ', materiale' : ''}${t[4] ? ', șansă la obiect' : ''}">${t[1]} ${t[1] === 1 ? 'oră' : 'ore'}</button>`).join('')}</div>`;
}

/* ============================================================================
   Cufărul zilnic, cu serie de zile (7, apoi o ia de la capăt). S.dc = { day, streak }.
   ========================================================================== */
const DC = [['aur', '🪙'], ['minereu și materiale', '⛏'], ['+5 puncte', '⚡'], ['aur dublu', '🪙'], ['materiale rare', '💎'], ['+8 puncte', '⚡'], ['un obiect Rar sau Epic', '🎁']];
const dcYest = () => { const d = new Date(Date.now() - 864e5); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const dcReady = () => !S.dc || S.dc.day !== dk();
const dcNext = () => (!S.dc || S.dc.day !== dcYest() && S.dc.day !== dk()) ? 1 : S.dc.day === dk() ? S.dc.streak : S.dc.streak % 7 + 1;
function dcOpen() {
  if (!dcReady()) return;
  const n = dcNext(), L = S.lvl; let m = '';
  if (n === 1) { const g = 20 + 6 * L; S.gold += g; m = `+${g} aur`; }
  else if (n === 2) { const o = 8 + L, k = P(AFM.filter(x => (MLV[x] || 0) <= L)); S.ore += o; give(k, 2); m = `+${o} minereu, 2 × ${MA[k]}`; }
  else if (n === 3) { S.pts += 5; m = '+5 puncte'; }
  else if (n === 4) { const g = 2 * (20 + 6 * L); S.gold += g; m = `+${g} aur`; }
  else if (n === 5) { const k = P(AFM.filter(x => (MLV[x] || 0) <= L)); give(k, 4); m = `4 × ${MA[k]}`; }
  else if (n === 6) { S.pts += 8; m = '+8 puncte'; }
  else { const it = mkItem(P(['w', 'a', 'h', 'b', 'j', 'r']), L, Math.random() < .25 ? 3 : 2); S.inv.push(it); m = 'obiect: ' + it.name; }
  S.dc = { day: dk(), streak: n }; cn('k'); S.msg = `Cufărul zilei ${n}: ${m}.${n < 7 ? ' Revino mâine pentru ziua ' + (n + 1) + '.' : ' Ai încheiat seria de 7 zile!'}`; go();
}
function dcView() {
  const n = dcNext(), ready = dcReady();
  return `<section class="dc"><h2>Cufărul zilnic</h2><div class="mute">Un cufăr gratuit în fiecare zi. Dacă vii zile la rând, cufărul crește; dacă sari o zi, seria o ia de la capăt.</div><div class="dc-t">${DC.map(([t, i], k) => `<div class="dc-d${k + 1 < n || (!ready && k + 1 === n) ? ' ok' : ''}${ready && k + 1 === n ? ' now' : ''}"><b>Ziua ${k + 1}</b><span>${i}</span><small>${t}</small></div>`).join('')}</div>`
    + `<div class="row"><span>${ready ? `Azi: <b>ziua ${n}</b>` : 'Ai deschis cufărul de azi. Revino mâine.'}</span>${ready ? '<button class="p" onclick="dcOpen()">Deschide cufărul</button>' : ''}</div></section>`;
}
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.mx-r{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px;font-size:13.5px}.mx-r button{padding:3px 10px;font-size:13px}
.dc-t{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin:10px 0}.dc-d{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 4px;border:1px solid var(--line);border-radius:8px;text-align:center;background:#0e1214}
.dc-d b{font:700 12px Cinzel,serif;color:var(--mute)}.dc-d span{font-size:20px}.dc-d small{font-size:11px;color:var(--mute);line-height:1.2}
.dc-d.ok{opacity:.5}.dc-d.ok b::after{content:' ✓';color:#7fd88c}.dc-d.now{border-color:var(--gold2);box-shadow:0 0 0 1px var(--gold2),0 0 14px #f0d27a44}.dc-d.now b{color:var(--gold2)}
@media (max-width:600px){.dc-t{grid-template-columns:repeat(4,minmax(0,1fr))}}`;
  document.head.appendChild(st);
})();
