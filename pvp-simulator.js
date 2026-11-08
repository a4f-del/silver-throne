/* Silver Throne — BETA: simulator local al ANIMAȚIILOR PvP (fără luptă reală).
 * Doar pentru administratori validați server-side. Nu apelează RPC-uri, nu cheltuiește
 * atacuri/puncte și nu scrie nimic în salvare. Cadrele au daune demonstrative. */
const SIM_PVP = {
  own: 0, enemy: 0,
  picks: ['auto', 'auto', 'auto'],
  enemyClasses: ['Războinic', 'Arcaș', 'Vraci'],
  message: ''
};

function simPvpAllowed() {
  return typeof CONT !== 'undefined' && !!CONT.user && CONT.admin === true
    && typeof ADM !== 'undefined' && ADM.srv === true;
}
function simPvpBoundCount(n) {
  return Math.max(0, Math.min(3, Math.floor(Number(n) || 0)));
}
function simPvpSet(which, value) {
  if (!simPvpAllowed()) return;
  if (which === 'own' || which === 'enemy') SIM_PVP[which] = simPvpBoundCount(value);
  else if (/^own[0-2]$/.test(which)) {
    const i = +which.slice(-1);
    SIM_PVP.picks[i] = String(value);
  } else if (/^enemy[0-2]$/.test(which)) {
    const i = +which.slice(-1), c = String(value);
    if (['Războinic', 'Arcaș', 'Paznic', 'Mag', 'Vraci'].includes(c)) SIM_PVP.enemyClasses[i] = c;
  }
  if (typeof admDraw === 'function') admDraw();
}
/* Copiem portretele și caracteristicile în memorie. Echipa reală S.fs/S.rs
   rămâne intactă, inclusiv dacă un mercenar este plecat într-o expediție. */
function simPvpRoster() {
  const all = [...(S.fs || []), ...(S.rs || [])];
  const hero = all.find(f => f && f.h) || (S.fs || [])[0];
  const mercs = all.filter(f => f && !f.h && f.c !== 'Gardian');
  return { hero, mercs };
}
function simPvpAdminHtml() {
  if (!simPvpAllowed()) return '';
  const opts = n => Array.from({length: 4}, (_, i) =>
    '<option value="'+i+'"'+(n===i?' selected':'')+'>'+ (i ? 'Erou + '+i+' mercenar'+(i===1?'':'i') : 'Doar eroul') +'</option>').join('');
  const { mercs } = simPvpRoster();
  const saved = mercs.map((f,i)=>({i,f}));
  const name = f => typeof acSafe === 'function' ? acSafe(f.n) : tEsc(f.n);
  const mine = Array.from({length:SIM_PVP.own},(_,i)=>{
    const pick=SIM_PVP.picks[i], allowed=pick === 'auto' || saved.some(x=>String(x.i)===pick);
    return '<label>Mercenar '+(i+1)+' <select aria-label="Mercenarul '+(i+1)+' al atacatorului" onchange="simPvpSet(\'own'+i+'\',this.value)">' +
      '<option value="auto"'+(!allowed||pick==='auto'?' selected':'')+'>Automat / demonstrativ</option>'+
      saved.map(({i:j,f})=>'<option value="'+j+'"'+(String(j)===pick?' selected':'')+'>'+name(f)+'</option>').join('')+
      '</select></label>';
  }).join('');
  const enemy=Array.from({length:SIM_PVP.enemy},(_,i)=>
    '<label>Apărător '+(i+1)+' <select aria-label="Clasa mercenarului '+(i+1)+' al apărătorului" onchange="simPvpSet(\'enemy'+i+'\',this.value)">'+
      ['Războinic','Arcaș','Paznic','Mag','Vraci'].map(c=>'<option value="'+c+'"'+(SIM_PVP.enemyClasses[i]===c?' selected':'')+'>'+c+'</option>').join('')+
      '</select></label>'
  ).join('');
  return '<div class="adm-g sim-pvp-controls"><span>Simulare PvP<br><small>Numai BETA</small></span><div class="adm-sim">'+
    '<p>Testează animațiile fără să consumi din cele 10 atacuri zilnice. Daunele sunt demonstrative, nu rezultate PvP reale.</p>'+
    '<label>Echipa ta <select aria-label="Dimensiune echipă atacator" onchange="simPvpSet(\'own\',this.value)">'+opts(SIM_PVP.own)+'</select></label>'+
    mine+
    '<label>Echipa adversă <select aria-label="Dimensiune echipă apărător" onchange="simPvpSet(\'enemy\',this.value)">'+opts(SIM_PVP.enemy)+'</select></label>'+
    enemy+
    '<button class="p" onclick="simPvpStart()">⚔ Simulează animațiile</button>'+
    (SIM_PVP.message?'<small class="adm-ok">'+(typeof acSafe==='function'?acSafe(SIM_PVP.message):tEsc(SIM_PVP.message))+'</small>':'')+
    '</div></div>';
}
function simPvpUnit(f, enemy) {
  const max=enemy?Math.max(60, Math.round((f.hp || 50)*Math.min(3,1+Math.max(1,S.lvl||1)/32))):Math.max(1,typeof mhp==='function'?mhp(f):f.hp||100);
  return { n:String(f.n||'Luptător'), c:f.c||'Războinic', ic:f.ic||null,
    h:!!f.h, mh:max, hp:max, img:null };
}
function simPvpBuildCast() {
  const {hero,mercs}=simPvpRoster();
  if (!hero) return null;
  const taken=new Set(),own=[simPvpUnit(hero,false)];
  const defaults=['Războinic','Arcaș','Paznic','Mag','Vraci'];
  for(let i=0;i<simPvpBoundCount(SIM_PVP.own);i++){
    const selected=SIM_PVP.picks[i],index=selected!=='auto'?Number(selected):-1;
    const pick=Number.isInteger(index)&&index>=0&&index<mercs.length&&!taken.has(index)?index:mercs.findIndex((f,j)=>!taken.has(j));
    if(pick>=0){taken.add(pick);own.push(simPvpUnit(mercs[pick],false));}
    else own.push(simPvpUnit({n:'Mercenar demonstrativ '+(i+1),c:defaults[i],hp:60+10*i},true));
  }
  const enemyHero=simPvpUnit({n:'Erou adversar',c:'Campion',h:1,hp:90},true);
  const foes=[enemyHero];
  for(let i=0;i<simPvpBoundCount(SIM_PVP.enemy);i++){
    const c=SIM_PVP.enemyClasses[i]||'Războinic';
    foes.push(simPvpUnit({n:'Apărător '+(i+1),c,hp:(typeof CL!=='undefined'&&CL[c]?CL[c].hp:60)},true));
  }
  return { adventure:true,pvp:true,adventureTitle:'Simulare PvP · doar animații',fs:own,es:foes };
}
/* Cadre de prezentare, nu motorul PvP. Fiecare lovitură folosește
   formatul FX real (actor, diferența de HP, text) doar pentru redare. */
