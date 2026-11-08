/* Silver Throne BETA / Step 33 / SQL38
 * node dev/test-beta-boss-shadow-material-provenance.js
 * Static SQL contract and model simulation, NO DATABASE / real players. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/38-beta-guild-boss-shadow-material-provenance.sql');
const sql34=read('supabase/34-beta-ledger-verified-guild-boss-hit.sql');
const sql37=read('supabase/37-beta-shadow-forge-atomic-internal.sql');
const doc=read('docs/BETA-BOSS-SHADOW-MATERIAL-PROVENANCE-STEP33.md');
const roadmap=read('docs/ROADMAP-EXPERIENTA-JUCATORULUI.md');
assert(sql.includes('BEGIN;')&&sql.includes('COMMIT;'),'Install is transactional');
assert(sql.includes('CREATE TABLE IF NOT EXISTS public.beta_forge_shadow_material_grants'),'Private event provenance');
assert(sql.includes('event_ledger_id bigint PRIMARY KEY'),'One grant per ledger event');
assert(sql.includes("CHECK (material_code='cal')"),'Only fixed material allowed');
assert(sql.includes('CHECK (quantity=1)'),'Exactly 1 per boss hit');
assert(sql.includes('ALTER TABLE public.beta_forge_shadow_material_grants ENABLE ROW LEVEL SECURITY'),'RLS');
assert(sql.includes('REVOKE ALL ON TABLE public.beta_forge_shadow_material_grants'),'No client table permissions');
assert(sql.includes('REVOKE ALL ON FUNCTION public.beta_forge_shadow_reconcile_boss_materials_internal(integer)'),'No client RPC');
assert(sql.includes('auth.uid() IS NOT NULL'),'Reject player-context RPC');
assert(sql.includes("coalesce(auth.role(),'') NOT IN ('','service_role')"),'Reject browser roles');
assert(sql.includes('p_limit NOT BETWEEN 1 AND 100'),'Bound backfill attempts');
assert(sql.includes('JOIN public.guild_boss_hits h'),'Server-only action provenance');
assert(sql.includes("l.event_key=('guild-boss-hit:'||h.id::text)"),'No caller-supplied event id');
assert(sql.includes('AND h.user_id=l.user_id'),'Proven same action owner');
assert(sql.includes("l.source='guild_boss_hit_verified'"),'Accept only SQL34 source');
assert(sql.includes('l.verified_guild_boss_hit_delta=1'),'Accept only verified server counter');
assert(sql.includes("l.gold_delta=0 AND l.ore_delta=0 AND l.xp_delta=0"),'No monetary event used');
assert(sql.includes("a.state='shadow'"),'Ignore non-shadow economies');
assert(sql.includes('FOR UPDATE OF l SKIP LOCKED'),'Concurrent replay protection');
assert(sql.includes('WHERE user_id=v_event.user_id FOR UPDATE'),'Serialize with SQL37 account');
assert(sql.includes('ON CONFLICT(event_ledger_id) DO NOTHING'),'Idempotency');
assert(sql.includes('GET DIAGNOSTICS v_new=ROW_COUNT'),'Skip double-credit on retry');
assert(sql.includes("VALUES (v_event.id,v_event.user_id,'cal',1)"),'Only fixed shadow grant');
assert(sql.includes("VALUES (v_event.user_id,'cal',1)"),'Only fixed shadow balance credit');
assert(sql.includes('balance=public.beta_forge_shadow_materials.balance+1'),'Only 1 material');
assert(!/\b(?:UPDATE|DELETE FROM|TRUNCATE|INSERT INTO)\s+public\.(?:game_saves|guild_boss_hits|guild_participation|guild_weeks|beta_economy_ledger|beta_item_provenance_receipts)\b/i.test(sql),'Do not alter existing gameplay');
assert(!/CREATE\s+TRIGGER\b/i.test(sql),'No trigger may interrupt boss attacks');
assert(!/\bGRANT\s+EXECUTE\b/i.test(sql),'No public RPC');
assert(sql34.includes('CREATE TRIGGER beta_economy_guild_boss_hit_created'),'Source is SQL34');
assert(sql37.includes('CREATE TABLE IF NOT EXISTS public.beta_forge_shadow_materials'),'Shadow only');
assert(doc.includes('0 granturi')&&doc.includes('nu este necesar pentru instalarea SQL38'),'Manual reconcile not automatic');
assert(roadmap.includes('SQL38'),'Roadmap documents status');

// Reference-only model: ledger + server boss row -> one material; same id retry does nothing.
function reconcile(state,events,limit=100){
 if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('invalid limit');
 const pending=events.filter(x=>x.source==='guild_boss_hit_verified'&&x.validServerHit&&
   x.admin&&x.shadow&&x.delta===1&&!state.grants.has(x.id)).slice(0,limit);
 const next=new Set(state.grants),balances=new Map(state.balances);
 for(const event of pending){
  if(next.has(event.id))continue;
  const val=balances.get(event.user)||0;
  if(val>=1000000000)throw Error('overflow (rollback all)');
  next.add(event.id);balances.set(event.user,val+1);
 }
 state.grants=next;state.balances=balances;
 return pending.length;
}
const state={grants:new Set(),balances:new Map()};
const events=[
 {id:8,user:'A',source:'guild_boss_hit_verified',validServerHit:true,admin:true,shadow:true,delta:1},
 {id:9,user:'A',source:'guild_boss_hit_verified',validServerHit:true,admin:true,shadow:true,delta:1},
 {id:10,user:'B',source:'guild_boss_hit_verified',validServerHit:false,admin:true,shadow:true,delta:1},
 {id:11,user:'B',source:'raid_energy_verified',validServerHit:true,admin:true,shadow:true,delta:1}
];
assert.equal(reconcile(state,events,1),1);
assert.equal(state.balances.get('A'),1);
assert.equal(reconcile(state,events,2),1);
assert.equal(reconcile(state,events),0);
assert.equal(state.grants.size,2);
assert.equal(state.balances.get('A'),2);
assert.throws(()=>reconcile(state,events,0));
const rollbackState={grants:new Set(),balances:new Map([['A',999999999]])};
const rollbackEvents=[{id:15,user:'A',source:'guild_boss_hit_verified',validServerHit:true,admin:true,shadow:true,delta:1},{id:16,user:'A',source:'guild_boss_hit_verified',validServerHit:true,admin:true,shadow:true,delta:1}];
assert.throws(()=>reconcile(rollbackState,rollbackEvents));
assert.equal(rollbackState.grants.size,0);
assert.equal(rollbackState.balances.get('A'),999999999);
console.log('OK: SQL38 provenance-only boss hit -> idempotent fixed shadow material, no gameplay effects (static/model, SQL QA required).');
