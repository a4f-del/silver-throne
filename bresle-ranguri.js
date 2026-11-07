/* BETA · ranguri si invitatii la bresle, validate exclusiv de Supabase.
 * 4 ranguri: Conducator, Ofiter, Veteran, Membru. Invitatia trebuie acceptata. */
const GSR={uid:null,state:null,busy:false,loading:false,last:0,error:'',notice:'',query:''};
const GSR_RANKS={leader:'♛ Conducător',officer:'⚔ Ofițer',veteran:'✦ Veteran',member:'Membru'};
const gsrRankName=role=>GSR_RANKS[role]||'Membru';
function gsrReset(){
 GSR.uid=null;GSR.state=null;GSR.busy=false;GSR.loading=false;
 GSR.last=0;GSR.error='';GSR.notice='';GSR.query='';
}
const gsrInboxCount=()=>GSR.state&&Array.isArray(GSR.state.invitations)?GSR.state.invitations.length:0;
function gsrCanInvite(){return !!(GSR.state&&['leader','officer'].includes(GSR.state.role)&&GUILD.state?.guild);}
async function gsrSync(force){
 if(!guildEnabled()||GSR.loading||GSR.busy||(!force&&Date.now()-GSR.last<25000))return;
 const uid=CONT.user.id;
 if(GSR.uid!==uid){gsrReset();GSR.uid=uid;}
 GSR.loading=true;
 try{
  const r=await tronRpc('guild_social_api',{p_action:'status',p_data:{}});
  if(!guildEnabled()||CONT.user.id!==uid)return;
  if(r.error)GSR.error=String(r.error).slice(0,170);
  else{GSR.state=r.data;GSR.error='';GSR.last=Date.now();}
  if(document.getElementById('guild-view'))guildPaint();
  if(typeof hdr==='function')hdr();
 }finally{GSR.loading=false;}
}
function gsrInfo(){
 return GSR.error?'<p class="r4">Rangurile și invitațiile nu sunt încă disponibile: '+guildEsc(GSR.error)+
  '. Verifică migrarea SQL 15 din BETA.</p>':'';
}
function gsrInvitationHtml(){
 if(!GSR.state)return GSR.error?gsrInfo():'<p class="mute">Se verifică invitațiile…</p>';
 const items=GSR.state.invitations||[];
 return '<div class="guild-invites"><h3>📨 Invitații primite'+(items.length?' ('+items.length+')':'')+'</h3>'+
 (items.length?items.map(i=>
   '<div class="guild-invite"><div><b>['+guildEsc(i.guild_tag)+'] '+guildEsc(i.guild_name)+'</b>'+
   '<small>Invitație de la '+guildEsc(i.inviter)+' · expiră la '+guildEsc(new Date(i.expires_at).toLocaleDateString('ro-RO'))+'</small></div>'+
   '<div><button class="p" onclick="gsrRespond('+Number(i.id)+',true)">Acceptă</button>'+
   '<button onclick="gsrRespond('+Number(i.id)+',false)">Refuză</button></div></div>'
 ).join(''):'<p class="mute">Nu ai invitații în așteptare.</p>')+'</div>';
}
function gsrManagementHtml(g){
 if(GSR.error)return gsrInfo();
 if(!GSR.state)return '<p class="mute">Se încarcă rangurile și invitațiile…</p>';
 const roster=GSR.state.members||[];
 let h='<section class="guild-management"><h3>Rangurile breslei</h3>'+
  '<p class="mute">Conducătorul administrează rangurile. Ofițerii invită jucători și pot elimina membri obișnuiți. Veteranii și membrii contribuie la obiective.</p>'+
  '<div class="guild-ranks-list">'+roster.map(m=>{
   const mine=String(m.user_id)===String(CONT.user.id);
   const leader=GSR.state.role==='leader';
   const officer=GSR.state.role==='officer';
   let manage='';
   const id=JSON.stringify(String(m.user_id));
   if(!mine&&m.role!=='leader'){
    if(leader){
     manage='<label class="guild-rank-select">Rang <select aria-label="Rang pentru '+guildEsc(m.name)+'" onchange="gsrChangeRole('+id+',this.value)">'+
      ['officer','veteran','member'].map(role=>'<option value="'+role+'"'+(m.role===role?' selected':'')+'>'+gsrRankName(role)+'</option>').join('')+'</select></label>'+
      '<button onclick="gsrTransfer('+id+')">Predă conducerea</button>';
    }
    if(leader||(officer&&m.role==='member'))
     manage+='<button class="d" onclick="gsrKick('+id+')">Elimină</button>';
   }
   return '<div class="guild-rank-member"><div><b>'+guildEsc(m.name)+(mine?' (tu)':'')+'</b>'+
    '<small>'+gsrRankName(m.role)+' · nivel '+Number(m.level||1)+'</small></div>'+
    (manage?'<div class="guild-manage-actions">'+manage+'</div>':'')+'</div>';
  }).join('')+'</div>';
 if(gsrCanInvite()){
  h+='<h3>Invită jucători</h3>'+
   '<p class="mute">Caută după numele din Lume. Jucătorul primește o invitație pe care o poate accepta sau refuza. Maximum 12 invitații trimise în 24 de ore pentru fiecare ofițer/conducător.</p>'+
   '<div class="guild-search"><input id="guild-search-name" type="search" maxlength="40" value="'+guildEsc(GSR.query)+
   '" placeholder="Numele jucătorului" aria-label="Caută jucători din Lume" onkeydown="if(event.key===\'Enter\')gsrSearch()">'+
   '<button class="p" onclick="gsrSearch()">Caută</button></div>'+
   '<div class="guild-search-results">'+(GSR.state.results||[]).map(u=>
    '<div><span><b>'+guildEsc(u.name)+'</b><small>Nivel '+Number(u.level||1)+'</small></span>'+
    '<button onclick="gsrInvite('+JSON.stringify(String(u.user_id))+')"'+(u.invited?' disabled':'')+'>'+
    (u.invited?'Invitație trimisă':'Invită')+'</button></div>'
   ).join('')+(GSR.query&&!(GSR.state.results||[]).length?'<p class="mute">Niciun jucător disponibil pentru acest nume.</p>':'')+'</div>';
  const outgoing=GSR.state.outgoing||[];
  h+='<h3>Invitații trimise ('+outgoing.length+')</h3>'+
   (outgoing.length?'<div class="guild-outgoing">'+outgoing.map(i=>
    '<div><span>'+guildEsc(i.name)+' <small>· în așteptare</small></span>'+
    (g.role==='leader'||String(i.inviter_id)===String(CONT.user.id)
     ?'<button onclick="gsrCancel('+Number(i.id)+')">Anulează</button>':'')+'</div>').join('')+'</div>'
    :'<p class="mute">Nu există invitații active.</p>');
 }
 return h+'</section>';
}
async function gsrAction(action,data){
 if(!guildEnabled()||GSR.busy)return null;
 GSR.busy=true;GSR.notice='Se trimite…';
 let result=null;
 try{
  const r=await tronRpc('guild_social_api',{p_action:action,p_data:data||{}});
  if(r.error){GSR.notice=String(r.error).slice(0,180);return null;}
  GSR.state=r.data;GSR.error='';GSR.last=Date.now();
  GSR.notice=({invite:'Invitație trimisă.',accept:'Ai intrat în breaslă.',
    decline:'Invitație refuzată.',cancel:'Invitație anulată.',rank:'Rang actualizat.',
    transfer:'Conducerea a fost predată.',kick:'Membrul a fost eliminat.'})[action]||'Actualizat.';
  result=r.data;
  if(['accept','rank','transfer','kick'].includes(action))await guildSync(true);
  return result;
 }finally{
  GSR.busy=false;
  if(typeof guildPaint==='function')guildPaint();
  if(typeof hdr==='function')hdr();
 }
}
async function gsrSearch(){
 if(!gsrCanInvite()||GSR.busy)return;
 const q=document.getElementById('guild-search-name')?.value?.trim()||'';
 GSR.query=q;
 if(q.length<2){GSR.notice='Introdu cel puțin două caractere.';guildPaint();return;}
 GSR.busy=true;
 try{
  const r=await tronRpc('guild_social_api',{p_action:'search',p_data:{query:q}});
  if(r.error)GSR.notice=String(r.error).slice(0,180);
  else{GSR.state=r.data;GSR.notice='Rezultate pentru „'+q+'”';GSR.error='';GSR.last=Date.now();}
 }finally{GSR.busy=false;guildPaint();}
}
async function gsrInvite(user_id){if(gsrCanInvite())await gsrAction('invite',{user_id});}
async function gsrRespond(invite_id,accept){await gsrAction(accept?'accept':'decline',{invite_id});}
async function gsrCancel(invite_id){await gsrAction('cancel',{invite_id});}
async function gsrChangeRole(user_id,role){
 if(GSR.state?.role==='leader'&&['officer','veteran','member'].includes(role))
  await gsrAction('rank',{user_id,role});
}
async function gsrTransfer(user_id){
 if(GSR.state?.role!=='leader'||!confirm('Predai definitiv conducerea acestui membru? Vei deveni ofițer.'))return;
 await gsrAction('transfer',{user_id});
}
async function gsrKick(user_id){
 if(!['leader','officer'].includes(GSR.state?.role)||!confirm('Elimini acest membru din breaslă?'))return;
 await gsrAction('kick',{user_id});
}
