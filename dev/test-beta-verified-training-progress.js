/* Silver Throne BETA / step33 / SQL41: server verified shadow training
 * node dev/test-beta-verified-training-progress.js
 * Static contract + mock DOM, no database and no player data. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/41-beta-verified-training-progression-rpc.sql');
const prev=read('supabase/40-beta-verified-activity-status-rpc.sql');
const ui=read('bresle.js'),html=read('index.html');
const doc=read('docs/BETA-VERIFIED-TRAINING-PROGRESS-STEP33.md');
const roadmap=read('docs/ROADMAP-EXPERIENTA-JUCATORULUI.md');
for(const s of [
 'BEGIN;','COMMIT;',
 "to_regprocedure('public.beta_verified_activity_status()')",
 'CREATE OR REPLACE FUNCTION public.beta_verified_activity_status()',
 'auth.uid()',"auth.role() IS DISTINCT FROM 'authenticated'",
 'NOT public.is_beta_admin()',
 'FROM public.beta_economy_ledger l','WHERE l.user_id=v_user',
 "l.source='guild_boss_hit_verified'","l.source='raid_energy_verified'",
 'l.verified_guild_boss_hit_delta=1','l.verified_raid_uses_delta=1',
 'v_ledger_boss::numeric*25 + v_ledger_raids::numeric*5',
 'v_training_level:=LEAST(50,1+(v_training_xp/100)::integer)',
 "'verified_training',jsonb_build_object(",
 "'xp_total',v_training_xp", "'level',v_training_level",
 "'hero_level_authoritative',false",
 "'authoritative_for_game',false",
 "'verified_boss_hits',v_ledger_boss",
 "'verified_raid_starts',v_ledger_raids",
 "'consistent',(v_ledger_boss=v_counter_boss",
 'REVOKE ALL ON FUNCTION public.beta_verified_activity_status()',
 'GRANT EXECUTE ON FUNCTION public.beta_verified_activity_status()',
 'AS ledger_rls_preserved','AS anon_cannot_read',
 'AS owner_identity_enforced'
])assert(sql.includes(s),'SQL41 contract missing '+s);
const body=sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION public.beta_verified_activity_status()'),
 sql.indexOf('REVOKE ALL ON FUNCTION public.beta_verified_activity_status()'));
assert(!/\b(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE|CREATE TABLE|DROP TABLE)\b/i.test(body),
 'SQL41 must be read-only');
assert(!/\b(?:p_user|p_data|p_xp|p_level)\b/.test(body),
 'Server level never accepts client progress fields');
assert(prev.includes("'authoritative_for_game',false"),'Additive to existing SQL40 contract');
assert(ui.includes('Antrenament verificat (SHADOW)'),'Show explicit shadow label');
assert(ui.includes('Separat de nivelul eroului'),'No fake hero level');
assert(ui.includes('guildVerifiedHtml()+'),'Keep display in existing disclosure');
assert(html.includes('bresle.js?v=2026.11.08-7'),'Guild asset cache refreshed');
assert(doc.includes('nu încheie') && doc.includes('nu certifică autoritatea nivelului eroului'),
 'Explicit non-authoritative progress disclosure');
assert(roadmap.includes('SQL41'),'Roadmap status updated');
function expected(boss,raid){
 const xp=Math.min(1000000000,boss*25+raid*5);
 const level=Math.min(50,1+Math.floor(xp/100));
 return {xp,level,remaining:level===50?null:100,into:level===50?0:xp%100};
}
assert.deepEqual(expected(0,0),{xp:0,level:1,remaining:100,into:0});
assert.deepEqual(expected(4,0),{xp:100,level:2,remaining:100,into:0});
assert.deepEqual(expected(3,5),{xp:100,level:2,remaining:100,into:0});
assert.deepEqual(expected(1000,2000),{xp:35000,level:50,remaining:null,into:0});
assert.deepEqual(expected(1000000000,1000000000),{xp:1000000000,level:50,remaining:null,into:0});
const a=ui.indexOf('function guildVerifiedHtml(){'),b=ui.indexOf('function guildPaint(){',a);
assert(a>=0&&b>a,'Find view function');
const fragment=ui.slice(a,b);
function render(training){
 const GUILD={
  verified:{ready:true,mode:'audit',authoritative_for_game:false,
   verified_boss_hits:4,verified_raid_starts:0,consistent:true,
   verified_training:training},verifiedError:'',verifiedBusy:false};
 const guildEsc=s=>String(s);
 return new Function('GUILD','guildEsc',fragment+'return guildVerifiedHtml();')(GUILD,guildEsc);
}
const fields={rules_version:1,hero_level_authoritative:false,xp_total:100,
 level:2,xp_in_level:0,xp_to_next:100};
const out=render(fields);
assert(out.includes('100 XP de test'));
assert(out.includes('nivel de test <b>2</b>'));
assert(out.includes('Separat de nivelul eroului'));
assert(!render(undefined).includes('XP de test'),'SQL40 backward compatibility');
assert(!render({...fields,xp_total:'<img src=x>'}).includes('<img'),'Discard unexpected values');
assert(!render({...fields,hero_level_authoritative:true}).includes('XP de test'));
assert(render({...fields,level:50,xp_to_next:null}).includes('nivel maxim'));
console.log('OK: SQL41 independently derived server event XP/level for BETA QA, safe UI and legacy compatibility (static/model only).');
