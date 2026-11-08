/* Silver Throne BETA · Pas 33 / SQL37: forjare atomică SHADOW
 * node dev/test-beta-shadow-forge-atomic.js
 * Static contracts + mock transaction model only. No Supabase calls or player data. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/37-beta-shadow-forge-atomic-internal.sql');
const sql25=read('supabase/25-beta-authoritative-economy-ledger-foundation.sql');
const sql35=read('supabase/35-beta-server-item-provenance-foundation.sql');
const sql36=read('supabase/36-beta-item-replay-model.sql');
const docs=read('docs/BETA-SHADOW-FORGE-STEP33.md');
const roadmap=read('docs/ROADMAP-EXPERIENTA-JUCATORULUI.md');
const game=read('index.html');
assert(sql.includes('BEGIN;')&&sql.includes('COMMIT;'),'Migration must be transactional');
assert(sql.includes('CREATE TABLE IF NOT EXISTS public.beta_forge_shadow_materials'),'Private material wallet');
assert(sql.includes('CREATE TABLE IF NOT EXISTS public.beta_forge_shadow_operations'),'Operation log');
assert(sql.includes('PRIMARY KEY(user_id,request_id)'),'Idempotent per-user request id');
assert(sql.includes('event_ledger_id bigint NOT NULL UNIQUE'),'Exactly one ledger event');
assert(sql.includes('receipt_id uuid NOT NULL UNIQUE'),'Exactly one receipt');
assert(sql.includes('ENABLE ROW LEVEL SECURITY'),'RLS required');
assert(sql.includes('REVOKE ALL ON TABLE public.beta_forge_shadow_materials'),'Private material balances');
assert(sql.includes('REVOKE ALL ON FUNCTION public.beta_forge_shadow_commit_internal('),'No public mint endpoint');
assert(sql.includes('REVOKE ALL ON FUNCTION public.beta_forge_shadow_quote_v1('),'Quote is private');
assert(sql.includes('auth.uid() IS NOT NULL'),'Reject player context');
assert(sql.includes('public.beta_admins WHERE user_id=p_user'),'Reject nonbeta targets');
assert(sql.includes("v_account.state<>'shadow'"),'Never debit production economy');
assert(sql.includes('FOR UPDATE'),'Concurrent calls serialized by economic account lock');
assert(sql.includes("v_event_key:='forge-shadow:'||p_request_id::text"),'Idempotent event source key');
assert(sql.includes("p_user,v_event_key,'forge_verified',0,-v_ore,0"),'Atomic shadow ore debit only');
assert(sql.includes('UPDATE public.beta_forge_shadow_materials SET'),'Private material debits');
assert(sql.includes('INSERT INTO public.beta_item_provenance_receipts('),'Mint receipt from trusted economic event');
assert(sql.includes('INSERT INTO public.beta_forge_shadow_operations('),'Durable receipt-log linkage');
assert(sql.includes('IF FOUND THEN\n   IF v_previous.item_type'), 'Reject divergent replay requests');
assert(sql.includes('v_previous.receipt_id'), 'Retry uses original receipt');
assert(sql.includes("pg_catalog.gen_random_uuid()"),'Seed generated on server');
assert(sql.includes("p_type='j' AND p_rarity>0"),'Reject jewelry material mismatch');
assert(sql.includes("v_mats,'{frag}','5'::jsonb"),'Epic success requires 5 fragments');
assert(sql.includes("AS basic_quote_fixture"),'SQL costs tested in diagnostics');
assert(!/\b(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE)\s+public\.game_saves\b/i.test(sql),
 'Never migrate client save or inventory');
assert(!/\bGRANT\b\s+EXECUTE\b/i.test(sql),'No API grant');
assert(sql25.includes('CREATE OR REPLACE FUNCTION public.beta_economy_apply_internal('),'SQL25 exists');
assert(sql35.includes("v_source NOT IN ('dungeon_verified','forge_verified')"),
 'Receipt trigger accepts only trusted forge ledger source');
assert(sql36.includes('public.beta_item_replay_model_v1('),'SQL36 seed replay exists');
assert(game.includes('const cost=(l,r)=>Math.round(RAR[r].cost*(1+l*.3))'),
 'Quote must model existing ore price');
assert(game.includes('if(ok&&u.r==3)S.frag-=FE'),'Epic fragments only spent on successful forge');
assert(docs.includes('fără schimbarea jocului') && docs.includes('0 operațiuni'),
 'Doc discloses no current player effect');
assert(docs.includes('nu execută PostgreSQL'),'Doc must not imply server QA');
assert(roadmap.includes('SQL37'),'Roadmap status must include step');
const expected=[3,6,10,16];
for(const level of [1,5,10,30,100]){
 for(let rarity=0;rarity<4;rarity++){
  const quoted=Math.round(expected[rarity]*(1+level*.3));
  assert(quoted>0&&Number.isInteger(quoted));
  if(level===10&&rarity===0) assert.equal(quoted,12);
 }
}
// Reference state model: a single logical transaction serializes on account and rolls back on error.
function shadowForge(state,{key,ore,materialCosts}){
 if(state.operations.has(key))return {already:true,item:state.operations.get(key)};
 const working={ore:state.ore,materials:{...state.materials}};
 if(working.ore<ore)throw Error('insufficient ore');
 for(const [mat,qty] of Object.entries(materialCosts)){
  if((working.materials[mat]||0)<qty)throw Error('insufficient materials');
  working.materials[mat]-=qty;
 }
 working.ore-=ore;
 const item={receipt:'server-receipt-'+(state.operations.size+1),key};
 state.ore=working.ore;state.materials=working.materials;
 state.operations.set(key,item);return {already:false,item};
}
const state={ore:45,materials:{zim:8,jwf0:3},operations:new Map()};
assert.throws(()=>shadowForge(state,{key:'bad',ore:5,materialCosts:{zim:9}}));
assert.equal(state.ore,45);assert.equal(state.materials.zim,8);
const result=shadowForge(state,{key:'a',ore:12,materialCosts:{zim:2,jwf0:1}});
assert.equal(result.already,false);assert.equal(state.ore,33);
assert.equal(state.materials.zim,6);assert.equal(state.materials.jwf0,2);
assert.equal(shadowForge(state,{key:'a',ore:12,materialCosts:{zim:2,jwf0:1}}).already,true);
assert.equal(state.ore,33);assert.equal(state.operations.size,1);
assert.throws(()=>shadowForge(state,{key:'other',ore:40,materialCosts:{}}));
assert.equal(state.operations.size,1);
console.log('OK: SQL37 SHADOW private atomic forge, server seed, idempotence, materials and no player mutations (static/model only).');
