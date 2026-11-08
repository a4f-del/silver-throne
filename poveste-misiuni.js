/* Silver Throne — Jurnalul povestii, sprint 1 (BETA).
   Progres salvat in S.sq, separat de GHID, Misiunile zilnice si Campanie.
   Doar eroi cu introducerea narativa (S.mrStoryV=1) pot revendica.
   Preview pentru conturile BETA existente nu modifica salvarea. */
const SQ_ACT = [
  {id:'juramant',title:'Ultimul jurământ',at:'Poarta satului',icon:'🛡️',
   desc:'Paznicul ți-a promis că va apăra satul. Luați drumul Minei Cenușii și întoarceți-vă împreună din prima coborâre.',
   line:'„Un sat nu înseamnă ziduri. Înseamnă oamenii care rămân.”',
   task:'Numește Paznicul și întoarce-te din prima coborâre',reward:{g:20,o:0},target:'c'},
  {id:'cenusa',title:'Sub piatra arsă',at:'Mina Cenușie',icon:'⛏️',
   desc:'Pe drumul înapoi din mină ai întâlnit un Arcaș. Vorbește cu el, apoi fă prima armă în Topitorie pentru noua echipă.',
   line:'„Sub piatra arsă se ascunde primul răspuns.”',
   task:'Numește Arcașul și începe prima forjare',reward:{g:0,o:15},target:'a'},
  {id:'han',title:'Hanul celor rămași',at:'Hanul satului',icon:'⚔️',
   desc:'Vestea curajului tău a ajuns la Han. Antrenează-ți eroul, apoi primește-l și numește-l pe veteranul Războinic.',
   line:'„Nu urmăm o coroană. Urmăm pe cineva care ține sabia pentru ceilalți.”',
   task:'Fă un antrenament și recrutează Războinicul',reward:{g:35,o:5},target:'h'}
];
function sqEnabled() {
  return typeof S !== 'undefined' && !!S && S.mrStoryV === 1
    && S.mrPrologSeen === 1 && !S.mrPrologPending
    && S.journeyV !== 1; /* noul Drumul Eroului inlocuieste acest panou si recompensele */
}
/* In primele capitole, povestea este singura indrumare implicita.
   Ghidul vechi ramane disponibil la cerere, fara sa acopere povestea. */
