/* Silver Throne BETA — diagnostic Tron journal in LUPTE and combat result safety.
 * node dev/test-beta-throne-journal-export.js
 * No database, player save files, or network access.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const history=read('istoric.js'),game=read('index.html'),tron=read('tron.js');
new Function(history);
assert(game.includes('istoric.js?v=2026.11.08-2'),'New history script loaded');
assert(history.includes("b.k === 't'"),'Export button only on BETA Tron journals');
assert(history.includes("typeof ST_SERVER !== 'undefined' && ST_SERVER === 'beta'"),'No LIVE UI edits');
assert(history.includes('Number.isSafeInteger(id)'), 'Valid challenge ID required');
assert(history.includes('navigator.clipboard.writeText(content)'), 'User-initiated clipboard copy');
assert(history.includes('window.prompt('), 'Manual copy fallback');

function sandbox(server='beta', withId=true){
 const S={bh:[],tron:{cur:withId?{id:28,win:true}:null}};
 let modal='',copied='',prompt='';
 const navigator={clipboard:{writeText:async value=>{copied=value}}};
 const window={prompt:(label,value)=>{prompt=value}};
 const ui=new Function('S','ST_SERVER','tEsc','mdl','document','navigator','window',
    history+';return {bhAdd,bhExport,bhOpen,bhCopy};'
 )(S,server,x=>String(x),(body)=>{modal=body},undefined,navigator,window);
 return {S,ui,navigator,window,get modal(){return modal},get copied(){return copied},get prompt(){return prompt}};
}
(async()=>{
 let x=sandbox();
 const fight={tron:1,bn:'Regele BETA',loot:{gold:0,ore:0,xp:0,m:{}},
   hl:['— Lupta —','Inițiativa duelului: regele atacă primul!','Lovitură critică!',
      'Campionul lovește Regele (-936).','Regele sângerează.','Victorie.']};
 x.ui.bhAdd(fight,'win',0);
 assert.equal(x.S.bh.length,1,'One local fight log');
 assert.equal(x.S.bh[0].cid,28,'Link only this saved journal to the challenge');
 assert.equal(x.S.bh[0].k,'t');
 assert.equal(x.S.bh[0].res,'win');
 assert.equal(x.S.bh[0].log.length,6);
 x.ui.bhAdd(fight,'win',0);
 assert.equal(x.S.bh.length,1,'History append idempotent');
 const data=x.ui.bhExport(0);
 assert(data.includes('Provocare Tron #28'),'Export correlates to SQL audit');
 assert(data.includes('Inițiativa duelului:'),'Initiative retained');
 assert(data.includes('Lovitură critică!'),'Critical retained');
 assert(data.includes('sângerează.'),'Bleeding retained');
 assert(data.includes('jurnal local (nevalidat de server)'),
    'Never present client log as server-verified');
 x.ui.bhOpen();
 assert(x.modal.includes('Copiază jurnalul'),'Copy control is inside LUPTE');
 assert(x.modal.includes('Provocare #28'),'Challenge ID appears on historic fight');
 assert(!x.modal.includes('window.location'),'No navigation away from LUPTE');
 const btn={isConnected:true,textContent:'Copiază jurnalul'};
 await x.ui.bhCopy(0,btn);
 assert.equal(x.copied,data,'Actual clipboard body equals exported data');
 assert.equal(btn.textContent,'✓ Jurnal copiat','User sees successful copy');
 assert.equal(x.ui.bhExport(99),'','Out-of-range does not leak data');

 x=sandbox('beta',false);
 x.ui.bhAdd({tron:1,bn:'Regele',loot:{m:{}},hl:['Luptă veche']},'lost',0);
 assert(!('cid' in x.S.bh[0]),'Old fights do not invent challenge ID');
 assert(x.ui.bhExport(0).includes('Rezultat local: Înfrângere'));
 assert(!x.ui.bhExport(0).includes('Provocare Tron #'));
 x.navigator.clipboard.writeText=async()=>{throw new Error('blocked')};
 await x.ui.bhCopy(0);
 assert(x.prompt.includes('Luptă veche'),'Copy fallback works when permissions blocked');

 x=sandbox('live');
 x.ui.bhAdd({tron:1,bn:'Rege',loot:{m:{}},hl:['Luptă']},'win',0);
 assert(!('cid' in x.S.bh[0]),'LIVE data format preserved');
 x.ui.bhOpen();
 assert(!x.modal.includes('Copiază jurnalul'),'LIVE interface untouched');

 // A real combat defeat clears the active fight and leaves win=false;
 // a completed victory is the only ordinary path that sets it to true.
 const enemy=game.slice(game.indexOf('function enemy(){'),game.indexOf('\nfunction win(',game.indexOf('function enemy(){')));
 assert(enemy.includes('S.d=null'),'On defeat game clears battle instead of setting done');
 assert(enemy.includes("bhAdd(S.d,'lost'"),'On defeat local history is explicitly lost');
 assert(!enemy.includes('S.tron.cur.win=true'),'Defeat never sets Tron win');
 const win=game.slice(game.indexOf('function win(q){'),game.indexOf('\nfunction flee()',game.indexOf('function win(q){')));
 assert(win.includes('d.done=true'),'Only enemy-death branch completes the battle');
 const check=tron.slice(tron.indexOf('function tronCheck() {'),tron.indexOf('/* BETA SQL33:',tron.indexOf('function tronCheck() {')));
 assert(check.includes('if (!S.d.done) return'),'Tron result respects completed duel');
 const S={tron:{cur:{id:28,win:false}},d:null};
 const calls=[];const t=new Function('S','TRON','tronDuelRestore','tronReport',
    check+';return tronCheck;')(S,{rep:false},()=>{},cur=>calls.push(cur.win));
 t();
 assert.deepEqual(calls,[false],'Defeat reports loss rather than victory');
 S.d={tron:1,done:false};calls.length=0;t();assert.equal(calls.length,0,'Active battle not reported');
 S.d={tron:1,done:true};t();assert.deepEqual(calls,[true],'Completed victory reports win');
 console.log('OK: BETA journal copy/id/clipboard and defeat/ongoing/victory reporting; LIVE unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1});
