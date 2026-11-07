/* Silver Throne · mesagerie privata, BETA-only.
   Serverul valideaza destinatarul, accesul si rate-limit-ul. */
const WM={messages:[],unread:0,ready:false,loading:false,sending:false,err:'',last:0,uid:null,timer:null};
const wmBeta=()=>typeof ST_SERVER!=='undefined'&&ST_SERVER==='beta';
const wmAuth=()=>wmBeta()&&typeof CONT!=='undefined'&&CONT.booted&&CONT.user&&CONT.user.id;
const wmEsc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const wmErr=e=>String(e||'Eroare de server.').replace(/<[^>]+>/g,'').slice(0,220);
function wmBadge(){
 const b=document.getElementById('wm-badge');
 if(b){b.textContent=WM.unread>99?'99+':String(WM.unread);b.hidden=WM.unread===0;}
 const btn=document.getElementById('wm-open');
 if(btn)btn.setAttribute('aria-label','Mesaje'+(WM.unread?' · '+WM.unread+' necitite':''));
}
function wmHeader(){
 if(!wmAuth())return '';
 return '<button id="wm-open" class="wm-open" onclick="wmOpen()" aria-label="Mesaje'+
  (WM.unread?' · '+WM.unread+' necitite':'')+'">✉ <span class="wm-word">Mesaje</span> <span id="wm-badge" class="wm-badge"'+
  (WM.unread?'':' hidden')+'>'+(WM.unread>99?'99+':WM.unread)+'</span></button>';
}
async function wmSync(force){
 const uid=wmAuth(); if(!uid||WM.loading||(!force&&Date.now()-WM.last<15000))return;
 if(WM.uid!==uid){WM.messages=[];WM.unread=0;WM.uid=uid;}
 WM.loading=true;
 try{
  const r=await tronRpc('world_mail_inbox');
  if(r.error){WM.err=wmErr(r.error);WM.ready=false;}
  else{
   WM.messages=Array.isArray(r.data?.messages)?r.data.messages:[];
   WM.unread=Math.max(0,+r.data.unread||0);WM.err='';WM.ready=true;
  }
  WM.last=Date.now();wmBadge();
  if(document.getElementById('wm-inbox'))wmRenderInbox();
 }finally{WM.loading=false;}
}
function wmStart(){
 if(!wmAuth())return;
 if(WM.uid!==CONT.user.id){WM.messages=[];WM.unread=0;WM.uid=CONT.user.id;WM.last=0;}
 if(WM.timer)return;
 wmSync(true);
 WM.timer=setInterval(()=>{if(wmAuth())wmSync(false);else{clearInterval(WM.timer);WM.timer=null;}},60000);
 if(typeof hdr==='function')hdr();
}
function wmClose(){document.getElementById('wm-overlay')?.remove();}
function wmOverlay(title,content){
 if(!wmAuth())return;
 wmClose();
 const el=document.createElement('div');el.id='wm-overlay';el.setAttribute('role','dialog');
 el.setAttribute('aria-modal','true');el.setAttribute('aria-label',title);
 el.innerHTML='<div class="wm-dialog"><div class="wm-top"><h2>'+wmEsc(title)+
 '</h2><button onclick="wmClose()" aria-label="Închide mesageria">×</button></div>'+content+'</div>';
 document.body.appendChild(el);
 el.querySelector('button')?.focus();
}
function wmOpen(){
 if(!wmAuth())return;
 wmOverlay('Mesaje private','<div id="wm-inbox"></div>');
 wmRenderInbox();wmSync(true);
}
function wmRenderInbox(){
 const host=document.getElementById('wm-inbox');if(!host)return;
 if(!WM.ready){
  host.innerHTML='<p class="mute">'+(WM.err?'Nu se poate încărca inboxul: '+wmEsc(WM.err)+
   ' · Verifică dacă SQL-ul BETA a fost instalat.':'Se încarcă mesajele…')+
   '</p><button onclick="wmSync(true)">Reîncearcă</button>';return;
 }
 if(!WM.messages.length){host.innerHTML='<p class="mute">Nu ai primit încă mesaje.</p><button onclick="wmSync(true)">Actualizează</button>';return;}
 host.innerHTML='<p class="mute">📬 '+WM.unread+' necitite · ultimele 50 de mesaje</p>'+
 WM.messages.map(m=>'<button class="wm-mail'+(!m.read?' new':'')+'" onclick="wmView('+Number(m.id)+')">'+
 '<span><b>'+wmEsc(m.from)+'</b><small>'+new Date(m.at).toLocaleString('ro-RO')+'</small></span>'+
 '<span class="wm-preview">'+wmEsc(m.body)+'</span></button>').join('')+
 '<button onclick="wmSync(true)">Actualizează</button>';
}
async function wmView(id){
 if(!wmAuth())return;
 const m=WM.messages.find(m=>Number(m.id)===Number(id));if(!m)return;
 wmOverlay('Mesaj de la '+m.from,
 '<div class="wm-body">'+wmEsc(m.body)+'</div><div class="wm-actions">'+
 '<button onclick="wmOpen()">← Inbox</button><button class="p" onclick="wmReply('+Number(m.id)+')">Răspunde</button></div>');
 if(!m.read){
  const r=await tronRpc('world_mail_read',{p_id:Number(m.id)});
  if(!r.error){m.read=true;WM.unread=Math.max(0,WM.unread-1);wmBadge();}
 }
}
function wmReply(id){
 const m=WM.messages.find(x=>Number(x.id)===Number(id));
 if(m)wmCompose(m.from_id,m.from);
}
function wmCompose(id,name){
 if(!wmAuth()||!id||String(id)===String(CONT.user.id))return;
 const v=LUME?.st?.players?.find(p=>String(p.id)===String(id));
 const label=String(name||v?.name||'jucător');
 WM.recipient=String(id);WM.recipientName=label;
 wmOverlay('Mesaj către '+label,
  '<label class="wm-label" for="wm-text">Mesaj privat (maximum 500 de caractere)</label>'+
  '<textarea id="wm-text" maxlength="500" rows="5" placeholder="Scrie un mesaj prietenos…"></textarea>'+
  '<small class="mute">Maxim 30 de mesaje în 24 de ore, unul la 30 de secunde.</small>'+
  '<p id="wm-feedback" role="status"></p><div class="wm-actions"><button onclick="wmClose()">Anulează</button>'+
  '<button id="wm-send" class="p" onclick="wmSend()">✉ Trimite</button></div>');
 document.getElementById('wm-text')?.focus();
}
async function wmSend(){
 if(!wmAuth()||WM.sending)return;
 const input=document.getElementById('wm-text'),feedback=document.getElementById('wm-feedback');
 if(!input||!feedback)return;
 const body=input.value.trim();
 if(!body||body.length>500){feedback.textContent='Scrie un mesaj între 1 și 500 de caractere.';return;}
 const to=WM.recipient;
 if(!to||to===CONT.user.id)return;
 WM.sending=true;const btn=document.getElementById('wm-send');if(btn)btn.disabled=true;
 try{
  const r=await tronRpc('world_mail_send',{p_target:to,p_body:body});
  if(r.error){feedback.textContent=wmErr(r.error);return;}
  wmOverlay('Mesaj trimis','<p>✉ Mesajul către '+wmEsc(WM.recipientName)+' a fost trimis.</p>'+
    '<div class="wm-actions"><button class="p" onclick="wmOpen()">Deschide inboxul</button>'+
    '<button onclick="wmClose()">Închide</button></div>');
 }finally{WM.sending=false;if(btn&&btn.isConnected)btn.disabled=false;}
}
(function(){
 if(typeof document==='undefined'||!document.head)return;
 const style=document.createElement('style');
 style.textContent=`
.wm-open{position:relative;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;padding:8px 10px;border:1px solid var(--gold);border-radius:5px;background:#211f19;color:var(--gold2);font:700 12px Cinzel,serif}
.wm-badge{background:#b74439;color:#fff;border-radius:12px;min-width:19px;text-align:center;font:700 11px sans-serif;padding:2px 4px}
.wm-badge[hidden]{display:none}
#wm-overlay{position:fixed;inset:0;z-index:27050;background:#05080be9;display:flex;align-items:center;justify-content:center;padding:16px}
.wm-dialog{box-sizing:border-box;width:min(490px,100%);max-height:calc(100vh - 32px);overflow-y:auto;border:1px solid var(--gold);border-radius:12px;background:#182024;padding:18px;box-shadow:0 16px 50px #000b}
.wm-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.wm-top h2{font-size:17px;color:var(--gold2)}
.wm-top button{font-size:22px;padding:2px 9px}.wm-label{display:block;margin:0 0 8px}
#wm-text{box-sizing:border-box;width:100%;max-width:100%;min-width:100%;background:#101618;color:#eee0c6;border:1px solid #776344;border-radius:8px;font:16px Alegreya,Georgia,serif;padding:10px;resize:vertical}
.wm-actions{display:flex;gap:9px;justify-content:flex-end;flex-wrap:wrap;margin-top:13px}.wm-mail{width:100%;text-align:left;display:flex;flex-direction:column;gap:5px;margin:7px 0;padding:10px;border:1px solid #5c543f;border-radius:8px}.wm-mail.new{border-color:var(--gold);background:#49382444}
.wm-mail>span:first-child{display:flex;justify-content:space-between;gap:10px}.wm-mail small{font-size:11px;color:var(--mute)}.wm-preview{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%;font-size:13px;color:var(--mute)}
.wm-body{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.55;padding:13px;background:#0e1518;border:1px solid #4e4224;border-radius:8px}
@media(max-width:620px){.wm-word{display:none}.wm-open{font-size:17px;padding:6px}.wm-dialog{padding:14px}}
@media(prefers-reduced-motion:reduce){#wm-overlay *{animation:none!important}}
`;
 document.head.appendChild(style);
})();
if(typeof module!=='undefined'&&module.exports)module.exports={wmBeta,wmAuth,wmEsc};
