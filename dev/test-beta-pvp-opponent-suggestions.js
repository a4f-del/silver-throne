/* BETA step 23 — recommend attackable opponents by the World ghost power.
 * node dev/test-beta-pvp-opponent-suggestions.js */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const source=read('lume.js'),index=read('index.html');new Function(source);
function slice(start,end) {
 const i=source.indexOf(start),j=source.indexOf(end,i+start.length);
 assert(i>=0&&j>i,'Missing source '+start);return source.slice(i,j);
}
const fn=slice('function lwRecommendedOpponents(){','function lwSelPanel() {');
function make(server='beta'){
 const S={lvl:20,fs:[{hp:100}],d:null,wr:{cur:null}};
 const LUME={off:0,busy:false,st:{me:{user_id:'me'},cfg:{min_level:5},players:[]}};
 let attacks=18;
 const tEsc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const lwCan=p=>{
   if(p.id===LUME.st.me.user_id)return {ok:false};
   if(S.lvl<5||p.level<5||p.cd&&p.cd>1000||attacks<1||S.d)return {ok:false};
   return {ok:true};
 };
 const args={ST_SERVER:server,LUME,S,TT:{power:units=>units.reduce((s,u)=>s+u.p,0)},
  tronTeamUnits:()=>[{p:100},{p:50},{p:50}],lwCan,
  lwNum:n=>Math.round(n).toLocaleString('ro-RO'),tEsc};
 const factory=new Function(...Object.keys(args),fn+';return {lwRecommendedOpponents,lwRecommendedPanel};');
 return {S,LUME,api:factory(...Object.values(args)),setAttacks:n=>attacks=n};
}
const x=make(),live=make('live');
const players=[
 {id:'me',name:'Eu',power:200,level:20},
 {id:'p1',name:'Aproape',power:205,level:20},
 {id:'p2',name:'În apropiere',power:211,level:22},
 {id:'p3',name:'Mai tare',power:310,level:24},
 {id:'p4',name:'Mult mai slab',power:15,level:17},
 {id:'young',name:'Protejat',power:201,level:4},
 {id:'cool',name:'Cooldown',power:199,level:20,cd:1200},
 {id:'bad',name:'Fără putere',power:0,level:20},
 {id:'x&quot;onclick',name:'Caz special',power:99999,level:20}
];
x.LUME.st.players=players;live.LUME.st.players=players;
assert.deepEqual(x.api.lwRecommendedOpponents().map(p=>p.id),['p1','p2','p3'],
 'Rank by actual 3-unit World ghost power, excluding cooldown and protected targets');
let html=x.api.lwRecommendedPanel();
assert(html.includes('Fantoma ta din Lume (maximum 3 luptători): 200 putere'));
assert(html.includes('nu garantează victoria'));
assert(html.includes('Protecția începătorilor'));
assert(!html.includes('Protejat</b>')&&!html.includes('Cooldown</b>'));
assert.equal((html.match(/class="lw-rec-row"/g)||[]).length,3);
assert(html.includes('lwShow(&quot;p1&quot;)'),'IDs are safely encoded into HTML onclick');
x.LUME.st.players=[players[0],players[8]];
html=x.api.lwRecommendedPanel();
assert(!html.includes('onclick="lwShow("'),'No unencoded literal onclick IDs');
assert(html.includes('lwShow(&quot;x&amp;quot;onclick&quot;)'),'HTML encoding of unusual IDs is preserved');
assert.equal(live.api.lwRecommendedPanel(),'','No LIVE UI changes');
assert.deepEqual(live.api.lwRecommendedOpponents(),[],'No LIVE recommendations');
x.LUME.st.players=players;x.setAttacks(0);
assert.equal(x.api.lwRecommendedOpponents().length,0,'No attacks means no recommendations');
assert(x.api.lwRecommendedPanel().includes('Nu există momentan'));
x.setAttacks(18);x.S.d={f:{}};
assert.equal(x.api.lwRecommendedOpponents().length,0,'Never recommend attacks while in combat');
assert(index.includes('lume.js?v=2026.11.08-3'),'New asset version is referenced');
console.log('OK: power-ranked attackable opponents, beginner/cooldown/energy/combat protection, safe HTML, LIVE isolation.');
