/* Silver Throne BETA — pas 17: o alegere înainte de căpitan, fără farming gratuit.
 * node dev/test-beta-boss-one-choice.js */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const src=read('trepte.js'),html=read('index.html'),ui=read('aventura-carduri.js'),css=read('aventura-carduri.css');
new Function(src);new Function(ui);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
const between=(source,start,end)=>{
 const i=source.indexOf(start),j=source.indexOf(end,i+start.length);
 assert(i>=0&&j>i,'Source boundary '+start);return source.slice(i,j);
};
const planSrc=between(src,'const TR_PLAN={','/* la începutul fiecărei lupte:');
const startSrc=between(src,'function trStart(es, d, b) {','const trDef0 =');
let redraws=0;
function mk(server='beta'){
 const S={lvl:20,d:null,pts:30,adventure:{di:0,tierLocked:true},trPlan:{},dp:{'0_0':3},fs:[{h:1,hp:100,n:'Eroul'}]};
 const DG=[{n:'Mina Cenușie',lv:1,rooms:4,ev:0}];
 const dMk=i=>{
  const d={di:i||0,room:(S.dp||{})[i+'_0']||0,rooms:4,dk:i+'_0',
   one:1,ev:0,loot:{gold:100,ore:20,xp:50},tier:0};
  if(server==='beta'&&api)api.trBossPlanAttach(d);
  return d;
 };
 let api=null;
 api=new Function('S','ST_SERVER','DG','dMk','go',planSrc+
   ';return {TR_PLAN,trBossPlanAttach,trBossPlanAvailable,trBossPlanPick,trBossPlanPanel,trBossPlanWin};')(
   S,server,DG,dMk,()=>redraws++);
 const combat=new Function('S','ST_SERVER','DG','trDef','trCtr','twMob','twAb',startSrc+
   ';return {trStart,trDmg};')(
   S,server,DG,()=>({a:'call',m:['Miner blestemat']}),()=>false,()=>'',()=> '');
 return {S,DG,api,combat,dMk};
}
const beta=mk();
assert.equal(Object.keys(beta.api.TR_PLAN).length,4,'Neutral plus three tactical choices');
assert.equal(beta.api.trBossPlanAvailable(0),true,'Only at unlocked boss gate');
const panel=beta.api.trBossPlanPanel(0);
assert(panel.includes('Scut')&&panel.includes('Asalt')&&panel.includes('Risc'));
assert(panel.includes('aria-pressed="true"'),'Normal is selected by default');
assert(panel.includes('trBossPlanPick(0,&quot;safe&quot;)'),'UI uses actual boss gate action');
const before=JSON.stringify({pts:beta.S.pts,dp:beta.S.dp});
beta.api.trBossPlanPick(0,'safe');
assert.equal(beta.S.trPlan['0_0'],'safe','Plan persisted on tier-specific key');
assert.deepEqual(JSON.parse(before),{pts:beta.S.pts,dp:beta.S.dp},'No free points or progress change');
assert.equal(beta.dMk(0).bossPlan,'safe','Real new dungeon fight carries chosen plan');
function bossAttack(plan){
 const d=beta.dMk(0);d.bossPlan=plan;beta.S.d=d;
 const e={n:'Căpitan',atk:100,def:5,b:true};
 beta.combat.trStart([e],d,true);
 return e.atk;
}
assert.equal(bossAttack('safe'),88,'Safe mitigates boss attack');
assert.equal(bossAttack('offense'),108,'Offense has an enemy attack tradeoff');
assert.equal(bossAttack('loot'),115,'Loot path increases threat');
beta.S.d={bossPlan:'offense',raid:null};
assert.equal(beta.combat.trDmg({b:true},100,false,[],{c:'Campion'}),108,'Offense increases hero damage');
beta.S.d={bossPlan:'safe',raid:null};
assert.equal(beta.combat.trDmg({b:true},100,false,[],{c:'Campion'}),100,'Safe does not buff outgoing damage');
function reward(choice,one=1){
 beta.S.trPlan['0_0']=choice;
 const d={di:0,dk:'0_0',one,bossPlan:choice,ev:0,raid:null,loot:{gold:100,ore:20,xp:50}};
 beta.api.trBossPlanWin(d);
 return d;
}
let d=reward('safe');assert.deepEqual(d.loot,{gold:90,ore:18,xp:50},'Safety costs only gold and ore');
assert.equal(beta.S.trPlan['0_0'],undefined,'One choice consumed after actual victory');
d=reward('offense');assert.deepEqual(d.loot,{gold:100,ore:20,xp:50});
d=reward('loot');assert.deepEqual(d.loot,{gold:115,ore:23,xp:50},'Risk grants only 15% boss resources');
d=reward('loot',0);assert.equal(d.loot.gold,100,'Odds simulation never grants bonus');
assert.equal(beta.S.trPlan['0_0'],'loot','Odds simulation does not consume saved choice');
beta.S.d=null;beta.api.trBossPlanPick(0,'normal');
assert.equal(beta.S.trPlan['0_0'],undefined,'Player can return to neutral before fighting');
const redrawBefore=redraws;
beta.api.trBossPlanPick(0,'invalid');assert.equal(redraws,redrawBefore,'Invalid action does not mutate save');
beta.S.dp['0_0']=1;assert.equal(beta.api.trBossPlanPanel(0),'','Not offered before boss');
beta.S.dp['0_0']=3;beta.S.d={f:{}};assert.equal(beta.api.trBossPlanPanel(0),'','Not offered in combat');
beta.S.d=null;beta.S.adventure=null;assert.equal(beta.api.trBossPlanAvailable(0),false,'Only within dungeon');
const event=beta.dMk(0);event.ev=1;event.bossPlan='loot';
const oldBonus=event.loot.gold;beta.api.trBossPlanWin(event);
assert.equal(event.loot.gold,oldBonus,'Weekly event never receives the stance reward');
const bossInUi=ui.includes("canFight&&boss&&typeof trBossPlanPanel==='function'?trBossPlanPanel(i):''");
assert(bossInUi&&css.includes('.ac-plan-choices'),'Boss-only UI is compact');
assert(src.includes("d0.bossPlan||'normal'"),'Odds cache varies when the plan changes');
assert(html.includes("trBossPlanAttach(d)"),'Real encounter and odds simulation share the same plan');
assert(src.includes("if(typeof trBossPlanWin==='function')trBossPlanWin(d);"),
 'Plan reward comes only from captain victory hook');
console.log('OK: boss-only choices, safe/offense/loot tradeoffs, 15% capped resources, one-time claim, odds, events protected.');
