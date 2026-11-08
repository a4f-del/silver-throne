/* Silver Throne BETA: SQL31 passive Throne duel audit.
 * Run: node dev/test-beta-throne-duel-shadow-audit.js
 * No database, network, game accounts or player save writes.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/31-beta-throne-duel-shadow-audit.sql');
const baseline=read('supabase/06-tron-duel-1v1.sql');
const guards=read('supabase/28-beta-competitive-stat-class-guards.sql');
const index=read('index.html'),tron=read('tron.js');

for(const marker of [
 'BEGIN;','COMMIT;',
 "to_regclass('public.throne_challenges')",
 "to_regprocedure('public.throne_challenge_finish(bigint,boolean)')",
 'CREATE TABLE IF NOT EXISTS public.beta_throne_challenge_shadow',
 'challenge_id bigint PRIMARY KEY',
 'REFERENCES public.throne_challenges(id) ON DELETE CASCADE',
 'challenger_id uuid NOT NULL','holder_id uuid',
 'challenger_units jsonb','holder_units jsonb',
 'challenger_score numeric','holder_score numeric',
 "estimate text NOT NULL DEFAULT 'insufficient_data'",
 'ALTER TABLE public.beta_throne_challenge_shadow ENABLE ROW LEVEL SECURITY',
 'REVOKE ALL ON TABLE public.beta_throne_challenge_shadow',
 'CREATE OR REPLACE FUNCTION public.beta_throne_shadow_on_start()',
 'CREATE OR REPLACE FUNCTION public.beta_throne_shadow_on_finish()',
 'FROM public.throne_profiles WHERE user_id=NEW.user_id',
 'FROM public.throne_profiles WHERE user_id=NEW.holder_at_start',
 "public.beta_competitive_units_within_bounds(v_a_units)",
 "public.beta_competitive_units_within_bounds(v_h_units)",
 'ON CONFLICT(challenge_id) DO NOTHING',
 'AFTER INSERT ON public.throne_challenges',
 'AFTER UPDATE OF finished ON public.throne_challenges',
 'WHEN (OLD.finished IS DISTINCT FROM TRUE AND NEW.finished IS TRUE)',
 "v_row jsonb := to_jsonb(NEW)",
 "result_field=coalesce(v_key,'unavailable')",
 'WHERE challenge_id=NEW.id AND completed_at IS NULL',
 'EXCEPTION WHEN OTHERS THEN',
 'reported_win boolean','result_field text',
 'capture_functions_private','original_throne_rpcs_preserved',
 'shadow_not_readable_by_clients','sql28_throne_guard_preserved'
])assert(sql.includes(marker),'SQL31 missing: '+marker);
assert.equal((sql.match(/^CREATE OR REPLACE FUNCTION /gm)||[]).length,2,'Only two passive triggers');
assert.equal((sql.match(/^CREATE TRIGGER /gm)||[]).length,2,'Start and finish trigger pair');
for(const tag of ['prereq','start','finish'])
 assert.equal((sql.match(new RegExp('\\$'+tag+'\\$','g'))||[]).length,2,tag+' SQL body delimiters');
assert(!/^\s*(?:DELETE FROM|TRUNCATE|DROP TABLE|UPDATE public\.(?:throne_challenges|throne_profiles|game_saves|beta_economy_accounts))\b/im.test(sql),'No player data writes');
assert(!/CREATE OR REPLACE FUNCTION public\.(?:throne_challenge_start|throne_challenge_finish|throne_publish)\b/i.test(sql),'Official challenge RPCs untouched');
assert(!/GRANT (?:ALL|SELECT|INSERT|UPDATE|DELETE|EXECUTE)\b[\s\S]*? TO authenticated/i.test(sql),'No exposure of audit to user');
assert(sql.includes('v_est := \'royal_guard\''),'No holder means royal guard, not a fabricated opponent');
assert(!sql.includes('reported_win NOT NULL'),'Outcome must remain NULL when the server schema exposes no boolean win');
assert(!sql.includes('reported_win=v_est'),'Estimate must never become an official verdict');
assert(baseline.includes('if exists (select 1 from public.throne_challenges where user_id = v_uid and not finished'),'Challenge schema has finished boolean');
assert(baseline.includes('holder_at_start'),'Start stores a holder snapshot reference');
assert(guards.includes("CREATE TRIGGER beta_competitive_throne_units_limits"),'SQL28 bounds remain mandatory');
assert(tron.includes('const args = { p_id: cur.id, p_win: !!cur.win }') && tron.includes("tronRpc('throne_challenge_finish', args)") && tron.includes("tronRpc('beta_throne_challenge_finish_audited', args)"),'Client reports result through SQL33 audit wrapper with legacy fallback; passive SQL31 audit remains relevant');
assert(index.includes('tron.js?v='),'Tron JS still loaded');

const resultChecks=[
 'throne_shadow_exists','shadow_rls_enabled','shadow_not_readable_by_clients',
 'throne_start_capture_active','throne_finish_capture_active',
 'capture_functions_private','sql28_throne_guard_preserved',
 'original_throne_rpcs_preserved'
];
for(const k of resultChecks)assert(sql.includes('AS '+k),'Missing post-install check '+k);
assert.equal(resultChecks.length,8);

// Model only: scores are independent from client-reported outcome.
function snapshot(attacker,holder,completed=false,reportedWin=null){
 const shape=u=>u&&Array.isArray(u.units)&&u.units.length===1&&
  ['Campion','Arcaș','Paznic','Războinic','Mag','Vraci','Gardian'].includes(u.units[0].c);
 let estimate='insufficient_data',a=null,d=null;
 if(!holder)estimate='royal_guard';
 else if(shape(attacker)&&shape(holder)&&attacker.version===2&&holder.version===2){
   const x=attacker.units[0],y=holder.units[0];
   const as=x.hp*Math.max(1,Math.round(x.atk*1.62)-Math.round(y.def*.35));
   const ds=y.hp*Math.max(1,Math.round(y.atk*1.62)-Math.round(x.def*.35));
   if(ds>0){a=as;d=ds;estimate=as/ds>=1.8?'challenger_favored':as/ds<=.55?'holder_favored':'contested';}
 }
 return {estimate,challenger_score:a,holder_score:d,reported_win:completed?reportedWin:null};
}
const king={version:2,units:[{c:'Campion',hp:1000,atk:150,def:100}]};
const stronger={version:2,units:[{c:'Campion',hp:3000,atk:350,def:150}]};
const weaker={version:2,units:[{c:'Campion',hp:300,atk:80,def:60}]};
assert.equal(snapshot(stronger,king).estimate,'challenger_favored');
assert.equal(snapshot(weaker,king).estimate,'holder_favored');
assert.equal(snapshot(stronger,null).estimate,'royal_guard');
assert.equal(snapshot({version:1,units:[{c:'Campion'}]},king).estimate,'insufficient_data');
assert.equal(snapshot(stronger,king,true,false).reported_win,false,'Never override reported loss with favorable estimate');
assert.equal(snapshot(stronger,king,true,null).reported_win,null,'Unknown result remains unknown');
console.log('OK: SQL31 captures frozen 1v1 Tron profiles with private RLS and passive outcome audit; challenge, rewards and LIVE untouched.');
