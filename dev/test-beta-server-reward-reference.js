/* Silver Throne BETA / SQL24: deterministic reference for raid journal rewards.
 * Run: node dev/test-beta-server-reward-reference.js
 * Static SQL + numerical model; NOT a PostgreSQL integration or wallet-security test. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const sql=read('supabase/24-beta-world-server-reward-reference.sql');
const before=read('supabase/21-beta-world-competitive-hardening.sql');
const shadow=read('supabase/22-beta-world-shadow-combat-audit.sql');
const saveAudit=read('supabase/23-beta-save-progress-audit.sql');
const client=read('lume.js');
const markers=[
 'Silver-Throne-Test DUPA SQL 21, 22 si 23',
 'CREATE TABLE IF NOT EXISTS public.beta_world_reward_reference',
 'ALTER TABLE public.beta_world_reward_reference ENABLE ROW LEVEL SECURITY',
 'REVOKE ALL ON TABLE public.beta_world_reward_reference FROM PUBLIC, anon, authenticated',
 'credited_to_wallet boolean NOT NULL DEFAULT false',
 'CREATE OR REPLACE FUNCTION public.world_raid_finish(',
 "LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''",
 'public.is_beta_admin()',
 'WHERE id = p_id AND attacker = v_uid FOR UPDATE',
 'IF v_r.finished_at IS NOT NULL THEN',
 'FROM public.beta_world_combat_shadow',
 'v_att_level := GREATEST(1,LEAST(500,COALESCE(v_att_level,1)))',
 'v_level := LEAST(v_def_level,v_att_level+5)',
 'v_factor := GREATEST(0.3,LEAST(1.2,v_def_level::numeric/v_att_level))',
 '(9+3*v_att_level)*2.55',
 '(8+4*v_att_level)*2.55',
 'UPDATE public.world_raids',
 'ON CONFLICT(raid_id) DO NOTHING',
 'UPDATE public.world_players',
 "'reward_source','server_reference_not_wallet'",
 'GRANT EXECUTE ON FUNCTION public.world_raid_finish(bigint,boolean,integer,integer)',
 'sql22_finish_trigger_preserved'
];
for(const m of markers)assert(sql.includes(m),'SQL24 missing '+m);
assert(!/\b(?:DROP TABLE|TRUNCATE TABLE|DELETE FROM)\b/i.test(sql),'Destructive migration');
assert(!/\b(?:INSERT INTO|UPDATE|DELETE FROM)\s+public\.game_saves\b/i.test(sql),'Cannot write wallet save');
assert(!/CREATE OR REPLACE FUNCTION public\.(?:world_join|world_raid_start|throne_publish|guild_api)\b/i.test(sql),'Only finish RPC may change');
assert.equal((sql.match(/CREATE OR REPLACE FUNCTION/gi)||[]).length,1);
assert.equal((sql.match(/\$finish\$/g)||[]).length,2);
assert.equal((sql.match(/\$guard\$/g)||[]).length,2);
assert(before.includes('CREATE TABLE IF NOT EXISTS public.beta_world_result_audit'));
assert(shadow.includes('CREATE TABLE IF NOT EXISTS public.beta_world_combat_shadow'));
assert(saveAudit.includes('CREATE TABLE IF NOT EXISTS public.beta_save_progress_audit'));
assert(client.includes("tronRpc('world_raid_finish', { p_id: c.id, p_win: !!c.win, p_gold: c.gold | 0, p_xp: c.xp | 0 })"),'Browser RPC shape intact');
// No influence of client-claimed loot on server-derived score.
function reward(attacker,defender,win,claimedGold=0,claimedXp=0){
  const A=Math.max(1,Math.min(500,attacker)),D=Math.max(1,Math.min(500,defender));
  const level=Math.min(D,A+5),f=Math.max(.3,Math.min(1.2,D/A));
  return win?{
    gold:Math.round((60+30*level)*f+(9+3*A)*2.55),
    xp:Math.round((20+8*level)*f*1.5+(8+4*A)*2.55)
  }:{gold:0,xp:0};
}
assert.deepEqual(reward(50,50,true),{gold:1965,xp:1160});
assert.deepEqual(reward(50,50,true,999999999,999999999),reward(50,50,true));
assert.deepEqual(reward(50,50,false,999999999,999999999),{gold:0,xp:0});
for(const A of [1,5,15,25,50,200,500])for(const D of [1,5,15,25,50,200,500]){
  const x=reward(A,D,true);assert(Number.isSafeInteger(x.gold)&&x.gold>=0);
  assert(Number.isSafeInteger(x.xp)&&x.xp>=0);
}
assert(!sql.includes('UPDATE public.game_saves'),'Source of truth is NOT a game wallet');
console.log('OK: BETA SQL24 server-calculated raid reference, idempotency, no client loot trust or wallet writes. PvP victory still client-declared.');
