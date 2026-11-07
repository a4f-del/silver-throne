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
const names=[['Paznic','Toma'],['Arcaș','Ilinca'],['Războinic','Radu'],['Vraci','Matei'],['Mag','Ioana']];
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
assert(story.includes('mrRecruit(c);'),'Existing recruit path is reused');
assert(journey.includes('Paznicul s-a alăturat'),'Onboarding recognizes already-named companion');
assert(merc.includes('const free = !f.rnf'),'First renaming remains free in Cont');
assert(fs.readFileSync(path.join(root,'erou.js'),'utf8').includes('S.mrPresetV = 1'),'Only newly created BETA heroes opt in');
console.log('OK: 5 preset names, no naming modal, unique names, recruit message, free rename, legacy BETA and LIVE unchanged.');
