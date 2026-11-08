/* Silver Throne BETA — ghidare contextuală pentru Drumul Eroului.
 * Un singur highlight cu săgeată; nu blochează clickuri sau lupta.
 * Doar eroi noi (journeyUxV=2); LIVE și salvările vechi rămân nemodificate. */
const JE_GUIDE={target:null,scrollKey:'',arrow:null,events:false,frame:0};
function jeGuideEnabled(){
 return typeof jeFocusActive==='function'&&jeFocusActive()&&!S.jeHintsOff;
}
function jeGuideToggle(){
 if(typeof jeFocusActive!=='function'||!jeFocusActive())return;
 S.jeHintsOff=S.jeHintsOff?0:1;go();
}
function jeGuidePlan(){
 if(!jeGuideEnabled()||typeof jeCurrent!=='function')return null;
 const step=jeCurrent();if(!step)return null;
 if(S.d){
  return step.id==='poarta'&&S.d.one&&!S.d.tw&&S.d.f&&S.auto===false
    ?{selector:'.ac-turn-actions button[onclick="act(\'n\')"]',name:'Lovește monstrul'}:null;
 }
 if(typeof jeStatus==='function'&&jeStatus(step).ok)
  return {selector:'.je-card button[onclick^="jeClaim("]',name:'Revendică recompensa'};
 if(S.adventure){
  return step.id==='poarta'&&S.adventure.di===0
    ?{selector:'.ac-side .ac-primary',name:'Luptă cu monstrul curent'}:null;
 }
 const action=step.action(),tab=action[1],v=action[2];
 if(S.tab!==tab){
  return {selector:'#nv button[onclick="tab(\''+tab+'\')"]',name:'Deschide '+action[0],nav:true};
 }
 if(tab==='a'&&(S.vil||'')!==v){
  if(!v)return {selector:'.vb-back',name:'Înapoi în Sat'};
  return {selector:'.vh-lb[data-v="'+v+'"], .vb-c[data-v="'+v+'"]',name:'Intră în '+action[0]};
 }
 if(tab==='c'){
  return step.id==='poarta'&&!S.adventure
    ?{selector:'.dg-enter[onclick="dToggle(0)"]',name:'Intră în Mina Cenușie'}:null;
 }
 if(tab==='a'&&v==='h'){
  const c=step.id==='poarta'?'Paznic':step.id==='urme'?'Arcaș':'Războinic';
  return {selector:'.mr-hc.offer button[onclick="mrRecruit(\''+c+'\')"]',name:'Primește '+c};
 }
 if(tab==='a'&&v==='a'){
  if(typeof jeStarterForgeHint==='function'&&jeStarterForgeHint().includes('je-first-prepare'))
    return {selector:'.je-first-prepare',name:'Selectează arma eroului'};
  if(typeof jeStarterWeaponList==='function'&&step.id==='otel'&&jeStarterWeaponList().some(x=>x.good))
    return {selector:'.je-first-forge button',name:'Mergi la Echipă pentru arma găsită'};
  const ready=(S.forge||[]).some(x=>x&&x.end<=Date.now());
  if(ready)return {selector:'.fslot.rdy button[onclick^="collect("], .fgrid-all',name:'Ridică obiectul forjat'};
  const free=(S.forge||[]).some(x=>!x);
  return free?{selector:'button[onclick="craft()"]',name:'Forjează un obiect'}:null;
 }
 if(tab==='e'){
  if(typeof jeStarterStep==='function'&&jeStarterStep())
    return {selector:'.je-first-equip, .je-first-forge-go',name:'Echipează prima armă'};
  const i=(S.inv||[]).findIndex(x=>x&&x.t==='w');
  if(i>=0){
   const sel='button[onclick="equip('+i+')"]';
   if(typeof document!=='undefined'&&document.querySelector(sel))
    return {selector:sel,name:'Echipează arma'};
   return {selector:'button[onclick="invF(\'w\')"]',name:'Arată armele'};
  }
  return null;
 }
 if(tab==='a'&&v==='t')return {selector:'button[onclick^="train("]',name:'Antrenează eroul'};
 return null;
}
function jeGuideBlocked(){
 return typeof document==='undefined'||!!document.querySelector(
  '#st-prolog,#mr-scene,#mr-m,#lgm,#je-preview,#hc-root,#guild-overlay,#gate:not(.g-out)'
 );
}
function jeGuideArrow(){
 let el=document.getElementById('je-guide-arrow');
 if(!el){el=document.createElement('span');el.id='je-guide-arrow';
  el.setAttribute('aria-hidden','true');document.body.appendChild(el);}
 return el;
}
function jeGuideMove(){
 const el=JE_GUIDE.arrow,target=JE_GUIDE.target;
 if(!el||!target||!document.contains(target)||!jeGuideEnabled()||jeGuideBlocked()){
  if(el)el.style.display='none';return;
 }
 const r=target.getBoundingClientRect(),vw=window.innerWidth||document.documentElement.clientWidth,
  vh=window.innerHeight||document.documentElement.clientHeight;
 if(r.width<=0||r.height<=0||r.bottom<8||r.top>vh-8||r.right<8||r.left>vw-8){
  el.style.display='none';return;
 }
 const above=r.top>=48,x=Math.min(Math.max(12,r.left+r.width/2-13),Math.max(12,vw-36));
 const y=above?r.top-35:Math.min(vh-36,r.bottom+5);
 el.textContent=above?'▼':'▲';
 el.style.left=Math.round(x)+'px';el.style.top=Math.round(Math.max(4,y))+'px';
 el.style.display='block';
}
function jeGuideTick(){
 if(JE_GUIDE.frame)return;
 JE_GUIDE.frame=requestAnimationFrame(()=>{JE_GUIDE.frame=0;jeGuideMove();});
}
function jeGuideDecorate(){
 if(typeof document==='undefined'||!document.querySelectorAll)return;
 document.querySelectorAll('.je-target,.je-guide-hit').forEach(el=>{
  el.classList.remove('je-target','je-guide-hit');el.removeAttribute('data-je-tip');
 });
 JE_GUIDE.target=null;
 const arrow=document.getElementById('je-guide-arrow');if(arrow)arrow.style.display='none';
 if(!jeGuideEnabled()||jeGuideBlocked())return;
 const plan=jeGuidePlan();if(!plan)return;
 let target=[...document.querySelectorAll(plan.selector)].find(el=>!el.disabled);
 if(!target&&plan.selector==='.ac-side .ac-primary'){
  // Dacă jucătorul a inspectat alt card, indicăm monstrul care urmează.
  // Dacă se uită la un portret trecut/viitor, indică butonul care readuce
  // direct la lupta posibilă, nu doar cardul din bandă.
  target=document.querySelector('.ac-return-current')||
    document.querySelector('.ac-step.ac-current');
 }
 if(!target)return;
 JE_GUIDE.target=target;JE_GUIDE.arrow=jeGuideArrow();
 target.classList.add('je-guide-hit');target.setAttribute('data-je-tip',plan.name);
 if(!JE_GUIDE.events){
  JE_GUIDE.events=true;
  window.addEventListener('scroll',jeGuideTick,true);
  window.addEventListener('resize',jeGuideTick,{passive:true});
  if(window.visualViewport)window.visualViewport.addEventListener('resize',jeGuideTick,{passive:true});
 }
 const step=jeCurrent(),key=step.id+'|'+S.tab+'|'+(S.vil||'')+'|'+
  (S.adventure?S.adventure.di:'')+'|'+plan.selector;
 const rect=target.getBoundingClientRect();
 if(!plan.nav&&JE_GUIDE.scrollKey!==key&&
   (rect.bottom>window.innerHeight-20||rect.top<45)){
  JE_GUIDE.scrollKey=key;
  if(typeof target.scrollIntoView==='function')
   target.scrollIntoView({block:'center',behavior:
    window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
 }
 jeGuideMove();
}
(function(){
 if(typeof document==='undefined'||!document.head)return;
 const style=document.createElement('style');
 style.textContent=[
 '.je-guide-hit{outline:3px solid #f1cb73!important;outline-offset:4px;box-shadow:0 0 0 5px #e7ba5240,0 0 18px 4px #f1cb7366!important;animation:jeGuidePulse 1.7s ease-in-out infinite!important;z-index:4}',
 '.vh-lb.je-guide-hit{position:absolute;z-index:5}',
 '#je-guide-arrow{position:fixed;z-index:120;pointer-events:none;display:none;width:28px;height:32px;text-align:center;font:900 26px/32px system-ui;color:#ffda7f;text-shadow:0 2px 3px #000,0 0 9px #e6a947;animation:jeGuideBob .9s ease-in-out infinite alternate}',
 '.je-guide-toggle{margin-top:9px;padding:5px 8px;font-size:12px;opacity:.84;border:1px solid #826c4b;border-radius:6px}',
 '.je-guide-toggle:hover,.je-guide-toggle:focus-visible{opacity:1}',
 '@keyframes jeGuidePulse{50%{box-shadow:0 0 0 6px #f1cb7340,0 0 25px 7px #eab65485}}',
 '@keyframes jeGuideBob{from{transform:translateY(-3px)}to{transform:translateY(3px)}}',
 '@media(max-width:500px){#je-guide-arrow{width:24px;height:27px;font-size:23px;line-height:27px}.je-guide-hit{outline-offset:2px}}',
 '@media(prefers-reduced-motion:reduce){.je-guide-hit,#je-guide-arrow{animation:none!important}}'
 ].join('\n');
 document.head.appendChild(style);
})();
