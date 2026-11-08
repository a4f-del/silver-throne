/* Silver Throne BETA — pașii 19/20: checkpoint-uri Turn și progres clar.
 * node dev/test-beta-tower-checkpoints.js
 * Fără DB, browser, recompense reale sau consum de încercări pe conturi reale. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const turn=read('turn.js'),main=read('index.html'),road=read('docs/ROADMAP-EXPERIENTA-JUCATORULUI.md');
new Function(turn);
for(const m of main.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))if(m[1].trim())new Function(m[1]);
const cut=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert(i>=0&&j>i,a+' range');return s.slice(i,j)};
const flow=cut(turn,'const TW_STARTS=','/* înainte de fiecare etaj');
let goCalls=0;
function setup(server='beta'){
 const t={best:0,n:0,start:1,day:'2026-11-08',v:2,lg:{}};
 const S={lvl:50,pts:50,fs:[{h:1,n:'Eroul',hp:100}],tw:t,d:null,tab:'a',msg:''};
 const DG=[{n:'Mina Cenușie',lv:1}];
 const TWR={lv:20,cost:6,day:3,up:[10,20,40,60]};
 const api=new Function('S','ST_SERVER','DG','TWR','twSt','spend','twK','doors','cn','go','adventureActive',
  flow+';return {TW_STARTS,twStartChoice,twStartSet,twStartControls,twProgress,twEnter};')(
  S,server,DG,TWR,()=>t,n=>{S.pts-=n},n=>n*2,
  ()=>[{t:(S.d.room+1)%10===0?'b':'l'}],()=>{},()=>goCalls++,()=>false);
 return {S,t,DG,TWR,api};
}
const b=setup();
assert.deepEqual(b.api.TW_STARTS,[1,21,41,61,81]);
b.t.start=81;assert.equal(b.api.twStartChoice(b.t),1,'Locked save cannot unlock floor 81');
let ui=b.api.twStartControls(b.t);
assert(ui.includes('value="21" disabled')&&ui.includes('value="81" disabled'));
assert(ui.includes('NU dau aur, minereu, XP'),'Skipped floors clearly get zero rewards');
b.api.twStartSet(81);assert.equal(b.t.start,81,'Invalid request does not replace original save');
assert.equal(b.api.twStartChoice(b.t),1,'Invalid saved checkpoint safely ignored');
b.t.best=20;b.api.twStartSet(21);
assert.equal(b.t.start,21);assert.equal(b.api.twStartChoice(b.t),21);
const points=b.S.pts,attempts=b.t.n;
b.api.twEnter();
assert.equal(b.S.d.tw,1);
assert.equal(b.S.d.room,20,'Starts ready to fight floor 21, does not replay guardian 20');
assert.equal(b.S.d.doors[0].t,'l','First battle from floor 21 is normal');
assert.equal(b.S.d.k,42,'Difficulty scales to floor 21, not floor 1');
assert.equal(b.S.d.twStart,21,'Origin of climb retained for reporting');
assert.deepEqual(b.S.d.loot,{gold:0,ore:0,xp:0,m:{}},'No retroactive loot, XP or legendary');
assert.equal(b.S.pts,points-6);
assert.equal(b.t.n,attempts+1,'Checkpoint still consumes exactly one daily attempt');
assert(b.S.msg.includes('Etajele sărite nu acordă pradă'));
b.S.d=null;
b.t.best=40;b.api.twStartSet(41);b.api.twEnter();
assert.equal(b.S.d.room,40,'41 unlocked only after beating 40');
assert.equal(b.t.n,2);
b.S.d=null;b.t.best=80;b.api.twStartSet(81);b.api.twEnter();
assert.equal(b.S.d.room,80,'81 unlocked only after beating 80');
assert.equal(b.t.n,3);
b.S.d=null;
const prev=b.S.pts;b.api.twEnter();
assert.equal(b.S.d,null,'Daily cap blocks new checkpoint entry');
assert.equal(b.S.pts,prev,'No extra cost for rejected climb');
const p=b.api.twProgress({...b.t,best:15});
assert(p.includes('Etajul 20')&&p.includes('aria-valuenow="50"'),'Smithing progress reflects actual record');
assert(b.api.twProgress({...b.t,best:60}).includes('Toate treptele Fierăriei deblocate'));
assert(b.api.twProgress({...b.t,best:100}).includes('Toți străjerii învinși'));
assert(turn.includes('twProgress(t) + twStartControls(t)'),'New information is in same Tower card');
assert(turn.includes('if (n % 10 === 0)'),'Guardian loot still tied to real wins');
assert(turn.includes('if (n === f && !t.lg[id]'),'One-time legendary still tied to real floor wins');
assert(turn.includes('t.best = n'),'Record still updated only on floor victory');
assert(main.includes("twFloor(d)"),'Starting checkpoint uses existing floor scaling on next battle');
assert(road.includes('19. Turn cu puncte de pornire'));
console.log('OK: record 20/40/60/80 checkpoints, no skipped rewards, cost/day unchanged, clear progression.');
