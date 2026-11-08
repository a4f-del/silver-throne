/* Silver Throne — Bresle BETA. Profiluri si contributii comune in Supabase.
 * Evenimentele Temnite/Turn sunt raportate din client, deduplicate si plafonate. */
const GUILD={uid:null,state:null,loading:false,busy:false,sending:false,bossSyncing:false,last:0,error:'',notice:'',timer:null,tags:{},tagsAt:0,tagsBusy:false,tagsUnavailable:false};
const guildEsc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* Numele breslei este informație publică din Lume. Mapăm doar UUID -> TAG.
   Dacă migrarea SQL16 lipsește, afișăm în continuare numele jucătorului. */
function guildTagFor(id){
 if(!guildEnabled()||!id)return '';
 const tag=GUILD.tags[String(id)];
 if(tag)return tag;
 const own=GUILD.state?.guild;
 if(own&&String(id)===String(CONT.user.id))return own.tag;
 if(own&&typeof GSR!=='undefined'&&GSR.state?.guild_id===own.id
    &&(GSR.state.members||[]).some(m=>String(m.user_id)===String(id)))return own.tag;
 return '';
}
async function guildMapTagsSync(force){
 if(!guildEnabled()||GUILD.tagsBusy||GUILD.tagsUnavailable||
   (!force&&Date.now()-GUILD.tagsAt<60000))return;
 const uid=CONT.user.id;
 GUILD.tagsBusy=true;
 try{
  const result=await tronRpc('guild_map_tags',{});
  if(!guildEnabled()||CONT.user.id!==uid)return;
  if(result.error){
   // Endpoint nou: o migrare neaplicată nu trebuie să blocheze breslele.
   if(/could not find|does not exist|schema cache/i.test(String(result.error)))
     GUILD.tagsUnavailable=true;
  }else if(result.data&&typeof result.data==='object'&&!Array.isArray(result.data)){
   GUILD.tags=result.data;GUILD.tagsAt=Date.now();
  }
 }catch(_error){/* Meniul jucătorilor rămâne funcțional fără TAG. */}
 finally{GUILD.tagsBusy=false;}
}

const guildEnabled=()=>typeof ST_SERVER!=='undefined'&&ST_SERVER==='beta'
 &&typeof CONT!=='undefined'&&CONT.booted&&CONT.user&&!!CONT.user.id;
function guildHeader(){
 if(!guildEnabled())return '';
 const g=GUILD.state?.guild;
 const unread=!g&&typeof gsrInboxCount==='function'?gsrInboxCount():0;
 return '<button id="guild-open" class="guild-head" onclick="guildOpen()" aria-label="Deschide breslele'+(unread?' · '+unread+' invitații':'')+'">⚔ <span>'+guildEsc(g?'['+g.tag+']':'Bresle')+'</span>'+
   (unread?'<b class="guild-invite-count">'+unread+'</b>':'')+'</button>';
}
function guildReset(){GUILD.uid=null;GUILD.state=null;GUILD.loading=false;GUILD.sending=false;GUILD.bossSyncing=false;GUILD.last=0;GUILD.error='';GUILD.tags={};GUILD.tagsAt=0;GUILD.tagsBusy=false;GUILD.tagsUnavailable=false;if(typeof gsrReset==='function')gsrReset();}
async function guildSync(force){
 if(!guildEnabled()||GUILD.loading||GUILD.busy||(!force&&Date.now()-GUILD.last<25000))return;
 const uid=CONT.user.id;
 if(GUILD.uid!==uid){guildReset();GUILD.uid=uid;}
 GUILD.loading=true;
 try{
  const r=await tronRpc('guild_api',{p_action:'status',p_data:{}});
  if(!guildEnabled()||CONT.user.id!==uid)return;
  if(r.error)GUILD.error=String(r.error).slice(0,180);
  else{GUILD.state=r.data;GUILD.error='';GUILD.last=Date.now();}
  if(document.getElementById('guild-view'))guildPaint();
  if(typeof hdr==='function')hdr();
 }finally{GUILD.loading=false;}
 if(!GUILD.error)guildFlush();
 if(typeof gsrSync==='function')await gsrSync(force);
 await guildMapTagsSync(force);
}
function guildStart(){
 if(!guildEnabled())return;
 if(GUILD.uid!==CONT.user.id){guildReset();GUILD.uid=CONT.user.id;}
 if(GUILD.timer)return;
 guildSync(true);
 GUILD.timer=setInterval(()=>{
  if(guildEnabled())guildSync(false);
  else{clearInterval(GUILD.timer);GUILD.timer=null;guildReset();}
 },60000);
}
function guildOpen(){
 if(!guildEnabled())return;
 if(document.getElementById('guild-overlay'))return;
 const el=document.createElement('div');el.id='guild-overlay';
 el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
 el.setAttribute('aria-label','Bresle');
 el.innerHTML='<div class="guild-dialog"><div class="guild-top"><h2>⚔ Bresle</h2><button onclick="guildClose()" aria-label="Închide">✕</button></div><div id="guild-view"></div></div>';
 document.body.appendChild(el);el.querySelector('button')?.focus();
 guildPaint();guildSync(true);
}
function guildClose(){document.getElementById('guild-overlay')?.remove();}
function guildBar(title,n,max){
 const value=Math.min(max,Math.max(0,+n||0)),percent=Math.round(value/max*100);
 return '<div class="guild-objective"><div><span>'+guildEsc(title)+'</span><b>'+Number(n||0)+' / '+max+'</b></div>'+
 '<div class="guild-meter" role="progressbar" aria-label="'+guildEsc(title)+'" aria-valuemin="0" aria-valuemax="'+max+'" aria-valuenow="'+value+'"><i style="width:'+percent+'%"></i></div></div>';
}
const GUILD_GOALS=[['dungeons','Lupte câștigate în Temnițe',150],['hard_boss','Căpitani pe Greu sau Coșmar',25],['tower','Etaje câștigate în Turn',1000]];
const GUILD_TIERS=[['bronz','Bronz',.25,10],['argint','Argint',.6,20],['aur','Aur',1,40]];
/* BETA: țintele vin din snapshotul săptămânii, dar compatibilitatea cu
   vechiul RPC păstrează 150/25/1000 până la instalarea migrării. */
