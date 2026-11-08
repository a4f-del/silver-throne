/* Silver Throne · BETA · post-SQL33 read-only Tron audit checks.
 * Run: node dev/test-beta-throne-audit-diagnostic.js
 * No database access; verifies safe SQL and representative result classification.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const query=read('supabase/CHECK-beta-throne-sql31-33-audit.sql');
const sql31=read('supabase/31-beta-throne-duel-shadow-audit.sql');
const sql32=read('supabase/32-beta-throne-duel-shadow-simulator.sql');
const sql33=read('supabase/33-beta-throne-result-claim-audit-rpc.sql');
const roadmap=read('docs/ROADMAP-EXPERIENTA-JUCATORULUI.md');
assert(!/^\s*(?:INSERT|UPDATE|DELETE|TRUNCATE|ALTER|CREATE|DROP|GRANT|REVOKE|CALL|DO)\b/im.test(query),
  'Diagnostic must be strictly read-only');
assert.equal((query.match(/^SELECT\b/gm)||[]).length,2,'Two read-only result sets');
assert(query.includes("FROM public.beta_throne_challenge_shadow sh"),'Audit source only');
assert(query.includes("LEFT JOIN public.beta_throne_duel_simulations sim"),'No lost unmatched snapshots');
assert(query.includes("WHERE sh.challenge_started_at >= now()-interval '7 days'"),'Bounded aggregate window');
assert(query.includes("COUNT(*)")||query.includes("count(*)"),'Count audit completeness');
assert(query.includes("result_field='client_claim_via_rpc'"),'Distinguish SQL33 from other finish sources');
assert(query.includes("sim.predicted_challenger_win"),'Compare client-reported and model-predicted outcomes');
assert(query.includes("holder_id IS NULL"),'Royal Guard must be excluded from comparable King duels');
assert(query.includes("completed_at IS NOT NULL") && query.includes("sh.completed_at IS NULL"),'No comparison against pending fights');
assert(query.includes("sh.reported_win IS NULL"),'Unknown reported result is not a loss');
assert(query.includes("sim.predicted_challenger_win IS NULL"),'Uncertain simulation is not a loss');
assert(query.includes("'difera_orientativ'"),'Differences are descriptive, not cheating verdicts');
assert(!/\b(?:auth\.users|game_saves|throne_profiles|email|password|ip_address|challenger_units|holder_units)\b/i.test(query),
 'Query must not read or disclose saved characters/identifiers/gear');
assert(sql31.includes('CREATE TABLE IF NOT EXISTS public.beta_throne_challenge_shadow'));
assert(sql32.includes('CREATE TABLE IF NOT EXISTS public.beta_throne_duel_simulations'));
assert(sql33.includes("result_field='client_claim_via_rpc'"));
assert(roadmap.includes('**SQL33 instalat în BETA, cu toate cele 8 verificări SQL confirmate:**'),
 'Roadmap must acknowledge confirmed SQL33 installation');

function label({complete,holder,reported,predicted}){
 if(!complete)return 'neterminat';
 if(!holder)return 'garda_nu_e_simulata';
 if(reported==null)return 'verdict_absent';
 if(predicted==null)return 'simulare_neconcludenta';
 return reported===predicted?'concorda_orientativ':'difera_orientativ';
}
for(const [caseName,data,want] of [
 ['pending',{complete:false,holder:true,reported:true,predicted:true},'neterminat'],
 ['royal guard',{complete:true,holder:false,reported:true,predicted:null},'garda_nu_e_simulata'],
 ['missing claim',{complete:true,holder:true,reported:null,predicted:true},'verdict_absent'],
 ['draw',{complete:true,holder:true,reported:false,predicted:null},'simulare_neconcludenta'],
 ['agree',{complete:true,holder:true,reported:false,predicted:false},'concorda_orientativ'],
 ['disagree',{complete:true,holder:true,reported:true,predicted:false},'difera_orientativ']
]) assert.equal(label(data),want,'Classification '+caseName);
console.log('OK: SQL31–33 diagnostic is read-only, anonymized, bounded and classifies 6 combat-audit states without adjudicating wins.');
