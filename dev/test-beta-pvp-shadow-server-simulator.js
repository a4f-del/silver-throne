/* Silver Throne · BETA SQL27 deterministic shadow simulator regression.
 * node dev/test-beta-pvp-shadow-server-simulator.js
 * Static SQL assertions plus independently modeled deterministic combat.
 * Does not execute PostgreSQL and does not claim actual browser combat parity. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const sql=fs.readFileSync(path.join(__dirname,'..','supabase','27-beta-pvp-shadow-server-simulator.sql'),'utf8');
const base=fs.readFileSync(path.join(__dirname,'..','supabase','22-beta-world-shadow-combat-audit.sql'),'utf8');
const oldFinish=fs.readFileSync(path.join(__dirname,'..','supabase','24-beta-world-server-reward-reference.sql'),'utf8');

const markers=[
 'DOAR Silver-Throne-Test (BETA)',
 'CREATE TABLE IF NOT EXISTS public.beta_world_combat_simulations',
 'raid_id bigint PRIMARY KEY REFERENCES public.world_raids(id) ON DELETE CASCADE',
 "outcome text NOT NULL CHECK(outcome IN('attacker','defender','draw','unavailable'))",
 'ALTER TABLE public.beta_world_combat_simulations ENABLE ROW LEVEL SECURITY',
 'REVOKE ALL ON TABLE public.beta_world_combat_simulations',
 'CREATE OR REPLACE FUNCTION public.beta_world_combat_shadow_simulate(',
 'LANGUAGE plpgsql IMMUTABLE',
 'public.world_units_ok(p_attackers)',
 'public.world_units_ok(p_defenders)',
 'v_attacker_first := mod(p_raid_id,2)=0',
 'FOR v_round IN 1..40 LOOP',
 'v_rounds:=v_round',
 "IF v_target IS NULL THEN EXIT; END IF",
 'greatest(1,round(a_atk[v_i]-d_def[v_target]*0.35)::bigint)',
 'greatest(1,round(d_atk[v_i]-a_def[v_target]*0.35)::bigint)',
 "'rounds',v_rounds,'actions',v_actions",
 'CREATE OR REPLACE FUNCTION public.beta_world_combat_shadow_auto()',
 'AFTER INSERT ON public.beta_world_combat_shadow',
 'ON CONFLICT (raid_id) DO NOTHING',
 'CREATE OR REPLACE FUNCTION public.beta_world_combat_my_report(',
 'WHERE id=p_raid_id AND attacker=v_uid AND finished_at IS NOT NULL',
 "'is_official_result',false",
 'REVOKE ALL ON FUNCTION public.beta_world_combat_shadow_simulate(',
 'GRANT EXECUTE ON FUNCTION public.beta_world_combat_my_report(bigint)',
 'engine_private',
 'own_report_callable'
];
for(const s of markers)assert(sql.includes(s),'SQL27 missing: '+s);
for(const label of ['prereq','sim','auto','myreport']){
 assert.equal((sql.match(new RegExp('\\$'+label+'\\$','g'))||[]).length,2,'Unbalanced '+label);
}
assert.equal((sql.match(/^CREATE OR REPLACE FUNCTION\b/gm)||[]).length,3);
assert.equal((sql.match(/^CREATE TRIGGER\b/gm)||[]).length,1);
assert(!/\b(?:DROP TABLE|TRUNCATE TABLE|DELETE FROM)\b/i.test(sql),'No destructive queries');
assert(!/\b(?:INSERT INTO|UPDATE)\s+public\.(?:wallet|game_saves|world_players|world_raids|beta_economy_accounts)\b/i.test(sql),'No gameplay writes');
assert(!/CREATE OR REPLACE FUNCTION public\.(?:world_join|world_raid_start|world_raid_finish|throne_publish|guild_api)\b/i.test(sql),'No core RPC replacements');
assert(base.includes('INSERT INTO public.beta_world_combat_shadow('));
assert(oldFinish.includes('CREATE OR REPLACE FUNCTION public.world_raid_finish('));
assert(!/GRANT EXECUTE ON FUNCTION public\.beta_world_combat_shadow_simulate/i.test(sql),
 'No public simulator RPC');

function valid(us){
 return Array.isArray(us)&&us.length>=1&&us.length<=3&&us.every(u=>
  u&&['Campion','Arcaș','Paznic','Războinic','Mag','Vraci','Gardian'].includes(u.c)
  &&['hp','atk','def'].every(k=>Number.isFinite(u[k])&&u[k]>=0&&u[k]<=1e6)&&u.hp>0);
}
function simulate(attackers,defenders,id){
 if(!Number.isSafeInteger(id)||!valid(attackers)||!valid(defenders))
  return {outcome:'unavailable',rounds:0,actions:0};
 const a=attackers.map(u=>({...u,hp:Math.round(u.hp),atk:Math.round(u.atk),def:Math.round(u.def)}));
 const d=defenders.map(u=>({...u,hp:Math.round(u.hp),atk:Math.round(u.atk*1.62),def:Math.round(u.def)}));
 const first=id%2===0;
 let actions=0,rounds=0;
 for(let round=1;round<=40;round++){
  rounds=round;
  for(let phase=1;phase<=2;phase++){
   const attackTurn=(phase===1)===first;
   const us=attackTurn?a:d, them=attackTurn?d:a;
   for(let i=0;i<us.length;i++){
    if(us[i].hp<=0)continue;
    const target=them.find(u=>u.hp>0);
    if(!target)break;
    const dmg=Math.max(1,Math.round(us[i].atk-target.def*0.35));
    target.hp=Math.max(0,target.hp-dmg);actions++;
   }
  }
  if(!a.some(u=>u.hp>0)||!d.some(u=>u.hp>0))break;
 }
 const ah=a.reduce((s,u)=>s+u.hp,0),dh=d.reduce((s,u)=>s+u.hp,0);
 return {outcome:ah>0&&dh===0?'attacker':dh>0&&ah===0?'defender':'draw',
  rounds,actions,attackerHp:ah,defenderHp:dh};
}
const unit=(hp,atk,def=0)=>({n:'A',c:'Campion',hp,atk,def});
let x=simulate([unit(300,100)],[unit(60,15)],2);
assert.equal(x.outcome,'attacker');assert(x.rounds>=1);
x=simulate([unit(60,15)],[unit(300,100)],2);
assert.equal(x.outcome,'defender');
x=simulate([unit(100,200)],[unit(100,200)],2);
assert.equal(x.outcome,'attacker','even raid: attacker strikes first');
x=simulate([unit(100,200)],[unit(100,200)],3);
assert.equal(x.outcome,'defender','odd raid: defender strikes first');
x=simulate([unit(100000,0,100000)],[unit(100000,0,100000)],2);
assert.equal(x.outcome,'draw');assert.equal(x.rounds,40);assert.equal(x.actions,80);
x=simulate([unit(50,55),unit(50,55),unit(50,55)],[unit(200,0)],7);
assert(['attacker','defender','draw'].includes(x.outcome));
assert(x.actions<=240,'Max 3 fighters per phase and 40 rounds');
assert.equal(simulate([],[],4).outcome,'unavailable');
assert.equal(simulate([unit(100,1)],[unit(100,1)],NaN).outcome,'unavailable');
console.log('OK: SQL27 shadow-only PvP engine, snapshot-triggered, private, replayable; win/loss/draw and parity model.');
