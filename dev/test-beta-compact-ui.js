/* BETA compact navigation smoke checks: node dev/test-beta-compact-ui.js */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'beta-compact-ui.js'), 'utf8');
const guide = fs.readFileSync(path.join(root, 'ghid.js'), 'utf8');
const heroGuide = fs.readFileSync(path.join(root, 'ghidare-erou.js'), 'utf8');
const journey = fs.readFileSync(path.join(root, 'drumul-eroului.js'), 'utf8');
const styles = [];
const ctx = {
  ST_SERVER:'beta',
  document:{head:{appendChild(x){styles.push(x.textContent)}},createElement(){return {textContent:''}},getElementById(){return null}},
  S:{tab:'c',fs:[{h:true,n:'Eroul'}],lvl:50,xp:20,pts:10,bp:0,gold:1234,ore:567,bt:{on:false,f:1,eq:1,hl:1},prem:true,fxInstant:false,d:null},
  TEMA_NAV:[['a','Sat','🏠'],['c','Aventură','⚔'],['m','Hartă','🗺'],['r','Tron','♛'],['e','Echipă','👥']],
  temaOn:k=>k==='c',navBadge:k=>k==='e'?'<b class="nb">2</b>':'',
  IC:{p:'⚡',g:'🪙',o:'⛏'},need:()=>100,av:()=>'<span>portret</span>',tEsc:x=>x,MXP:()=>60,
  wmHeader:()=>'<button id="wm-open">✉</button>',wfHeader:()=>'<button id="wf-open">Prieteni</button>',
  guildHeader:()=>'<button id="guild-open">Bresle</button>',
  rtBanner:()=>'<section class="rt">old</section>',rtGold:()=>false,rtStart:()=>Date.now()+180000,rtNow:()=>Date.now(),
  rtWeek:()=>({n:'Săptămâna minerilor',d:'Bonus minereu'}),sdT:()=> '3m',fmt:()=> '3m',RT:{h:19,mult:2},
  ghActive:()=>false,adventureActive:()=>false,Date
};
vm.createContext(ctx);
vm.runInContext(js,ctx,{filename:'beta-compact-ui.js'});
Object.assign(ctx,vm.runInContext('({stCompactNav,stTronSidebarState,stCompactHdr,stCompactEvent,stCompactSettingToggle})',ctx));
const nav = ctx.stCompactNav();
assert.equal((nav.split('<div class="st-nav-sec"')[0].match(/<button/g)||[]).length,5,'Five permanent navigation destinations');
assert(nav.includes('st-nav-sec')&&nav.includes("tab('k')"),'Rankings link sits below the main destinations');
for(const t of ['Sat','Aventură','Hartă','Tron','Echipă']) assert(nav.includes(t),t);
assert(nav.includes('onclick="tab(\'e\')"'),'Team is accessible directly from the sidebar');
const header = ctx.stCompactHdr();
assert(header.includes('Pornește BOT-ul')&&header.includes('onclick="stBotPower()"')&&header.includes('st-bot-pill'),'BOT start/stop button sits in the top bar');
for(const token of ['id="pp"','id="pt"','wm-open','bhOpen()','stCompactHeroGo','wf-open','guild-open',"tab('k')",'stCompactToggleAccount','stCompactSettingToggle','contOut()','Jurnal și explicații BOT','Ridică obiectele forjate','Echipează automat','Vindecă folosind aur']) assert(header.includes(token),'Header action '+token);
assert(ctx.stCompactEvent().includes('<details'),'Event starts collapsed');
assert(styles.join('').includes('st-compact'),'Scoped styles');
assert(html.includes('beta-compact-ui.js?v=2026.11.10-3'),'New compact sidebar cache-busted');
ctx.TT={CFG:{minLevel:10}};
ctx.TRON={st:{
  me:{user_id:'hero-1',pending:[],can_challenge:true},
  holder:{user_id:'hero-2',name:'OwN'},week_end:Date.now()+13*3600e3
}};
ctx.tronNow=()=>Date.now();
ctx.sdT=()=> '13h';
ctx.tEsc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
let throneNav=ctx.stCompactNav();
assert.equal((throneNav.split('<div class="st-nav-sec"')[0].match(/<button/g)||[]).length,5,'Tron remains highlighted alongside Echipă');
assert(throneNav.includes('st-tron-hot')&&throneNav.includes('OwN ține Tronul')&&throneNav.includes('Provoacă acum'),'Actionable challenger shows highlighted Throne in sidebar');
ctx.TRON.st.me.can_challenge=false;
throneNav=ctx.stCompactNav();
assert(throneNav.includes('st-tron-holder')&&throneNav.includes('Se închide în 13h'),'Occupied Throne stays visible without false CTA');
ctx.TRON.st.me.pending=[{week:5},{week:6}];
throneNav=ctx.stCompactNav();
assert(throneNav.includes('Premiu de revendicat')&&throneNav.includes('2 premii disponibile'),'Rewards receive priority');
ctx.TRON.st.me.pending=[];
ctx.TRON.st.holder={user_id:'hero-1',name:'Eroul'};
throneNav=ctx.stCompactNav();
assert(throneNav.includes('st-tron-king')&&throneNav.includes('Tu deții Tronul'),'Owner sees crown status');
ctx.TRON.st.holder=null;
throneNav=ctx.stCompactNav();
assert(throneNav.includes('Tronul este liber'),'Vacant Throne state shown');
ctx.TRON.st.holder={user_id:'hero-2',name:'<script>alert(1)</script>'};
throneNav=ctx.stCompactNav();
assert(throneNav.includes('&lt;script&gt;')&&!throneNav.includes('<script>'),'Server holder names are safely escaped');
ctx.TRON.st=null;
assert.equal((ctx.stCompactNav().split('<div class="st-nav-sec"')[0].match(/<button/g)||[]).length,5,'Unavailable server state preserves five navigation choices');
assert(html.includes('stCompactHdr()')&&html.includes('stCompactNav()')&&html.includes('stCompactEvent()'),'All navigation hooks wired');
assert(guide.includes('function ghTeamNav()')&&guide.includes("p.t === 'e' ? ghTeamNav()")&&guide.includes('#nv button[onclick="tab('),'Legacy BETA guide points directly to restored Echipă sidebar button');
assert(guide.includes('function ghReplayTarget()')&&guide.includes('header .st-settings:not([open])')&&guide.includes('stCompactSettingToggle('),'Legacy BETA guide follows Setări to playback control');
assert(!heroGuide.includes("tab==='e'&&typeof stCompactActive==='function'")&&heroGuide.includes("return {selector:'#nv button"),'New-hero guidance highlights Echipă in sidebar');
assert(journey.includes('deschide Echipă din bara din stânga'),'Drumul Eroului instructions reflect restored sidebar');
assert(html.includes('ghid.js?v=2026.11.09-6')&&html.includes('ghidare-erou.js?v=2026.11.08-3'),'Both guide scripts cache-busted');
for(const script of html.split('<script>').slice(1).map(s=>s.split('</script>')[0])) if(script.trim()) new Function(script);
console.log('OK: five nav entries, BOT controls, existing logout, guide and BETA scope, inline JS.');
