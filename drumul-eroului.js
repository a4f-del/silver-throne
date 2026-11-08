/* Silver Throne · Drumul Eroului V1: un singur fir poveste + indrumare (BETA).
   Activ EXCLUSIV pentru eroii creati dupa lansarea sa (S.journeyV===1).
   Reutilizeaza contorii si actiunile din joc; nu intervine in progresul existent. */
const JE_STEPS = [
 {id:'poarta',title:'Cenușa de la poartă',icon:'🛡️',
  say:'„Nu lăsăm satul singur. Hai să aflăm ce se ascunde sub deal.” — Paznicul',
  help:'Primește-l pe Paznic, apoi intră în Mina Cenușie din Coborâre. Numele lui poate fi schimbat ulterior din Erou → Cont și profil. Învinge pe rând cei trei monștri și Căpitanul Cenușii. După victorie revii automat și primești prada. Dacă te retragi mai devreme, progresul în mină se păstrează, dar jurământul se încheie după căpitan.',
  reward:{g:50,o:15},parts:[['Paznicul s-a alăturat',()=>jeHas('Paznic')],['Ai învins primul căpitan',()=>jeCount('bs')>=1]],
  action:()=>!jeHas('Paznic')?['Han','a','h']:['Mina Cenușie','c','']},
 {id:'urme',title:'Urmele din cenușă',icon:'🏹',
  say:'„Nu ne putem apăra doar cu săgeți. Aprindeți forja!” — Arcașul',
  help:'La întoarcerea din mină, vizitează Satul pentru întâlnirea cu Arcașul. După ce se alătură, mergi la Topitorie: pentru următorul jurământ, forjează o armă (Tip: Armă, Sabie pentru Campion).',
  reward:{g:30,o:25},parts:[['Arcașul s-a alăturat',()=>jeHas('Arcaș')],['Ai făcut prima forjare',()=>jeCount('f')>=1]],
  action:()=>!jeHas('Arcaș')
   ? ((S.mrStorySeen||[]).includes('Arcaș') ? ['Han','a','h'] : ['Sat','a',''])
   : ['Topitorie','a','a']},
 {id:'otel',title:'Oțel pentru cei rămași',icon:'⚒️',
  say:'„O armă uitată în rucsac nu apără pe nimeni.” — Paznicul',
  help:'Ridică arma forjată din Topitorie, apoi deschide Echipă din bara din stânga. Deasupra echipamentului vei găsi un buton „Pune pe Erou” pentru o armă potrivită din rucsac. Dacă nu ai o armă, forjează o Sabie pentru Campion.',
  reward:{g:30,o:5},parts:[['Ai echipat prima armă',()=>jeCount('e')>=1]],
  action:()=>jeHasWeapon()?['Echipă','e','']:['Topitorie','a','a']},
 {id:'han',title:'Jurământul veteranului',icon:'⚔️',
  say:'„Am luptat pentru regi. Aș vrea să lupt pentru oameni.” — Războinicul',
  help:'Antrenează o dată eroul în Sat → Antrenament. Apoi mergi la Han, ascultă povestea Războinicului și primește-l în echipă. Îi poți schimba numele ulterior din Erou → Cont și profil.',
  reward:{g:135,o:5},parts:[['Ai antrenat eroul',()=>jeCount('t')>=1],['Războinicul are un nume',()=>jeHas('Războinic')]],
  action:()=>jeCount('t')<1?['Antrenament','a','t']:['Han','a','h']},
 {id:'vesti',title:'Vești din sat',icon:'📜',
  say:'„Dincolo de ziduri e război. Înăuntru, satul trebuie să învețe să trăiască.”',
  help:'Vizitează clădirea Misiuni și descoperă sarcinile zilnice. Nu e nevoie să le termini pe toate acum.',
  reward:{g:30,o:0},parts:[['Ai vizitat Misiunile',()=>S.tab==='a'&&S.vil==='x'||!!S.jeVisitedMissions]],
  action:()=>['Misiuni','a','x']},
 {id:'hotar',title:'Dincolo de palisadă',icon:'🧭',
  say:'„Regatul nu se reconstruiește doar din ce găsim sub pământ.”',
  help:'Deschide Hartă → Lumea și descoperă satele altor jucători, prietenii și Tronul. Nu trebuie să jefuiești niciun sat.',
  reward:{g:80,o:20},parts:[['Ai descoperit Lumea',()=>!!S.jeVisitedWorld||jeCount('r')>=1]],
  action:()=>['Hartă','m','l']}
];
function jeEnabled(){
 return typeof ST_SERVER!=='undefined'&&ST_SERVER==='beta'&&typeof S!=='undefined'
   &&!!S&&S.journeyV===1;
}
function jeReady(){return jeEnabled() && S.mrPrologSeen===1 && !S.mrPrologPending;}
/* Opt-in exclusiv eroi NOI dupa acest experiment; vechile conturi BETA/LIVE sunt neschimbate. */
function jeFocus(){return jeEnabled() && S.journeyUxV===2;}
function jeFocusActive(){return jeFocus() && !!jeCurrent();}
function jeCount(k){return typeof C==='function'?C(k):(S.cn||{})[k]||0;}
function jeHas(c){
 const a=typeof mrAll==='function'?mrAll():(S.fs||[]).concat(S.rs||[]);
 return a.some(f=>!f.h&&f.c===c&&!f.nn);
}
function jeHasWeapon(){
 return (S.inv||[]).some(x=>x.t==='w') ||
  (S.fs||[]).concat(S.rs||[]).some(f=>f.eq&&f.eq.w);
}
function jeState(){
 if(!S.je || !Array.isArray(S.je.done)) S.je={done:[]};
 return S.je;
}
function jeCurrent(){
 if(!jeReady())return null;
 const done=S.je&&Array.isArray(S.je.done)?S.je.done:[];
 return JE_STEPS.find(x=>!done.includes(x.id))||null;
}
function jeStatus(step){
 if(!step)return {n:0,total:0,ok:false};
 const n=step.parts.reduce((a,p)=>a+(p[1]()?1:0),0);
 return {n,total:step.parts.length,ok:n===step.parts.length};
}
function jeNavigate(){
 const s=jeCurrent();if(!s||S.d)return;
 const [,t,v]=s.action();S.tab=t;
 if(t==='a')S.vil=v;
 if(t==='m')S.mt=v;
 S.msg='';go();
}
function jeClaim(id){
 if(!jeReady()||S.d)return;
 const s=jeCurrent();
 if(!s||s.id!==id||!jeStatus(s).ok)return;
 const st=jeState();
 if(st.done.includes(id))return;
 st.done.push(id); /* marcam inainte de acordarea resurselor: idempotent */
 S.gold=(S.gold||0)+s.reward.g; S.ore=(S.ore||0)+s.reward.o;
 S.msg='';
 go();
 jeReward(s);
}
function jeReward(step){
 if(typeof document==='undefined'||!document.body)return;
 document.getElementById('je-toast')?.remove();
 const el=document.createElement('div');el.id='je-toast';
 el.setAttribute('role','status');
 el.innerHTML='<span aria-hidden="true">✦</span><div><b>'+step.title+'</b><small>+'
  +step.reward.g+' aur'+(step.reward.o?' · +'+step.reward.o+' minereu':'')
  +'</small></div>';
 document.body.appendChild(el);
 if(typeof setTimeout==='function')setTimeout(()=>el.remove(),3200);
}
/* După jurăminte: un singur reper pentru următoarea temniță.
   Fără obiective/monede noi; nu concurează cu cardul activ sau cu Campania. */
