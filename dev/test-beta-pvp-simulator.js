/* Silver Throne BETA — simulator de animații PvP: regresii fără rețea / salvări.
 * Rulare: node dev/test-beta-pvp-simulator.js */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const source=root('pvp-simulator.js'),html=root('index.html'),admin=root('admin.js');
new Function(source);new Function(admin);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))if(m[1].trim())new Function(m[1]);
assert(html.includes('pvp-simulator.js?v='),'scriptul este încărcat');
assert(admin.includes("typeof simPvpAdminHtml==='function'?simPvpAdminHtml():''"),'panoul admin include simulatorul');
const create=(server='beta',rights=true)=>{
 const hero={n:'Eroul',c:'Campion',h:1,hp:120},a={n:'Arcașul',c:'Arcaș',hp:80},b={n:'Vraciul',c:'Vraci',hp:90};
 const S={fs:[hero,a],rs:[b],lvl:25,d:null,adventure:null,pts:20,gold:999,tw:{n:2},wr:{cur:null},tron:{cur:null}};
 const snap=JSON.stringify(S),FX={cast:{original:true},q:[{foo:true}],playing:false},classes=new Set(),events=[];
 const body={classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)}};
 const DOC={head:null,body};
 const CONT={user:{id:'test'},admin:rights},ADM={open:true,srv:rights};
 let draw=0,playCount=0;const castRecords=[];
 const dependencies={
 ST_SERVER:server,CONT,ADM,S,FX,CL:{Campion:{hp:45},Războinic:{hp:40},Arcaș:{hp:35},Paznic:{hp:55},Mag:{hp:28},Vraci:{hp:30}},
 mhp:f=>f.h?160:100,tEsc:s=>String(s),acSafe:s=>String(s),document:DOC,
 admDraw:()=>{draw++},acFxMarkup:()=>'',fxPlay:(frames,done,first,offset)=>{playCount++;assert.equal(first,true);assert.equal(offset,0);castRecords.push({frames,cast:FX.cast});assert(classes.has('sim-pvp-playing'));done()},
 adventureActive:()=>false
 };
 const names=Object.keys(dependencies),args=Object.values(dependencies);
 const api=new Function(...names,source+';return {SIM_PVP,simPvpAllowed,simPvpSet,simPvpRoster,simPvpAdminHtml,simPvpBuildCast,simPvpFrames,simPvpStart};')(...args);
 return {api,S,FX,snap,CONT,ADM,classes,events,castRecords,get draw(){return draw},get plays(){return playCount}};
};
const env=create(),{api,S,FX}=env;
assert.equal(api.simPvpAllowed(),true);
assert(api.simPvpAdminHtml().includes('Echipa ta'),'UI selectează prima echipă');
assert(api.simPvpAdminHtml().includes('Echipa adversă'),'UI selectează a doua echipă');
assert(api.simPvpAdminHtml().includes('Doar eroul'),'UI oferă 1v1');
assert(api.simPvpAdminHtml().includes('Erou + 3 mercenari'),'UI oferă 4v4');
for(let att=0;att<=3;att++)for(let def=0;def<=3;def++){
 api.simPvpSet('own',att);api.simPvpSet('enemy',def);
 const cast=api.simPvpBuildCast();
 assert.equal(cast.fs.length,1+att,'atacatorul 1-4 unități');
 assert.equal(cast.es.length,1+def,'apărătorul 1-4 unități');
 assert.equal(cast.fs[0].n,'Eroul');
 assert.equal(cast.es[0].n,'Erou adversar');
 const frames=api.simPvpFrames(cast);
 assert(frames.length>=2,'măcar o rundă de atac și apărare');
 for(const f of frames){
   assert(f.actor.side==='fs'||f.actor.side==='es');
   assert(f.actor.i<cast[f.actor.side].length,'index actor valid');
   for(const side of ['fs','es'])for(const d of f[side])assert(d.i<cast[side].length,'țintă validă');
 }
 assert.equal(api.simPvpStart(),true,'pornire reușită');
 assert.equal(JSON.stringify(S),env.snap,'nu se schimbă nimic din datele jocului');
 assert.equal(FX.cast.original,true,'se restaurează fereastra FX precedentă');
 assert.deepEqual(FX.q,[{foo:true}],'se restaurează coada FX precedentă');
 assert(!env.classes.has('sim-pvp-playing'),'se elimină clasa temporară');
 assert.equal(env.ADM.open,false,'panoul se închide pe durata animației');
 env.ADM.open=true;
}
assert.equal(env.plays,16,'toate combinațiile 1v1…4v4');
api.simPvpSet('own',3);api.simPvpSet('own0','0');api.simPvpSet('own1','1');api.simPvpSet('own2','0');
const mixed=api.simPvpBuildCast();
assert.equal(mixed.fs.length,4);
assert.equal(mixed.fs[1].n,'Arcașul');
assert.equal(mixed.fs[2].n,'Vraciul');
assert.notEqual(mixed.fs[3].n,'Arcașul','nu duplicăm mercenarul');
assert.equal(JSON.stringify(S),env.snap);
S.d={tw:1};assert.equal(api.simPvpStart(),false,'nu se pornește peste o luptă reală');S.d=null;
FX.playing=true;assert.equal(api.simPvpStart(),false,'nu se suprapun două animații');FX.playing=false;
const live=create('live');assert.equal(live.api.simPvpAdminHtml(),'');assert.equal(live.api.simPvpStart(),false);
const outsider=create('beta',false);assert.equal(outsider.api.simPvpAdminHtml(),'');assert.equal(outsider.api.simPvpStart(),false);
const noSrv=create();noSrv.ADM.srv=false;assert.equal(noSrv.api.simPvpStart(),false,'admin neconfirmat pe server');
assert(!/\.rpc\(|\.from\(|save\(|spend\(|tronProvoca\(|lwAttack\(/.test(source),'simulatorul nu face RPC-uri sau cheltuieli');
console.log('OK: 16 echipe 1v1–4v4, selecție mercenari, numai admin BETA, fără mutații / consum atacuri.');
