/* Silver Throne friends BETA — regressions without contacting Supabase.
   Run: node dev/test-beta-world-friends.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const js=fs.readFileSync(path.join(__dirname,'../world-friends.js'),'utf8');
const sql=fs.readFileSync(path.join(__dirname,'../supabase/12-beta-world-friends.sql'),'utf8');
function setup(server='beta'){
 const map=new Map(),calls=[];let list=[{id:10,user_id:'b',name:'Ilinca',direction:'incoming',status:'pending',at:1}];
 let requests=1,heads=0;
 const document={
  head:{appendChild(){}},body:{appendChild(e){map.set(e.id,e)}},
  getElementById:id=>map.get(id)||null,
  createElement(){let id='',html='';return {
   get id(){return id},set id(v){id=v},
   get innerHTML(){return html},set innerHTML(v){html=v},
   setAttribute(){},querySelector(){return {focus(){}}},remove(){map.delete(id)}
  }}
 };
 const ctx={ST_SERVER:server,CONT:{booted:true,user:{id:'a'}},document,console,
  tronRpc:async(fn,args)=>{
   calls.push({fn,args});
   if(fn==='world_friends_list')return {data:{requests,items:list.map(x=>({...x}))}};
   if(fn==='world_friends_respond'){
    if(args.p_id===10){requests=0;list[0].status=args.p_accept?'accepted':'declined';}
   }
   if(fn==='world_friends_remove')list=list.filter(x=>x.id!==args.p_id);
   if(fn==='world_friends_request'){list.push({id:11,user_id:args.p_target,name:'Radu',direction:'outgoing',status:'pending',at:2});}
   return {data:{ok:true}};
  },
  setTimeout(){},setInterval(){return 1},clearInterval(){},
  hdr(){heads++},render(){},S:{msg:''},LUME:{st:{players:[]}},wmCompose(){},lwProfile(){}};
 vm.createContext(ctx);vm.runInContext(js,ctx);
 return {ctx,calls,map,heads:()=>heads,getList:()=>list,eval:s=>vm.runInContext(s,ctx)};
}
(async()=>{
 const b=setup();
 assert(b.eval('wfEnabled()'),'BETA logged in');
 assert.equal(b.eval("wfEscape('<b>')"),'&lt;b&gt;');
 assert.equal(b.eval('wfProfileButton("a")'),'','no self friend request');
 assert(b.eval('wfProfileButton("b")').includes('Adaugă prieten'));
 await b.eval('wfSync(true)');
 assert.equal(b.eval('WF.requests'),1);
 assert(b.eval('wfHeader()').includes('1'));
 assert(b.eval('wfProfileButton("b")').includes('Răspunde cererii'));
 b.eval('wfOpen()');
 assert(b.map.get('wf-overlay').innerHTML.includes('wf-list'));
 await b.eval('wfRespond(10,true)');
 assert(b.calls.some(c=>c.fn==='world_friends_respond'&&c.args.p_id===10&&c.args.p_accept===true));
 assert.equal(b.eval('WF.requests'),0);
 assert(b.eval('wfProfileButton("b")').includes('Prieteni'));
 await b.eval('wfRemove(10)');
 assert.equal(b.eval('WF.items.length'),0);
 await b.eval('wfRequest("c")');
 assert(b.calls.some(c=>c.fn==='world_friends_request'&&c.args.p_target==='c'));
 assert(b.eval('wfProfileButton("c")').includes('Cerere trimisă'));
 b.eval('wfStart()');assert(b.heads()>0);
 const live=setup('live');
 assert.equal(live.eval('wfEnabled()'),false);
 live.eval('wfOpen();wfStart()');
 await live.eval('wfRequest("b")');
 assert(!live.calls.length,'LIVE must never request friends RPC');
 assert(!live.map.has('wf-overlay'),'LIVE no friends UI');
 assert(sql.includes('ENABLE ROW LEVEL SECURITY'));
 assert(sql.includes('REVOKE ALL ON TABLE public.world_friends'));
 assert(sql.includes('public.is_beta_admin()'));
 assert(sql.includes('LEAST(sender_id,recipient_id)')&&sql.includes('GREATEST(sender_id,recipient_id)'));
 assert(sql.includes("recipient_id=v_uid AND status='pending'"),'only recipient accepts');
 assert(sql.includes('sender_id=v_uid'), 'cancel outgoing authorization');
 console.log('OK: requests, approval, rejection, removal, escaping, LIVE isolation, SQL safety.');
})().catch(e=>{console.error(e);process.exitCode=1});
