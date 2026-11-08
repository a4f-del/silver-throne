/* Silver Throne — BETA pas 30: Piață / Negustor / Bazar fără ghid obligatoriu.
 * node dev/test-beta-market-clarity.js */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=n=>fs.readFileSync(path.join(root,n),'utf8');
const source=read('piata.js'),bazaar=read('bazar.js'),index=read('index.html');
new Function(source);new Function(bazaar);
for(const m of index.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
function create({server='beta',focused=true,lvl=1}={}){
 const S={lvl,pt:'p',ptg:{},vil:'p'},BZ={inbox:0};
 let redraws=0,saves=0;
 const ctx={S,ST_SERVER:server,jeFocus:()=>focused,TP:{mkt:{luxMinLv:10}},
  BZ,vP:()=>'<section id="ordinary-shop">Ordinary</section>',
  vLux:()=>'<section id="premium-npc-merchant">Merchant</section>',
  vBazar:()=>'<section id="real-player-bazaar">Player offers</section>',
  go:()=>redraws++,save:()=>saves++};
 const api=new Function(...Object.keys(ctx),source+
  ';return {PT_TABS,PT_ROLE,ptFocus,ptQuickGuide,ptG,ptTab,ptGuideOk,ptGuideShow,vPiata};')(
    ...Object.values(ctx));
 return {S,BZ,api,get redraws(){return redraws},get saves(){return saves}};
}
const beta=create();const {api,S}=beta;
const standard=api.vPiata();
assert.equal((standard.match(/role="tab"/g)||[]).length,3,'Exactly 3 primary tabs');
assert(standard.includes('Piață')&&standard.includes('Negustor')&&standard.includes('Bazar'));
assert(standard.includes('Cumperi cu aur')&&standard.includes('Obiecte rare și cristale')&&
 standard.includes('Schimb între jucători'),'Three roles are immediately distinguishable');
assert(standard.includes('id="ordinary-shop"'),'Ordinary marketplace preserved');
assert(standard.includes('<details class="pt-quick-details">'),'Long help is optional');
assert(!standard.includes('onclick="ptGuideOk('),'No forced guide acceptance');
assert(!standard.includes('class="pt-gs"'),'No large onboarding cards for new BETA');
assert(!standard.includes('id="real-player-bazaar"'),'Other market subviews are not loaded twice');
S.lvl=10;api.ptTab('l');
assert.equal(S.pt,'l');assert.equal(S.vil,'p');
let merchant=api.vPiata();
assert(merchant.includes('id="premium-npc-merchant"'));
assert(merchant.includes('Schimb de cristale'),'Existing three-step instructions still available on demand');
assert(merchant.includes('Mai multe despre Negustorul'));
assert(S.ptg.lv===1,'Unlocked tab is counted as visited without accepting a modal');
S.lvl=15;api.ptTab('y');
let baz=api.vPiata();
assert(baz.includes('id="real-player-bazaar"'));
assert(baz.includes('2% taxă')&&baz.includes('5%'),'Bazar fee transparency still available');
assert(baz.includes('Bazarul — Schimb între jucători'));
assert.equal(beta.redraws,2);
const locked=create({lvl:7});locked.api.ptTab('l');
const lockHtml=locked.api.vPiata();
assert(lockHtml.includes('se deschide la nivelul 10'));
assert(lockHtml.includes('Nivelul tău: 7 / 10'));
assert(!lockHtml.includes('id="premium-npc-merchant"'),'Merchant stays locked');
locked.api.ptTab('y');
assert(locked.api.vPiata().includes('se deschide la nivelul 15'));
const high=create({lvl:20});high.api.ptTab('y');
assert(high.api.vPiata().includes('id="real-player-bazaar"'),'Bazar unlock works at level 20');
const live=create({server:'live',lvl:20});
const liveHtml=live.api.vPiata();
assert(liveHtml.includes('Mini-ghid'));
assert(liveHtml.includes('onclick="ptGuideOk('),'LIVE still uses the original guide');
assert(!liveHtml.includes('pt-quick-details')&&!liveHtml.includes('pt-rolesub'));
const oldBeta=create({focused:false,lvl:20});
assert(oldBeta.api.vPiata().includes('onclick="ptGuideOk('),'Old BETA hero flow unchanged');
assert(source.includes("if (typeof window !== 'undefined')"),'Legacy building route hook retained');
assert(source.includes("if (k === 'l' || k === 'y') { S.pt = k; k = 'p'; }"),
 'Old links still redirect into one market building');
assert(bazaar.includes('bazar_buy')&&bazaar.includes('bazar_list')&&bazaar.includes('bazar_claim'),
 'Bazar purchasing, listing and claim remain intact');
assert(bazaar.includes('BZ_FEE = 0.02')&&bazaar.includes('BZ_CUT = 0.05'),
 'Listing and selling taxes remain unchanged');
assert(index.includes('piata.js?v=2026.11.08-1'),'Updated JS cache version required');
console.log('OK: compact 3-way market help, opt-in full guidance, price clarity, existing trade functions, LIVE/legacy isolation.');
