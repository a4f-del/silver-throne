/* BETA compact navigation smoke checks: node dev/test-beta-compact-ui.js */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'beta-compact-ui.js'), 'utf8');
const styles = [];
const ctx = {
  ST_SERVER:'beta',
  document:{head:{appendChild(x){styles.push(x.textContent)}},createElement(){return {textContent:''}},getElementById(){return null}},
  S:{tab:'c',fs:[{h:true,n:'Eroul'}],lvl:50,xp:20,pts:10,bp:0,gold:1234,ore:567,bt:{on:false},prem:true,fxInstant:false,d:null},
  TEMA_NAV:[['a','Sat','🏠'],['c','Coborâre','⚔'],['m','Hartă','🗺'],['r','Tron','♛'],['e','Echipă','👥']],
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
assert(ctx.stCompactActive());
const nav = ctx.stCompactNav();
assert.equal((nav.match(/<button/g)||[]).length,4,'Exactly four primary destinations');
for(const t of ['Sat','Coborâre','Hartă','Tron']) assert(nav.includes(t),t);
assert(!nav.includes('Echipă'),'Team moved out of primary navigation');
const header = ctx.stCompactHdr();
for(const token of ['id="pp"','id="pt"','wm-open','bhOpen()','stCompactHeroGo','wf-open','guild-open','tab(\\\'k\\\')','stCompactToggleAccount','btog','fxToggleInstant']) assert(header.includes(token),'Header action '+token);
assert(ctx.stCompactEvent().includes('<details'),'Event starts collapsed');
assert(styles.join('').includes('st-compact'),'Scoped styles');
ctx.ST_SERVER='live';
assert(!ctx.stCompactActive(),'LIVE unchanged');
assert(html.includes('stCompactActive()')&&html.includes('stCompactNav()')&&html.includes('stCompactEvent()'),'All navigation hooks wired');
for(const snippet of html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/gi)) if(snippet[1].trim()) new Function(snippet[1]);
console.log('OK: four nav entries, hero/social/account/settings actions, compact event, BETA-only scope, inline JS.');
