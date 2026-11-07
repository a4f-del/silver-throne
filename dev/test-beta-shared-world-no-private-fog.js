/* Silver Throne — harta Lumea BETA fara pata/ceata privata.
   node dev/test-beta-shared-world-no-private-fog.js */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../tinut.js'),'utf8');
const terrain=source.split("LWA.defs +=")[0];
assert(terrain.includes('function lwTinut'), 'The renderer must be covered by this test');
function mapFor(server) {
 const S={map:true,ter:{fog:[]},lvl:4};
 const player={id:'p1',x:0,y:0,level:4};
 const LUME={st:{me:{user_id:'p1'},players:[player]}};
 const ctx={ST_SERVER:server,S,LUME,LW:{},TW:{GW:1,GH:1},SMCL:50,
   lwPos(){return [100,200]},terCell(){return true},terAdj(){return false},
   terMarks(){return '<g id="private-marks"/>'},console};
 vm.createContext(ctx);
 vm.runInContext(terrain,ctx);
 return {S,ctx,player};
}
const beta=mapFor('beta');
const before=JSON.stringify(beta.S);
assert.equal(vm.runInContext('tnInside(100,200)',beta.ctx),false,'No private scenery exclusion');
assert.equal(vm.runInContext('lwTinut(LUME.st.players[0])',beta.ctx),'','No private shade, fog, boundaries or marks');
assert.equal(JSON.stringify(beta.S),before,'Map presentation must never alter player save');
const live=mapFor('live');
assert.equal(vm.runInContext('tnInside(100,200)',live.ctx),true,'LIVE scenery still respects old layout');
const old=vm.runInContext('lwTinut(LUME.st.players[0])',live.ctx);
assert(old.includes('fill-opacity=".28"') && old.includes('private-marks'),
  'LIVE old territory presentation is preserved');
const npc=source.slice(source.indexOf('const WN ='));
assert(npc.includes('world_npc_get') && npc.includes('world_npc_raid'),
 'Shared NPC functions and 4-hour cooldown should remain untouched');
assert(npc.includes('4 * 3600e3'),'4-hour cooldown preserved');
console.log('OK: BETA shared World without private fog, no save changes, LIVE layout and shared NPC raids preserved.');
