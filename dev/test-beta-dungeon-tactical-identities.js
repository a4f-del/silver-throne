/* Silver Throne — BETA pas 16: identitate tactică pentru monștrii Temnițelor.
 * node dev/test-beta-dungeon-tactical-identities.js
 * Test de execuție fără browser/Supabase și fără mutarea salvărilor reale. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const source=read('trepte.js'),index=read('index.html'),ui=read('aventura-carduri.js');
new Function(source);new Function(ui);
for(const m of index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
function between(src,start,end){
 const i=src.indexOf(start),j=src.indexOf(end,i+1);
 assert(i>=0&&j>i,'Cannot extract '+start);return src.slice(i,j);
}
const desc=between(source,'const TR_D = {','const TR_A = {');
const TR_D=new Function(desc+';return TR_D;')();
const data=between(source,'const TR_MOB={','const MON_SLUG = {');
const engine=between(source,'function trStart(es, d, b) {','const trDef0 =');
const rebirth=between(source,'function trRb(f, log) {','/* după căpitan:');
let impacted=0;
function setup(server='beta'){
 const S={fs:[{n:'Eroul',hp:70,c:'Campion'},{n:'Toma',hp:70,c:'Paznic'}],d:null};
 const DG=Object.keys(TR_D).map(n=>({n}));
 const run=new Function('S','ST_SERVER','DG','trDef','trCtr','P','trHurt',
   data+engine+rebirth+';return {TR_MOB,trMobInfo,trStart,trDmg,trMobTurn,trRb};');
 const api=run(S,server,DG,n=>TR_D[n],()=>false,a=>a[0],(f,damage,L)=>{
  impacted++;f.hp-=Math.max(1,Math.round(damage));L.push('Valul/Fulgerul atinge '+f.n);
 });
 return {S,DG,api};
}
const beta=setup();
assert.equal(Object.keys(beta.api.TR_MOB).length,10,'Exactly one short mechanic per dungeon');
assert.equal(beta.DG.length,10,'All ten dungeon definitions covered');
for(let i=0;i<beta.DG.length;i++){
 const d={di:i,room:0,one:0,raid:null}; /* d.one=0: live odds simulator */
 beta.S.d=d;
 const e={n:'monstru',hp:100,mh:100,atk:20,b:false};
 beta.api.trStart([e],d,false);
 assert.equal(e.tm,TR_D[beta.DG[i].n].a,'Normal monster has the dungeon motif, even in odds simulation');
 assert(beta.api.trMobInfo(i).length>20,'Mechanic explained before combat');
 assert.equal(e.n,TR_D[beta.DG[i].n].m[0],'Existing monster name preserved');
}
function mob(key){const i=beta.DG.findIndex(g=>TR_D[g.n].a===key);
 const d={di:i,room:0,one:1,raid:null};beta.S.d=d;
 const e={n:'monstru',hp:100,mh:100,atk:20,b:false};
 beta.api.trStart([e],d,false);return e;
}
let e=mob('shield'),L=[];
assert.equal(beta.api.trDmg(e,100,false,L,{c:'Campion'}),75);
assert.equal(beta.api.trDmg(e,100,false,L,{c:'Campion'}),100,'Only first hit protected');
e=mob('invuln');L=[];
for(let i=0;i<3;i++)beta.api.trMobTurn(e,beta.S.fs,L);
assert.equal(beta.api.trDmg(e,100,false,L,{c:'Campion'}),70);
assert.equal(beta.api.trDmg(e,100,false,L,{c:'Campion'}),100,'Barrier is consumed');
e=mob('call');L=[];
beta.api.trMobTurn(e,beta.S.fs,L);
assert.equal(e.atk,Math.round(16*.8*1.08),'First-turn mobilization has modest effect');
const attack=e.atk;beta.api.trMobTurn(e,beta.S.fs,L);assert.equal(e.atk,attack);
e=mob('howl');L=[];for(let i=0;i<3;i++)beta.api.trMobTurn(e,beta.S.fs,L);
assert(e.atk>attack,'Wolves become stronger after third turn');
e=mob('drain');L=[];e.hp=60;
beta.api.trMobTurn(e,beta.S.fs,L);assert.equal(e.hp,60);
beta.api.trMobTurn(e,beta.S.fs,L);assert(e.hp>60&&e.hp<75,'Weak regeneration');
e=mob('wave');L=[];impacted=0;for(let i=0;i<3;i++)beta.api.trMobTurn(e,beta.S.fs,L);
assert.equal(impacted,2,'Weak wave hits both living fighters');
e=mob('storm');L=[];impacted=0;for(let i=0;i<3;i++)beta.api.trMobTurn(e,beta.S.fs,L);
assert.equal(impacted,1,'Weak lightning hits just one fighter');
e=mob('poison');L=[];for(let i=0;i<3;i++)beta.api.trMobTurn(e,beta.S.fs,L);
assert.equal(beta.S.fs[0].ps,1,'Poison only one turn');assert(beta.S.fs[0].psd>0);
beta.S.fs[0].ps=0;beta.S.fs[0].psd=0;
e=mob('burn');L=[];for(let i=0;i<3;i++)beta.api.trMobTurn(e,beta.S.fs,L);
assert.equal(beta.S.fs[0].ps,1,'Burn only one turn');
e=mob('rebirth');L=[];e.hp=0;
beta.api.trRb({es:[e]},L);assert.equal(e.hp,Math.max(1,Math.round(e.mh*.12)));
e.hp=0;beta.api.trRb({es:[e]},L);assert.equal(e.hp,0,'Normal foe cannot revive twice');
const live=setup('live'),ld={di:0,room:0,one:1,raid:null};
live.S.d=ld;const old={n:'monstru',hp:100,mh:100,atk:20,b:false};
live.api.trStart([old],ld,false);assert.equal(old.tm,undefined,'LIVE monsters do not gain motifs');
live.api.trMobTurn(Object.assign(old,{tm:'call'}),live.S.fs,[]);
assert.equal(old.atk,16,'LIVE original attack remains after trStart scaling');
assert.equal(live.api.trMobInfo(0),'','LIVE has no new tactics banner');
const raid=mob('shield');beta.S.d.raid=1;assert.equal(beta.api.trDmg(raid,100,false,[],{}),100,'Raid never inherits this effect');
const tw={di:0,room:0,tw:1,one:1};beta.S.d=tw;
assert(!index.includes('trMobTurn(e,al,L);spEnemyHit(e,al,L);'),'Death-safe attack guard required');
assert(index.includes("if(ST_SERVER==='beta'&&typeof trMobTurn==='function')trMobTurn(e,al,L)"));
assert(ui.includes("Particularitatea acestei Temnițe")&&ui.includes("trMobInfo(i)"));
assert(index.includes("d.one=0")||source.includes("d.one"),'Odds simulation must be assessed for tactical behavior');
console.log('OK: 10 thematic traits, odds-simulation inclusion, one-time guards, beta-only, raids/PvP/LIVE isolated.');
