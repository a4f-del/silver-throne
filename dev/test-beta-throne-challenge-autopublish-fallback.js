/* Silver Throne BETA: Throne challenge must not be blocked by
   a failed background defense publication. LIVE remains unchanged.
   Run: node dev/test-beta-throne-challenge-autopublish-fallback.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const client=read('tron.js'),index=read('index.html');
const begin=client.indexOf('async function tronProvoca() {');
const end=client.indexOf('function tronFight(',begin);
assert(begin>0&&end>begin,'Tron challenge function exists');
const body=client.slice(begin,end);
assert(body.includes('if (!published && !beta)'), 'BETA challenge cannot be gated on publishing');
assert(body.includes("tronRpc('throne_challenge_start')"),'Backend decides whether challenger is allowed');
assert(body.includes('TRON.pubError'), 'Server errors exposed when publish fails');
assert(index.includes('tron.js?v=2026.11.08-3'), 'Client cache must be refreshed');

async function attempt(server,publishOk,rpcError=null) {
 const TRON={busy:false,pubError:'Statistici respinse'};
 const S={fs:[{h:true,hp:100}],tron:{cur:null},d:null,msg:''};
 let battle=0,request=0,renders=0;
 const opts={TT:{CFG:{minLevel:10}},TRON,S,tronInit:()=>{},tronIsBetaDuel:()=>server==='beta',
   tronAutoPublishNow:async()=>publishOk,tronPublish:async()=>publishOk,
   tronRpc:async(name)=>{assert.equal(name,'throne_challenge_start');request++;return rpcError?{error:rpcError}:{data:{id:71}};},
   tronFight:()=>{battle++;S.d={tron:true}},tronSync:async()=>{},go:()=>{renders++}};
 const call=new Function(...Object.keys(opts),body+';return tronProvoca;')(...Object.values(opts));
 await call();
 return {TRON,S,battle,request,renders};
}
(async()=>{
 let x=await attempt('beta',false);
 assert.equal(x.request,1,'Failed BETA background publish must not suppress server request');
 assert.equal(x.battle,1,'Server approval starts duel');
 assert.equal(x.S.tron.cur.id,71);
 x=await attempt('beta',false,'Regele trebuie să-și actualizeze apărarea');
 assert.equal(x.request,1);
 assert.equal(x.battle,0,'Server refusal prevents a battle');
 assert(x.S.msg.includes('Regele trebuie'),'Actual server refusal must be shown');
 x=await attempt('live',false);
 assert.equal(x.request,0,'LIVE retains blocking behavior');
 assert.equal(x.battle,0);
 x=await attempt('beta',true);
 assert.equal(x.battle,1);
 console.log('OK: BETA challenge allowed despite shadow publish failure, actual RPC errors shown; LIVE unchanged.');
})().catch(e=>{console.error(e);process.exitCode=1});
