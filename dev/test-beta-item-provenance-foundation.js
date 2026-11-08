/* Silver Throne BETA - step33 / SQL35 server item receipts
 * node dev/test-beta-item-provenance-foundation.js
 * Static security contract and JS model; no DB, no accounts, no saves.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const sql=read('supabase/35-beta-server-item-provenance-foundation.sql');
const doc=read('docs/BETA-ITEM-PROVENANCE-STEP33.md');
const economy=read('supabase/25-beta-authoritative-economy-ledger-foundation.sql');
const guild=read('supabase/34-beta-ledger-verified-guild-boss-hit.sql');
const roadmap=read('docs/ROADMAP-EXPERIENTA-JUCATORULUI.md');
assert(sql.includes('BEGIN;')&&sql.includes('COMMIT;'),'SQL migration is transactional');
assert(sql.includes('CREATE TABLE IF NOT EXISTS public.beta_item_provenance_receipts'),'Private table');
assert(sql.includes('receipt_id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid()'),'Server-issued ID');
assert(sql.includes('REFERENCES public.beta_economy_ledger(id) ON DELETE CASCADE'),'Owner and source via ledger FK, including deletion');
assert(sql.includes('UNIQUE (event_ledger_id,event_item_number)'),'Duplicate event ordinal prevented');
assert(sql.includes('server_roll_seed bigint NOT NULL'),'Seed is required, not copied from save');
assert(sql.includes('template_key text NOT NULL'),'Fixed template identifier');
for(const field of ['item_type','item_level','item_rarity','item_quality'])
 assert(sql.includes(field),'Validated model field '+field);
assert(sql.includes('ENABLE ROW LEVEL SECURITY'),'RLS');
assert(sql.includes('REVOKE ALL ON TABLE public.beta_item_provenance_receipts'),'No client table access');
assert(sql.includes('REVOKE ALL ON FUNCTION public.beta_item_provenance_guard()'),'Trigger function private');
assert(sql.includes('BEFORE INSERT ON public.beta_item_provenance_receipts'),'Guard each issuance');
assert(sql.includes("v_source NOT IN ('dungeon_verified','forge_verified')"),'Only future verified sources allowed');
assert(sql.includes("tgname='beta_economy_guild_boss_hit_created'"),'SQL34 must remain intact');
assert(sql.includes("NOT has_table_privilege('authenticated',"),'Checks client privileges');
assert(sql.includes('AS sql34_preserved'),'Checks existing trigger');
assert(sql.includes('COUNT(*)::bigint AS server_issued_receipts'),'Read-only aggregate QA');
assert(!/\b(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE)\s+public\.(?:game_saves|world_players|throne_profiles|beta_economy_ledger|beta_item_provenance_receipts)\b/i.test(sql),
 'SQL35 must never import or mutate gameplay records');
assert(!/\bGRANT\s+\S+[\s\S]*?\bTO\s+(?:authenticated|anon)\b/i.test(sql),
 'No client mint permission or other grants');
assert(economy.includes('beta_economy_ledger_event_unique'),'Trusted economic ledger unique event');
assert(guild.includes('CREATE TRIGGER beta_economy_guild_boss_hit_created'),'SQL34 prerequisite exists');
assert(doc.includes('nu le transformă în obiecte autentice'),'Avoid legitimizing client inventory');
assert(doc.includes('0 receipturi / 0 evenimente'),'Empty ledger is expected');
assert(doc.includes('legacy/unverified'),'No retroactive confiscation');
assert(roadmap.includes('SQL35'),'Roadmap must disclose this foundation');
// This is only a contract model: no generator is exposed to the browser yet.
function receiptModel(events){
 const used=new Set();
 return ({eventId,index,source})=>{
  if(!events.has(eventId)||!['dungeon_verified','forge_verified'].includes(source)||events.get(eventId)!==source)
   throw Error('unverified source');
  if(!Number.isInteger(index)||index<1||index>100)throw Error('invalid ordinal');
  const key=eventId+':'+index;
  if(used.has(key))throw Error('duplicate');
  used.add(key);return key;
 };
}
const issue=receiptModel(new Map([[9,'dungeon_verified'],[10,'guild_boss_hit_verified'],[11,'forge_verified']]));
assert.equal(issue({eventId:9,index:1,source:'dungeon_verified'}),'9:1');
assert.equal(issue({eventId:9,index:2,source:'dungeon_verified'}),'9:2');
assert.equal(issue({eventId:11,index:1,source:'forge_verified'}),'11:1');
assert.throws(()=>issue({eventId:9,index:1,source:'dungeon_verified'}));
assert.throws(()=>issue({eventId:10,index:1,source:'guild_boss_hit_verified'}));
assert.throws(()=>issue({eventId:12,index:1,source:'forge_verified'}));
assert.throws(()=>issue({eventId:9,index:3,source:'forge_verified'}));
assert.throws(()=>issue({eventId:9,index:0,source:'dungeon_verified'}));
console.log('OK: SQL35 future-item receipts are private, event-bound and idempotent; no inventory migration, SQL QA needed.');
