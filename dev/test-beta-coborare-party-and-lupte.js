/* Silver Throne BETA — compact dungeon team + history in LUPTE.
 * Run: node dev/test-beta-coborare-party-and-lupte.js
 * No DB, save, account or economy writes. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const index=read('index.html'),ac=read('aventura-carduri.js'),
 css=read('aventura-carduri.css'),tmn=read('temnite.js'),history=read('istoric.js');
const between=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert(i>=0&&j>i,'Missing region: '+a);return s.slice(i,j)};
new Function(ac);new Function(tmn);new Function(history);
for(const m of index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
for(const [oldver,newver] of [
 ['aventura-carduri.css?v=2026.11.08-4','aventura-carduri.css?v=2026.11.08-5'],
 ['aventura-carduri.js?v=2026.11.08-5','aventura-carduri.js?v=2026.11.08-6'],
 ['temnite.js?v=2026.11.08-1','temnite.js?v=2026.11.08-2'],
 ['istoric.js?v=2026.11.04-4','istoric.js?v=2026.11.08-1']
]){assert(index.includes(newver),'Cache not invalidated: '+newver);assert(!index.includes(oldver),'Stale asset '+oldver);}
const betaNoCombat=between(index,"if(!d&&ST_SERVER==='beta'){","\n if(!d)return(");
assert(!betaNoCombat.includes('bhLast'),'No battle journal panel above Coborare');
assert(index.includes("if(!d)return(typeof bhLast==='function'?bhLast():''"),'LIVE history widget remains');
assert(history.includes('function bhOpen()'));
assert(history.includes("i===0?'<div class=\"bh-latest-label\">Ultima luptă"),'Latest fight pinned at LUPTE modal');

const partyCode=between(index,'function heroDungeonAddReserve(i){','function toBench(i)');
const make=(server='beta',cap=4)=>{
 const hero={h:true,n:'Erou',c:'Campion',hp:120};
 const a={n:'Toma',c:'Paznic',hp:90};
 const b={n:'Matei',c:'Vraci',hp:85};
 const c={n:'Ilinca',c:'Arcaș',hp:80};
 const away={n:'Plecat',c:'Mag',hp:99,away:true};
 const S={fs:[hero,a,b,c],rs:[away],soloDungeon:0,d:null,msg:''};
 let saves=0;const go=()=>{saves++};
 const m=new Function('S','ST_SERVER','TMAX','mxBusy','tEsc','go',
   partyCode+';return {heroSolo,heroSoloControl,heroDungeonRestore,heroDungeonAddReserve}')(S,server,()=>cap,f=>!!f.away,x=>String(x),go);
 return {S,m,hero,a,b,c,away,get saves(){return saves}};
};
let x=make();x.m.heroSolo();
assert.equal(x.S.fs.length,1,'Solo moves all mercenaries to reserve');
assert.equal(x.S.rs.length,4);
assert.equal(x.S.soloDungeon,1);
let control=x.m.heroSoloControl();
assert(control.includes('Readu mercenarii'),'One-click party restore visible');
assert.equal((control.match(/\+ Adaugă/g)||[]).length,3,'Individual add for each available mercenary');
assert(control.includes('în expediție')&&control.includes('disabled'),'Away mercenary locked');
x.m.heroDungeonRestore();
assert.deepEqual(x.S.fs,[x.hero,x.a,x.b,x.c],'Restore all 3 in the original order');
assert.deepEqual(x.S.rs,[x.away],'Busy mercenary stays in reserve');
assert.equal(x.S.soloDungeon,0);
assert.equal(x.S.fs.length,4,'Four-person level 30+ team restored');
x.m.heroSolo();x.m.heroDungeonAddReserve(2);
assert.equal(x.S.fs.length,2,'Individual add supported');
assert.equal(x.S.fs[1],x.b,'Selected mercenary restored, not arbitrary one');
assert.equal(x.S.soloDungeon,0);
x.S.d={one:1,f:{}};
const before=x.S.fs.length;x.m.heroDungeonRestore();
assert.equal(x.S.fs.length,before,'Never change team during active combat');
x.S.d=null;
x=make('beta',3);x.m.heroSolo();x.m.heroDungeonRestore();
assert.equal(x.S.fs.length,3,'Pre-level-30 squad remains capped at 3');
x=make('live');x.m.heroSolo();
assert.equal(x.S.fs.length,4,'LIVE cannot mutate via BETA solo control');
assert.equal(x.m.heroSoloControl(),'','LIVE gets no extra Coborare UI');

const env={ST_SERVER:'beta',S:{fs:[{n:'Erou',c:'Campion',h:true,hp:120},{n:'Toma',c:'Paznic',hp:80},{n:'Matei',c:'Vraci',hp:70},{n:'Ilinca',c:'Arcaș',hp:90}],
 adventure:{di:0,tierLocked:false}},
 DG:[{n:'Tronul Cenușiu',lv:46,rooms:6,bn:'Regele Cenușiu',k:1}],
 trNames:()=>['Curtean','Gardă','Mag','Campion','Cavaler','Regele Cenușiu'],
 dMk:()=>({room:1,rooms:6,k:1}),trSel:()=>1,trDef:()=>({a:'call'}),
 tmnBoss:()=>null,monImg:()=>null,monStatsAt:()=>({hp:2340,atk:516}),
 trChips:()=>'',trTier:()=>0,TR_T:{n:['Normal','Greu','Coșmar']},
 TR_A:{call:'Cheamă ajutoare'},TR_C:{call:'Mag'},trMobInfo:()=>null,
 dCostAt:()=>1,dOddsAt:()=>100,mhp:f=>150,av:()=>'<img src="face.png">',
 recGear:()=> 'Epic',tEsc:String
};
const ui=new Function(...Object.keys(env),ac+';return acDungeonPage(0);')(...Object.values(env));
const side=ui.indexOf('<div class="ac-side">');
const cta=ui.indexOf('class="p ac-primary"');
const party=ui.indexOf('class="ac-party"');
const help=ui.indexOf('class="ac-help-details"');
assert(side>=0&&cta>side&&party>cta&&help>party,
 'Within right combat pane: fight CTA, full team, optional hints in this order');
assert.equal((ui.match(/class="ac-ally\b/g)||[]).length,4,'All 4 active fighters are rendered');
assert(ui.includes('Echipament recomandat:')&&ui.includes('100%'),'Tips and odds retained');
assert(ui.includes('onclick="startD(0)"'),'Original fight action unchanged');
for(const k of [
 '.ac-dungeon .ac-side .ac-party-list{',
 'grid-template-columns:repeat(4,minmax(0,1fr))',
 '.ac-dungeon .ac-side .ac-ally-face{display:none}',
 '.ac-dungeon .ac-main-portrait{height:clamp(116px,19dvh,175px)',
 '.ac-dungeon .ac-side .ac-help-details'
])assert(css.includes(k),'Missing compact CSS: '+k);
assert(tmn.includes('.cb-party-manage-top'),'Solo/restore bar styled');

let modal='';
const histBody=between(history,'function bhOpen() {','(function () {');
const bhOpen=new Function('S','ST_SERVER','BHI','bhAgo','bhItem','tEsc','mdl',
 histBody+';return bhOpen;')({
 bh:[{k:'d',n:'Tronul Cenușiu',res:'win',g:200,o:30,m:5,x:100,it:[],log:['Atac','Victorie'],t:Date.now()},
 {k:'p',n:'Sat',res:'lost',g:0,o:0,m:0,x:0,it:[],log:['Eșec'],t:Date.now()-1000}]
 },'beta',{max:20,ic:{d:'nav-coborare',p:'nav-coborare'}},()=> 'acum',i=>i.n,String,(s)=>{modal=s});
bhOpen();
assert(modal.includes('Lupte · Istoric și jurnal'),'History moved under LUPTE');
assert(modal.includes('Ultima luptă · deschide pentru jurnal'));
assert(modal.includes('Victorie')&&modal.includes('Atac')&&modal.includes('Eșec'),'Latest and older logs preserved');
assert.equal((modal.match(/Tronul Cenușiu/g)||[]).length,1,'Latest fight is not duplicated');
console.log('OK: team 1v1 ↔ 4-person, expedition limits, level caps; compact team next to Fight; logs only in LUPTE; LIVE isolated.');
