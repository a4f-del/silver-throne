/* Silver Throne BETA: compact Coborare hub preview.
 * Run: node dev/test-beta-coborare-hub.js
 * Static structure + executable UI model. No DB, rewards, combat, or real saves. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const tmn=read('temnite.js'),index=read('index.html'),tower=read('turn.js');
new Function(tmn);
for(const m of index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
assert(index.includes('temnite.js?v=2026.11.08-1'),'Fresh dungeon UI loaded');
assert(index.includes("if(!d&&ST_SERVER==='beta'){"),'BETA dedicated hub path');
assert(index.includes('ⓘ Reguli utile'),'Old wall of text goes behind details');
assert(index.includes('vDung();'),'New hub invoked in BETA');
assert(index.includes("\${vDung()}\${typeof twCard==='function'?twCard():''}"),
 'LIVE keeps original dungeon/Tower layout');
assert(tmn.includes('if (typeof ST_SERVER !== \'undefined\' && ST_SERVER === \'beta\')'));
assert(tmn.includes("return tmnHubBeta(open, rec, card, shown)"));
assert(tmn.includes('return tmnEvent() +'),'LIVE event unchanged');
assert(tmn.includes('function tmnHubToggle(event)'));
assert(tmn.includes('TMN.showAll = !!event.target.open'),'Expand state retained during redraw');
assert(tmn.includes('onclick="dToggle('),'Primary action uses existing dungeon entry');
assert(tmn.includes('onclick="startD('),'Event uses original key-consuming entry');
assert(tmn.includes('onclick="twEnter()"'),'Tower uses original start function');
assert(tmn.includes("typeof twStartControls==='function'?twStartControls(t):''"),
 'Tower checkpoint selector retained in details');
assert(tmn.includes("typeof twLgRow==='function'?twLgRow(t):''"),
 'Tower legendary track retained in details');
assert(tmn.includes('3 chei pe săptămână · 60% șansă'),'Weekly relic odds retained');
assert(tmn.includes('class="cb-options"'),'Two compact secondary activities');
assert(tmn.includes('id="tmn-hub-all"'),'One collapsed dungeon collection');
assert(tmn.includes('class="cb-hub"'),'Scoped hub CSS');
assert(tmn.includes('@media(max-width:640px)'),'Mobile layout included');
assert(tmn.includes('heroSoloControl()'),'Hero-alone dungeon option retained');
assert(tower.includes('function twCard()'),'Old Tower card not altered');
assert(tower.includes('function twEnter()'),'Tower operation untouched');
assert(!/CREATE OR REPLACE FUNCTION|DELETE FROM public/.test(tmn),'UI-only change');

const end=tmn.indexOf('/* ------------------------------------------------------------------ CĂPITANUL ÎN LUPTĂ */');
assert(end>0,'Can isolate dungeon hub source');
const src=tmn.slice(0,end);
const DG=[
 {n:'Mina Cenușie',lv:1,rooms:4,bn:'Căpitanul Cenușii',rm:1},
 {n:'Catacombele Uitate',lv:8,rooms:5,bn:'Regele Oaselor',rm:2},
 {n:'Abisul Cenușiu',lv:30,rooms:6,bn:'Stăpânul Abisului',rm:3},
 {n:'Cripta Furtunii',lv:13,rooms:4,bn:'Străjerul Furtunii',rm:3,ev:1}
];
function make(server,lvl,progress=0){
 const S={lvl,fs:[{n:'Erou',hp:100,c:'Campion'}],rs:[],pts:12};
 let keys=3, progressAt=progress;
 const deps={
  ST_SERVER:server,S,DG,dOpen:()=>false,trPage:()=>'<div>Inside</div>',
  dPos:(i)=>i===2?progressAt:0,trTier:()=>0,
  evs:()=>({k:keys}),evLeft:()=>3,heroSoloControl:()=>'<div>Solo activ</div>',
  TWR:{lv:20,day:3,cost:6},twSt:()=>({best:40,wb:30}),twLeft:()=>2,
  twProgress:()=>'<div>Turn progress</div>',
  twStartControls:()=>'<select id="tw-start"><option>41</option></select>',
  twLgRow:()=>'<div>Legendare</div>',
  tEsc:String,trDef:()=>null,TR_C:{},TR_A:{}
 };
 const all=new Function(...Object.keys(deps),src+';return {vDung,TMN,tmnHubToggle};')(...Object.values(deps));
 return {S,...all,setKeys:n=>{keys=n},setProgress:n=>{progressAt=n}};
}
let early=make('beta',1);
let html=early.vDung();
assert(html.includes('Mina Cenușie'),'Newbie sees appropriate dungeon');
assert(html.includes('Recomandată pentru tine'));
assert(html.includes('onclick="dToggle(0)"'),'Primary CTA uses original navigation');
assert(html.includes('Cripta Furtunii'),'Event visible for later');
assert(html.includes('Disponibil de la nivelul 13'),'Relic level gate visible');
assert(html.includes('Blocat · nivel 20'),'Tower unlock clear');
assert(html.includes('<details id="tmn-hub-all"'),'All dungeons initially collapsed');
assert(!html.includes('id="tmn-hub-all" class="cb-all" ontoggle="tmnHubToggle(event)" open'),
 'All dungeons closed by default');
early.tmnHubToggle({target:{id:'tmn-hub-all',open:true}});
assert(early.vDung().includes('ontoggle="tmnHubToggle(event)" open'),
 'Expanded state survives redraw');
early.tmnHubToggle({target:{id:'tmn-hub-all',open:false}});
assert(!early.TMN.showAll,'Can collapse again');

let veteran=make('beta',40,3);
html=veteran.vDung();
assert(html.includes('Abisul Cenușiu'),'Endgame recommends active dungeon');
assert(html.includes('În desfășurare'),'Progressed dungeon prioritized');
assert(html.includes('4 / 6'),'Actual progress shown');
assert(html.includes('Continuă aventura'),'Continuing is clear');
assert(html.includes('onclick="dToggle(2)"'));
assert(html.includes('onclick="startD(3)"'),'Weekly crypt remains actionable');
assert(html.includes('onclick="twEnter()"'),'Tower remains actionable');
assert(html.includes('Turn progress')&&html.includes('Legendare')&&html.includes('tw-start'),
 'Tower progression/options retained');
assert.equal((html.match(/<article class="cb-mini/g)||[]).length,2,
 'Relic and Tower are exactly two compact tiles');
veteran.setKeys(0);
html=veteran.vDung();
assert(html.includes('Fără chei disponibile'),'Depleted key state visible');
const live=make('live',40);
html=live.vDung();
assert(!html.includes('cb-hub'),'LIVE screen unchanged');
assert(html.includes('dg-ev')&&html.includes('dg-sec'),'Old LIVE panels remain');
console.log('OK: compact BETA Coborare hub for newbie, progress, endgame, keys and Tower; old LIVE UI untouched.');
