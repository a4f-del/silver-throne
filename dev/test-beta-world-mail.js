/* Silver Throne: teste mesagerie BETA fără conectare la Supabase.
 * node dev/test-beta-world-mail.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const js=fs.readFileSync(path.join(__dirname,'../world-mail.js'),'utf8');
const mapMenu=fs.readFileSync(path.join(__dirname,'../lume-quick.js'),'utf8');
const sql=fs.readFileSync(path.join(__dirname,'../supabase/11-beta-world-mail.sql'),'utf8');
function make(server='beta') {
 const dom=new Map();
 const document={
  head:{appendChild(){}},body:{appendChild(e){dom.set(e.id,e)}},
  getElementById(id){return dom.get(id)||null},
  createElement(){let id='';return{get id(){return id},set id(v){id=v},setAttribute(){},
   set innerHTML(v){this.html=v},get innerHTML(){return this.html},
   querySelector(){return {focus(){}}},remove(){dom.delete(id)}}}
 };
 const replies=[];let calls=0;let h=0;
 const ctx={ST_SERVER:server,CONT:{booted:true,user:{id:'a'}},document,
  LUME:{st:{players:[{id:'b',name:'Bela'}]}},
  tronRpc:async(fn,args)=>{calls++;replies.push([fn,args]);
   if(fn==='world_mail_inbox')return {data:{unread:1,messages:[{id:1,from_id:'b',from:'Bela',
     body:'<img src=x onerror=alert(1)>',at:Date.now(),read:false}]}};
   return {data:{ok:true}};},
  Date,setTimeout(){},setInterval(){return 1},clearInterval(){},console,
  hdr(){h++}};
 vm.createContext(ctx);vm.runInContext(js,ctx);
 return {ctx,dom,replies,get calls(){return calls},get hdr(){return h}};
}
(async()=>{
 const x=make();
 assert(vm.runInContext('wmAuth()',x.ctx));assert.equal(vm.runInContext('wmEsc("<b>")',x.ctx),'&lt;b&gt;');
 await vm.runInContext('wmSync(true)',x.ctx);
 assert.equal(vm.runInContext('WM.unread',x.ctx),1);
 assert.equal(x.replies[0][0],'world_mail_inbox');
 vm.runInContext('wmOpen()',x.ctx);
 assert(x.dom.get('wm-overlay'));
 vm.runInContext('wmView(1)',x.ctx);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(vm.runInContext('WM.unread',x.ctx),0);
 assert(x.replies.some(([fn,args])=>fn==='world_mail_read'&&args.p_id===1));
 vm.runInContext('wmReply(1)',x.ctx);
 assert.equal(vm.runInContext('WM.recipient',x.ctx),'b');
 assert(x.dom.get('wm-overlay').html.includes('Mesaj către Bela'));
 const live=make('live');
 assert.equal(vm.runInContext('wmAuth()',live.ctx),false);
 vm.runInContext('wmOpen();wmCompose("b","Bela");wmStart()',live.ctx);
 assert.equal(live.calls,0,'LIVE: nu exista apeluri la mesagerie');
 assert(!live.dom.has('wm-overlay'),'LIVE: niciun dialog');
 assert(mapMenu.includes("wmCompose(p.id,p.name)"),'iconita de pe harta e conectata');
 assert(sql.includes("recipient_id=v_uid"),'inboxul este filtrat pe destinatar');
 assert(sql.includes("WHERE id=p_id AND recipient_id=v_uid"),'citirea este autorizata');
 assert(sql.includes("sender_id = v_uid"),'limite pe expeditor');
 assert(sql.includes("pg_advisory_xact_lock"),'anti-spam serializat');
 assert(sql.includes("REVOKE ALL ON TABLE public.world_mail"),'fara acces direct la tabela');
 assert(sql.includes("public.is_beta_admin()"),'acces doar pe proiectul BETA');
 console.log('OK: inbox, citire, raspuns, escape HTML, protectie LIVE, reguli SQL.');
})().catch(err=>{console.error(err);process.exitCode=1});
