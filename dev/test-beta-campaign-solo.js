/* Silver Throne BETA: dungeon-only story + solo hero and expedition reserve.
 * Run: node dev/test-beta-campaign-solo.js
 * No Supabase connection, login, network request or save changes. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const html=read('index.html'),terrain=read('teritorii.js');
const merc=read('mercenari.js'),dungeon=read('temnite.js'),steps=read('trepte.js');
const journey=read('drumul-eroului.js');
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
 .map(m=>m[1]).filter(Boolean);
const main=inline.find(x=>x.includes('function heroSoloControl()'));
assert(main,'Hero-only action must be in the main game script');

for(const src of [terrain,merc,dungeon,steps,journey,...inline])new Function(src);
new Function([terrain,merc,dungeon,steps,journey,main].join('\n;\n'));

const req={1:[0],2:[4],3:[1],4:[5,9],5:[2,6],6:[3,7,8]};
const CH=Object.entries(req).map(([id,dis])=>({
 id:+id,nm:'Capitol '+id,lv:1,out:'Gata',rw:{g:1},
 obj:[...dis.map(di=>({k:'boss',di,t:'Înfrânge '+di})),{k:'raid',n:5,t:'Raid repetitiv'}]
}));
const SEC=[{id:'pust',k:'poit',n:5,rw:{g:2}},{id:'vana',k:'camp',n:10,rw:{g:2}}];
const TW={CH,SEC};
const src=terrain.slice(terrain.indexOf('/* ---------------------------------------------------------------- CAMPANIE ---- */'),
 terrain.indexOf('/* --------------------------------------------------------------- PREMIUM ----- */'));
const fresh=()=>({camp:{rw:{},bk:{0:1},sec:{}},
 ter:{st:{raid:0,camp:0},hist:{},dsc:{},poiT:{},cl:{},fog:[]},map:{vs:[]}});
function campaign(server,S){
 let paid=0;
 const api=new Function('S','ST_SERVER','TW','terInit','terGrant','go',
  src+';return {cmpChapters,cmpSides,cmpBossCount,chCur,chReady,objDone,cmpClaim,secClaim};')(
  S,server,TW,()=>{},()=>{paid++;return 'premiu';},()=>{});
 return {api,paid:()=>paid};
}
const b=campaign('beta',fresh()),live=campaign('live',fresh());
assert(b.api.cmpChapters().every(c=>c.obj.length>0&&c.obj.every(o=>o.k==='boss')));
assert.equal(live.api.cmpChapters(),TW.CH,'LIVE uses original chapter definitions');
assert(!live.api.chReady(live.api.chCur()),'LIVE raid requirements are unchanged');
assert(b.api.chReady(b.api.chCur()),'BETA only requires boss progress');
assert(b.api.cmpChapters().every((c,i)=>c.rw===CH[i].rw),'Rewards are unchanged');
b.api.cmpClaim(1);b.api.cmpClaim(1);
assert.equal(b.paid(),1,'Cannot claim chapter twice');
assert.equal(b.api.chCur().id,2,'Next chapter is available');
assert.equal(b.api.cmpSides()[0].k,'bosses');
const already=fresh();already.camp.rw={1:1,2:1};
assert.equal(campaign('beta',already).api.chCur().id,3,'Historical claims survive');

