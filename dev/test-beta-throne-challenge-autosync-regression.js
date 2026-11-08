/* Silver Throne BETA: Throne attack must not be blocked by optional defense auto-sync.
 * Run: node dev/test-beta-throne-challenge-autosync-regression.js
 * Client-only stub regression; Supabase policies still run server-side. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const js=read('tron.js');
const index=read('index.html');
const begin=js.indexOf('async function tronProvoca() {');
const end=js.indexOf('\nfunction tronFight(',begin);
assert(begin>=0&&end>begin,'Throne challenge handler exists');
const block=js.slice(begin,end);
assert(block.includes('tronAutoPublishNow()'),'BETA auto-sync attempted before server challenge');
assert(block.includes('if (!published && !beta)'),'LIVE retains existing publish requirement');
assert(block.includes("'throne_challenge_start'"),'Server remains authoritative for challenge access');
assert(block.includes("'Tron: ' + r.error"),'Server refusal is displayed');
assert(js.includes("TRON.pubError = 'Sincronizarea apărării: ' + r.error"),'Auto-publication error recorded');
assert(index.includes('tron.js?v=2026.11.08-3'),'Updated asset cache');
assert(!/CREATE OR REPLACE FUNCTION public\.throne_/.test(js),'Client fix cannot change server functions');

function session({beta=true,publish=false,error=null,healthy=true}={}){
 const TRON={busy:false,pubError:'Sincronizarea apărării: respinsă',rep:false};
 const S={lvl:50,fs:[{h:true,hp:300,n:'Erou'}],tron:{cur:null},d:null,msg:''};
 const TT={CFG:{minLevel:10}};
 let publishCalls=0,rpcCalls=0,goCalls=0,fights=0,syncs=0;
 const c=new Function('S','TT','TRON','tronInit','tronIsBetaDuel','tronAutoPublishNow',
 'tronPublish','tronRpc','tronSync','tronFight','go',
 block+';return tronProvoca;')(
 S,TT,TRON,()=>{},()=>beta,
 async()=>{publishCalls++;return publish;},
 async()=>{publishCalls++;return publish;},
 async fn=>{assert.equal(fn,'throne_challenge_start');rpcCalls++;
  return error?{error}:{data:{id:42,ghost:null,holder_name:null}};},
 async()=>{syncs++;},()=>{fights++;S.d={tron:1};},()=>{goCalls++}
 );
 return {c,S,TRON,get publishCalls(){return publishCalls},get rpcCalls(){return rpcCalls},
  get fights(){return fights},get syncs(){return syncs},get goCalls(){return goCalls}};
}
(async()=>{
 let a=session({beta:true,publish:false});
 await a.c();
 assert.equal(a.rpcCalls,1,'BETA still asks the SERVER even when autosync fails');
 assert.equal(a.fights,1,'A server-approved challenge can start');
 assert.equal(a.S.tron.cur.id,42);
 a=session({beta:true,publish:false,error:'Pauză până mâine'});
 await a.c();
 assert.equal(a.rpcCalls,1,'Server call made before reporting failure');
 assert.equal(a.fights,0,'Server rejected challenge must not start combat');
 assert(a.S.msg.includes('Tron: Pauză până mâine'),'Real server reason visible');
 assert(a.S.msg.includes('Sincronizarea apărării'),'Secondary sync error visible');
 assert.equal(a.syncs,1,'Server state refreshes after rejection');
 assert.equal(a.TRON.busy,false,'Busy flag released on rejection');
 a=session({beta:false,publish:false});
 await a.c();
 assert.equal(a.rpcCalls,0,'LIVE still requires a successful publish');
 assert.equal(a.fights,0,'LIVE unchanged');
 a=session({beta:true,publish:true});
 await a.c();
 assert.equal(a.rpcCalls,1);assert.equal(a.fights,1);
 a=session({beta:true,publish:false});a.S.d={active:true};
 await a.c();
 assert.equal(a.rpcCalls,0,'Cannot challenge while in another fight');
 a=session({beta:true,publish:false});a.S.tron.cur={id:11};
 await a.c();
 assert.equal(a.rpcCalls,0,'Pending challenge result blocks another');
 console.log('OK: BETA Throne proceeds to server after autosync failure, shows real refusal; LIVE rules and in-fight gates preserved.');
})().catch(e=>{console.error(e);process.exitCode=1;});
