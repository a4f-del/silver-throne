/* Silver Throne — test no-discard for old cloud/local saves.
 * node dev/test-beta-save-compatibility.js
 * Exercises real load() and save(), but only in an isolated memory store. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const start=source.indexOf('function load(src){'),end=source.indexOf('/* rezerva de începător',start);
assert(start>=0&&end>start,'Missing load/save source boundaries');
const code=source.slice(start,end);
function app(){
 const storage=new Map(),queued=[];
 const localStorage={getItem:k=>storage.get(k)||null,
  setItem:(k,v)=>storage.set(k,v)};
 const fn=new Function('DG','localStorage','SKEY','mrMig','contQueue','fresh',
  'let S=null;'+code+';return {load,save,getState:()=>S};');
 const api=fn([{n:'Mina Cenușie'},{n:'Cripta'}],localStorage,'silver-throne-test',
  ()=>{},()=>queued.push('queued'),
  ()=>({fs:[{n:'Erou',h:1,c:'Campion',hp:45}],rs:[],ui:{},pool:{t:0,c:[]},tab:'a',mat:{}}));
 return {api,storage,queued};
}
const fixture={
 lvl:28,tab:'t',fs:[{n:'Erou Vechi',h:1,c:'Campion',hp:124,eq:{}}],
 rs:[{n:'Mercenar',c:'Arcaș',hp:32}],
 pool:null,mat:{jwf:3,jwf0:2,ore:11},gold:175000,ore:220,
 inv:[{name:'Sabie +3',up:3,upStep:3,upFails:4,r:3,l:28,s:{dmg:21}}],
 mrTeamPresets:{1:['Arcaș']},jeMilestoneSeen:2,
 tw:{best:40},tron:{title:'Cavaler'},guild:{tag:'QA'},
 sv:1768000000000,ui:null,tu:0
};
const test=()=>{
 const x=app(),src=JSON.parse(JSON.stringify(fixture));
 x.api.load(src);const state=x.api.getState();
 assert(state.ui&&typeof state.ui==='object'&&!Array.isArray(state.ui),
  'Legacy save without UI preferences must not crash boot');
 assert.equal(state.ui.q,0);assert.equal(state.ui.p,0);assert.equal(state.ui.s,0);
 assert.equal(state.tab,'a','Legacy tab normalized');
 assert.equal(state.mat.jwf0,5,'Legacy material migrated without loss');
 assert.equal(state.mat.jwf,undefined);
 assert.equal(state.gold,175000);assert.equal(state.ore,220);
 assert.equal(state.inv[0].upFails,4,'Forge pity is kept in existing item');
 assert.deepEqual(state.mrTeamPresets,{1:['Arcaș']},'Saved party presets preserved');
 assert.deepEqual(state.tw,{best:40});
 assert.deepEqual(state.tron,{title:'Cavaler'});
 assert.deepEqual(state.guild,{tag:'QA'});
 assert.equal(state.fs[0].n,'Erou Vechi');
 assert.equal(state.rs[0].n,'Mercenar');
 assert.equal(Object.keys(state.deo||{}).length,0);
 x.api.save();
 assert.equal(x.queued.length,1);
 const saved=JSON.parse(x.storage.get('silver-throne-test'));
 assert(saved.sv>0&&saved.sv>=fixture.sv,'Save timestamp valid');
 assert.equal(saved.gold,state.gold);
 assert.equal(saved.inv[0].upFails,4);
 assert.equal(saved.rs[0].c,'Arcaș');
 const y=app();
 y.api.load(saved);
 assert.equal(y.api.getState().gold,175000,'Round-trip save retains gold');
 assert.equal(y.api.getState().mat.jwf0,5,'Repeated load is idempotent');
 return saved;
};
test();
const fromReserve=app();
fromReserve.api.load({lvl:15,tab:'a',fs:[{n:'Merc 1',c:'Paznic',hp:10},
 {n:'Merc 2',c:'Mag',hp:10},{n:'Merc 3',c:'Vraci',hp:10}],
 rs:[{n:'Eroul',c:'Campion',h:1,hp:99}],ui:{q:1,p:0,s:0},mat:{}});
const party=fromReserve.api.getState();
assert(party.fs[0].h===1&&party.fs[0].n==='Eroul','Missing active hero restored from reserve');
assert(party.fs.length===3&&party.rs.length===1,'Old team slot limit retained');
const missingEq=app();
missingEq.api.load({lvl:2,tab:'a',fs:[{n:'Eroul',c:'Campion',h:1,hp:34}],ui:{},
 mat:{},eq:{w:{name:'Sabie'}},pool:{t:0,c:[]}});
assert.equal(missingEq.api.getState().fs[0].eq.w.name,'Sabie');
assert.equal(missingEq.api.getState().eq,undefined,'Legacy hero gear root removed after migration');
assert(!source.includes("const key = KEY + ':beta:' + user.id"),
 'Account-specific save key lives in cont.js, not index');
// The account save key stays the BETA one, so existing testers keep their local saves.
const account=fs.readFileSync(path.join(__dirname,'../cont.js'),'utf8');
assert(account.includes("const key = KEY + ':beta:' + user.id"),
 'Existing BETA local save key is kept');
assert(!account.includes('cRead(KEY)')&&!account.includes('oldSave'),
 'Old LIVE saves are never imported automatically');
console.log('OK: legacy UI migration, intact resources/rosters/gear/pity, cloud save isolation and memory-only round-trip.');
