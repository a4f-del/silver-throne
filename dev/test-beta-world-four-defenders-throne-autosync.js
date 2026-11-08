/* Silver Throne BETA — SQL30 + auto-publication integration checks.
 * node dev/test-beta-world-four-defenders-throne-autosync.js
 * Test static + scripted JS; NOT live PostgreSQL. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/30-beta-world-four-unit-defense.sql');
const world=read('lume.js'),throne=read('tron.js'),index=read('index.html');
const get=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert(i>=0&&j>i,'Missing '+a);return s.slice(i,j)};
for(const marker of [
 'SQL28 (limitele per clasa)',
 'CREATE OR REPLACE FUNCTION public.world_units_ok(u jsonb)',
 'jsonb_array_length(u)>4',
 'IF NEW.level >= 30 THEN',
 'BEFORE UPDATE OF units, level ON public.world_players',
 'beta_competitive_world_units_limits',
 'beta_world_shadow_simulation_created',
 'DROP CONSTRAINT IF EXISTS beta_world_combat_simulations_actions_count_check',
 'CHECK (actions_count BETWEEN 0 AND 320)',
 'world_accepts_four_units','world_rejects_five_units',
 'level_30_slot_guard_active','sql28_class_limits_preserved',
 'sql27_simulator_preserved','simulator_four_unit_limit','level_guard_private'
])assert(sql.includes(marker),'SQL30 missing: '+marker);
for(const label of ['prereq','units','size'])assert.equal(
 (sql.match(new RegExp('\\$'+label+'\\$','g'))||[]).length,2);
assert(sql.includes('v_max_units integer := 3;') && sql.includes('v_max_units := 4;'),
 'SQL30 must precompute the level-specific squad size');
assert(sql.includes('jsonb_array_length(NEW.units) > v_max_units THEN'),
 'Do not use CASE ... END THEN in the PL/pgSQL trigger IF condition');
assert(!sql.includes('CASE WHEN NEW.level>=30 THEN 4 ELSE 3 END THEN'),
 'Regression: avoid SQLSTATE 42601 at trigger IF');
assert(!sql.includes('world_units_ok(p_units jsonb)'), 'Original PostgreSQL argument name u must be preserved');
assert(!sql.includes('DROP FUNCTION public.world_units_ok'), 'Do not drop functions with dependent policies/RPCs');
assert.equal((sql.match(/^CREATE OR REPLACE FUNCTION\b/gm)||[]).length,2);
assert.equal((sql.match(/^CREATE TRIGGER\b/gm)||[]).length,1);
assert(!/\b(?:DELETE FROM|TRUNCATE TABLE|DROP TABLE)\b/i.test(sql),'No reset');
assert(!/CREATE OR REPLACE FUNCTION public\.(?:world_join|world_raid_start|world_raid_finish|throne_publish)\b/i.test(sql),'Do not override production RPCs');
assert(!/\b(?:INSERT INTO|UPDATE)\s+public\.(?:world_raids|wallet|game_saves|throne_profiles)\b/i.test(sql));
assert(throne.includes('tronIsBetaDuel() ? 4 : TT.CFG.maxUnits'),'BETA full active party');
assert(world.includes('TT.throneDuelUnit(u) : TT.ghostUnit(u)'),'BETA world does not impose level-40 cap');
assert(world.includes('lwAutoPublishSoon()'),'World republish scheduling');
assert(index.includes("if(typeof tronAutoPublishSoon==='function')tronAutoPublishSoon()"));
assert(index.includes("if(typeof lwAutoPublishSoon==='function')lwAutoPublishSoon()"));
assert(throne.includes('function tronAutoPublishNow()'));
assert(throne.includes('function tronAutoSnapshot()'));
assert(throne.includes("TRON.pubSig = sig"),'Only successful publication updates signature');
assert(throne.includes('TRON.pubFailAt'),'Errors back off');
assert(throne.includes("tronIsBetaDuel() ? '' : '<button onclick="),'Manual Throne button hidden in BETA only');
assert(throne.includes('!CONT.booted'),'Wait for a logged-in and booted account');
assert(index.includes('tron.js?v=2026.11.08-4'));
assert(index.includes('lume.js?v=2026.11.08-5'));

const testSquad=get(throne,'function tronTeamUnits() {','function tronDuelRestore()');
const makeSquad=server=>new Function('S','TT','bon','mhp','atkOf','tr','tronIsBetaDuel',
 testSquad+';return {tronTeamUnits,tronUnits};')(
 {fs:[
  {h:1,n:'Erou',c:'Campion',hp:100},
  {n:'Paznic',c:'Paznic',hp:80},
  {n:'Arcas',c:'Arcaș',hp:70},
  {n:'Vraci',c:'Vraci',hp:65}
 ]},{CFG:{maxUnits:3}},()=>({def:10,pf:0}),f=>f.hp,()=>30,()=>0,()=>server==='beta'
);
let beta=makeSquad('beta'),live=makeSquad('live');
assert.equal(beta.tronTeamUnits().length,4,'BETA World has 4 defenders');
assert.equal(live.tronTeamUnits().length,3,'LIVE remains 3 defenders');
assert.equal(beta.tronUnits().length,1,'BETA throne remains hero-only');
assert.equal(live.tronUnits().length,3,'LIVE throne remains unchanged');

const part=get(throne,'function tronAutoSnapshot() {','/* ------------------------------------------------------------------ LUPTA */');
const S={lvl:50,fs:[{h:true,n:'Erou',hp:100}],d:null,tron:{cur:null}};
const CONT={booted:true,user:{id:'beta-test-user'}};
const TRON={pubSig:'',pubFlight:null,pubTimer:null,pubFailAt:0,pubError:'',pubAt:0};
let stats=100,writes=0;
const auto=new Function('TRON','S','CONT','TT','tronIsBetaDuel',
 'tronUnits','tronPublish','tronUi','setTimeout','clearTimeout','Date',
 part+';return {tronAutoSnapshot,tronAutoPublishNow,tronAutoPublishSoon};')(
 TRON,S,CONT,{CFG:{minLevel:10}},()=>true,
 ()=>[{n:'Erou',c:'Campion',hp:stats,atk:40,def:8}],
 async()=>{writes++;return true},()=>{},()=>0,()=>{},Date);
(async()=>{
 assert.equal(await auto.tronAutoPublishNow(),true);
 assert.equal(writes,1,'First login publishes automatically');
 assert.equal(await auto.tronAutoPublishNow(),true);
 assert.equal(writes,1,'Unchanged gear must not republish');
 stats=150;
 assert.equal(await auto.tronAutoPublishNow(),true);
 assert.equal(writes,2,'Equipment-derived stats republish');
 S.d={tron:true};
 assert.equal(await auto.tronAutoPublishNow(),false,'No publish during battle');
 S.d=null;
 S.lvl=51;
 assert.equal(await auto.tronAutoPublishNow(),true);
 assert.equal(writes,3,'Level progression republished');
 CONT.user.id='other-player';
 assert.equal(await auto.tronAutoPublishNow(),true);
 assert.equal(writes,4,'A new account has its own publication signature');
 console.log('OK: SQL30 4 defenders, level 30 guard, 320 simulator actions, automatic BETA Throne updates; LIVE isolated.');
})().catch(e=>{console.error(e);process.exitCode=1;});
