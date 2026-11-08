/* BETA desktop village fits the viewport without a duplicate Throne card.
 * Run: node dev/test-beta-village-fit-viewport.js */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'sat.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
new Function(src);
assert(html.includes('sat.js?v=2026.11.08-2'),'Updated Sat asset busts browser cache');
assert(src.includes('vh-fit-page') && src.includes('vh-fit-layout') && !src.includes('vh-fit-side'),'BETA has one centered map without the former right column');
assert(src.includes("ST_SERVER === 'beta'"),'LIVE remains a separate layout');
assert(src.includes('aspect-ratio:1152/928') && src.includes('object-fit:contain'),'Village image keeps original ratio without cropping');
assert(src.includes('preserveAspectRatio="none"') && src.includes('SAT_W = 1152, SAT_H = 928'),'SVG and image still share original coordinates');
assert(src.includes('vh-fit-pop'),'Optional progress is available in a collapsible panel');

const start=src.indexOf('function vHub() {');
const stop=src.indexOf('\nfunction satHov(',start);
assert(start>=0 && stop>start,'Village renderer is available');
const render=src.slice(start,stop);
let throneCalls=0;
const arg={
  S:{satShowAll:false},
  SAT_B:[['a','Topitorie']],SAT_Z:{a:[[0,0,100,0,100,100],[50,50]]},
  SAT_W:1152,SAT_H:928,satVisible:()=>true,satStatus:()=>['4 locuri libere',false],
  satLvl:()=>0,satImgN:()=>1,satIcon:()=>'<svg></svg>',satExploreButton:()=>'<button id="show-all">Vezi toate clădirile</button>',
  satFocusOn:()=>false,terStage:()=> 'Tabără',
  drumPanel:()=>'<section class="progress">Progres</section>',
  tronBanner:()=>{throneCalls++;return '<div id="duplicate-tron">Tron</div>'}
};
function village(server) {
 return new Function('ST_SERVER',...Object.keys(arg),render+'\nreturn vHub();')(server,...Object.values(arg));
}
const beta=village('beta');
assert(beta.includes('vh-fit-layout') && beta.includes('vh-map'),'BETA renders the interactive scene');
assert(beta.includes('SAT')===false || beta.includes('vh-map'),'Renderer does not discard the scene');
assert(beta.includes('id="show-all"'),'New heroes retain optional building discovery');
assert(beta.includes('📜 Obiective') && beta.includes('class="progress"'),'Progress still reachable');
assert(!beta.includes('duplicate-tron') && throneCalls===0,'BETA does not even call redundant Throne banner');
assert(!beta.includes('Bot ·'),'BETA uses existing Bot setting instead of duplicate village action');
const live=village('live');
assert(live.includes('duplicate-tron') && throneCalls===1,'LIVE original Throne banner preserved');
assert(live.includes('Bot ·') && !live.includes('vh-fit-layout'),'LIVE village keeps original layout');

const s=src.indexOf('function satFitViewport() {'),e=src.indexOf('\nlet satFitResizeReady',s);
assert(s>=0&&e>s,'Viewport sizing function exists');
const fitter=src.slice(s,e);
const run=(width,height,top,layoutWidth)=>{
 const state={};
 const map={
  style:{removeProperty(k){delete state[k]},set width(v){state.width=v}},
  getBoundingClientRect:()=>({top})};
 const layout={clientWidth:layoutWidth,querySelector:q=>q==='.vh-map'?map:null};
 const doc={querySelector:q=>q==='#v .vh-fit-layout'?layout:null};
 new Function('document','window','SAT_W','SAT_H',fitter+';satFitViewport();')(doc,{innerWidth:width,innerHeight:height},1152,928);
 return state;
};
const wide=run(1650,800,225,1160);
assert(wide.width,'Desktop calculates a centered map');
const w=parseFloat(wide.width),h=w*928/1152;
assert(225+h+40<=800,'Village fits vertically with bottom padding');
assert(w<=1160,'Image width never exceeds its container');
const medium=run(1024,760,225,700);
assert(medium.width,'Medium desktop still fits');
const mobile=run(390,800,180,380);
assert(!mobile.width,'Mobile stays full width with natural scrolling');
const cramped=run(1050,490,230,750);
assert(!cramped.width,'Tiny viewport falls back to scrolling instead of clipping');
console.log('OK: BETA Sat centered, no redundant Tron/Bot, original SVG alignment, no-scroll desktop fit, LIVE and mobile unchanged.');
