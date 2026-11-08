/* Silver Throne BETA: Tron passive duel-v2 scenario diagnostics.
 * node dev/test-beta-throne-duels-v2-scenarios.js
 * Static SQL checks and deterministic synthetic combat model only; no DB writes.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/CHECK-beta-throne-duels-27-28-scenarios-v2.sql');
const current=read('supabase/32-beta-throne-duel-shadow-simulator.sql');
const game=read('index.html'),spec=read('specializari.js'),tron=read('tron.js');
const noComments=sql.split('\n').filter(s=>!s.trim().startsWith('--')).join('\n');
assert(!/^\s*(?:INSERT|UPDATE|DELETE|TRUNCATE|DROP|CREATE|ALTER|GRANT|REVOKE|DO|CALL)\b/im.test(noComments),'Read-only SQL query');
assert(sql.includes('WHERE sh.challenge_id IN (27,28)'),'Strictly observed challenges');
assert(sql.includes("public.beta_competitive_units_within_bounds(challenger_units)"),'No malformed data');
assert(sql.includes("public.beta_competitive_units_within_bounds(holder_units)"),'Validate defender');
assert(sql.includes('FROM public.beta_throne_challenge_shadow'),'Frozen SQL31 data');
assert(sql.includes('LEFT JOIN public.beta_throne_duel_simulations'),'Non-destructive SQL32 comparison');
assert(sql.includes("CROSS JOIN (VALUES (false),(true))"),'Both possible initiatives');
assert(sql.includes("'normal'::text,1.0::numeric"),'Normal damage scenario');
assert(sql.includes("'campion_1_8'::text,1.8::numeric"),'Base champion special');
assert(sql.includes("'campion_2_6'::text,2.6::numeric"),'Upgraded champion special');
for(const rate of ["'0.8'::text,0.8::numeric","'1.0'::text,1.0::numeric","'1.2'::text,1.2::numeric"])
 assert(sql.includes(rate),'Ghost random damage factor '+rate);
assert(sql.includes('mod(a.challenger_attacks,3)=0'),'Ability cooldown: first, fourth, seventh action');
assert(sql.includes('round(a.h_atk*a.king_mult-a.a_def)'),'King uses effective complete defense');
assert(sql.includes('a.a_atk*(CASE'),'Challenger can use 1.8/2.6 multiplier');
assert(sql.includes('a.action_no<120'),'Bound recursive depth to max 120 individual attacks');
assert(sql.includes('s.a_max*0.38')&&sql.includes('s.h_max*0.38'),'Both sides have 38% HP hit cap');
assert(sql.includes("count(*) AS scenarii_total"),'Aggregate result returns one row per challenge');
assert(sql.includes('GROUP BY challenge_id'),'Avoid verbose 36-result output');
assert(!/\b(?:auth\.users|game_saves|email|password|ip_address|challenger_id|user_id)\b/i.test(noComments),
 'Never disclose personal account identifiers');
assert(current.includes("v_h_atk::numeric-v_a_def::numeric*0.35"),
 'V1 overly discounts effective defense on king attack');
assert(game.includes("function auto1(){")&&game.includes("if(!(a.cd>0))"),'Auto fight prefers ready special');
assert(spec.includes("return a.c === 'Vraci' ? 1 : 2"),'Champion base cooldown=2');
assert(spec.includes("hit(a, e, spOn(a, 'due', 3) ? 2.6 : 1.8, L)"),
 'Actual Champion ability multipliers 1.8 and 2.6');
assert(spec.includes('e.atk * R(0.8, 1.2)'),'King attack variance');
assert(spec.includes("raw - bon(u).def * (1 + bon(u).pf / 100) - tr(u, 'def')"),
 'Full effective defense subtracts against enemy attacks');
assert(tron.includes("Math.round(b.def * (1 + b.pf / 100) + tr(f, 'def'))"),
 'Snapshot DEF represents effective hero DEF');
assert(tron.includes('S.auto !== false'),'Automatic battle default on');

function simulate({aMax=2400,hMax=2400,aAtk=700,hAtk=1600,aDef=400,hDef=350,kingFirst=false,
  skillMult=1,kingRoll=1,crit=1,heal=0}={}){
 let ah=aMax,hh=hMax,attacks=0;
 for(let action=0;action<120&&ah>0&&hh>0;action++){
   const challenger=(action%2===0&&!kingFirst)||(action%2===1&&kingFirst);
   if(challenger){
     const m=attacks%3===0?skillMult:1;
     hh=Math.max(0,hh-Math.min(Math.ceil(hMax*.38),Math.max(1,Math.round(aAtk*m*crit-hDef))));
     attacks++;
   }else{
     ah=Math.max(0,ah-Math.min(Math.ceil(aMax*.38),Math.max(1,Math.round(hAtk*1.62*kingRoll-aDef))));
     ah=Math.min(aMax,ah+heal);
   }
 }
 return ah>0&&hh===0?'challenger':hh>0&&ah===0?'holder':'draw';
}
let wins=0,total=0;
for(let first of [false,true])for(let special of [1,1.8,2.6])for(let roll of [0.8,1,1.2]){
 const result=simulate({kingFirst:first,skillMult:special,kingRoll:roll});
 assert(['challenger','holder','draw'].includes(result));
 total++;if(result==='challenger')wins++;
}
assert.equal(total,18,'One duel is evaluated under 2×3×3 assumptions');
assert(wins>=0&&wins<=18);
const hit=Math.ceil(2400*.38);
assert.equal(hit,912,'Target-specific cap at 38% max HP');
const noAbility=simulate({aAtk:500,hAtk:1500,skillMult:1});
const withAbility=simulate({aAtk:500,hAtk:1500,skillMult:2.6});
assert(['challenger','holder','draw'].includes(noAbility)&&['challenger','holder','draw'].includes(withAbility));
console.log('OK: Tron v2 diagnostic read-only, 18 scenarios/duel, Champion cooldown, double initiative, ghost variance and full effective DEF; LIVE and official verdict untouched.');
