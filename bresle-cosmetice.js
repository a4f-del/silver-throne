/* Silver Throne — atelier cosmetic de breaslă, numai BETA.
   Serverul validează prețul, drepturile și apartenența la breaslă.
   Fără monede noi sau bonusuri de luptă. */
const GCOS={uid:null,guildId:null,state:null,ready:false,loading:false,
 busy:false,last:0,unavailable:false,error:'',notice:''};
const GCOS_VARIANTS={
 emblem:['shield','sun','wolf','crown'],
 banner:['ash','forest','royal'],
 frame:['bronze','silver','gold']
};
const GCOS_ICONS={shield:'🛡',sun:'☀',wolf:'🐺',crown:'👑'};
const GCOS_TITLES={emblem:'Embleme',banner:'Steaguri',frame:'Rame'};
function guildCosmeticReset(){
 GCOS.uid=null;GCOS.guildId=null;GCOS.state=null;GCOS.ready=false;
 GCOS.loading=false;GCOS.busy=false;GCOS.last=0;GCOS.unavailable=false;
 GCOS.error='';GCOS.notice='';
}
function guildCosmeticChoice(kind,variant){
 return GCOS_VARIANTS[kind]&&GCOS_VARIANTS[kind].includes(variant)?
  variant:GCOS_VARIANTS[kind][0];
}
function guildCosmeticBadge(guildId){
 if(!guildEnabled()||!GCOS.state||String(GCOS.guildId)!==String(guildId))return '⚔';
 const x=GCOS.state.selected||{};
 const emblem=guildCosmeticChoice('emblem',x.emblem);
 const banner=guildCosmeticChoice('banner',x.banner);
 const frame=guildCosmeticChoice('frame',x.frame);
 return '<span class="gc-badge gc-banner-'+banner+' gc-frame-'+frame+
  '" title="Emblema breslei" aria-label="Emblema breslei">'+
  GCOS_ICONS[emblem]+'</span>';
}
async function guildCosmeticsSync(force){
 if(!guildEnabled()||!GUILD.state?.guild){guildCosmeticReset();return;}
 const uid=String(CONT.user.id),gid=GUILD.state.guild.id;
 if(GCOS.uid!==uid||String(GCOS.guildId)!==String(gid)){
  guildCosmeticReset();GCOS.uid=uid;GCOS.guildId=gid;
 }
 if(GCOS.loading||GCOS.busy||GCOS.unavailable||
   (!force&&GCOS.ready&&Date.now()-GCOS.last<60000))return;
 GCOS.loading=true;
 try{
  const r=await tronRpc('guild_cosmetics_api',{p_action:'status',p_data:{}});
  if(!guildEnabled()||String(CONT.user.id)!==uid||
    String(GUILD.state?.guild?.id)!==String(gid))return;
  if(r.error){
   GCOS.error=String(r.error).slice(0,160);
   GCOS.unavailable=/could not find|does not exist|schema cache/i.test(GCOS.error);
  }else if(r.data&&String(r.data.guild_id)===String(gid)){
   GCOS.state=r.data;GCOS.error='';GCOS.ready=true;GCOS.last=Date.now();
  }
 }catch(e){GCOS.error=String(e&&e.message||e).slice(0,160);}
 finally{
  GCOS.loading=false;
  if(typeof document!=='undefined'&&document.getElementById('guild-view'))guildPaint();
  if(typeof hdr==='function')hdr();
 }
}
function guildCosmeticsSection(g){
 if(!guildEnabled()||!g)return '';
 const opening='<section class="gc-shop"><h3>🎨 Atelierul breslei</h3>';
 if(GCOS.unavailable)return opening+
  '<p class="mute">Aspectele cosmetice se activează după instalarea migrării SQL 20 în BETA. Contractele și invitațiile rămân disponibile.</p></section>';
 if(GCOS.error)return opening+
  '<p class="r4">'+guildEsc(GCOS.error)+'</p>'+
  '<button type="button" onclick="guildCosmeticsSync(true)">Reîncearcă</button></section>';
 if(!GCOS.state||String(GCOS.guildId)!==String(g.id))return opening+
  '<p class="mute">Se încarcă aspectele breslei…</p></section>';
 const st=GCOS.state,chosen=st.selected||{},can=st.can_manage===true;
 const balance=Math.max(0,Math.trunc(Number(st.balance)||0));
 const badge=guildCosmeticBadge(g.id);
 let out=opening+'<div class="gc-preview gc-banner-'+guildCosmeticChoice('banner',chosen.banner)+
  ' gc-frame-'+guildCosmeticChoice('frame',chosen.frame)+'">'+badge+
  '<div><b>['+guildEsc(g.tag)+'] '+guildEsc(g.name)+'</b>'+
  '<small>Aspectele sunt vizuale; nu modifică statisticile.</small></div></div>'+
  '<p class="mute">Însemne personale: <b>'+balance+'</b>. '+
  (can?'Poți debloca și folosi aspecte pentru breaslă.':
    'Doar conducătorul și ofițerii pot modifica aspectele breslei.')+'</p>';
 const catalog=Array.isArray(st.catalog)?st.catalog:[];
 for(const kind of ['emblem','banner','frame']){
  const options=catalog.filter(c=>c&&GCOS_VARIANTS[kind].includes(c.variant)&&c.kind===kind);
  out+='<details class="gc-options"><summary>'+GCOS_TITLES[kind]+' ('+
    options.length+')</summary><div class="gc-list">';
  for(const opt of options){
   const name=guildEsc(opt.label||opt.variant);
   const price=Math.max(0,Math.trunc(Number(opt.cost)||0));
   const selected=chosen[kind]===opt.variant;
   const owned=opt.owned===true||price===0;
   const action=owned?'equip':'buy';
   const text=selected?'Activ':owned?'Folosește':'Deblochează și folosește · '+price+' însemne';
   const disabled=!can||GCOS.busy||selected||(!owned&&price>balance);
   const onclick='guildCosmeticAction('+guildEsc(JSON.stringify(action))+','+
     guildEsc(JSON.stringify(kind))+','+
     guildEsc(JSON.stringify(opt.variant))+')';
   out+='<div class="gc-option"><span><b>'+name+'</b><small>'+
     (selected?'Aspect selectat':owned?'Deblocat · gratuit de folosit':
       'Cost: '+price+' însemne')+'</small></span>'+
     '<button type="button" onclick="'+onclick+'"'+(disabled?' disabled':'')+
     '>'+text+'</button></div>';
  }
  out+='</div></details>';
 }
 if(GCOS.notice)out+='<p class="guild-message" role="status">'+guildEsc(GCOS.notice)+'</p>';
 return out+'</section>';
}
async function guildCosmeticAction(action,kind,variant){
 if(!guildEnabled()||GCOS.busy||!GCOS.state?.can_manage||
    !GCOS_VARIANTS[kind]?.includes(variant)||
    !['buy','equip'].includes(action))return;
 const uid=String(CONT.user.id),gid=String(GCOS.guildId);
 GCOS.busy=true;GCOS.notice='Se verifică însemnele pe server…';
 if(typeof guildPaint==='function')guildPaint();
 try{
  const r=await tronRpc('guild_cosmetics_api',{
   p_action:action,p_data:{kind,variant}});
  if(String(CONT.user.id)!==uid||String(GUILD.state?.guild?.id)!==gid)return;
  if(r.error){GCOS.notice=String(r.error).slice(0,160);return;}
  if(!r.data||String(r.data.guild_id)!==gid){
   GCOS.notice='Serverul nu a confirmat aspectul.';return;
  }
  GCOS.state=r.data;GCOS.error='';GCOS.last=Date.now();
  GCOS.notice=action==='buy'?'Aspect deblocat și aplicat breslei.':
   'Aspectul breslei a fost actualizat.';
  if(typeof guildSync==='function')await guildSync(true);
 }catch(e){GCOS.notice='Acțiunea nu a reușit: '+String(e&&e.message||e).slice(0,120);}
 finally{
  GCOS.busy=false;
  if(typeof guildPaint==='function')guildPaint();
  if(typeof hdr==='function')hdr();
 }
}
