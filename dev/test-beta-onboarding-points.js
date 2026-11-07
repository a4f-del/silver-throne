/* Silver Throne BETA — Pasul 05: puncte fără blocaj prematur.
 * node dev/test-beta-onboarding-points.js
 * Test izolat: fără browser, conturi, Supabase sau recompense reale. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const roadmap=fs.readFileSync(path.join(__dirname,'..','docs','ROADMAP-EXPERIENTA-JUCATORULUI.md'),'utf8');
const between=(start,end)=>{
 const a=html.indexOf(start),b=html.indexOf(end,a);
 assert(a>=0&&b>a,'Missing source boundary '+start);
 return html.slice(a,b);
};
const syncSource=between('function sync(){','const fmt=ms=>');
const startSource=between('function startD(i){','/* după fiecare monstru învins');
assert(startSource.includes("ST_SERVER==='beta'&&typeof jeFocus==='function'&&jeFocus()&&S.bp>0&&S.pts<MXP())sync()"),
 'Only new BETA heroes refill before dungeon cost');
const now=1_000_000;
function setup({server='beta',focused=true,pts=30,bp=120,level=1,room=0}={}){
 const S={lvl:level,pts,bp,ptsT:now,fs:[{hp:40}],d:null,tab:'a'};
 const DG=[{lv:1,rooms:4,ev:0}];let spent=0,fights=0,syncCalls=0,renderCalls=0;
 const makeSync=new Function('S','Date','MXP','PTX',syncSource+';return sync;');
 const sync=makeSync(S,{now:()=>now},()=>30,()=>360000);
 const api=new Function('S','DG','ST_SERVER','jeFocus','MXP','sync','dMk','dCostAt','spend','cn','startF','go','setTimeout',
   'evs',startSource+';return startD;')(
   S,DG,server,()=>focused,()=>30,()=>{syncCalls++;sync()},
   ()=>({room,rooms:4,di:0,dk:'0_0',loot:{gold:0,ore:0,xp:0,m:{}}}),
   ()=>room===3?2:1,n=>{spent+=n;S.pts-=n},()=>{},()=>{fights++},
   ()=>{renderCalls++},()=>{},()=>({k:3}));
 return {S,api,read:()=>({spent,fights,syncCalls,renderCalls})};
}
const first=setup({pts:0,bp:120});
first.api(0);
assert.equal(first.read().fights,1,'New player can continue without waiting');
assert.equal(first.read().spent,1,'Normal dungeon point cost still applies');
assert.equal(first.S.pts,29);
assert.equal(first.S.bp,90,'Existing reserve refills the bar, not an invented grant');
const boss=setup({pts:0,bp:2,room:3});
boss.api(0);
assert.equal(boss.read().spent,2,'Boss still costs two points');
assert.equal(boss.S.bp,0);assert.equal(boss.S.bpEnd,1);
const exhausted=setup({pts:0,bp:0});
exhausted.api(0);
assert.equal(exhausted.read().spent,0);
assert.equal(exhausted.read().fights,0,'After reserve ends, no free farming');
const oldBeta=setup({pts:0,bp:120,focused:false});
oldBeta.api(0);
assert.equal(oldBeta.read().syncCalls,0,'Existing BETA heroes unchanged');
assert.equal(oldBeta.read().fights,0);
const live=setup({server:'live',pts:0,bp:120});
live.api(0);
assert.equal(live.read().syncCalls,0,'LIVE hero unchanged');
assert.equal(live.read().fights,0);
const fresh=between('function fresh(){','function load(src)');
assert(fresh.includes('bp:120')&&fresh.includes('pts:MXP()'),'Initial 30 + reserve 120 is unchanged');
const cost=between('const dCostAt=i=>','function startD(i)');
assert(cost.includes('d.room>=d.rooms-1?2:1'),'Boss and normal fights retain their costs');
assert(roadmap.includes('05. Puncte fără blocaj prematur'));
console.log('OK: BETA tutorial refill, boss cost, exhausted reserve, no free farming, LIVE/legacy isolation.');
