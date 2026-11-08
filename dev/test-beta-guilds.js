/* BETA Bresle: flux local, rapoarte, model de afisare,
 * verificari statice ale SQL. Rulare: node dev/test-beta-guilds.js
 * Nu trimite cereri si nu modifica date reale. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const code=read('bresle.js'),index=read('index.html'),cont=read('cont.js'),
 sql=read('supabase/14-beta-guilds.sql'),css=read('bresle.css');
new Function(code);new Function(cont);
for(const m of index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))if(m[1].trim())new Function(m[1]);
assert(index.includes('bresle.js?v=')&&index.includes('bresle.css?v='),'script si stil BETA');
assert(index.includes("typeof guildTrackWin==='function'")&&index.includes("guildTrackWin(d,b)"),'victoriile ajung la bresle');
assert(cont.includes('guildStart()'),'se porneste dupa conectare');
assert(read('beta-compact-ui.js').includes("typeof guildHeader === 'function'"),'butonul Bresle');

const saved={fs:[{n:'Eroul',hp:100}],tab:'c',gold:100,pts:20,tw:{best:9}};
const snapshot=JSON.stringify(saved);let calls=[],saveCount=0;
let ST_SERVER='beta',g={id:1,name:'Ordinul',tag:'ORD',code:'F12AB345',week:'2026-11-02',member_count:1,role:'leader',marks:0,
 members:[{name:'Eroul',role:'leader',dungeons:0,hard_boss:0,tower:0,hits:0}]};
const state={guild:g,guilds:[{id:1,name:'Ordinul',tag:'ORD',count:1}],
 contract:{dungeons:0,hard_boss:0,tower:0,personal:{dungeons:0,hard_boss:0,tower:0,boss_hits:0},claimed:{}},
 boss:{hp:36000,max:36000,counter:'Vraci',hits_today:0,personal_damage:0}};
const host={innerHTML:''};
const ctx={ST_SERVER,CONT:{booted:true,user:{id:'player1'}},S:saved,
 document:{head:null,getElementById:id=>id==='guild-view'?host:null},
 tronRpc:async(fn,arg)=>{calls.push([fn,arg]);return {data:state}},
 setInterval:()=>1,clearInterval:()=>{},setTimeout:()=>{},
 save:()=>{saveCount++},hdr:()=>{},confirm:()=>true,
 crypto:{randomUUID:(()=>{let n=0;return ()=>'00000000-0000-4000-8000-'+String(++n).padStart(12,'0')})()}
};
const api=new Function(...Object.keys(ctx),code+
 ';return {GUILD,guildEnabled,guildHeader,guildPaint,guildBar,guildTrackWin,guildFlush,guildStart,guildSync,guildAction};')(...Object.values(ctx));
assert.equal(api.guildEnabled(),true);
api.GUILD.state=state;
api.guildPaint();
assert(host.innerHTML.includes('Contractul săptămânii'),'afiseaza contractul');
assert(host.innerHTML.includes('Căpitanul de breaslă'),'afiseaza bossul');
assert(host.innerHTML.includes('36.000')===false,'valorile nu necesita format local');
assert(host.innerHTML.includes('36000 / 36000'),'bara bossului');
assert(host.innerHTML.includes('F12AB345'),'codul de invitatie apare doar membrilor');
assert(api.guildHeader().includes('ORD'),'sigla breslei in antet');
api.guildTrackWin({one:1,tw:0,raid:null,tier:1,ev:0},true);
assert.equal(saved.guildEvents.length,2,'victorie temnita + capitan Greu = doua obiective');
assert.equal(saved.guildEvents[0].kind,'dungeon');
assert.equal(saved.guildEvents[1].kind,'hard_boss');
api.GUILD.preview=true;
api.guildTrackWin({one:1,tw:0,raid:null,tier:1,ev:0},true);
assert.equal(saved.guildEvents.length,2,'luptele simulate pentru calculul sanselor nu genereaza progres');
api.GUILD.preview=false;
api.guildTrackWin({tw:1,one:0},false);
assert.equal(saved.guildEvents.length,3,'etajul Turnului este contorizat');
api.guildTrackWin({raid:2,one:0,tw:0},false);
assert.equal(saved.guildEvents.length,3,'raidurile vechi nu se contorizeaza');
(async()=>{
 await api.guildFlush();
 assert.equal(saved.guildEvents.length,0,'evenimente raportate si scoase din coada');
 assert.equal(calls.filter(x=>x[1].p_action==='report').length,3,'un RPC per eveniment unic');
 assert(calls.filter(x=>x[1].p_action==='report').every(x=>x[1].p_data.week==='2026-11-02'),'saptamana evenimentelor');
 assert.equal(JSON.stringify({...saved,guildEvents:undefined}).replace(',"guildEvents":undefined',''),snapshot,'nu se schimba resursele si echipa');
 assert(saveCount>=1,'coada confirmata se salveaza');
 const oldEventCount=calls.length;ctx.S.guildEvents=[{id:'00000000-0000-4000-8000-000000000111',kind:'tower',week:'2026-10-26',gid:1}];
 api.guildTrackWin({tw:0,one:0},false);
 await api.guildFlush();
 assert.equal(calls.length,oldEventCount,'evenimentul din saptamana veche nu este raportat');
 assert.equal(ctx.S.guildEvents.length,0);
 api.GUILD.state={guild:null,guilds:[]};
 api.guildPaint();
 assert(host.innerHTML.includes('Creează o breaslă'),'afiseaza crearea cand nu e membru');
 assert(!host.innerHTML.includes('F12AB345'),'nu arata codul altor bresle');
 for(const n of ['guilds','guild_members','guild_weeks','guild_participation','guild_events','guild_boss_hits'])
  assert(sql.includes('ALTER TABLE public.'+n+' ENABLE ROW LEVEL SECURITY'),'RLS '+n);
 assert(sql.includes('public.is_beta_admin()'),'RPC verificat admin BETA');
 assert(sql.includes('REVOKE ALL ON FUNCTION public.guild_api'),'RPC inchis pentru public');
 assert(sql.includes('GRANT EXECUTE ON FUNCTION public.guild_api(text,jsonb) TO authenticated'),'RPC pentru conturi autentificate');
 assert(sql.includes("v_daily>=2"),'doua incercari boss pe zi');
 assert(sql.includes('boss_max')&&sql.includes('v_members'),'viata bossului se scaleaza');
 assert(sql.includes("hard_boss'")&&sql.includes("150*v_threshold")&&sql.includes("1000*v_threshold"),'obiective si praguri');
 assert(sql.includes('ON CONFLICT DO NOTHING'),'evenimente deduplicate');
 assert(!sql.includes('REVOKE ALL ON ALL SEQUENCES IN SCHEMA'),'nu afecteaza alte sisteme');
 assert(css.includes('@media(max-width:530px)'),'interfata mobil');
 console.log('OK: bresle BETA, 3 obiective, boss, deduplicare, limitare, RPC securizat.');
})().catch(e=>{console.error(e);process.exitCode=1});
