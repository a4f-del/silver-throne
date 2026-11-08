/* Silver Throne BETA — pașii 23/24: recomandări PvP și prestigiul Tronului.
 * node dev/test-beta-pvp-throne-clarity.js
 * Fără server, autentificare sau mutarea jocului real. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const world=read('lume.js'),throne=read('tron.js'),html=read('index.html');
new Function(world);new Function(throne);
for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
const segment=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i+a.length);assert(i>=0&&j>i,'Missing '+a);return s.slice(i,j)};
const code=segment(world,'function lwMatchAdvice(p,can){','function lwSelPanel() {');
function make(server='beta'){
 const squad=[{n:'Eroul',atk:70},{n:'Paznicul',atk:50},{n:'Arcașul',atk:40},{n:'Vraciul',atk:40}];
 const TT={CFG:{maxUnits:3},power:a=>a.reduce((n,x)=>n+x.atk,0)};
 const fn=new Function('ST_SERVER','tronTeamUnits','TT','lwNum','tEsc',code+';return lwMatchAdvice;')(
  server,()=>squad,TT,n=>Math.round(n).toLocaleString('ro-RO'),
  s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])));
 return {fn,squad,TT};
}
const beta=make();
let advice=beta.fn({power:270},{ok:true});
assert(advice.includes('Adversar mai puternic'));
assert(advice.includes('puterea ta 200'),'Uses full World team, not lone hero');
assert(advice.includes('puterea adversarului 270'));
assert(advice.includes('Pregătește echipamentul'));
assert(advice.includes('maxim 4 luptători'));
advice=beta.fn({power:185},{ok:true});
assert(advice.includes('Forțe apropiate'),'Mid-risk tier is visible');
advice=beta.fn({power:70},{ok:true});
assert(advice.includes('Adversar mai slab'));
assert(advice.includes('nu o victorie garantată'),'No invented win probability');
advice=beta.fn({power:null},{ok:true});
assert(advice.includes('Putere necunoscută'),'No invented power');
advice=beta.fn({power:100},{ok:false,why:'Sub nivel <b>5</b> & protejat'});
assert(advice.includes('Atacul este indisponibil acum'));
assert(!advice.includes('<b>5</b>')&&advice.includes('&amp; protejat'),'Blocked attack reasons safely escaped');
assert(!advice.includes('onclick="lwAttack'),'A recommendation never bypasses the server');
assert(world.includes("TT.power(tronTeamUnits())"),'BETA comparison uses published World squad');
assert(world.includes('const can = lwCan(p)')||world.includes('can = mine ? null : lwCan(p)'),'Actual attack gating retained');
assert(world.includes("world_raid_start"),'Server starts an authorized attack');
assert(world.includes('p.level < c.min_level'),'Newcomer protection retained');
assert(world.includes('p.cd && p.cd > lwNow()'),'Same-target cooldown retained');
assert(world.includes('en && en.n < 1'),'Attack-energy limit retained');
assert(world.includes('Tronul are duel separat doar între eroi'),'World/Throne distinction explicit');

const pCode=segment(throne,'function tronPodium(rank) {','function vTron() {');
const TRON={st:{me:{user_id:'mine'}}};
const podium=new Function('TRON','tEsc','tronHM',pCode+';return tronPodium;')(
 TRON,String,n=>Math.round(n/60)+' min');
const rank=[
 {rank:1,user_id:'other',seconds:500,name:'Regele'},
 {rank:2,user_id:'mine',seconds:320,name:'Eroul'},
 {rank:3,user_id:'third',seconds:120,name:'Aliat'}
];
const chart=podium(rank);
assert(chart.includes('Eroul (tu)')&&chart.includes('Regele'),'Current weekly podium preserved');
assert(throne.includes('Locul tău: ')&&throne.includes('mineRank'),'Personal ranking info added');
assert(throne.includes('Sala Faimei ·')&&throne.includes('sezoane încheiate'),'Historical seasons stay readable and collapsible');
assert(throne.includes("typeof DEV==='function' && DEV() && ho && prot > 0"),'BETA admin reset hidden from ordinary players');
assert(!throne.includes('tronIsBetaDuel'),'Hero duel is the only Throne mode');
assert(throne.includes('Duel')||throne.includes('duel'),'Hero-only duel preserved');
assert(throne.includes('Prestigiul vine din clasament'),'No permanent combat power offered');
assert(throne.includes('me.can_challenge'),'Tron server eligibility retained');
assert(html.includes('tron.js?v=2026.11.09-1')&&html.includes('lume.js?v=2026.11.09-1'));
console.log('OK: real 4-unit World power, risk tiers without false odds, newbie/cooldown gating, personal ranking, hall and admin-tool protection.');
