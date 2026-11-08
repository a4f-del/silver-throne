/* BETA — regresii pentru invitatii/ranguri fara cereri sau mutatii reale.
 * node dev/test-beta-guild-ranks-invites.js */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const js=read('bresle-ranguri.js'),sql=read('supabase/15-beta-guild-ranks-invites.sql'),
      guild=read('bresle.js'),css=read('bresle-ranguri.css'),index=read('index.html'),lume=read('lume.js');
for(const s of [js,guild])new Function(s);
for(const m of index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))if(m[1].trim())new Function(m[1]);
assert(index.includes('bresle-ranguri.js?v=')&&index.includes('bresle-ranguri.css?v='),'assets loaded');
assert(index.includes('lume.js?v=2026.11.08-4'),'profilul din Lume este actualizat');
assert(lume.includes("typeof gsrProfileInviteButton==='function'"),'profilul jucatorilor ofera invitatie');
assert(js.includes('async function gsrInviteFromProfile('),'invitarea din profil trimite un RPC validat');
assert(guild.includes('gsrSync(force)'),'social data refreshed alongside guild');
assert(guild.includes('gsrManagementHtml(g)'),'management shown to members');
assert(guild.includes('gsrInvitationHtml()'),'invitation inbox shown to nonmembers');
assert(guild.includes('gsrRankName(m.role)'),'member roles rendered in guild list');
assert(guild.includes('gsrInboxCount()'),'unread invitations shown in header');
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',
 '33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444'];
const roster=ids.map((user_id,i)=>({user_id,name:['Lider','Ofițer','Veteran','Membru'][i],
 role:['leader','officer','veteran','member'][i],level:i*10+12}));
const incoming=[{id:13,guild_name:'Breasla <script>',guild_tag:'GX',inviter:'Căpitanul',
 expires_at:'2026-11-12T18:00:00Z'}];
const initialSocial={role:'leader',guild_id:7,members:roster,invitations:[],
 outgoing:[{id:9,name:'Candidat',inviter_id:ids[0]}],results:[]};
