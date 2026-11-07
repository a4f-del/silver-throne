/* Silver Throne BETA — regressions for unified Drumul Eroului.
   Usage: node dev/test-drumul-eroului.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../drumul-eroului.js'),'utf8')
  +'\n'+fs.readFileSync(path.join(__dirname,'../poveste-misiuni.js'),'utf8');
function setup(server='beta',opts={}){
 const S={journeyV:1,mrStoryV:1,mrPrologSeen:1,mrPrologPending:0,fs:[{h:1,c:'Campion'}],
  rs:[],cn:{},gold:100,ore:20,inv:[],tab:'a',vil:'',...opts};
 const map=new Map();let saves=0;
 const document={
  head:{appendChild(){}},
  body:{appendChild(el){map.set(el.id,el)}},
  getElementById:id=>map.get(id)||null,
  documentElement:{classList:{toggle(){}}},
  querySelectorAll(){return []},
  createElement(){let id='',html='';return{
   set id(v){id=v},get id(){return id},set innerHTML(v){html=v},get innerHTML(){return html},
   setAttribute(){},remove(){map.delete(id)},querySelector(){return {focus(){}}}
  }}
 };
 const ctx={S,ST_SERVER:server,C:k=>S.cn[k]||0,mrAll:()=>S.fs.concat(S.rs),
  document,go(){},save(){saves++},setTimeout(){},module:{exports:{}}};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 return {S,ctx,map,saves:()=>saves,run:js=>vm.runInContext(js,ctx)};
}
const x=setup();
assert(x.run('jeEnabled()&&jeReady()'));
assert(!x.run('sqEnabled()'),'legacy rewards must be disabled');
assert.equal(x.run('jeCurrent().id'),'poarta');
assert.equal(x.run('jeStatus(jeCurrent()).ok'),false);
x.run("jeClaim('poarta')");
assert.equal(x.S.gold,100);
x.S.fs.push({h:0,c:'Paznic',n:'Toma'});
assert.equal(x.run('jeStatus(jeCurrent()).ok'),false,'guard alone insufficient');
x.S.cn.l=1;x.run("jeClaim('poarta')");
assert.equal(x.S.gold,150);assert.equal(x.S.ore,35);
x.run("jeClaim('poarta')");
assert.equal(x.S.gold,150,'no duplicate claim');
assert.equal(x.run('jeCurrent().id'),'urme');
x.S.mrStorySeen=['Arcaș'];
assert.equal(x.run('jeCurrent().action()[0]'),'Han','deferred Archer at Han');
x.S.fs.push({h:0,c:'Arcaș',n:'Ilinca'});
assert.equal(x.run('jeStatus(jeCurrent()).ok'),false,'Archer alone insufficient');
x.S.cn.f=1;x.run("jeClaim('urme')");
assert.equal(x.S.gold,180);assert.equal(x.S.ore,60);
x.S.cn.e=1;x.run("jeClaim('otel')");
assert.equal(x.S.gold,210);assert.equal(x.S.ore,65);
x.S.cn.t=1;x.S.rs.push({h:0,c:'Războinic',n:'Radu'});
x.run("jeClaim('han')");
assert.equal(x.S.gold,345);assert.equal(x.S.ore,70);
x.S.tab='a';x.S.vil='x';x.run('jeVisit()');
assert.equal(x.S.jeVisitedMissions,1);
assert.equal(x.saves(),1,'first visit persists');
x.run('jeVisit()');assert.equal(x.saves(),1,'repeat visit not re-saved');
x.run("jeClaim('vesti')");
assert.equal(x.S.gold,375);
x.S.cn.r=1;x.run("jeClaim('hotar')");
assert.equal(x.S.gold,455);assert.equal(x.S.ore,90);
assert.equal(x.run('jeCurrent()'),null);
x.run("jeClaim('hotar')");assert.equal(x.S.gold,455);
const old=setup('beta',{journeyV:undefined});
const initial=JSON.stringify(old.S);old.run('jePreview()');
assert(!old.run('jeEnabled()'));assert(old.run('sqEnabled()'));
assert(old.map.has('je-preview'));assert.equal(JSON.stringify(old.S),initial);
const live=setup('live');
live.run("jeClaim('poarta');jePreview()");
assert(!live.run('jeEnabled()'));assert.equal(live.S.gold,100);
assert(!live.map.has('je-preview'));
const intro=setup('beta',{mrPrologSeen:0});
assert(!intro.run('jeReady()'));assert.equal(intro.run('jePanel()'),'');
console.log('OK: 6 organic stages, rewards once, old BETA and LIVE protected, preview safe.');
