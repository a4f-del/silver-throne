/* Silver Throne BETA pas 28 — cosmetice și regresii sociale.
 * node dev/test-beta-guild-cosmetics-social.js
 * Simulare locală RPC și structură SQL; nu accesează Supabase. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/20-beta-guild-cosmetics.sql'),js=read('bresle-cosmetice.js'),
 guild=read('bresle.js'),css=read('bresle-cosmetice.css'),
 html=read('index.html'),social=read('bresle-ranguri.js'),
 mail=read('world-mail.js'),friends=read('world-friends.js');
for(const script of [js,guild,social,mail,friends])new Function(script);
for(const part of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(part[1].trim())new Function(part[1]);
for(const piece of [
 'BEGIN;','COMMIT;','ALTER TABLE public.guilds',
 'CREATE TABLE IF NOT EXISTS public.guild_cosmetic_unlocks',
 'ENABLE ROW LEVEL SECURITY','REVOKE ALL ON TABLE public.guild_cosmetic_unlocks',
 'CREATE OR REPLACE FUNCTION public.guild_cosmetic_catalog()',
 'CREATE OR REPLACE FUNCTION public.guild_cosmetics_api(',
 "v_uid uuid := auth.uid()","public.is_beta_admin()",
 "v_me.role NOT IN ('leader','officer')",
 'SELECT c.cost INTO v_price FROM public.guild_cosmetic_catalog() c',
 'marks=marks-v_price','marks>=v_price',
 'INSERT INTO public.guild_cosmetic_unlocks',
 "v_action IN ('buy','equip')",
 'GRANT EXECUTE ON FUNCTION public.guild_cosmetics_api(text,jsonb) TO authenticated',
 'REVOKE ALL ON FUNCTION public.guild_cosmetics_api(text,jsonb) FROM PUBLIC'
])assert(sql.includes(piece),'Missing SQL safety check: '+piece);
assert(sql.includes("WHERE user_id=v_uid FOR UPDATE"),'Member row locked before purchase');
assert(sql.includes("WHERE id=v_me.guild_id FOR UPDATE"),'Guild row locked before purchase');
assert(sql.includes('WHERE u.guild_id=v_g.id AND u.kind=v_kind AND u.variant=v_variant'),
 'Unlocks are scoped to authenticated guild membership');
assert(sql.includes("v_kind='emblem'")&&sql.includes("v_kind='banner'")&&sql.includes("v_kind='frame'"));
assert(sql.includes("'owned',c.cost=0 OR EXISTS("),'Server owns unlock inventory');
assert(sql.includes("'selected',jsonb_build_object("),'Selected cosmetics returned by server');
assert(!sql.includes('damage=')&&!sql.includes('boss_hp=')&&!sql.includes('power='),'Cosmetics cannot grant combat power');
assert((sql.match(/CREATE OR REPLACE FUNCTION/g)||[]).length===2);
assert((sql.match(/\$catalog\$/g)||[]).length===2);
assert((sql.match(/\$cosmetics\$/g)||[]).length===2);
assert(sql.trim().endsWith('COMMIT;'));
assert(html.includes('bresle-cosmetice.js?v=2026.11.08-1'));
assert(html.includes('bresle-cosmetice.css?v=2026.11.08-1'));
assert(html.includes('bresle.js?v=2026.11.08-6'));
assert(guild.includes('guildCosmeticsSync(force)')&&guild.includes('guildCosmeticsSection(g)')&&
 guild.includes('guildCosmeticBadge(g.id)'), 'Shop wired into main guild UI');
assert(css.includes('.gc-preview')&&css.includes('.gc-frame-gold')&&css.includes('.gc-banner-forest'));

// Social infrastructure remains present, separate from the cosmetic shop.
assert(guild.includes('gsrInboxCount()')&&guild.includes('gsrInvitationHtml()'));
assert(social.includes("p_action:'invite'")||social.includes("gsrAction('invite'"));
assert(social.includes("p_action:'status'"));
assert(mail.includes('WM.unread')&&mail.includes('wmBadge()'));
assert(friends.includes('wf-badge')&&friends.includes('wfUpdateBadge()'));

function mock(server='beta',role='leader'){
 const CONT={booted:true,user:{id:'user-1'}},GUILD={state:{guild:{id:7,tag:'ORD',name:'Ordin',role}}};
 const calls=[],messages=[],base=[
  {kind:'emblem',variant:'shield',label:'Scutul breslei',cost:0,owned:true},
  {kind:'emblem',variant:'sun',label:'Soarele de Argint',cost:15,owned:false},
  {kind:'emblem',variant:'wolf',label:'Lupul de Fier',cost:25,owned:false},
  {kind:'banner',variant:'ash',label:'Cenușiu',cost:0,owned:true},
  {kind:'banner',variant:'forest',label:'Verde de Codru',cost:15,owned:false},
  {kind:'frame',variant:'bronze',label:'Ramă de Bronz',cost:0,owned:true},
  {kind:'frame',variant:'silver',label:'Ramă de Argint',cost:15,owned:false}
 ];
 let state={guild_id:7,role,balance:40,can_manage:role==='leader'||role==='officer',
  selected:{emblem:'shield',banner:'ash',frame:'bronze'},catalog:base};
 let unavailable=false,paints=0,headers=0,syncs=0;
 const tronRpc=async (name,args)=>{
  calls.push([name,args]);
  if(unavailable)return {error:'Could not find the function guild_cosmetics_api'};
  if(name!=='guild_cosmetics_api')return {error:'Unexpected RPC'};
  if(args.p_action==='status')return {data:state};
  if(!state.can_manage)return {error:'Fără drepturi'};
  const {kind,variant}=args.p_data;
  const match=state.catalog.find(x=>x.kind===kind&&x.variant===variant);
  if(!match)return {error:'Aspect necunoscut'};
  if(args.p_action==='buy'&&(!match.owned)&&state.balance>=match.cost){
   state={...state,balance:state.balance-match.cost,
    selected:{...state.selected,[kind]:variant},
    catalog:state.catalog.map(x=>x===match?{...x,owned:true}:x)};
  }else if(args.p_action==='equip'&&match.owned){
   state={...state,selected:{...state.selected,[kind]:variant}};
  }else return {error:'Fără însemne sau deblocare'};
  return {data:state};
 };
 const ctx={ST_SERVER:server,CONT,GUILD,tronRpc,
  guildEnabled:()=>server==='beta',
  guildEsc:x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  guildPaint:()=>paints++,hdr:()=>headers++,guildSync:async()=>syncs++,
  document:{getElementById:()=>({})}};
 const api=new Function(...Object.keys(ctx),js+
  ';return {GCOS,guildCosmeticReset,guildCosmeticsSync,guildCosmeticBadge,'+
  'guildCosmeticsSection,guildCosmeticAction};')(...Object.values(ctx));
 return {api,GUILD,CONT,calls,messages,getState:()=>state,
  getPaints:()=>paints,getHeaders:()=>headers,getSyncs:()=>syncs,
  setUnavailable:x=>unavailable=x};
}
async function main(){
 const x=mock();await x.api.guildCosmeticsSync(true);
 assert.equal(x.api.GCOS.state.balance,40);
 let page=x.api.guildCosmeticsSection(x.GUILD.state.guild);
 assert(page.includes('Atelierul breslei'));
 assert(page.includes('Embleme (3)')&&page.includes('Steaguri (2)')&&page.includes('Rame (2)'));
 assert(page.includes('Însemne personale: <b>40</b>'));
 assert(page.includes('Deblochează și folosește · 15 însemne'));
 assert(page.includes('gc-banner-ash')&&page.includes('gc-frame-bronze'));
 assert(page.includes('guildCosmeticAction(&quot;buy&quot;,&quot;emblem&quot;,&quot;sun&quot;)'));
 assert(!page.includes('onmouseover='));
 assert(x.api.guildCosmeticBadge(7).includes('🛡'));
 await x.api.guildCosmeticAction('buy','emblem','sun');
 assert.equal(x.api.GCOS.state.balance,25,'Personal marks deducted exactly once');
 assert.equal(x.api.GCOS.state.selected.emblem,'sun','Purchase auto-equips');
 assert(x.api.guildCosmeticBadge(7).includes('☀'));
 assert.equal(x.getSyncs(),1,'Main guild marks refreshed');
 await x.api.guildCosmeticAction('buy','emblem','wolf');
 assert.equal(x.api.GCOS.state.balance,0,'Second unlock subtracts correct price');
 await x.api.guildCosmeticAction('buy','frame','silver');
 assert.equal(x.api.GCOS.state.balance,0,'Insufficient funds cannot spend');
 assert(x.api.GCOS.notice.includes('însemne')||x.api.GCOS.notice.includes('deblocare'));
 await x.api.guildCosmeticAction('equip','emblem','shield');
 assert.equal(x.api.GCOS.state.selected.emblem,'shield','Default can always be selected');
 await x.api.guildCosmeticAction('equip','emblem','sun');
 assert.equal(x.api.GCOS.state.selected.emblem,'sun','Previously unlocked item reusable free');
 const count=x.calls.length;
 await x.api.guildCosmeticAction('buy','emblem','<script>');
 assert.equal(x.calls.length,count,'Invalid variant refused client-side');
 const v=mock('beta','veteran');await v.api.guildCosmeticsSync(true);
 const memberHtml=v.api.guildCosmeticsSection(v.GUILD.state.guild);
 assert(memberHtml.includes('Doar conducătorul și ofițerii'));
 assert(!memberHtml.includes('Deblochează și folosește · 15 însemne</button>')||
   memberHtml.includes(' disabled'),'Members cannot use purchase controls');
 const memberCalls=v.calls.length;
 await v.api.guildCosmeticAction('buy','emblem','sun');
 assert.equal(v.calls.length,memberCalls,'Veteran cannot invoke purchase');
 const live=mock('live');await live.api.guildCosmeticsSync(true);
 assert.equal(live.api.guildCosmeticsSection(live.GUILD.state.guild),'','LIVE has no shop');
 assert.equal(live.calls.length,0,'LIVE makes no new cosmetics RPC calls');
 const gone=mock();gone.setUnavailable(true);
 await gone.api.guildCosmeticsSync(true);
 assert(gone.api.GCOS.unavailable,'SQL20 absence is tolerated');
 assert(gone.api.guildCosmeticsSection(gone.GUILD.state.guild).includes('SQL 20'));
 assert(x.getPaints()>0&&x.getHeaders()>0,'UI refreshes after successful action');
 console.log('OK: guild cosmetics BETA catalog, purchases, marks, role checks, no LIVE, SQL guarded, guild invites/mail/friends preserved.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
