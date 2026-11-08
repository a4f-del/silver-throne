/* Silver Throne BETA — explain historical Tron duel 27 by critical damage
 * and expose passive life gain / bleeding in *future* local battle logs.
 * node dev/test-beta-throne-passive-healing-journal.js
 * Uses mocked hero data only. No SQL, network or player saves.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const leg=read('legendare.js'),index=read('index.html'),tron=read('tron.js');
new Function(leg);
for(const m of index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
new Function(tron);
assert(index.includes('legendare.js?v=2026.11.09-1'),'Legendary script cache refreshed');
assert(index.includes('tron.js?v=2026.11.09-1'),'Tron script cache refreshed');
const section=(s,start,end)=>{
 const a=s.indexOf(start),b=s.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'Missing section '+start);return s.slice(a,b);
};
const after=section(leg,'function lgAfter(', '/* la sfârșitul turei');
const round=section(leg,'function lgRound(', '\nfunction lgHook()');
assert(after.includes("S.d && S.d.tron && S.d.ghost"),'Lifesteal log only on BETA ghost duel');
assert(round.includes("S.d && S.d.tron && S.d.ghost"),'Regen log only on BETA ghost duel');
function make(server='beta',duel=true){
 const hero={n:'Erou',hp:1600,max:2400,b: {ls:0.15,regen:0.03}};
 const S={d:duel?{tron:1,ghost:[{hp:1}]}:{raid:null,tron:0},fs:[hero]};
 const defs={S,ST_SERVER:server,lgFx:f=>f.b,mhp:f=>f.max,
   P:()=>null,Math};
 return {
  hero,
  after:new Function(...Object.keys(defs),after+'; return lgAfter;')(...Object.values(defs)),
  round:new Function(...Object.keys(defs),round+'; return lgRound;')(...Object.values(defs))
 };
}
let e=make();let log=[];
e.after(e.hero,{hp:100},886,log);
assert.equal(e.hero.hp,1733,'Same 15% lifesteal as before: round(886*.15)=133');
assert(log.some(s=>s.includes('recuperează 133 viață')),'Real heal amount logged');
e.hero.hp=2380;log=[];
e.after(e.hero,{hp:100},886,log);
assert.equal(e.hero.hp,2400,'Healing remains capped at max HP');
assert(log.some(s=>s.includes('recuperează 20 viață')),'Log actual gain, not nominal 133');
e.hero.hp=2400;log=[];
e.after(e.hero,{hp:100},886,log);
assert.equal(log.length,0,'No phantom healing message when already full');

e=make();log=[];
e.round(log);
assert.equal(e.hero.hp,1672,'3% regeneration behavior unchanged (72)');
assert(log.some(s=>s.includes('regenerează 72 viață')),'Actual regen logged');
e=make('beta',false);log=[];
e.after(e.hero,{hp:100},886,log);e.round(log);
assert.equal(log.length,0,'Non-Tron battle UI untouched');

const onStart=section(tron,'function tronFight(', '/* Doar pe serverul BETA');
assert(onStart.includes('HP la start: erou'),'Starts with real hero HP');
assert(onStart.includes(' · rege '),'Includes actual defender HP');
assert(onStart.includes('if (d.ghost && d.f)'),'Guarded to ghost duel');
const enemy=section(index,'function enemy(){','\nfunction win(');
assert(enemy.includes("if(S.d&&S.d.tron&&S.d.ghost)"),
  'Bleeding damage disclosed only in Tron duels');
assert(enemy.includes("const bleed=(2+Math.floor(S.lvl/2))*(e.blm||1);e.hp-=bleed;e.bl--;"),
 'Existing bleed tick damage and timing retained');
const win=section(index,'function win(q){','\nfunction flee()');
assert(win.includes('HP la victorie: erou'),'Combat end has final HP');
assert(win.indexOf('HP la victorie') < win.indexOf("bhPush(S.d,S.d.f)"),
 'Final HP captured before archiving journal');
assert(!/CREATE TABLE|DELETE FROM|DROP TABLE/i.test(after+round+onStart),
 'No server schema or economy edits');

// Captured duel #27: three criticals dealt exactly capped 886 each.
assert.equal(3*886,2658);
assert(2658>Math.ceil(886/.38)-4,'Three capped hits exceed a ~2330-HP defender');
// Incoming damage also exceeds published challenger max HP (~2463).
// This proves some unlogged healing OR a live-vs-published stat difference;
// without gear/replay do not assert which one occurred.
assert.equal(892+745+931,2568);
assert(2568>Math.ceil(936/.38),'Some compensation or HP mismatch required');
console.log('OK: local BETA Tron passive healing, regeneration, bleeding and HP snapshots; 27 criticals are consistent with lethal cap.');
