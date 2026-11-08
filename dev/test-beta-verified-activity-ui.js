/* Silver Throne BETA / step33 / SQL40 end-to-end verified action UI.
 * node dev/test-beta-verified-activity-ui.js
 * No real users/DB; executes UI with fake RPC responses. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/40-beta-verified-activity-status-rpc.sql');
const ui=read('bresle.js');
const html=read('index.html');
const doc=read('docs/BETA-VERIFIED-ACTIVITY-UI-STEP33.md');
const roadmap=read('docs/ROADMAP-EXPERIENTA-JUCATORULUI.md');
const sql34=read('supabase/34-beta-ledger-verified-guild-boss-hit.sql');
const sql26=read('supabase/26-beta-ledger-world-raid-energy-spend.sql');
for(const part of [
 'BEGIN;', 'COMMIT;',
 'CREATE OR REPLACE FUNCTION public.beta_verified_activity_status()',
 'RETURNS jsonb',
 'STABLE SECURITY DEFINER SET search_path',
 "v_user uuid:=auth.uid()",
 "auth.role() IS DISTINCT FROM 'authenticated'",
 'NOT public.is_beta_admin()',
 'WHERE a.user_id=v_user',
 'FROM public.beta_economy_ledger l',
 'WHERE l.user_id=v_user',
 "l.source='guild_boss_hit_verified'",
 "l.source='raid_energy_verified'",
 'l.verified_guild_boss_hit_delta=1',
 'l.verified_raid_uses_delta=1',
 "l.event_key LIKE 'guild-boss-hit:%'",
 "l.event_key LIKE 'world-raid-start:%'",
 'v_ledger_boss=v_counter_boss',
 'v_ledger_raids=v_counter_raids',
 "'authoritative_for_game',false",
 'REVOKE ALL ON FUNCTION public.beta_verified_activity_status()',
 'GRANT EXECUTE ON FUNCTION public.beta_verified_activity_status()',
 'TO authenticated',
 'AS anon_status_denied',
 'AS direct_ledger_read_denied',
 'AS sql34_boss_trigger_preserved',
 'AS sql26_raid_trigger_preserved'
])assert(sql.includes(part),'Missing safe server contract: '+part);
assert(!/\b(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE|CREATE TABLE|DROP TABLE)\b/i.test(
 sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.beta_verified_activity_status()'),
  sql.indexOf('REVOKE ALL ON FUNCTION'))),'Status RPC must never mutate');
assert(!/\bp_user\b|\bp_data\b/i.test(sql),'Client never picks account or event');
assert(sql34.includes('CREATE TRIGGER beta_economy_guild_boss_hit_created'),
 'SQL34 boss hit ledger source exists');
assert(sql26.includes('CREATE TRIGGER beta_economy_world_raid_started'),
 'SQL26 verified raid start source exists');
assert(ui.includes("await tronRpc('beta_verified_activity_status',{})"),
 'Guild UI reads only verified RPC, with no client parameters');
assert(ui.includes('await guildVerifiedSync(force)'),'Guild sync includes server verified status');
assert(ui.includes("if(state&&typeof guildVerifiedSync==='function')await guildVerifiedSync(true)"),
 'Real boss action refreshes status');
assert(ui.includes('guildVerifiedHtml()+'),'Display inside guild panel');
assert(ui.includes('verifiedUnavailable=false'),'State resets on account switch');
assert(ui.includes('GUILD.verified=null;GUILD.verifiedAt=0'),'No bleed between accounts');
assert(html.includes('bresle.js?v=2026.11.08-7'),'New JS asset loaded');
assert(doc.includes('nu reprezintă nivelul, XP-ul'),'No false claim of XP validation');
assert(roadmap.includes('SQL40'),'Roadmap documents first vertical slice');
const begin=ui.indexOf('async function guildVerifiedSync(');
const end=ui.indexOf('function guildPaint(){',begin);
assert(begin>=0&&end>begin,'Extract verified module');
const source=ui.slice(begin,end);

const status=(boss,raids,consistent=true)=>({
 ready:true,mode:'audit',authoritative_for_game:false,
 verified_boss_hits:boss,verified_raid_starts:raids,consistent
});
async function run(){
 const GUILD={state:{guild:{id:3}},uid:'first',verified:null,verifiedAt:0,
  verifiedBusy:false,verifiedUnavailable:false,verifiedError:''};
 const CONT={user:{id:'first'}};
 let calls=0,paints=0,response={data:status(2,5)};
 const document={getElementById:id=>id==='guild-view'?{}:null};
 const api=new Function('GUILD','CONT','guildEnabled','tronRpc','guildEsc',
   'document','guildPaint',source+';return {guildVerifiedSync,guildVerifiedHtml};')(
     GUILD,CONT,()=>true,async(fn,args)=>{
       assert.equal(fn,'beta_verified_activity_status');
       assert.deepEqual(args,{});
       calls++;return await response;
     },s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),
     document,()=>paints++
   );
 await api.guildVerifiedSync(true);
 assert.equal(calls,1);
 assert.equal(GUILD.verified.verified_boss_hits,2);
 assert(api.guildVerifiedHtml().includes('Lovituri la boss înregistrate: <b>2</b>'));
 assert(api.guildVerifiedHtml().includes('Raiduri începute: <b>5</b>'));
 assert(api.guildVerifiedHtml().includes('Nu confirmă victoria, XP-ul, nivelul sau echipamentul'));
 await api.guildVerifiedSync(false);
 assert.equal(calls,1,'Respect 60s refresh limit');
 response={data:status(3,5,false)};
 await api.guildVerifiedSync(true);
 assert.equal(calls,2);
 assert(api.guildVerifiedHtml().includes('nu se aplică sancțiuni'));
 response={error:'PGRST202 Could not find function'};
 await api.guildVerifiedSync(true);
 assert.equal(GUILD.verifiedUnavailable,true);
 const called=calls;
 await api.guildVerifiedSync(true);
 assert.equal(calls,called,'No repeated requests on missing migration');
 GUILD.verifiedUnavailable=false;
 GUILD.verified=null;
 response={data:status('<img onerror=alert(1)>',1)};
 await api.guildVerifiedSync(true);
 assert(!api.guildVerifiedHtml().includes('<img'),'Invalid RPC data never interpolated');
 GUILD.verified=null;
 let release;
 response=new Promise(resolve=>{release=resolve;});
 const pending=api.guildVerifiedSync(true);
 CONT.user.id='second';GUILD.uid='second';GUILD.verified=null;
 release({data:status(999,999)});
 await pending;
 assert.equal(GUILD.verified,null,'Never leak previous account status after switch');
 assert(paints>=1,'Render after status response');
}
run().then(()=>console.log('OK: SQL40 server-ledger-only BETA activity RPC, safe own-user UI, errors, backoff, no XP claims (static/mock; DB QA needed).')).catch(e=>{console.error(e);process.exitCode=1;});
