/* Silver Throne BETA — echilibrul PvP (Lume/Tron): fantoma lovește critic și își folosește abilitatea clasei,
 * apărarea e procentuală în PvP, inițiativa se trage la sorți, țintirea e simetrică.
 * Run: node dev/test-beta-pvp-fairness.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const TT=require('../tron-logic.js');
const sp=read('specializari.js'),html=read('index.html'),lume=read('lume.js'),tron=read('tron.js'),sql=read('supabase/43-beta-throne-ghost-crit.sql');

// apărări vechi (fără cr): exact ca înainte
const old=TT.throneDuelUnit({n:'A',c:'Campion',hp:1000,atk:100,def:50});
assert.equal(old.atk,162,'legacy defense keeps ×1.62');assert.equal(old.cr,undefined);
// apărări noi: criticele trec, multiplicatorul e mic și crește cu nivelul
const n20=TT.throneDuelUnit({n:'A',c:'Campion',hp:1000,atk:100,def:50,cr:30,cm:2},undefined,20);
const n50=TT.throneDuelUnit({n:'A',c:'Campion',hp:1000,atk:100,def:50,cr:30,cm:2},undefined,50);
assert.equal(n20.cr,30);assert.equal(n20.cm,2);assert.equal(n20.atk,105);assert.equal(n50.atk,108);
assert(n50.atk<old.atk,'new ghost relies on crits/abilities, not a flat ×1.62');
// plafoane de siguranță pentru instantanee trucate
const bad=TT.throneDuelUnit({n:'A',c:'Campion',hp:1,atk:1,def:0,cr:999,cm:99},undefined,30);
assert.equal(bad.cr,75);assert.equal(bad.cm,2.5);
assert.equal(TT.ghostCrit({cr:'x'}),null);

// apărare procentuală în PvP
const ctx={};new Function('ctx',sp.slice(sp.indexOf('function pvpArmor'))+';ctx.pvpArmor=pvpArmor;')(ctx);
assert.equal(ctx.pvpArmor(200,200),100,'equal defense lets half through');
assert.equal(ctx.pvpArmor(100,0),100);assert(ctx.pvpArmor(100,1000)>=1);
assert(ctx.pvpArmor(121,175)>40,'low-attack units still matter (was −1 with flat armor)');

// cablarea în motor
assert(html.includes("S.d&&S.d.ghost&&typeof pvpArmor==='function'?pvpArmor("),'player hits use PvP armor');
assert(sp.includes('let d = pvp ? pvpArmor(raw, df)'),'ghost hits use PvP armor');
assert(html.includes("if(e.gcr!=null&&typeof ghostTurn==='function')ghostTurn("),'new ghosts use class abilities');
assert(sp.includes("function ghostTurn(e, al, f, L)")&&sp.includes("e.c === 'Vraci'"),'ghost Vraci heals');
assert(sp.includes('al.reduce((m, x) => (x.hp < m.hp ? x : m), al[0])'),'ghost focuses the weakest, like the player');
assert(html.includes('if(S.d.ghost&&typeof pvpTaunt===\'function\')e=pvpTaunt(e,al);'),'defender Paznic taunts too');
assert(lume.includes('d.defFirst = Math.random() < 0.5')&&lume.includes('if (d.defFirst) enemy();'),'World initiative is a coin flip');
assert(tron.includes('d.duelKingFirst = TT.duelKingStarts();'),'Throne initiative stays a coin flip');
assert(tron.includes('function tronUnitOf(f)')&&tron.includes('cr: Math.max(0, Math.min(100, cr)), cm'),'snapshots include crits');
// PvE neatins: formulele noi doar sub S.d.ghost
assert(html.includes(':Math.max(1,Math.round(dm-spDef(a,e,o)))'),'PvE keeps flat armor');
// SQL43
for(const m of ["'cr', least(75, greatest(0,","'cm', least(2.5, greatest(1.5,","else '{}'::jsonb end","GRANT EXECUTE ON FUNCTION public.throne_publish(text,integer,jsonb) TO authenticated"])assert(sql.includes(m),'SQL43 '+m);
assert(!/\b(DROP|TRUNCATE|DELETE FROM)\b/i.test(sql));
console.log('OK: PvP fairness — crit-aware ghosts with class abilities, PvP armor, coin-flip initiative, symmetric targeting.');
// numere întregi în lupte (fără „-56.1399”)
{const fx=read('fx.js');const fxInt=new Function(fx.match(/const fxInt[^\n]*/)[0]+';return fxInt')();
assert.equal(fxInt('A lovește B (-56.139999999999986). +12.5'),'A lovește B (-56). +13');
assert(html.includes("const bleed=Math.round("),'bleed ticks are whole numbers');
assert(fx.includes('Math.round(hp[side][d.i])'),'HP labels are whole numbers');}
console.log('OK: whole numbers in combat text.');