function jeNextDungeonTarget(){
 if(typeof DG==='undefined'||!Array.isArray(DG))return null;
 const all=DG.map((g,i)=>({g,i})).filter(x=>x.g&&!x.g.ev);
 if(!all.length)return null;
 const unlocked=all.filter(x=>S.lvl>=x.g.lv);
 const current=unlocked.length?unlocked[unlocked.length-1]:all[0];
 const target=current.i===all[0].i&&all.length>1?all[1]:current;
 return {target,current,ready:S.lvl>=target.g.lv};
}
function jeNextAdventurePanel(){
 if(!jeFocus()||!S.jeCampaignOpened||S.jeNextHintVisited||S.d||!['a','c'].includes(S.tab))return '';
 const next=jeNextDungeonTarget();if(!next)return '';
 const {target,current,ready}=next;
 const hero=(S.fs||[]).find(f=>f.h)||(S.fs||[])[0];
 const helper=(S.fs||[]).some(f=>f.hp<=0)
  ? 'Ridică luptătorii căzuți la Infirmerie.'
  : !(hero&&hero.eq&&hero.eq.w)
  ? 'Echipează o armă potrivită eroului.'
  : 'Întărește echipamentul și vindecă echipa înainte de căpitan.';
 const message=ready
  ? 'Temnița este disponibilă. Încearc-o când echipa este pregătită.'
  : 'Ai nevoie de încă '+Math.max(1,target.g.lv-S.lvl)+' '+(target.g.lv-S.lvl===1?'nivel':'niveluri')+
    '. Poți continua în '+current.g.n+' pentru experiență și pradă.';
 return '<section class="je-card je-after" aria-label="Următoarea aventură">'
  +'<div class="je-caption">✦ URMĂTOAREA AVENTURĂ</div>'
  +'<div class="je-title"><span>🗝️</span><h2>'+target.g.n+'</h2></div>'
  +'<p class="je-next-note"><b>Nivel necesar: '+target.g.lv+'</b> · Nivelul tău: '+S.lvl+'</p>'
  +'<p class="je-next-note">'+message+'</p>'
  +'<p class="je-next-note">'+helper+'</p>'
  +'<button class="p" onclick="jeGoNextAdventure()">'+
    (ready?'Deschide Coborâre':'Continuă în Coborâre')+'</button></section>';
}
function jeGoNextAdventure(){
 if(!jeFocus()||S.d||jeCurrent())return;
 S.jeNextHintVisited=1;S.tab='c';S.msg='';go();
}
/* Repere BETA după introducere: câte unul, fără popup în cascadă. */
const JE_MILESTONES=[
 {lv:5,title:'Lumea s-a deschis',where:'Hartă → Lumea',
  why:'Poți descoperi alți jucători și satele din Lume. Nu este necesar să ataci pentru a continua.'},
 {lv:8,title:'Catacombele Uitate',where:'Coborâre → Catacombele Uitate',
  why:'Ai deblocat o nouă temniță, cu un căpitan și pradă de nivel mai mare.'},
 {lv:15,title:'Bazarul',where:'Sat → Piață → Bazar',
  why:'Poți tranzacționa obiecte eligibile cu alți jucători. Echipamentul legendar rămâne legat de cont.'},
 {lv:20,title:'Turnul',where:'Coborâre → Turn',
  why:'Se deschide provocarea de endgame cu etaje și străjeri. Nu înlocuiește progresul din Temnițe.'},
 {lv:30,title:'Al patrulea loc în echipă',where:'Erou → Echipă și echipament',
  why:'Poți folosi încă un luptător în Temnițe; la Tron și în fantoma Lumii se păstrează limita proprie.'}
];
function jeMilestoneDue(){
 if(!jeFocus()||!S.jeCampaignOpened||S.d||!['a','c','e'].includes(S.tab)||jeCurrent())return null;
 const seen=Array.isArray(S.jeMilestoneSeen)?S.jeMilestoneSeen:[];
 return JE_MILESTONES.filter(m=>m.lv<=S.lvl&&!seen.includes(m.lv)).at(-1)||null;
}
function jeMilestonePanel(){
 const m=jeMilestoneDue();if(!m)return '';
 return '<section class="je-card je-milestone" aria-label="Deblocare de nivel">'
  +'<div class="je-caption">✦ NOU LA NIVELUL '+m.lv+'</div>'
  +'<div class="je-title"><span>✦</span><h2>'+m.title+'</h2></div>'
  +'<p class="je-next-note"><b>Unde:</b> '+m.where+'</p>'
  +'<p class="je-next-note">'+m.why+'</p>'
  +'<button class="p" onclick="jeMilestoneDismiss()">Am înțeles</button></section>';
}
function jeMilestoneDismiss(){
 const m=jeMilestoneDue();if(!m)return;
 S.jeMilestoneSeen=JE_MILESTONES.filter(x=>x.lv<=m.lv).map(x=>x.lv);
 go();
}
function jePanel(){
 if(!jeReady() || S.d)return '';
 const s=jeCurrent();
 if(!s)return S.jeCampaignOpened?(jeMilestonePanel()||jeNextAdventurePanel()):'<section class="je-card je-done"><div class="je-caption">✦ DRUMUL EROULUI</div><b>Primele jurăminte sunt împlinite.</b><p>Acum povestea continuă în Campanie.</p><button class="p" onclick="cmpOpenChecklist(\'journey\')">Deschide Campania și obiectivele</button></section>';
 const p=jeStatus(s),done=JE_STEPS.filter(x=>(S.je&&S.je.done||[]).includes(x.id)).length;
 const parts=s.parts.map(([label,cb])=>'<span class="'+(cb()?'je-ok':'')+'">'+(cb()?'✓ ':'○ ')+label+'</span>').join('');
 const reward=[s.reward.g?s.reward.g+' aur':'',s.reward.o?s.reward.o+' minereu':''].filter(Boolean).join(' + ');
 return `<section class="je-card" aria-label="Drumul Eroului, obiectiv curent">
   <div class="je-caption">✦ DRUMUL EROULUI · ${done+1}/${JE_STEPS.length}</div>
   <div class="je-title"><span>${s.icon}</span><h2>${s.title}</h2></div>
   ${typeof jeFirstLootPanel==='function'?jeFirstLootPanel():''}
   <div class="je-tasks">${parts}</div>
   <div class="je-progress"><i style="width:${Math.round(100*p.n/p.total)}%"></i></div>
   <div class="je-bottom"><span class="je-reward">Recompensă: ${reward}</span>
   ${p.ok?'<button class="p" onclick="jeClaim(\''+s.id+'\')">✦ Primește recompensa</button>':
     '<button class="p" onclick="jeNavigate()">Continuă: '+s.action()[0]+'</button>'}</div>
   <details class="je-help"><summary>📜 Poveste și ajutor</summary>
     <p class="je-say">${s.say}</p><p>${s.help}</p></details>
   ${jeFocus()?'<button class="je-guide-toggle" onclick="jeGuideToggle()" aria-pressed="'+(S.jeHintsOff?'false':'true')+'">'+
     (S.jeHintsOff?'↗ Arată ghidarea':'◌ Ascunde ghidarea')+'</button>':''}
 </section>`;
}
function jeVisit(){
 if(jeReady()&&S.tab==='m'&&S.mt!=='k'&&!S.jeVisitedWorld){
  S.jeVisitedWorld=1; /* explorarea socială înlocuiește raidul obligatoriu */
  if(typeof save==='function')save();
 }
 if(jeReady()&&S.tab==='a'&&S.vil==='x'&&!S.jeVisitedMissions){
  S.jeVisitedMissions=1; /* un singur marker, fara reward implicit */
  if(typeof save==='function')save();
 }
}
function jeDecorate(){
 if(typeof jeGuideDecorate==='function')return jeGuideDecorate();
}
/* Previzualizare de pe contul BETA existent, fara resetare si fara modificare salvare. */
function jePreviewClose(){document.getElementById('je-preview')?.remove();}
function jePreview(){
 if(typeof ST_SERVER==='undefined'||ST_SERVER!=='beta'||typeof S==='undefined'||!S||S.d
  ||typeof document==='undefined'||document.getElementById('je-preview')
  ||document.getElementById('mr-scene')||document.getElementById('mr-m')
  ||document.getElementById('lgm'))return;
 const el=document.createElement('div');el.id='je-preview';
 el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
 el.setAttribute('aria-label','Drumul Eroului · Previzualizare');
 el.innerHTML='<div class="jep-card"><div class="je-caption">✦ BETA · PREVIZUALIZARE</div>'
  +'<h2>Drumul Eroului</h2><p>Un singur fir pentru poveste, ghid și recompense.</p>'
  +JE_STEPS.map((x,i)=>'<div class="jep-item"><b>'+x.icon+' '+(i+1)+'. '+x.title+'</b>'
   +'<p>'+x.say+'</p><small>'+x.parts.map(p=>p[0]).join(' · ')+'</small></div>').join('')
  +'<button class="p" onclick="jePreviewClose()">Închide</button>'
  +'<p class="jep-hint">Nu modifică personajele, progresul sau resursele.</p></div>';
 document.body.appendChild(el);
 el.querySelector('button')?.focus();
}
(function(){
 if(typeof document==='undefined'||!document.head)return;
 const el=document.createElement('style');
 el.textContent=`
.je-card{position:relative;border:1px solid #9d8155!important;border-radius:12px;background:linear-gradient(130deg,#30281f,#151b1d 68%);box-shadow:0 7px 28px #0006;overflow:hidden;animation:je-arrive .35s ease-out;padding:16px 18px;margin:0 0 12px}
.je-caption{font:700 10px Cinzel,serif;letter-spacing:.14em;color:var(--gold2)}
.je-title{display:flex;align-items:center;gap:9px;margin:9px 0}.je-title>span{font-size:23px}.je-title h2{font:700 18px Cinzel,Georgia,serif;color:var(--gold2);margin:0}
.je-tasks{display:flex;gap:9px;flex-wrap:wrap;font-size:13px;color:var(--mute)}.je-tasks .je-ok{color:#ded2a9}
.je-progress{height:4px;background:#4c463b;margin:11px 0;border-radius:6px;overflow:hidden}.je-progress i{display:block;height:100%;background:linear-gradient(90deg,#926e3d,#f0d27a);transition:width .35s ease}
.je-bottom{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.je-reward{font-size:12px;color:var(--mute)}
.je-help{margin-top:9px;color:var(--mute);font-size:12px}.je-help summary{cursor:pointer;display:inline-block;text-decoration:underline;text-underline-offset:3px}.je-help p{font-size:13px;line-height:1.55}
.je-say{font-style:italic;color:var(--gold2)}
.je-after .je-next-note{margin:7px 0;font-size:13px;color:var(--mute);line-height:1.45}.je-after .je-next-note b{color:var(--gold2)}.je-after button{margin-top:6px}
.je-milestone .je-next-note{margin:7px 0;font-size:13px;line-height:1.5;color:var(--mute)}.je-milestone .je-next-note b{color:var(--gold2)}.je-milestone button{margin-top:7px}
.je-target{outline:2px solid #e1b969!important;outline-offset:3px;animation:je-halo 2.6s ease-in-out infinite}
#je-preview{position:fixed;inset:0;z-index:25040;padding:16px;display:flex;justify-content:center;align-items:center;background:#05070aee}
.jep-card{width:min(510px,100%);max-height:calc(100vh - 32px);overflow-y:auto;border:1px solid #bf9b60;border-radius:12px;background:#131b1e;padding:18px;text-align:center}
.jep-card h2{color:var(--gold2);margin:9px 0}.jep-card>p{font-size:13px}
.jep-item{text-align:left;border-top:1px solid #ffffff21;padding:11px 2px}.jep-item p{font-size:13px;color:var(--gold2);font-style:italic;margin:6px 0}
.jep-item small,.jep-hint{color:var(--mute);font-size:12px}
#je-toast{position:fixed;z-index:27010;bottom:25px;left:50%;transform:translateX(-50%);max-width:calc(100vw - 24px);min-width:min(300px,calc(100vw - 24px));display:flex;align-items:center;gap:12px;border:1px solid #bf9b60;border-radius:11px;background:#182024fa;padding:13px;box-shadow:0 12px 35px #000b;animation:je-toast-in .45s ease-out}
#je-toast>span{font-size:29px;color:var(--gold2)}#je-toast b,#je-toast small{display:block}#je-toast b{color:#f0d27a}#je-toast small{font-size:12px;color:var(--mute)}
@keyframes je-arrive{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}
@keyframes je-halo{50%{box-shadow:0 0 13px #e1b96955}}
@keyframes je-toast-in{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}
@media(max-width:460px){.je-card{padding:13px}.je-bottom{align-items:stretch;flex-direction:column}.je-bottom button{width:100%}}
@media(prefers-reduced-motion:reduce){.je-card,.je-target,#je-toast{animation:none!important}.je-progress i{transition:none!important}}
`;
 document.head.appendChild(el);
})();
if(typeof module!=='undefined'&&module.exports)module.exports={JE_STEPS,jeEnabled,jeReady,jeCurrent,jeStatus};
