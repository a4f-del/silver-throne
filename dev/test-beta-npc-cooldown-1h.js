/* BETA: shared NPC village cooldown 1 hour, server migration stays authoritative.
 * Run with node dev/test-beta-npc-cooldown-1h.js (no DB, no save writes). */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const npc = read('tinut.js'), setup = read('supabase/10-beta-world-npc.sql'),
  migration = read('supabase/13-beta-world-npc-cooldown-1h.sql'),
  html = read('index.html'), guide = read('ghid.js');
const start = npc.indexOf('const WN = {'), hash = npc.indexOf('const wnHash =', start);
const left = npc.indexOf('const wnLeft =', hash), effective = npc.indexOf('/* nivelul efectiv', left);
assert(start >= 0 && hash > start && left > hash && effective > left);
const source = npc.slice(start, hash) + npc.slice(left, effective);
const run = (state, server) => new Function('S','LUME','lwNow','Date',source +
 'return { cd: WN.cd, left: wnLeft({id:"wn1_2"}) };')(
 state,server,()=>Date.now(),Date);
const now=Date.now();
const base={wn:{wn1_2:now-30*60000}};
const local=run(base,{npc:{}});
assert.equal(local.cd,3600000,'NPC cooldown must be one hour');
assert(local.left > 29*60000 && local.left <= 30*60000,'Half an hour left after 30min');
assert.equal(run({wn:{wn1_2:now-65*60000}},{npc:{}}).left,0,'Available after 65min');
const remote=run({wn:{wn1_2:now-65*60000}},{npc:{wn1_2:now+70*60000}});
assert(remote.left > 69*60000 && remote.left <= 70*60000,'Server cooldown is authoritative');
for(const sql of [setup,migration]){
 assert(sql.includes("v_now + interval '1 hour'"),'SQL must set 1h');
 assert(!sql.includes("v_now + interval '4 hours'"),'SQL must not still set 4h');
 assert(sql.includes('public.is_beta_admin()'),'Keep BETA auth scope');
 assert(sql.includes('WHERE public.world_npc_raids.cooldown_until <= v_now'),
  'Keep atomic server enforcement');
}
assert(!migration.includes('UPDATE public.world_npc_raids'),'Existing cooldowns stay untouched');
assert(html.includes('tinut.js?v=2026.11.09-1'),'Browser must reload NPC script');
assert(html.includes('ghid.js?v=2026.11.09-6'),'Browser must reload guide script');
assert(guide.includes('Poți reveni la același sat după o oră'),'Guide must show 1h');
assert(npc.includes("'world_npc_raid'"),'Shared NPC villages still call server');
console.log('OK: NPC cooldown is 1h, existing server timestamps respected, BETA RPC protected.');
