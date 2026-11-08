/* ============================================================================
   Silver Throne — piata.js
   Piața, Negustorul și Bazarul sunt acum o singură clădire în Sat („Piață”), cu trei file:
     Piață    (de la nivelul 1)   — marfa obișnuită (vP din index.html)
     Negustor (de la TP.mkt.luxMinLv = 10) — obiecte de calitate și schimbul de cristale (vLux din teritorii.js)
     Bazar    (de la BZ_MIN = 15) — schimb cu alți jucători (vBazar din bazar.js)
   Fila curentă: S.pt ('p' | 'l' | 'y'). Mini-ghidurile văzute: S.ptg = { p, l, y }.
   Când se deschide o filă:
     1) în Sat, eticheta Pieței se aprinde („Negustor nou!”), iar fila are semnul „NOU”;
     2) apare un „Sfat nou” (ghid.js) care te duce acolo;
     3) prima dată când intri în filă, sus apare mini-ghidul ei (3 pași); îl redeschizi oricând cu „?”.
   Linkurile vechi către 'l' (Negustor) și 'y' (Bazar) duc la fila potrivită din Piață.
   ========================================================================== */
const PT_TABS = [
  { k: 'p', n: 'Piață', na: 'Piața', ic: '⚖', lv: () => 1 },
  { k: 'l', n: 'Negustor', na: 'Negustorul', ic: '💎', lv: () => (typeof TP !== 'undefined' && TP.mkt && TP.mkt.luxMinLv) || 10 },
  { k: 'y', n: 'Bazar', na: 'Bazarul', ic: '🤝', lv: () => (typeof BZ_MIN !== 'undefined' ? BZ_MIN : 15) }
];
const PT_GUIDE = {
  p: { t: 'Piața', d: 'echipament obișnuit, pentru orice nivel', s: [
    ['🛒', 'Cumperi', 'arme, armuri, coifuri, cizme și bijuterii, plătite cu aur. Obiectele sunt de nivelul tău.'],
    ['⏳', 'Marfa se schimbă', 'singură la 20 de minute. Dacă nu-ți place ce vezi, „Marfă nouă” o schimbă imediat contra aur.'],
    ['💰', 'Vinzi', 'obiectele de care nu mai ai nevoie din rucsac, în Echipă. Mai târziu, la Negustor și în Bazar, găsești marfă mai bună.']] },
  l: { t: 'Negustorul', d: 'obiecte de calitate și cristale', s: [
    ['💎', 'Obiecte de calitate', 'mai puternice decât cele din Piață, plătite doar cu aur. Marfa e nouă în fiecare zi; prețul crește mult cu calitatea.'],
    ['🔁', 'Marfă nouă', 'poți cere de mai multe ori pe zi, dar fiecare schimb costă mai mult decât cel dinainte.'],
    ['🔮', 'Schimb de cristale', 'cumperi cristale pentru afixe cu aur, cu limită zilnică. Temnițele și raidurile rămân drumul mai ieftin.']] },
  y: { t: 'Bazarul', d: 'cumperi și vinzi cu alți jucători', s: [
    ['🔎', 'Cumpără', 'caută după tip, raritate și nivel. Ofertele sunt de la cea mai ieftină; obiectul cumpărat intră singur în rucsac.'],
    ['🏷', 'Vinde', 'alegi un obiect din rucsac și prețul. Plătești 2% taxă la listare, iar la vânzare se rețin 5%. Oferta stă 48 de ore.'],
    ['📬', 'Ofertele mele', 'vezi ce s-a vândut și retragi ce nu mai vrei să vinzi. Aurul din vânzări îți intră singur. Legendarele nu se vând.']] }
};
/* Pasul 30 · BETA: un singur rând explică rolul fiecărui comerciant.
   Ghidul detaliat rămâne opțional, fără o a doua confirmare obligatorie. */
