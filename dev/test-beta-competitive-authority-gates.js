/* Pasul 33: gate fail-closed / raportari bresla nevalidate.
 * node dev/test-beta-competitive-authority-gates.js
 * Static only: NO database, NO player data and NO anti-cheat certification. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const query=read('supabase/CHECK-beta-competitive-authority-gates.sql');
const doc=read('docs/BETA-COMPETITIVE-AUTHORITY-GATES-STEP33.md');
const guild=read('supabase/14-beta-guilds.sql');
const client=read('bresle.js');
const throne=read('supabase/33-beta-throne-result-claim-audit-rpc.sql');
const world=read('supabase/27-beta-pvp-shadow-server-simulator.sql');
const saves=read('cont.js');
const noComments=query.replace(/^--.*$/gm,'');
assert(/\bWITH evidence\b/.test(noComments),'Must enumerate actual installed controls');
assert(/\bFROM public\.guild_events\b/.test(noComments),'Must aggregate real guild event log');
assert(/\bHAVING count\(\*\)/.test(noComments),'Must include burst signal');
assert(/count\(DISTINCT user_id\)/.test(query),'Only aggregate reporter counts');
assert(!/\b(?:CREATE|ALTER|DROP|TRUNCATE|INSERT|UPDATE|DELETE|REVOKE|GRANT|CALL|DO|EXECUTE)\b/i.test(noComments),
  'Diagnostic must be strictly SELECT/CTE read-only');
for(const blocker of [
 'server_owned_progress','server_owned_inventory','server_decided_pvp',
 'server_decided_throne','guild_pve_provenance','authenticated_abuse_qa'
]){
 assert(query.includes("'"+blocker+"'"),'Fail-closed blocker missing: '+blocker);
}
assert(query.includes("'release_blocker', control, FALSE, FALSE"),
  'Blockers must NEVER auto-pass based on an installed table');
assert(query.includes('FALSE AS sufficient_for_public_competition'),
  'Presence of an object must not certify authority');
assert(query.includes("created_at >= now() - interval '7 days'"),
  'Bound guild diagnostic to a modest time horizon');
assert(!/\bSELECT\b[^;]*\b(?:user_id|event_id)\s+AS\s+(?:user|event)/i.test(noComments),
  'Do not expose raw user or event identities');
assert(guild.includes("v_event := nullif(p_data->>'id','')::uuid") &&
 guild.includes("v_kind:=coalesce(p_data->>'kind','')"),
  'Provisional guild event provenance must remain described accurately');
assert(client.includes('id:guildEventId()'),'Guild client still creates event identifiers');
assert(throne.includes('v_answer := public.throne_challenge_finish(p_id,p_win)'),
  'Official throne result still takes client p_win');
assert(world.includes('predicted_attacker_win'),'World simulator is shadow-only');
assert(saves.includes('game_saves'),'Client save still exists; do not claim server-authoritative inventory');
assert(doc.includes('nu soluție anti-cheat') && doc.includes('fără reset'),
  'Documentation must state limitations and save-safety promise');
console.log('OK: BETA step33 read-only authority gate, fail-closed blockers and private guild aggregates (no server validation claimed).');
