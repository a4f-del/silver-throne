/* Silver Throne BETA — pas 33: audit și controale conservative la intrarea în competiție.
 * node dev/test-beta-competition-trust-guards.js
 * Static SQL + model numeric, NU test PostgreSQL autentic. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/21-beta-world-competitive-hardening.sql');
const oldWorld=read('supabase/02-lume.sql'),oldThrone=read('supabase/06-tron-duel-1v1.sql');
const js=read('lume.js'),tron=read('tron.js'),logic=require('../tron-logic.js');
assert(sql.trim().endsWith('throne_publish_exists;'));
assert(sql.includes('BEGIN;')&&sql.includes('COMMIT;'));
assert(!/\b(DROP TABLE|TRUNCATE TABLE|DELETE FROM public\.(world|throne))\b/i.test(sql));
for(const marker of [
 'CREATE TABLE IF NOT EXISTS public.beta_world_publish_audit',
 'CREATE TABLE IF NOT EXISTS public.beta_world_result_audit',
 'ALTER TABLE public.beta_world_publish_audit ENABLE ROW LEVEL SECURITY',
 'ALTER TABLE public.beta_world_result_audit ENABLE ROW LEVEL SECURITY',
 'REVOKE ALL ON TABLE public.beta_world_publish_audit',
 'create or replace function public.world_join(p jsonb)',
 'create or replace function public.world_raid_finish(p_id bigint, p_win boolean, p_gold int, p_xp int)',
 'CREATE OR REPLACE FUNCTION public.throne_publish(',
 'public.is_beta_admin()',
 'if not world_units_ok(p->\'units\')',
 "jsonb_array_elements(p->'units')",
 '6*(u.unit->>\'atk\')::numeric',
 '10*(u.unit->>\'def\')::numeric',
 'power       = greatest(0,least(100000000,v_derived))::int',
 'v_claimed<>v_derived',
 'ON CONFLICT(user_id) DO UPDATE',
 'ON CONFLICT(raid_id) DO NOTHING',
 'for update',
 'reported_win',
 'accepted_gold',
 'accepted_xp',
 'v_gold:=greatest(0,least(v_gold_cap,coalesce(p_gold,0)))',
 'v_xp:=greatest(0,least(v_xp_cap,coalesce(p_xp,0)))',
 "p_ghost ->> 'v' is distinct from '2'",
 'hp > 1000000 or atk > 1000000 or def > 1000000',
 'REVOKE ALL ON FUNCTION public.throne_publish(text,integer,jsonb)',
 'GRANT EXECUTE ON FUNCTION public.throne_publish(text,integer,jsonb) TO authenticated'
])assert(sql.includes(marker),'Missing security guard: '+marker);
assert.equal((sql.match(/create or replace function/gi)||[]).length,3,
 'Only World publish/finish and Throne publish may be replaced');
assert.equal((sql.match(/\$\$/g)||[]).length,4,'Two World PL/pgSQL bodies complete');
assert.equal((sql.match(/\$function\$/g)||[]).length,2,'Throne body complete');
assert(!sql.includes('CREATE OR REPLACE FUNCTION public.throne_challenge_finish'),
 'Server-side Throne result cannot be forged as solved without engine');
assert(oldWorld.includes('perform world_close_stale(uid);'), 'World raid start still handles stale raids');
assert(!sql.includes('CREATE OR REPLACE FUNCTION public.world_raid_start'),
 'Existing attack cooldown and protection must stay unchanged');
assert(sql.includes('Client still declares the battle winner'),
 'Trust boundary must be documented inside migration');
assert(oldWorld.includes("power       = greatest(0, least(100000000, coalesce((p->>'power')::numeric, 0)::int))"),
 'Original World accepted advertised power directly');
assert(oldThrone.includes('hp > 2147483647'),'Tron original cap was only int32');

// TT.power is sum(hp + 6 atk + 10 def), independent of client-supplied "power".
const party=[
 {n:'Erou',c:'Campion',hp:1750,atk:220,def:180},
 {n:'Vraci',c:'Vraci',hp:850,atk:111,def:80}
];
const computed=party.reduce((sum,u)=>sum+u.hp+6*u.atk+10*u.def,0);
assert.equal(logic.power(party),computed);
assert.equal(computed,7186);
assert.notEqual(computed,99999999,'Forged client power cannot dictate leaderboard power');
// Caps are only outlier bounds on *reported* amounts, not verified loot.
function bound(attackerLevel,defenderLevel,gold,xp) {
 const A=Math.max(1,Math.min(500,attackerLevel)),D=Math.max(1,Math.min(500,defenderLevel));
 const level=Math.min(D,A+5),factor=Math.max(.3,Math.min(1.2,D/A));
 const maxGold=Math.ceil((60+30*level)*factor*6+500);
 const maxXp=Math.ceil((20+8*level)*factor*1.5*4+200);
 return {gold:Math.max(0,Math.min(maxGold,gold)),xp:Math.max(0,Math.min(maxXp,xp)),
         maxGold,maxXp};
}
const normal=bound(25,30,700,450);
assert.equal(normal.gold,700);assert.equal(normal.xp,450);
const evil=bound(25,30,10000000,10000000);
assert(evil.gold<20000&&evil.xp<10000,'No arbitrary 10m payout in server log');
const zero=bound(10,5,-100,-42);assert.equal(zero.gold,0);assert.equal(zero.xp,0);
assert(sql.includes('v_gold_cap:=ceil((60+30*v_level)*v_factor*6+500)::int;'));
assert(sql.includes('v_xp_cap:=ceil((20+8*v_level)*v_factor*1.5*4+200)::int;'));
assert(js.includes("p_win: !!c.win")&&tron.includes("p_win: !!cur.win"),
 'Client-declared outcomes still exist, not falsely marked verified');
// BETA-only SQL: Live schema and client workflows are unchanged.
assert(sql.includes('NU LIVE')&&sql.includes('Supabase Silver-Throne-Test'));
console.log('OK: server-derived displayed power, logged client mismatch, bounded raid report, stricter Throne cap, RLS; victory still unverified.');