const PT_ROLE={
 p:{short:'Cumperi cu aur',description:'Echipament obișnuit, mereu disponibil. Marfa se reînnoiește automat.'},
 l:{short:'Obiecte rare și cristale',description:'Echipament de calitate și schimb de cristale, disponibile de la nivelul 10.'},
 y:{short:'Schimb între jucători',description:'Cumperi și listezi obiecte de la nivelul 15. Taxele sunt afișate înainte de vânzare.'}
};
function ptFocus(){
 return typeof jeFocus==='function'&&jeFocus();
}
function ptQuickGuide(k,locked){
 const g=PT_GUIDE[k],r=PT_ROLE[k],lv=PT_TABS.find(x=>x.k===k).lv();
 if(locked)return '<section class="pt-quick pt-quick-locked"><b>🔒 '+g.t+
   ' se deschide la nivelul '+lv+'.</b><p>'+r.description+
   '</p><div class="mute">Nivelul tău: '+(S.lvl||1)+' / '+lv+'</div></section>';
 return '<section class="pt-quick" aria-label="Rolul '+g.t+'">'+
  '<div class="pt-quick-title"><b>'+g.t+' — '+r.short+'</b><span>'+r.description+'</span></div>'+
  '<details class="pt-quick-details"><summary>ℹ Mai multe despre '+g.t+'</summary>'+
  '<ul>'+g.s.map(([ic,title,description])=>'<li><span>'+ic+'</span><div><b>'+
    title+'</b><p>'+description+'</p></div></li>').join('')+'</ul></details></section>';
}
const ptOpen = k => (S.lvl || 1) >= PT_TABS.find(x => x.k === k).lv();
const ptG = () => S.ptg || (S.ptg = {});
/* fila e deschisă, dar n-ai intrat încă în ea */
const ptNew = k => k !== 'p' && ptOpen(k) && !ptG()[k] && !ptG()[k + 'v'];

function ptTab(k) { S.pt = k; S.vil = 'p'; S.msg = ''; if (ptOpen(k)) ptG()[k + 'v'] = 1; go(); }
function ptGuideOk(k) { ptG()[k] = 1; ptG()[k + 'v'] = 1; save(); go(); }
function ptGuideShow(k) { ptG()[k] = 0; go(); }

function ptGuide(k, locked) {
  const g = PT_GUIDE[k], lv = PT_TABS.find(x => x.k === k).lv();
  const steps = g.s.map(([ic, h, d], i) => `<li style="--i:${i}"><span class="pt-gi">${ic}</span><div><b>${h}</b><span>${d}</span></div></li>`).join('');
  return `<section class="pt-g${locked ? ' lock' : ''}" aria-label="Mini-ghid: ${g.t}">`
    + `<div class="pt-gh"><span class="pt-gb">${locked ? '🔒 de la nivelul ' + lv : k === 'p' ? 'Mini-ghid' : 'Deblocat la nivelul ' + lv}</span><h2>${g.t}</h2><span class="mute">${g.d}</span></div>`
    + `<ol class="pt-gs">${steps}</ol>`
    + (locked ? `<div class="pt-gl"><div class="pt-gp"><i style="width:${Math.min(100, Math.round(100 * (S.lvl || 1) / lv))}%"></i></div><span class="mute">Nivelul tău: ${S.lvl || 1} / ${lv}</span></div>`
      : `<div class="gh-a"><button class="p" onclick="ptGuideOk('${k}')">Am înțeles</button></div>`)
    + '</section>';
}

function vPiata() {
  let k = S.pt && PT_TABS.some(x => x.k === S.pt) ? S.pt : 'p';
  S.pt = k; const open = ptOpen(k);
  if (open && k !== 'p') ptG()[k + 'v'] = 1;
  const tabs = `<div class="tm-tabs pt-tabs" role="tablist">${PT_TABS.map(t => {
    const on = t.k === k, op = ptOpen(t.k), nw = ptNew(t.k);
    return `<button role="tab" data-pt="${t.k}" aria-selected="${on}" class="${on ? 'on' : ''}${op ? '' : ' lk'}" onclick="ptTab('${t.k}')"><span class="pt-ti">${op ? t.ic : '🔒'}</span><span class="pt-tabtext">${t.n}${ptFocus() ? `<small class="pt-rolesub">${PT_ROLE[t.k].short}</small>` : ''}</span>${nw ? ' <b class="pt-new">NOU</b>' : !op ? ` <small>niv. ${t.lv()}</small>` : t.k === 'y' && typeof BZ !== 'undefined' && BZ.inbox ? ` <b class="bz-dot">${BZ.inbox}</b>` : ''}</button>`;
  }).join('')}</div>`;
  if (!open) return tabs + (ptFocus() ? ptQuickGuide(k,true) : ptGuide(k, true));
  const guide = ptFocus() ? ptQuickGuide(k,false) : (!ptG()[k] ? ptGuide(k, false) : `<div class="pt-help"><button class="gh-l" onclick="ptGuideShow('${k}')" aria-label="Arată mini-ghidul">? Cum funcționează ${PT_GUIDE[k].t.replace(/^\w/, c => c.toLowerCase())}</button></div>`);
  const body = k === 'p' ? vP() : k === 'l' ? vLux() : (typeof vBazar === 'function' ? vBazar() : '<p class="mute">Bazarul nu e încărcat.</p>');
  return tabs + guide + body;
}

