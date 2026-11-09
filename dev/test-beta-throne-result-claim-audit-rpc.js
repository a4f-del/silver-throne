/* Silver Throne BETA — SQL33 audited throne finish with safe RPC fallback.
 * Run: node dev/test-beta-throne-result-claim-audit-rpc.js
 * Source checks and mocked RPC; no Supabase write / real player state.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/33-beta-throne-result-claim-audit-rpc.sql');
const index=read('index.html'),tron=read('tron.js');
for(const marker of [
 'BEGIN;','COMMIT;',
 "to_regclass('public.beta_throne_challenge_shadow')",
 "to_regclass('public.beta_throne_duel_simulations')",
 "to_regprocedure('public.throne_challenge_finish(bigint,boolean)')",
 'CREATE OR REPLACE FUNCTION public.beta_throne_challenge_finish_audited(',
 'SECURITY DEFINER SET search_path',
 'v_uid uuid := auth.uid()',
 'NOT public.is_beta_admin()',
 'WHERE c.id=p_id AND c.user_id=v_uid',
 'v_answer := public.throne_challenge_finish(p_id,p_win)',
 'IF NOT coalesce(v_was_finished,false)',
 'AND coalesce(v_now_finished,false)',
 "result_field='client_claim_via_rpc'",
 'AND reported_win IS NULL',
 "(result_field IS NULL OR result_field='unavailable')",
 'EXCEPTION WHEN OTHERS THEN',
 'REVOKE ALL ON FUNCTION public.beta_throne_challenge_finish_audited(',
 'GRANT EXECUTE ON FUNCTION public.beta_throne_challenge_finish_audited('
])assert(sql.includes(marker),'Missing SQL33 guard: '+marker);
assert(!/^\s*(?:DELETE FROM|TRUNCATE|DROP TABLE|UPDATE public\.(?:throne_challenges|throne_profiles|game_saves|beta_economy_accounts))\b/im.test(sql),'No player data mutation');
assert(!/CREATE OR REPLACE FUNCTION public\.(?:throne_challenge_start|throne_challenge_finish|throne_publish)\(/i.test(sql),'Existing challenge RPCs untouched');
assert.equal((sql.match(/^CREATE OR REPLACE FUNCTION /gm)||[]).length,1,'Only new wrapper function');
for(const tag of ['prereq','finish'])assert.equal((sql.match(new RegExp('\\$'+tag+'\\$','g'))||[]).length,2,'SQL block '+tag);
const checks=[
 'wrapper_exists','authenticated_can_call','anonymous_cannot_call',
 'shadow_table_still_private','sql31_finish_capture_preserved',
 'sql32_simulator_preserved','official_finish_preserved',
 'wrapper_has_admin_guard'
];
for(const k of checks)assert(sql.includes('AS '+k),'Missing SQL diagnostic: '+k);
assert.equal(checks.length,8);
assert(index.includes('tron.js?v=2026.11.09-4'),'New JS version must be visible in BETA');
const begin=tron.indexOf('function tronAuditFinishRpcMissing(error) {');
const end=tron.indexOf('/* ------------------------------------------------------------------ PREMII */',begin);
assert(begin>=0&&end>begin,'Audited report code exists');
const js=tron.slice(begin,end);
assert(js.includes("if (TRON.auditFinishRpc !== false)"),'Audited RPC preferred');
assert(js.includes("tronRpc('beta_throne_challenge_finish_audited', args)"),'Wrapper attempted');
assert(js.includes("tronRpc('throne_challenge_finish', args)"),'Legacy fallback preserved');
assert(js.includes('if (r.error && tronAuditFinishRpcMissing(r.error))'),'Fallback only for missing RPC');
function harness(replies) {
 const S={tron:{cur:{id:5,win:true}},tab:'r',d:null,msg:''};
 const TRON={rep:false,repErr:'',auditFinishRpc:null};
 const calls=[];let saved=0,synced=0,redraw=0;
 const fn=new Function(
 'S','TRON','tronRpc','save','tronSync','go',
 js+';return {tronReport,tronAuditFinishRpcMissing};'
 )(S,TRON,async (name,args)=>{
   calls.push([name,args]);
   const r=replies.shift();
   if(!r)throw Error('Unmocked RPC '+name);
   return r;
 },()=>{saved++},async()=>{synced++},()=>{redraw++});
 return {S,TRON,calls,fn,get saved(){return saved},get synced(){return synced},get redraw(){return redraw}};
}
(async()=>{
 let x=harness([{data:{crowned:true}}]);
 await x.fn.tronReport({id:5,win:true});
 assert.deepEqual(x.calls.map(v=>v[0]),['beta_throne_challenge_finish_audited']);
 assert.deepEqual(x.calls[0][1],{p_id:5,p_win:true});
 assert.equal(x.TRON.auditFinishRpc,true);
 assert.equal(x.S.tron.cur,null);
 assert.equal(x.saved,1);
 assert.match(x.S.msg,/Tronul de Argint/);
 assert.equal(x.TRON.rep,false);
 
 x=harness([{error:'PGRST202: Could not find the function public.beta_throne_challenge_finish_audited(p_id,p_win) in schema cache'},{data:{crowned:false,reason:'Protectie'}},{data:{crowned:false,reason:'Pauză'}}]);
 await x.fn.tronReport({id:5,win:true});
 assert.deepEqual(x.calls.map(v=>v[0]),['beta_throne_challenge_finish_audited','throne_challenge_finish']);
 assert.equal(x.TRON.auditFinishRpc,false);
 assert.equal(x.S.tron.cur,null,'Old RPC still finishes the BETA fight');
 assert.equal(x.saved,1);
 x.S.tron.cur={id:6,win:false};
 await x.fn.tronReport({id:6,win:false});
 assert.deepEqual(x.calls.map(v=>v[0]),[
   'beta_throne_challenge_finish_audited','throne_challenge_finish','throne_challenge_finish'
 ],'After a missing RPC use only the legacy finish for the rest of this page session');
})().then(async()=>{
 let x=harness([{error:'Connection reset after sending request'}]);
 await x.fn.tronReport({id:5,win:true});
 assert.deepEqual(x.calls.map(v=>v[0]),['beta_throne_challenge_finish_audited'],
   'Do not repeat an uncertainly committed result');
 assert.deepEqual(x.S.tron.cur,{id:5,win:true},'Pending report kept on network failure');
 assert.equal(x.saved,0);assert.match(x.TRON.repErr,/Connection reset/);
 x=harness([{error:'Acces BETA neautorizat.'}]);
 await x.fn.tronReport({id:5,win:false});
 assert.equal(x.calls.length,1,'No fallback on permissions failure');
 assert(x.S.tron.cur,'Denied challenge remains pending');
 x=harness([]);
 assert(x.fn.tronAuditFinishRpcMissing('PGRST202'));
 assert(x.fn.tronAuditFinishRpcMissing('function public.beta_throne_challenge_finish_audited(bigint,boolean) does not exist'));
 assert(!x.fn.tronAuditFinishRpcMissing('Permission denied'));
 assert(!x.fn.tronAuditFinishRpcMissing('Gateway timeout'));
 console.log('OK: SQL33 server guards and 8 checks, BETA audit call, safe missing-only fallback, no retry on uncertain success.');
}).catch(e=>{console.error(e);process.exitCode=1});
