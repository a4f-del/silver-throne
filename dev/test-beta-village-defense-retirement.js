/* Silver Throne — retire village defense in BETA; smoke syntactic scripts.
 * node dev/test-beta-village-defense-retirement.js
 * No server, login, writes or player data. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {stGearStats}=require('../echipament-balance.js');
const oldWeapon={t:'w',s:{dmg:7,vd:8}},saved=JSON.stringify(oldWeapon);
const betaWeapon=stGearStats(oldWeapon);
assert.equal(betaWeapon.def,2,'legacy 8% defense becomes +2 combat defense in BETA');
assert(!('vd' in betaWeapon),'BETA combat stats no longer contain retired modifier');
assert.equal(JSON.stringify(oldWeapon),saved,'old items are never migrated or edited');
const armor={t:'a',s:{hp:10,def:5,vd:4}};
const stats=stGearStats(armor);
assert.equal(stats.hp,14,'existing BETA armor HP scaling is retained');
assert.equal(stats.def,7,'armor defense scaling applies to normalized defense');
const html=read('index.html'),sat=read('sat.js'),main=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).find(s=>s.includes('function atkCheck(){'));
assert(main,'Game script missing');
assert(main.includes("function atkCheck(){return;}"),'automatic NPC village attacks retired');
assert(main.includes("function hireG(){S.msg='Garnizoanele vechi au fost retrase"));
assert(main.includes("function build(k){if(k==='z')"));
assert(main.includes("const key=k==='vd'?'def':k"),'new affixes normalized');
assert(sat.includes("if(k==='z')return false"),'defense building never offered');
const ter=read('teritorii.js');
assert(ter.includes("const renStage = k =>"),'cosmetic renovation untouched');
assert(ter.includes('function renBuy(k)'), 'cosmetic renovations still buyable');
assert(ter.includes('function flagRow()'),'flags are kept');
assert(ter.includes('function lootItem(types, l, r, pi, si, q)'),
  'reward helper lootItem must still exist for NPCs and campaign');
assert(html.indexOf('teritorii.js?v=')<html.indexOf('tinut.js?v='),
  'lootItem script must load before NPC rewards');
assert(!read('panou.js').includes('push(debt ?'),
 'No old territory upkeep in BETA sidebar');
const source=sat.slice(0,sat.indexOf('/* zonele din imaginile satului'));
const town=new Function('S','jeFocusActive','mrAll','mhp',
 source+';return {satVisible};');
const S={je:{done:['poarta','urme','otel','han']},satShowAll:true,fs:[{hp:100}]};
assert(!town(S,()=>true,()=>S.fs,()=>100).satVisible('z'));
assert(!town(S,()=>false,()=>S.fs,()=>100).satVisible('z'));
const ext=[];
for(const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/gi)){
 const name=m[1].split('?')[0];
 if(name.startsWith('http'))continue;
 ext.push(read(name));
}
// Browser scripts share the same global lexical environment: this catches
// e.g. the historical WF re-declaration that prevented BETA from booting.
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
 .map(m=>m[1]).filter(Boolean);
new Function([...ext,...inline].join('\n;\n'));
console.log('OK: legacy gear converted without mutation, BETA attacks/guardians retired, cosmetics retained, lootItem defined, all scripts parse together.');