/* ------------------------------------------------------------------ LEGAREA ÎN SAT */
function ptHook() {
  if (typeof VL === 'undefined' || typeof SAT_B === 'undefined') return;
  /* o singură clădire: Negustorul iese din listă și de pe imaginea satului */
  for (let i = SAT_B.length - 1; i >= 0; i--) if (SAT_B[i][0] === 'l' || SAT_B[i][0] === 'y') SAT_B.splice(i, 1);
  const pb = SAT_B.find(x => x[0] === 'p'); if (pb) pb[2] = 'piață, negustor, bazar';
  if (typeof SAT_Z !== 'undefined') delete SAT_Z.l;
  if (!VL.some(x => x[0] === 'y')) VL.push(['y', 'Bazar']);
  if (typeof TEMA_G !== 'undefined') TEMA_G.forEach(g => { g[2] = g[2].filter(x => x !== 'l' && x !== 'y'); });

  if (typeof vV === 'function' && !vV.__pt) {
    const f = vV;
    window.vV = function () {
      if (S.vil === 'l' || S.vil === 'y') { S.pt = S.vil; S.vil = 'p'; }   /* linkuri vechi */
      return S.vil === 'p' ? vBar('p') + vPiata() : f.apply(this, arguments);
    };
    window.vV.__pt = 1;
  }
  if (typeof vil === 'function' && !vil.__pt) {
    const f = vil;
    window.vil = function (k) { if (k === 'l' || k === 'y') { S.pt = k; k = 'p'; } return f(k); };
    window.vil.__pt = 1;
  }
  if (typeof satStatus === 'function' && !satStatus.__pt) {
    const f = satStatus;
    window.satStatus = function (k) {
      if (k !== 'p') return f(k);
      const nw = PT_TABS.filter(t => ptNew(t.k));
      if (nw.length) return [`${nw.map(t => t.na).join(' și ')} ${nw.length > 1 ? 's-au deschis' : 's-a deschis'}!`, 1];
      if (typeof BZ !== 'undefined' && BZ.inbox && ptOpen('y')) return [`Bazar: ${BZ.inbox} de ridicat`, 1];
      const nx = PT_TABS.find(t => !ptOpen(t.k));
      const [st, hot] = f(k);
      return [nx ? `${st} · ${nx.n} la niv. ${nx.lv()}` : st, hot];
    };
    window.satStatus.__pt = 1;
  }
  /* sfaturile din ghid: câte unul când se deschide Negustorul și Bazarul */
  if (typeof ghHints === 'function' && !ghHints.__pt) {
    const f = ghHints;
    window.ghHints = function () {
      const L = f();
      PT_TABS.filter(t => t.k !== 'p').forEach(t => L.push({
        k: 'pt_' + t.k, when: () => ptOpen(t.k), p: { t: 'a', v: 'p' },
        done: () => !!ptG()[t.k + 'v'], k2: () => ghQ(`#v .pt-tabs button[data-pt="${t.k}"]`),
        t: `S-a deschis ${t.na}`,
        d: `Ai ajuns la nivelul ${t.lv()}. În <b>Sat › Piață</b> s-a deschis fila <b>${t.n}</b>: ${PT_GUIDE[t.k].d}. Intră în ea: prima dată îți arată un mini-ghid.`
      }));
      return L;
    };
    window.ghHints.__pt = 1;
  }
  /* ghidul spune „Sat › Piață”, nu „Negustor” */
  try { const i = VL.findIndex(x => x[0] === 'l'); if (i >= 0) VL[i][1] = 'Piață › Negustor'; const j = VL.findIndex(x => x[0] === 'y'); if (j >= 0) VL[j][1] = 'Piață › Bazar'; } catch (e) { /* ignorat */ }
  try { if (typeof go === 'function' && typeof S !== 'undefined' && S && S.fs) go(); } catch (e) { /* jocul încă pornește */ }
}
if (typeof window !== 'undefined') { if (document.readyState === 'complete') ptHook(); else window.addEventListener('load', ptHook); }

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `.pt-tabs button{display:inline-flex;align-items:center;gap:6px;font-size:15px;padding:9px 16px}
.pt-tabtext{display:flex;flex-direction:column;align-items:flex-start;gap:2px;line-height:1.15}
.pt-tabs button .pt-rolesub{font:500 10px system-ui,sans-serif;color:var(--mute);white-space:nowrap}
.pt-quick{padding:9px 12px;margin:0 0 10px;border:1px solid var(--line);border-radius:9px;background:#ffffff05}
.pt-quick-title{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 12px;font-size:13px}
.pt-quick-title b{color:var(--gold2)}.pt-quick-title span{color:var(--mute)}
.pt-quick-details{margin-top:5px}.pt-quick-details summary{cursor:pointer;color:var(--gold2);font-size:12px;padding:5px 0}
.pt-quick-details ul{list-style:none;margin:5px 0 0;padding:0;display:grid;gap:6px}
.pt-quick-details li{display:flex;gap:8px;padding:5px 0;border-top:1px solid var(--line)}
.pt-quick-details li>span{flex:none}.pt-quick-details li b{font-size:12px}
.pt-quick-details li p{margin:2px 0 0;color:var(--mute);font-size:12px;line-height:1.4}
.pt-quick-locked p{margin:6px 0;font-size:12px;color:var(--mute)}
@media(max-width:530px){.pt-tabs button{gap:4px;padding:7px 8px;font-size:12px}.pt-tabs button .pt-rolesub{font-size:9px;white-space:normal;line-height:1.15}.pt-ti{font-size:15px}.pt-quick-title{flex-direction:column;gap:3px}}
.pt-tabs button.lk{opacity:.6}.pt-tabs button small{font:600 11px system-ui,sans-serif;color:var(--mute)}
.pt-ti{font-size:16px;line-height:1}
.pt-new{font:800 10px system-ui,sans-serif;letter-spacing:.06em;color:#1a1204;background:linear-gradient(180deg,#fff1b8,#e0b84a);border-radius:9px;padding:2px 6px;box-shadow:0 0 10px #f0d27a99;animation:ptPulse 1.6s ease-in-out infinite}
@keyframes ptPulse{50%{box-shadow:0 0 2px #f0d27a33}}
.pt-g{border-left-color:var(--gold2);background:radial-gradient(120% 140% at 0 0,#3a2e1255,transparent 60%),linear-gradient(180deg,#1d2427,#141a1c);animation:ptIn .45s ease-out both}
.pt-g.lock{border-left-color:#6a6250;filter:saturate(.7)}
.pt-gh{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin-bottom:8px}.pt-gh h2{margin:0;padding:0;border:0}
.pt-gb{flex-basis:100%;font:800 11px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--gold2)}
.pt-g.lock .pt-gb{color:var(--mute)}
.pt-gs{list-style:none;margin:0 0 10px;padding:0;display:grid;gap:8px}
.pt-gs li{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;border:1px solid #4e422466;border-radius:8px;background:#0b0e1066;animation:ptIn .4s ease-out both;animation-delay:calc(.12s + var(--i) * .12s)}
.pt-gs li b{display:block;color:var(--gold2);margin-bottom:2px}.pt-gs li span{color:var(--ink)}
.pt-gi{flex:0 0 30px;height:30px;display:grid;place-items:center;border-radius:50%;background:#241c0b;box-shadow:inset 0 0 0 1px #f0d27a55;font-size:16px}
.pt-gl{display:flex;align-items:center;gap:10px}.pt-gp{flex:1;height:6px;background:#000;border:1px solid var(--line);border-radius:3px;overflow:hidden}.pt-gp i{display:block;height:100%;background:linear-gradient(90deg,#b8860b,var(--gold2))}
.pt-help{display:flex;justify-content:flex-end;margin:-4px 0 8px}.pt-help .gh-l{width:auto}
@keyframes ptIn{from{opacity:0;transform:translateY(6px)}}
@media (prefers-reduced-motion:reduce){.pt-g,.pt-gs li,.pt-new{animation:none}}
@media (min-width:760px){.pt-gs{grid-template-columns:repeat(3,1fr)}.pt-gs li{flex-direction:column}}`;
  document.head.appendChild(st);
})();