function sqQuiet() { return sqEnabled(); }
function sqHelpToggle() { if (!sqQuiet()) return; S.sqHelp = S.sqHelp ? 0 : 1; go(); }
function sqHelpBar() {
  return sqQuiet() && S.sqHelp
    ? '<section class="sq-helpbar"><span>Ghidul jocului este afișat la cerere.</span><button onclick="sqHelpToggle()">Înapoi la poveste</button></section>'
    : '';
}
function sqClaimed() {
  return sqEnabled() && S.sq && Array.isArray(S.sq.claimed) ? S.sq.claimed : [];
}
function sqCurrent() { return SQ_ACT.find(q => !sqClaimed().includes(q.id)) || null; }
function sqProgress(q) {
  if (!q) return {n:0,total:1,ok:false};
  const roster = typeof mrAll === 'function' ? mrAll() : [...(S.fs || []), ...(S.rs || [])];
  const joined = c => roster.some(f => !f.h && f.c === c && !f.nn);
  const counter = k => typeof C === 'function' ? C(k) : ((S.cn || {})[k] || 0);
  if (q.id === 'juramant') {
    const n = (joined('Paznic') ? 1 : 0) + (counter('l') >= 1 ? 1 : 0);
    return {n,total:2,ok:n===2};
  }
  if (q.id === 'cenusa') {
    const n = (joined('Arcaș') ? 1 : 0) + (counter('f') >= 1 ? 1 : 0);
    return {n,total:2,ok:n===2};
  }
  if (q.id === 'han') {
    const n = (counter('t') >= 1 ? 1 : 0) + (joined('Războinic') ? 1 : 0);
    return {n,total:2,ok:n===2};
  }
  return {n:0,total:1,ok:false};
}
function sqGo() {
  if (!sqEnabled()) return;
  const q=sqCurrent(); if (!q) return;
  S.msg='';
  if (q.id==='juramant' && (typeof C==='function'?C('l'):0)<1
      && ((S.fs||[]).concat(S.rs||[])).some(f=>!f.h&&f.c==='Paznic'&&!f.nn)) S.tab='c';
  else {
    S.tab='a';
    S.vil=q.id==='cenusa'
      ? (((S.fs||[]).concat(S.rs||[])).some(f=>!f.h&&f.c==='Arcaș'&&!f.nn)?'a':'h')
      : q.id==='han' && (typeof C==='function'?C('t'):0)<1?'t':'h';
  }
  go();
}
function sqClaim(id) {
  if (!sqEnabled()) return;
  const q=sqCurrent();
  if (!q || q.id !== id || !sqProgress(q).ok || sqClaimed().includes(id)) return;
  S.sq = S.sq || {claimed:[]};
  if (!Array.isArray(S.sq.claimed)) S.sq.claimed=[];
  S.sq.claimed.push(id); /* marcați înainte de acordarea recompensei */
  S.gold = (S.gold || 0) + q.reward.g;
  S.ore = (S.ore || 0) + q.reward.o;
  S.msg='Misiunea de poveste „'+q.title+'” încheiată. Recompensa a fost primită.';
  go();
  sqRewardShow(q);
}
function sqRewardShow(q) {
  if (typeof document === 'undefined' || !document.body) return;
  document.getElementById('sq-reward')?.remove();
  const e=document.createElement('div');
  e.id='sq-reward'; e.setAttribute('role','status'); e.setAttribute('aria-live','polite');
  e.innerHTML='<span class="sqr-spark" aria-hidden="true">✦</span><div><small>JURĂMÂNT ÎMPLINIT</small><b>'+q.title+'</b><span>'
    +(q.reward.g?'+'+q.reward.g+' aur':'')+(q.reward.g && q.reward.o?' · ':'')
    +(q.reward.o?'+'+q.reward.o+' minereu':'')+'</span></div>';
  document.body.appendChild(e);
  if (typeof setTimeout === 'function') setTimeout(()=>{ if(e.parentNode)e.remove(); },3800);
}
function sqPanel() {
  if (!sqEnabled()) return '';
  if (S.sqHelp) return sqHelpBar();
  const q=sqCurrent(),completed=SQ_ACT.length-(SQ_ACT.filter(x=>!sqClaimed().includes(x.id)).length);
  if (!q) return S.sqCampaignOpened?'':'<section class="sq-panel sq-complete"><div class="sq-eyebrow">✦ CENUȘA ȘI JURĂMÂNTUL · I/III</div><h2>Primele jurăminte au fost împlinite</h2><p>Ai adunat primii tovarăși. Povestea continuă în Campanie, la Tronul Cenușiu.</p><button class="p" onclick="cmpOpenChecklist(\'story\')">Deschide Campania și obiectivele</button></section>';
  const p=sqProgress(q),reward=[q.reward.g?q.reward.g+' aur':'',q.reward.o?q.reward.o+' minereu':''].filter(Boolean).join(' + ');
  return `<section class="sq-panel ${p.ok?'sq-ready':''}" aria-label="Misiune activă de poveste">
    <div class="sq-embers" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="sq-eyebrow">✦ POVESTEA SATULUI · MISIUNEA ${completed+1}/${SQ_ACT.length}</div>
    <div class="sq-heading"><span class="sq-seal" aria-hidden="true">${q.icon}</span><div>
      <h2>${q.title}</h2><small>${q.at}</small></div></div>
    <div class="sq-objective"><span>${q.task}</span><b>${p.n}/${p.total}</b></div>
    <div class="sq-track"><i style="width:${Math.round(p.n/p.total*100)}%"></i></div>
    <details class="sq-details"><summary>📜 Citește povestea</summary><p class="sq-dialog">${q.line}</p><p class="sq-descr">${q.desc}</p></details>
    <div class="sq-bottom"><small>Recompensă: ${reward}</small>
      ${p.ok
        ? `<button class="p sq-claim" onclick="sqClaim('${q.id}')">✦ Revendică recompensa</button>`
        : `<button class="p sq-action" onclick="sqGo()">${q.id==='juramant'?'Continuă aventura':q.id==='cenusa'?'Continuă pregătirile':(typeof C==='function'&&C('t')<1?'Mergi la antrenament':'Mergi la Han')}</button>`}
    </div><button class="sq-guide-toggle" onclick="sqHelpToggle()">Ai nevoie de ghidul jocului?</button>
  </section>`;
}
/* Marker vizual pe tinta actuala, fara sa altereze butoane, salvarea sau alte event handlers. */
function sqDecorate() {
  if (typeof document==='undefined' || !document.documentElement) return;
  const active=sqEnabled();
  document.documentElement.classList.toggle('sq-active',!!active);
  const current=active && !S.sqHelp?sqCurrent():null;
  const has = c => ((S.fs||[]).concat(S.rs||[])).some(f=>!f.h&&f.c===c&&!f.nn);
  const dest=!current ? '' :
    current.id==='juramant' ? (!has('Paznic')?'h':'c') :
    current.id==='cenusa' ? (!has('Arcaș')?'h':'a') :
    current.id==='han' ? ((typeof C==='function'?C('t'):0)<1?'t':'h') : '';
  document.querySelectorAll('.sq-target').forEach(el=>el.classList.remove('sq-target'));
  if (!dest) return;
  if (dest==='c') {
    document.querySelectorAll('#nv button').forEach(el=>{
      const onclick=el.getAttribute('onclick')||'';
      if (onclick.includes("tab('c')") || onclick.includes("sdGo('c')")) el.classList.add('sq-target');
    });
  } else {
    document.querySelectorAll('.vh-lb[data-v],.vb-c[data-v]').forEach(el=>{
      if (el.getAttribute('data-v')===dest) el.classList.add('sq-target');
    });
  }
}
function sqPreview() {
  if (!S||S.d) return;
  if (typeof document==='undefined' || document.getElementById('sq-preview')
      || document.getElementById('mr-scene') || document.getElementById('mr-m')
      || document.getElementById('st-prolog') || document.getElementById('lgm')) return;
  const e=document.createElement('div');e.id='sq-preview';
  e.setAttribute('role','dialog');e.setAttribute('aria-modal','true');
  e.setAttribute('aria-label','Previzualizarea misiunilor de poveste');
  e.innerHTML=`<div class="sqp-card"><div class="sq-eyebrow">✦ BETA · PREVIZUALIZARE</div>
    <h2>Cenușa și Jurământul</h2>
    <p>Primele trei misiuni se leagă de mercenarii pe care îi întâlnești în aventură.</p>
    ${SQ_ACT.map((q,i)=>`<div class="sqp-item"><div><span class="sq-seal">${q.icon}</span><b>${i+1}. ${q.title}</b></div><p>${q.desc}</p><small>${q.task} · Recompensă: ${[q.reward.g?q.reward.g+' aur':'',q.reward.o?q.reward.o+' minereu':''].filter(Boolean).join(' + ')}</small></div>`).join('')}
    <button class="p" onclick="document.getElementById('sq-preview')?.remove()">Închide previzualizarea</button>
    <small class="sqp-hint">Previzualizarea nu modifică progresul sau resursele.</small></div>`;
  document.body.appendChild(e);
  e.querySelector('button')?.focus();
}
(function(){
 if(typeof document==='undefined'||!document.head)return;
 const s=document.createElement('style');
 s.textContent=`
.sq-panel{position:relative;overflow:hidden;isolation:isolate;border:1px solid #9c794a!important;border-radius:12px;background:linear-gradient(128deg,#30251bbb,#12191b 60%,#1b2426);box-shadow:0 4px 23px #0005;animation:sq-arrive .42s ease-out}
.sq-panel .sq-embers{pointer-events:none;position:absolute;inset:0;overflow:hidden;opacity:.7;z-index:-1}
.sq-embers i{position:absolute;bottom:-8px;width:3px;height:3px;border-radius:50%;background:#e0b86d;box-shadow:0 0 9px #f0d27a;animation:sq-ember 8s linear infinite}
.sq-embers i:nth-child(1){left:10%;animation-delay:-1s}.sq-embers i:nth-child(2){left:40%;animation-delay:-5s}
.sq-embers i:nth-child(3){left:73%;animation-delay:-3s}.sq-embers i:nth-child(4){left:90%;animation-delay:-7s}
.sq-eyebrow{font:700 11px Cinzel,serif;letter-spacing:.11em;color:var(--gold2);text-transform:uppercase}
.sq-heading{display:flex;align-items:center;gap:12px;margin:11px 0}
.sq-heading h2{margin:0;font:700 20px Cinzel,Georgia,serif;color:#f0d27a}
.sq-heading small{font-size:12px;color:var(--mute)}
.sq-seal{width:45px;height:45px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;border:1px solid #c5a86a;border-radius:50%;background:#373122;box-shadow:0 0 15px #e1af5b30;font-size:22px}
.sq-details{text-align:left;margin-top:10px;font-size:12px;color:var(--mute)}.sq-details summary{cursor:pointer;display:inline-block;text-decoration:underline;text-underline-offset:3px}.sq-details[open]{border-top:1px solid #ffffff17;padding-top:9px}.sq-dialog{margin:7px 0;font-size:14px;color:var(--gold2);font-style:italic;line-height:1.5}
.sq-descr{line-height:1.55;margin:8px 0;font-size:14px}
.sq-objective{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:13px 0 6px;font-size:13px}
.sq-objective b{white-space:nowrap;color:#f0d27a}
.sq-track{height:5px;background:#222a2d;border-radius:9px;overflow:hidden}
.sq-track>i{display:block;height:100%;background:linear-gradient(90deg,#90703e,#f0d27a);transition:width .5s ease}
.sq-bottom{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:9px;margin:12px 0 0}
.sq-bottom small{color:var(--mute)}
.sq-ready{border-color:#e3bd72!important;box-shadow:0 0 23px #e3bd7230}
.sq-active .vh-lb,.sq-active .vb-c{transition:filter .2s ease,transform .2s ease,box-shadow .2s ease}
.sq-active .vh-lb:hover,.sq-active .vb-c:hover{filter:brightness(1.15);transform:translateY(-2px)}
.sq-active .sq-target{outline:2px solid #f0d27a!important;outline-offset:3px;box-shadow:0 0 17px #f0d27a70!important;animation:sq-call 2.6s ease-in-out infinite}

.sq-claim{animation:sq-call 2.5s ease-in-out infinite}
.sq-guide-toggle{margin:11px auto 0;display:block;border:0;background:transparent;color:var(--mute);font-size:12px;box-shadow:none;text-decoration:underline}.sq-helpbar{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px}.sq-helpbar button{font-size:12px}.sq-complete h2{font-size:18px;color:#f0d27a}.sq-complete p{font-size:14px}
#sq-reward{position:fixed;left:50%;bottom:25px;transform:translateX(-50%);z-index:27000;max-width:calc(100vw - 32px);min-width:min(330px,calc(100vw - 32px));display:flex;align-items:center;gap:12px;padding:13px 18px;border:1px solid var(--gold);border-radius:12px;background:#172022f5;box-shadow:0 12px 36px #000a;animation:sq-win .6s cubic-bezier(.2,1.2,.3,1)}
#sq-reward .sqr-spark{font-size:38px;color:var(--gold2);text-shadow:0 0 15px #f0d27a}
#sq-reward small,#sq-reward b,#sq-reward div>span{display:block}
#sq-reward small{letter-spacing:.12em;color:var(--gold2);font-size:9px}#sq-reward b{color:#fff;font:700 16px Cinzel,serif}#sq-reward div>span{font-size:13px;color:var(--gold2)}
#sq-preview{position:fixed;inset:0;z-index:25030;display:flex;align-items:center;justify-content:center;padding:16px;background:#05070aeb}
.sqp-card{width:min(510px,100%);max-height:calc(100vh - 32px);overflow-y:auto;border:1px solid var(--gold);border-radius:13px;background:#131b1e;padding:20px;box-sizing:border-box;text-align:center}
.sqp-card h2{margin:9px 0;color:var(--gold2)}.sqp-card>p{font-size:14px}
.sqp-item{text-align:left;border:1px solid #66604466;border-radius:8px;padding:10px;margin:10px 0;background:#ffffff06}
.sqp-item>div{display:flex;align-items:center;gap:10px}.sqp-item .sq-seal{width:33px;height:33px;font-size:17px}
.sqp-item p{font-size:13px;margin:7px 0}.sqp-item small,.sqp-hint{display:block;font-size:12px;color:var(--mute)}
.sqp-card>button{margin:12px auto 3px}
@keyframes sq-arrive{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes sq-call{50%{box-shadow:0 0 14px #f0d27a70}}
@keyframes sq-ember{from{transform:translateY(0) translateX(0);opacity:0}20%{opacity:1}to{transform:translateY(-210px) translateX(18px);opacity:0}}
@keyframes sq-win{from{opacity:0;transform:translate(-50%,18px) scale(.9)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
@media(max-width:450px){.sq-heading h2{font-size:18px}.sq-bottom{flex-direction:column;align-items:stretch}.sq-bottom button{width:100%}.sqp-card{padding:14px}}
@media(prefers-reduced-motion:reduce){.sq-panel,.sq-claim,.sq-embers i,#sq-reward{animation:none!important}.sq-track>i{transition:none!important}.sq-active .sq-target{animation:none!important}}
`;
 document.head.appendChild(s);
})();
if(typeof module!=='undefined'&&module.exports)module.exports={SQ_ACT,sqEnabled,sqCurrent,sqProgress};
