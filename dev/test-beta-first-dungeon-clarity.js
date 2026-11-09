/* Silver Throne BETA: pasul 03 — prima luptă, previzualizări și primul căpitan.
 * node dev/test-beta-first-dungeon-clarity.js
 * Test fără browser, Supabase sau modificări ale salvărilor. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const ac=read('aventura-carduri.js'),css=read('aventura-carduri.css'),
 steps=read('trepte.js'),html=read('index.html'),guide=read('ghidare-erou.js');
for(const src of [ac,steps,guide])new Function(src);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
const base={
 ST_SERVER:'beta',S:{fs:[{h:1,n:'Eroul',hp:100,c:'Campion'}],adventure:{di:0,tierLocked:false}},
 DG:[{n:'Mina Cenușie',lv:1,rooms:4,bn:'Căpitanul Cenușii',k:1}],
 trNames:()=>['Șobolan de mină','Miner blestemat','Ghoul de mină','Căpitanul Cenușii'],
 trDef:()=>({a:'call'}),TR_A:{call:'Invocă un șobolan'},trChips:()=>'',trTier:()=>0,TR_T:{n:['Normal','Greu','Coșmar']},
 trSel:()=>0,dMk:()=>({di:0,dk:'0_0',room:0,rooms:4,k:1}),
 dCostAt:()=>1,dOddsAt:()=>84,monImg:()=>null,tmnBoss:()=>['capitan','#bb6644'],
 mhp:()=>100,av:()=>'<img src="hero.jpg">',monStatsAt:()=>({hp:100,atk:20}),
 recGear:()=> 'Comun',tEsc:x=>String(x)
};
function page(room,sel){
 const args={...base,trSel:()=>sel,
  dMk:()=>({di:0,dk:'0_0',room,rooms:4,k:1})};
 return new Function(...Object.keys(args),ac+';return acDungeonPage(0);')(...Object.values(args));
}
const first=page(0,0);
assert(first.includes('Progres 1 / 4'));
assert(first.includes('Urmează: Șobolan de mină'));
assert(first.includes('aria-current="step"'),'current card explicitly marked');
assert.equal((first.match(/aria-current="step"/g)||[]).length,1,
 'exactly one current monster, regardless of selected preview');
assert(first.includes('onclick="startD(0)"'),'original battle action retained');
assert(first.includes('⚔ Luptă'),'normal battle clearly labeled');
assert(first.includes('Următorul se deblochează după victorie'),
 'the next step is explained');
assert(!first.includes('ac-return-current'),'return button not shown during actual fight');
const future=page(0,3);
assert(future.includes('Informații despre adversar'));
assert(future.includes('onclick="trSelSet(0,0)"'),'preview has a one-click return');
assert(future.includes('Înapoi la Șobolan de mină'));
assert(future.includes('Acest adversar nu poate fi atacat încă'));
assert(!future.includes('onclick="startD(0)"'),'future boss never triggers current battle');
assert(!future.includes('class="ac-odds"'),'preview does not invent odds');
const past=page(2,0);
assert(past.includes('onclick="trSelSet(0,2)"'),'past preview returns to actual current step');
assert(past.includes('Înapoi la Ghoul de mină'));
assert(past.includes('Acest monstru a fost deja învins'));
assert(past.includes('Urmează: Ghoul de mină'));
const boss=page(3,3);
assert(boss.includes('Progres 4 / 4'),'boss is final step');
assert(boss.includes('Ultimul adversar: căpitanul'));
assert(boss.includes('Înfruntă căpitanul'));
assert(boss.includes('Invocă un șobolan'),'unique captain ability still shown');
assert(boss.includes('revii automat în Aventură și primești prada'),
 'post-boss navigation and loot clearly explained');
assert(boss.includes('onclick="startD(0)"'));
assert(!boss.includes('ac-return-current'));
assert(steps.includes("function trSelSet(i, k)"),'button uses existing preview selector');
assert(steps.includes("if(S.adventure&&typeof acDungeonPage"),
 'special dungeon page is used inside an adventure');
assert(html.includes('aventura-carduri.css?v=2026.11.09-5')&&
 html.includes('aventura-carduri.js?v=2026.11.09-6')&&
 html.includes('ghidare-erou.js?v=2026.11.08-3'),
 'updated UI assets are loaded without stale caching');
assert(guide.includes("document.querySelector('.ac-return-current')"),
 'new hero guidance points at return button rather than a future boss');
// Victoria reală a căpitanului este deja automată. Testăm mesajul de după loot
// separat, ca informația pentru jucător să nu fie ambiguă.
const start=html.indexOf('function dOneDone(d,b)'),end=html.indexOf('/* o singură cameră',start);
assert(start>=0&&end>start,'Dungeon completion function exists');
const finishCode=html.slice(start,end);
function finish(server){
 const state={msg:'Victorie',dp:{},adventure:{di:0}},d={one:1,di:0,dk:'0_0',room:3};
 let closed=0,rerenders=0;
 const ctx={ST_SERVER:server,S:state,DG:base.DG,trBand:()=>'',adventureClear:()=>closed++,
   leave:()=>{state.msg='Pradă: 42 aur.'},go:()=>rerenders++};
 new Function(...Object.keys(ctx),finishCode+';dOneDone({one:1,di:0,dk:"0_0",room:3},true);')(...Object.values(ctx));
 return {state,closed,rerenders};
}
const betaFinish=finish('beta');
assert.equal(betaFinish.closed,1,'boss closes the dungeon adventure');
assert.equal(betaFinish.state.dp['0_0'],0,'next run starts from first monster');
assert(betaFinish.state.msg.includes('Ai revenit automat în Aventură')&&
 betaFinish.state.msg.includes('Pradă: 42 aur'),'after-boss message and loot visible');
assert(css.includes('.ac-dungeon .ac-progress-top{'),'new step status stays compact');
assert(css.includes('.ac-dungeon .ac-return-current{'),'return button is visible in small screens');
assert(css.includes('@media(max-width:700px)'),'mobile styling remains');
assert(!css.includes('.ac-dungeon{height:100vh'),'no forced viewport clipping');
console.log('OK: primul monstru, previzualizare viitoare/trecută, revenire într-un click, căpitan, auto-return.');
