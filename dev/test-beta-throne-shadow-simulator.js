/* Silver Throne BETA — SQL32 Throne duel passive baseline simulator.
 * Run: node dev/test-beta-throne-shadow-simulator.js
 * Tests only source code and a deterministic reference model, not PostgreSQL.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=x=>fs.readFileSync(path.join(__dirname,'..',x),'utf8');
const sql=read('supabase/32-beta-throne-duel-shadow-simulator.sql');
const shadow=read('supabase/31-beta-throne-duel-shadow-audit.sql');
const duel=read('tron-logic.js');
const tron=read('tron.js');
for(const marker of [
 'BEGIN;','COMMIT;',
 'CREATE TABLE IF NOT EXISTS public.beta_throne_duel_simulations',
 'challenge_id bigint PRIMARY KEY',
 'REFERENCES public.beta_throne_challenge_shadow(challenge_id) ON DELETE CASCADE',
 'ALTER TABLE public.beta_throne_duel_simulations ENABLE ROW LEVEL SECURITY',
 'REVOKE ALL ON TABLE public.beta_throne_duel_simulations',
 'CREATE OR REPLACE FUNCTION public.beta_throne_duel_simulate_baseline(',
 'CREATE OR REPLACE FUNCTION public.beta_throne_duel_shadow_auto()',
 'p_challenger jsonb, p_holder jsonb, p_challenge_id bigint',
 'IF p_challenge_id IS NULL OR p_challenge_id<=0',
 'IF jsonb_typeof(p_challenger) IS DISTINCT FROM \'array\'',
 'IF jsonb_array_length(p_challenger)<>1',
 'public.beta_competitive_units_within_bounds(p_challenger)',
 'public.beta_competitive_units_within_bounds(p_holder)',
 "v_h_atk:=greatest(1,round((v_h->>'atk')::numeric*1.62)::bigint)",
 "v_a_cap:=greatest(1,ceil(v_a_max::numeric*0.38)::bigint)",
 "v_h_cap:=greatest(1,ceil(v_h_max::numeric*0.38)::bigint)",
 'v_challenger_first:=(mod(p_challenge_id,2)=0)',
 'FOR v_round IN 1..60 LOOP',
 'v_actions:=v_actions+1',
 'ON CONFLICT(challenge_id) DO NOTHING',
 'EXCEPTION WHEN OTHERS THEN',
 'AFTER INSERT ON public.beta_throne_challenge_shadow',
 'REVOKE ALL ON FUNCTION public.beta_throne_duel_simulate_baseline(',
 "to_regclass('public.beta_throne_duel_simulations')"
])assert(sql.includes(marker),'Missing SQL32 security/model detail: '+marker);
assert.equal((sql.match(/^CREATE OR REPLACE FUNCTION /gm)||[]).length,2,'Only 2 audit functions');
assert.equal((sql.match(/^CREATE TRIGGER /gm)||[]).length,1,'Only new simulation trigger');
for(const q of ['prereq','sim','auto'])
 assert.equal((sql.match(new RegExp('\\$'+q+'\\$','g'))||[]).length,2,'Complete body: '+q);
assert(!/^\s*(?:DELETE FROM|TRUNCATE|DROP TABLE|UPDATE public\.(?:throne_challenges|throne_profiles|game_saves|beta_economy_accounts))\b/im.test(sql),'No player writes');
assert(!/CREATE OR REPLACE FUNCTION public\.(?:throne_challenge_start|throne_challenge_finish|throne_publish)\b/i.test(sql),'Official RPCs not replaced');
assert(!/GRANT (?:ALL|SELECT|INSERT|UPDATE|DELETE|EXECUTE)\b[\s\S]*? TO authenticated/i.test(sql),'No grants on private data');
assert(sql.includes("'outcome','unavailable'"),'Guard path is not fake win/loss');
assert(shadow.includes('CREATE TRIGGER beta_throne_shadow_challenge_started'),'SQL31 snapshot parent');
assert(duel.includes('duelHitCapPct: 0.38'),'38% reflects client');
assert(duel.includes('ghostAtkMult: 1.62'),'King ghost multiplier reflects client');
assert(tron.includes('TT.duelKingStarts()'),'Real initiative RNG, so baseline must be labelled non-official');
assert(!sql.includes('WHEN (OLD.finished'),'Never hook an official win decision');

function predict(a,h,id){
 if(!a||!h||!id||id<=0)return {outcome:'unavailable',win:null,rounds:0,actions:0};
 let ah=a.hp,hh=h.hp,ac=Math.ceil(ah*.38),hc=Math.ceil(hh*.38),acts=0,round=0;
 const first=id%2===0;
 for(let r=1;r<=60;r++){
  round=r;
  for(let phase=1;phase<=2;phase++){
   const challenger=(phase===1&&first)||(phase===2&&!first);
   if(challenger){hh=Math.max(0,hh-Math.min(hc,Math.max(1,Math.round(a.atk-h.def*.35))))}
   else {ah=Math.max(0,ah-Math.min(ac,Math.max(1,Math.round(h.atk*1.62-a.def*.35))))}
   acts++;
   if(ah===0||hh===0)break;
  }
  if(ah===0||hh===0)break;
 }
 const outcome=ah>0&&hh===0?'challenger':hh>0&&ah===0?'holder':'draw';
 return {outcome,win:outcome==='draw'?null:outcome==='challenger',rounds:round,actions:acts,ah,hh};
}
const hero={hp:2000,atk:400,def:200},king={hp:1500,atk:150,def:100};
let x=predict(hero,king,2);assert.equal(x.outcome,'challenger');assert(x.actions<=120);
x=predict(king,hero,2);assert.equal(x.outcome,'holder');
assert.equal(predict(hero,null,2).outcome,'unavailable','Royal Guard cannot use fabricated stats');
x=predict({hp:2000,atk:400,def:200},{hp:2000,atk:400/1.62,def:200},2);
assert(x.rounds<=60&&x.actions<=120,'Simulation has bounded runtime');
const diagnostics=[
 'throne_simulations_table_exists','simulation_rls_enabled',
 'simulations_private','simulator_trigger_active',
 'sql31_snapshot_trigger_preserved','simulator_function_private',
 'clear_challenger_case','clear_holder_case'
];
for(const k of diagnostics)assert(sql.includes('AS '+k),'Missing SQL test '+k);
assert.equal(diagnostics.length,8);
console.log('OK: SQL32 passive Throne baseline, capped turns/HP, phantom king distinction, RLS, idempotent trigger, 8 checks, no LIVE changes.');
