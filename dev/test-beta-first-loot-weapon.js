/* BETA — Prima pradă și prima armă. node dev/test-beta-first-loot-weapon.js */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const js=read('prima-recompensa.js'),html=read('index.html'),
  journey=read('drumul-eroului.js'),guide=read('ghidare-erou.js'),inventory=read('inventar.js');
for(const src of [js,journey,guide,inventory])new Function(src);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
assert(html.includes('prima-recompensa.js?v=2026.11.07-1'),'new module is loaded');
assert(html.includes("jeFirstLootCapture(d,g);S.d=null;"),'first loot captured before clearing combat');
assert(html.includes('jeStarterWeaponPanel()'),'direct equip is above equipment tabs');
assert(html.includes('jeStarterForgeHint()'),'forge hint is integrated');
assert(journey.includes('jeFirstLootPanel()'),'loot integrated into existing quest card');
assert(guide.includes("selector:'.je-first-equip, .je-first-forge-go'"),'arrows point to real CTAs');
const hero={h:1,n:'Eroul',c:'Campion',hp:50,eq:{w:null}};
const archer={n:'Toma',c:'Arcaș',hp:40,eq:{w:null}};
const sabie={t:'w',name:'Sabie de început',wf:'sab',s:{dmg:10},l:2,r:0};
const arc={t:'w',name:'Arc de început',wf:'arc',s:{dmg:12},l:2,r:0};
const S={journeyV:1,journeyUxV:2,tab:'e',vil:'',lvl:3,sel:1,fs:[hero,archer],
 rs:[],inv:[arc,sabie],forge:[null],ui:{t:'a',wf:'arc',r:1,l:3,q:2,p:1,s:1},
 je:{done:['poarta','urme']},cn:{e:0},gold:70,ore:44};
let server='beta',step='otel',goCount=0,equipCalls=[];
const tEsc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ctx={S,tEsc,
 jeFocus:()=>server==='beta'&&S.journeyV===1&&S.journeyUxV===2,
 jeReady:()=>true,jeCurrent:()=>({id:step}),jeStatus:()=>({ok:S.cn.e>=1}),
 WF:{sab:{c:'Campion'},arc:{c:'Arcaș'}},wfOf:it=>it.wf,
 bsc:it=>it?.s?.dmg||0,invScore:it=>it?.s?.dmg||0,
 equip:i=>{equipCalls.push(i);const it=S.inv.splice(i,1)[0],old=S.fs[S.sel].eq[it.t];
  if(old)S.inv.push(old);S.fs[S.sel].eq[it.t]=it;S.cn.e++;goCount++},
 go:()=>{goCount++},document:undefined
};
const api=new Function(...Object.keys(ctx),js+';return {jeFirstLootCapture,jeFirstLootPanel,jeStarterWeaponPanel,jeEquipStarterWeapon,jeStarterForgeHint,jePrepareStarterForge,jeGoStarterForge};')(...Object.values(ctx));
const d={one:1,done:true,di:0,loot:{ore:11,xp:36,it:[]}};
api.jeFirstLootCapture(d,62);
assert.deepEqual(S.jeFirstLoot,{gold:62,ore:11,xp:36,items:[]},'record actual loot only');
d.loot.it.push({name:'Other',t:'a'});api.jeFirstLootCapture(d,999);
assert.equal(S.jeFirstLoot.gold,62,'never double-report');
step='poarta';S.cn.e=1;
let view=api.jeFirstLootPanel();
assert(view.includes('62 aur')&&view.includes('11 minereu')&&view.includes('36 XP'));
assert(view.includes('Nu a căzut un obiect'),'no weapon invented');
step='otel';S.cn.e=0;
view=api.jeStarterWeaponPanel();
assert(view.includes('Sabie de început')&&view.includes('jeEquipStarterWeapon(1)'));
assert(view.includes('Pune pe Erou')&&view.includes('Slotul de armă este gol'));
assert(!view.includes('Arc de început'));
api.jeEquipStarterWeapon(1);
assert.equal(S.sel,0,'equip targets hero, not previously selected mercenary');
assert.deepEqual(equipCalls,[1]);
assert.equal(hero.eq.w.name,'Sabie de început');
assert.equal(archer.eq.w,null);
assert.equal(S.cn.e,1,'real equip counter completed');
assert.equal(api.jeStarterWeaponPanel(),'','no duplicate equip prompt after completion');
S.cn.e=0;hero.eq.w=null;S.inv=[arc];
view=api.jeStarterWeaponPanel();
assert(view.includes('Mergi la Topitorie'),'fallback for absent suitable weapon');
api.jeGoStarterForge();
assert.equal(S.tab,'a');assert.equal(S.vil,'a');
assert(api.jeStarterForgeHint().includes('Selectează sabia eroului'));
api.jePrepareStarterForge();
assert.equal(S.ui.t,'w');assert.equal(S.ui.wf,'sab');
assert.equal(S.ui.r,0);assert.equal(S.ui.q,0);assert.equal(S.ui.l,3);
assert(api.jeStarterForgeHint().includes('Sabia este selectată'));
assert.equal(S.inv.length,1,'selection does not generate new item');
assert.equal(S.ore,44,'selection does not spend resources');
step='urme';assert(api.jeStarterForgeHint().includes('Prima armă'));
S.journeyUxV=undefined;
assert.equal(api.jeStarterWeaponPanel(),'');
assert.equal(api.jeFirstLootPanel(),'');
S.journeyUxV=2;server='live';
assert.equal(api.jeStarterWeaponPanel(),'','LIVE is isolated');
api.jeFirstLootCapture({one:1,done:true,di:0,loot:{ore:99,xp:99,it:[]}},999);
assert.equal(S.jeFirstLoot.gold,62,'no LIVE writes');
console.log('OK: real loot, empty drop, direct hero equip, safe forge, no duplicated rewards, BETA-only.');
