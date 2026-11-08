/* Silver Throne BETA / SQL39 / step33
 * Static contract + model only, no real Supabase or user data.
 * node dev/test-beta-verified-raid-shadow-ore.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/39-beta-verified-raid-shadow-ore-provenance.sql');
const sql25=read('supabase/25-beta-authoritative-economy-ledger-foundation.sql');
const sql26=read('supabase/26-beta-ledger-world-raid-energy-spend.sql');
const sql37=read('supabase/37-beta-shadow-forge-atomic-internal.sql');
const sql38=read('supabase/38-beta-guild-boss-shadow-material-provenance.sql');
const doc=read('docs/BETA-VERIFIED-RAID-SHADOW-ORE-STEP33.md');
const roadmap=read('docs/ROADMAP-EXPERIENTA-JUCATORULUI.md');
for(const s of [
 'BEGIN;','COMMIT;','CREATE TABLE IF NOT EXISTS public.beta_forge_shadow_ore_grants',
 'source_ledger_id bigint PRIMARY KEY','credit_ledger_id bigint NOT NULL UNIQUE',
 'CHECK (ore_amount=1)',
 'ALTER TABLE public.beta_forge_shadow_ore_grants ENABLE ROW LEVEL SECURITY',
 'REVOKE ALL ON TABLE public.beta_forge_shadow_ore_grants',
 'REVOKE ALL ON FUNCTION public.beta_forge_shadow_reconcile_raid_ore_internal(integer)',
 "auth.uid() IS NOT NULL","coalesce(auth.role(),'') NOT IN ('','service_role')",
 'p_limit NOT BETWEEN 1 AND 100','JOIN public.world_raids r',
 "l.event_key=('world-raid-start:'||r.id::text)",
 "l.source='raid_energy_verified'",'l.verified_raid_uses_delta=1',
 'AND r.attacker=l.user_id','AND a.state=\'shadow\'',
 'AND l.gold_delta=0 AND l.ore_delta=0 AND l.xp_delta=0',
 'WHERE user_id=v_event.user_id FOR UPDATE',
 'IF EXISTS (','source_ledger_id=v_event.id',
 "v_key:='shadow-raid-ore:'||v_event.id::text",
 "v_event.user_id,v_key,'admin_adjustment',0,1,0",
 'coalesce((v_result->>\'already\')::boolean,false)',
 'INSERT INTO public.beta_forge_shadow_ore_grants(',
 'AS sql26_trigger_preserved'
])assert(sql.includes(s),'SQL39 contract missing: '+s);
assert(!/CREATE\s+TRIGGER\b/i.test(sql),'Installation must not change raid gameplay');
assert(!/\b(?:UPDATE|DELETE FROM|TRUNCATE|INSERT INTO)\s+public\.(?:game_saves|world_raids|world_players|guild_boss_hits|beta_forge_shadow_materials|beta_item_provenance_receipts)/i.test(sql),
  'Never modify game, material or inventory rows');
assert(!/\bGRANT\s+EXECUTE\b/i.test(sql),'No player-accessible mint/credit RPC');
assert(sql25.includes('beta_economy_apply_internal('),'Ledger SQL25 exists');
assert(sql26.includes('CREATE TRIGGER beta_economy_world_raid_started'),'SQL26 verifies server starts');
assert(sql37.includes("v_account.state<>'shadow'"),'Forger relies on isolated shadow economy');
assert(sql38.includes('beta_forge_shadow_material_grants'),'Material source remains separate');
assert(doc.includes('nu creditează nimic'),'No installation-time credit disclosed');
assert(doc.includes('Poate')||doc.includes('poate fi diferit de 0'),'Existing shadow funds not assumed zero');
assert(doc.includes('Nu este necesar pentru a instala SQL39'),'Operator reconcile optional');
assert(roadmap.includes('SQL39'),'Roadmap stage must be present');

// Reference model: each eligible server raid-start ID has exactly one +1 shadow ore.
function reconcile(state,events,limit=50){
 if(!Number.isInteger(limit)||limit<1||limit>100)throw Error('invalid limit');
 const pending=events.filter(e=>e.source==='raid_energy_verified'&&e.verifiedUses===1&&
  e.hasServerRaid&&e.ownerMatches&&e.beta&&e.shadow&&
  e.gold===0&&e.ore===0&&e.xp===0&&!state.grants.has(e.id)).slice(0,limit);
 const next=new Set(state.grants);
 const ore=new Map(state.ore);
 for(const e of pending){
  if(next.has(e.id))continue;
  const bal=ore.get(e.user)||0;
  if(bal+1>1e12)throw Error('overflow => rollback');
  next.add(e.id);ore.set(e.user,bal+1);
 }
 state.grants=next;state.ore=ore;
 return pending.length;
}
const good=(id,user='a')=>({id,user,source:'raid_energy_verified',verifiedUses:1,
 hasServerRaid:true,ownerMatches:true,beta:true,shadow:true,gold:0,ore:0,xp:0});
const s={grants:new Set(),ore:new Map()};
const ev=[good(41),good(42),{...good(43),ownerMatches:false},{...good(44),source:'guild_boss_hit_verified'}];
assert.equal(reconcile(s,ev,1),1);
assert.equal(s.ore.get('a'),1);
assert.equal(reconcile(s,ev,10),1);
assert.equal(reconcile(s,ev,10),0);
assert.equal(s.ore.get('a'),2);
assert.equal(s.grants.size,2);
assert.throws(()=>reconcile(s,ev,0));
const large={grants:new Set(),ore:new Map([['a',1e12-1]])};
assert.throws(()=>reconcile(large,[good(1),good(2)]));
assert.equal(large.grants.size,0);
assert.equal(large.ore.get('a'),1e12-1);
console.log('OK: SQL39 BETA raid-start shadow ore provenance, bounded idempotent credit, no real gameplay changes (static/model only).');