function guildWeeklyGoal(week,key,fallback){
 const raw=week&&week.goals&&week.goals[key],value=Number(raw);
 return raw!=null&&Number.isSafeInteger(value)&&value>0?value:fallback;
}

/* Ultima lovitură este confirmată de guild_api, nu estimată din S.fs.
   Valorile sunt bonusuri de contribuție, nu HP vindecat personajului. */
function guildBossLastHit(boss){
 const hit=boss&&boss.last_hit;
 if(!hit||!Number.isFinite(Number(hit.damage)))return '';
 const n=x=>Math.max(0,Math.round(Number(x)||0)).toLocaleString('ro-RO');
 return '<details class="guild-last-hit"><summary>Detalii ultima lovitură: '+
  n(hit.damage)+' daune</summary><p class="mute">Din formația publicată în Lume: '+
  '⚔ Ofensivă +'+n(hit.attack_bonus)+
  ' · 🛡 Protecție +'+n(hit.protection_bonus)+
  ' · ✚ Vindecare +'+n(hit.healing_bonus)+
  ' · Contraclasă: '+(hit.counter_triggered===true?'activă':'inactivă')+
  '. Bonusurile sunt contribuții tactice la daune, nu vindecă viața eroului. '+
  'Plafonul și viața rămasă bossului pot limita totalul.</p></details>';
}
function guildPaint(){
 const host=document.getElementById('guild-view');if(!host)return;
 if(GUILD.error){host.innerHTML='<p class="r4">Breslele nu sunt disponibile: '+guildEsc(GUILD.error)+'. Verifică migrarea SQL BETA.</p><button onclick="guildSync(true)">Reîncearcă</button>';return;}
 if(!GUILD.state){host.innerHTML='<p class="mute">Se încarcă breslele…</p><button onclick="guildSync(true)">Reîncearcă</button>';return;}
 const st=GUILD.state,g=st.guild;
 let out='<p class="guild-message" role="status">'+guildEsc(GUILD.notice||'')+'</p>'+
   (typeof GSR!=='undefined'&&GSR.notice?'<p class="guild-message" role="status">'+guildEsc(GSR.notice)+'</p>':'');
 if(!g){
  if(typeof gsrInvitationHtml==='function')out+=gsrInvitationHtml();
  out+='<h3>Creează o breaslă</h3><p class="mute">Maximum 20 membri · invită prietenii cu un cod.</p>'+
   '<div class="guild-fields"><label>Nume <input id="guild-name" type="text" maxlength="32" placeholder="Ex. Ordinul Cenușii"></label>'+
   '<label>Siglă <input id="guild-tag" type="text" maxlength="5" placeholder="ORD" autocapitalize="characters"></label>'+
   '<button class="p" onclick="guildCreate()">Creează bresla</button></div>'+
   '<h3>Intră într-o breaslă</h3><div class="guild-fields"><label>Cod de invitație <input id="guild-code" maxlength="8" placeholder="XXXXXXXX" autocapitalize="characters"></label>'+
   '<button onclick="guildJoin()">Alătură-te</button></div><h3>Bresle existente</h3>'+
   ((st.guilds||[]).length?'<div class="guild-discover">'+st.guilds.map(x=>
    '<div><b>['+guildEsc(x.tag)+'] '+guildEsc(x.name)+'</b><small>'+x.count+' / 20 membri</small></div>').join('')+'</div>'
    :'<p class="mute">Nu există încă bresle. Creează prima!</p>');
 }else{
  const week=st.contract||{},self=week.personal||{},claimed=week.claimed||{},boss=st.boss||{};
  const contributed=(self.dungeons||0)+(self.hard_boss||0)+(self.tower||0)+(self.boss_hits||0);
  out+='<div class="guild-identity"><h3>['+guildEsc(g.tag)+'] '+guildEsc(g.name)+'</h3>'+
   '<p>'+g.member_count+' / 20 membri · '+(typeof gsrRankName==='function'?gsrRankName(g.role):g.role==='leader'?'Conducător':'Membru')+' · <b>'+g.marks+' însemne</b></p>'+
   '<p>Cod invitație: <code>'+guildEsc(g.code)+'</code></p></div>'+
   '<h3>Contractul săptămânii <small>· de luni până duminică</small></h3>'+
   GUILD_GOALS.map(([key,title,max])=>guildBar(title,week[key],guildWeeklyGoal(week,key,max))).join('')+
   (Number.isSafeInteger(week.active_at_start)?'<p class="mute">Obiective stabilite pentru '+week.active_at_start+
   ' membri activi la începutul săptămânii. Nu cresc dacă intră membri noi.</p>':
   '<p class="mute">Obiective standard până la actualizarea contractelor BETA.</p>')+
   '<p class="mute">Contribuțiile tale: '+contributed+' · minimum 3 pentru a revendica premiile.</p>'+
   '<div class="guild-tier-list">'+GUILD_TIERS.map(([key,title,pct,marks])=>{
    const ready=GUILD_GOALS.every(([k,,max])=>+week[k]>=Math.ceil(guildWeeklyGoal(week,k,max)*pct));
    const done=claimed[key];
    return '<div class="guild-tier"><b>'+title+'</b><small>'+Math.round(pct*100)+'% din fiecare obiectiv · +'+marks+' însemne</small>'+
      '<button onclick="guildClaim(\''+key+'\')"'+(!ready||done||contributed<3?' disabled':'')+'>'+
      (done?'Revendicat':ready?'Revendică':'Blocat')+'</button></div>';
   }).join('')+'</div>'+
   '<h3>♛ Căpitanul de breaslă</h3>'+
   '<div class="guild-boss"><div class="guild-boss-head"><b>Străjerul Cenușii</b><span>'+Math.max(0,2-(boss.hits_today||0))+' / 2 atacuri azi</span></div>'+
   guildBar('Viața comună',boss.hp,boss.max||1)+
   '<p>Abilitate: <b>'+guildEsc(({poison:'Otravă',storm:'Furtună',wave:'Val de forță'})[boss.ability]||'Val de forță')+'</b>. Clasa care îl contracarează: <b>'+guildEsc(boss.counter||'Vraci')+'</b>. Bonusul de contraclasă (+25% daune) se aplică dacă ai această clasă în echipa publicată din Lume (maximum 3 luptători), nu doar dacă eroul are clasa potrivită. Daunele sunt calculate pe server din acel profil. Viața se adaptează numărului de membri.</p>'+
   (boss.formation_rules===true?
    '<p>Roluri în atac: <b>Războinic / Arcaș / Mag</b> pentru ofensivă, <b>Paznic / Gardian</b> pentru protecție, <b>Vraci</b> pentru vindecare. Bonusurile cresc daunele utile ale incursiunii, nu modifică HP-ul personajelor.</p>':'')+
   '<p>Ai provocat '+Number(boss.personal_damage||0).toLocaleString('ro-RO')+' daune săptămâna aceasta.</p>'+
   guildBossLastHit(boss)+
   '<div class="guild-boss-actions"><button class="p" onclick="guildBoss()"'+((boss.hits_today||0)>=2||boss.hp<=0||GUILD.bossSyncing||GUILD.busy?' disabled':'')+'>⚔ Atacă · gratuit</button>'+
   '<button onclick="guildClaim(\'boss\')"'+(boss.hp>0||!self.boss_hits||claimed.boss||contributed<3?' disabled':'')+'>'+
     (claimed.boss?'Revendicat':'Premiul căpitanului · +20 însemne')+'</button></div></div>'+
   '<h3>Membri și contribuții</h3><div class="guild-members">'+(g.members||[]).map(m=>
    '<div><b>'+guildEsc(m.name)+(m.role==='leader'?' ♛':'')+' · '+(typeof gsrRankName==='function'?gsrRankName(m.role):guildEsc(m.role))+'</b>'+
    '<small>Temnițe '+m.dungeons+' · Căpitani '+m.hard_boss+' · Turn '+m.tower+' · Atacuri boss '+m.hits+'</small></div>').join('')+'</div>'+ 
   (typeof gsrManagementHtml==='function'?gsrManagementHtml(g):'')+
   '<div class="guild-bottom"><button onclick="guildSync(true)">Actualizează</button><button class="d" onclick="guildLeave()">Părăsește bresla</button></div>';
 }
 host.innerHTML=out;
}
async function guildAction(action,data){
 if(!guildEnabled()||GUILD.busy)return null;
 GUILD.busy=true;GUILD.notice='Se trimite către server…';guildPaint();
 try{
  const res=await tronRpc('guild_api',{p_action:action,p_data:data||{}});
  if(res.error){GUILD.notice=String(res.error).slice(0,200);return null;}
  GUILD.state=res.data;GUILD.error='';GUILD.last=Date.now();
  GUILD.notice=action==='create'?'Breasla a fost creată.':action==='join'?'Ai intrat în breaslă.':
    action==='leave'?'Ai părăsit bresla.':action==='boss'?'Lovitură înregistrată pe server.':'Recompensa a fost revendicată.';
  return res.data;
 }finally{GUILD.busy=false;if(typeof gsrSync==='function')await gsrSync(true);guildPaint();if(typeof hdr==='function')hdr();}
}
const guildInput=id=>document.getElementById(id)?.value?.trim()||'';
async function guildCreate(){await guildAction('create',{name:guildInput('guild-name'),tag:guildInput('guild-tag')});}
async function guildJoin(){await guildAction('join',{code:guildInput('guild-code').toUpperCase()});}
async function guildLeave(){
 if(!guildEnabled()||!GUILD.state?.guild)return;
 if(!confirm('Părăsești bresla? Contribuțiile și însemnele de breaslă nu se transferă.'))return;
 await guildAction('leave',{});
}
async function guildClaim(tier){await guildAction('claim',{tier});}
async function guildBoss(){
 if(!guildEnabled()||!GUILD.state?.guild||GUILD.busy||GUILD.bossSyncing||
    S.d||(typeof FX!=='undefined'&&FX.playing))return;
 GUILD.bossSyncing=true;
 const uid=CONT.user.id;
 try{
  /* Înainte de a consuma una din cele 2 încercări, serverul Lumii primește
     formația actuală. Dacă publicarea a eșuat, păstrăm încercarea. */
  if(typeof lwSync!=='function'||typeof lwSnap!=='function'||
     typeof LUME==='undefined'){
   GUILD.notice='Nu pot verifica echipa publicată în Lume. Încearcă din nou.';
   return;
  }
  await lwSync(true);
  if(!guildEnabled()||CONT.user.id!==uid)return;
  if(LUME.err||LUME.pubSig!==JSON.stringify(lwSnap())){
   GUILD.notice='Echipa nu a putut fi publicată în Lume. Nicio încercare de boss nu a fost consumată.';
   return;
  }
  const previous=GUILD.state.boss||{},before=Number(previous.personal_damage)||0;
  const state=await guildAction('boss',{});
  if(state?.boss&&typeof guildBossReplay==='function'){
   const damage=Math.max(0,(Number(state.boss.personal_damage)||0)-before);
   if(damage>0)guildBossReplay(previous,state.boss,damage);
  }
 }catch(e){
  GUILD.notice='Nu s-a putut sincroniza formația: '+String(e&&e.message||e).slice(0,110);
 }finally{
  GUILD.bossSyncing=false;
  if(typeof guildPaint==='function')guildPaint();
 }
}
function guildBossReplay(before,after,damage){
 if(typeof ST_SERVER==='undefined'||ST_SERVER!=='beta')return;
 /* Un atac înregistrat pe server, o singură animație fără mutarea echipei reale.
    Contraloviturile și HP jucătorului nu sunt simulate ca daune reale. */
 if(typeof FX==='undefined'||FX.playing||typeof fxPlay!=='function'||
   typeof acFxMarkup!=='function'||!S?.fs?.length)return;
 const h=S.fs.find(f=>f.h)||S.fs[0];if(!h)return;
 const portrait=typeof tmnBoss==='function'&&typeof DG!=='undefined'&&DG[0]?tmnBoss(DG[0].bn):null;
 const max=Math.max(1,Number(after.max)||1),hp=Math.max(0,Number(before.hp)||max);
 const cast={adventure:true,pvp:false,adventureTitle:'Căpitanul breslei · atac gratuit',
  fs:[{n:h.n,c:h.c,h:true,ic:h.ic||'',hp:Math.max(1,h.hp),mh:Math.max(1,typeof mhp==='function'?mhp(h):h.hp)}],
  es:[{n:'Străjerul Cenușii',b:1,hp,mh:max,img:portrait?'imagini/monstri/'+portrait[0]+'.jpg':null}]};
 const frame={fs:[],es:[{i:0,v:-damage,mh:max}],
   txt:h.n+' lovește Străjerul Cenușii (-'+damage+' viață comună).',
   actor:{side:'fs',i:0}};
 const old=FX.cast,queue=FX.q.slice();FX.q.length=0;FX.cast=cast;
 const finish=()=>{FX.cast=old;FX.q.splice(0,FX.q.length,...queue);};
 try{fxPlay([frame],finish,true,0);}
 catch(e){finish();}
}
function guildEventId(){
 if(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')return crypto.randomUUID();
 return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
  const v=Math.floor(Math.random()*16);return (c==='x'?v:(v&3|8)).toString(16);
 });
}
function guildTrackWin(d,b){
 if(!guildEnabled()||!d||GUILD.preview||!GUILD.state?.guild||typeof S==='undefined')return;
 const g=GUILD.state.guild,week=String(g.week);
 const q=S.guildEvents||(S.guildEvents=[]);
 const add=kind=>{q.push({id:guildEventId(),kind,week,gid:g.id});};
 if(d.one&&!d.tw&&d.raid==null){add('dungeon');if(b&&d.tier>=1&&!d.ev)add('hard_boss');}
 if(d.tw)add('tower');
 if(q.length>200)q.splice(0,q.length-200);
 if(q.length)setTimeout(guildFlush,0);
}
async function guildFlush(){
 if(!guildEnabled()||GUILD.sending||GUILD.busy||!GUILD.state?.guild||!S.guildEvents?.length)return;
 GUILD.sending=true;
 try{
  let tried=0;
  while(guildEnabled()&&S.guildEvents.length&&tried<30){
   const e=S.guildEvents[0],g=GUILD.state?.guild;
   if(!g)break;
   if(e.gid!==g.id||e.week!==String(g.week)){S.guildEvents.shift();continue;}
   const r=await tronRpc('guild_api',{p_action:'report',p_data:{id:e.id,kind:e.kind,week:e.week}});
   if(r.error){
    const error=String(r.error);
    if(/altei saptamani|limita zilnica|eveniment necunoscut/i.test(error)){S.guildEvents.shift();continue;}
    GUILD.error=error.slice(0,180);break;
   }
   S.guildEvents.shift();GUILD.state=r.data;GUILD.error='';tried++;
  }
  if(typeof save==='function')save();
  if(document.getElementById('guild-view'))guildPaint();
 }finally{GUILD.sending=false;}
}
