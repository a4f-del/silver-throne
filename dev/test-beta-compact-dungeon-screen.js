/* BETA: regression for dungeon no-scroll preparation layout.
 * Run: node dev/test-beta-compact-dungeon-screen.js
 * No actual accounts, saves, network, or game state modified. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const css=read('aventura-carduri.css'),src=read('aventura-carduri.js'),
  index=read('index.html'),steps=read('trepte.js');
new Function(src);new Function(steps);
for(const m of index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
assert(index.includes('aventura-carduri.css?v=2026.11.09-5'),'CSS version refresh');
assert(index.includes('aventura-carduri.js?v=2026.11.09-8'),'JS version refresh');
const env={
 ST_SERVER:'beta',
 S:{lvl:3,fs:[{h:1,n:'Eroul',c:'Campion',hp:40}],adventure:{di:0,tierLocked:false}},
 DG:[{n:'Mina Cenușie',lv:1,rooms:4,bn:'Căpitanul Cenușii',k:1}],
 trNames:()=>['Șobolan','Miner','Ghoul','Căpitanul Cenușii'],
 dMk:()=>({di:0,dk:'0_0',room:3,rooms:4,k:1}),
 trSel:()=>3,trDef:()=>({a:'call'}),
 tmnBoss:()=>['capitan-cenusii','#af413c'],
 monImg:()=>null,
 monStatsAt:()=>({hp:115,atk:14}),
 trChips:()=>'',trTier:()=>0,TR_T:{n:['Normal','Greu','Coșmar']},
 TR_A:{call:'Cheamă ajutoare'},
 dCostAt:()=>2,dOddsAt:()=>100,dNext:()=>'<button>Înainte</button>',
 recGear:()=> 'orice, chiar și Comun',acParty:null,
 mhp:()=>45,av:()=>'<img alt="" src="face.jpg">',
 tEsc:x=>x
};
delete env.acParty;
const html=new Function(...Object.keys(env),src+';return acDungeonPage(0);')(...Object.values(env));
assert(html.startsWith('<section class="ac-scene ac-dungeon">'),'Only preparation screen marked');
assert(html.includes('Căpitanul Cenușii')&&html.includes('Progres 4 / 4'));
assert(html.includes('Cheamă ajutoare'),'Boss ability retained');
assert(html.includes('100%'),'Winning odds preserved');
assert(html.includes('Înfruntă căpitanul'),'Main action preserved');
assert(html.includes('onclick="startD(0)"'),'Main action invokes original dungeon function');
assert(html.includes('ac-party-list'),'Party remains present');
const action=html.indexOf('class="p ac-primary"');
const odds=html.indexOf('class="ac-odds"');
const hint=html.indexOf('class="ac-hint"');
assert(odds>=0&&action>odds&&action<hint,
 'Primary action moved immediately after odds and before optional help');
const other=new Function(...Object.keys(env),src+';return acCombatPage({di:0,f:null,room:1,loot:{gold:0,ore:0,xp:0,m:{}}});')(...Object.values(env));
assert(other.startsWith('<section class="ac-scene ac-combat">'),
 'Combat scene retains its existing visual design');
const as=(selector)=>css.includes(selector);
assert(as('body.st-adventure .ac-scene.ac-dungeon'),'Dungeon rules limited to adventure view');
assert(as('.ac-dungeon .ac-main-portrait{height:clamp('),'Portrait is viewport sized');
assert(as('.ac-dungeon .ac-layout{grid-template-columns:minmax(0,43%) minmax(0,57%);'),
 'Mobile shows portrait and attack side by side');
assert(as('.ac-dungeon .ac-party-list{display:flex;gap:4px}'),'Mobile party stays on one strip');
assert(as('@media(max-height:720px)'),'Short viewports get smaller portrait');
assert(as('.ac-dungeon .ac-primary{'),'Primary button stays accessible');
assert(!css.includes('.ac-dungeon{height:100vh'),'No cropping to forced fixed screen height');
assert(!css.includes('.ac-dungeon{overflow:hidden'),'No clipping of controls');
assert(steps.includes("'Greu', 'Coșmar'"),'Difficulty tiers unchanged');
console.log('OK: BETA compact dungeon, boss, odds, CTA above hints, mobile/short layouts, team, no combat/Tower changes.');
