/* Silver Throne — PAS 33: security release gate, not a claim of anti-cheat.
 * node dev/test-beta-competition-trust-boundaries.js
 * Checks known trust gaps and provisional notices. DOES NOT assert server security. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const world=read('supabase/02-lume.sql'),port=read('supabase/04-portret.sql');
const throne=read('supabase/06-tron-duel-1v1.sql'),guild=read('supabase/19-beta-guild-boss-formation-roles.sql');
const clientWorld=read('lume.js'),clientThrone=read('tron.js'),clientGuild=read('bresle.js'),html=read('index.html');
for(const script of [clientWorld,clientThrone,clientGuild])new Function(script);
for(const part of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
 if(part[1].trim())new Function(part[1]);
// Explicit release blockers: no known code here establishes an authoritative
// item/level/battle ledger in Supabase. Keep this list maintained as systems
// are migrated server-side, rather than silently treating clamping as security.
const risks=[
 ['world_join level is client supplied',world.includes("(p->>'level')::numeric")],
 ['world_join power is client supplied',world.includes("(p->>'power')::numeric")],
 ['world_join unit snapshot is client supplied',world.includes("units       = p->'units'")],
 ['world_join remains client driven in portrait update',port.includes("(p->>'power')::numeric")],
 ['world_raid_finish trusts caller win boolean',world.includes('win = coalesce(p_win, false)')],
 ['world_raid_finish accepts caller gold and XP amounts',world.includes('coalesce(p_gold, 0)')&&world.includes('coalesce(p_xp, 0)')],
 ['throne_publish accepts caller ghost stats',throne.includes("(u ->> 'atk')::numeric")],
 ['guild report accepts caller generated event UUID',guild.includes("nullif(p_data->>'id','')::uuid")],
 ['guild boss uses player-published world power',guild.includes('FROM public.world_players WHERE user_id=v_uid')]
];
for(const [reason,exists] of risks)assert(exists,'Risk inventory must be updated after remediating: '+reason);
assert(throne.includes('anti-trișat necesită statistici calculate server-side'),
 'Throne SQL itself acknowledges the missing authoritative stats');
assert(guild.includes('v_cap:=CASE v_kind'),'Guild daily caps exist but do not prove battle');
assert(guild.includes('ON CONFLICT DO NOTHING'),'Guild event deduplication remains');
const start=clientWorld.indexOf('function lwTrustNotice(){'),end=clientWorld.indexOf('function vBoard() {',start);
assert(start>=0&&end>start);
const note=new Function('ST_SERVER',clientWorld.slice(start,end)+';return lwTrustNotice();');
assert(note('beta').includes('Clasament BETA provizoriu'));
assert(note('beta').includes('nu sunt verificate'));
assert.equal(note('live')(),'','No competitive warning in LIVE UI');
assert(clientThrone.includes('Clasament BETA provizoriu')&&clientThrone.includes('validat anti-cheat'));
assert(clientGuild.includes('Raportări BETA provizorii'));
assert(html.includes('lume.js?v=2026.11.08-3')&&
 html.includes('tron.js?v=2026.11.08-2')&&
 html.includes('bresle.js?v=2026.11.08-5'),'Versioned UI notice assets');
const doc=read('docs/BETA-COMPETITION-SERVER-AUTHORITY-GATE.md');
for(const phrase of ['BLOCAT','Nu reprezintă anti-cheat','01-throne.sql','world_raid_finish','guild_api','server-side'])
 assert(doc.includes(phrase),'Security document must identify unresolved gate: '+phrase);
console.log('AUDIT PAS 33 — NU ESTE ANTI-CHEAT: '+risks.length+
 ' puncte de încredere în client inventariate; clasamentele BETA marcate provizorii.');
console.log('OK: release gate documented; no silent claim that client-side combat is server validated.');
