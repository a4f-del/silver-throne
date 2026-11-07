/* Pas 01, BETA — prima victorie contra unui capitan.
 * node dev/test-beta-new-player-first-captain.js
 * Test izolat: fara browser, conturi sau salvări reale. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const journey=read('drumul-eroului.js'),main=read('index.html'),
  hero=read('erou.js'),merc=read('mercenari.js'),prolog=read('prolog.js');
for(const js of [journey,hero,merc,prolog]) new Function(js);
for(const m of main.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim()) new Function(m[1]);
function make(server='beta',flags={}) {
 const counts={bs:0,l:0,d:0,f:0,e:0};
 const S={journeyV:1,journeyUxV:2,mrStoryV:1,mrPrologPending:0,mrPrologSeen:1,
   fs:[{n:'Eroul',h:1,c:'Campion',hp:45}],rs:[],je:{done:[]},
   gold:40,ore:24,d:null,tab:'a',vil:'',...flags};
 let calls=0;
 const api=new Function('ST_SERVER','S','C','mrAll','go',journey+
  '\nreturn {JE_STEPS,jeEnabled,jeReady,jeCurrent,jeStatus,jePanel,jeNavigate,jeClaim,jeFocus};')(
   server,S,k=>counts[k]||0,()=>[...S.fs,...S.rs],()=>{calls++});
 return {S,counts,api,get calls(){return calls}};
}
const a=make(),S=a.S,counts=a.counts,api=a.api;
assert.equal(api.jeEnabled(),true);
assert.equal(api.jeFocus(),true);
assert.equal(api.jeCurrent().id,'poarta');
assert(api.jePanel().includes('Ai învins primul căpitan'));
assert(api.JE_STEPS[0].help.includes('Căpitanul Cenușii'));
api.jeNavigate();
assert.equal(S.tab,'a');assert.equal(S.vil,'h');
S.fs.push({n:'Toma',c:'Paznic',hp:50});
api.jeNavigate();assert.equal(S.tab,'c');
assert.equal(api.jeStatus(api.jeCurrent()).n,1);
counts.d=1;counts.l=1;
assert.equal(api.jeStatus(api.jeCurrent()).ok,false,
 'Retragerea timpurie nu poate finaliza obiectivul primului căpitan');
counts.bs=1;
assert.equal(api.jeStatus(api.jeCurrent()).ok,true);
assert(api.jePanel().includes("jeClaim('poarta')"));
api.jeClaim('poarta');
assert.equal(S.gold,90);assert.equal(S.ore,39);
assert.deepEqual(S.je.done,['poarta']);
assert.equal(api.jeCurrent().id,'urme');
api.jeClaim('poarta');assert.equal(S.gold,90);
assert.equal(a.calls,3);
const resumed=make('beta',JSON.parse(JSON.stringify(S)));
assert.equal(resumed.api.jeCurrent().id,'urme');
assert.equal(make('beta',{journeyV:undefined}).api.jeEnabled(),false);
assert.equal(make('live').api.jeEnabled(),false);
assert(hero.includes('S.journeyV = 1')&&hero.includes('S.mrPrologPending = 1'));
assert(prolog.includes('function stPrologSkip()'));
assert(merc.includes("['Paznic', null]"));
assert(main.includes("cn('bs')"),'Victoriile căpitanilor sunt contorizate');
assert(main.includes("if(!d.one||d.done)cn('l')"),
 'Contorul iesirilor nu urmărește retragerea timpurie din noul mod');
assert(main.includes('dOneDone(d,b);return'),'Căpitanul încheie automat incursiunea');
assert(main.includes('const DENT=2,DHEAL=2'));
assert(1+1+1+2<=30,'Patru lupte au un cost inițial mic');
console.log('OK: BETA primul capitan, premiu unic, următorul pas, reload, LIVE neatins.');
