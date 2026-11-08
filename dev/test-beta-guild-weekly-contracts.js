/* Silver Throne — pas 25: contracte de breaslă înghețate pe săptămână.
 * node dev/test-beta-guild-weekly-contracts.js
 * Validare statică SQL + executare UI cu date simulate, fără Supabase. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const sql=read('supabase/17-beta-guild-frozen-contracts.sql');
const js=read('bresle.js'),html=read('index.html');
new Function(js);
for(const part of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))if(part[1].trim())new Function(part[1]);
const must=(str,msg)=>assert(sql.includes(str),msg);
for(const name of ['active_at_start','goal_dungeons','goal_hard_boss','goal_tower'])
 must('ADD COLUMN IF NOT EXISTS '+name,'Migration adds '+name);
must('ON CONFLICT (guild_id,week_start) DO NOTHING','Weekly snapshot is write-once');
must("p.week_start=v_week-7",'Active member count anchored to prior week');
must("m.joined_at < (v_week::timestamp AT TIME ZONE 'Europe/Bucharest')",'Joining after Monday does not change start roster');
must('least(150,12*v_active)','Dungeon targets adapt and are capped');
must('least(25,2*v_active)','Hard-boss targets adapt and are capped');
must('least(1000,60*v_active)','Tower targets adapt and are capped');
must('ceil(v_w.goal_dungeons*v_threshold)','Claim uses stored dungeon goal');
must('ceil(v_w.goal_hard_boss*v_threshold)','Claim uses stored boss goal');
must('ceil(v_w.goal_tower*v_threshold)','Claim uses stored tower goal');
must("'goals',jsonb_build_object('dungeons',v_w.goal_dungeons","Status includes immutable goals");
assert(sql.indexOf('PERFORM public.guild_week_ensure(v_g.id);') <
 sql.indexOf('INSERT INTO public.guild_members(user_id,guild_id) VALUES(v_uid,v_g.id);'),
 'Snapshot before join');
assert(sql.indexOf('PERFORM public.guild_week_ensure(v_me.guild_id);') <
 sql.indexOf('DELETE FROM public.guild_members WHERE user_id=auth.uid();'),
 'Snapshot before leave');
must('public.is_beta_admin()','Only authorized BETA members may call guild RPC');
must('REVOKE ALL ON FUNCTION public.guild_api(text,jsonb)','RPC security preserved');
must('GRANT EXECUTE ON FUNCTION public.guild_api(text,jsonb) TO authenticated','Authorized RPC grant preserved');
assert.equal((sql.match(/CREATE OR REPLACE FUNCTION public.guild_/g)||[]).length,2);
assert.equal((sql.match(/\$fn\$/g)||[]).length,4,'Two complete PL/pgSQL function bodies');
assert(sql.trim().startsWith('-- Silver Throne')&&sql.trim().endsWith('COMMIT;'));
const goal=n=>[Math.min(150,12*n),Math.min(25,2*n),Math.min(1000,60*n)];
assert.deepEqual(goal(1),[12,2,60]);assert.deepEqual(goal(2),[24,4,120]);
assert.deepEqual(goal(10),[120,20,600]);assert.deepEqual(goal(20),[150,25,1000]);

const i=js.indexOf('function guildBar('),j=js.indexOf('function guildAction(action,data)',i);
assert(i>=0&&j>i,'UI functions boundary');
const piece=js.slice(i,j);
function guildUI(week){
 let markup='';
 const document={getElementById:id=>id==='guild-view'?{
  get innerHTML(){return markup},set innerHTML(x){markup=x}
 }:null};
 const GUILD={error:'',state:{guild:{id:1,name:'Test',tag:'TST',code:'SAFE',role:'leader',
  member_count:2,marks:0,members:[]},contract:week,
  boss:{hp:100,max:150,hits_today:0,counter:'Vraci',ability:'poison'}},notice:''};
 const GSR={notice:''};
 const f=new Function('document','GUILD','GSR','guildEsc',
   piece+';return {guildPaint,guildWeeklyGoal};');
 const api=f(document,GUILD,GSR,s=>String(s));
 api.guildPaint();return {markup,goal:api.guildWeeklyGoal};
}
const contract={dungeons:3,hard_boss:1,tower:15,personal:{
 dungeons:2,hard_boss:1,tower:0,boss_hits:0},claimed:{},
 active_at_start:1,goals:{dungeons:12,hard_boss:2,tower:60}};
const modern=guildUI(contract);
assert(modern.markup.includes('3 / 12'));
assert(modern.markup.includes('1 / 2'));
assert(modern.markup.includes('15 / 60'));
assert(modern.markup.includes('1 membri activi la începutul săptămânii'));
assert(/guildClaim\('bronz'\)"/.test(modern.markup),'Bronze claim is displayed');
assert(!/guildClaim\('bronz'\)" disabled/.test(modern.markup),'Bronze award unlocks at 25% of stored goals');
assert(/guildClaim\('argint'\)" disabled/.test(modern.markup),'Silver award still locked');
assert.equal(modern.goal(contract,'dungeons',150),12);
assert.equal(modern.goal({},'dungeons',150),150,'Legacy server fallback');
assert.equal(modern.goal({goals:{dungeons:-1}},'dungeons',150),150,'Untrusted negative goals rejected');
const legacy=guildUI({dungeons:3,hard_boss:1,tower:15,personal:contract.personal,claimed:{}});
assert(legacy.markup.includes('3 / 150')&&legacy.markup.includes('1 / 25')&&legacy.markup.includes('15 / 1000'));
assert(/guildClaim\('bronz'\)" disabled/.test(legacy.markup),'Legacy claim thresholds preserved');
assert(legacy.markup.includes('Obiective standard până la actualizarea contractelor BETA.'));
assert(html.includes('bresle.js?v=2026.11.08-1'),'Refresh guild JS cache version');
console.log('OK: frozen BETA goals, preserved prior contracts, claims use server targets, active snapshot, guild UI and legacy fallback.');
