/* BETA: test de regresie pentru carduri portret și lovituri peste cardul țintei.
   node dev/test-beta-adventure-monster-cards.js */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const ac=read('aventura-carduri.js'),css=read('aventura-carduri.css');
const index=read('index.html'),tr=read('trepte.js'),fx=read('fx.js'),vs=read('lupta-vs.js');
for(const code of [ac,tr,fx,vs]) new Function(code);
for(const match of index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)) if(match[1].trim())new Function(match[1]);
const names=['Bandit','Șobolan de mină','Căpitanul Minei'];
const hero={n:'Eroul',c:'Campion',h:1,hp:85};
const merc={n:'Mercenar',c:'Arcaș',hp:55};
const state={adventure:{di:0},d:null,fs:[hero,merc],auto:false,pts:15,dp:{},dsel:{'0_0':1}};
const DG=[{n:'Mina Cenușie',bn:'Căpitanul Minei',rooms:3,lv:1}];
const ctx={
 ST_SERVER:'beta',S:state,DG,CL:{Campion:{sp:'Lovitură'},Arcaș:{sp:'Săgeată'}},
 tEsc:s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),
 monImg:n=>'imagini/monstri/'+n+'.jpg',
 tmnBoss:n=>n==='Căpitanul Minei'?['capitanul-minei','#bb5533']:null,
 mhp:()=>100,av:()=>'<img src="aliat.jpg" alt="">',
 trNames:()=>names,dMk:()=>({room:1,rooms:3,k:2,dk:'0_0'}),
 trSel:()=>1,dCostAt:()=>1,monStatsAt:()=>({hp:180,atk:45}),
 trDef:()=>({a:'shield'}),TR_A:{shield:'Protecție întărită'},
 dOddsAt:()=>71,recGear:()=> 'Rar',dNext:()=>'<button>Mai departe</button>',
 setTimeout:()=>{},console
};
const api=new Function(...Object.keys(ctx),ac+';return {acDungeonPage,acCombatPage,acFxMarkup,acFxAnimate};')(...Object.values(ctx));
const page=api.acDungeonPage(0);
assert(page.includes('ac-main-card') && page.includes('ac-main-portrait'), 'portret mare la selecție');
assert(page.includes('ac-rail') && page.includes('Progres 2 / 3'), 'progresul temniței');
assert((page.match(/<button class="ac-step(?:\s|")/g)||[]).length===3, 'toți monștrii au carduri în progres');
assert(page.includes('71%') && page.includes('Șanse de câștig'), 'șanse calculate de joc');
assert(page.includes('ac-party'), 'echipa și viața sunt vizibile');
assert(page.includes('adventureExit()')&&page.includes('startD(0)'), 'ieșirea și lupta rămân funcționale');
state.d={one:1,di:0,room:1,loot:{gold:150,ore:10,xp:20,m:{}},
 f:{es:[{n:'Bandit',mh:100,hp:22,atk:31,b:false},{n:'Sergent',mh:200,hp:160,atk:55,b:false}],i:0,t:1,log:[]}};
const battle=api.acCombatPage(state.d);
assert(battle.includes('ac-enemy-list'), 'inamicii sunt prezentați ca portrete mari');
assert(battle.includes('aria-pressed="true"')&&battle.includes('tgt(1)'), 'ținta curentă este evidențiată');
assert(battle.includes('22 / 100')&&battle.includes('160 / 200'), 'viața reală a monștrilor');
assert(battle.includes("act('n')")&&battle.includes('autoRun()'), 'lupta manuală și automată');
const cast={adventureTitle:'Mina Cenușie',fs:[{n:'Eroul',mh:100,hp:85,c:'Campion',h:1}],es:[{n:'Sergent',mh:200,hp:160,img:'monstru.jpg'}]};
const fxHtml=api.acFxMarkup(cast,{fs:[85],es:[160]});
assert(fxHtml.includes('ac-fx-shell')&&fxHtml.includes('ac-fx-enemies'), 'redarea folosește carduri');
assert(fxHtml.includes('data-s="fs"')&&fxHtml.includes('data-s="es"'), 'același identificator de luptător ca motorul FX');
assert(fxHtml.includes('fx-hp')&&fxHtml.includes('fx-t'), 'compatibil cu actualizarea HP a motorului FX');
const face=(x,y)=>({
 style:{values:{},setProperty(k,v){this.values[k]=v}},
 classList:{added:[],remove(){},add(c){this.added.push(c)}},offsetWidth:10,
 getBoundingClientRect:()=>({left:x,top:y,width:100,height:100})
});
const attacker=face(20,200),target=face(340,20);
const aBox={querySelector:q=>q==='.fx-av'?attacker:null};
const tBox={querySelector:q=>q==='.fx-av'?target:null};
const fakeModal={
 classList:{contains:v=>v==='ac-fx-mode'},
 querySelector:q=>q.includes('data-s="fs"')?aBox:q.includes('data-s="es"')?tBox:null
};
api.acFxAnimate(fakeModal,{actor:{side:'fs',i:0},fs:[],es:[{i:0,v:-42}]});
assert(attacker.classList.added.includes('ac-dash'), 'atacatorul se proiectează spre țintă');
assert(target.classList.added.includes('ac-impact'), 'cardul lovit reacționează');
assert(attacker.style.values['--ac-dx'].endsWith('px') && Number.parseInt(attacker.style.values['--ac-dx'])>0);
assert(css.includes('@keyframes acDash') && css.includes('@keyframes acImpact'), 'animațiile există');
assert(css.includes('max-width:700px')&&css.includes('max-width:440px'), 'layout responsiv');
assert(css.includes('prefers-reduced-motion'), 'mod accesibil fără animații');
assert(fx.includes('const cardMode=!!cast.adventure')&&fx.includes('acFxAnimate(m,fr)'), 'motorul FX redă cardul lovit');
assert(vs.includes("S.d.one||S.d.tw"), 'nu se dublează fereastra VS în BETA');
assert(index.includes("if(d&&(d.one||d.tw)&&typeof acCombatPage"), 'combatul cardurilor pentru Temnițe/Turn');
assert(tr.includes("if(S.adventure&&typeof acDungeonPage"), 'selecția cardurilor în aventură');
assert(index.includes('aventura-carduri.js?v=')&&index.includes('aventura-carduri.css?v='), 'asseturile sunt încărcate');
console.log('OK: carduri mari, progres, ținte, HP, impact animat, responsive.');
