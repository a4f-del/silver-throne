/* Silver Throne BETA — Pas 23: adversari comparați corect, limite PvP și izolarea LIVE.
 * node dev/test-beta-pvp-matchmaking-readable.js
 * Nu are nevoie de browser, cont sau Supabase. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'lume.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
new Function(source);
const between=(a,b)=>{
 const i=source.indexOf(a),j=source.indexOf(b,i+a.length);
 assert(i>=0&&j>i,'Source boundary missing: '+a);
 return source.slice(i,j);
};
const rules=between('function lwCan(p) {','async function lwAttack(id) {');
const helper=between('function lwPvpOwnPower() {','function lwLog() {');
const make=(server='beta')=>{
 const LUME={off:0,busy:false,sel:null,st:{me:{user_id:'me'},cfg:{
  en_max:18,en_regen_min:80,same_h:6,min_level:5
 },players:[]}};
 const S={lvl:20,d:null,fs:[{hp:100},{hp:60}],wr:{cur:null}};
 const TT={power:us=>us.reduce((a,u)=>a+u.p,0)};
 const units=[{p:100},{p:50},{p:50}];
 const en={n:18,max:18},names=[],render=()=>{};
 const ctx={
  ST_SERVER:server,LUME,S,TT,
  tronTeamUnits:()=>units,tronUnits:()=>units.slice(0,1),
  lwEn:()=>en,lwCfg:()=>LUME.st.cfg,lwNow:()=>1000,
  tEsc:x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  lwNum:x=>Math.round(Number(x)||0).toLocaleString('ro-RO'),
  lwAgo:()=> 'chiar acum',sdT:()=> 'o oră',fmt:()=> '00:30',
  av:()=>'<span>portrait</span>'
 };
 const f=new Function(...Object.keys(ctx),rules+'\n'+helper+
  '\nreturn {lwCan,lwPvpOwnPower,lwPvpComparison,lwPvpSuggestions,lwSelPanel};');
 const api=f(...Object.values(ctx));
 return {S,LUME,TT,en,api};
};
const x=make('beta'),live=make('live');
const actors=[
 {id:'me',name:'Eu',level:20,power:200},
 {id:'closest',name:'Aproape',level:18,power:205},
 {id:'close',name:'Aproape doi',level:21,power:210},
 {id:'strong',name:'Puternic',level:22,power:300},
 {id:'weak',name:'Slăbuț',level:10,power:30},
 {id:'beginner',name:'Protejat',level:4,power:199},
 {id:'cooldown',name:'Pauză',level:21,power:201,cd:1200},
 {id:'unknown',name:'Necunoscut',level:20,power:0}
];
x.LUME.st.players=actors;live.LUME.st.players=actors;
assert.equal(x.api.lwPvpOwnPower(),200,'World power uses 3 unit ghost, not throne hero only');
assert.equal(x.api.lwPvpComparison(actors[1],200),'Putere apropiată de a ta');
assert.equal(x.api.lwPvpComparison(actors[3],200),'Mai puternic decât tine');
assert.equal(x.api.lwPvpComparison(actors[4],200),'Mai slab decât tine');
assert.equal(x.api.lwPvpComparison(actors[7],200),'Putere necunoscută');
assert.equal(x.api.lwCan(actors[5]).ok,false,'Server beginner protection remains in force');
assert.equal(x.api.lwCan(actors[6]).ok,false,'Same-target cooldown stays active');
assert.equal(x.api.lwCan(actors[0]).ok,false,'Cannot attack yourself');
let card=x.api.lwPvpSuggestions();
assert(card.includes('Adversari potriviți'));
assert(card.includes('puterea echipei tale publicate (200)'));
assert(card.includes('Comparația nu garantează victoria'));
assert(card.indexOf('Aproape</b>')<card.indexOf('Aproape doi</b>'));
assert(card.indexOf('Aproape doi</b>')<card.indexOf('Puternic</b>'));
assert(!card.includes('Protejat</b>')&&!card.includes('Pauză</b>')&&!card.includes('Slăbuț</b>'));
assert.equal((card.match(/class="lw-match-row"/g)||[]).length,3);
assert(card.includes('lwShow(&quot;closest&quot;)'),'Opponent ID is safely HTML-encoded');
x.LUME.sel='closest';
const selected=x.api.lwSelPanel();
assert(selected.includes('a ta: 200'),'Selected-village comparison uses World team power');
assert(selected.includes('până la 3 luptători'),'3-fighter limit explained to users');
assert(selected.includes('orientativă'),'Comparison is not a probability');
assert(selected.includes('onclick="lwAttack'),'Attack action stays available when allowed');
x.en.n=0;
assert(x.api.lwPvpSuggestions().includes('Nu există acum adversari disponibili'));
assert.equal(x.api.lwCan(actors[1]).ok,false,'Attack bar still blocks PvP');
x.S.lvl=4;x.en.n=18;
assert.equal(x.api.lwCan(actors[1]).ok,false,'Below-level attacker blocked');
assert(x.api.lwPvpSuggestions().includes('Nu există acum adversari disponibili'));
assert.equal(live.api.lwPvpSuggestions(),'','LIVE recommendations are not enabled');
live.LUME.sel='closest';
assert(live.api.lwSelPanel().includes('a ta: 100'),'LIVE keeps original comparison behavior');
assert(source.includes("La Tron, în BETA, te duelezi doar cu eroul"),'Distinct World and Throne rules described');
assert(html.includes('lume.js?v=2026.11.08-1'),'New code is not served from stale cache');
console.log('OK: 3-unit World ghost, nearest power suggestions, protection/cooldown/energy, encoded ids, no guaranteed win, LIVE isolated.');
