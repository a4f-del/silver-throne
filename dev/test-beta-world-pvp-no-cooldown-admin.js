/* Silver Throne BETA SQL29: administrator PvP cooldown bypass.
 * Run: node dev/test-beta-world-pvp-no-cooldown-admin.js
 * Static checks and executable client gate model. NO PostgreSQL writes. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/29-beta-world-pvp-no-cooldown-admin.sql');
const client=read('lume.js');
const html=read('index.html');
const old=read('supabase/02-lume.sql');
for(const marker of [
 'SQL28 este independent',
 'CREATE TABLE IF NOT EXISTS public.beta_world_raid_test_settings',
 'ALTER TABLE public.beta_world_raid_test_settings ENABLE ROW LEVEL SECURITY',
 'REVOKE ALL ON TABLE public.beta_world_raid_test_settings',
 'CREATE OR REPLACE FUNCTION public.beta_world_raid_test_mode(',
 "p_enabled boolean DEFAULT NULL",
 'v_uid IS NULL OR NOT public.is_beta_admin()',
 'CREATE OR REPLACE FUNCTION public.world_raid_start(p_target uuid)',
 "LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''",
 'IF NOT v_bypass THEN',
 "v_last>now()-make_interval(hours=>(v_cfg->>'same_h')::integer)",
 'PERFORM public.world_close_stale(v_uid)',
 'IF v_me.level <',
 'IF p_target=v_uid',
 'AND r.finished_at IS NULL',
 'IF v_target.level <',
 'v_en:=public.world_en(v_me.en,v_me.en_t)',
 'IF v_en<1 THEN',
 'SET en=v_en-1,en_t=now()',
 'INSERT INTO public.world_raids(attacker,defender)',
 'test_cooldown_bypass',
 'REVOKE ALL ON FUNCTION public.beta_world_raid_test_mode(boolean)',
 'GRANT EXECUTE ON FUNCTION public.world_raid_start(uuid)',
 'sql26_ledger_trigger_preserved',
 'direct_settings_write_denied'
])assert(sql.includes(marker),'SQL29 missing guard '+marker);
for(const name of ['prerequisites','mode','raid'])
 assert.equal((sql.match(new RegExp('\\$'+name+'\\$','g'))||[]).length,2);
assert.equal((sql.match(/^CREATE OR REPLACE FUNCTION/gm)||[]).length,2);
assert(!/\b(?:DELETE FROM|TRUNCATE TABLE|DROP TABLE)\b/i.test(sql));
assert(!/\b(?:UPDATE|INSERT INTO)\s+public\.(?:game_saves|wallet|beta_economy_accounts)\b/i.test(sql));
assert(sql.indexOf('IF NOT v_bypass THEN')<sql.indexOf('v_en:=public.world_en'));
assert(sql.indexOf('IF v_target.level <')<sql.indexOf('IF NOT v_bypass THEN'));
assert(sql.indexOf('AND r.finished_at IS NULL')<sql.indexOf('IF NOT v_bypass THEN'));
assert(sql.indexOf('IF v_en<1 THEN')>sql.indexOf('IF NOT v_bypass THEN'));
assert(old.includes("insert into world_raids (attacker, defender) values (uid, p_target)"));
assert(client.includes("tronRpc('beta_world_raid_test_mode', { p_enabled: null })"));
assert(client.includes("tronRpc('beta_world_raid_test_mode', { p_enabled: requested })"));
assert(client.includes('const lwTestCooldownAllowed = () =>'));
assert(client.includes("p.cd && p.cd > lwNow() && !lwTestCooldownOn()"));
assert(client.includes('cd = p.cd && p.cd > lwNow() && !lwTestCooldownOn()'));
assert(client.includes('$'+'{lwTestCooldownPanel()}'+'$'+'{lwMap()}'));
assert(client.includes('Consumă în continuare energie'));
assert(html.includes('lume.js?v=2026.11.09-1'));

const start=client.indexOf('function lwCan(p) {');
const end=client.indexOf('async function lwAttack(',start);
assert(start>=0&&end>start,'Cannot find attack gate');
const gateSource=client.slice(start,end);
const S={lvl:50,d:null,wr:{cur:null},fs:[{hp:100}]};
const LUME={st:{me:{user_id:'mine'},players:[]}};
let bypass=false, energy=3;
const gate=new Function('LUME','S','lwCfg','lwEn','lwNow',
 'lwTestCooldownOn','tEsc','sdT','fmt',
 gateSource+'; return lwCan;')(
 LUME,S,()=>({min_level:5}),()=>({n:energy,next:60000}),()=>1000,
 ()=>bypass,s=>s,()=> 'test time',()=> '1 minut');
const p={id:'target',level:50,cd:2000,name:'Adversar'};
assert.equal(gate(p).ok,false,'Regular cooldown enforced');
assert.match(gate(p).why,/recent/);
bypass=true;
assert.equal(gate(p).ok,true,'BETA bypass permits same target');
energy=0;
assert.equal(gate(p).ok,false,'Even with bypass, energy is required');
energy=3;
assert.equal(gate({...p,level:1}).ok,false,'Beginner protection remains');
assert.equal(gate({...p,id:'mine'}).ok,false,'Cannot attack oneself');
S.d={};
assert.equal(gate(p).ok,false,'Cannot start while already fighting');
S.d=null;S.wr.cur={id:5};
assert.equal(gate(p).ok,false,'Pending prior result must be reported');
console.log('OK: SQL29 admin-only server bypass; CD-only exception, energy and beginner protections intact; UI and cache updated.');
