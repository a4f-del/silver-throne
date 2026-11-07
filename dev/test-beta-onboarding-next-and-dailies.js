/* Silver Throne BETA: pașii 07-09 (navigare, următoarea temniță, 3 zilnice).
 * node dev/test-beta-onboarding-next-and-dailies.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const journey=read('drumul-eroului.js'),html=read('index.html'),town=read('sat.js');
new Function(journey);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
const slice=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i+1);assert(i>=0&&j>i,a+' not found');return s.slice(i,j)};
const nextSrc=slice(journey,'function jeNextDungeonTarget(){','function jePanel(){');
const DG=[
 {n:'Mina Cenușie',lv:1,ev:0},
 {n:'Catacombele Uitate',lv:8,ev:0},
 {n:'Cetatea Scufundată',lv:18,ev:0},
 {n:'Cripta Furtunii',lv:8,ev:1}
];
const S={lvl:3,tab:'a',d:null,jeCampaignOpened:1,fs:[{hp:45,eq:{w:{name:'Sabie'}}}]};
let focused=true,goCalls=0,activeQuest=false;
const next=new Function('S','DG','jeFocus','jeCurrent','go',nextSrc+
 ';return {jeNextDungeonTarget,jeNextAdventurePanel,jeGoNextAdventure};')(
 S,DG,()=>focused,()=>activeQuest?{id:'han'}:null,()=>goCalls++);
let card=next.jeNextAdventurePanel();
assert(card.includes('Catacombele Uitate')&&card.includes('Nivel necesar: 8'));
assert(card.includes('încă 5 niveluri'),'Level gap is truthful');
assert(card.includes('Mina Cenușie'),'Suggests replaying available dungeon');
assert.equal((card.match(/<button/g)||[]).length,1,'A single CTA, no competing actions');
S.lvl=8;card=next.jeNextAdventurePanel();
assert(card.includes('Catacombele Uitate')&&card.includes('este disponibilă'));
S.lvl=18;card=next.jeNextAdventurePanel();
assert(card.includes('Cetatea Scufundată'),'Correctly recommends highest unlocked next dungeon');
S.lvl=3;S.fs[0].eq.w=null;
assert(next.jeNextAdventurePanel().includes('Echipează o armă'));
S.fs[0].eq.w={name:'Sabie'};S.fs[0].hp=0;
assert(next.jeNextAdventurePanel().includes('Infirmerie'),'Fallen fighter takes precedence');
S.fs[0].hp=45;S.fs.push({c:'Arcaș',hp:40,eq:{w:{name:'Arc'}}});
S.fs[0].eq.w=null;
assert(next.jeNextAdventurePanel().includes('Echipează o armă'),'Mercenary weapon cannot stand in for hero');
S.fs[0].eq.w={name:'Sabie'};S.tab='m';
assert.equal(next.jeNextAdventurePanel(),'','No overlay in Campaign/World');
S.tab='a';activeQuest=true;
next.jeGoNextAdventure();assert.equal(goCalls,0,'Active quest cannot be bypassed');
activeQuest=false;focused=false;
assert.equal(next.jeNextAdventurePanel(),'','LIVE/legacy focus inactive');
focused=true;next.jeGoNextAdventure();
assert.equal(S.tab,'c');assert.equal(S.jeNextHintVisited,1);assert.equal(goCalls,1);
assert.equal(next.jeNextAdventurePanel(),'','No repeated hint after following CTA');

const misSrc=slice(html,'function vMisFocus(m){','function vMis(){');
const missions=new Function('bar','dcView',misSrc+';return vMisFocus;')(
 (a,b)=>'<div class="bar" data-progress="'+a+'/'+b+'"></div>',()=>'<div id="daily-chest"></div>');
const list=[
 {t:'Forjează',n:1,g:1,c:0,p:2},{t:'Antrenează',n:2,g:0,c:0,p:2},
 {t:'Ridică un obiect',n:1,g:0,c:0,p:1},
 {t:'Vizitează Lumea',n:1,g:1,c:0},
 {t:'Câștigă o luptă',n:2,g:2,c:0},
 {t:'Deschide cufărul',n:1,g:0,c:0}
];
let page=missions({list,bonus:0});
const summary=page.indexOf('<summary>');
assert(summary>0&&page.includes('Alte 3 misiuni opționale'));
assert(page.indexOf('Forjează')<page.indexOf('<details'),'First three are prominent');
assert(page.indexOf('Vizitează Lumea')>page.indexOf('<details'),'Remaining three are tucked away');
assert(page.includes('onclick="claim(0)"')&&page.includes('onclick="claim(4)"'),'Correct original mission indices');
assert(page.includes('2 gata de revendicat'),'Optional ready claims are discoverable');
assert(!page.includes('claimB()'),'Bonus not forced before all tasks');
for(const x of list)x.c=1;
page=missions({list,bonus:0});
assert(page.includes('claimB()'),'Original optional all-six bonus remains claimable');
assert(missions({list,bonus:1}).includes('Bonusul opțional a fost revendicat'));
assert(html.includes("ST_SERVER==='beta'&&typeof jeFocus==='function'&&jeFocus())return vMisFocus(m)"),
 'Only focused BETA heroes receive the streamlined list');
assert(town.includes('satShowAll')&&town.includes('satVisible'),'Progressive village and show-all stay available');
console.log('OK: next dungeon, level gap, single CTA, optional daily missions, existing bonus, progressive Sat, BETA isolation.');
