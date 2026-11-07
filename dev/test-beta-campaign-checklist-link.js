/* Silver Throne BETA: campania se deschide la prima sarcină reală.
 * node dev/test-beta-campaign-checklist-link.js
 * Doar simulare JS, fără cont și fără scriere în Supabase. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const territory=read('teritorii.js'),journey=read('drumul-eroului.js'),
 story=read('poveste-misiuni.js'),index=read('index.html');
for(const src of [territory,journey,story])new Function(src);
for(const m of index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
assert(index.includes('teritorii.js?v=2026.11.07-20'));
assert(index.includes('poveste-misiuni.js?v=2026.11.07-11'));
assert(index.includes('drumul-eroului.js?v=2026.11.08-1'));
assert(journey.includes("cmpOpenChecklist(\\'journey\\')"),'new journey invokes focused navigation');
assert(story.includes("cmpOpenChecklist(\\'story\\')"),'older BETA story uses same navigation');
const start=territory.indexOf('const cmpBeta='),end=territory.indexOf('/* --------------------------------------------------------------- PREMIUM',start);
assert(start>=0&&end>start);
const code=territory.slice(start,end);
const chapters=[1,2,3,4,5,6].map((id)=>({
 id,nm:'Capitol '+id,lv:id,reg:'Regiunea',tx:'Învinge căpitanul',out:'Câștigat',
 rw:{g:30},obj:[{k:'boss',di:id===1?0:id===2?4:id===3?1:id===4?5:id===5?2:3,t:'Învinge boss '+id}]
}));
const TW={CH:chapters,SEC:[{id:'pust',nm:'Cronica',t:'Învinge căpitani',k:'bosses',n:3,rw:{g:10}}],
 CLUES:{},chRw:()=>({g:30})};
function makeTarget(){
 const classes=new Set(),attrs={};
 return {classes,attrs,focused:0,scrolled:0,options:null,
  classList:{add:x=>classes.add(x),remove:x=>classes.delete(x)},
  setAttribute:(k,v)=>attrs[k]=v,
  focus(){this.focused++},
  scrollIntoView(x){this.scrolled++;this.options=x}};
}
function setup(server='beta',done=false) {
 const S={tab:'a',mt:'l',lvl:3,d:null,
  camp:{rw:{},sec:{},bk:done?{0:1}:{}},
  ter:{st:{raid:0,camp:0,recon:0},hist:{},dsc:{},poiT:{},cl:{},fog:[]}};
 let calls=0,lastHtml='',timers=[];
 const t1=makeTarget(),t2=makeTarget(),t3=makeTarget();
 const els={
  '#cmp-to-do .cmp-task:not(.done)':done?null:t1,
  '.cmp-claim-ready':done?t2:null,
  '.cmp-secondary .cmp-task:not(.done)':t3,
  '.cmp-next':t2,
  '.cmp-secondary':t3
 };
 const document={head:null,querySelector:s=>els[s]||null};
 const go=()=>{calls++;lastHtml=api.vCamp();};
 const context={S,ST_SERVER:server,TW,document,terOwnedV:()=>[],
  window:{matchMedia:()=>({matches:false})},setTimeout:(fn,ms)=>timers.push([fn,ms]),
  go};
 const api=new Function(...Object.keys(context),code+
  '\nreturn {cmpOpenChecklist,vCamp,cmpBeta,chCur,chReady,cmpReady};'
 )(...Object.values(context));
 return {S,api,t1,t2,t3,timers,get calls(){return calls},get lastHtml(){return lastHtml}};
}
const initial=setup(),h=initial.api.vCamp();
assert(h.includes('Ce ai de făcut acum'),'campaign has clear list of current tasks');
assert(h.includes('id="cmp-to-do"'),'checklist can be targeted for scroll');
assert(h.includes('class="cmp-task"'),'each unfinished task has a row');
assert(h.includes('onclick="cmpClaim(1)" disabled'),'chapter rules unchanged');
assert(h.includes('Obiective secundare'),'optional goals still present');
initial.api.cmpOpenChecklist('journey');
assert.equal(initial.S.tab,'m');assert.equal(initial.S.mt,'k');
assert.equal(initial.S.jeCampaignOpened,1,'journey completion notification dismissed');
assert.equal(initial.calls,1,'one navigation and save');
assert.equal(initial.t1.scrolled,1,'scroll to first incomplete goal');
assert.equal(initial.t1.focused,1,'keyboard focus goes to first goal');
assert(initial.t1.classes.has('cmp-spotlight'),'subtle glow applied');
assert.equal(initial.t1.attrs.tabindex,'-1');
assert.equal(initial.t1.options.block,'center');
assert.equal(initial.t2.scrolled,0,'other goals are not highlighted');
assert.equal(initial.timers[0][1],2600,'highlight ends automatically');
initial.timers[0][0]();assert(!initial.t1.classes.has('cmp-spotlight'));
const completed=setup('beta',true);
assert(completed.api.vCamp().includes('class="cmp-task done"'),'completed objectives marked');
completed.api.cmpOpenChecklist('story');
assert.equal(completed.S.sqCampaignOpened,1,'legacy BETA notification dismissed');
assert.equal(completed.t2.scrolled,1,'when objectives are done, focus Claim Chapter');
assert.equal(completed.t1.scrolled,0);
const live=setup('live');
const liveHtml=live.api.vCamp();
assert(!liveHtml.includes('cmp-to-do')&&!liveHtml.includes('cmp-task'),'LIVE markup unchanged');
live.api.cmpOpenChecklist('journey');
assert.equal(live.calls,0,'LIVE navigation handler is gated');
assert.equal(live.S.tab,'a');assert.equal(live.S.jeCampaignOpened,undefined);
const paused=setup();paused.S.d={one:1};
paused.api.cmpOpenChecklist('journey');
assert.equal(paused.calls,0,'active dungeon cannot be interrupted');
assert(territory.includes('prefers-reduced-motion:reduce'),'no animation for reduced-motion users');
// Completed message is hidden after click, with no repeated persistent prompt.
const completeJourney=new Function('S','ST_SERVER','C','mrAll',journey+';return jePanel;');
const jS={journeyV:1,mrPrologSeen:1,mrPrologPending:0,je:{done:['poarta','urme','otel','han','vesti','hotar']},fs:[],rs:[]};
const panel=completeJourney(jS,'beta',()=>0,()=>[]);
assert(panel().includes("cmpOpenChecklist('journey')"));
jS.jeCampaignOpened=1;assert.equal(panel(),'');
const storySave={mrStoryV:1,mrPrologSeen:1,mrPrologPending:0,
 fs:[{h:1,c:'Campion',n:'Eroul'}],rs:[],sq:{claimed:[]}};
const legacyStory=new Function('ST_SERVER','S',story+';return {sqPanel,SQ_ACT};')('beta',storySave);
storySave.sq.claimed=legacyStory.SQ_ACT.map(x=>x.id);
assert(legacyStory.sqPanel().includes("cmpOpenChecklist('story')"),
 'old BETA story completion also links to same focused checklist');
storySave.sqCampaignOpened=1;
assert.equal(legacyStory.sqPanel(),'','old story notification no longer repeats after opening');
console.log('OK: campaign button jumps to first task, chapter-claim fallback, brief highlight, no repeated notification, BETA/LIVE isolation.');
