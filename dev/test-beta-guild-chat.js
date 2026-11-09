/* Silver Throne BETA SQL42: chatul breslei.
 * Run: node dev/test-beta-guild-chat.js
 * Verificări statice pe SQL + modelul clientului (escapare, îmbinare, insignă). Fără scrieri în PostgreSQL. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/42-beta-guild-chat.sql');
const js=read('breasla-chat.js');
const html=read('index.html');

for(const marker of [
 'CREATE TABLE IF NOT EXISTS public.guild_chat_messages',
 'ALTER TABLE public.guild_chat_messages ENABLE ROW LEVEL SECURITY',
 'REVOKE ALL ON TABLE public.guild_chat_messages FROM PUBLIC,anon,authenticated',
 "SECURITY DEFINER SET search_path = ''",
 'v_uid IS NULL OR NOT public.is_beta_admin()',
 'SELECT * INTO v_me FROM public.guild_members WHERE user_id=v_uid',
 "interval '2 seconds'",
 ">=12",
 'char_length(body) BETWEEN 1 AND 300',
 "v_me.role IN ('leader','officer')",
 'v_msg.user_id<>v_uid AND NOT v_mod',
 'OFFSET 499 LIMIT 1',
 'GRANT EXECUTE ON FUNCTION public.guild_chat_api(text,jsonb) TO authenticated'
])assert(sql.includes(marker),'SQL42 missing '+marker);
// guild_id vine doar din guild_members, niciodată din p_data
assert(!/p_data->>'guild_id'/.test(sql),'Guild id is never taken from the browser');
assert(!/\b(?:DROP TABLE|TRUNCATE)\b/i.test(sql));
assert(!/public\.(?:game_saves|guild_members|guilds)\s+SET/i.test(sql),'Chat does not modify guilds or saves');
assert(html.includes('breasla-chat.js?v=')&&html.indexOf('breasla-chat.js')>html.indexOf('bresle.js'),'Chat loads after bresle.js');

// model client: rulăm modulul cu un DOM minim
const store={};
const ctx={console,Date,Math,Set,JSON,String,Number,Array,setTimeout:()=>0,setInterval:()=>0,clearInterval:()=>0,
 localStorage:{getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v}},
 document:{getElementById:()=>null,querySelectorAll:()=>[],hidden:false,head:null},
 guildEsc:s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
 GUILD:{state:{guild:{id:7}}},tronRpc:async()=>({data:{}})};
ctx.window=ctx;
vm.createContext(ctx);
vm.runInContext(js,ctx,{filename:'breasla-chat.js'});
const api=vm.runInContext('({GCH,gchMerge,gchListHtml})',ctx);
api.GCH.gid=7;
api.gchMerge({messages:[{id:1,author:'Vlad',body:'<img src=x onerror=alert(1)>',at:1,mine:false},{id:2,author:'Eu',body:'salut',at:2,mine:true,can_delete:true}],last_id:2},true);
const out=api.gchListHtml();
assert(!out.includes('<img'),'Message text is escaped');
assert(out.includes('&lt;img'),'Escaped text still visible');
assert(out.includes('gchDelete(2)')&&!out.includes('gchDelete(1)'),'Delete only where the server allows it');
assert.equal(api.GCH.unread,1,'Unread counts only messages from others');
api.gchMerge({messages:[{id:2,author:'Eu',body:'salut',at:2,mine:true},{id:3,author:'Ana',body:'hei',at:3}],last_id:3},false);
assert.equal(api.GCH.msgs.length,3,'Incremental merge does not duplicate messages');
assert.equal(api.GCH.last,3);
assert.equal(api.GCH.unread,2);
console.log('OK: guild chat SQL guards, escaping, merge and unread badge.');
