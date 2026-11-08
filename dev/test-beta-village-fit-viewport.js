/* BETA desktop village fits available viewport without cropping or warping image.
 * Run: node dev/test-beta-village-fit-viewport.js */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '..', 'sat.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
new Function(src);
assert(html.includes('sat.js?v=2026.11.08-1'),'New Sat asset version busts browser cache');
assert(src.includes('vh-fit-page') && src.includes('vh-fit-layout') && src.includes('vh-fit-side'),'Only BETA uses the 2-column scene');
assert(src.includes("ST_SERVER === 'beta'"),'LIVE Sat layout remains separate');
assert(src.includes('aspect-ratio:1152/928') && src.includes('object-fit:contain'),'Village image cannot stretch or crop');
assert(src.includes('preserveAspectRatio="none"') && src.includes('SAT_W = 1152, SAT_H = 928'),'Polygon overlay keeps original image coordinates');
assert(src.includes("const optional = progress ?"),'Existing progress content remains accessible');
assert(src.includes('${more}${throne}${optional}'),'Secondary controls and Throne stay accessible');
const s=src.indexOf('function satFitViewport() {'),e=src.indexOf('\nlet satFitResizeReady',s);
assert(s>=0&&e>s,'Viewport sizing function exists');
const fitter=src.slice(s,e);
const run=(width,height,top,layoutWidth)=>{
 const state={};
 const map={
  style:{removeProperty(k){delete state[k]},set width(v){state.width=v}},
  getBoundingClientRect:()=>({top})};
 const side={style:{removeProperty(k){delete state[k]},set maxHeight(v){state.maxHeight=v}}};
 const layout={clientWidth:layoutWidth,querySelector:s=>s==='.vh-map'?map:side};
 const doc={querySelector:s=>s==='#v .vh-fit-layout'?layout:null};
 new Function('document','window','SAT_W','SAT_H',fitter+';satFitViewport();')(doc,{innerWidth:width,innerHeight:height},1152,928);
 return state;
};
const wide=run(1650,800,225,1160);
assert(wide.width&&wide.maxHeight,'Desktop landscape computes fitting dimensions');
const vw=parseFloat(wide.width),vh=parseFloat(wide.maxHeight);
assert(Math.abs(vw/vh-1152/928)<.01,'Original aspect ratio preserved');
assert(225+vh+44<=800,'Map fits in window with 44px lower reserve');
assert(vw+14+210<=1160,'Room remains for secondary controls');
const medium=run(1024,760,225,700);
assert(medium.width&&medium.maxHeight,'Medium desktop still fits with narrow side');
const small=run(390,800,180,380);
assert(!small.width&&!small.maxHeight,'Mobile uses readable full-width scroll layout');
const cramped=run(1050,490,230,750);
assert(!cramped.width&&!cramped.maxHeight,'Tiny viewport never crops the scene');
console.log('OK: desktop Sat image/labels fit viewport at original ratio, secondary actions remain, LIVE/mobile unaffected.');
