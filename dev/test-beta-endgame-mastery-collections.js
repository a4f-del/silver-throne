/* Silver Throne — BETA: măiestrie 50 și colecții cosmetice.
 * node dev/test-beta-endgame-mastery-collections.js
 * Fără Supabase, browser, alte conturi sau salvări reale. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const src=read('endgame-ui.js'),html=read('index.html'),team=read('echipa.js'),profile=read('profil.js'),tower=read('turn.js');
new Function(src);new Function(team);new Function(profile);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))if(m[1].trim())new Function(m[1]);
let saves=0,adventure=false;
const hero={h:1,n:'Eroul',c:'Campion',hp:100,eq:{w:null}};
const DG=['Mina Cenușie','Catacombele Uitate','Cetatea Scufundată','Abisul Cenușiu','Forja Veche'].map(n=>({n,ev:0}));
const TW_LG=[[20,'maree'],[25,'pasi'],[30,'violet'],[40,'fum'],[50,'smarald'],[60,'ametist'],[70,'izvor'],[80,'tunet'],[90,'zori'],[100,'rege']];
const LG=Object.fromEntries(TW_LG.map(([floor,id])=>[id,{n:id==='maree'?'Amuleta Mareelor':id,ico:'imagini/legendare/'+id+'-ico.webp'}]));
const escape=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function init(server='beta',level=50) {
 const S={lvl:level,tab:'e',fs:[{...hero,eq:{w:null}}],rs:[],inv:[],tw:{best:0,lg:{}},gold:500,ore:80,pts:30};
 const api=new Function('S','ST_SERVER','DG','TW_LG','LG','tEsc','go','adventureActive',src+
 ';return {egEnabled,egRecordBoss,egProgress,egTitleReady,egTitleGet,egTitleSelect,egOwnedIds,egCollectionRows,egEndgamePanel};')(
  S,server,DG,TW_LG,LG,escape,()=>saves++,()=>adventure);
 return {S,api};
}
const x=init(),{S,api}=x;
assert(api.egEnabled());assert(api.egEndgamePanel().includes('Măiestrie · nivelul 50'));
assert(api.egEndgamePanel().includes('0/10 legendare deținute'));
const original={gold:S.gold,ore:S.ore,pts:S.pts};
function boss(i,options={}){
 const d={di:i,one:1,raid:null,ev:0,tw:0,...options};
 api.egRecordBoss(d);return d;
}
let d=boss(0);assert.equal(S.eg.bosses[0],1);assert.equal(S.eg.solo[0],1);
const before=JSON.stringify(S.eg);api.egRecordBoss(d);
assert.equal(JSON.stringify(S.eg),before,'Second call on same encounter is idempotent');
boss(1);boss(2);assert(api.egTitleReady('solo'),'Solo three distinct dungeons unlocks cosmetic title');
assert.equal(api.egTitleReady('bosses'),false);
api.egTitleSelect('solo');
assert.equal(S.egTitle,'solo');assert.equal(api.egTitleGet(),'Umbra Temnițelor');
assert.equal(saves,1);
assert.deepEqual({gold:S.gold,ore:S.ore,pts:S.pts},original,'No power/resources granted');
boss(3);assert(api.egTitleReady('bosses'),'Four distinct bosses unlock title');
S.fs.push({c:'Paznic',n:'Toma',hp:75,eq:{}});
boss(4);assert.equal(S.eg.solo[4],undefined,'Not solo with a companion');
S.fs.push({c:'Arcaș',n:'Ilinca',hp:45,eq:{}});
S.fs.push({c:'Mag',n:'Ioana',hp:35,eq:{}});
boss(3);
assert(api.egTitleReady('classes'),'Four active classes unlock mastery title');
S.tw.best=80;assert(api.egTitleReady('tower'));
api.egTitleSelect('tower');assert.equal(api.egTitleGet(),'Străjerul Înalt');
S.d={f:{}};api.egTitleSelect('bosses');assert.equal(S.egTitle,'tower','No cosmetic changes in combat');
S.d=null;adventure=true;api.egTitleSelect('bosses');assert.equal(S.egTitle,'tower','No changing title during adventure');
adventure=false;
api.egTitleSelect('');assert.equal(api.egTitleGet(),'');
assert(api.egTitleReady('solo')&&api.egTitleReady('bosses'),'Achievements remain earned');
S.eg.bosses.fake=1;assert.equal(api.egProgress().bosses,4,'Unknown boss key does not fabricate progress');
S.eg.solo.fake=1;assert.equal(api.egProgress().solo,3,'Unknown solo key does not fabricate progress');
const initial=JSON.stringify(S);
const htmlPanel=api.egEndgamePanel();
assert(htmlPanel.includes('Eroul')===false);
assert.equal(JSON.stringify(S),initial,'Rendering mastery does not mutate saves');
const eq={lg:'maree',t:'j',name:'Amuleta Mareelor'};
const inv={lg:'pasi',t:'b',name:'Pașii Furtunii'};
S.rs.push({c:'Vraci',n:'Matei',hp:40,eq:{h:{lg:'violet',t:'h'}}});
S.fs[0].eq.w=eq;S.inv=[inv,inv];
assert.equal(api.egOwnedIds().size,3,'Equipped and inventory items counted once');
S.tw.lg.fum=1;
const collection=api.egCollectionRows();
assert(collection.includes('Ecourile Adâncurilor · 3/3'));
assert(collection.includes('Arsenalul Turnului · 0/3'));
assert(collection.includes('obținut cândva'),'Historical reward not incorrectly counted as currently owned');
assert(collection.includes('lipsește'));
assert.equal(api.egEndgamePanel().includes('3/10 legendare deținute'),true);
assert(!collection.includes('bonus +'),'Collection gives no combat stats');
assert(team.includes('egEndgamePanel()'),'Mastery view belongs to Team composition');
assert(profile.includes('eg-title-medal')&&profile.includes('eg-cosmetic'),'Selected cosmetic title is visible on hero profile');
assert(html.includes('endgame-ui.js?v=2026.11.09-1'),'New module loaded');
assert(html.includes('egRecordBoss(d)'),'Tracking wired to real boss completion');
assert(tower.includes('TW_LG'),'Reuses Tower legendary milestones');
const low=init('beta',49);assert.equal(low.api.egEndgamePanel(),'');low.api.egRecordBoss({di:0,one:1});
assert.equal(low.S.eg,undefined,'No level-49 tracking');
const rejected=init();for(const altered of [
 {di:0,one:0},{di:0,one:1,tw:1},{di:0,one:1,ev:1},{di:0,one:1,raid:0},
 {di:-1,one:1},{di:100,one:1}
])rejected.api.egRecordBoss(altered);
assert.equal(rejected.S.eg,undefined,'Simulated, tower, weekly, raid, invalid bosses do not count');
const fallen=init();fallen.S.fs.push({c:'Paznic',hp:0});
fallen.api.egRecordBoss({di:0,one:1});
assert.equal(fallen.S.eg.solo[0],undefined,'Fallen teammate cannot falsely count as solo');
console.log('OK: mastery 50, distinct solo/boss/classes, tower title, owned vs past collectibles, cosmetic-only, no simulation.');
