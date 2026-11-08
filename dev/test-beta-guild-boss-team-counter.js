/* Silver Throne BETA — pas 26: contraclasa bossului din fantoma Lumii.
 * node dev/test-beta-guild-boss-team-counter.js
 * Nu execută SQL și nu se conectează la Supabase. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=x=>fs.readFileSync(path.join(root,x),'utf8');
const sql=read('supabase/18-beta-guild-boss-team-counter.sql'),
 previous=read('supabase/17-beta-guild-frozen-contracts.sql'),
 guild=read('bresle.js'),html=read('index.html');
new Function(guild);
assert(sql.includes('CREATE OR REPLACE FUNCTION public.guild_api('));
assert(!sql.includes('CREATE OR REPLACE FUNCTION public.guild_week_ensure('),
 'Guild weekly snapshot function stays untouched');
assert(sql.includes("coalesce(units,'[]'::jsonb)"),'Server reads published World team units');
assert(sql.includes('INTO v_level,v_power,v_units'));
assert(sql.includes('public.world_units_ok(v_units)'),'Team snapshot must be structurally valid');
assert(sql.includes("jsonb_typeof(v_units)='array'"),'Malformed historical JSON handled');
assert(sql.includes("jsonb_array_elements("),'Team is inspected, not hero only');
assert(sql.includes("v_counter='Arcas' AND u.unit->>'c'='Arcaș'"));
assert(sql.includes("v_counter<>'Arcas' AND u.unit->>'c'=v_counter"));
assert(!sql.includes('v_class')&&!sql.includes("hero->>'c'"),'Old hero-class-only check removed');
assert(!sql.includes("p_data->>'class'")&&!sql.includes("p_data->'units'"),
 'Attack cannot supply its own arbitrary class/units');
for(const marker of [
 'IF v_daily>=2','v_damage:=least(14000,2500+v_level*55+v_power/250);',
 'v_damage:=least(18000,round(v_damage*1.25)::integer);',
 'v_damage:=least(v_damage,v_w.boss_hp::integer);',
 'ceil(v_w.goal_dungeons*v_threshold)','ceil(v_w.goal_hard_boss*v_threshold)',
 'ceil(v_w.goal_tower*v_threshold)',"public.is_beta_admin()",
 'REVOKE ALL ON FUNCTION public.guild_api(text,jsonb)',
 'GRANT EXECUTE ON FUNCTION public.guild_api(text,jsonb) TO authenticated'
])assert(sql.includes(marker),'Missing existing server guard: '+marker);
assert.equal((sql.match(/CREATE OR REPLACE FUNCTION/g)||[]).length,1);
assert.equal((sql.match(/\$fn\$/g)||[]).length,2);
assert(sql.trim().endsWith('COMMIT;'));
assert(previous.includes('public.guild_week_ensure'),'Prior migration is prerequisite');

const validClasses=['Campion','Arcaș','Paznic','Războinic','Mag','Vraci','Gardian'];
const teamValid=units=>Array.isArray(units)&&units.length>0&&units.length<=3&&
 units.every(x=>x&&validClasses.includes(x.c)&&x.hp>0&&x.atk>=0&&x.def>=0);
const damage=(units,counter,level=30,power=9000,hp=999999)=>{
 const base=Math.min(14000,2500+level*55+power/250);
 const hasCounter=teamValid(units)&&units.some(x=>x.c===(counter==='Arcas'?'Arcaș':counter));
 return Math.min(hp,hasCounter?Math.min(18000,Math.round(base*1.25)):base);
};
const champ={c:'Campion',hp:100,atk:20,def:10};
const healer={c:'Vraci',hp:90,atk:9,def:5};
const archer={c:'Arcaș',hp:70,atk:19,def:6};
const guard={c:'Paznic',hp:120,atk:12,def:20};
const base=damage([champ],'Vraci');
assert(damage([champ,healer],'Vraci')>base,
 'Hero Campion plus living healer receives bonus, unlike old hero-only check');
assert(damage([champ,archer],'Arcas')>damage([champ],'Arcas'));
assert(damage([champ,guard],'Paznic')>damage([champ],'Paznic'));
assert.equal(damage([champ,archer],'Vraci'),base,'Wrong class gives no bonus');
assert.equal(damage([champ,healer,archer,guard],'Vraci'),base,'Invalid 4-unit team does not qualify');
assert.equal(damage([champ,healer],'Vraci',30,9000,300),300,'Never exceeds remaining boss HP');
assert(guild.includes('Bonusul de contraclasă (+25% daune)'),'UI explains rule');
assert(html.includes('bresle.js?v=2026.11.08-2'),'JS cache version updated');
console.log('OK: 3 valid server-published classes, Campion+counter bonus, same caps/permissions/claims, malformed arrays, BETA isolated.');
