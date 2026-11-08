/* Silver Throne — regresie BETA: repere 5/8/15/20/30 si pregatire capitan.
 * node dev/test-beta-progression-milestones-captains.js
 * Simulări locale in Node, fără acces la autentificare sau salvări reale. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const journey=read('drumul-eroului.js'),cards=read('aventura-carduri.js'),
 css=read('aventura-carduri.css'),html=read('index.html');
for (const code of [journey,cards]) new Function(code);
const between=(source,start,end)=>{
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert(a>=0&&b>a,start+' boundary missing');
 return source.slice(a,b);
};
const milestoneSrc=between(journey,'const JE_MILESTONES=','function jePanel(){');
const S={lvl:1,tab:'a',d:null,jeCampaignOpened:1,jeMilestoneSeen:[],fs:[{c:'Campion',h:1,hp:45}]};
let focus=true,quest=false,saves=0;
const milestones=new Function('S','jeFocus','jeCurrent','go',
 milestoneSrc+';return {JE_MILESTONES,jeMilestoneDue,jeMilestonePanel,jeMilestoneDismiss};')(
 S,()=>focus,()=>quest?{id:'poarta'}:null,()=>saves++);
assert.deepEqual(milestones.JE_MILESTONES.map(x=>x.lv),[5,8,15,20,30]);
assert.equal(milestones.jeMilestonePanel(),'','Nothing before level five');
S.lvl=5;
assert(milestones.jeMilestonePanel().includes('Lumea s-a deschis'));
assert.equal((milestones.jeMilestonePanel().match(/<button/g)||[]).length,1);
milestones.jeMilestoneDismiss();
assert.deepEqual(S.jeMilestoneSeen,[5]);
assert.equal(saves,1);
assert.equal(milestones.jeMilestonePanel(),'','No repeat after persisted dismissal');
S.lvl=30;
const high=milestones.jeMilestonePanel();
assert(high.includes('Al patrulea loc în echipă'));
assert(!high.includes('Bazarul'),'No popup cascade');
milestones.jeMilestoneDismiss();
assert.deepEqual(S.jeMilestoneSeen,[5,8,15,20,30]);
assert.equal(saves,2);
assert.equal(milestones.jeMilestonePanel(),'','Already seen highest unlock is not shown again');
S.jeMilestoneSeen=[];quest=true;
assert.equal(milestones.jeMilestonePanel(),'','No milestone while tutorial quest active');
quest=false;S.tab='m';assert.equal(milestones.jeMilestonePanel(),'','Never cover campaign');
S.tab='a';S.d={f:{}};
assert.equal(milestones.jeMilestonePanel(),'','Never cover combat');
S.d=null;focus=false;
assert.equal(milestones.jeMilestonePanel(),'','LIVE or old hero remains unchanged');
focus=true;S.jeCampaignOpened=0;
assert.equal(milestones.jeMilestonePanel(),'','Campaign CTA has priority');
S.jeCampaignOpened=1;

const simple={S:{fs:[{n:'Eroul',c:'Campion',hp:100}]},mhp:()=>100};
const adviceSrc=between(cards,'function acPreparationAdvice(','function acDungeonPage(i) {');
const advice=new Function('S','mhp',adviceSrc+';return acPreparationAdvice;')(simple.S,simple.mhp);
assert.equal(advice(true,90,'Mag').includes('Mag'),true,'Missing counter-class advice');
assert.equal(advice(true,40,'Mag').includes('Șansele estimate sunt reduse'),true);
simple.S.fs[0].hp=20;
assert(advice(true,90,'Mag').includes('Vindecă răniții'));
simple.S.fs[0].hp=0;
assert(advice(true,90,'Mag').includes('Ridică luptătorii'));
simple.S.fs[0].hp=100;
simple.S.fs.push({c:'Mag',hp:90});
assert.equal(advice(true,90,'Mag'),'','Counter-class already present');

const cfg={
 ST_SERVER:'beta',
 S:{fs:[{h:1,n:'Eroul',hp:100,c:'Campion'}],adventure:{di:0,tierLocked:false}},
 DG:[{n:'Mina Cenușie',lv:1,rooms:4,bn:'Căpitanul Cenușii',k:1}],
 trNames:()=>['Șobolan de mină','Miner blestemat','Ghoul de mină','Căpitanul Cenușii'],
 trDef:()=>({a:'call'}),TR_A:{call:'Invocă un șobolan'},TR_C:{call:'Mag'},
 trChips:()=>'',trTier:()=>0,TR_T:{n:['Normal','Greu','Coșmar']},
 trSel:()=>3,dMk:()=>({di:0,dk:'0_0',room:3,rooms:4,k:1}),
 dCostAt:()=>2,dOddsAt:()=>42,monImg:()=>null,tmnBoss:()=>['capitan','#bb6644'],
 mhp:()=>100,av:()=>'<img src="hero.jpg">',monStatsAt:()=>({hp:100,atk:20}),
 recGear:()=> 'Comun',tEsc:x=>String(x)
};
const page=new Function(...Object.keys(cfg),cards+';return acDungeonPage(0);');
const missing=page(...Object.values(cfg));
assert(missing.includes('♛ Abilitatea căpitanului'));
assert(missing.includes('Contracarat de: Mag · nu este în echipă'));
assert(missing.includes('Pregătire: Șansele estimate sunt reduse'));
assert(missing.includes('Șanse de câștig <strong>42%</strong>'),'Odds not altered');
assert(missing.includes('onclick="startD(0)"'),'Original start action retained');
cfg.S.fs.push({n:'Magul',c:'Mag',hp:90});
const present=page(...Object.values(cfg));
assert(present.includes('✓ Contracarat de Mag · este în echipa ta'));
cfg.S.fs[1].hp=0;
const fallen=page(...Object.values(cfg));
assert(fallen.includes('nu este în echipă'),'Fallen counter-class is not active');
cfg.S.fs[1].hp=90;cfg.trSel=()=>0;
const preview=page(...Object.values(cfg));
assert(preview.includes('Înapoi la Căpitanul Cenușii'),'Preview still returns to current target');
assert(!preview.includes('Pregătire: '),'Preview cannot trigger preparation');
assert(css.includes('.ac-counter')&&css.includes('.ac-prep'),'Compact styles present');
assert(html.includes('aventura-carduri.js?v=2026.11.08-6')&&
 html.includes('aventura-carduri.css?v=2026.11.08-5')&&
 html.includes('drumul-eroului.js?v=2026.11.08-5'),'New assets bust browser cache');
console.log('OK: milestones 5/8/15/20/30, one CTA, no cascades/repeats, combat/modal isolation, captain counters, 42% odds and BETA-only.');
