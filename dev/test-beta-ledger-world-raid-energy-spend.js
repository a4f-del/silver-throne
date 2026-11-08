/* Silver Throne BETA SQL26 — first verified server action in shadow ledger.
 * node dev/test-beta-ledger-world-raid-energy-spend.js
 * Static SQL checks + concurrency/idempotency model; not live PostgreSQL. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const sql=read('supabase/26-beta-ledger-world-raid-energy-spend.sql');
const world=read('supabase/02-lume.sql');
const previous=read('supabase/25-beta-authoritative-economy-ledger-foundation.sql');
const shadow=read('supabase/22-beta-world-shadow-combat-audit.sql');

const required=[
 'Silver-Throne-Test DUPA SQL21-25',
 'public.beta_economy_accounts',
 'public.beta_economy_ledger',
 'public.beta_world_combat_shadow',
 'ALTER TABLE public.beta_economy_accounts',
 'ADD COLUMN IF NOT EXISTS verified_raid_uses bigint NOT NULL DEFAULT 0',
 'ADD COLUMN IF NOT EXISTS verified_raid_uses_delta integer NOT NULL DEFAULT 0',
 "'raid_energy_verified'",
 'DROP CONSTRAINT IF EXISTS beta_economy_ledger_source_check',
 'CREATE OR REPLACE FUNCTION public.beta_economy_capture_world_raid_start()',
 "LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''",
 'auth.uid() IS DISTINCT FROM NEW.attacker',
 'public.is_beta_admin()',
 "v_key := 'world-raid-start:' || NEW.id::text",
 'WHERE user_id=NEW.attacker FOR UPDATE',
 'event_key=v_key',
 'verified_raid_uses=verified_raid_uses+1',
 "NEW.attacker,v_key,'raid_energy_verified'",
 '0,0,0,1',
 'v_account.gold,v_account.ore,v_account.xp,v_revision',
 'AFTER INSERT ON public.world_raids',
 'DROP TRIGGER IF EXISTS beta_economy_world_raid_started',
 'REVOKE INSERT, UPDATE, DELETE ON public.world_raids',
 'REVOKE ALL ON FUNCTION public.beta_economy_capture_world_raid_start()',
 'sql22_trigger_preserved',
 'direct_raid_insert_denied',
 'mutation_trigger_not_callable'
];
for(const str of required)assert(sql.includes(str),'Missing SQL26 invariant: '+str);
for(const word of ['prereq','capture'])assert.equal(
 (sql.match(new RegExp('\\$'+word+'\\$','g'))||[]).length,2);
assert.equal((sql.match(/^CREATE TRIGGER/gm)||[]).length,1);
assert(!/\b(?:DROP TABLE|TRUNCATE TABLE|DELETE FROM)\b/i.test(sql),'No reset');
assert(!/\b(?:UPDATE|INSERT INTO)\s+public\.(wallet|game_saves|world_players)\b/i.test(sql),
 'No client economy or energy mutation');
assert(!/CREATE OR REPLACE FUNCTION public\.(world_raid_start|world_raid_finish|guild_api|throne_publish)\b/i.test(sql),
 'No overwriting critical BETA RPCs');
assert(previous.includes('CONSTRAINT beta_economy_ledger_event_unique UNIQUE (user_id,event_key)'));
assert(previous.includes("state text NOT NULL DEFAULT 'shadow'"));
assert(shadow.includes('beta_world_shadow_raid_started'));
assert(world.includes('update world_players set en = v_en - 1'));
assert(world.includes('insert into world_raids (attacker, defender) values (uid, p_target)'));

// Mirror one client action: energy spent by existing server RPC, trigger only
// counts the action once, never credits gold/ore/XP.
const account={gold:0,ore:0,xp:0,revision:0,verifiedRaidUses:0}, events=new Set();
function capture(raidId,authorized=true){
 if(!authorized)throw new Error('Unauthorized');
 const key='world-raid-start:'+raidId;
 if(events.has(key))return false;
 events.add(key);
 account.verifiedRaidUses++;
 account.revision++;
 return true;
}
assert.equal(capture(3),true);
assert.equal(capture(3),false);
assert.equal(capture(4),true);
assert.throws(()=>capture(5,false));
assert.deepEqual(account,
 {gold:0,ore:0,xp:0,revision:2,verifiedRaidUses:2});
assert.equal(events.size,2);
console.log('OK: SQL26 server-backed raid spend counter, idempotent, no client credits, legacy energy unchanged.');
