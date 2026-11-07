/* Silver Throne BETA: Greu/Coșmar + incadrare meniu sat NPC/jucator.
 * node dev/test-beta-dungeon-difficulties-map-menu.js
 * Teste pure JS, fara DB, browser sau mutatii in salvarea reala. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const steps=read('trepte.js'),cards=read('aventura-carduri.js'),css=read('aventura-carduri.css'),
  quick=read('lume-quick.js'),html=read('index.html');
for(const file of [steps,cards,quick])new Function(file);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
const extract=(src,start,end)=>{
 const a=src.indexOf(start),b=src.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'Missing function range '+start+' -> '+end);return src.slice(a,b);
};
const TR_T={n:['Normal','Greu','Coșmar'],lv:12},DG=[{n:'Fortul Părăsit',lv:12,rooms:4,k:2.5}];
const dKey=(i,t)=>i+'_'+t;let goCount=0;
const S={lvl:27,d:null,adventure:{di:0,tierLocked:false},dtr:{0:2},dts:{0:0},
  dsel:{'0_0':2,'0_2':3},fs:[{n:'Eroul',hp:100,h:1}]};
const tierCode=extract(steps,'function trUnl(i)','/* la începutul fiecărei lupte');
const create=(server,state)=>new Function('S','ST_SERVER','DG','TR_T','dKey','go',
  tierCode+';return {trUnl,trTier,trPick,trChips};')(
    state,server,DG,TR_T,dKey,()=>{goCount++});
const t=create('beta',S);
assert.equal(t.trUnl(0),2);
assert.equal(t.trTier(0),0);
let chips=t.trChips(0);
assert(chips.includes('Normal')&&chips.includes('Greu')&&chips.includes('Coșmar'),
 'All 3 difficulties in the BETA dungeon');
assert(!chips.includes('disabled'),'All unlocked difficulties can be selected before first battle');
t.trPick(0,2);
assert.equal(t.trTier(0),2,'Coșmar is selectable within the large dungeon screen');
assert.equal(S.dts[0],2,'Selected difficulty persists in existing save key');
assert.equal(S.dsel['0_2'],undefined,'Preview follows selected difficulty progress');
assert.equal(S.dsel['0_0'],2,'Previous difficulty progress is preserved');
assert.equal(goCount,1,'Difficulty selector rerenders dungeon');
t.trPick(0,1);
assert.equal(t.trTier(0),1,'Greu is also selectable');
S.adventure.tierLocked=true;
chips=t.trChips(0);
assert.equal((chips.match(/disabled title=/g)||[]).length,3,
 'After first real battle all 3 difficulty controls are visible but locked');
t.trPick(0,2);
assert.equal(t.trTier(0),1,'Cannot switch difficulty between fights in same incursion');
assert(chips.includes('Retrage-te'),'Locked state explains how to switch');
S.adventure=null;
t.trPick(0,2);
assert.equal(t.trTier(0),2,'After retreat the selected tier can be changed for next entry');
S.adventure={di:0,tierLocked:false};
S.d={one:1};
t.trPick(0,1);
assert.equal(t.trTier(0),2,'Tier cannot change during active combat');
S.d=null;
const noUnlock={lvl:27,d:null,adventure:{di:0,tierLocked:false},dtr:{0:0},dts:{0:0},fs:S.fs};
const n=create('beta',noUnlock);
assert(n.trChips(0).includes('🔒 Greu')&&n.trChips(0).includes('🔒 Coșmar'),
 'Difficulties are visible but gated until bosses are beaten');
n.trPick(0,2);
assert.equal(n.trTier(0),0,'Locked difficulties cannot be selected');
const live=create('live',{lvl:27,d:null,dtr:{0:2},dts:{0:0},fs:S.fs});
live.trPick(0,1);
assert.equal(live.trTier(0),1,'LIVE keeps its old difficulty choice');
const dungeonSrc=extract(cards,'function acPreparationAdvice(','function acCombatPage(d) {');
const dungeon=new Function(...Object.keys({
  DG,S,TR_T,trTier:t.trTier,trChips:t.trChips,trNames:()=>['Paznic','Sergent','Mag','Căpitan'],
  trSel:()=>0,dMk:()=>({room:0,rooms:4,k:2,dk:'0_2'}),dCostAt:()=>1,
  acArtwork:()=>null,acArt:()=>'<span>portret</span>',acSafe:x=>String(x),
  monStatsAt:()=>({hp:130,atk:26}),trDef:()=>({a:'call'}),TR_A:{call:'Invocare'},
  dOddsAt:()=>55,recGear:()=> 'Epic',acParty:()=>'<div>Echipă</div>'
}),dungeonSrc+';return acDungeonPage(0)')(
 DG,S,TR_T,t.trTier,t.trChips,()=>['Paznic','Sergent','Mag','Căpitan'],
 ()=>0,()=>({room:0,rooms:4,k:2,dk:'0_2'}),()=>1,
 ()=>null,()=>'<span>portret</span>',x=>String(x),()=>({hp:130,atk:26}),
 ()=>({a:'call'}),{call:'Invocare'},()=>55,()=> 'Epic',()=>'<div>Echipă</div>');
assert(dungeon.includes('ac-difficulty')&&dungeon.includes('Dificultate: Coșmar'),
 'BETA large card screen actually renders difficulty selector');
assert(css.includes('.ac-difficulty .tr-ch button'),'Difficulty cards styled for desktop/mobile');
assert(html.includes('S.adventure.tierLocked=true'),'First actual dungeon battle locks tier');
assert(html.includes('tierLocked:false'),'New dungeon adventure allows choice before fight');
// Placements use actual panel height and viewport, for player AND shared NPC target.
const positioning=extract(quick,'  function place(panel, target) {','  function showBeta(kind, id, target) {');
function placeFor(H,R,innerHeight=800,menuHeight=118){
 let below=false;const style={};
 const classes={add:x=>{if(x==='lwqa-below')below=true},remove:x=>{if(x==='lwqa-below')below=false}};
 const panel={style,classList:classes,querySelectorAll:()=>[1,2,3],getBoundingClientRect:()=>({height:menuHeight,width:148}),offsetHeight:menuHeight};
 const host={getBoundingClientRect:()=>H};
 const fn=new Function('map','window',positioning+';return place;')(()=>host,{innerHeight});
 fn(panel,{getBoundingClientRect:()=>R});
 const top=Number.parseFloat(style.top),height=Math.min(menuHeight,Math.max(1,Math.min(H.height-8,innerHeight-H.top-8)-Math.max(8,8-H.top)));
 const displayedTop=below?top:top-height;
 return {below,style,top:displayedTop,bottom:displayedTop+height,height};
}
const H={left:50,top:80,width:620,height:430};
const topVillage=placeFor(H,{left:180,top:182,width:75,height:45,bottom:227});
assert(topVillage.below,'Village 102px from map top should open below if the menu is 118px tall');
assert(topVillage.top>=8&&topVillage.bottom<=H.height-8,'Village menu stays inside map');
assert.equal(topVillage.style.bottom,'auto','Popup must override legacy bottom:12px before top placement');
assert.equal(topVillage.style.height,'auto','Popup must use content height rather than vertical stretching');
assert.equal(topVillage.style.minHeight,'0','Popup must have no inherited min-height');
const highNPC=placeFor(H,{left:220,top:90,width:50,height:44,bottom:134});
assert(highNPC.below&&highNPC.top>=8,'NPC near upper edge opens below');
const lowVillage=placeFor(H,{left:245,top:415,width:60,height:50,bottom:465});
assert(!lowVillage.below,'Village near bottom opens above');
assert(lowVillage.top>=8&&lowVillage.bottom<=H.height-8);
const cropped=placeFor({left:0,top:-140,width:600,height:540},
 {left:25,top:-30,width:80,height:35,bottom:5},580);
assert(cropped.top>=148,'Viewport-cropped map does not place menu above visible screen');
const tiny=placeFor({left:0,top:0,width:240,height:160},
 {left:12,top:6,width:60,height:40,bottom:46},145,120);
assert(Number.parseFloat(tiny.style.maxHeight)>0,'Small map provides scrolling bound');
assert(tiny.style.overflowY==='auto','Scrolling prevents clipping when map is small');
assert(Number.parseFloat(tiny.style.width)<=228,'Quick action panel is slightly smaller');
assert(quick.includes('.lw-quick-actions-panel.lwqa-map{position:absolute;bottom:auto;height:auto;min-height:0;'),
 'BETA styles reset the inherited bottom on the same element');
assert(quick.includes('margin-top:0'), 'Remove legacy margin above the icon row');
assert(quick.includes('flex-wrap:nowrap'), 'Keep three icons on one row');
assert(quick.includes("kind === 'village'")&&quick.includes("kind === 'npc'"),
 'Same place function is used for players and NPC');
assert(quick.includes("aria-label', 'Acțiuni: ' + title"),'Quick menu remains accessible');
console.log('OK: BETA Normal/Greu/Coșmar selection, tier lock, saved progress, LIVE, upper/lower NPC/player menu positioning.');
