/* Silver Throne BETA — Runele (moneda premium de test): serverul ține soldul și prețurile,
 * jocul doar afișează; fără SQL44 (LIVE) nu apare nimic. Run: node dev/test-beta-runes.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('index.html'),sql=read('supabase/44-beta-rune.sql'),js=read('runes.js'),adm=read('admin.js'),tema=read('tema.js'),merc=read('mercenari.js');

// SQL: doar BETA, fără acces direct la tabele, cumpărarea verifică soldul pe server
assert(/DOAR în Supabase Silver-Throne-Test/.test(sql)&&/NU LIVE/.test(sql),'SQL44 marcat BETA');
assert(/REVOKE ALL ON TABLE public\.rune_wallets FROM PUBLIC, anon, authenticated/.test(sql),'portofelul nu se citește direct');
assert(/runes\s+integer NOT NULL DEFAULT 0 CHECK \(runes >= 0\)/.test(sql),'soldul nu poate fi negativ');
assert(/if w\.runes < v_cost then raise exception/.test(sql),'serverul refuză fără Rune');
assert(/not public\.is_beta_admin\(\) then raise exception 'Doar administratorii BETA'/.test(sql),'doar adminii adaugă Rune');
assert(/rune_ledger/.test(sql),'jurnal pentru fiecare mișcare');

// jocul: încărcat, legat de forjă, grăbire, antet, skinuri, panou
assert(/<script src="runes\.js\?v=[\d.-]+"><\/script>/.test(html),'runes.js încărcat');
assert(html.includes("S.pity*5+(typeof rnPact=='function'?rnPact():0)"),'pactul intră în șansa de forjare');
assert(html.includes("Math.min(95,"),'șansa rămâne plafonată la 95%');
assert(tema.includes("rnRushBtn('f', i, s.end)")&&merc.includes("rnRushBtn('x', f.c, o.end)"),'grăbire la forjă și expediții');
assert(adm.includes('rnAdminHtml()'),'Rune în panoul de administrator');

// logica din client, fără server
const ctx={S:{prem:false,premT:false,bp:0},CONT:{user:null,booted:false},document:{head:null,getElementById:()=>null},window:undefined,Date,Math,String,Array,setTimeout,setInterval};
vm.createContext(ctx);vm.runInContext(js+';this.RN=RN;this.rnApply=rnApply;this.rnPact=rnPact;this.rnOwn=rnOwn;this.rnRushCost=rnRushCost;this.rnChip=rnChip;',ctx);
assert.equal(ctx.rnChip(),'','fără server: nicio monedă în antet');
assert.equal(ctx.rnPact(),0,'fără server: niciun pact');
const now=Date.now(),cat={pact_pct:8,rush_min:1,rush_max:600,rush_per_min:10};
ctx.rnApply({runes:50,prem_until:now+864e5,pact_until:now+36e5,skins:['Vraci'],now,catalog:cat});
assert.equal(ctx.S.prem,true,'abonamentul de pe server pornește Premium');
assert.equal(ctx.rnPact(),8,'pact activ: +8%');
assert.equal(ctx.rnOwn('Vraci'),true);assert.equal(ctx.rnOwn('Mag'),false);
assert.equal(ctx.rnRushCost(now+5*6e4),1,'minim 1 Rună');
assert.equal(ctx.rnRushCost(now+3*36e5),18,'3 ore = 18 Rune');
assert.equal(ctx.rnRushCost(now+30*864e5),600,'plafon 600');
ctx.rnApply({runes:50,prem_until:now-1,pact_until:null,skins:[],now,catalog:cat});
assert.equal(ctx.S.prem,false,'abonament expirat: Premium oprit');
ctx.S.premT=true;ctx.rnApply();assert.equal(ctx.S.prem,true,'comutatorul de test din 🛠 rămâne');
ctx.rnApply({ok:true});assert.equal(ctx.RN.ok,0,'răspuns necunoscut: Runele ascunse');assert.equal(ctx.rnChip(),'');
console.log('OK: Rune BETA (server, pact, grăbire, skinuri, Premium).');
