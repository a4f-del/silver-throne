/* Silver Throne BETA — Coborare opens with squad management, not a repeated heading.
 * node dev/test-beta-coborare-team-header.js
 * UI-only regression, no live accounts, network or SQL.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('index.html'),dungeons=read('temnite.js');
const i=html.indexOf('function vC(){'),j=html.indexOf('\n const f=d.f;',i);
assert(i>=0&&j>i,'BETA Coborare page branch exists');
const beta=html.slice(i,j);
assert(beta.includes('if(!d){'),'Coborare hub branch present');
assert(beta.includes('class="cb-party-first"'),'Squad management wrapper is on top');
assert(beta.includes('heroSoloControl()'),'Real roster controls rendered');
assert(beta.includes('ⓘ Reguli utile'),'Rules remain available, but collapsible');
assert(!beta.includes('AVENTURILE TALE'),'Redundant adventure eyebrow removed');
assert(!beta.includes('<h2>⚔ Coborâre</h2>'),'Repeated Coborare title removed');
assert(!beta.includes('Continuă temnița, caută relicva'),'Explanatory paragraph removed');
assert(!beta.includes('class="cb-head"'),'Redundant header card removed');
assert(dungeons.includes('function tmnHubBeta('),'New hub retained');
const hub=dungeons.slice(dungeons.indexOf('function tmnHubBeta('),dungeons.indexOf('/* pe card:',dungeons.indexOf('function tmnHubBeta(')));
assert(!hub.includes('heroSoloControl()'),'Do not duplicate squad controls below featured dungeon');
assert(!hub.includes('cb-party-option'),'Removed old duplicate wrapper');
assert(dungeons.includes('.cb-party-first{display:flex'),'New compact top layout styled');
assert(dungeons.includes('.cb-party-active{display:flex'),'Active hero/mercenary roster visible');
assert(dungeons.includes('@media(max-width:760px)'),'Responsive placement retained');
assert(html.includes('temnite.js?v=2026.11.09-1'),'Cache-bust updated');

const fn=new Function('S','DG','trPage','acCombatPage','heroSoloControl','vDung','reviveAllBtn','bhLast',
 beta+' return ""; }; return vC();')(
 {d:null,fs:[{h:1,n:'Erou',hp:90}],adventure:null},
 [],()=>'',()=>'',()=>'<div id="team">Erou singur · Readu mercenarii</div>',
 ()=>'<div id="feature">Temniță recomandată</div>',()=>'',()=>'<div id="last">Ultima luptă</div>'
);
assert(fn.startsWith('<div class="cb-party-first">'),'Squad appears before everything else');
assert(fn.indexOf('id="team"')>=0&&fn.indexOf('id="feature"')>fn.indexOf('id="team"'),
 'Roster controls precede recommended dungeon');
assert.equal((fn.match(/id="team"/g)||[]).length,1,'Exactly one roster block');
assert(!fn.includes('id="last"'),'Last battle stays in LUPTE, not Coborare');
assert(!fn.includes('AVENTURILE TALE'),'No old top header');
console.log('OK: BETA Coborare begins with one active squad manager and collapsible rules; no duplicate header.');
