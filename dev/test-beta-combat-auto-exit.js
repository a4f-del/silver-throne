/* Silver Throne BETA — completed combat closes without manual Exit except Tower.
 * Run: node dev/test-beta-combat-auto-exit.js
 * Executable helper model and flow assertions (not browser/Supabase integration).
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('index.html'),tron=read('tron.js'),world=read('lume.js'),fx=read('fx.js');
const start=html.indexOf('function betaFinishCompletedBattle(){');
const end=html.indexOf('\nfunction opt(',start);
assert(start>0&&end>start,'BETA cleanup helper exists');
const source=html.slice(start,end);
assert(html.includes('function leave(skipGo){'),'Explicit no-recursion option on original reward settlement');
assert(html.includes("if(d.xm)S.msg+=' '+d.xm;if(!skipGo)go()}"),'Manual Exit behavior preserved');
assert(html.includes('loginChk();betaFinishCompletedBattle();tronCheck();lumeCheck();terBack();'),
  'Settle rewards before result reporting and return to source tab');
assert(html.includes("if(S.d&&S.d.done&&!S.d.tw&&!S.d.f&&S.d.raid!=null){go();return}"),
  'Resume completed raid after reloading game, without double credit');
assert(tron.includes('function tronDuelRestore()'),'Tron restores original 4-player party');
assert(tron.includes('if (!TRON.rep) tronReport(t.cur)'),'Tron reports pending results');
assert(world.includes('if (S.wr.cur && S.wr.cur.id === c.id) S.wr.cur = null'),'World clears only server-confirmed results');
assert(fx.includes('fxPlay(FX.q.slice(q0), go, first, q0);'),'Auto-combat callback runs after animation');
assert(fx.includes('function fxPlayNew(cb)'),'Manual-combat callback remains supported');
assert(html.includes('if(d.one&&!d.tw){dOneDone(d,b);return}'),'Dungeon already auto-settles');
assert(html.includes('if(d.tw&&typeof twWin'),'Tower is separate');
function run(server,d,additional={}){
 const S={d,tron:{cur:{id:9,win:false}},msg:'Rezultat anterior',...additional};
 let leaves=0,skips=[],reward=0;
 const leave=skipGo=>{leaves++;skips.push(skipGo);reward+=10;S.d=null;S.msg='Pradă: 10 aur și XP.';};
 const fn=new Function('S','leave',source+';return betaFinishCompletedBattle;')(S,leave);
 return {S,fn,get leaves(){return leaves},get skips(){return skips},get reward(){return reward}};
}
const completed={raid:-3,tron:1,done:true,f:null,loot:{gold:10,ore:0,xp:0,m:{}}};
let x=run('beta',{...completed});
assert.equal(x.fn(),true,'Tron BETA win auto-exits');
assert.equal(x.leaves,1);
assert.deepEqual(x.skips,[true],'Avoid nested go');
assert.equal(x.S.tron.cur.win,true,'Mark server result as win before clearing S.d');
assert.match(x.S.msg,/Tronului/);
assert.equal(x.S.tab,'r','Old Tron saves without return context go back to Tron');
assert.equal(x.fn(),false,'No duplicate settlement');
assert.equal(x.leaves,1,'Retry does not grant loot twice');
x=run('beta',{...completed,raid:-4,lume:1,tron:0,cm:'Ai învins satul.'});
assert.equal(x.fn(),true,'World win auto exits');
assert.match(x.S.msg,/Ai învins satul/);
assert.equal(x.S.tab,'m','Old World saves without return context go back to map');
assert.equal(x.leaves,1);
x=run('beta',{...completed,tron:1,raid:-3},{rt:{t:'r'}});
assert.equal(x.fn(),true,'Existing return context kept intact');
assert.equal(x.S.tab,undefined,'terBack retains control when return context exists');
x=run('beta',{...completed,raid:23,lume:0,tron:0});
assert.equal(x.fn(),true,'Other completed raids auto exit');
x=run('beta',{...completed,tw:1});
assert.equal(x.fn(),false,'Tower requires manual exit');
assert.equal(x.leaves,0);
x=run('beta',{...completed,one:1});
assert.equal(x.fn(),false,'Dungeon uses its existing immediate payout');
x=run('beta',{...completed,done:false});
assert.equal(x.fn(),false,'Never exit an unfinished fight');
x=run('beta',{...completed,f:{es:[{hp:0}]}});
assert.equal(x.fn(),false,'Never exit before finish callback clears encounter');
x=run('beta',null);
assert.equal(x.fn(),false,'No active battle to settle');
console.log('OK: completed PvP/Tron/world raids auto-settle once, Tower stays manual; dungeon unchanged.');
