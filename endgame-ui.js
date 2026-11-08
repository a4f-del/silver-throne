/* Silver Throne — măiestrie orizontală și colecții legendare (BETA).
   Doar realizări și cosmetice; nicio statistică, monedă sau recompensă nouă. */
const EG_TITLES={
 solo:{name:'Umbra Temnițelor',hint:'Învinge singur 3 căpitani diferiți.'},
 bosses:{name:'Vânător de Căpitani',hint:'Învinge 4 căpitani de Temniță diferiți după nivelul 50.'},
 classes:{name:'Maestrul Tovarășilor',hint:'Câștigă lupte cu 4 clase diferite în echipa activă.'},
 tower:{name:'Străjerul Înalt',hint:'Atinge etajul 80 în Turn.'}
};
const EG_COLLECTIONS=[
 {name:'Ecourile Adâncurilor',ids:['maree','pasi','violet']},
 {name:'Arsenalul Turnului',ids:['fum','smarald','ametist']},
 {name:'Coroana Cenușii',ids:['izvor','tunet','zori','rege']}
];
const egEnabled=()=>typeof ST_SERVER!=='undefined'&&ST_SERVER==='beta'&&
 typeof S!=='undefined'&&!!S&&S.lvl>=50;
function egRecordBoss(d){
 if(!egEnabled()||!d||!d.one||d.tw||d.ev||d.raid!=null||d.egRecorded)return;
 const idx=Number(d.di);
 if(!Number.isInteger(idx)||idx<0||typeof DG==='undefined'||!DG[idx]||DG[idx].ev)return;
 d.egRecorded=1;
 const eg=S.eg&&typeof S.eg==='object'&&!Array.isArray(S.eg)?S.eg:(S.eg={});
 eg.bosses=eg.bosses&&typeof eg.bosses==='object'?eg.bosses:{};
 eg.solo=eg.solo&&typeof eg.solo==='object'?eg.solo:{};
 eg.classes=eg.classes&&typeof eg.classes==='object'?eg.classes:{};
 eg.bosses[idx]=1;
 const fighters=Array.isArray(S.fs)?S.fs.filter(f=>f&&f.hp>0):[];
 if(S.fs.length===1&&fighters.length===1&&fighters[0].h)eg.solo[idx]=1;
 for(const f of fighters)if(['Campion','Paznic','Arcaș','Războinic','Vraci','Mag'].includes(f.c))eg.classes[f.c]=1;
}
/* Realizări numai din chei recunoscute; ecranul nu mută progresul. */
function egProgress(){
 const eg=S.eg&&typeof S.eg==='object'?S.eg:{};
 const ids=typeof DG!=='undefined'&&Array.isArray(DG)?
  DG.map((g,i)=>g&&!g.ev?String(i):null).filter(Boolean):[];
 const count=obj=>obj&&typeof obj==='object'?ids.filter(i=>obj[i]===1).length:0;
 const cls=['Campion','Paznic','Arcaș','Războinic','Vraci','Mag'];
 return {solo:Math.min(3,count(eg.solo)),bosses:Math.min(4,count(eg.bosses)),
  classes:Math.min(4,cls.filter(c=>eg.classes&&eg.classes[c]===1).length),
  tower:Math.min(80,Math.max(0,Number(S.tw&&S.tw.best)||0))};
}
function egTitleReady(id){
 if(!egEnabled()||!Object.prototype.hasOwnProperty.call(EG_TITLES,id))return false;
 const p=egProgress(),goals={solo:3,bosses:4,classes:4,tower:80};
 return p[id]>=goals[id];
}
function egTitleGet(){
 const id=S&&S.egTitle;
 return typeof id==='string'&&egTitleReady(id)?EG_TITLES[id].name:'';
}
function egTitleSelect(id){
 if(!egEnabled()||S.d||(typeof adventureActive==='function'&&adventureActive()))return;
 if(id===''){S.egTitle='';S.msg='Titlul cosmetic a fost ascuns.';return go();}
 if(!egTitleReady(id))return;
 S.egTitle=id;S.msg='Titlu ales: '+EG_TITLES[id].name+'. Nu oferă bonusuri de luptă.';go();
}
function egOwnedIds(){
 const valid=new Set(typeof TW_LG!=='undefined'?TW_LG.map(([,id])=>id):[]);
 const seen=new Set();
 const check=it=>{if(it&&typeof it.lg==='string'&&valid.has(it.lg))seen.add(it.lg);};
 (S.inv||[]).forEach(check);
 for(const f of [...(S.fs||[]),...(S.rs||[])])
  if(f&&f.eq&&typeof f.eq==='object')Object.values(f.eq).forEach(check);
 return seen;
}
function egCollectionRows(){
 const owned=egOwnedIds(),earned=S.tw&&S.tw.lg||{};
 const catalog=typeof LG!=='undefined'?LG:{};
 return EG_COLLECTIONS.map(set=>{
  const count=set.ids.filter(id=>owned.has(id)).length;
  const items=set.ids.map(id=>{
   const item=catalog[id]||{},name=typeof item.n==='string'?item.n:id;
   const status=owned.has(id)?'deținut':earned[id]===1?'obținut cândva':'lipsește';
   const ico=typeof item.ico==='string'&&/^imagini\/legendare\/[a-z0-9-]+-ico\.webp$/.test(item.ico)
    ?'<img src="'+item.ico+'" alt="" loading="lazy">':'<span aria-hidden="true">◇</span>';
   return '<span class="eg-item'+(owned.has(id)?' owned':'')+'" title="'+tEsc(name)+' · '+status+'">'+ico+
    '<small>'+tEsc(name)+'</small><em>'+status+'</em></span>';
  }).join('');
  return '<div class="eg-set"><b>'+tEsc(set.name)+' · '+count+'/'+set.ids.length+
   '</b><div class="eg-items">'+items+'</div></div>';
 }).join('');
}
function egEndgamePanel(){
 if(!egEnabled())return '';
 const p=egProgress(),targets={solo:3,bosses:4,classes:4,tower:80};
 const goals=Object.entries(EG_TITLES).map(([id,t])=>{
  const ready=egTitleReady(id),current=egTitleGet()===t.name;
  return '<div class="eg-goal"><span><b>'+tEsc(t.name)+'</b><small>'+tEsc(t.hint)+
   '</small></span><strong>'+p[id]+'/'+targets[id]+'</strong>'+
   (ready?'<button type="button" onclick="egTitleSelect(\''+id+'\')"'+
    (current?' disabled':'')+'>'+(current?'Ales':'Alege')+'</button>':
    '<span class="eg-locked">🔒</span>')+'</div>';
 }).join('');
 const owned=egOwnedIds().size;
 return '<section class="eg-section"><h2>Măiestrie · nivelul 50</h2>'+
  '<p class="mute">Obiective de prestigiu, fără niveluri peste 50 sau putere permanentă. Titlurile sunt doar cosmetice.</p>'+
  '<div class="eg-goals">'+goals+'</div>'+
  (egTitleGet()?'<button type="button" onclick="egTitleSelect(\'\')">Ascunde titlul</button>':'')+
  '<details class="eg-collection"><summary>✦ Colecția Turnului · '+owned+'/10 legendare deținute</summary>'+
  '<p class="mute">Un obiect echipat este tot deținut. „Obținut cândva” nu înseamnă că îl mai ai. Seturile sunt decorative, fără bonusuri.</p>'+
  egCollectionRows()+'</details></section>';
}
(function(){
 if(typeof document==='undefined'||!document.head)return;
 const st=document.createElement('style');st.textContent=`
.eg-section{border:1px solid #806945;border-radius:10px;margin:12px 0;padding:12px;background:#151a1d}
.eg-section h2{margin:0 0 8px;color:var(--gold2)}
.eg-goals{display:grid;gap:5px}
.eg-goal{display:flex;align-items:center;gap:8px;border-bottom:1px solid #ffffff20;padding:8px 2px}
.eg-goal span:first-child{flex:1;min-width:0}.eg-goal b,.eg-goal small{display:block}.eg-goal small{font-size:12px;color:var(--mute);line-height:1.35;margin-top:3px}
.eg-goal strong{color:var(--gold2);white-space:nowrap}
.eg-goal button{min-width:66px}.eg-locked{font-size:14px;color:var(--mute)}
.eg-collection{margin-top:13px;border-top:1px solid #ffffff27;padding-top:8px}
.eg-collection summary{cursor:pointer;color:var(--gold2);font-weight:700}
.eg-set{margin:12px 0}.eg-set>b{color:var(--gold2);font-size:13px}
.eg-items{display:grid;grid-template-columns:repeat(auto-fit,minmax(105px,1fr));gap:6px;margin-top:7px}
.eg-item{display:flex;flex-direction:column;align-items:center;text-align:center;gap:3px;padding:8px 4px;background:#0d1114;border:1px solid #60534b;border-radius:7px;opacity:.7;min-width:0}
.eg-item.owned{border-color:#dcb56e;opacity:1}
.eg-item img{width:38px;height:38px;object-fit:cover;border-radius:5px}
.eg-item small{font-size:11px;overflow-wrap:anywhere}.eg-item em{font-size:10px;color:var(--mute);font-style:normal}
.eg-title-medal{display:inline-block;padding:2px 6px;border:1px solid #ae8b53;border-radius:7px;background:#36291d;color:#f0d27a;font-size:11px}
.pr-c.eg-cosmetic{box-shadow:0 0 0 2px #e2bd77,0 0 18px #e2bd7733}
@media(max-width:520px){.eg-section{padding:9px}.eg-items{grid-template-columns:repeat(2,minmax(0,1fr))}.eg-goal{flex-wrap:wrap}.eg-goal button{min-height:38px}}
`;document.head.appendChild(st);
})();
