/* Silver Throne BETA — prima pradă și prima armă; doar eroii noi.
 * Prezintă recompensa REALĂ, fără obiecte garantate sau modificări de economie. */
function jeStarterActive(){
 return typeof jeFocus==='function'&&jeFocus()&&typeof jeReady==='function'&&jeReady();
}
function jeFirstLootCapture(d,gold){
 if(!jeStarterActive()||S.jeFirstLoot||!d||!d.one||d.raid!=null||d.di!==0||!d.done)return;
 const loot=d.loot||{};
 S.jeFirstLoot={gold:Math.max(0,Math.round(Number(gold)||0)),
  ore:Math.max(0,Math.round(Number(loot.ore)||0)),
  xp:Math.max(0,Math.round(Number(loot.xp)||0)),
  items:(loot.it||[]).filter(Boolean).slice(0,5).map(it=>({name:String(it.name||'Obiect'),t:it.t}))};
}
function jeFirstLootPanel(){
 if(!jeStarterActive()||!S.jeFirstLoot||typeof jeCurrent!=='function')return '';
 const step=jeCurrent();
 if(!step||step.id!=='poarta'||!jeStatus(step).ok)return '';
 const v=S.jeFirstLoot,items=Array.isArray(v.items)?v.items:[];
 return '<div class="je-first-loot"><b>✦ Prima victorie în Mina Cenușie!</b>'+
 '<div class="je-first-loot-line"><span>💰 '+(Number(v.gold)||0)+' aur</span>'+
 '<span>⛏ '+(Number(v.ore)||0)+' minereu</span>'+
 '<span>★ '+(Number(v.xp)||0)+' XP</span></div>'+
 (items.length?'<small>Pradă găsită: '+items.map(it=>tEsc(it.name)).join(', ')+'. O găsești în Echipă → Rucsac.</small>':
 '<small>Nu a căzut un obiect de această dată. Următoarea etapă te conduce la Topitorie pentru prima armă.</small>')+
 '<small>Revendică și premiul jurământului de mai jos, separat de pradă.</small></div>';
}
function jeStarterStep(){
 if(!jeStarterActive()||typeof jeCurrent!=='function')return null;
 const s=jeCurrent();return s&&s.id==='otel'&&typeof jeStatus==='function'&&!jeStatus(s).ok?s:null;
}
function jeStarterHero(){
 return (S.fs||[]).find(f=>f&&f.h)||(S.fs||[])[0]||null;
}
function jeStarterWeaponList(){
 const hero=jeStarterHero();if(!hero)return [];
 return (S.inv||[]).map((it,i)=>({it,i})).filter(x=>x.it&&x.it.t==='w')
  .map(x=>{
   const style=typeof wfOf==='function'&&typeof WF!=='undefined'?WF[wfOf(x.it)]:null;
   const good=!style||style.c===hero.c; /* recomandăm clasa eroului; alte arme rămân în inventar */
   const score=typeof bsc==='function'?bsc(x.it,hero):typeof invScore==='function'?invScore(x.it):0;
   return {...x,good,score};
  }).sort((a,b)=>Number(b.good)-Number(a.good)||b.score-a.score||a.i-b.i);
}
function jeStarterWeaponPanel(){
 if(!jeStarterStep()||S.tab!=='e')return '';
 const hero=jeStarterHero(),item=jeStarterWeaponList().find(x=>x.good);
 const existing=hero&&hero.eq&&hero.eq.w;
 let h='<section class="je-first-weapon" aria-label="Prima armă a eroului">'+
  '<div class="je-first-caption">✦ DRUMUL EROULUI · PRIMA ARMĂ</div>'+
  '<h2>Pregătește eroul pentru următoarea luptă</h2>';
 if(item){
  const oldScore=existing?(typeof bsc==='function'?bsc(existing,hero):invScore(existing)):0;
  const better=!existing||item.score>oldScore;
  h+='<p>Am găsit în rucsac o armă potrivită pentru <b>'+tEsc(hero.n)+'</b>.</p>'+
   '<div class="je-first-weapon-pick"><div><b>'+tEsc(item.it.name)+'</b>'+
   '<small>'+(existing?(better?'▲ Mai puternică decât arma actuală.':'Compară cu arma echipată înainte de schimbare.'):
    '✓ Slotul de armă este gol: aceasta îți oferă primul bonus de echipament.')+
   '</small></div><button class="p je-first-equip" onclick="jeEquipStarterWeapon('+item.i+')">⚔ Pune pe Erou</button></div>'+
   '<small>Nu trebuie să cauți arma prin filtre. Restul rucsacului rămâne disponibil mai jos.</small>';
 }else{
  h+='<p>Nu ai încă o armă potrivită pentru erou în rucsac. Este în regulă: prada din Temnițe este aleatorie.</p>'+
   '<button class="p je-first-forge-go" onclick="jeGoStarterForge()">⚒ Mergi la Topitorie</button>'+
   '<small>Acolo poți pregăti o sabie pentru Campion, fără să înveți toate opțiunile Fierăriei.</small>';
 }
 return h+'</section>';
}
function jeEquipStarterWeapon(i){
 if(!jeStarterStep()||S.d||!Number.isInteger(Number(i)))return;
 const x=jeStarterWeaponList().find(x=>x.i===Number(i)&&x.good);
 if(!x)return;
 const hero=jeStarterHero(),idx=(S.fs||[]).indexOf(hero);
 if(!hero||idx<0||typeof equip!=='function')return;
 S.sel=idx;S.tab='e';equip(x.i); /* Folosește exact echiparea originală, cu contorul normal. */
}
function jeGoStarterForge(){
 if(!jeStarterActive()||S.d)return;
 S.tab='a';S.vil='a';S.msg='';go();
}
function jeStarterForgeHint(){
 if(!jeStarterActive()||S.tab!=='a'||S.vil!=='a')return '';
 const step=jeCurrent();if(!step||!['urme','otel'].includes(step.id))return '';
 if(step.id==='otel'&&jeStarterWeaponList().some(x=>x.good))
  return '<div class="je-first-forge"><b>⚔ Ai deja o armă în rucsac.</b> <button class="p" onclick="S.tab=\'e\';go()">Mergi la Echipă și pune-o</button></div>';
 const weapon=S.ui&&(typeof wfUi==='function'?wfUi():(S.ui.wf||'sab'));
 const picked=S.ui&&S.ui.t==='w'&&typeof WF!=='undefined'&&WF[weapon]?.c==='Campion';
 return '<div class="je-first-forge"><b>⚔ Prima armă a eroului</b><p>La început alege <b>Armă → Sabie</b>, potrivită clasei Campion. Forjarea folosește regulile și materialele obișnuite.</p>'+
 (picked?'<small>Sabia este selectată. Apasă „Forjează” mai jos, apoi ridică obiectul când este gata.</small>':
 '<button class="p je-first-prepare" onclick="jePrepareStarterForge()">Selectează sabia eroului</button>')+'</div>';
}
function jePrepareStarterForge(){
 if(!jeStarterActive()||S.d||S.tab!=='a'||S.vil!=='a')return;
 const step=jeCurrent();if(!step||!['urme','otel'].includes(step.id))return;
 S.ui=S.ui||{};S.ui.t='w';S.ui.wf='sab';S.ui.l=Math.max(1,Math.min(S.lvl,Number(S.ui.l)||S.lvl));
 S.ui.r=0;S.ui.q=0;S.ui.p=0;S.ui.s=0;
 S.msg='Sabia pentru erou este selectată. Poți începe forjarea.';go();
}
(function(){
 if(typeof document==='undefined'||!document.head)return;
 const st=document.createElement('style');
 st.textContent=[
 '.je-first-loot{background:#161e20;border:1px solid #92703e;border-radius:9px;padding:9px 11px;margin:8px 0;display:grid;gap:6px}',
 '.je-first-loot>b,.je-first-weapon h2,.je-first-forge>b{color:#f0d27a}',
 '.je-first-loot-line{display:flex;flex-wrap:wrap;gap:5px 15px;font-weight:700;font-size:13px}',
 '.je-first-loot small,.je-first-weapon small,.je-first-forge small{font-size:12px;color:#c9c2b4;line-height:1.35}',
 '.je-first-weapon,.je-first-forge{background:linear-gradient(#202a2c,#11191c);border:1px solid #92703e;border-radius:11px;padding:12px 14px;margin:8px 0 13px}',
 '.je-first-caption{font-size:11px;letter-spacing:.06em;color:#f0d27a}',
 '.je-first-weapon h2{font:700 clamp(16px,2.5vw,21px) Cinzel,Georgia,serif;margin:5px 0 8px}',
 '.je-first-weapon p,.je-first-forge p{margin:4px 0 9px;line-height:1.35}',
 '.je-first-weapon-pick{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:9px;border-radius:8px;background:#10171b;border:1px solid #655339;margin-bottom:6px}',
 '.je-first-weapon-pick>div{display:grid;gap:4px;min-width:0;flex:1}',
 '.je-first-weapon-pick b{color:#eee1ca;overflow-wrap:anywhere}',
 '.je-first-weapon button,.je-first-forge button{min-height:38px;padding:6px 12px}',
 '@media(max-width:520px){.je-first-weapon-pick button{width:100%}.je-first-weapon,.je-first-forge{padding:10px}}'
 ].join('\n');
 document.head.appendChild(st);
})();
