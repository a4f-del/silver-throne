/* Silver Throne — înscriere publică (SQL45): orice cont confirmat poate juca, administrarea rămâne doar pentru admini.
 * Run: node dev/test-public-signup.js */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const cont=read('cont.js'),sql=read('supabase/45-inscriere-publica.sql'),lume=read('lume.js'),tron=read('tron.js'),html=read('index.html');
new Function(cont);

// clientul: fără poarta de admin la intrare, cu Cont nou și verificarea suspendării
const enter=cont.slice(cont.indexOf('async function contEnter('),cont.indexOf('function contBoot('));
assert(!enter.includes("rpc('is_beta_admin')"),'Intrarea în joc nu mai cere administrator');
assert(enter.includes("rpc('st_can_play')")&&enter.includes('suspendat'),'Conturile blocate sunt refuzate explicit');
assert(cont.includes('async function contUp(')&&cont.includes('supabaseClient.auth.signUp('),'Există crearea contului');
assert(cont.includes("onclick=\"contShow('up')\">Cont nou</button>"),'Fila Cont nou');
assert(!cont.includes('Acces exclusiv administratorilor')&&!cont.includes('exclusiv administratori'),'Fără mesajele de acces restrâns');
assert(/p1\.length < 8/.test(cont),'Parolă de minimum 8 caractere la cont nou');
assert(html.includes('cont.js?v=2026.11.14-1'),'cont.js cache-busted');

// instrumentele de test rămân de administrator
assert(lume.includes("CONT.admin === true"),'Modul de test al raidurilor doar pentru admini');
assert(/DEV\(\) && ho && prot > 0/.test(tron),'Resetarea protecției Tronului doar prin DEV() (admin)');

// serverul
assert(/CREATE OR REPLACE FUNCTION public\.st_can_play\(\)/.test(sql),'st_can_play');
assert(sql.includes('public.st_bans'),'Lista de conturi blocate');
for(const f of ['rune_admin','beta_world_raid_test_mode','beta_throne_reset_protection'])
  assert(!new RegExp("'"+f+"\\(").test(sql.slice(sql.indexOf('player_fns'),sql.indexOf('BEGIN',sql.indexOf('player_fns')))),f+' rămâne doar pentru admini');
for(const f of ['world_join(jsonb)','guild_api(text,jsonb)','guild_chat_api(text,jsonb)','throne_publish(text,integer,jsonb)','rune_buy(text,integer)','rune_state()'])
  assert(sql.includes("'"+f+"'"),f+' deschisă jucătorilor');
assert(sql.includes("replace(d, 'public.is_beta_admin()', 'public.st_can_play()')"),'Se înlocuiește doar poarta');
assert(/CREATE POLICY game_saves_update[\s\S]*st_can_play/.test(sql),'Salvările: propriul rând, fără poarta de admin');
console.log('OK: înscriere publică; administrarea rămâne restrânsă.');
