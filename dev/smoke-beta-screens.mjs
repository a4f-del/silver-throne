/* Silver Throne — smoke test browser: navigates every primary screen and village building.
   Requires: npm install --no-save playwright && npx playwright install chromium
   Usage: ST_BETA_SMOKE_STATE=/absolute/path/to/qa-auth-state.json node dev/smoke-beta-screens.mjs
   The auth state must be an EXPLICITLY CREATED, DISPOSABLE BETA QA ACCOUNT.
   Never commit the state file to GitHub. This script does not click purchases or combat.
   Does not invoke go()/save(); mutations stay in the browser's temporary S clone.
*/
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
const state = process.env.ST_BETA_SMOKE_STATE;
if (!state || !existsSync(state)) {
  console.error('Provide ST_BETA_SMOKE_STATE pointing to a disposable BETA test account auth state.');
  process.exit(2);
}
const browser = await chromium.launch({headless:process.env.ST_SMOKE_HEADED!=='1'});
const errors = [], results = [];
const context = await browser.newContext({storageState:state});
const page = await context.newPage();
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&/ReferenceError|SyntaxError|TypeError|not defined/i.test(m.text()))errors.push(m.text());});
try {
  await page.goto('https://a4f-del.github.io/silver-throne/?server=beta',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof CONT!=='undefined'&&CONT.booted&&typeof S!=='undefined'&&S&&S.fs&&document.querySelector('#v'),
    undefined,{timeout:25000});
  const screens=[
    ['Sat / clădiri','a',''],
    ['Topitorie','a','a'],['Piață','a','p'],['Negustor','a','l'],
    ['Han','a','h'],['Infirmerie','a','i'],['Antrenament','a','t'],
    ['Misiuni','a','x'],['Depozit','a','d'],['Steag','a','g'],
    ['Bot','a','q'],['Echipă','e',''],['Coborâre','c',''],
    ['Lumea','m','l'],['Campanie','m','k'],['Tron','r',''],
    ['Clasament','k','']
  ];
  const checks=await page.evaluate(async screens=>{
    // Suppress all local / online game saves during the navigation simulation.
    const originalSave=window.save,originalQueue=window.contQueue,originalPush=window.contPush;
    const original=JSON.stringify(S),out=[];
    window.save=()=>{};
    window.contQueue=()=>{};
    window.contPush=async()=>true;
    try {
      if(typeof lootItem!=='function')out.push({name:'Contract lootItem',ok:false,detail:'lootItem is not defined'});
      for(const [name,tab,sub] of screens) {
        try{
          S=JSON.parse(original);
          S.d=null; S.tab=tab;
          if(tab==='a')S.vil=sub;
          if(tab==='m')S.mt=sub;
          render();
          const host=document.getElementById('v');
          if(!host||!host.querySelector('section'))throw Error('View is empty or missing a section');
          out.push({name,ok:true,detail:host.textContent.trim().slice(0,70)});
        }catch(e){out.push({name,ok:false,detail:e.message});}
        // Remove transient story preview overlays that could obscure the next screen.
        ['mr-scene','mr-m','je-preview','lgm','wf-overlay','wm-overlay'].forEach(id=>document.getElementById(id)?.remove());
      }
    }finally{
      S=JSON.parse(original);
      window.save=originalSave;window.contQueue=originalQueue;window.contPush=originalPush;
      try{render();}catch(e){out.push({name:'Restaurare interfață',ok:false,detail:e.message});}
    }
    return out;
  },screens);
  results.push(...checks);
  for(const r of results)console.log((r.ok?'✓':'✗')+' '+r.name+(r.ok?'':' — '+r.detail));
  if(errors.length){console.error('Browser errors:',...errors);process.exitCode=1;}
  if(results.some(x=>!x.ok))process.exitCode=1;
  else if(!errors.length)console.log('OK: '+results.length+' screens rendered without JavaScript exceptions.');
}finally{
  await context.close();
  await browser.close();
}
