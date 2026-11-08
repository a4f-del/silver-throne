/* Silver Throne BETA / Pas 33 — audit regression for Tron mismatches 27, 28.
 * Run: node dev/test-beta-throne-combat-parity-gaps.js
 * This is STATIC + SYNTHETIC proof of model gap, not a real-player combat replay.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql32=read('supabase/32-beta-throne-duel-shadow-simulator.sql');
const query=read('supabase/CHECK-beta-throne-duels-27-28-parity.sql');
const game=read('index.html'),special=read('specializari.js'),logic=read('tron-logic.js');
const sqlNoComments=query.split('\n').filter(line=>!line.trim().startsWith('--')).join('\n');
assert(!/^\s*(?:UPDATE|INSERT|DELETE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|CALL|DO)\b/im.test(sqlNoComments),
 'Duels 27/28 inspection must not mutate the database');
assert(!/\b(?:auth\.users|game_saves|throne_profiles|email|password|user_id|challenger_id|holder_id|units->>'n')\b/i.test(sqlNoComments),
 'Query must not expose account identifiers, gear or character names');
assert(query.includes('WHERE sh.challenge_id IN (27,28)'),'Only the two observed duels');
assert(query.includes('challenge_id+1'),'Flipped parity must test opposite initiative');
assert(query.includes('public.beta_throne_duel_simulate_baseline('),'Re-use SQL32 pure engine');
assert(query.includes('campion_abilitate_1_8_fara_crit'),'Explicit basic Campion special');
assert(query.includes('campion_abilitate_2_6_fara_crit'),'Explicit upgraded Campion special');
assert(query.includes('provocator_lovitura_normala_sql32'));
assert(query.includes('rege_lovitura_motor_medie'));
assert(query.includes('rege_lovitura_sql32'));
assert(query.includes('CASE WHEN a IS NOT NULL AND h IS NOT NULL'),'Malformed/null snapshots must be guarded');
assert(sql32.includes("v_h_atk::numeric-v_a_def::numeric*0.35"),
 'SQL32 reduces king damage by only 35% of challenger DEF');
assert(sql32.includes("v_a_atk::numeric-v_h_def::numeric*0.35"),
 'SQL32 likewise simplifies attack against king');
assert(special.includes('raw - bon(u).def * (1 + bon(u).pf / 100) - tr(u, \'def\')'),
 'Real king attack subtracts effective defender DEF, not 35%');
assert(special.includes("hit(a, e, spOn(a, 'due', 3) ? 2.6 : 1.8, L)"),
 'Real Campion special is 1.8 or 2.6 times attack');
assert(game.includes('step(auto1())'),'Automatic fight can use abilities');
assert(logic.includes('duelHitCapPct: 0.38'),'38% cap is shared');
assert(logic.includes('ghostAtkMult: 1.62'),'King attack multiplier shared');

// Synthetic duel illustrates why a 3-round SQL32 holder verdict can disagree
// with a client victory. Values are invented and not user data.
const a={hp:1600,atk:600,def:450},h={hp:1900,atk:480,def:150};
const capA=Math.ceil(a.hp*.38),capH=Math.ceil(h.hp*.38);
function play(kingFirst,realistic){
 let ah=a.hp,hh=h.hp,rounds=0;
 const hAtk=Math.round(h.atk*1.62);
 for(let i=0;i<20&&ah>0&&hh>0;i++){
   rounds=i+1;
   const phases=kingFirst?['king','challenger']:['challenger','king'];
   for(const turn of phases){
     if(turn==='king'){
       const raw=Math.round(hAtk-(realistic?a.def:a.def*.35));
       ah=Math.max(0,ah-Math.min(capA,Math.max(1,raw)));
     }else{
       const raw=Math.round(a.atk*(realistic?1.8:1)-h.def*(realistic?1:.35));
       hh=Math.max(0,hh-Math.min(capH,Math.max(1,raw)));
     }
     if(!ah||!hh)break;
   }
 }
 return {winner:ah>0?'challenger':'holder',rounds};
}
assert.equal(play(true,false).winner,'holder');
assert.equal(play(false,false).winner,'holder');
assert.equal(play(true,true).winner,'challenger');
assert.equal(play(false,true).winner,'challenger');
assert.equal(play(true,false).rounds,3,'SQL32 can favor holder in three rounds');
assert.notEqual(play(true,false).winner,play(true,true).winner,
 'Defensive coefficients and skills can reverse predicted winner without fraud');
console.log('OK: mismatch 27/28 diagnostic read-only; verified real vs SQL32 formula gaps; 3-round synthetic disagreement without cheating.');
