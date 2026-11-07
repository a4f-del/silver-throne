/* Silver Throne BETA: contextual map actions — no backend calls.
   node dev/test-beta-map-village-actions.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const code=fs.readFileSync(path.join(__dirname,'../lume-quick.js'),'utf8');
function node(tag='div') {
 const attrs={},listeners={};let id='',textContent='';
 const e={tag,children:[],style:{},className:'',disabled:false,
   get id(){return id},set id(v){id=v},
   get textContent(){return textContent},set textContent(v){textContent=v},
   setAttribute(k,v){attrs[k]=String(v)},getAttribute(k){return attrs[k]||null},
   append(...xs){this.children.push(...xs);xs.forEach(x=>x.parentNode=this)},
   appendChild(x){this.append(x)},
   addEventListener(k,cb){listeners[k]=cb},click(){listeners.click&&listeners.click({stopPropagation(){}})},
   remove(){if(this.parentNode)this.parentNode.children.splice(this.parentNode.children.indexOf(this),1)},
   getBoundingClientRect(){return {left:400,top:230,bottom:310,width:80,height:80}},
   closest(){return null},querySelector(){return null}};
 return e;
}
function setup(server){
 const host=node('div'),body=node('body'),head=node('head'),events={};
 host.getBoundingClientRect=()=>({left:100,top:90,width:900,height:570});
 const document={head,body,createElement:node,
  querySelector(s){return s==='.lw-map'?host:null},
  getElementById(id){return host.children.find(e=>e.id===id)||null},
  addEventListener(type,cb){events[type]=cb}};
 const S={pts:10,fs:[{hp:100}],lvl:5};
 const village={id:'p2',name:'Mara',level:8,power:200},npc={id:'wn1',n:'Moara Rece',lvl:4};
 let attacked=0,profiled=0,raided=0;
 const ctx={document,ST_SERVER:server,S,
  LUME:{st:{players:[village],me:{user_id:'p1'}},busy:false},
  lwCan:()=>({ok:true,why:''}),lwAttack:()=>attacked++,lwProfile:()=>profiled++,
  wnList:()=>[npc],wnLeft:()=>0,wnRaid:()=>raided++,WN:{busy:false},
  sdT:()=>'',go(){},tab(){},window:{addEventListener(){}},console};
 vm.createContext(ctx);vm.runInContext(code,ctx);
 const svg=node('svg');svg.id='lwmap';
 function fire(type,id){
   const target=node('g');
   target.setAttribute('onclick',(type==='npc'?'wnPick':'lwPick')+"('"+id+"')");
   target.getBoundingClientRect=()=>({left:400,top:270,bottom:320,width:84,height:50});
   target.closest=selector=>{
     if(selector==='#lwmap')return svg;
     if(type==='npc'&&selector.includes('wnPick'))return target;
     if(type==='village'&&selector.includes('lwPick'))return target;
     return null;
   };
   const ev={target,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){}};
   events.click(ev);
   return document.getElementById('lw-quick-actions');
 }
 return {fire,get:()=>({attacked,profiled,raided}),events,host};
}
const beta=setup('beta');
const menu=beta.fire('village','p2');
assert(menu,'click should show a popup');
assert(menu.className.includes('lwqa-map'),'BETA should use anchored icon popup');
const buttons=menu.children[2].children;
assert.equal(buttons.length,3,'Attack, profile, message icons');
assert.equal(buttons[0].getAttribute('aria-label'),'Atacă');
assert.equal(buttons[1].getAttribute('aria-label'),'Profil');
assert.equal(buttons[2].getAttribute('aria-label'),'Mesaj');
assert(buttons[2].disabled,'Message must not pretend to send without backend');
buttons[0].click();
assert.equal(beta.get().attacked,1);
const npc=beta.fire('npc','wn1');
assert(npc&&npc.children[2].children.length===1,'NPC has one direct attack action');
npc.children[2].children[0].click();
assert.equal(beta.get().raided,1);
const live=setup('live');
const liveMenu=live.fire('village','p2');
assert(liveMenu&&!liveMenu.className.includes('lwqa-map'),'LIVE old menu unchanged');
assert(!live.fire('npc','wn1'),'NPC new action only on BETA');
console.log('OK: BETA player icons, NPC raid, disabled unsent messages and LIVE isolation.');
