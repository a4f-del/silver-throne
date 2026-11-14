/* Silver Throne — salvare verificată de server (SQL46): jocul salvează prin save_game și aplică corecțiile.
 * Run: node dev/test-verified-save.js */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const cont=read('cont.js'),sql=read('supabase/46-salvare-verificata.sql'),pf=read('portofel.js'),html=read('index.html');

// server
assert(/CREATE OR REPLACE FUNCTION public\.save_game\(p_data jsonb\)/.test(sql),'save_game');
assert(/REVOKE INSERT, UPDATE, TRUNCATE ON TABLE public\.game_saves FROM authenticated, anon/.test(sql),'Fără scriere directă în game_saves');
assert(/DROP POLICY IF EXISTS game_saves_update/.test(sql),'Politica de scriere eliminată');
assert(sql.includes('public.wallet_sync(')&&sql.includes('EXCEPTION WHEN OTHERS'),'Portofelul verifică aurul fără să blocheze salvarea');
assert(sql.includes('v_first')&&sql.includes('punctul de plecare'),'Progresul existent devine punctul de plecare');
assert(/IF public\.is_beta_admin\(\) THEN/.test(sql),'Administratorii testează liber');
const tables=JSON.parse(sql.match(/SELECT '(\{.*?\})'::jsonb/)[1]);
assert.equal(tables.need.length,60,'Experiența pe 60 de niveluri');assert.equal(tables.cap.length,60,'Limitele obiectelor pe 60 de niveluri');
for(const c of tables.cap)for(const k of ['dmg','def','hp','crit'])assert(c[k]>0,'limită pozitivă '+k);
assert(tables.cap[49].dmg>tables.cap[0].dmg,'Limitele cresc cu nivelul');
assert(html.includes('portofel.js?v=2026.11.14-1')&&pf.includes('CONT.saveRpc'),'pfSync se oprește când save_game merge');

// client: corecțiile se aplică păstrând ce s-a schimbat între timp
const ctx={S:{gold:900,ore:50,mat:{zim:3,sng:1},lvl:20,xp:10,pts:40,bp:300,st:{f:99},inv:[{n:'x'}],fs:[{n:'E',eq:{w:{s:{dmg:1}}}}],rs:[]},
 localStorage:{setItem(){}},SKEY:'k',go(){ctx.went=1},console};
vm.createContext(ctx);vm.runInContext(cont.slice(cont.indexOf('function contApplyFix('),cont.indexOf('async function contPush(')),ctx);
const sent={gold:1000,ore:50,mat:{zim:3},lvl:20,xp:10};
vm.runInContext('contApplyFix',ctx)({ok:true,fixed:true,fix:{gold:500,ore:50,mat:{zim:2},lvl:15,xp:7,bp:120,st:{f:33}},
 data:{inv:[{n:'y'}],fs:[{n:'E',eq:{w:{s:{dmg:0}}}}],rs:[]}},sent);
assert.equal(ctx.S.gold,400,'aur: valoarea serverului minus ce s-a cheltuit între timp');
assert.deepEqual({...ctx.S.mat},{zim:2,sng:1},'materiale: serverul + ce a apărut între timp');
assert.equal(ctx.S.lvl,15);assert.equal(ctx.S.xp,7);assert.equal(ctx.S.bp,120);assert.equal(ctx.S.st.f,33);
assert.equal(ctx.S.inv[0].n,'y','obiectele corectate');assert.equal(ctx.S.fs[0].eq.w.s.dmg,0);
assert(/Serverul a corectat/.test(ctx.S.msg)&&ctx.went,'jucătorul vede corecția');
const before=JSON.stringify(ctx.S);vm.runInContext('contApplyFix',ctx)({ok:true,fixed:false,fix:{}},sent);
assert.equal(JSON.stringify(ctx.S),before,'fără corecții nu se schimbă nimic');
assert(cont.includes("rpc('save_game', { p_data: S })")&&cont.includes('CONT.noRpc = true'),'save_game, cu revenire la scrierea veche dacă SQL46 lipsește');
console.log('OK: salvare verificată (server + aplicarea corecțiilor).');
