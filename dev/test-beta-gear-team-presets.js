/* Silver Throne — BETA: echipament după clasă și preseturi erou +0/1/2/3.
 * node dev/test-beta-gear-team-presets.js */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const merc=read('mercenari.js'),inv=read('inventar.js'),team=read('echipa.js'),html=read('index.html');
for(const s of [merc,inv,team])new Function(s);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
const slice=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert(i>=0&&j>i,a);return s.slice(i,j)};
const code=slice(merc,'function mrTeamPresetLabel(n)','function mrHan() {');
let live=false,lockedExpedition=false,draws=0;
const hero={h:1,c:'Campion',n:'Eroul',hp:100};
const arc={c:'Arcaș',n:'Ilinca',hp:55};
const guard={c:'Paznic',n:'Toma',hp:60};
const mage={c:'Mag',n:'Ioana',hp:50};
const fighter={c:'Războinic',n:'Radu',hp:65};
const S={lvl:12,fs:[hero,arc,guard],rs:[mage,fighter],sel:2};
const f=new Function('S','ST_SERVER','TMAX','mxBusy','go',code+
 ';return {mrTeamPresetReady,mrTeamPresetPanel,mrTeamPresetUse,mrTeamPresetSave};');
const mk=(st,server)=>f(st,server,()=>st.lvl>=30?4:3,x=>lockedExpedition&&x===mage,()=>draws++);
const api=mk(S,'beta');
assert(api.mrTeamPresetPanel().includes('Erou +3'));
assert(api.mrTeamPresetPanel().includes('Se deschide la nivelul 30'));
api.mrTeamPresetSave();
assert.deepEqual(S.mrTeamPresets[2],['Arcaș','Paznic']);
const before=JSON.stringify({fs:S.fs,rs:S.rs});
api.mrTeamPresetUse(3);
assert.equal(JSON.stringify({fs:S.fs,rs:S.rs}),before,'Cannot exceed team cap');
api.mrTeamPresetUse(0);
assert.deepEqual(S.fs,[hero],'Solo removes mercenaries from active party');
assert.deepEqual(S.rs,[mage,fighter,arc,guard],'They remain available, not deleted');
assert.equal(S.sel,0);
assert.equal(S.soloDungeon,1);
api.mrTeamPresetUse(2);
assert.deepEqual(S.fs,[hero,arc,guard],'Saved roster restored by class');
assert.deepEqual(S.rs,[mage,fighter],'Reserve not duplicated');
assert.equal(S.soloDungeon,0);
api.mrTeamPresetUse(0); /* reaplicăm din bancă, fără preferință pentru mercenarii încă activi */
api.mrTeamPresetUse(1);
assert.deepEqual(S.fs,[hero,mage],'Initial +1 formation chooses an available mercenary');
api.mrTeamPresetSave();
assert.deepEqual(S.mrTeamPresets[1],['Mag']);
api.mrTeamPresetUse(0);
lockedExpedition=true;
const backup=JSON.stringify({fs:S.fs,rs:S.rs});
api.mrTeamPresetUse(1);
assert.equal(JSON.stringify({fs:S.fs,rs:S.rs}),backup,'Saved mercenary on expedition cannot be stolen');
assert(S.msg.includes('indisponibil'),'Explains why saved team cannot load');
lockedExpedition=false;
S.lvl=30;api.mrTeamPresetUse(3);
assert.equal(S.fs.length,4,'Fourth slot works at level 30');
assert.equal(S.soloDungeon,0);
S.adventure={di:0};
const inAdventure=JSON.stringify({fs:S.fs,rs:S.rs});
api.mrTeamPresetUse(0);
assert.equal(JSON.stringify({fs:S.fs,rs:S.rs}),inAdventure,'No changes inside a dungeon');
S.adventure=null;S.d={f:{}};
api.mrTeamPresetSave();
assert(S.msg.includes('Încheie'),'No saving while in combat');
S.d=null;
const beforeLive=JSON.stringify(S);
const liveApi=mk(S,'live');
assert.equal(liveApi.mrTeamPresetPanel(),'','LIVE panel hidden');
liveApi.mrTeamPresetUse(0);
assert.equal(JSON.stringify(S),beforeLive,'LIVE roster untouched');
assert(draws>=1,'Real actions trigger redraw/persistence through go()');
assert(team.includes('mrTeamPresetPanel()'),'Preset controls are in composition tab');

