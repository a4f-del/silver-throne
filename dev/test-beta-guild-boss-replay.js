/* BETA: replay-ul atacului boss foloseste doar damage confirmat de server.
 * node dev/test-beta-guild-boss-replay.js */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','bresle.js'),'utf8');
const schema=fs.readFileSync(path.join(__dirname,'..','supabase','14-beta-guilds.sql'),'utf8');
let frames,playing=0,domRemoved=false;
const S={fs:[{n:'Eroul',h:1,c:'Campion',hp:80}],d:null,gold:300,pts:12};
const FX={cast:{old:1},q:[{old:1}],playing:false},before=JSON.stringify(S);
const ctx={ST_SERVER:'beta',S,FX,CONT:{booted:true,user:{id:'one'},admin:true},
 acFxMarkup:()=>'',fxPlay:(f,cb,first,offset)=>{playing++;frames=f;
   assert.equal(FX.cast.adventure,true);
   assert.equal(FX.cast.es[0].hp,30000);
   assert.equal(first,true);assert.equal(offset,0);cb();},
 tmnBoss:()=>['boss-portrait','#ff4400'],DG:[{bn:'Căpitanul'}],mhp:()=>100,
 document:{head:null},setTimeout:()=>{},save:()=>{}};
const names=Object.keys(ctx),vals=Object.values(ctx);
const replay=new Function(...names,src+';return guildBossReplay;')(...vals);
replay({hp:30000,max:36000},{hp:25500,max:36000},4500);
assert.equal(playing,1,'o animatie la atacul confirmat');
assert.equal(frames.length,1);
assert.equal(frames[0].es[0].v,-4500,'dauna vizuala este cea server');
assert.deepEqual(FX.cast,{old:1},'cast anterior restaurat');
assert.deepEqual(FX.q,[{old:1}],'coada FX restaurata');
assert.equal(JSON.stringify(S),before,'niciun HP, punct sau aur schimbat in client');
assert(schema.includes("'ability',CASE mod")&&schema.includes("'poison'")&&schema.includes("'storm'")&&schema.includes("'wave'"),
 'boss are abilitate saptamanala ca in trepte.js');
assert(schema.includes("w.seen_at>=now()-interval '7 days'"),'HP se scaleaza dupa membrii activi');
console.log('OK: atac boss confirmat server, abilitate, HP comun, cast restaurat.');
