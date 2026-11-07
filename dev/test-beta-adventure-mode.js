/* Silver Throne BETA: tests for dedicated Dungeon/Tower adventure mode.
 * Run: node dev/test-beta-adventure-mode.js
 * No DB/network/account/save mutations. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const main=read('index.html'),tower=read('turn.js'),steps=read('trepte.js'),
      team=read('echipa.js'),sidebar=read('panou.js');
function part(src,a,b){const i=src.indexOf(a),j=src.indexOf(b,i+a.length);assert(i>=0&&j>i,'Missing source range: '+a);return src.slice(i,j)}
const adventure=part(main,'function adventureActive()','function dMk(i)');
const oneDone=part(main,'function dOneDone(d,b)','function doors()');
const startD=part(main,'function startD(i)','/* după fiecare monstru învins');
const enterTower=part(tower,'function twEnter()','/* înainte de fiecare etaj');
const tab=part(main,'function tab(t)','const bar=');
const run=(source,ctx,expr)=>new Function(...Object.keys(ctx),source+'\n'+expr)(...Object.values(ctx));

const DG=[{n:'Mina Cenușie',lv:1,rooms:3},{n:'Cripta Furtunii',lv:8,rooms:5}];
let renders=0;
const S={tab:'a',lvl:25,pts:50,fs:[{h:1,hp:100}],msg:'',deo:{},dp:{}};
const ctx={S,DG,ST_SERVER:'beta',go:()=>{renders++}};
const f=run(adventure,ctx,'return {active:adventureActive,open:dToggle,exit:adventureExit,clear:adventureClear};');
assert.equal(f.active(),false);
f.open(0);
assert.equal(S.tab,'c');
assert.equal(f.active(),true,'Opening dungeon locks the player into adventure');
assert.equal(S.adventure.di,0);
assert.equal(S.deo[0],true);
run(tab,{S,ST_SERVER:'beta',adventureActive:f.active,go:ctx.go}, "tab('a')");
assert.equal(S.tab,'c','Tabs must not move player back to village');
const rewardContext={...ctx,trBand:()=>'',leave:()=>{S.d=null;renders++},trBand:()=>''};
run(adventure+oneDone,rewardContext, "dOneDone({one:1,di:0,dk:'0_0',room:0},false)");
assert.equal(S.dp['0_0'],1,'Normal win advances position');
assert.equal(f.active(),true,'Normal win keeps dedicated dungeon screen active');
assert.equal(S.adventure.di,0);
f.exit();assert.equal(f.active(),false,'Voluntary retreat returns to village/navigation');
assert.equal(S.deo[0],false);
assert.equal(S.dp['0_0'],1,'Voluntary retreat must keep already earned progress');
f.open(0);
run(adventure+oneDone,rewardContext, "dOneDone({one:1,di:0,dk:'0_0',room:2},true)");
assert.equal(S.dp['0_0'],0,'Boss resets the dungeon steps');
assert.equal(f.active(),false,'Boss completion automatically closes the run');
assert.equal(S.adventure,null);
assert.equal(S.deo[0],false);

f.open(0);
const fighting={...ctx,dMk:()=>({one:1,di:0,dk:'0_0',room:0,doors:[],loot:{gold:0,ore:0,xp:0,m:{}}}),
 dCostAt:()=>1,spend:n=>{S.pts-=n},cn:()=>{},startF:()=>{S.d.f={es:[{hp:10}]}},
 setTimeout:()=>{},go:ctx.go,evs:()=>({k:3})};
S.auto=false;
run(startD,fighting,'startD(1)');
assert.equal(S.d,undefined,'Cannot start another dungeon during current adventure');
run(startD,fighting,'startD(0)');
assert.equal(S.d.di,0,'Current dungeon fight can start');
assert.equal(f.active(),true,'Combat remains locked');
S.d=null;
f.exit();

const t={n:0},twCtx={S,DG,ST_SERVER:'beta',TWR:{lv:20,cost:6,day:3},
 twSt:()=>t,spend:n=>{S.pts-=n},twK:()=>2,doors:()=>[{t:'l'}],cn:()=>{},go:ctx.go,
 adventureActive:f.active};
run(enterTower,twCtx,'twEnter()');
assert.equal(S.d.tw,1);
assert.equal(S.tab,'c');
assert.equal(f.active(),true,'Tower combat locks navigation');
assert.equal(t.n,1);
S.d=null;assert.equal(f.active(),false,'Tower retreat restores navigation');
f.open(0);
run(enterTower,twCtx,'twEnter()');
assert.equal(t.n,1,'Tower cannot start over an active dungeon session');
f.exit();
const live={S:{tab:'a',lvl:25,deo:{}},DG,ST_SERVER:'live',go:()=>{}};
const liveFn=run(adventure,live,'return {active:adventureActive,open:dToggle};');
liveFn.open(0);
assert.equal(liveFn.active(),false,'LIVE stays outside special mode');
assert.equal(live.S.deo[0],true,'LIVE existing dungeon details unchanged');
assert(main.includes("S.tab='c';document.body.classList.add('st-adventure')"));
assert(main.includes("body.st-adventure #nv"));
assert(main.includes("adventureClear(S.d);S.d=null"),'Defeat clears adventure');
assert(main.includes("adventureClear(d);S.d=null"),'Fleeing clears adventure');
assert(steps.includes("adventureExit()"),'Dedicated dungeon has retreat action');
assert(team.includes("adventureActive())return"),'Team header cannot navigate out');
assert(sidebar.includes("adventureActive()&&t!=='c'"),'Sidebar navigation guarded');
for(const script of [steps,tower,team,sidebar])new Function(script);
for(const m of main.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
console.log('OK: BETA dungeon/tower navigation lock, boss auto-return, retreat, refresh state, LIVE isolation.');
