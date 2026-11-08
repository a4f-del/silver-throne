/* Silver Throne BETA — pas 18: animații sigure, skip accesibil, feedback pe toate modurile.
 * node dev/test-beta-combat-feedback-accessibility.js
 * Simulare fără autentificare, browser real, DB sau modificări de salvări. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const fx=read('fx.js'),ac=read('aventura-carduri.js'),css=read('aventura-carduri.css'),
 vs=read('lupta-vs.js'),index=read('index.html');
for(const s of [fx,ac,vs])new Function(s);
for(const m of index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
const between=(source,start,end)=>{
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'Source boundary '+start);return source.slice(a,b);
};
const playback=between(fx,'const fxWantPlay = first =>','function fxToggleInstant()');
function runtime(server,reduced=false){
 let rid=0,callbacks=0,skipFoc=0,restore=0,removed=0;
 const timers=new Map(),attr={};let appended=null,keyHandler=null;
 const prevFocus={isConnected:true,focus(){restore++}};
 const skip={focus(){skipFoc++}};
 const modal={
  id:'',style:{setProperty(){}},innerHTML:'',
  attrs:attr,setAttribute(k,v){attr[k]=v},removeAttribute(k){delete attr[k]},
  classList:{_v:[],add(k){this._v.push(k)},contains(k){return this._v.includes(k)}},
  querySelector(sel){return sel==='.fx-skip'?skip:null},querySelectorAll(){return []},
  addEventListener(k,cb){if(k==='keydown')keyHandler=cb;},
  remove(){removed++}
 };
 const document={
  activeElement:prevFocus,createElement(){return modal;},
  body:{appendChild(x){appended=x}},getElementById(){return null}
 };
 const window={__fxSkip:null,__fxTimer:null};
 const FX={q:[],cast:{
  adventure:server==='beta',fs:[{n:'Eroul',c:'Campion',h:1,hp:100,mh:100}],
  es:[{n:'Oponent',hp:100,mh:100}]
 },playing:false,delay:550};
 const S={fxInstant:false};
 const setTimer=(fn,ms)=>{const id=++rid;timers.set(id,{fn,ms});return id;};
 const clearTimer=id=>{timers.delete(id)};
 const mod=new Function('FX','S','ST_SERVER','matchMedia','window','document','setTimeout','clearTimeout',
   'innerWidth','innerHeight','tEsc','av','acFxMarkup','acFxAnimate',
   playback+';return {fxPlay,fxSkip,fxWantPlay};')(
   FX,S,server,()=>({matches:reduced}),window,document,setTimer,clearTimer,
   390,720,String,()=>'<img alt="">',()=>'<button class="fx-skip">Sari peste</button>',()=>{});
 const runTimers=()=>{
  let guard=0;while(timers.size&&guard++<20){
   const [id,t]=[...timers].sort((a,b)=>a[1].ms-b[1].ms)[0];
   timers.delete(id);t.fn();
  }
  assert(guard<20,'Timer loop detected');
 };
 const frames=[{fs:[],es:[],txt:'Lovitură',actor:null}];
 return {FX,S,mod,window,modal,frames,runTimers,attr,
  get callbacks(){return callbacks},get skipFoc(){return skipFoc},
  get restore(){return restore},get removed(){return removed},
  get appended(){return appended},get keyHandler(){return keyHandler},
  play(){mod.fxPlay(frames,()=>callbacks++,true,0)}
 };
}
const b=runtime('beta');
assert.equal(b.mod.fxWantPlay(true),true,'Normal beta first battle plays');
b.play();
assert.equal(b.FX.playing,true);assert.equal(b.attr.role,'dialog');
assert.equal(b.attr['aria-modal'],'true');assert.equal(b.attr['aria-label'],'Redarea luptei');
assert.equal(b.attr['aria-live'],undefined,'Whole dialog is not a chatty live region');
assert.equal(b.skipFoc,1,'Skip receives focus by default');
assert(b.window.__fxSkip,'Skip is available');
b.window.__fxSkip();b.window.__fxSkip();
assert.equal(b.callbacks,0,'Skip waits for final modal cleanup');
b.runTimers();
assert.equal(b.callbacks,1,'Double Skip completes exactly once');
assert.equal(b.removed,1,'Overlay removed once');
assert.equal(b.restore,1,'Keyboard focus is restored');
assert.equal(b.FX.playing,false);
const escaped=runtime('beta');escaped.play();
let prevented=0;escaped.keyHandler({key:'Escape',preventDefault(){prevented++}});
escaped.runTimers();assert.equal(prevented,1);assert.equal(escaped.callbacks,1,'Escape also skips once');
const r=runtime('beta',true);
assert.equal(r.mod.fxWantPlay(true),false,'Reduced motion overrides even mandatory first animation');
r.play();assert.equal(r.callbacks,1,'Reduced motion finishes immediately without overlay');
assert.equal(r.appended,null);

const combatCode=between(ac,'function acCombatPage(d) {','function acFxMarkup(cast,hp) {');
const S={fs:[{n:'Eroul',c:'Campion',hp:90}],auto:false,fl:null,rule:'weak'};
const DG=[{n:'Mina Cenușie'}],CL={Campion:{sp:'Lovitură'}};
const battle=new Function('S','DG','CL','mhp','acArtwork','acArt','acSafe','acParty','dNext',
 combatCode+';return acCombatPage;')(S,DG,CL,()=>100,()=>null,()=>'<i>portret</i>',String,()=>'<p>Echipă</p>',()=>'<div>Următorul pas</div>');
const d={one:1,di:0,room:0,loot:{gold:3,ore:2,xp:5,m:{}},f:{
 i:0,t:1,log:['Eroul lovește −12','Inamicul pierde 12 viață'],
 es:[{n:'Miner',hp:0,mh:90,atk:10,b:false},{n:'Căpitan',hp:55,mh:100,atk:15,b:true}]
}};
const page=battle(d);
assert(page.includes('aria-pressed="true"')&&page.includes('țintă selectată'),'Selected enemy announced');
assert(page.includes('eliminat'),'Fallen target announced');
assert(page.includes('role="log" aria-live="polite"'),'Manual combat log announced');
assert(page.includes('onclick="tgt(1)"'),'Native enemy targeting preserved');
assert(page.includes('onclick="act('),'Original combat actions intact');
d.tw=true;d.room=15;
assert(battle(d).includes('Turnul · Etajul 15'),'Tower renders same target controls');

const anim=new Function('matchMedia',ac.slice(ac.indexOf('function acFxAnimate(modal,frame) {'))+
 ';return acFxAnimate;')(()=>({matches:true}));
anim({classList:{contains:()=>true},querySelector(){throw Error('Layout measured in reduced-motion mode');}},
 {fs:[],es:[],actor:null});
assert(css.includes('.ac-enemy:focus-visible')&&css.includes('min-height:44px'));
assert(fx.includes('d.one||d.tw||d.lume||d.tron'),'Same FX card applies to all 4 BETA modes');
assert(vs.includes('S.d.one||S.d.tw'),'No duplicate VS card during BETA dungeon/Tower combat');
console.log('OK: double skip/Escape once, keyboard focus, reduced motion, readable target/log, Tower/PvP/Tron FX.');
