/* Silver Throne BETA — modal Bresle: click outside closes, inside stays open.
 * Run: node dev/test-beta-guild-overlay-close.js
 * Simulates DOM events; does not access Supabase. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const code=fs.readFileSync(path.join(__dirname,'..','bresle.js'),'utf8');
const start=code.indexOf('function guildOpen(){');
const end=code.indexOf('function guildBar(',start);
assert(start>=0&&end>start,'Guild modal functions must exist');
const source=code.slice(start,end);
let overlay=null,opens=0,paints=0,syncs=0,focuses=0;
const document={
  getElementById(id){return id==='guild-overlay'?overlay:null;},
  createElement(tag){
    assert.equal(tag,'div');
    return {id:'',handlers:{},setAttribute(){},
      addEventListener(type,cb){this.handlers[type]=cb;},
      querySelector(selector){assert.equal(selector,'button');return {focus(){focuses++;}};},
      remove(){if(overlay===this)overlay=null;},
      dispatch(type,event){assert(this.handlers[type]);this.handlers[type](event);}
    };
  },
  body:{appendChild(element){overlay=element;opens++;}}
};
const {guildOpen,guildClose}=new Function('document','guildEnabled','guildPaint','guildSync',
 source+';return {guildOpen,guildClose};')(document,()=>true,()=>paints++,()=>syncs++);
guildOpen();
assert(overlay,'Guild modal opened');
assert.equal(opens,1);assert.equal(paints,1);assert.equal(syncs,1);assert.equal(focuses,1);
const root=overlay;
guildOpen();assert.equal(opens,1,'Open while open must not duplicate overlay');
root.dispatch('click',{target:{closest(){return root;}}});
assert.equal(overlay,root,'Click inside dialog must stay open');
root.dispatch('click',{target:root});
assert.equal(overlay,null,'Click on backdrop must close');
guildOpen();const next=overlay;
next.dispatch('keydown',{key:'ArrowDown',stopPropagation(){}});
assert.equal(overlay,next,'Ordinary key must not close');
let stopped=false;
next.dispatch('keydown',{key:'Escape',stopPropagation(){stopped=true;}});
assert.equal(overlay,null,'Escape closes');
assert(stopped,'Escape should not close unrelated overlays');
guildOpen();guildClose();assert.equal(overlay,null,'X button handler still closes');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
assert(html.includes('bresle.js?v=2026.11.08-6'),'New guild JS asset version');
console.log('OK: close on backdrop/Escape; inside clicks preserved; open and X unchanged; cache bumped.');
