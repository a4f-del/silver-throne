/* Silver Throne — BETA Focused Onboarding. node dev/test-beta-onboarding-focus.js */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const sat=fs.readFileSync(path.join(root,'sat.js'),'utf8');
const source=sat.slice(0,sat.indexOf('/* zonele din imaginile satului'));
const fn=new Function('S','jeFocusActive','mrAll','mhp',source+';return {satFocusOn,satVisible,satStage};');
function town({focus=true,done=[],injured=false,showAll=false}={}){
 const S={je:{done},fs:[{hp:injured?70:100}],satShowAll:showAll};
 return fn(S,()=>focus,()=>S.fs,()=>100);
}
const core=['a','h','t','x'];
const extras=['p','l','i','d','z','g','q'];
const start=town();
assert(core.every(k=>start.satVisible(k))&&extras.every(k=>!start.satVisible(k)),
 'Only four core buildings visible initially');
assert(town({injured:true}).satVisible('i'),'Infirmary never hidden from injured player');
const mine=town({done:['poarta']});
assert(mine.satVisible('i')&&!mine.satVisible('p'),'Infirmary after mine');
const forge=town({done:['poarta','urme']});
assert(forge.satVisible('p')&&forge.satVisible('d')&&!forge.satVisible('q'),
 'Market and storage after forge');
assert(extras.every(k=>town({showAll:true}).satVisible(k)),'Manual show-all overrides stages');
assert(extras.every(k=>town({done:['poarta','urme','otel','han']}).satVisible(k)),
 'Veteran unlocks all');
assert(extras.every(k=>town({focus:false}).satVisible(k)),'Existing heroes unchanged');
const code=Object.fromEntries(['index.html','erou.js','panou.js','mercenari.js','ghid.js','drumul-eroului.js'].map(n=>
 [n,fs.readFileSync(path.join(root,n),'utf8')]));
assert(code['erou.js'].includes('S.journeyUxV = 2'),'New BETA hero opt-in');
assert(code['panou.js'].includes("jeFocusActive())return ''"),'Hide competing side tasks');
assert(code['index.html'].includes('jeFocusActive())?rtBanner()'),'Hide event banner during focus');
assert(code['mercenari.js'].includes('jeFocusActive()'),'Hide QA story preview during focus');
assert(code['ghid.js'].includes('jeFocusActive()'),'Hide old guide highlight arrow during focus');
assert(code['drumul-eroului.js'].includes('function jeFocus()'),'Gate focus to new hero');
for(const n of ['sat.js','erou.js','panou.js','mercenari.js','ghid.js','drumul-eroului.js'])
 new Function(fs.readFileSync(path.join(root,n),'utf8'));
for(const m of code['index.html'].matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(m[1].trim())new Function(m[1]);
console.log('OK: first four buildings, progressive unlocks, emergency infirmary, opt-out, legacy isolation and JS syntax.');
