/* Silver Throne BETA — pas 31: auditul consumului de aur în Fierărie.
 * node dev/test-beta-economy-forge-gold-audit.js
 * Model matematic, NU observații economice reale din Supabase. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,'..',n),'utf8');
const html=read('index.html'),baseline=read('dev/test-beta-economy-baseline.js');
const pity=read('dev/test-beta-forge-upgrade-pity.js');
assert(html.includes("if(ST_SERVER==='beta')S.gold-=c.g;"),
 'BETA gold is charged before the roll');
assert(html.includes("if(ST_SERVER!=='beta')S.gold-=c.g;it.up=u+1;"),
 'LIVE gold is charged only on success; BETA is not double charged');
assert(html.includes("Aurul, minereul și materialele se consumă la fiecare încercare"),
 'UI discloses the new BETA economic sink');
assert(baseline.includes('server-side atomic cooldown guard')||
 baseline.includes('Server-side atomic cooldown guard remains active'),
 'NPC cooldown retains baseline coverage');
assert(pity.includes('Gold is paid for every failed BETA attempt'),
 'Upgrade attempts have runtime cost regression coverage');
const base=[90,75,60,45,30,25,20,15,10],limit=[5,7,9,11,13,16,19,22,26];
const expectAttempts=(chance,cap)=>{
 let survival=1,total=0;
 for(let n=1;n<=cap;n++){
  total+=survival;
  const p=n===cap?1:Math.min(.99,(chance+n-1)/100);
  survival*=1-p;
 }
 return total;
};
const goldCost=(level,rarity,tier)=>40*level*tier*(rarity+1);
const level=30,rarity=3,rows=base.map((b,i)=>{
 const tier=i+1,cost=goldCost(level,rarity,tier);
 const expectedNew=expectAttempts(b,limit[i]);
 const expectedOld=100/b;
 return {tier,chance:b,limit:limit[i],perAttempt:cost,
  expectedNew,expectedOld,legacyLiveGold:cost,
  betaNewGold:cost*expectedNew,betaOldGold:cost*expectedOld,
  hardCapNewGold:cost*limit[i]};
});
assert(rows.every(x=>x.expectedNew<=x.expectedOld));
assert(rows.every(x=>x.betaNewGold>=x.legacyLiveGold));
assert(rows.every(x=>x.betaOldGold>=x.betaNewGold));
assert(rows.every(x=>x.hardCapNewGold>=x.betaNewGold));
assert.equal(rows[8].perAttempt,43200);
assert(rows[8].expectedNew>6.8&&rows[8].expectedNew<6.9);
assert(rows[8].betaNewGold>290000&&rows[8].betaNewGold<300000);
assert(rows[8].betaOldGold===432000);
assert(rows[8].hardCapNewGold===1123200);
const fmt=x=>Math.round(x).toLocaleString('ro-RO');
console.log('MODEL TEORETIC — nivel 30, raritate Epic, de la +0 la treapta indicată.');
console.log('Treapta | șansa de bază | încercări BETA noi estimate | aur/încercare | aur total BETA noi așteptat | BETA vechi așteptat | LIVE așteptat');
for(const r of rows) console.log('+'+r.tier+' | '+r.chance+'% | '+r.expectedNew.toFixed(2)+
 ' | '+fmt(r.perAttempt)+' | '+fmt(r.betaNewGold)+
 ' | '+fmt(r.betaOldGold)+' | '+fmt(r.legacyLiveGold));
console.log('Limitări: fără pierderi în luptă/raid, dropuri, vânzări, premium, evenimente sau prețuri observate.');
console.log('OK: aur BETA plătit pe încercare, limită de risc, costuri LIVE neschimbate, cooldown NPC verificat.');