function simPvpFrames(cast) {
  const hp={fs:cast.fs.map(x=>x.hp),es:cast.es.map(x=>x.hp)},frames=[];
  const order=[['fs',0],['es',0]];
  for(let i=1;i<Math.max(cast.fs.length,cast.es.length);i++){
    if(i<cast.fs.length)order.push(['fs',i]);
    if(i<cast.es.length)order.push(['es',i]);
  }
  for(let turn=0;turn<2;turn++) for(const [side,actorIndex] of order){
    if(hp[side][actorIndex]<=0)continue;
    const targetSide=side==='fs'?'es':'fs';
    let targetIndex=hp[targetSide].findIndex(v=>v>0);
    if(targetIndex<0)break;
    if(turn===1) {
      const alt=hp[targetSide].findIndex((v,j)=>j>targetIndex&&v>0);
      if(alt>=0)targetIndex=alt;
    }
    const unit=cast[side][actorIndex],target=cast[targetSide][targetIndex];
    const amount=Math.max(1, Math.min(hp[targetSide][targetIndex],Math.round(target.mh*(.13+((actorIndex+turn)%3)*.06))));
    hp[targetSide][targetIndex]-=amount;
    frames.push({
      fs:targetSide==='fs'?[{i:targetIndex,v:-amount,mh:target.mh}]:[],
      es:targetSide==='es'?[{i:targetIndex,v:-amount,mh:target.mh}]:[],
      txt:unit.n+' atacă '+target.n+' (-'+amount+'). · Simulare vizuală.',
      actor:{side,i:actorIndex}
    });
  }
  return frames;
}
function simPvpStart() {
  if(!simPvpAllowed()||typeof S==='undefined'||!S||S.d
    ||(typeof adventureActive==='function'&&adventureActive())
    ||typeof FX==='undefined'||FX.playing||typeof fxPlay!=='function'
    ||typeof acFxMarkup!=='function') return false;
  const cast=simPvpBuildCast();
  if(!cast){SIM_PVP.message='Nu ai erou pentru test.';if(typeof admDraw==='function')admDraw();return false;}
  const frames=simPvpFrames(cast),oldCast=FX.cast,oldQueue=FX.q.slice();
  if(!frames.length)return false;
  FX.q.splice(0,FX.q.length);
  FX.cast=cast;
  SIM_PVP.message='Simulare pornită: '+cast.fs.length+' contra '+cast.es.length+' luptători.';
  if(typeof ADM!=='undefined')ADM.open=false;
  if(typeof admDraw==='function')admDraw();
  if(typeof document!=='undefined')document.body.classList.add('sim-pvp-playing');
  try {
    fxPlay(frames,()=>{
      FX.cast=oldCast;FX.q.splice(0,FX.q.length,...oldQueue);
      if(typeof document!=='undefined')document.body.classList.remove('sim-pvp-playing');
      SIM_PVP.message='Simulare terminată. Niciun atac real consumat.';
    },true,0);
  }catch(e){
    FX.cast=oldCast;FX.q.splice(0,FX.q.length,...oldQueue);
    if(typeof document!=='undefined')document.body.classList.remove('sim-pvp-playing');
    SIM_PVP.message='Simularea nu a putut porni.';
    return false;
  }
  return true;
}
(function(){
  if(typeof document==='undefined'||!document.head)return;
  const st=document.createElement('style');
  st.textContent='.adm-sim{display:flex;flex-direction:column;gap:8px;flex:1;min-width:0}.adm-sim p{margin:0;font-size:12px;color:#c1b69e}.adm-sim label{display:flex;gap:8px;align-items:center;justify-content:space-between;font-size:12.5px}.adm-sim label select{max-width:230px}.adm-sim>button{align-self:flex-start}body.sim-pvp-playing #adm-b{display:none!important}';
  document.head.appendChild(st);
})();
