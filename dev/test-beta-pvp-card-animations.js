/* BETA: animații pe carduri în PvP, Lume și Tron.
 * node dev/test-beta-pvp-card-animations.js
 * Fără autentificare, SQL sau modificări la rezultatul luptelor. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const fx=read('fx.js'),card=read('aventura-carduri.js'),css=read('aventura-carduri.css'),main=read('index.html'),world=read('lume.js'),throne=read('tron.js');
assert(world.includes('lume: 1'),'PvP Lume are marcator propriu');
assert(throne.includes('tron: 1'),'PvP Tron are marcator propriu');
assert(fx.includes('d.one||d.tw||d.lume||d.tron'),'ambelor tipuri PvP li se aplică animațiile în BETA');
const fxHead=fx.slice(fx.indexOf('const FX ='),fx.indexOf('/* pentru modul manual:'));
function setup(server,kind,playerUnits=2){
 const fs=[{n:'Eroul',h:1,c:'Campion',hp:120},...(playerUnits>1?[{n:'Arcașul',c:'Arcaș',hp:90}]:[])];
 const es=kind==='tron'?[{n:'Regele',c:'Campion',hp:160,mh:160,b:1}]:[{n:'Apărătorul',c:'Războinic',hp:110,mh:110,b:1},{n:'Magul',c:'Mag',hp:80,mh:80,b:1}];
 const S={fs,d:{lume:kind==='lume'?1:0,tron:kind==='tron'?1:0,bn:kind==='lume'?'Satul adversarului':'Regele Tronului',di:0,f:{es}}};
 const sandbox={S,ST_SERVER:server,DG:[{n:'Mina'}],mhp:()=>200,tmnBoss:()=>null,monImg:()=>null};
 const a=new Function(...Object.keys(sandbox),fxHead+';return {FX,fxCast,fxSnap,fxPush};')(...Object.values(sandbox));
 a.fxCast();return {S,api:a,fs,es};
}
for(const kind of ['lume','tron']){
 const b=setup('beta',kind),{api,fs,es}=b;
 assert.equal(api.FX.cast.adventure,true,kind+' card mode enabled');
 assert.equal(api.FX.cast.pvp,true,kind+' is PvP');
 assert(api.FX.cast.adventureTitle.includes(kind==='lume'?'Lume':'Tron'),'bătălia are titlul corect');
 let before=api.fxSnap();es[0].hp-=23;api.fxPush(before,'Arcașul lovește',fs[fs.length-1]);
 assert.equal(api.FX.q[0].actor.side,'fs');
 assert.equal(api.FX.q[0].actor.i,fs.length-1,'mercenarul poate anima lovitura sa');
 assert.equal(api.FX.q[0].es[0].v,-23,'daunele provin din motorul real');
 before=api.fxSnap();fs[0].hp-=17;api.fxPush(before,'Apărătorul lovește',es[0]);
 assert.equal(api.FX.q[1].actor.side,'es');
 assert.equal(api.FX.q[1].actor.i,0,'și apărătorul PvP atacă');
 assert.equal(api.FX.q[1].fs[0].v,-17);
 const live=setup('live',kind);
 assert.equal(live.api.FX.cast.adventure,false,'LIVE nu schimbă efectele');
}
const api=new Function('tEsc','av',card+';return {acFxMarkup,acFxAnimate};')(s=>String(s),()=>'<img src="erou.png" alt="">');
const c={pvp:true,adventureTitle:'Duel pentru Tron',fs:[{n:'Eroul',c:'Campion',mh:200,hp:100}],es:[{n:'Regele',c:'Campion',mh:200,hp:180,img:null}]};
const html=api.acFxMarkup(c,{fs:[100],es:[180]});
assert(html.includes('Duel pentru Tron'),'fereastra folosește numele confruntării');
assert(html.includes('erou.png'),'fantoma PvP folosește portret de personaj, nu sabie generică');
const face=(x,y)=>({style:{values:{},setProperty(k,v){this.values[k]=v}},classList:{list:[],remove(){},add(x){this.list.push(x)}},offsetWidth:10,getBoundingClientRect:()=>({left:x,top:y,width:80,height:80})});
const a=face(20,180),e=face(300,20);
const aBox={querySelector:()=>a},eBox={querySelector:()=>e};
const modal={classList:{contains:x=>x==='ac-fx-mode'},querySelector:x=>x.includes('data-s="fs"')?aBox:x.includes('data-s="es"')?eBox:null};
const oldSetTimeout=global.setTimeout;global.setTimeout=()=>{};
try{
 api.acFxAnimate(modal,{actor:{side:'fs',i:0},fs:[],es:[{i:0,v:-40}]});
 assert(a.classList.list.includes('ac-dash'),'atacatorul se proiectează către card');
 assert(e.classList.list.includes('ac-impact'),'ținta este lovită vizual');
 api.acFxAnimate(modal,{actor:{side:'es',i:0},fs:[{i:0,v:-12}],es:[]});
 assert(e.classList.list.includes('ac-dash'),'animația funcționează și la ripostă');
 assert(a.classList.list.includes('ac-impact'),'atacul adversarului atinge eroul');
}finally{global.setTimeout=oldSetTimeout}
assert(css.includes('@keyframes acSlash'),'efectul slash există și pentru PvP');
assert(css.includes('prefers-reduced-motion'),'animațiile respectă accesibilitatea');
assert(fx.includes('const cardMode=!!cast.adventure'),'fereastra folosește motorul FX, nu alte daune');
console.log('OK: BETA Lume + Tron, animații reciproce, mercenari, daune reale, LIVE neatins.');