const hintCode=slice(inv,'function invClassHint(it){','function invCard(x) {');
const WF={sab:{c:'Campion'},arc:{c:'Arcaș'},sce:{c:'Vraci'}};
const selected={c:'Campion',n:'Eroul'};
const hint=(server)=>new Function('ST_SERVER','WF','wfOf','cur',hintCode+';return invClassHint')(
 server,WF,it=>it.wf,()=>selected);
const badge=hint('beta');
assert(badge({t:'w',wf:'sab'}).includes('✓ Potrivit clasei Campion'));
assert(badge({t:'w',wf:'arc'}).includes('Armă pentru Arcaș · selectat Campion'));
selected.c='Arcaș';
assert(badge({t:'w',wf:'arc'}).includes('✓ Potrivit clasei Arcaș'));
assert.equal(badge({t:'a'}),'','Armor remains universal');
assert.equal(hint('live')({t:'w',wf:'arc'}),'','LIVE does not change');
assert(inv.includes('${invClassHint(it)}')&&inv.includes('${invClassHint(x.it)}'),'Shows both in backpack and slot chooser');

const bulkCode=slice(inv,'const invBulkSet = ()','/* ------------------------------------------------ ALEGEREA DIN SLOT');
function testBulk(kind,confirmed=true){
 const common={name:'Comun',t:'w',r:0,l:2,m:[]},magic={name:'Magic',t:'a',r:1,l:4,m:['ore']},
 epic={name:'Epic',t:'w',r:3,l:8,m:[]},locked={name:'Locked',t:'w',r:0,l:2,lk:1,m:[]},
 legend={name:'Legend',t:'w',r:3,l:10,lg:1,m:[]};
 const state={inv:[common,magic,epic,locked,legend],gold:0,ore:0,msg:''};
 let approvals=0,redraws=0,materials=0;
 const bs=new Function('S','invVal','invOre','confirm','give','go',bulkCode+
 ';return {invBulkSet,invBulk};')(
 state,it=>4+it.l*3*(it.r+1),it=>Math.floor(6*(1+it.l*.3)/2),()=>{approvals++;return confirmed},
 ()=>{materials++},()=>redraws++);
 assert.equal(bs.invBulkSet().length,2,'Only safe common and magic items selected');
 bs.invBulk(kind);
 const remaining=state.inv.map(x=>x.name);
 if(confirmed){
  assert.deepEqual(remaining,['Epic','Locked','Legend'],'Legendary, epic and locked items protected');
  assert.equal(redraws,1);
  if(kind==='sell')assert.equal(state.gold,10+28,'Gold computed on real items');
  else assert(state.ore>0&&materials===1,'Dismantling gives ore and actual material');
 }else{
  assert.equal(approvals,1);assert.equal(state.inv.length,5,'Cancelled bulk action changes nothing');
 }
}
testBulk('sell',false);testBulk('sell',true);testBulk('dis',true);
/* Forge: existing "Ridică tot" collects only ready slots, once each. */
const forgeSource=read('tema.js');
const forgeCode=slice(forgeSource,'function collectAll()','/* ------------------------------------------------ VERIFICARE DE VERSIUNE');
const slots={slots:4,forge:[
 {end:900,label:'Gata 0'}, {end:850,label:'Gata 1'},
 {end:1200,label:'În lucru'}, null
]};
const collected=[];
const forge=new Function('S','Date','collect','fmt',forgeCode+';return {collectAll,forgeSlots};')(
 slots,{now:()=>1000},i=>{collected.push(i);slots.forge[i]=null;},x=>String(x));
const ready=forge.forgeSlots();
assert(ready.includes('Ridică tot (2)'),'Two ready items show single claim button');
forge.collectAll();
assert.deepEqual(collected,[1,0],'Only ready slots collected, in descending order');
assert(slots.forge[2]&&slots.forge[2].end===1200,'In-progress item not collected');
forge.collectAll();
assert.deepEqual(collected,[1,0],'Repeated claim cannot collect an item again');
assert(!forge.forgeSlots().includes('Ridică tot ('),'No bulk claim when nothing ready');

assert(html.includes('inventar.js?v=2026.11.08-1')&&html.includes('mercenari.js?v=2026.11.08-2')&&
 html.includes('echipa.js?v=2026.11.08-2'),'Scripts refreshed after this UI change');
console.log('OK: class-specific weapons, 4 saved team presets, expedition protection, no combat mutations, safe bulk actions, LIVE isolated.');
