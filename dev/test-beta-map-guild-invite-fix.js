/* Silver Throne BETA — tag public [TAG] si invitatii din profil.
 * node dev/test-beta-map-guild-invite-fix.js
 * Local JS smoke tests: nicio cerere reala catre server. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const social=read('bresle-ranguri.js'),guild=read('bresle.js'),
  quick=read('lume-quick.js'),main=read('index.html'),css=read('bresle-ranguri.css'),
  sql=read('supabase/16-beta-guild-map-tags.sql');
for(const src of [social,guild,quick])new Function(src);
for(const m of main.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
assert(main.includes('lume-quick.js?v=2026.11.07-6') &&
 main.includes('bresle-ranguri.js?v=2026.11.07-2'),'assets reloaded');
assert(quick.includes("title = (tag?'['+tag+'] ':'') + p.name"),'player titles use guild tag');
assert(quick.includes("panel.append(head, buttons)"),'two-row compact popup');
assert(!quick.includes("b.appendChild(hint)"),'icons no longer have text captions');
assert(quick.includes("panel.style.width='max-content'"),'width follows content');
assert(quick.includes("title = v.n; detail = ''"),'NPC title without extra details');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const user='11111111-1111-4111-8111-111111111111',target='22222222-2222-4222-8222-222222222222';
const GUILD={state:{guild:{id:7,tag:'ORD',role:'leader'}}},CONT={user:{id:user},booted:true};
let shouldError=false,closed=0,opened=0,requests=[];
const status={textContent:''};
const socialCtx={
 ST_SERVER:'beta',guildEsc:esc,guildEnabled:()=>true,GUILD,CONT,
 document:{getElementById:id=>id==='gsr-profile-status'?status:null},
 tronRpc:async(fn,args)=>{requests.push([fn,args]);return shouldError?
  {error:'Jucatorul este deja intr-o breasla.'}:
  {data:{role:'leader',guild_id:7,invitations:[],outgoing:[],members:[],results:[]}}},
 guildPaint:()=>{},hdr:()=>{},guildSync:async()=>{},
 lgClose:()=>closed++,guildOpen:()=>opened++,confirm:()=>true
};
const socialApi=new Function(...Object.keys(socialCtx),social+
 ';return {GSR,gsrCanInvite,gsrJsArg,gsrProfileInviteButton,gsrInviteFromProfile,gsrManagementHtml};')(...Object.values(socialCtx));
socialApi.GSR.state={role:'leader',guild_id:7,invitations:[],outgoing:[],results:[],
 members:[{user_id:user,name:'Conducător',role:'leader',level:32},
 {user_id:target,name:'Mercenar',role:'member',level:21}]};
const button=socialApi.gsrProfileInviteButton(target);
assert(button.includes('Invită în breaslă'),'invite from profile appears for guild leader');
assert(button.includes('gsrInviteFromProfile(&quot;'+target+'&quot;)'),'UUID quoted safely in HTML attribute');
assert(!button.includes('gsrInviteFromProfile("'+target+'")'),'old broken HTML quote pattern is gone');
const handler=button.match(/onclick="([^"]+)"/);
assert(handler,'onclick must be valid one HTML attribute');
const decoded=handler[1].replaceAll('&quot;','"');
let gotId=null;
new Function('gsrInviteFromProfile',decoded)(x=>gotId=x);
assert.equal(gotId,target,'browser-decoded handler passes the expected UUID');
const members=socialApi.gsrManagementHtml(GUILD.state.guild);
assert(members.includes('gsrChangeRole(&quot;'+target+'&quot;,this.value)'),
 'rank dropdown uses valid HTML quoting');
assert(members.includes('gsrKick(&quot;'+target+'&quot;)'),
 'member removal uses valid HTML quoting');
(async()=>{
 shouldError=true;
 assert.equal(await socialApi.gsrInviteFromProfile(target),false,'RPC error is reported without claiming success');
 assert.equal(closed,0,'failed invite keeps player profile open');
 assert(status.textContent.includes('deja intr-o breasla'),'server error visible directly under the button');
 shouldError=false;
 assert.equal(await socialApi.gsrInviteFromProfile(target),true,'successful RPC closes profile and opens guild');
 assert.equal(closed,1);assert.equal(opened,1);
 assert.equal(requests.at(-1)[0],'guild_social_api');
 assert.equal(requests.at(-1)[1].p_action,'invite');
 assert.equal(requests.at(-1)[1].p_data.user_id,target);
 // Tags are read-only public data; separate RPC from the invite/write API.
 const tags={
  '11111111-1111-4111-8111-111111111111':'ORD',
  '22222222-2222-4222-8222-222222222222':'DRG'
 };
 const guildCtx={ST_SERVER:'beta',CONT,GSR:socialApi.GSR,
   document:{head:null,getElementById:()=>null},
   tronRpc:async(fn,args)=>{assert.equal(fn,'guild_map_tags');return {data:tags}},
   guildPaint:()=>{},hdr:()=>{},setTimeout:()=>{},setInterval:()=>1,
   save:()=>{},console};
 const api=new Function(...Object.keys(guildCtx),guild+
  ';return {GUILD,guildTagFor,guildMapTagsSync,guildReset};')(...Object.values(guildCtx));
 api.GUILD.state=GUILD.state;
 assert.equal(api.guildTagFor(user),'ORD','own guild tag available before sync');
 await api.guildMapTagsSync(true);
 assert.equal(api.guildTagFor(target),'DRG','other player tag loaded from public guild RPC');
 api.guildReset();
 assert.deepEqual(api.GUILD.tags,{},'guild tags cleared at account change');
 const liveCtx={...guildCtx,ST_SERVER:'live'};
 const live=new Function(...Object.keys(liveCtx),guild+';return guildTagFor;')(...Object.values(liveCtx));
 assert.equal(live(target),'','LIVE does not display BETA guild tag');
 assert(sql.includes('SECURITY DEFINER')&&sql.includes("SET search_path = ''"));
 assert(sql.includes('public.is_beta_admin()'),'public tags endpoint is BETA only');
 assert(sql.includes('GRANT EXECUTE ON FUNCTION public.guild_map_tags() TO authenticated'));
 assert(sql.includes('jsonb_object_agg(m.user_id::text,g.tag)'),'tag RPC returns only UUID and public abbreviation');
 assert(css.includes('.gsr-profile-invite'),'profile error feedback styled');
 console.log('OK: compact [TAG] map, safe HTML onclick, rank controls, visible invite errors, public TAG RPC, LIVE isolation.');
})().catch(e=>{console.error(e);process.exitCode=1});
