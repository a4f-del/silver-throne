/* Silver Throne BETA: SQL25 server-only economic ledger.
 * Run: node dev/test-beta-authoritative-economy-ledger.js
 * Static SQL assertions + deterministic ledger state model; no PostgreSQL access. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/25-beta-authoritative-economy-ledger-foundation.sql');
const save=read('cont.js');
const wallet=read('portofel.js');
const prereqs=['beta_save_progress_audit','beta_world_reward_reference','game_saves','is_beta_admin'];
for(const name of prereqs)assert(sql.includes(name),'Missing BETA prerequisite: '+name);
for(const s of [
 'CREATE TABLE IF NOT EXISTS public.beta_economy_accounts',
 'CREATE TABLE IF NOT EXISTS public.beta_economy_ledger',
 'CONSTRAINT beta_economy_ledger_event_unique UNIQUE (user_id,event_key)',
 'ALTER TABLE public.beta_economy_accounts ENABLE ROW LEVEL SECURITY',
 'ALTER TABLE public.beta_economy_ledger ENABLE ROW LEVEL SECURITY',
 'REVOKE ALL ON TABLE public.beta_economy_accounts',
 'REVOKE ALL ON SEQUENCE public.beta_economy_ledger_id_seq',
 'CREATE OR REPLACE FUNCTION public.beta_economy_apply_internal(',
 "LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''",
 'p_event_key IS NULL',
 'FOR UPDATE',
 'IF FOUND THEN',
 'Cheie economica refolosita cu alte valori',
 "'already',true,'revision',v_account.revision",
 "'event_revision',v_old.revision",
 'v_account.gold::numeric+v_dg NOT BETWEEN 0 AND 1000000000000',
 'v_account.ore::numeric+v_do NOT BETWEEN 0 AND 1000000000000',
 'v_account.xp::numeric+v_dx NOT BETWEEN 0 AND 1000000000000',
 'CREATE OR REPLACE FUNCTION public.beta_economy_status()',
 'WHERE user_id=v_uid',
 "'authoritative_for_game',false",
 'REVOKE ALL ON FUNCTION public.beta_economy_apply_internal(',
 'NOT has_function_privilege(',
 'mutation_not_exposed',
 'own_status_callable'
])assert(sql.includes(s),'SQL25 guard missing '+s);
assert.equal((sql.match(/^CREATE OR REPLACE FUNCTION/gm)||[]).length,2);
for(const name of ['prerequisites','apply','status'])assert.equal(
 (sql.match(new RegExp('\\$'+name+'\\$','g'))||[]).length,2,'Unpaired '+name);
assert(!/\b(TRUNCATE TABLE|DROP TABLE|DELETE FROM)\b/i.test(sql),'Destructive SQL');
assert(!/\b(UPDATE|INSERT INTO)\s+public\.(game_saves|wallet|world_players|world_raids)\b/i.test(sql),
 'Cannot mutate existing game state');
assert(!/\bGRANT EXECUTE ON FUNCTION public\.beta_economy_apply_internal\b/i.test(sql),
 'No client access to credit/debit RPC');
assert(!/\bSELECT.*game_data.*FROM public\.game_saves\b/i.test(sql),
 'Never seed from arbitrary client snapshot');
assert(save.includes("supabaseClient.from('game_saves').upsert("),
 'Old saves remain client-owned');
assert(wallet.includes("tronRpc('wallet_sync'"),
 'Old wallet still accepts client totals; SQL25 is not yet the live wallet');

// Model idempotent, serialized operations: same event cannot mint twice.
const account={gold:0,ore:0,xp:0,revision:0}, events=new Map();
function apply(key,source,g,o,x){
 assert(key.length>=3 && key.length<=120);
 assert(['migration','admin_adjustment','dungeon_verified','pvp_verified',
  'forge_verified','market_verified','throne_verified'].includes(source));
 const a=[g,o,x],prior=events.get(key);
 if(prior){
  assert.deepEqual(prior.payload,[source,...a],'Event key collision changed payload');
  return {...account,already:true,eventRevision:prior.revision};
 }
 assert(a.some(n=>n!==0),'Empty transaction');
 for(const [k,d] of [['gold',g],['ore',o],['xp',x]]){
  const next=account[k]+d;
  if(next<0||next>1000000000000)throw new Error('Insufficient or excessive balance');
 }
 for(const [k,d] of [['gold',g],['ore',o],['xp',x]])account[k]+=d;
 account.revision++;
 events.set(key,{payload:[source,...a],revision:account.revision});
 return {...account,already:false};
}
assert.deepEqual(apply('mig:1','migration',200,30,25),
 {gold:200,ore:30,xp:25,revision:1,already:false});
assert.deepEqual(apply('forge:1','forge_verified',-50,-10,0),
 {gold:150,ore:20,xp:25,revision:2,already:false});
const replay=apply('mig:1','migration',200,30,25);
assert.equal(replay.already,true);
assert.equal(replay.eventRevision,1);
assert.equal(replay.revision,2);
assert.equal(replay.gold,150,'Replay must return CURRENT balance');
assert.equal(events.size,2,'Replay does not mint twice');
assert.throws(()=>apply('mig:1','migration',9999,30,25));
assert.throws(()=>apply('forge:2','forge_verified',-1000,0,0));
assert.deepEqual(account,{gold:150,ore:20,xp:25,revision:2});
console.log('OK: SQL25 BETA isolated server ledger, private mutation, current-balance replay, non-negative and stable legacy wallet.');
