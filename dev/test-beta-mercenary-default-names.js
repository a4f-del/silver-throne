/* Silver Throne BETA — pas 06: nume prestabilite la recrutarea mercenarilor.
 * node dev/test-beta-mercenary-default-names.js
 * Nu accesează browserul, Supabase sau salvări reale. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const merc=fs.readFileSync(path.join(root,'mercenari.js'),'utf8');
const story=fs.readFileSync(path.join(root,'mercenari-poveste.js'),'utf8');
const journey=fs.readFileSync(path.join(root,'drumul-eroului.js'),'utf8');
new Function(merc); new Function(story); new Function(journey);
const from=merc.indexOf('const MR = {'), to=merc.indexOf('const mrAll =',from);
assert(from>=0&&to>from);
const MR=new Function(merc.slice(from,to)+';return MR;')();
const recStart=merc.indexOf('function mrRecruit(c) {');
const recEnd=merc.indexOf('/* la fiecare desenare',recStart);
assert(recStart>=0&&recEnd>recStart);
const logic=merc.slice(recStart,recEnd);
function create({beta=true,newHero=true,heroName='Eroul'}={}) {
 const S={fs:[{h:1,n:heroName,c:'Campion',hp:45}],rs:[],mrOff:[],mrPresetV:beta&&newHero?1:undefined};
 let goCalls=0;
 const scope=new Function('S','MR','ST_SERVER','jeFocus','mhp','P','TR','TMAX','go',
  'const mrAll=()=>[...S.fs,...S.rs];\nconst mrHas=c=>mrAll().some(f=>!f.h&&f.c===c);\n'+
  logic+';return {mrDefaultName,mrNew,mrRecruit};');
 const api=scope(S,MR,beta?'beta':'live',()=>beta&&newHero,()=>50,a=>a[0],[{n:'Viteaz'}],()=>3,()=>goCalls++);
 return {S,api,get goCalls(){return goCalls}};
}
const named=create();
const names=[['Paznic','Toma'],['Arcaș','Ilinca'],['Războinic','Radu'],['Vraci','Sânziana'],['Mag','Ioana']];
for(const [c,n] of names){
 named.S.mrOff.push(c);
 named.api.mrRecruit(c);
 const f=[...named.S.fs,...named.S.rs].find(x=>x.c===c);
 assert(f, c+' recruited');
 assert.equal(f.n,n,c+' preset name');
 assert.equal(f.nn,undefined,c+' does not prompt for name');
 assert.equal(f.rnf,undefined,c+' retains free rename');
 assert(named.S.msg.includes(n),c+' join confirmation shows name');
}
assert.equal(new Set([...named.S.fs,...named.S.rs].map(f=>f.n)).size,6,'No duplicate mercenary names');
assert.equal(named.goCalls,5,'Exactly one draw per recruit');
assert.equal(named.S.fs[0].n,'Eroul','Hero name unchanged');
const conflict=create({heroName:'Toma'});
assert.equal(conflict.api.mrDefaultName('Paznic'),'Petru','Avoid collision with hero name');
const existingBeta=create({newHero:false});
const old=existingBeta.api.mrNew('Paznic');
assert.equal(old.n,'Paznic');assert.equal(old.nn,1,'Existing BETA flow still prompts');
const live=create({beta:false});
const oldLive=live.api.mrNew('Paznic');
assert.equal(oldLive.n,'Paznic');assert.equal(oldLive.nn,1,'LIVE flow unchanged');
assert(story.includes('mrDefaultName(c)'),'Story announces preset name before join');
assert(story.includes('mrs-more')&&story.includes('Citește povestea completă'),'Story text is optional for new players');
assert(merc.includes('mrPresetEnabled()?mrStoryArchive()'),'New players get a replay archive, not the QA preview panel');
assert(story.includes('mrRecruit(c);'),'Existing recruit path is reused');
assert(journey.includes('Paznicul s-a alăturat'),'Onboarding recognizes already-named companion');
assert(merc.includes('free = !f.rnf'),'First renaming remains free in Cont');
assert(fs.readFileSync(path.join(root,'erou.js'),'utf8').includes('S.mrPresetV = 1'),'Only newly created BETA heroes opt in');
/* Runtime: the story is short, can be expanded, cannot open over combat,
   and replay is read-only. No browser or Supabase required. */
const storyState={mrStoryV:1,mrPresetV:1,mrOff:['Paznic'],d:null,mrStorySeen:[]};
const dom={last:null,count:0};
const document={
 head:{appendChild(){}},
 getElementById(){return null},
 createElement(){return {id:'',innerHTML:'',setAttribute(){},remove(){},
   querySelector(){return {focus(){}}}}},
 body:{appendChild(el){dom.last=el;dom.count++}}
};
let storyJoins=0;
const sf=new Function('ST_SERVER','S','document','mrHas','mrPresetEnabled','mrDefaultName','tEsc','av','mrRecruit','go',
 story+';return {mrStoryShow,mrStoryJoin,mrStoryLater};')(
 'beta',storyState,document,()=>false,()=>true,()=> 'Toma',x=>String(x),()=>'<img alt="">',
 ()=>{storyJoins++},()=>{});
sf.mrStoryShow('Paznic',false);
assert(dom.last&&dom.last.innerHTML.includes('Toma'),'Preset name appears in story');
assert(dom.last.innerHTML.includes('<details class="mrs-more">'),'Full text can be expanded, not forced');
assert(dom.last.innerHTML.includes('Primește-l'),'Single recruit CTA is visible');
sf.mrStoryJoin();
assert.equal(storyJoins,1,'One recruit, no second naming modal');
assert.deepEqual(storyState.mrStorySeen,['Paznic'],'Story marked seen on acceptance');
storyState.d={f:{}};
sf.mrStoryShow('Paznic',false);
assert.equal(dom.count,1,'Never open a new story during combat');
storyState.d=null;
sf.mrStoryShow('Paznic',true);
sf.mrStoryJoin();
assert.equal(storyJoins,1,'Replay cannot recruit a second time');

const beginArchive=merc.indexOf('function mrStoryArchive() {');
const endArchive=merc.indexOf('function mrHan()',beginArchive);
assert(beginArchive>=0&&endArchive>beginArchive);
const archiveFn=new Function('S','MR','mrPresetEnabled','mrStoryPreview','stPrologPreview','mrHas','mrAll','tEsc',
 merc.slice(beginArchive,endArchive)+';return mrStoryArchive;')(
 {mrPrologSeen:1,mrStorySeen:['Paznic'],fs:[{n:'Eroul',h:1},{n:'Toma',c:'Paznic'}],rs:[]},
 MR,()=>true,()=>{},()=>{},c=>c==='Paznic',()=>[{h:1,n:'Eroul'},{c:'Paznic',n:'Toma'}],String);
const archive=archiveFn();
assert(archive.includes('Toma · Paznic')&&archive.includes('Prologul'),'Replay archive lists seen characters');
assert(!archive.includes('Arcaș')&&!archive.includes('Mag'),'Replay archive hides spoilers');
console.log('OK: 5 names, onboarding story/replay, combat guard, no duplicate recruitment, free rename, legacy BETA/LIVE unchanged.');
