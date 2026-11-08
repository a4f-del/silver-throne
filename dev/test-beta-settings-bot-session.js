/* BETA Settings uses the existing bot actions, safe account sign-out and LIVE environment switch.
 * Run: node dev/test-beta-settings-bot-session.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const src=read('beta-compact-ui.js'),index=read('index.html'),account=read('cont.js'),
  server=read('servere.js'),guide=read('ghid.js');
new Function(src);
assert(index.includes('beta-compact-ui.js?v=2026.11.08-4'),'Settings asset is cache-busted');
assert(index.includes('ghid.js?v=2026.11.08-4'),'Playback guide asset is cache-busted');
assert(guide.includes("stCompactSettingToggle(\\'fx\\')"),'Guide points to new playback control');
assert(account.includes('async function contOut()')&&account.includes('await contPush()'),'Logout saves before signing out');
assert(account.includes('supabaseClient.auth.signOut()'),'Logout uses existing Supabase session');
assert(server.includes("async function stSwitchServer(next)")&&server.includes("location.assign(u.toString())"),'LIVE button uses existing environment switch');
assert(server.includes("u.searchParams.delete('server')"),'LIVE is selected without beta query parameter');
assert(!src.includes("S.bt.d =")&&!src.includes("S.bt.r ="),'No competitive bot automation was added');

let lastHeader='',botCalls=[],fxCalls=0,available=true,firstBattle=false;
const ctx={
  ST_SERVER:'beta',
  S:{tab:'a',lvl:50,xp:0,fs:[{n:'Eroul',h:true}],bt:{on:0,f:1,eq:1,hl:1},
    prem:true,fxInstant:false,pts:30,bp:0,gold:120,ore:90},
  CONT:{booted:true,user:{id:'a',email:'test@example.invalid'}},
  adventureActive:()=>!available,
  C:()=>firstBattle?0:5,
  document:{head:{appendChild(){}},createElement:()=>({}),getElementById:()=>null},
  IC:{p:'⚡',g:'🪙',o:'⛏'},need:()=>50,navBadge:()=>'',tEsc:x=>String(x),
  av:()=>'<span>hero</span>',MXP:()=>60,wmHeader:()=>'',wfHeader:()=>'',guildHeader:()=>''
};
ctx.BT=()=>ctx.S.bt;
ctx.go=()=>{lastHeader=vm.runInContext('stCompactHdr()',ctx)};
ctx.btog=k=>{botCalls.push(k);ctx.S.bt[k]=ctx.S.bt[k]?0:1;ctx.go()};
ctx.fxToggleInstant=()=>{fxCalls++;ctx.S.fxInstant=!ctx.S.fxInstant;ctx.go()};
vm.createContext(ctx);vm.runInContext(src,ctx,{filename:'beta-compact-ui.js'});
const ui=vm.runInContext('({stCompactHdr,stCompactSettingToggle})',ctx);
const initial=ui.stCompactHdr();
for(const label of ['Bot Premium','Ridică obiectele forjate','Echipează automat',
 'Vindecă folosind aur','Jurnal și explicații BOT','Redare lovitură cu lovitură',
 'Deconectează-te','Treci pe LIVE']) assert(initial.includes(label),'Missing Settings row '+label);
for(const key of ['on','f','eq','hl','fx']) assert(initial.includes("stCompactSettingToggle('"+key+"')"),'Option '+key);
assert(initial.includes("onclick=\"contOut()\""),'Logout invokes save-aware account flow');
assert(initial.includes("onclick=\"stSwitchServer('live')\""),'LIVE uses existing switch function');
assert(initial.includes("onclick=\"tab('a');vil('q')\""),'Original BOT journal remains accessible');
assert(!initial.includes("Coboară în temnițe")&&!initial.includes('Atacă sate'),'No competitive bot controls in BETA');
ui.stCompactSettingToggle('on');
assert.equal(botCalls.at(-1),'on','Bot toggle reuses game code');
assert.equal(ctx.S.bt.on,1,'Bot state toggled');
assert(lastHeader.includes('<details class="st-drop st-settings" open>'),'Menu stays open after game redraw');
assert(lastHeader.includes('Bot Premium')&&lastHeader.includes('Pornit'),'Reopened menu reflects new BOT state');
ui.stCompactSettingToggle('f');
assert.equal(ctx.S.bt.f,0,'Finished forging collection can be switched off');
assert(lastHeader.includes('Ridică obiectele forjate')&&lastHeader.includes('Dezactivat'));
ui.stCompactSettingToggle('eq');
assert.equal(ctx.S.bt.eq,0,'Auto-equip option toggles');
ui.stCompactSettingToggle('hl');
assert.equal(ctx.S.bt.hl,0,'Healing option toggles');
ui.stCompactSettingToggle('fx');
assert.equal(fxCalls,1,'Playback reuses existing function');
assert.equal(ctx.S.fxInstant,true,'Playback flag changes');
assert(lastHeader.includes('<details class="st-drop st-settings" open>'),'Playback preserves open menu');
firstBattle=true;
const lockedPlayback=ui.stCompactHdr();
assert(lockedPlayback.includes('Redare lovitură cu lovitură'),'Playback remains visible during first battle');
const prev=fxCalls;
ui.stCompactSettingToggle('fx');
assert.equal(fxCalls,prev,'First battle playback cannot be bypassed');
firstBattle=false;
const before=botCalls.length;
ui.stCompactSettingToggle('d');ui.stCompactSettingToggle('r');
assert.equal(botCalls.length,before,'Unlisted actions never execute');
ctx.S.prem=false;
const nonPremium=ui.stCompactHdr();
assert(nonPremium.includes('Necesită Premium'),'Premium restriction is communicated');
ui.stCompactSettingToggle('on');ui.stCompactSettingToggle('f');
assert.equal(botCalls.length,before,'Non-Premium cannot toggle bot options');
ctx.S.prem=true;
available=false;
ui.stCompactSettingToggle('on');
assert.equal(botCalls.length,before,'Unavailable game state blocks bot configuration');
available=true;
ctx.ST_SERVER='live';
ui.stCompactSettingToggle('on');
assert.equal(botCalls.length,before,'LIVE never receives compact BETA Settings actions');
console.log('OK: BOT toggles + state persistence across redraw, first fight guard, premium restriction, logout and LIVE switching.');
