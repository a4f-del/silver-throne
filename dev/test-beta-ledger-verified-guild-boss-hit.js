/* Silver Throne BETA / step33 / SQL34
 * node dev/test-beta-ledger-verified-guild-boss-hit.js
 * Model and static checks only; does NOT connect to Supabase/PostgreSQL. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/34-beta-ledger-verified-guild-boss-hit.sql');
const base=read('supabase/25-beta-authoritative-economy-ledger-foundation.sql');
const raid=read('supabase/26-beta-ledger-world-raid-energy-spend.sql');
const guild=read('supabase/19-beta-guild-boss-formation-roles.sql');
const roadmap=read('docs/ROADMAP-EXPERIENTA-JUCATORULUI.md');
const docs=read('docs/BETA-LEDGER-VERIFIED-GUILD-BOSS-STEP33.md');
assert(sql.includes('BEGIN;')&&sql.includes('COMMIT;'),'Atomic migration');
assert(sql.includes("to_regprocedure('public.guild_api(text,jsonb)')"),'Require existing guild endpoint');
assert(sql.includes("tgname='beta_economy_world_raid_started'"),'Depend on SQL26');
assert(sql.includes("NOT EXISTS (\n      SELECT 1 FROM public.guild_members"),'Require membership at trigger time');
assert(sql.includes('NEW.user_id IS DISTINCT FROM v_uid'),'Check auth.uid against actual event owner');
assert(sql.includes("OR NOT public.is_beta_admin()"),'Require BETA admin');
assert(sql.includes("NEW.week_start IS DISTINCT FROM"),'Validate guild week');
assert(sql.includes("NEW.local_day IS DISTINCT FROM"),'Validate local day');
assert(sql.includes('NEW.damage<=0'),'Reject invalid contributions');
assert(sql.includes("AFTER INSERT ON public.guild_boss_hits"),'Capture only created server boss hits');
assert(sql.includes("v_key := 'guild-boss-hit:' || NEW.id::text"),'Use server-issued hit ID');
assert(sql.includes('ON CONFLICT(user_id) DO NOTHING')&&sql.includes('FOR UPDATE'),
 'Account insertion and serialised per-player updates');
assert(sql.includes('AND event_key=v_key'),'Duplicate event check');
assert(sql.includes("verified_guild_boss_hits=verified_guild_boss_hits+1"),'Accumulate only verified actions');
assert(sql.includes("verified_guild_boss_hit_delta"),'Preserve immutable event delta');
assert(sql.includes("NEW.user_id,v_key,'guild_boss_hit_verified',0,0,0"),'Zero economic credits');
assert(sql.includes('REVOKE ALL ON FUNCTION public.beta_economy_capture_guild_boss_hit()'),
 'Never expose direct RPC');
assert(sql.includes("NOT has_table_privilege('authenticated','public.guild_boss_hits','INSERT')"),
 'Require guild rows protected from direct client writes');
assert(sql.includes('AS sql26_trigger_preserved'),'Do not replace SQL26');
assert(!/CREATE OR REPLACE FUNCTION public.guild_api/.test(sql),'Do not overwrite guild gameplay RPC');
for(const source of [
 'migration','admin_adjustment','dungeon_verified','pvp_verified','forge_verified',
 'market_verified','throne_verified','raid_energy_verified','guild_boss_hit_verified'
])assert(sql.includes("'"+source+"'"),'Missing ledger source '+source);
assert(base.includes('beta_economy_ledger_event_unique'),'Account and event unique constraint');
assert(raid.includes('CREATE TRIGGER beta_economy_world_raid_started'),'Original event capture exists');
assert(guild.includes('INSERT INTO public.guild_boss_hits('),'Guild inserts verified hit');
assert(guild.includes('WHERE user_id=v_uid AND local_day=v_day'),'Guild enforces daily cap');
assert(guild.includes('v_daily>=2'),'Existing two hits/day preserved');
assert(!/\b(?:UPDATE|DELETE|TRUNCATE)\s+public\.(?:game_saves|guild_weeks|guild_participation|guild_members|world_players)\b/i.test(sql),
 'Migration must not modify game save or guild progress tables');
assert(docs.includes('nu că eroul deține realmente echipamentul'),'Document provenance limitation');
assert(docs.includes('manual')&&docs.includes('Silver-Throne-Test'),'Manual BETA only');
assert(roadmap.includes('34-beta-ledger-verified-guild-boss-hit.sql'),'Roadmap documents SQL34');

// Reference-model invariants, not a database execution:
function newShadowState(){return {rev:0,hits:0,events:new Set(),gold:0,xp:0,ore:0};}
function acceptedHit(state,{id,actor,user,guildMember=true,damage=100,dayOk=true,weekOk=true,beta=true}){
 if(!beta||!actor||actor!==user||!guildMember||damage<=0||!dayOk||!weekOk)
  throw new Error('rejected');
 const key='guild-boss-hit:'+id;
 if(state.events.has(key))return false;
 state.events.add(key);state.hits++;state.rev++;
 return true;
}
let a=newShadowState();
assert.equal(acceptedHit(a,{id:44,actor:'u1',user:'u1'}),true);
assert.equal(acceptedHit(a,{id:44,actor:'u1',user:'u1'}),false);
assert.equal(a.hits,1);assert.equal(a.rev,1);
for(const invalid of [
 {id:45,actor:'u2',user:'u1'},
 {id:45,actor:null,user:'u1'},
 {id:45,actor:'u1',user:'u1',guildMember:false},
 {id:45,actor:'u1',user:'u1',damage:0},
 {id:45,actor:'u1',user:'u1',dayOk:false},
 {id:45,actor:'u1',user:'u1',weekOk:false},
 {id:45,actor:'u1',user:'u1',beta:false}
]){
 assert.throws(()=>acceptedHit(a,invalid));
 assert.equal(a.hits,1);
}
assert.equal(a.gold,0);assert.equal(a.xp,0);assert.equal(a.ore,0);
assert.equal(acceptedHit(a,{id:46,actor:'u1',user:'u1'}),true);
assert.equal(a.hits,2);
console.log('OK: SQL34 BETA guild boss hit idempotency, auth, shadow event and zero credits; model only, SQL QA still required.');
