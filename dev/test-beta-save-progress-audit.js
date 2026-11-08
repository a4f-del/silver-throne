/* Silver Throne — SQL23 BETA save-progress audit.
 * Run: node dev/test-beta-save-progress-audit.js
 * Static SQL checks and numeric model only, NOT a real PostgreSQL integration test. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const sql=read('supabase/23-beta-save-progress-audit.sql');
const client=read('cont.js');
const base=read('index.html');

const guards=[
 'Silver-Throne-Test. NU LIVE.',
 'to_regclass(\'public.game_saves\')',
 'to_regclass(\'public.beta_world_combat_shadow\')',
 'CREATE TABLE IF NOT EXISTS public.beta_save_progress_audit',
 'user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE',
 'ALTER TABLE public.beta_save_progress_audit ENABLE ROW LEVEL SECURITY',
 'REVOKE ALL ON TABLE public.beta_save_progress_audit FROM PUBLIC, anon, authenticated',
 'CREATE OR REPLACE FUNCTION public.beta_save_progress_track()',
 'LANGUAGE plpgsql SECURITY DEFINER SET search_path = \'\'',
 'AFTER INSERT OR UPDATE OF game_data ON public.game_saves',
 'DROP TRIGGER IF EXISTS beta_save_progress_change ON public.game_saves',
 'REVOKE ALL ON FUNCTION public.beta_save_progress_track()',
 'EXCEPTION WHEN OTHERS THEN',
 'RAISE WARNING',
 "array_append(v_flags,'large_gold_increase')",
 "array_append(v_flags,'large_level_increase')",
 "array_append(v_flags,'large_inventory_increase')",
 'ON CONFLICT(user_id) DO UPDATE SET',
 'last_anomaly_flags = CASE WHEN cardinality(EXCLUDED.last_flags)>0',
 'RETURN NEW;',
 'COMMIT;',
 'audit_table_exists',
 'rls_enabled',
 'save_trigger_exists'
];
for(const g of guards)assert(sql.includes(g),'SQL23 guard missing: '+g);
assert.equal((sql.match(/\$audit\$/g)||[]).length,2);
assert.equal((sql.match(/\$guard\$/g)||[]).length,2);
assert.equal((sql.match(/^CREATE TRIGGER\b/gm)||[]).length,1);
assert(!/\b(?:DROP TABLE|TRUNCATE TABLE|DELETE FROM)\b/i.test(sql),'Destructive command forbidden');
assert(!/\bCREATE OR REPLACE FUNCTION public\.(?:world_|throne_|guild_)\b/i.test(sql),'Cannot redefine game RPC');
assert(!/\bUPDATE public\.(?:game_saves|world_players|world_raids|throne_profiles)\b/i.test(sql),
  'Audit must not alter game records');
assert(!/\bGRANT\b[\s\S]{0,120}\bTO authenticated\b/i.test(sql),
  'Audit must never become publicly callable');
assert(client.includes("supabaseClient.from('game_saves').upsert("),
  'Capture must be automatically triggered by existing save path');
assert(base.includes('gold:40,ore:24')&&base.includes('inv:[]'),
  'New player baseline shape is known');

// Mirror the deliberately generous comparisons in SQL23.
const flags=(old,s)=>{
 const out=[];
 if(!Number.isInteger(s.lvl)||s.lvl<1||s.lvl>500)out.push('level_outside_expected_range');
 for(const key of ['xp','gold','ore'])if(s[key]<0)out.push('negative_'+key);
 if(!Array.isArray(s.inv))out.push('invalid_inventory');
 if(old){
  if(s.lvl-old.lvl>10)out.push('large_level_increase');
  if(s.gold-old.gold>2000000)out.push('large_gold_increase');
  if(s.ore-old.ore>100000)out.push('large_ore_increase');
  if(s.xp-old.xp>2000000)out.push('large_xp_increase');
  if(Array.isArray(old.inv)&&s.inv.length-old.inv.length>250)
   out.push('large_inventory_increase');
 }
 return out;
};
const before={lvl:50,xp:10000,gold:500000,ore:2000,inv:[]};
const normal={lvl:51,xp:12000,gold:501000,ore:2100,inv:[{}]};
assert.deepEqual(flags(before,normal),[],'Normal progression must be unflagged');
assert(flags(before,{...normal,gold:4000000}).includes('large_gold_increase'));
assert(flags(before,{...normal,lvl:80}).includes('large_level_increase'));
assert(flags(before,{...normal,inv:Array(260).fill({})}).includes('large_inventory_increase'));
assert(flags(before,{...normal,gold:-1}).includes('negative_gold'));
assert(!sql.includes('RAISE EXCEPTION \'Cheat'),'Audit may not punish');
console.log('OK: non-blocking BETA-only save audit, RLS/private data, no gameplay writes; model passes.');
