/* Silver Throne BETA SQL22 shadow combat audit.
 * Static assertions only: does not execute PostgreSQL. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', '22-beta-world-shadow-combat-audit.sql'), 'utf8');
for (const s of [
  'EXCLUSIV Supabase Silver-Throne-Test',
  'CREATE TABLE IF NOT EXISTS public.beta_world_combat_shadow',
  'ALTER TABLE public.beta_world_combat_shadow ENABLE ROW LEVEL SECURITY',
  'REVOKE ALL ON TABLE public.beta_world_combat_shadow FROM PUBLIC, anon, authenticated',
  'AFTER INSERT ON public.world_raids',
  'AFTER UPDATE OF finished_at ON public.world_raids',
  'ON CONFLICT(raid_id) DO NOTHING',
  'WHEN (OLD.finished_at IS NULL AND NEW.finished_at IS NOT NULL)',
  'DROP TRIGGER IF EXISTS beta_world_shadow_raid_started',
  'DROP TRIGGER IF EXISTS beta_world_shadow_raid_finished',
  "SET search_path = ''"
]) assert(sql.includes(s), 'Missing guard: '+s);
assert(!/\b(TRUNCATE TABLE|DELETE FROM|DROP TABLE)\b/i.test(sql));
assert(!/CREATE OR REPLACE FUNCTION public\.(world_join|world_raid_start|world_raid_finish|throne_publish|throne_challenge_finish|guild_api)\b/i.test(sql));
assert(!/\bUPDATE public\.(world_players|world_raids|throne_state|game_saves)\b/i.test(sql));
assert.equal((sql.match(/CREATE TRIGGER/g)||[]).length,2);
function score(a,b) {
 const def=b.reduce((s,u)=>s+u.def,0)/b.length;
 return a.reduce((s,u)=>s+u.hp,0)*a.reduce((s,u)=>s+Math.max(1,u.atk-def),0);
}
function estimate(a,b) {
 const x=score(a,b),y=score(b,a),r=x/y;
 return !Number.isFinite(r)?'insufficient_data':r>=1.8?'attacker_favored':r<=0.5?'defender_favored':'contested';
}
const a=[{hp:1000,atk:110,def:40}],b=[{hp:3000,atk:350,def:100}];
assert.equal(estimate(a,a),'contested');
assert.equal(estimate(b,a),'attacker_favored');
assert.equal(estimate(a,b),'defender_favored');
console.log('OK: SQL22 private BETA audit and no gameplay mutation; scoring model sanity.');