const begin=main.indexOf('function heroSoloControl()');
const end=main.indexOf('function toBench(i)');
assert(begin>=0&&end>begin);
const solo=main.slice(begin,end);
const mk=(server,fs0,d=null)=>{
 const S={fs:fs0.slice(),rs:[],sel:1,d},api=new Function('S','ST_SERVER','go',
 solo+';return {heroSolo,heroSoloControl}')(S,server,()=>{});
 return {S,api};
};
const hero={h:1,n:'Erou',hp:50},archer={n:'Arcaș',hp:25},healer={n:'Vraci',hp:20};
const party=mk('beta',[hero,archer,healer]);
assert(party.api.heroSoloControl().includes('Erou singur'));
party.api.heroSolo();
assert.deepEqual(party.S.fs,[hero],'Hero is the only active fighter');
assert.deepEqual(party.S.rs,[archer,healer],'Mercs remain in reserve with original stats');
assert.equal(party.S.sel,0);
assert.equal(party.S.soloDungeon,1,'Solo mode persists in save state');
const busy=mk('beta',[hero,archer],{f:{}});
busy.api.heroSolo();assert.equal(busy.S.fs.length,2,'Combat forbids party changes');
const fallenHero={h:1,n:'Erou căzut',hp:0};
const fallen=mk('beta',[fallenHero,archer]);
fallen.api.heroSolo();
assert.equal(fallen.S.fs.length,2,'Cannot expose a fallen hero by moving away companions');
assert(!fallen.S.soloDungeon,'Failed solo operation does not persist');
const liveSolo=mk('live',[hero,archer]);
liveSolo.api.heroSolo();assert.equal(liveSolo.S.fs.length,2,'LIVE is unchanged');

const beg=merc.indexOf('function mrNew(c) {');
const stop=merc.indexOf('/* la fiecare desenare',beg);
const spawn=merc.slice(beg,stop);
const soloS={fs:[hero],rs:[],soloDungeon:1,d:null};
const mrNew=new Function('S','ST_SERVER','mhp','P','TR','TMAX',spawn+';return mrNew')(
 soloS,'beta',()=>25,a=>a[0],[{n:'Trăsătură'}],()=>3);
mrNew('Arcaș');
assert.equal(soloS.fs.length,1,'Recruited mercs do not silently rejoin solo squad');
assert.equal(soloS.rs.length,1);
const ordinaryS={fs:[hero],rs:[],d:null};
new Function('S','ST_SERVER','mhp','P','TR','TMAX',spawn+';return mrNew')(
 ordinaryS,'live',()=>25,a=>a[0],[{n:'Trăsătură'}],()=>3)('Arcaș');
assert.equal(ordinaryS.fs.length,2,'LIVE recruitment unchanged');
assert(dungeon.includes('heroSoloControl()'),'Dungeon list has solo selector');
assert(steps.includes('heroSoloControl()'),'Dungeon detail has solo selector');
assert(merc.includes('heroSoloControl()'),'Mercenary inn has solo selector');
assert(journey.includes('Ai descoperit Lumea')&&journey.includes('S.jeVisitedWorld=1'));

/* Real dungeon-entry guard is exercised with a one-person party, not just UI. */
const startAt=main.indexOf('function startD(i)');
const startEnd=main.indexOf('/* după fiecare monstru',startAt);
assert(startAt>=0&&startEnd>startAt);
const entry=main.slice(startAt,startEnd);
const soloFighter={h:1,n:'Erou',hp:50};
const dungeonState={fs:[soloFighter],rs:[archer],d:null,lvl:5,pts:8,auto:false,tab:'a'};
let fights=0;
const startD=new Function('S','DG','dMk','dCostAt','evs','spend','go','cn','startF','setTimeout',
 entry+';return startD')(dungeonState,[{lv:1,ev:0}],()=>({room:0,rooms:4}),
 ()=>2,()=>({k:1}),n=>{dungeonState.pts-=n},()=>{},()=>{},()=>{fights++},()=>{});
startD(0);
assert(dungeonState.d&&dungeonState.fs.length===1,'Hero may start a dungeon alone');
assert.equal(fights,1,'Solo hero starts the same fight engine');
assert.equal(dungeonState.pts,6,'Solo hero pays the usual entry cost');
assert(!html.includes('world-friends.js?v=2026.11.07-1</script>'),'Cached friends hotfix stays intact');
console.log('OK: six dungeon-only chapters, one-time rewards, historical claims, solo team and mercenary reserve, LIVE isolation and script syntax.');
