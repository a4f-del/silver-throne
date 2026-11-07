/* Silver Throne · Lista de prieteni (BETA only).
   Cereri, acceptare, anulare si mesaje; fara salvare in joc si fara modificari LIVE. */
const WF={uid:null,items:[],requests:0,ready:false,loading:false,busy:false,last:0,error:'',timer:null};
const wfEnabled=()=>typeof ST_SERVER!=='undefined'&&ST_SERVER==='beta'&&
  typeof CONT!=='undefined'&&CONT.booted&&CONT.user&&!!CONT.user.id;
const wfEscape=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function wfHeader(){
 if(!wfEnabled())return '';
 return '<button id="wf-open" class="wf-open" onclick="wfOpen()" aria-label="Prieteni'+
  (WF.requests?' · '+WF.requests+' cereri noi':'')+'">🤝 <span class="wf-word">Prieteni</span>'+
  '<span id="wf-badge" class="wf-badge"'+(WF.requests?'':' hidden')+'>'+
  (WF.requests>99?'99+':WF.requests)+'</span></button>';
}
function wfUpdateBadge(){
 const b=document.getElementById('wf-badge');
 if(b){b.hidden=!WF.requests;b.textContent=WF.requests>99?'99+':String(WF.requests);}
 const open=document.getElementById('wf-open');
 if(open)open.setAttribute('aria-label','Prieteni'+(WF.requests?' · '+WF.requests+' cereri noi':''));
}
function wfRelationship(uid){
 if(!wfEnabled()||!uid)return null;
 return WF.items.find(x=>String(x.user_id)===String(uid))||null;
}
async function wfSync(force){
 if(!wfEnabled()||WF.loading||(!force&&Date.now()-WF.last<20000))return;
 const uid=CONT.user.id;
 if(WF.uid!==uid){WF.uid=uid;WF.items=[];WF.requests=0;WF.ready=false;}
 WF.loading=true;
 try{
  const r=await tronRpc('world_friends_list');
  if(!wfEnabled()||CONT.user.id!==uid)return;
  if(r.error){WF.error=String(r.error).slice(0,220);WF.ready=false;}
  else{
   WF.items=Array.isArray(r.data?.items)?r.data.items:[];
   WF.requests=Math.max(0,Number(r.data?.requests)||0);
   WF.ready=true;WF.error='';
  }
  WF.last=Date.now();
  wfUpdateBadge();
  if(document.getElementById('wf-list'))wfRender();
 }finally{WF.loading=false;}
}
function wfStart(){
 if(!wfEnabled())return;
 if(WF.uid!==CONT.user.id){
  WF.uid=CONT.user.id;WF.items=[];WF.requests=0;WF.last=0;WF.ready=false;
 }
 if(WF.timer)return;
 wfSync(true);
 WF.timer=setInterval(()=>{
  if(wfEnabled())wfSync(false);
  else{clearInterval(WF.timer);WF.timer=null;WF.uid=null;WF.items=[];WF.requests=0;}
 },60000);
 if(typeof hdr==='function')hdr();
}
function wfClose(){document.getElementById('wf-overlay')?.remove();}
function wfOpen(){
 if(!wfEnabled())return;
 wfClose();
 const el=document.createElement('div');el.id='wf-overlay';
 el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
 el.setAttribute('aria-label','Prietenii tăi');
 el.innerHTML='<div class="wf-dialog"><div class="wf-top"><h2>🤝 Prieteni</h2>'+
  '<button onclick="wfClose()" aria-label="Închide lista">×</button></div>'+
  '<div id="wf-list"></div></div>';
 document.body.appendChild(el);
 el.querySelector('button')?.focus();
 wfRender();wfSync(true);
}
function wfRender(){
 const el=document.getElementById('wf-list');if(!el)return;
 if(!WF.ready){
  el.innerHTML='<p class="mute">'+(WF.error?'Nu pot încărca prietenii: '+wfEscape(WF.error)+
   '. Verifică instalarea SQL BETA.':'Se încarcă lista…')+
   '</p><button onclick="wfSync(true)">Reîncearcă</button>';return;
 }
 const incoming=WF.items.filter(x=>x.status==='pending'&&x.direction==='incoming');
 const accepted=WF.items.filter(x=>x.status==='accepted');
 const outgoing=WF.items.filter(x=>x.status==='pending'&&x.direction==='outgoing');
 const validId=id=>Number.isSafeInteger(Number(id))&&Number(id)>0?Number(id):0;
 const entry=(r,kind)=>{
  const name=wfEscape(r.name),id=validId(r.id);
  const actions=kind==='incoming'
   ? '<button class="p" onclick="wfRespond('+id+',true)">Acceptă</button>'+
     '<button onclick="wfRespond('+id+',false)">Refuză</button>'
   :kind==='outgoing'?'<button onclick="wfRemove('+id+')">Anulează</button>'
   :'<button class="p" onclick="wfMessage('+id+')">✉ Mesaj</button>'+
     '<button onclick="wfProfile('+id+')">👤 Profil</button>'+
     '<button class="wf-remove" onclick="wfRemove('+id+')">Elimină</button>';
  return '<div class="wf-entry"><div><b>'+name+'</b>'+
    (kind==='outgoing'?'<small>Cerere trimisă</small>':'')+'</div>'+
    '<div class="wf-actions">'+actions+'</div></div>';
 };
 el.innerHTML=(incoming.length?'<h3>Cereri primite ('+incoming.length+')</h3>'+
   incoming.map(r=>entry(r,'incoming')).join(''):'')+
  '<h3>Prieteni ('+accepted.length+')</h3>'+
  (accepted.length?accepted.map(r=>entry(r,'friend')).join(''):'<p class="mute">Nu ai încă prieteni. Poți trimite o cerere din profilul unui jucător.</p>')+
  (outgoing.length?'<h3>Cereri trimise</h3>'+outgoing.map(r=>entry(r,'outgoing')).join(''):'')+
  '<div class="wf-bottom"><button onclick="wfSync(true)">Actualizează lista</button></div>'+
  '<p id="wf-feedback" role="status"></p>';
}
function wfFeedback(msg){
 const el=document.getElementById('wf-feedback');
 if(el)el.textContent=msg;
 else if(typeof S!=='undefined'){S.msg=msg;if(typeof render==='function')render();}
}
async function wfRequest(uid){
 if(!wfEnabled()||WF.busy||!uid||String(uid)===String(CONT.user.id))return;
 WF.busy=true;
 try{
  const r=await tronRpc('world_friends_request',{p_target:String(uid)});
  if(r.error){wfFeedback('Cererea nu a fost trimisă: '+String(r.error));return;}
  await wfSync(true);
  wfFeedback('Cererea de prietenie a fost trimisă.');
  if(document.getElementById('lgm')&&typeof lwProfile==='function') {
    /* Profilul se poate închide sau actualiza separat; evităm deschiderea unui al doilea modal. */
  }
 }finally{WF.busy=false;}
}
async function wfRespond(id,accept){
 if(!wfEnabled()||WF.busy)return;
 const item=WF.items.find(x=>Number(x.id)===Number(id));
 if(!item||item.status!=='pending'||item.direction!=='incoming')return;
 WF.busy=true;
 try{
  const r=await tronRpc('world_friends_respond',{p_id:Number(id),p_accept:!!accept});
  if(r.error){wfFeedback(String(r.error));return;}
  await wfSync(true);
  wfFeedback(accept?'Cererea a fost acceptată.':'Cererea a fost refuzată.');
 }finally{WF.busy=false;}
}
async function wfRemove(id){
 if(!wfEnabled()||WF.busy)return;
 const item=WF.items.find(x=>Number(x.id)===Number(id));
 if(!item||!(item.status==='accepted'||item.status==='pending'&&item.direction==='outgoing'))return;
 WF.busy=true;
 try{
  const r=await tronRpc('world_friends_remove',{p_id:Number(id)});
  if(r.error){wfFeedback(String(r.error));return;}
  await wfSync(true);wfFeedback('Lista a fost actualizată.');
 }finally{WF.busy=false;}
}
function wfMessage(id){
 if(!wfEnabled())return;
 const p=WF.items.find(x=>Number(x.id)===Number(id)&&x.status==='accepted');
 if(!p)return;
 wfClose();if(typeof wmCompose==='function')wmCompose(p.user_id,p.name);
}
function wfProfile(id){
 if(!wfEnabled())return;
 const p=WF.items.find(x=>Number(x.id)===Number(id)&&x.status==='accepted');
 if(!p)return;
 wfClose();if(typeof lwProfile==='function')lwProfile(p.user_id);
}
function wfProfileButton(id){
 if(!wfEnabled()||String(id)===String(CONT.user.id))return '';
 const rel=wfRelationship(id);
 if(!rel)return '<button onclick="wfRequest(\''+id+'\')">🤝 Adaugă prieten</button>';
 if(rel.status==='accepted')return '<button onclick="lgClose();wfOpen()">🤝 Prieteni ✓</button>';
 if(rel.direction==='outgoing')return '<button disabled title="Cerere de prietenie în așteptare">⏳ Cerere trimisă</button>';
 return '<button onclick="lgClose();wfOpen()">🤝 Răspunde cererii</button>';
}
(function(){
 if(typeof document==='undefined'||!document.head)return;
 const s=document.createElement('style');
 s.textContent=`
.wf-open{position:relative;display:inline-flex;gap:4px;align-items:center;background:#211f19;color:var(--gold2);border:1px solid var(--gold);font:700 12px Cinzel,serif;padding:8px 10px;border-radius:5px;white-space:nowrap}
.wf-badge{background:#b74439;color:#fff;border-radius:12px;min-width:19px;text-align:center;font:700 11px sans-serif;padding:2px 4px}.wf-badge[hidden]{display:none}
#wf-overlay{position:fixed;inset:0;z-index:27055;background:#05080bea;display:flex;align-items:center;justify-content:center;padding:16px}
.wf-dialog{width:min(530px,100%);max-height:calc(100vh - 32px);overflow:auto;padding:17px;border-radius:12px;background:#182024;border:1px solid var(--gold);box-shadow:0 15px 48px #000a}
.wf-top{display:flex;justify-content:space-between;align-items:center;gap:10px}.wf-top h2{color:var(--gold2);font-size:19px}.wf-top button{font-size:22px}
.wf-dialog h3{font-size:14px;color:var(--gold2);margin:18px 0 9px}
.wf-entry{border:1px solid #5c543f;border-radius:9px;padding:10px;margin-bottom:8px;background:#141b1e;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.wf-entry b{display:block;font-size:15px}.wf-entry small{color:var(--mute);display:block;font-size:12px}
.wf-actions{display:flex;flex-wrap:wrap;gap:6px}.wf-actions button{padding:6px 9px;font-size:13px}.wf-remove{color:#e5b4a9}
.wf-bottom{margin-top:12px}.wf-bottom button{font-size:12px}
@media(max-width:650px){.wf-word{display:none}.wf-open{font-size:18px;padding:6px}.wf-dialog{padding:13px}.wf-actions button{min-height:38px}}
@media(prefers-reduced-motion:reduce){#wf-overlay *{animation:none!important}}
`;document.head.appendChild(s);
})();
if(typeof module!=='undefined'&&module.exports)module.exports={wfEnabled,wfEscape};
