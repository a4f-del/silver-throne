/* BETA Settings uses the existing bot actions and safe account sign-out; no server switch remains.
 * Run: node dev/test-beta-settings-bot-session.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const src=read('beta-compact-ui.js'),index=read('index.html'),account=read('cont.js'),
  server=read('servere.js'),guide=read('ghid.js');
new Function(src);
assert(index.includes('beta-compact-ui.js?v=2026.11.09-5'),'Settings asset is cache-busted');
assert(index.includes('ghid.js?v=2026.11.09-6'),'Playback guide asset is cache-busted');
assert(guide.includes("stCompactSettingToggle(\\'fx\\')"),'Guide points to new playback control');
assert(account.includes('async function contOut()')&&account.includes('await contPush()'),'Logout saves before signing out');
assert(account.includes('supabaseClient.auth.signOut()'),'Logout uses existing Supabase session');
assert(!server.includes('stSwitchServer')&&!server.includes('ST_SERVER'),'No LIVE/BETA environment switch remains');
assert(!src.includes("S.bt.d =")&&!src.includes("S.bt.r ="),'No competitive bot automation was added');

let lastHeader='',botCalls=[],botTicks=0,fxCalls=0,available=true,firstBattle=false;
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
ctx.botTick=()=>{botTicks++;if(ctx.S.bt.on&&ctx.S.prem&&ctx.S.bt.eq)ctx.S.botSampleActions=(ctx.S.botSampleActions||0)+1;};
vm.createContext(ctx);vm.runInContext(src,ctx,{filename:'beta-compact-ui.js'});
const ui=vm.runInContext('({stCompactHdr,stCompactSettingToggle,stBotPower})',ctx);
const initial=ui.stCompactHdr();
for(const label of ['Pornește BOT-ul','BOT oprit','Ridică obiectele forjate','Echipează automat',
 'Vindecă folosind aur','Jurnal și explicații BOT','Redare lovitură cu lovitură',
 'Deconectează-te']) assert(initial.includes(label),'Missing Settings row '+label);
for(const key of ['f','eq','hl','fx']) assert(initial.includes("stCompactSettingToggle('"+key+"')"),'Option '+key);
assert(initial.includes('onclick="stBotPower()"'),'Explicit start-stop control wired');
assert(initial.includes("onclick=\"contOut()\""),'Logout invokes save-aware account flow');
assert(!initial.includes('stSwitchServer')&&!initial.includes('Treci pe LIVE'),'No LIVE switch in Settings');
assert(initial.includes("onclick=\"tab('a');vil('q')\""),'Original BOT journal remains accessible');
assert(!initial.includes("Coboară în temnițe")&&!initial.includes('Atacă sate'),'No competitive bot controls in BETA');
ctx.S.bn=Date.now();
ui.stBotPower();
assert.equal(botCalls.at(-1),'on','BOT power reuses game toggle');
assert.equal(ctx.S.bn,0,'Starting BOT clears previous cooldown');
assert.equal(botTicks,1,'Starting BOT immediately invokes engine');
assert.equal(ctx.S.botSampleActions,1,'First available task executes with active BOT');
assert.equal(ctx.S.bt.on,1,'Bot state toggled');
assert(lastHeader.includes('<details class="st-drop st-settings" open>'),'Menu stays open after game redraw');
assert(lastHeader.includes('Oprește BOT-ul')&&lastHeader.includes('BOT activ'),'Reopened menu reflects running BOT state');
ui.stBotPower();
assert.equal(ctx.S.bt.on,0,'Stop button deactivates engine');
assert.equal(botTicks,1,'Stopping never triggers new work');
assert(lastHeader.includes('Pornește BOT-ul')&&lastHeader.includes('BOT oprit'),'Stopped state is visible');
ui.stBotPower();
assert.equal(ctx.S.bt.on,1,'Start button can restart engine');
assert.equal(botTicks,2,'Restart rechecks available work');
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
ui.stBotPower();ui.stCompactSettingToggle('f');
assert.equal(botCalls.length,before,'Non-Premium cannot toggle bot options');
ctx.S.prem=true;
available=false;
ui.stBotPower();
assert.equal(botCalls.length,before,'Unavailable game state blocks bot start/stop');
available=true;
console.log('OK: real BOT power start-stop, immediate engine tick, no tick on stop, premium restriction, logout.');
