/* BETA profile redesign: layout, filter behavior, unchanged real inventory indices.
 * Run: node dev/test-beta-profile-refresh.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','profil.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
new Function(source);
assert(html.includes('profil.js?v=2026.11.09-2'),'Browser gets the refreshed profile');
assert(source.includes("egTitleGet()?' eg-cosmetic':''} pr-beta\">"),'Redesigned profile class applied');
for(const marker of [
  '.pr-c.pr-beta{grid-template-columns:',
  '.pr-beta .pr-doll{',
  '.pr-beta .pr-por{',
  '.pr-beta .pr-grid{',
  'overscroll-behavior:contain',
  'pr-bag-search','pr-bag-tabs',
  '@media(max-width:760px)',
  'prefers-reduced-motion:reduce',
  'prClose()',
  'prNext(',
  'prEq(',
  'prUn('
]) assert(source.includes(marker),'Profile visual/interaction missing: '+marker);
assert(source.includes("o.setAttribute('role', 'dialog')")&&source.includes("e.key === 'Escape'"),'Accessible modal and Escape preserved');
assert(source.includes('aria-pressed=')&&source.includes('aria-live="polite"'),'Filter states and count are accessible');
assert(!source.includes('localStorage'),'Redesign does not persist new game data');

const start=source.indexOf('const prBagMatches ='),end=source.indexOf('\nfunction prDraw()',start);
assert(start>0&&end>start,'Pure bag UI logic can be tested independently');
const functions=source.slice(start,end);
const inventory=[
  {t:'w',name:'Sabia Cenușii',r:2},
  {t:'a',name:'Armură de Fier',r:1},
  {t:'j',name:'Inelul Curajului',r:3},
  {t:'w',name:'Spada Rară',r:2},
  {t:'h',name:'Coif de Fier',r:1},
  {t:'r',name:'Relicvă',lg:true,r:3}
];
const fighter={id:1};
const state={i:0,bagFilter:'all',bagQuery:''};
const S={inv:inventory};
const box={innerHTML:'',scrollTop:42},count={textContent:''};
const buttons=['all','w','armor','accessory'].map(k=>({
  k,attrs:{'data-pr-filter':k},on:false,
  getAttribute(n){return this.attrs[n]},
  setAttribute(n,v){this.attrs[n]=v},
  classList:{toggle(n,val){ if(n==='on') this.on=val; }}
}));
const dom={
 getElementById:id=>id==='pr-bag-items'?box:id==='pr-bag-count'?count:null,
 querySelectorAll:q=>q==='#pr-m [data-pr-filter]'?buttons:[]
};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const build=(server,PR)=>new Function('PR','S','E','bsc','wfOk','iic','itTipA','tEsc','prF','document',
  functions+'\nreturn {prBag,prBagCells,prBagTools,prBagFilter,prBagSearch,prEscapeAttr,prBagRefresh};'
)(PR,S,()=>({}),()=>5,()=>true,it=>'<img src="item.png" alt="">',undefined,esc,()=>fighter,dom);
const api=build('beta',state);
assert.equal(api.prBagCells(fighter).count,6,'All items remain visible by default');
assert(api.prBag(fighter).includes('id="pr-bag-items"'),'BETA bag has its own scroll region');
assert(api.prBagTools().includes('Caută obiect'),'Search control is rendered');
api.prBagFilter('w');
assert.equal(api.prBagCells(fighter).count,2,'Weapons filter works');
assert(box.innerHTML.includes('prEq(0)')&&box.innerHTML.includes('prEq(3)'),'Filtering preserves true inventory indices');
assert(!box.innerHTML.includes('prEq(1)'),'Other item types are excluded');
assert.equal(count.textContent,'2 / 6','Visible result count updates');
assert.equal(buttons[1].attrs['aria-pressed'],'true','Filter button accessibility updates');
assert.equal(box.scrollTop,0,'Filter reset scroll to first result');
api.prBagFilter('armor');
assert.equal(api.prBagCells(fighter).count,2,'Armor and helm are grouped');
api.prBagFilter('accessory');
assert.equal(api.prBagCells(fighter).count,2,'Jewels and relics are grouped');
api.prBagFilter('all');
api.prBagSearch('fier');
assert.equal(api.prBagCells(fighter).count,2,'Case insensitive Romanian item search works');
api.prBagSearch('obiect inexistent');
assert(box.innerHTML.includes('Niciun obiect găsit'),'Empty filter shows useful empty state');
api.prBagSearch('');
assert.equal(api.prBagCells(fighter).count,6,'Clearing search restores inventory');
api.prBagFilter('h');
assert.equal(api.prBagCells(fighter).count,1,'Slot filter shows only that slot (helm)');
assert(api.prBagCells(fighter).html.includes('prEq(4)'),'Slot filter keeps the real inventory index');
api.prBagFilter('all');
assert(source.includes("bagOpen: false")&&source.includes('function prPick(k)')&&source.includes('pr-bag-closed'),'Bag is hidden until a slot is picked or the bag is opened');
assert(source.includes("event.stopPropagation();prUn("),'Unequip button does not also open the slot picker');
api.prBagFilter('invalid');
assert.equal(api.prBagCells(fighter).count,6,'Unknown filter is ignored');
state.bagQuery='"><img src=x onerror=alert(1)>';
assert(api.prBagTools().includes('&quot;&gt;&lt;img'),'Input value is safely escaped');

console.log('OK: BETA profile layout and filtering; original equip indices, search, empty state.');
