/* Regression: first three Silver Throne BETA story quests.
   Run: node dev/test-beta-story-quests.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../poveste-misiuni.js'),'utf8');
function setup(server='beta',opts={}) {
  const S={mrStoryV:1,mrPrologSeen:1,fs:[{h:1,c:'Campion',n:'Eroul'}],
    rs:[],cn:{},gold:40,ore:24,tab:'a',vil:'',...opts};
  const map=new Map();
  const document={
    head:{appendChild(){}},body:{appendChild(el){el.parentNode=this;map.set(el.id,el)}},
    getElementById(id){return map.get(id)||null},
    querySelectorAll(){return []},
    querySelector(){return null},
    documentElement:{classList:{toggle(){}}},
    createElement(){let id='';return {set id(x){id=x},get id(){return id},
      setAttribute(){},set innerHTML(v){this._html=v},get innerHTML(){return this._html},
      querySelector(){return {focus(){}}},remove(){map.delete(id)}};}
  };
  let goCount=0;
  const context={S,ST_SERVER:server,document,module:{exports:{}},
    C:k=>(S.cn||{})[k]||0,mrAll:()=>[...S.fs,...S.rs],
    go(){goCount++},setTimeout(){}};
  vm.createContext(context);
  vm.runInContext(src,context);
  return {S,ctx:context,map,goCount:()=>goCount,eval:s=>vm.runInContext(s,context)};
}
const t=setup();
assert.equal(t.eval('sqEnabled()'),true);
assert.equal(t.eval('sqCurrent().id'),'juramant');
assert.equal(t.eval('sqQuiet()'),true,'Ghidul vechi este optional pentru noua poveste');
t.eval('sqHelpToggle()');
assert.equal(t.S.sqHelp,1,'Ghidul poate fi deschis la cerere');
t.eval('sqHelpToggle()');
assert.equal(t.S.sqHelp,0,'Ghidul poate fi ascuns din nou');
assert.equal(t.eval('sqProgress(sqCurrent()).ok'),false);
t.eval("sqClaim('juramant')");
assert.equal(t.S.gold,40,'unearned quest cannot be claimed');
t.S.fs.push({h:0,c:'Paznic',n:'Toma',nn:1});
assert.equal(t.eval('sqProgress(sqCurrent()).ok'),false,'unnamed mercenary does not complete quest');
delete t.S.fs[1].nn;
assert.equal(t.eval('sqProgress(sqCurrent()).ok'),false,'Paznicul numit nu rezolva singur prima misiune');
assert.equal(t.eval('sqProgress(sqCurrent()).n'),1);
t.S.cn.l=1;
assert.equal(t.eval('sqProgress(sqCurrent()).ok'),true,'Prima misiune cere si o intoarcere din mina');
t.eval("sqClaim('juramant')");
assert.equal(t.S.gold,60);
assert.equal(t.eval('sqCurrent().id'),'cenusa');
assert.equal(t.map.has('sq-reward'),true);
t.eval("sqClaim('juramant')");
assert.equal(t.S.gold,60,'claim-once safeguard');
t.eval("sqClaim('cenusa')");
assert.equal(t.S.ore,24);
t.S.fs.push({h:0,c:'Arcaș',n:'Ilinca',nn:1});
t.S.cn.f=1;
assert.equal(t.eval('sqProgress(sqCurrent()).ok'),false,'Arcasul trebuie numit');
delete t.S.fs[2].nn;
assert.equal(t.eval('sqProgress(sqCurrent()).ok'),true);
t.eval("sqClaim('cenusa')");
assert.equal(t.S.ore,39);
assert.equal(t.eval('sqCurrent().id'),'han');
t.S.cn.t=1;
assert.equal(t.eval('sqProgress(sqCurrent()).n'),1);
t.S.rs.push({h:0,c:'Războinic',n:'Radu',nn:1});
assert.equal(t.eval('sqProgress(sqCurrent()).n'),1);
delete t.S.rs[0].nn;
assert.equal(t.eval('sqProgress(sqCurrent()).ok'),true);
t.eval("sqClaim('han')");
assert.equal(t.S.gold,95);
assert.equal(t.S.ore,44);
assert.equal(t.eval('sqCurrent()'),null);
t.eval("sqClaim('han')");
assert.equal(t.S.gold,95);
assert.equal(t.S.ore,44);
assert.equal(t.eval("sqPanel().includes('Primele jurăminte')"),true);
assert.equal(t.goCount(),5); /* 3 revendicari + 2 comutari ghid */
const ex=setup('beta',{mrStoryV:undefined,mrPrologSeen:undefined});
assert.equal(ex.eval('sqEnabled()'),false);
const stateBefore=JSON.stringify(ex.S);
ex.eval('sqPreview()');
assert(ex.map.has('sq-preview'),'old BETA account should preview story quests');
assert.equal(JSON.stringify(ex.S),stateBefore,'preview cannot mutate save');
const live=setup('live');
assert.equal(live.eval('sqEnabled()'),false);
live.eval("sqClaim('juramant');sqPreview()");
assert.equal(live.S.gold,40);
assert(!live.map.has('sq-preview'),'no BETA previews on LIVE');
const pending=setup('beta',{mrPrologSeen:0});
const intro=setup('beta',{mrPrologSeen:1,mrPrologPending:1});
assert.equal(intro.eval('sqEnabled()'),false,'Questul nu se suprapune cu prologul');
assert.equal(pending.eval('sqEnabled()'),false);
assert.equal(pending.eval('sqPanel()'),'','prologue precedes quests');
console.log('OK: meaningful milestones, optional guide, single claims, previews and LIVE isolation.');