function environment(mode='beta',role='leader',guildMember=true){
 const CONT={booted:true,user:{id:role==='leader'?ids[0]:role==='officer'?ids[1]:ids[2]}};
 const GUILD={state:{guild:guildMember?{id:7,name:'Ordin',tag:'ORD',role,member_count:4}:null}};
 const GSR_RANKS={};void GSR_RANKS;
 const social={...initialSocial,role:guildMember?role:null,guild_id:guildMember?7:null,
   invitations:guildMember?[]:incoming};
 const element={value:'Membru'};
 const events=[],statuses=[];
 const ctx={
   ST_SERVER:mode,CONT,GUILD,
   guildEnabled:()=>mode==='beta',guildPaint:()=>events.push('paint'),
   guildSync:async()=>events.push('guildSync'),
   guildEsc:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
   tronRpc:async(method,data)=>{events.push([method,data]);return {data:method==='guild_social_api'&&data.p_action==='search'
     ?{...social,results:[{user_id:'55555555-5555-4555-8555-555555555555',name:'Jucător',level:15,invited:false}]}
     :social};},
   document:{getElementById:id=>id==='guild-search-name'?element:null},
   hdr:()=>events.push('hdr'),confirm:()=>true
 };
 const api=new Function(...Object.keys(ctx),js+
  ';return {GSR,gsrReset,gsrInboxCount,gsrCanInvite,gsrSync,gsrInvitationHtml,gsrManagementHtml,gsrAction,gsrSearch,gsrInvite,gsrRespond,gsrChangeRole,gsrTransfer,gsrKick,gsrRankName};')(...Object.values(ctx));
 api.GSR.uid=CONT.user.id;api.GSR.state=social;
 return {api,CONT,GUILD,events,element,social};
}
const leader=environment(),l=leader.api;
assert.equal(l.gsrRankName('leader'),'♛ Conducător');
assert.equal(l.gsrRankName('officer'),'⚔ Ofițer');
assert.equal(l.gsrRankName('veteran'),'✦ Veteran');
assert.equal(l.gsrRankName('member'),'Membru');
assert.equal(l.gsrCanInvite(),true);
let html=l.gsrManagementHtml(leader.GUILD.state.guild);
assert(html.includes('Invită jucători')&&html.includes('Predă conducerea'),'leader can invite and transfer');
assert((html.match(/guild-rank-select/g)||[]).length===3,'leader can change all 3 ranks');
assert((html.match(/gsrKick/g)||[]).length===3,'leader can kick nonleaders');
assert(html.includes('onchange="gsrChangeRole('),'role controls perform an action');
assert(!html.includes('onchange="gsrChangeRole('+JSON.stringify(ids[0])),'cannot change own role');
const officer=environment('beta','officer');
html=officer.api.gsrManagementHtml(officer.GUILD.state.guild);
assert(html.includes('Invită jucători'),'officer can invite');
assert(!html.includes('gsrChangeRole('),'officer cannot change ranks');
assert(!html.includes('Predă conducerea'),'officer cannot transfer');
assert.equal((html.match(/gsrKick/g)||[]).length,1,'officer can only kick regular members');
const veteran=environment('beta','veteran');
html=veteran.api.gsrManagementHtml(veteran.GUILD.state.guild);
assert(!html.includes('Invită jucători')&& !html.includes('gsrKick('),'veteran has no management');
const noGuild=environment('beta','member',false);
const inviteHtml=noGuild.api.gsrInvitationHtml();
assert(inviteHtml.includes('Acceptă')&&inviteHtml.includes('Refuză'),'incoming invitation actions');
assert(!inviteHtml.includes('<script>'),'incoming names escaped');
assert.equal(noGuild.api.gsrInboxCount(),1);
(async()=>{
 await l.gsrSearch();
 assert(l.GSR.state.results.length===1,'search returns server players');
 assert(leader.events.some(x=>Array.isArray(x)&&x[1].p_action==='search'&&x[1].p_data.query==='Membru'));
 await l.gsrInvite('55555555-5555-4555-8555-555555555555');
 assert(leader.events.some(x=>Array.isArray(x)&&x[1].p_action==='invite'));
 await l.gsrChangeRole(ids[3],'officer');
 assert(leader.events.some(x=>Array.isArray(x)&&x[1].p_action==='rank'));
 await l.gsrTransfer(ids[1]);
 assert(leader.events.some(x=>Array.isArray(x)&&x[1].p_action==='transfer'));
 await l.gsrKick(ids[3]);
 assert(leader.events.some(x=>Array.isArray(x)&&x[1].p_action==='kick'));
 await noGuild.api.gsrRespond(13,true);
 assert(noGuild.events.some(x=>Array.isArray(x)&&x[1].p_action==='accept'));
 const live=environment('live');
 assert.equal(live.api.gsrCanInvite(),false,'LIVE cannot invite players');
 assert.equal(await live.api.gsrAction('invite',{user_id:ids[3]}),null,'LIVE never sends an invite');
 console.log('OK: asynchronous invite, rank, transfer, kick, acceptance and LIVE isolation.');
})().catch(e=>{console.error(e);process.exitCode=1});
for(const term of [
 'ALTER TABLE public.guild_members DROP CONSTRAINT IF EXISTS guild_members_role_check',
 "CHECK (role IN ('leader','officer','veteran','member'))",
 'CREATE TABLE IF NOT EXISTS public.guild_invitations',
 'ENABLE ROW LEVEL SECURITY','public.is_beta_admin()',
 "v_me.role NOT IN ('leader','officer')",
 "v_me.role<>'leader'","v_target.role<>'member'",
 "v_daily>=2",
 'CREATE OR REPLACE FUNCTION public.guild_social_api',
 'REVOKE ALL ON FUNCTION public.guild_social_api(text,jsonb)',
 'GRANT EXECUTE ON FUNCTION public.guild_social_api(text,jsonb) TO authenticated',
 'LIMIT 15', 'FOR UPDATE',
]){
 if(term!=="v_daily>=2")assert(sql.includes(term),'SQL missing '+term);
}
assert(sql.includes("v_count>=20"),'guild capacity on server');
assert(sql.includes("v_count>=12"),'outgoing invitation rate limit');
assert(sql.includes("interval '7 days'"),'invitations expire');
assert(sql.includes("status='pending'"),'only pending invites actionable');
assert(!sql.includes("REVOKE ALL ON ALL SEQUENCES"),'other features unaffected');
assert(css.includes('@media(max-width:540px)'),'mobile layout');
console.log('OK: role UI, leader/officer permissions, search/invitations, SQL security checks.');
