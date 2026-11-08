/* Silver Throne BETA: 4v4 PvP cinematic overlay sizing only.
 * node dev/test-beta-pvp-four-card-overlay-layout.js
 * No game rules, network requests, or SQL changes. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const css=read('aventura-carduri.css');
const js=read('aventura-carduri.js');
const html=read('index.html');
const fx=read('fx.js');
const start=js.indexOf('function acFxMarkup(cast,hp) {');
const end=js.indexOf('function acFxAnimate(',start);
assert(start>=0&&end>start,'Combat markup function must be isolated');
const markupFn=new Function('acSafe','acArt','av',js.slice(start,end)+';return acFxMarkup;')(
 x=>String(x),()=>'<span class="stub">portrait</span>',()=>'<span class="stub">portrait</span>');
const unit={n:'Luptător',c:'Campion',hp:100,mh:100};
const mk=(n,extra={})=>({pvp:true,adventureTitle:'Atac în Lume',es:Array(n).fill(unit),fs:[unit,unit,unit,unit],...extra});
const hp=(cast)=>({fs:cast.fs.map(x=>x.hp),es:cast.es.map(x=>x.hp)});
const four=mk(4),fourHtml=markupFn(four,hp(four));
assert(fourHtml.includes('ac-fx-shell ac-fx-squad'),'4 defenders receive compact overlay');
assert.equal((fourHtml.match(/data-s="es"/g)||[]).length,4,'All four defenders remain rendered');
assert.equal((fourHtml.match(/data-s="fs"/g)||[]).length,4,'All four attacking units remain rendered');
assert(fourHtml.includes('fx-skip'),'Skip remains present');
const solo=mk(1,{fs:[unit]}),soloHtml=markupFn(solo,hp(solo));
assert(!soloHtml.includes('ac-fx-squad'),'1v1 Throne keeps existing sizes');
const triple=mk(3,{fs:[unit,unit,unit]}),tripleHtml=markupFn(triple,hp(triple));
assert(!tripleHtml.includes('ac-fx-squad'),'3v3 keeps existing sizes');
const dungeon=mk(4,{pvp:false}),dungeonHtml=markupFn(dungeon,hp(dungeon));
assert(!dungeonHtml.includes('ac-fx-squad'),'Temnițe/Turn keep existing layout');
const markers=[
 '#fx-m.ac-fx-mode .ac-fx-shell.ac-fx-squad',
 '#fx-m.ac-fx-mode .ac-fx-squad .ac-fx-enemies',
 '#fx-m.ac-fx-mode .ac-fx-squad .ac-fx-allies',
 '#fx-m.ac-fx-mode .ac-fx-squad .ac-fx-card',
 'flex-wrap:nowrap',
 'max-width:180px',
 'height:clamp(96px,17dvh,148px)!important',
 'height:clamp(70px,11dvh,96px)!important',
 'max-height:calc(100dvh - 24px)',
 'overflow-y:auto',
 '.ac-fx-squad .fx-skip',
 '@media(max-width:560px)',
 'flex-wrap:wrap'
];
for(const marker of markers)assert(css.includes(marker),'Missing compact style: '+marker);
assert(html.includes('aventura-carduri.css?v=2026.11.08-4'),'CSS cache invalidated');
assert(html.includes('aventura-carduri.js?v=2026.11.08-5'),'JS cache invalidated');
assert(fx.includes("const cardMode=!!cast.adventure&&typeof acFxMarkup==='function'"),'BETA cinematic path kept');
assert(js.includes('function acFxAnimate(modal,frame)'), 'Animation intact');
assert(!/DROP TABLE|TRUNCATE TABLE|DELETE FROM/.test(css),'Only presentation changes');
console.log('OK: BETA 4v4 overlay compacted with all eight visible fighter cards, skip accessible; 1v1, 3v3, dungeon and LIVE unaffected.');
