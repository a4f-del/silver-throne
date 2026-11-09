/* Silver Throne BETA: contextual hints for brand-new heroes.
 * node dev/test-beta-new-hero-guidance.js
 * Only isolated JavaScript; no browser login, database, or real save changes. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const src=read('ghidare-erou.js'),journey=read('drumul-eroului.js'),html=read('index.html');
new Function(src);new Function(journey);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
assert(html.includes('ghidare-erou.js?v='),'guidance is loaded after journey');
assert(html.includes("if(typeof jeDecorate==='function')jeDecorate();return;"),
 'guidance renders inside an active dungeon');
assert(html.includes("mrPost();if(typeof jeDecorate==='function')jeDecorate()"),
 'guidance renders after story modals are shown');
assert(journey.includes('onclick="jeGuideToggle()"'),'guide has an explicit hide/show control');
assert(journey.includes("typeof jeGuideDecorate==='function'"),'old village-only glow is replaced');
assert(!src.includes("'.je-guide-hit{position:relative;"),'highlight must not break absolute map button positioning');
const S={journeyV:1,journeyUxV:2,tab:'a',vil:'',d:null,
  fs:[{h:1,n:'Erou'}],inv:[],forge:[null,null,null,null],jeHintsOff:0};
let server='beta',step='poarta',hasPaznic=false,hasArcas=false,isReady=false,goCount=0,modal=false;
const stepData={
 poarta:{id:'poarta',action:()=>hasPaznic?['Mina Cenușie','c','']:['Han','a','h']},
 urme:{id:'urme',action:()=>hasArcas?['Topitorie','a','a']:['Han','a','h']},
 otel:{id:'otel',action:()=>S.inv.some(x=>x&&x.t==='w')?['Echipă','e','']:['Topitorie','a','a']},
 han:{id:'han',action:()=>['Antrenament','a','t']},
 vesti:{id:'vesti',action:()=>['Misiuni','a','x']},
 hotar:{id:'hotar',action:()=>['Hartă','m','l']}
};
const classes=()=>{const set=new Set();return {
 add:(...x)=>x.forEach(v=>set.add(v)),
 remove:(...x)=>x.forEach(v=>set.delete(v)),contains:v=>set.has(v)}};
const makeTarget=(rect={left:120,right:220,top:130,bottom:174,width:100,height:44})=>{
 const el={disabled:false,classList:classes(),style:{},attributes:{},scrolls:0,
  getBoundingClientRect:()=>rect,setAttribute(k,v){this.attributes[k]=v},
  removeAttribute(k){delete this.attributes[k]},
  scrollIntoView(){this.scrolls++}};
 return el;
};
let target=makeTarget(),other=makeTarget(),arrow=null;
const doc={
 head:null,body:{appendChild(el){arrow=el}},documentElement:{clientWidth:390,clientHeight:740},
 querySelector(q){if(q.includes('#st-prolog'))return modal?{}:null;return null;},
 querySelectorAll(q){if(q.includes('.je-target,.je-guide-hit'))return [target,other];return [target,other]},
 getElementById(id){return id==='je-guide-arrow'?arrow:null},
 createElement(tag){return {id:'',tag,style:{display:''},setAttribute(k,v){this[k]=v}}},
 contains(el){return el===target||el===other}
};
const win={innerWidth:390,innerHeight:740,visualViewport:null,
 events:[],addEventListener(name,fn){this.events.push(name)}};
const ctx={ST_SERVER:server,S,document:doc,window:win,
 stCompactActive:()=>server==='beta',
 jeFocusActive:()=>server==='beta'&&S.journeyV===1&&S.journeyUxV===2,
 jeCurrent:()=>stepData[step],jeStatus:()=>({ok:isReady}),
 go:()=>{goCount++},requestAnimationFrame:fn=>{fn();return 0}};
const api=new Function(...Object.keys(ctx),src+
 '\nreturn {JE_GUIDE,jeGuideEnabled,jeGuidePlan,jeGuideDecorate,jeGuideMove,jeGuideToggle};'
 )(...Object.values(ctx));
const plan=()=>api.jeGuidePlan();
assert.equal(plan().name,'Intră în Han','on village homepage target is the Han building');
api.jeGuideDecorate();
assert(target.classList.contains('je-guide-hit'),'one button highlighted');
assert(!other.classList.contains('je-guide-hit'),'second button stays unchanged');
assert.equal(arrow.style.display,'block','single arrow is visible');
assert.equal(arrow.textContent,'▼','arrow points down to visible target');
assert(Number.parseFloat(arrow.style.left)>=12,'arrow stays inside left edge');
assert(Number.parseFloat(arrow.style.left)<=win.innerWidth-36,'arrow stays inside right edge');
S.tab='e';assert(plan().selector.includes("tab('a')"),'wrong screen indicates Sat tab');
S.tab='a';S.vil='p';assert(plan().selector.includes('.vb-c[data-v="h"]'),'correct screen indicates building switch');
S.vil='h';assert(plan().selector.includes('mrRecruit'),'inside Han indicates the actual action');
hasPaznic=true;S.tab='a';S.vil='';
assert(plan().selector.includes("tab('c')"),'after Paznic show Aventură nav');
S.tab='c';assert(plan().selector.includes('dToggle(0)'),'on dungeon list indicate Mina entry');
S.adventure={di:0};assert(plan().selector.includes('.ac-primary'),'inside dungeon indicate Fight button');
S.d={one:1,tw:false,f:{es:[{hp:45}]}};
assert.equal(plan(),null,'automatic combat has no intrusive hint');
S.auto=false;assert(plan().selector.includes("act('n')"),'manual combat indicates basic attack');
S.d=null;S.adventure=null;S.auto=true;
isReady=true;assert(plan().selector.includes('jeClaim('),'after win point to single reward claim');
isReady=false;step='urme';S.tab='a';S.vil='h';
assert(plan().selector.includes("mrRecruit('Arcaș')"),'Arcaș join receives a direct highlight');
hasArcas=true;S.vil='a';assert(plan().selector.includes('craft()'),'forge button highlighted');
S.forge[0]={end:Date.now()-200};assert(plan().selector.includes('collect('),'finished forge highlights Collect');
step='otel';S.forge=[null,null,null,null];S.inv=[{t:'w',name:'Spadă'}];S.tab='a';S.vil='';
assert(plan().selector.includes("#nv button[onclick=\"tab('e')\"]"),'BETA guide points to restored Echipă sidebar button');
assert(plan().name.includes('Deschide Echipă'),'guide labels direct sidebar navigation');
S.tab='e';
assert(plan().selector.includes('invF('),'if item card not in DOM highlight weapon filter');
isReady=true;assert(plan().selector.includes('jeClaim('),'reward always has precedence');
isReady=false;step='han';S.tab='a';S.vil='t';assert(plan().selector.includes('train('));
step='vesti';S.tab='a';S.vil='';assert(plan().selector.includes('[data-v="x"]'));
step='hotar';S.tab='a';assert(plan().selector.includes("tab('m')"));
modal=true;api.jeGuideDecorate();assert.equal(arrow.style.display,'none','story modal hides guidance');
modal=false;step='poarta';hasPaznic=false;S.tab='a';S.vil='';
api.jeGuideDecorate();assert.equal(arrow.style.display,'block');
api.jeGuideToggle();
assert.equal(S.jeHintsOff,1,'hide preference stored on hero save');
assert.equal(goCount,1,'toggle causes a save/redraw via go');
assert.equal(plan(),null,'hidden guide has no targets');
api.jeGuideDecorate();assert.equal(arrow.style.display,'none','hidden guide has no arrow');
api.jeGuideToggle();assert.equal(S.jeHintsOff,0,'show preference can be restored');
target=makeTarget({left:375,right:390,top:4,bottom:22,width:15,height:18});
api.jeGuideDecorate();
assert(Number.parseFloat(arrow.style.left)<=win.innerWidth-36,'arrow clamped on narrow viewport');
assert.equal(arrow.textContent,'▲','upper-edge button gets arrow below');
assert.equal(target.scrolls,1,'out-of-viewport target auto-scrolls at most once per logical step');
target=makeTarget({left:100,right:180,top:165,bottom:200,width:80,height:35});
server='live';assert.equal(plan(),null,'LIVE stays untouched');
api.jeGuideDecorate();assert.equal(arrow.style.display,'none','no BETA overlay on LIVE');
server='beta';S.journeyUxV=undefined;assert.equal(plan(),null,'existing BETA saves are excluded');
assert(src.includes('prefers-reduced-motion:reduce'),'respects reduced motion');
assert(src.includes('pointer-events:none'),'arrow never steals clicks');
console.log('OK: single target, Sat/Han/Aventură/Dungeon/forge/equip, skip modals, mobile placement, hide/show, LIVE isolation.');
