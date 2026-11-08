/* Silver Throne BETA pas 29 — protecție anti-ghinion în Fierărie.
 * node dev/test-beta-forge-upgrade-pity.js
 * Simulări deterministe, fără conturi, fără modificări ale economiei LIVE. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
for(const m of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))if(m[1].trim())new Function(m[1]);
const a=source.indexOf('const UPC=['),b=source.indexOf('function vC(){',a);
assert(a>=0&&b>a,'Fierăria helper boundaries');
const code=source.slice(a,b);
function harness(server='beta',enabled=true){
 const item={name:'Sabie',l:30,r:3,up:8,s:{dmg:100},m:['mat']};
 const other={name:'Arc',l:30,r:3,up:8,s:{dmg:90},m:['mat']};
 const S={lvl:50,d:null,inv:[item,other],rs:[],fs:[],gold:100000,ore:100000};
 const mats={mat:500},log=[];
 const random=Object.create(Math);random.random=()=>0.999;
 const ctx={S,ST_SERVER:server,jeFocus:()=>enabled,twUpMax:()=>9,
  cost:()=>10,mrAll:()=>[],have:k=>mats[k]||0,
  take:(k,n)=>{mats[k]-=n},Math:random,
  RAR:[{n:'Comun'},{n:'Magic'},{n:'Rar'},{n:'Epic'}],
  MA:{mat:'Material'},SL:[],iic:()=>'',tEsc:String,go:()=>log.push(S.msg)};
 const api=new Function(...Object.keys(ctx),code+
  ';return {UPP_LIMIT,UPC,upPityActive,upPityFails,upChance,upCost,upItem,vFier};')(...Object.values(ctx));
 return {api,S,item,other,mats,log};
}
const beta=harness(),f=beta.api;
assert.equal(f.UPP_LIMIT.length,9);
assert.deepEqual(f.UPP_LIMIT,[5,7,9,11,13,16,19,22,26]);
assert.equal(f.upChance(beta.item),10);
assert(f.upPityActive());
const price=f.upCost(beta.item);
assert.deepEqual(price,{g:43200,o:90,m:'mat',mn:9});
assert(beta.api.vFier().includes('Protecție BETA'));
assert(beta.api.vFier().includes('1/26 încercări'));
const originalGold=beta.S.gold,originalOre=beta.S.ore,originalMat=beta.mats.mat;
for(let i=1;i<=25;i++){
 f.upItem('i:0');
 assert.equal(beta.item.up,8,'Item cannot upgrade on failed 99.9 roll');
 assert.equal(f.upPityFails(beta.item),i);
 assert.equal(beta.S.gold,originalGold,'No gold lost on failure');
 assert.equal(beta.S.ore,originalOre-90*i,'Ore cost stays real on every attempt');
 assert.equal(beta.mats.mat,originalMat-9*i,'Material cost stays real');
 assert.equal(f.upChance(beta.other),10,'Another item cannot inherit pity');
 assert.equal(f.upChance(beta.item),i===25?100:10+i);
}
assert(beta.api.vFier().includes('26/26 încercări'));
assert(beta.api.vFier().includes('100% șansă'));
f.upItem('i:0');
assert.equal(beta.item.up,9,'Attempt 26 is guaranteed even at 99.9 random roll');
assert.equal(beta.S.gold,originalGold-price.g,'Gold charged exactly once on success');
assert.equal(beta.S.ore,originalOre-26*price.o,'Every attempt consumes ore, including guaranteed');
assert.equal(beta.mats.mat,originalMat-26*price.mn);
assert.equal(beta.item.upFails,0,'New tier starts with no failures');
assert.equal(f.upPityFails(beta.item),0);
assert.equal(f.upChance(beta.other),10);
assert.equal(beta.item.s.dmg,Math.round(100*(1+.08*9)),'Existing +8% stats per tier preserved');
beta.item.up=8;beta.item.upFails=3;beta.item.upStep=7;
assert.equal(f.upPityFails(beta.item),0,'Old tier failures never carry over');
beta.item.upFails=999999;beta.item.upStep=8;
assert.equal(f.upPityFails(beta.item),25,'Corrupt counter clamped to configured maximum');
const old=harness('live');
old.api.upItem('i:0');
assert.equal(old.api.upChance(old.item),10,'LIVE original upgrade odds unchanged');
assert.equal(old.item.upFails,undefined,'No LIVE save mutation');
assert(!old.api.vFier().includes('Protecție BETA'));
const legacy=harness('beta',false);
legacy.api.upItem('i:0');
assert.equal(legacy.api.upChance(legacy.item),10,'Older BETA heroes unchanged');
assert.equal(legacy.item.upFails,undefined,'No legacy BETA save mutation');

// Exact expectation over Bernoulli trials, with guaranteed final attempt.
// Expected attempts -> expected ore/material expenditure. Gold cost unchanged
// because it is charged only on the first success.
function expected(base,limit){
 let survival=1,attempts=0;
 for(let i=1;i<=limit;i++){
  attempts+=survival;
  const p=i===limit?1:Math.min(.99,(base+i-1)/100);
  survival*=1-p;
 }
 return attempts;
}
const results=f.UPC.map((base,i)=>({
  tier:i+1,old:100/base,modern:expected(base,f.UPP_LIMIT[i])
}));
assert(results.every(x=>x.modern<=x.old&&x.modern>=x.old*.65),
 'Pity protection should remain a measured improvement, no economic collapse');
assert(results[8].modern<7&&results[8].modern>6.5,
 'Final tier expected attempts moderated to around 6.8 instead of 10');
assert(results[4].modern>3&&results[4].modern<3.3,
 'Tier +5 expected attempts remain near original 3.33');
assert(source.includes("if(ok)S.pity=0;else S.pity++"),
 'Topitorie original global crafting pity remains untouched');
console.log('Simulare upgrade '+results.map(x=>'+'+x.tier+': '+
 x.old.toFixed(2)+' → '+x.modern.toFixed(2)+' încercări').join(' | '));
console.log('OK: 9 upgrade tiers bounded, per-item pity, guaranteed attempts, true ore/material/gold costs, LIVE and old BETA untouched.');
