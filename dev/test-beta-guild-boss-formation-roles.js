/* Silver Throne BETA pas 27 — formații de luptă și sincronizare sigură.
 * node dev/test-beta-guild-boss-formation-roles.js */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/19-beta-guild-boss-formation-roles.sql');
const prev=read('supabase/18-beta-guild-boss-team-counter.sql');
const client=read('bresle.js'),html=read('index.html');
new Function(client);
assert(sql.startsWith('-- Silver Throne')&&sql.trim().endsWith('COMMIT;'));
assert((sql.match(/CREATE OR REPLACE FUNCTION/g)||[]).length===1);
assert((sql.match(/\$fn\$/g)||[]).length===2);
assert(!sql.includes('CREATE OR REPLACE FUNCTION public.guild_week_ensure('));
for(const column of ['attack_bonus integer NOT NULL DEFAULT 0',
 'protection_bonus integer NOT NULL DEFAULT 0','healing_bonus integer NOT NULL DEFAULT 0',
 'counter_triggered boolean NOT NULL DEFAULT false']){
 assert(sql.includes('ADD COLUMN IF NOT EXISTS '+column),'No reset of old hits: '+column);
}
assert(sql.includes('public.world_units_ok(v_units)'),'Invalid team cannot contribute role boosts');
assert(sql.includes("jsonb_array_elements(v_units)"),'Roles sourced from server World snapshot');
assert(sql.includes("ARRAY[]::text[]"),'Invalid/empty teams fall back to no roles');
for(const label of ["'Războinic'=ANY(v_classes)","'Arcaș'=ANY(v_classes)",
 "'Mag'=ANY(v_classes)","'Paznic'=ANY(v_classes)","'Gardian'=ANY(v_classes)",
 "'Vraci'=ANY(v_classes)","v_guard_gain","v_heal_gain","v_attack_gain"]){
 assert(sql.includes(label),'Missing role '+label);
}
assert(sql.includes('v_damage := least(14000,v_damage+v_attack_gain+v_guard_gain+v_heal_gain)'));
assert(sql.includes('v_damage:=least(18000,round(v_damage*1.25)::integer);'));
assert(sql.includes('v_damage:=least(v_damage,v_w.boss_hp::integer);'));
assert(sql.includes("v_counter_triggered := (v_counter='Arcas' AND 'Arcaș'=ANY(v_classes))"));
assert(sql.includes("'last_hit',(SELECT jsonb_build_object("));
assert(sql.includes("'formation_rules',true"));
assert(sql.includes("'attack_bonus',h.attack_bonus"));
assert(sql.includes("'protection_bonus',h.protection_bonus"));
assert(sql.includes("'healing_bonus',h.healing_bonus"));
assert(sql.includes("h.guild_id=v_me.guild_id AND h.week_start=v_week AND h.user_id=v_uid"),'Last hit only for caller and guild/week');
for(const security of ["public.is_beta_admin()",
 "v_daily>=2","REVOKE ALL ON FUNCTION public.guild_api(text,jsonb)",
 "GRANT EXECUTE ON FUNCTION public.guild_api(text,jsonb) TO authenticated",
 "ceil(v_w.goal_dungeons*v_threshold)","ceil(v_w.goal_hard_boss*v_threshold)",
 "ceil(v_w.goal_tower*v_threshold)",
 "v_damage:=least(14000,2500+v_level*55+v_power/250)"]){
 assert(sql.includes(security),'Missing original SQL safeguard '+security);
}
assert(!sql.includes("p_data->>'attack'")&&!sql.includes("p_data->>'role'"));
assert(prev.includes('public.world_units_ok(v_units)'),'Migration 18 is prerequisite');

