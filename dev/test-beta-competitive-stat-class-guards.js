/* Silver Throne BETA / SQL28: combat publishing class stat hard guard.
 * Run: node dev/test-beta-competitive-stat-class-guards.js
 * Static SQL and JS-model tests; NOT a PostgreSQL integration test. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/28-beta-competitive-stat-class-guards.sql');
const logic=read('tron-logic.js');
const world=read('supabase/21-beta-world-competitive-hardening.sql');
const shadow=read('supabase/27-beta-pvp-shadow-server-simulator.sql');
for(const marker of [
 'Silver-Throne-Test',
 'SQL27 in BETA',
 'CREATE OR REPLACE FUNCTION public.beta_competitive_stat_bounds(',
 'CREATE OR REPLACE FUNCTION public.beta_competitive_units_within_bounds(',
 'CREATE OR REPLACE FUNCTION public.beta_competitive_world_units_guard()',
 'CREATE OR REPLACE FUNCTION public.beta_competitive_throne_units_guard()',
 'public.world_units_ok(p_units)',
 "('Campion'::text,2870,345,243)",
 "('Arcaș',1322,281,124)",
 "('Paznic',1338,228,162)",
 "('Războinic',1262,245,167)",
 "('Mag',1264,233,121)",
 "('Vraci',1164,287,160)",
 "('Gardian',1396,223,217)",
 '(c.hp::bigint * 10)',
 '(c.atk::bigint * 10)',
 '(c.def::bigint * 10)',
 'SQL28 OPRIT fara modificari',
 'BEFORE UPDATE OF units ON public.world_players',
 'BEFORE INSERT OR UPDATE OF units ON public.throne_profiles',
 'IF NEW.duel_version=2',
 'REVOKE ALL ON FUNCTION public.beta_competitive_stat_bounds(text)',
 'AS impossible_stats_rejected',
 'sql27_simulator_preserved'
])assert(sql.includes(marker),'Missing SQL28 safety condition '+marker);
for(const tag of ['prerequisites','bounds','check','preflight','worldguard','throneguard'])
 assert.equal((sql.match(new RegExp('\\$'+tag+'\\$','g'))||[]).length,2,'Invalid SQL body tags '+tag);
assert.equal((sql.match(/^CREATE OR REPLACE FUNCTION\b/gm)||[]).length,4,'Only four new helper/guard functions');
assert.equal((sql.match(/^CREATE TRIGGER\b/gm)||[]).length,2,'Only two new publish guards');
assert(!/\b(?:DROP TABLE|TRUNCATE TABLE|DELETE FROM)\b/i.test(sql),'No destructive statements');
assert(!/\b(?:UPDATE|INSERT INTO)\s+public\.(?:game_saves|wallet|world_raids|world_players|throne_profiles|beta_economy_accounts)\b/i.test(sql),'No gameplay writes');
assert(!/CREATE OR REPLACE FUNCTION public\.(?:world_join|world_raid_finish|throne_publish)\b/i.test(sql),'Cannot redefine core RPCs');
assert(world.includes('world_units_ok(p->\'units\')'));
assert(shadow.includes('beta_world_shadow_simulation_created'));
assert(logic.includes('T.CAP = {'));

const caps={
 Campion:[2870,345,243], 'Arcaș':[1322,281,124], Paznic:[1338,228,162],
 'Războinic':[1262,245,167], Mag:[1264,233,121], Vraci:[1164,287,160],
 Gardian:[1396,223,217]
};
const base=logic.slice(logic.indexOf('T.CAP = {'),logic.indexOf('};',logic.indexOf('T.CAP = {'))+2);
for(const [className,cap] of Object.entries(caps)){
 const re=new RegExp("'"+className+"'\\s*:\\s*\\{\\s*hp:\\s*(\\d+),\\s*atk:\\s*(\\d+),\\s*def:\\s*(\\d+)\\s*\\}");
 const m=base.match(re);
 assert(m,'Class cap missing '+className);
 assert.deepEqual(m.slice(1).map(Number),cap,'SQL28 must mirror T.CAP for '+className);
}
function allowed(units){
 return Array.isArray(units)&&units.length>=1&&units.length<=3&&units.every(u=>
  !!u&&Array.isArray(caps[u.c])&&['hp','atk','def'].every((k,i)=>
   typeof u[k]==='number'&&Number.isFinite(u[k])&&u[k]>=0
   &&u[k]<=1000000&&u[k]<=caps[u.c][i]*10)&&u.hp>0
 );
}
for(const [name,cap] of Object.entries(caps)){
 assert(allowed([{c:name,hp:cap[0],atk:cap[1],def:cap[2]}]),name+' standard permitted');
 assert(allowed([{c:name,hp:cap[0]*10,atk:cap[1]*10,def:cap[2]*10}]),name+' generous cap permitted');
 for(let stat=0;stat<3;stat++){
  const u={c:name,hp:cap[0],atk:cap[1],def:cap[2]};
  u[['hp','atk','def'][stat]]=cap[stat]*10+1;
  assert(!allowed([u]),name+' outrageous '+['hp','atk','def'][stat]+' rejected');
 }
}
assert(!allowed([]),'Empty party forbidden');
assert(!allowed([{c:'unknown',hp:10,atk:10,def:10}]),'Unknown class forbidden');
assert(!allowed([{c:'Campion',hp:287000,atk:34500,def:24300}]),'Million-scale spoof blocked');
assert(allowed(Array(3).fill({c:'Vraci',hp:100,atk:30,def:10})),'Three units allowed');
assert(!allowed(Array(4).fill({c:'Vraci',hp:100,atk:30,def:10})),'Four ghost units forbidden');
console.log('OK: SQL28 conservatively enforces 10x canonical class caps; preserves existing RPCs, aborts on preflight failures.');
