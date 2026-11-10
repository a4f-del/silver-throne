/* Silver Throne BETA — pas 32: botul premium nu acumulează progres decât dacă jucătorul pornește „Fă nivel singur” (lv).
 * Fără lv: doar confort. Cu lv: temnițe obișnuite (blevel), niciodată raiduri sau forjări noi.
 * node dev/test-beta-premium-bot-fairness.js */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
const start=html.indexOf('function botTick0(){'),end=html.indexOf('function vBotBeta(',start);
assert(start>=0&&end>start,'Bot functionality extracted');
const source=html.slice(start,end);
function setup(server='beta'){
 const S={prem:1,bt:{on:1,d:1,di:-1,r:1,f:1,eq:1,hl:1},bn:0,forge:[],d:null};
 const calls={desc:0,down:0,craft:0,raid:0,collect:0,equip:0,heal:0,logs:0,level:0,auto:0};
 let eqReturn=0,healReturn=0,adv=false;
 const ctx={S,ST_SERVER:server,Date:{now:()=>100000},BT:()=>S.bt,
  bdesc:()=>{calls.desc++;return 1},bdown:()=>{calls.down++;return 1},
  bcraft:()=>{calls.craft++;return 1},braid:()=>{calls.raid++;return 1},
  adventureActive:()=>adv,
  collect:()=>{calls.collect++},bl:()=>{calls.logs++},
  bequip:()=>{calls.equip++;return eqReturn},
  bheal:()=>{calls.heal++;return healReturn},
  blevel:()=>{calls.level++;return 1},autoRun:()=>{calls.auto++},FX:{playing:false}};
 const api=new Function(...Object.keys(ctx),source+
  ';return {botTick0};')(...Object.values(ctx));
 return {S,calls,api,setEq:v=>eqReturn=v,setHeal:v=>healReturn=v,setAdv:v=>adv=v,
  newTick:()=>{S.bn=0}};
}
const beta=setup();
beta.S.d={f:{es:[{hp:1}]}};
beta.api.botTick0();
assert.equal(beta.calls.desc,0,'Bot must not continue BETA combat');
assert.equal(beta.calls.collect,0);
beta.S.d=null;beta.setAdv(true);beta.newTick();beta.api.botTick0();
assert.equal(beta.calls.down,0,'Bot must not open/end BETA adventure');
beta.setAdv(false);
beta.S.forge=[{end:90000,ok:1,item:{name:'Sabie'}}];
beta.newTick();beta.api.botTick0();
assert.equal(beta.calls.collect,1,'Ready forgings may be collected');
assert.equal(beta.calls.craft,0,'Collecting cannot start a new crafting');
assert.equal(beta.calls.down,0);
beta.S.forge=[];beta.setEq(1);beta.newTick();beta.api.botTick0();
assert.equal(beta.calls.equip,1,'Already owned gear can be equipped');
assert.equal(beta.calls.craft,0);
beta.setEq(0);beta.setHeal(1);beta.newTick();beta.api.botTick0();
assert.equal(beta.calls.heal,1,'Normal gold-cost heal can be triggered');
assert.equal(beta.calls.craft,0);
beta.setHeal(0);beta.S.bt.eq=0;beta.S.bt.hl=0;beta.newTick();beta.api.botTick0();
assert.equal(beta.calls.craft,0,'BETA never automatically forges');
assert.equal(beta.calls.down,0,'BETA never automatically dungeons');
assert.equal(beta.calls.raid,0,'BETA never automatically raids');
assert.equal(beta.calls.level,0,'Without lv the bot never levels');
/* „Fă nivel singur” pornit: doar blevel (temnițe), tot fără forjări sau raiduri */
beta.S.bt.lv=1;beta.newTick();beta.api.botTick0();
assert.equal(beta.calls.level,1,'lv on: bot fights dungeons via blevel');
beta.setAdv(true);beta.newTick();beta.api.botTick0();
assert.equal(beta.calls.level,2,'lv on: continues inside the adventure');
beta.setAdv(false);beta.S.d={one:1,f:{es:[{hp:1}]}};beta.newTick();beta.api.botTick0();
assert.equal(beta.calls.auto,1,'lv on: finishes its own pending fight');
beta.S.d=null;beta.S.bt.lv=0;
assert.equal(beta.calls.craft+beta.calls.raid+beta.calls.down,0,'Still no crafting/raids/legacy dungeon bot');
beta.S.prem=0;beta.newTick();const n=beta.calls.collect;
beta.S.forge=[{end:90000,ok:1,item:{name:'Armură'}}];beta.api.botTick0();
assert.equal(beta.calls.collect,n,'No Premium entitlement means no assistant');
const uiStart=html.indexOf('function vBotBeta('),uiEnd=html.indexOf('function vBot()',uiStart);
assert(uiStart>=0&&uiEnd>uiStart);
const uiFn=new Function('S','tEsc','DEV',html.slice(uiStart,uiEnd)+';return vBotBeta;');
const uiS={prem:1,bg:['Atelier: gata']};
const ui=uiFn(uiS,x=>String(x),()=>false);
const chk=(k,t)=>'<button data-key="'+k+'">'+t+'</button>';
const panel=ui({on:1,f:1,eq:1,hl:1},true,chk);
assert(panel.includes('Asistent Premium</h2>'));assert(panel.includes('Fă nivel singur'));
assert(panel.includes('Ridică obiectele deja forjate'));
assert(panel.includes('Echipează automat obiectele deținute'));
assert(panel.includes('Vindecă folosind aurul existent'));
assert(!panel.includes('Coboară în temnițe')&&!panel.includes('Atacă sate'));
assert(!panel.includes('Forjează iteme'),'No new-item crafting button in BETA');
assert(html.includes(" return vBotBeta(b,on,chk);}"),'Only the comfort bot panel exists');
for(const fn of ['bdesc','bdown','braid','bcraft'])assert(!html.includes('function '+fn+'('),'Legacy farming bot removed: '+fn);
console.log('OK: BETA premium no automatic dungeon/craft/raid; QoL collection/equip/heal available; legacy farming bot removed.');
