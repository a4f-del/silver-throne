/* Silver Throne BETA / pasul 33 / SQL36
 * node dev/test-beta-item-replay-model.js
 * JS parity model + SQL static security/catalogue checks, NO database or accounts. */
'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/36-beta-item-replay-model.sql');
const index=read('index.html');
const docs=read('docs/BETA-ITEM-REPLAY-STEP33.md');
const roadmap=read('docs/ROADMAP-EXPERIENTA-JUCATORULUI.md');
const sql35=read('supabase/35-beta-server-item-provenance-foundation.sql');
const section=(s,start,end)=>{
 const a=s.indexOf(start),b=s.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'Missing section '+start);return s.slice(a,b);
};
const defs=[
 section(index,'const RAR=', ';\nconst CL=')+';',
 section(index,'const BW=', ';\nconst PW=')+';',
 section(index,'const PW=', ';\nconst DR=')+';',
 section(index,'const WF=', ';\nconst WFC=')+';'
].join('\n');
const mk=section(index,'function mkItem(', '\n function panouStatistici');
let selectedSeed=0;
function ix(seed,salt,n){
 assert(Number.isSafeInteger(seed)&&seed>=0&&n>0);
 return crypto.createHash('md5').update(seed+':'+salt).digest().readUInt32BE(0)%n;
}
const P=array=>array[ix(selectedSeed,'name',array.length)];
const api=new Function('P','ST_SERVER',defs+'\n'+mk+
 ';return {mkItem,RAR,PW,PA,PJ,SF,WF,BA,BH,BB,BJ};')(P,'beta');
for(const key of ['PW','PA','PJ','SF']){
 const m=sql.match(new RegExp("WHEN '"+key+"' THEN '([^']+)'::jsonb"));
 assert(m,'Missing SQL catalogue '+key);
 assert.deepEqual(JSON.parse(m[1]),api[key],'SQL affixes match current game '+key);
}
const eligible=(arr,level)=>arr.filter(x=>(x.lv||1)<=level);
function calculate(t,l,r,q,template,seed){
 let mult=api.RAR[r].m*(1+.1*q),s={dmg:0,def:0,hp:0,bleed:0,crit:0,loot:0,heal:0,vd:0,pd:0,ph:0,pf:0};
 let name;
 if(t==='w'){
  const w=api.WF[template],x=typeof w.x==='function'?w.x(l):w.x;
  name=w.n;
  s.dmg=Math.round((2+l*1.4)*mult*w.m);
  for(const k in x)s[k]+=['def','hp','heal'].includes(k)?Math.round(x[k]*mult):x[k];
 }else{
  const names=t==='j'?api.BJ:t==='h'?api.BH:t==='b'?api.BB:api.BA;
  name=names[ix(seed,'name',names.length)];
  if(t==='j')s.hp=Math.round(2*l*mult);
  else if(t==='h'){s.def=Math.round((1+l*.4)*mult);s.hp=Math.round(2*l*mult);}
  else if(t==='b'){s.hp=Math.round(2.5*l*mult);s.def=Math.round((.5+l*.25)*mult);}
  else {s.def=Math.round((1+l*.7)*mult);s.hp=Math.round(3*l*mult);}
 }
 const mats=[];
 const add=affix=>{
  if(affix.m)mats.push(affix.m);
  for(const [k,val] of Object.entries(affix)){
   if(['n','m','lv'].includes(k))continue;
   const key=k==='vd'?'def':k,raw=k==='vd'?Math.max(1,Math.round(val/4)):val;
   s[key]+=['dmg','def','hp'].includes(key)?Math.round(raw*(1+l*.15)):raw;
  }
 };
 let prefix=null,suffix=null;
 if(r>=1){
  let arr=eligible(t==='w'?api.PW:t==='j'?api.PJ:api.PA,l);
  prefix=arr[ix(seed,'prefix',arr.length)];add(prefix);name=prefix.n+' '+name;
 }
 if(r>=2){
  const arr=eligible(api.SF,l);
  suffix=arr[ix(seed,'suffix',arr.length)];add(suffix);name+=' '+suffix.n;
 }
 const item={t,l,r,q,name,s,m:mats};if(t==='w')item.wf=template;
 return {item,prefix,suffix};
}
let count=0;
for(const t of ['w','a','h','b','j','r'])
 for(const template of (t==='w'?Object.keys(api.WF):[t]))
 for(const l of [1,5,10,20,40,80])
 for(const r of [0,1,2,3])
 for(const q of [0,1,3,4])
 for(const seed of [0,1,89]){
  selectedSeed=seed;
  const m=calculate(t,l,r,q,template,seed);
  const prefixList=t==='w'?api.PW:t==='j'?api.PJ:api.PA;
  const pi=m.prefix?prefixList.indexOf(m.prefix):0,si=m.suffix?api.SF.indexOf(m.suffix):0;
  const game=api.mkItem(t,l,r,pi,si,q,template);
  assert.deepEqual(m.item,game,
   'Model matches existing mkItem for '+[t,template,l,r,q,seed].join(':'));
  count++;
 }
assert(count>3000,'Cover classes and all rarities/levels/qualities');
assert.deepEqual(calculate('w',10,0,0,'sab',12).item.s.dmg,16);
for(const s of [
 'CREATE OR REPLACE FUNCTION public.beta_item_affix_catalog_v1(',
 'CREATE OR REPLACE FUNCTION public.beta_item_roll_index_v1(',
 'CREATE OR REPLACE FUNCTION public.beta_item_replay_model_v1(',
 'CREATE OR REPLACE FUNCTION public.beta_item_replay_receipt_v1(',
 "v_raw:=greatest(1,round(v_raw/4))",
 "round(v_raw*(1+p_level*.15))",
 "IF p_rarity>=1 THEN",
 "IF p_rarity>=2 THEN",
 'SECURITY DEFINER SET search_path=',
 "v_receipt.server_roll_seed",
 "to_regprocedure('public.beta_item_provenance_guard()')"
])assert(sql.includes(s),'SQL replay contract missing: '+s);
for(const fn of [
 'beta_item_affix_catalog_v1(text)',
 'beta_item_roll_index_v1(bigint,text,integer)',
 'beta_item_replay_model_v1(text,integer,integer,integer,text,bigint)',
 'beta_item_replay_receipt_v1(uuid)'
])assert(sql.includes('REVOKE ALL ON FUNCTION public.'+fn),
 'Function must never be directly callable by browser: '+fn);
assert(!/\b(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE)\s+public\.(?:game_saves|beta_item_provenance_receipts|beta_economy_ledger)/i.test(sql),
 'Replay must not mint or mutate game data');
assert(sql.includes('AS sql35_guard_preserved'),'Cannot silently remove provenance guard');
assert(sql35.includes('beta_item_provenance_event_unique'),'SQL35 idempotency remains');
assert(docs.includes('fără emitere de obiecte')&&docs.includes('nu este RNG criptografic'),
 'Do not claim issuance or competitive-proof randomness');
assert(roadmap.includes('SQL36'),'Roadmap status must mention this staged generator');
console.log('OK: SQL36 private seeded replay, catalogues and '+count+
 ' JavaScript item-parity fixtures (model/static only; PostgreSQL QA still needed).');
