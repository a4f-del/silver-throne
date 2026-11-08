/* BETA — regresie pentru recuperarea schemei breslelor după SQL 19/20.
 * node dev/test-beta-guild-week-recovery.js
 * Fără conexiune la PostgreSQL; verifică scriptul și dependențele din repo. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const patch=read('supabase/REPAIR-beta-guild-week-columns-after-19.sql');
const v17=read('supabase/17-beta-guild-frozen-contracts.sql');
const v19=read('supabase/19-beta-guild-boss-formation-roles.sql');
const v20=read('supabase/20-beta-guild-cosmetics.sql');
const name='CREATE OR REPLACE FUNCTION public.guild_week_ensure(p_gid bigint)';
const fn17=v17.slice(v17.indexOf(name),v17.indexOf('-- Un singur punct de intrare')).trim();
assert(fn17.startsWith(name),'SQL17 has original weekly function');
assert(patch.includes(fn17),'Recovery uses the exact SQL17 weekly function');
for(const [key,fallback]of [
 ['active_at_start',1],['goal_dungeons',150],['goal_hard_boss',25],['goal_tower',1000]]){
 assert(patch.includes(`ADD COLUMN IF NOT EXISTS ${key} integer NOT NULL DEFAULT ${fallback}`),
  key+' column is added idempotently with old-week default');
 assert(v19.includes('v_w.'+key),'SQL19 requires '+key);
}
assert(!v19.includes('ADD COLUMN IF NOT EXISTS active_at_start'),
 'SQL19 incorrectly assumes SQL17 was installed');
assert(!v20.includes('active_at_start'),'SQL20 is independent of weekly goals');
assert.equal((patch.match(/CREATE OR REPLACE FUNCTION/g)||[]).length,1,
 'Recovery must only update week_ensure, not guild_api');
assert(!patch.includes('CREATE OR REPLACE FUNCTION public.guild_api('),
 'Never replace SQL19 boss formation logic');
assert(!/\b(DROP TABLE|TRUNCATE TABLE|DELETE FROM public\.guild_weeks)\b/i.test(patch),
 'No dangerous destructive statements');
assert(patch.includes('ON CONFLICT (guild_id,week_start) DO NOTHING'),
 'Do not overwrite pre-existing contract goals');
assert(patch.includes('least(150,12*v_active)')&&
 patch.includes('least(25,2*v_active)')&&
 patch.includes('least(1000,60*v_active)'),'New-week adaptive goals preserved');
assert(patch.includes('REVOKE ALL ON FUNCTION public.guild_week_ensure(bigint)'),
 'Direct authenticated weekly-function execution stays revoked');
assert(patch.includes('to_regprocedure(\'public.guild_api(text,jsonb)\')'),
 'Post-repair diagnostic checks server function');
assert(patch.includes("position('formation_rules'"),'Check SQL19 boss role logic still active');
assert.equal((patch.match(/^BEGIN;$/gm)||[]).length,1);
assert.equal((patch.match(/^COMMIT;$/gm)||[]).length,1);
assert(patch.indexOf('COMMIT;')<patch.indexOf('SELECT column_name'),
 'Read-only checks are after transaction commit');
console.log('OK: 4 missing columns, original SQL17 weekly function, SQL19/20 preserved, no destructive migration.');
