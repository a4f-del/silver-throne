/* Silver Throne BETA — Pas 31: audit reproducibil al economiei și cooldown NPC.
 * node dev/test-beta-economy-baseline.js
 * Proiecții teoretice, NU statistici observate în baza de date. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const npc=read('tinut.js'),html=read('index.html'),
 server=read('supabase/13-beta-world-npc-cooldown-1h.sql');
for(const s of [npc])new Function(s);
for(const part of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(part[1].trim())new Function(part[1]);
assert(npc.includes('cd: 1 * 3600e3'),'Client cooldown remains one hour');
assert(npc.includes("tronRpc('world_npc_raid'"),'NPC raid remains server checked');
assert(server.includes('interval \'1 hour\''),'Server cooldown remains one hour');
assert(server.includes('WHERE public.world_npc_raids.cooldown_until <= v_now'),
 'Server-side atomic cooldown guard remains active');
assert(npc.includes('cn(\'r\'); spend(1);'),'NPC raid entrance still costs one point');
assert(html.includes("d.raid!=null?1"),'NPC captain still costs another point');
assert(html.includes("ip=it=>Math.round((25+it.l*14)*(1+it.r*1.1))"),
 'Shop purchase-price formula preserved');
assert(html.includes("function reshop(){const c=15*S.lvl"),'Shop reroll sink preserved');
assert(html.includes('function upItem(r)'),'Upgrade still consumes ore/materials per attempt');
assert(html.includes('function sell(i)'),'Sale remains an income source');
assert(html.includes('function dis(i)'),'Dismantling remains an ore/material source');
assert(html.includes('function heal()'),'Healing remains an economic sink');
assert(html.includes('function revive(i,k)'),'Reviving remains an economic sink');

const i=npc.indexOf('function wnRl(d) {');
assert(i>=0);
const rewardSrc=npc.slice(i);
function payout(level){
 const S={lvl:level,ter:{st:{raid:0}},inv:[]};
 const d={wl:level,loot:{gold:0,ore:0,xp:0,m:{}}};
 let extraDrop=0;
 const RI=()=>3,lm=(k,n)=>{d.loot.m[k]=(d.loot.m[k]||0)+n};
 const fakeMath=Object.create(Math);fakeMath.random=()=>1;
 const f=new Function('S','RI','lm','pm','rdrop','lootItem','P','Math',
  rewardSrc+';return wnRl;')(
    S,RI,lm,()=> 'sample-material',()=>extraDrop++,()=>({name:'Item'}),x=>x[0],fakeMath);
 f(d);
 assert.equal(extraDrop,0);
 assert.equal(S.ter.st.raid,1);
 assert.equal(d.loot.m['sample-material'],3);
 return d.loot;
}
function panel(server){
 const S={lvl:15,wsel:'wn0_1'};
 const v={id:'wn0_1',lvl:15,n:'Moara Rece'};
 const a=npc.indexOf('function wnPanel() {'),b=npc.indexOf('const wnErr =',a);
 assert(a>=0&&b>a);
 return new Function('S','ST_SERVER','wnList','wnLeft','wnEff','sdT',
  npc.slice(a,b)+';return wnPanel;')(
   S,server,()=>[v],()=>0,()=>15,()=> '01:00:00')();
}
assert(panel('beta').includes('2 în total pentru o victorie'),
 'BETA explains the real two-point full raid cost');
assert(panel('beta').includes('o dată pe oră per sat'));
assert(panel('live').includes('Un sat fără stăpân, vizibil tuturor jucătorilor'),
 'LIVE panel remains unchanged');
assert(!panel('live').includes('2 în total'));
const priceSrc=html.slice(html.indexOf('const SH='),html.indexOf('function shop()'));
const ip=new Function(priceSrc+';return ip;')();
const levels=[5,15,30,45],rates=[1,3,5],rows=[];
for(const level of levels){
 const v=payout(level);
 assert.equal(v.gold,Math.round((60+30*level)*1.2));
 assert.equal(v.ore,5+level);
 assert.equal(v.xp,Math.round(20+8*level));
 const rarePrice=ip({l:level,r:2});
 for(const raidsPerHour of rates){
  const gold=v.gold*raidsPerHour,ore=v.ore*raidsPerHour,materials=3*raidsPerHour;
  rows.push({level,raidsPerHour,gold,ore,materials,points:2*raidsPerHour,
   rareShopPrice:rarePrice,shopEquivalent:+(gold/rarePrice).toFixed(2)});
 }
}
assert(rows.length===12);
assert(rows.every(x=>x.points<=10),'No scenario exceeds 10 points/hour regeneration');
assert(rows.every(x=>x.ore>0&&x.gold>0&&x.materials>0));
assert(rows.every(x=>x.shopEquivalent<10),
 'Economy model has finite gold-to-shop-equivalent projection');
// No claims of full raid income: base boss payout ONLY, excludes dungeon
// combat loot, affix bonuses, death/retreat losses and occasional item drops.
console.log('Teoretic: doar premiul fix al căpitanului NPC, toate victoriile, suficienți inamici/HP.');
console.log('Nivel | sate/oră | aur/oră | minereu/oră | materiale/oră | puncte/oră | Rare preț Piață | echiv. Rare');
rows.forEach(x=>console.log(String(x.level).padStart(5)+' | '+String(x.raidsPerHour).padStart(8)+
 ' | '+String(x.gold).padStart(7)+' | '+String(x.ore).padStart(12)+' | '+
 String(x.materials).padStart(13)+' | '+String(x.points).padStart(11)+' | '+
 String(x.rareShopPrice).padStart(15)+' | '+x.shopEquivalent));
console.log('OK: server/client 1h cooldown, actual 2-point full raid, 4-level baseline, shop rerolls and other sinks preserved, LIVE isolated.');