// Mirror deterministic SQL role formula to guard intended behavior.
const formula=(classes,level=30,power=9000,hp=999999,counter='Vraci')=>{
 const valid=Array.isArray(classes)&&classes.length>0&&classes.length<=3&&
 classes.every(c=>['Campion','Arcaș','Paznic','Războinic','Mag','Vraci','Gardian'].includes(c));
 const C=valid?new Set(classes):new Set();
 const base=Math.min(14000,2500+level*55+power/250);
 const attack=Math.round(base*.04*['Războinic','Arcaș','Mag'].filter(c=>C.has(c)).length);
 const shield=Math.round(base*.04*(C.has('Paznic')||C.has('Gardian')?1:0));
 const heal=Math.round(base*.04*(C.has('Vraci')?1:0));
 let damage=Math.min(14000,base+attack+shield+heal);
 const matched=C.has(counter==='Arcas'?'Arcaș':counter);
 if(matched)damage=Math.min(18000,Math.round(damage*1.25));
 return {damage:Math.min(hp,damage),attack,shield,heal,matched};
};
const pure=formula(['Campion']);
assert(formula(['Campion','Războinic']).damage>pure.damage,'Offensive role helps');
assert(formula(['Campion','Mag']).attack>0,'Mag helps offensive role');
assert(formula(['Campion','Paznic']).shield>0,'Guardian protects attack continuity');
assert(formula(['Campion','Gardian']).shield>0,'Guardian class supported');
assert(formula(['Campion','Vraci']).heal>0,'Healer sustains attack');
assert(formula(['Campion','Vraci'],'30',9000).matched);
assert(formula(['Campion','Paznic','Vraci']).damage>formula(['Campion','Paznic']).damage);
assert.equal(formula(['Campion','Paznic','Vraci','Mag']).attack,0,'Invalid 4-unit formation cannot boost');
assert(formula(['Campion','Vraci'],100,50000,100).damage===100,'Never overshoots remaining HP');
assert(formula(['Campion','Vraci'],100,50000).damage<=18000,'Final cap');

// Runtime: do not consume boss attempts when World publication fails,
// do not double-submit while sync is pending.
const a=client.indexOf('async function guildBoss(){'),b=client.indexOf('function guildBossReplay(',a);
assert(a>=0&&b>a,'guildBoss function extraction');
const fn=client.slice(a,b);
async function verifySync(){
 const state={d:null},fx={playing:false},uid='beta-user';
 let refresh=0,attackCount=0,replay=0,paint=0;
 let resolveSync;let syncSuccess=true;
 const LUME={pubSig:'',err:''};
 const GUILD={state:{guild:{id:1},boss:{hp:1000,personal_damage:0}},busy:false,bossSyncing:false,notice:''};
 const lwSnap=()=>({name:'team',units:['Campion','Vraci']});
 const lwSync=()=>new Promise(resolve=>{resolveSync=()=>{if(syncSuccess){LUME.pubSig=JSON.stringify(lwSnap());LUME.err='';}else{LUME.err='offline';}refresh++;resolve();};});
 const GSR={},CONT={user:{id:uid}},ST_SERVER='beta';
 const vars={S:state,FX:fx,GUILD,CONT,ST_SERVER,LUME,lwSnap,lwSync,
   guildEnabled:()=>true,guildPaint:()=>paint++,
   guildAction:async()=>{attackCount++;return {boss:{hp:500,personal_damage:500}};},
   guildBossReplay:()=>replay++};
 const guildBoss=new Function(...Object.keys(vars),fn+';return guildBoss;')(...Object.values(vars));
 const req=guildBoss();await Promise.resolve();
 assert.equal(GUILD.bossSyncing,true);
 const blocked=guildBoss();await blocked;
 assert.equal(attackCount,0,'Double tap must not submit');
 resolveSync();await req;
 assert.equal(attackCount,1);assert.equal(replay,1);
 assert.equal(GUILD.bossSyncing,false);
 syncSuccess=false;
 const offline=guildBoss();await Promise.resolve();resolveSync();await offline;
 assert.equal(attackCount,1,'Offline publication must not consume boss attempt');
 assert(GUILD.notice.includes('Nicio încercare'),GUILD.notice);
 assert.equal(GUILD.bossSyncing,false);
 state.d={raid:1};await guildBoss();
 assert.equal(attackCount,1,'Cannot attack during other combat');
 assert(refresh===2&&paint>=2);
}
verifySync().then(()=>{
 assert(client.includes('boss.formation_rules===true'),'Role UI must not activate before SQL19');
 assert(client.includes('guildBossLastHit(boss)'),'Last successful hit shown from RPC');
 assert(html.includes('bresle.js?v=2026.11.08-6'));
 console.log('OK: BETA role classes, caps/permissions, last hit from server, synced formation, no duplicate/offline attack.');
}).catch(e=>{console.error(e);process.exitCode=1;});
