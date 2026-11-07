/* BETA regression: remove legacy raids/camps, preserve shared NPC villages and LIVE.
 * Run: node dev/test-beta-retire-legacy-raids-camps.js
 * No network, SQL, account or saved game mutations.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const terrain=read('teritorii.js'),main=read('index.html');
const guide=read('ghid.js'),sidebar=read('panou.js');
const sharedNpc=read('tinut.js'),quick=read('lume-quick.js');
const extract=(src,begin,end)=>{
 const i=src.indexOf(begin);assert(i>=0,'Missing start: '+begin);
 const j=src.indexOf(end,i+begin.length);assert(j>i,'Missing end: '+end);
 return src.slice(i,j);
};
const camps=extract(terrain,'function terCamps()','function campK(');
const campGo=extract(terrain,'function campGo(id)','/* recompensa la căderea căpitanului');
const raid=extract(main,'function raid(id)','function rl(d)');
const braid=extract(main,'function braid()','function bdown(');
const run=(src,ctx,body)=>new Function(...Object.keys(ctx),src+'\n'+body)(...Object.values(ctx));

let called=0, saved={id:'old-camp',exp:Date.now()+3600000};
let state={ter:{camps:[saved],cdn:{},cslot:9},pts:50,msg:'',fs:[{hp:100}],map:{vs:[]}};
let beta={S:state,TP:{camp:{slotH:3,max:4,retries:2}},
 TW:{campsForSlot:()=>{throw Error('BETA camp spawn reached');}},
 terKey:()=>'',terTaken:()=>new Set(),terInit:()=>{},go:()=>{called++;},
 cmpBeta:()=>true,Date,Math};
run(camps+'\n'+campGo,beta,"terCamps();campGo('old-camp')");
assert.deepEqual(state.ter.camps,[saved],'BETA must preserve historic saved camps');
assert.equal(called,1,'BETA camp must be blocked');
assert.match(state.msg,/retrase/);

let liveCalls=0;
const live={...beta,S:{ter:{camps:[],cdn:{},cslot:0},map:{vs:[]},lvl:10},
 TW:{campsForSlot:()=>{liveCalls++;return []}},cmpBeta:()=>false};
run(camps,live,'terCamps()');
assert(liveCalls>0,'LIVE camp scheduler must still run');

let raidCalls=0;
const betaRaid={ST_SERVER:'beta',S:{msg:'',pts:20},go:()=>{raidCalls++;},
 MPV:()=>{throw Error('legacy raid map accessed')}};
run(raid,betaRaid,'raid(1)');
assert.equal(raidCalls,1);
assert.match(betaRaid.S.msg,/retrase/);
assert.equal(run(braid,{ST_SERVER:'beta',S:{pts:20}},'return braid()'),0);
assert(terrain.includes("if (!cmpBeta()) t.camps.forEach"),'BETA camps must not draw');
assert(terrain.includes("s.k === 'c' && !cmpBeta()"),'Saved camp selection must not display');
assert(sidebar.includes("ST_SERVER !== 'beta') && cp.length"),'No BETA camp sidebar');
assert(guide.includes("ghQ('#v g[onclick^=\\"wnPick(\\"]')"),'BETA tutorial must point to shared NPC');
assert(main.includes("r:ST_SERVER==='beta'?'Jefuiește un sat NPC în Lume'"),'Daily quest remains compatible');
assert(sharedNpc.includes('async function wnRaid(id)')&&sharedNpc.includes("'world_npc_raid'"),'Shared NPC raiding stays');
assert(quick.includes('wnRaid(v.id)'),'Shared NPC quick action stays');
for(const p of ['teritorii.js','ghid.js','panou.js','tinut.js','lume-quick.js'])
 new Function(read(p));
console.log('OK: BETA legacy raid/camp disabled, saved data and LIVE safe; shared NPC villages remain.');
