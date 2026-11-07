/* Silver Throne — BETA: carduri mari în Temnițe/Turn.
   Doar prezentare: nu modifică daune, costuri, selecția țintei sau recompensele. */
function acEnabled() { return typeof ST_SERVER !== 'undefined' && ST_SERVER === 'beta'; }
function acSafe(x) { return typeof tEsc === 'function' ? tEsc(String(x == null ? '' : x)) : String(x == null ? '' : x).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function acArtwork(name, boss, dungeon) {
  if (boss && typeof tmnBoss === 'function') {
    const data = tmnBoss(name) || (dungeon && dungeon.bn ? tmnBoss(dungeon.bn) : null);
    if (data) return 'imagini/monstri/' + data[0] + '.jpg';
  }
  const src = typeof monImg === 'function' ? monImg(name) : null;
  if (src) return src;
  /* Turn: străjerii nu au mereu portret propriu; folosim monstrul etajului. */
  if (boss && typeof twMob === 'function' && dungeon && dungeon.tw)
    return typeof monImg === 'function' ? monImg(twMob(dungeon.room)) : null;
  return null;
}
function acArt(src, cls) {
  return src ? '<img class="' + (cls || '') + '" src="' + acSafe(src) + '" alt="" loading="lazy" onerror="this.replaceWith(document.createTextNode(\'⚔\'))">' : '<span class="ac-no-art" aria-hidden="true">⚔</span>';
}
function acParty() {
  return '<div class="ac-party"><div class="ac-small-title">Echipa ta</div><div class="ac-party-list">' +
    S.fs.map((f, i) => {
      const max = Math.max(1, mhp(f)), hp = Math.max(0, f.hp);
      return '<div class="ac-ally' + (hp <= 0 ? ' ac-fallen' : '') + '">' +
        '<div class="ac-ally-face">' + av(f, 76) + '</div>' +
        '<div class="ac-ally-info"><b>' + acSafe(f.n) + '</b><small>' + (f.h ? 'Erou' : acSafe(f.c || 'Mercenar')) + '</small>' +
        '<div class="ac-hp"><i style="width:' + Math.max(0, Math.min(100, Math.round(hp/max*100))) + '%"></i></div>' +
        '<small>' + hp + ' / ' + max + ' viață</small></div></div>';
    }).join('') + '</div></div>';
}
function acDungeonPage(i) {
  const g=DG[i], names=typeof trNames==='function' ? trNames(i) : null;
  if (!g || !names || !names.length) return '';
  const d=dMk(i),p=d.room,sel=typeof trSel==='function' ? trSel(i) : p, boss=sel===names.length-1;
  const selected=names[sel], data=typeof trDef==='function' ? trDef(g.n) : null;
  const art=acArtwork(selected,boss,g),stats=typeof monStatsAt==='function' ? monStatsAt(i,sel,boss) : null;
  const canFight=sel===p;
  const rail=names.map((name,k)=>{
    const end=k===names.length-1, done=k<p, current=k===p, image=acArtwork(name,end,g);
    return '<button class="ac-step' + (done?' ac-done':'') + (current?' ac-current':'') +
      (k===sel?' ac-selected':'') + (end?' ac-boss':'') + '" onclick="trSelSet('+i+','+k+')" aria-pressed="'+(k===sel)+'" title="'+acSafe(name)+'">' +
      '<span class="ac-step-art">'+acArt(image)+'</span><span class="ac-step-text">'+(done?'✓ ':end?'♛ ':'')+acSafe(name)+'</span>' +
      '<small>'+ (done?'Învins':current?'Urmează':end?'Căpitan':'În așteptare') +'</small></button>';
  }).join('');
  const cost=dCostAt(i),odds=canFight&&typeof dOddsAt==='function'?dOddsAt(i):null;
  let detail='<div class="ac-facts">';
  if(stats)detail+='<span>❤ '+stats.hp+' viață estimată</span><span>⚔ '+stats.atk+' atac estimat</span>';
  if(boss&&data&&typeof TR_A!=='undefined'&&TR_A[data.a])
    detail+='<div class="ac-ability"><b>♛ Abilitatea căpitanului</b><span>'+acSafe(TR_A[data.a])+'</span></div>';
  detail+='</div>';
  return '<section class="ac-scene"><div class="ac-scene-head"><div><small>Temniță · Eroul este plecat din Sat</small><h2>'+acSafe(g.n)+'</h2></div>' +
    '<button class="ac-retreat" onclick="adventureExit()">‹ Retrage-te</button></div>' +
    '<div class="ac-progress"><b>Progres '+(p+1)+' / '+names.length+'</b><div class="ac-rail">'+rail+'</div></div>' +
    '<div class="ac-layout"><div class="ac-main-card'+(boss?' ac-main-boss':'')+'"><div class="ac-main-portrait">'+acArt(art) +
    '<span class="ac-status">'+(boss?'♛ Căpitan':canFight?'⚔ Următorul adversar':sel<p?'✓ Învins':'🔒 Urmează')+'</span></div>' +
    '<div class="ac-main-info"><h3>'+acSafe(selected)+'</h3>'+detail+'</div></div>' +
    '<div class="ac-side"><h3>'+ (canFight?'Pregătirea luptei':'Informații despre adversar') +'</h3>' +
    (canFight&&odds!=null?'<div class="ac-odds">Șanse de câștig <strong>'+odds+'%</strong></div>':'') +
    '<p class="ac-hint">'+(canFight?'Poți porni lupta cu echipa actuală.':sel<p?'Ai învins acest adversar.':'Adversarul va deveni disponibil după luptele anterioare.')+'</p>' +
    '<p class="ac-hint">Echipament recomandat: <b>'+acSafe(typeof recGear==='function'?recGear(d.k):'echipament potrivit nivelului')+'</b></p>' +
    (canFight?'<button class="p ac-primary" onclick="startD('+i+')">'+(boss?'⚔ Înfruntă căpitanul':'⚔ Luptă')+' · '+(cost?cost+' puncte':'gratuit')+'</button>':'') +
    '</div></div>'+acParty()+'</section>';
}
function acCombatPage(d) {
  const f=d.f, title=d.tw?'Turnul · Etajul '+Math.max(1,d.room):d.raid!=null?(d.lbl||'Raid')+' · '+(d.rn||''):DG[d.di||0].n;
  const enemies=f?f.es.map((e,i)=>{
    const boss=!!e.b, selected=i===f.t, gone=e.hp<=0, src=acArtwork(e.n,boss,d),
      max=Math.max(1,e.mh),hp=Math.max(0,e.hp);
    return '<button class="ac-enemy'+(boss?' ac-enemy-boss':'')+(selected?' ac-target':'')+(gone?' ac-fallen':'')+'" onclick="tgt('+i+')"'+(gone?' disabled':'')+' aria-pressed="'+selected+'" aria-label="'+acSafe(e.n)+', '+hp+' din '+max+' viață">' +
      '<span class="ac-enemy-image">'+acArt(src)+'</span>' +
      '<span class="ac-enemy-body"><b>'+acSafe(e.n)+'</b><small>'+(boss?'♛ Căpitan / Străjer':selected?'⚔ Ținta selectată':'Atinge pentru țintire')+'</small>' +
      '<span class="ac-hp ac-enemy-hp"><i style="width:'+Math.min(100,Math.round(hp/max*100))+'%"></i></span>' +
      '<small>'+hp+' / '+max+' viață · ⚔ '+Math.round(e.atk||0)+'</small></span></button>';
  }).join(''):'';
  let actions='';
  if(f) {
    const unit=S.fs[f.i], alive=unit&&unit.hp>0;
    actions='<div class="ac-turn-actions"><span>'+ (alive?'Tura lui <b>'+acSafe(unit.n)+'</b> · ❤ '+unit.hp+'/'+mhp(unit):'Alege o acțiune')+'</span>' +
      '<div><button onclick="act(\'n\')">⚔ Lovește</button>' +
      '<button class="p" onclick="act(\'s\')"'+(unit&&unit.cd>0?' disabled':'')+'>'+acSafe(unit&&CL[unit.c]?CL[unit.c].sp:'Abilitate')+(unit&&unit.cd>0?' ('+unit.cd+')':'')+'</button>' +
      '<button onclick="autoRun()">Automat</button></div></div>';
  } else if(d.done) actions='<p>Ai învins căpitanul.</p>';
  else actions=dNext(d);
  const loot=d.loot||{gold:0,ore:0,xp:0,m:{}};
  const materials=Object.values(loot.m||{}).reduce((n,x)=>n+(Number(x)||0),0);
  const items=(loot.it||[]).map(it=>acSafe(it.name)).join(', ');
  return '<section class="ac-scene ac-combat"><div class="ac-scene-head"><div><small>'+(d.tw?'Urcare în Turn':'Temniță în desfășurare')+'</small><h2>'+acSafe(title)+'</h2></div>' +
    '<span class="ac-earn">Pradă: '+(loot.gold||0)+' aur · '+(loot.ore||0)+' minereu · '+materials+' materiale · '+(loot.xp||0)+' XP'+(items?' · '+items:'')+'</span></div>' +
    (f?'<div class="ac-fight-top"><span>Alege ținta · portrete mari</span><div class="ac-enemy-list">'+enemies+'</div></div>':'') +
    (f&&f.log&&f.log.length?'<div class="ac-battle-log">'+f.log.slice(-3).map(x=>'<div>'+acSafe(x)+'</div>').join('')+'</div>':'') +
    '<div class="ac-battle-options"><label><input type="checkbox" '+(S.auto!==false?'checked':'')+' onchange="tg(\'auto\')"> Redare automată</label>' +
    '<label>Țintire <select onchange="tg(\'rule\',this.value)">'+[['weak','Cel mai slab'],['strong','Cel mai puternic'],['first','Primul']].map(a=>'<option value="'+a[0]+'"'+((S.rule||'weak')===a[0]?' selected':'')+'>'+a[1]+'</option>').join('')+'</select></label></div>' +
    (S.fl&&!f?'<div class="log">'+S.fl.slice(-4).map(x=>'<div>'+acSafe(x)+'</div>').join('')+'</div>':'') +
    actions+acParty()+(f?'<button class="d ac-bottom-retreat" onclick="flee()">Fugi · pierzi jumătate din pradă</button>':'<button class="d ac-bottom-retreat" onclick="leave()">Ieși cu prada</button>')+'</section>';
}
function acFxMarkup(cast,hp) {
  const make=(side,x,i)=>{
    const max=Math.max(1,x.mh),alive=Math.max(0,hp[side][i]),enemy=side==='es';
    const art=enemy?(x.img?acArt(x.img):cast.pvp&&x.c?av({n:x.n,c:x.c,ic:x.ic,h:x.h},110):acArt(null)):av({n:x.n,c:x.c,ic:x.ic,h:x.h},80);
    return '<div class="fx-r ac-fx-card'+(enemy?' ac-fx-enemy':' ac-fx-ally')+'" data-s="'+side+'" data-i="'+i+'">' +
      '<div class="fx-av ac-fx-art">'+art+'</div><b class="ac-fx-name">'+acSafe(x.n)+'</b>' +
      '<i class="fx-hp"><i style="width:'+Math.max(0,Math.min(100,Math.round(alive/max*100)))+'%"></i></i>' +
      '<small class="fx-t">'+alive+'/'+max+'</small></div>';
  };
  return '<div class="fx-c ac-fx-shell"><div class="ac-fx-title"><small>Silver Throne · Aventură</small><h2>'+acSafe(cast.adventureTitle||'Luptă')+'</h2></div>' +
    '<div class="ac-fx-enemies">'+cast.es.map((e,i)=>make('es',e,i)).join('')+'</div>' +
    '<div class="ac-fx-divider">⚔</div><div class="ac-fx-allies">'+cast.fs.map((f,i)=>make('fs',f,i)).join('')+'</div>' +
    '<div class="fx-log" id="fx-log" aria-live="polite"></div><button class="fx-skip" onclick="fxSkip()">Sari peste ›</button></div>';
}
function acFxAnimate(modal,frame) {
  if(!modal||!modal.classList.contains('ac-fx-mode'))return;
  const actor=frame.actor&&frame.actor.side?modal.querySelector('.fx-r[data-s="'+frame.actor.side+'"][data-i="'+frame.actor.i+'"]'):null;
  const side=frame.actor&&frame.actor.side==='es'?'fs':frame.actor&&frame.actor.side==='fs'?'es':
    (frame.fs.some(d=>d.v<0)?'fs':'es');
  const targets=frame[side].filter(d=>d.v<0).map(d=>modal.querySelector('.fx-r[data-s="'+side+'"][data-i="'+d.i+'"]')).filter(Boolean);
  if(!targets.length)return;
  for(const target of targets) {
    const face=target.querySelector('.fx-av');if(!face)continue;
    face.classList.remove('ac-impact');void face.offsetWidth;face.classList.add('ac-impact');
    setTimeout(()=>face.classList.remove('ac-impact'),420);
  }
  if(!actor||targets.includes(actor))return;
  const targetFace=targets[0].querySelector('.fx-av'),face=actor.querySelector('.fx-av');
  const tr=targetFace&&targetFace.getBoundingClientRect(),ar=face&&face.getBoundingClientRect();
  if(!face||!tr||!ar)return;
  face.style.setProperty('--ac-dx',Math.round((tr.left+tr.width/2-ar.left-ar.width/2)*0.88)+'px');
  face.style.setProperty('--ac-dy',Math.round((tr.top+tr.height/2-ar.top-ar.height/2)*0.88)+'px');
  face.classList.remove('ac-dash');void face.offsetWidth;face.classList.add('ac-dash');
  setTimeout(()=>face.classList.remove('ac-dash'),440);
}
