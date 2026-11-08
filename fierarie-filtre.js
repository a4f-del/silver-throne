/* Silver Throne BETA: filtrele Fierăriei sunt doar UI, fără modificări de salvare.
   Căutarea funcționează fără rerender, păstrând focusul tastaturii. */
const FIER_FILTER={q:'',rarity:'all',where:'all',tier:'all'};
function fierMatch(it,who,where){
 const q=(FIER_FILTER.q||'').toLocaleLowerCase('ro-RO');
 const text=(String(it.name||'')+' '+String(who||'')).toLocaleLowerCase('ro-RO');
 const rarity=it.lg?'legendary':String(Math.min(3,it.r||0));
 const u=it.up||0,tier=u===0?'zero':u>=UPM()?'max':'plus';
 return (!q||text.includes(q))&&
   (FIER_FILTER.rarity==='all'||FIER_FILTER.rarity===rarity)&&
   (FIER_FILTER.where==='all'||FIER_FILTER.where===where)&&
   (FIER_FILTER.tier==='all'||FIER_FILTER.tier===tier);
}
function fierData(it,who,where){
 const rarity=it.lg?'legendary':String(Math.min(3,it.r||0));
 const u=it.up||0,tier=u===0?'zero':u>=UPM()?'max':'plus';
 const search=(String(it.name||'')+' '+String(who||'')).toLocaleLowerCase('ro-RO');
 return 'data-fier-item="1" data-search="'+tEsc(search)+
  '" data-rarity="'+rarity+'" data-where="'+where+'" data-tier="'+tier+'"'+
  (fierMatch(it,who,where)?'':' style="display:none"');
}
function fierFilterPanel(shown) {
 const select=(key,options)=>'<select aria-label="Filtru '+key+
   '" onchange="fierSetFilter(\''+key+'\',this.value)">'+
   options.map(([value,label])=>'<option value="'+value+'"'+
   (FIER_FILTER[key]===value?' selected':'')+'>'+label+'</option>').join('')+'</select>';
 return '<div class="fier-filters"><input type="search" '+
   'aria-label="Caută obiect în Fierărie" placeholder="Caută obiect sau personaj…" '+
   'value="'+tEsc(FIER_FILTER.q)+'" oninput="fierSetFilter(\'q\',this.value)">'+
   select('rarity',[['all','Toate raritățile'],['2','Rare'],['3','Epice'],['legendary','Legendare']])+
   select('where',[['all','Toate locațiile'],['equipped','Echipate'],['bag','Rucsac']])+
   select('tier',[['all','Toate treptele'],['zero','Neîmbunătățite'],['plus','În progres'],['max','La maxim']])+
   '<span id="fier-count" class="mute" aria-live="polite">'+shown+' obiecte afișate</span></div>';
}
function fierSetFilter(kind,value){
 if(!Object.prototype.hasOwnProperty.call(FIER_FILTER,kind))return;
 FIER_FILTER[kind]=String(value||'');
 fierApplyFilter();
}
function fierApplyFilter(){
 if(typeof document==='undefined')return;
 const root=document.getElementById('fier-list');
 if(!root)return;
 let shown=0;
 root.querySelectorAll('[data-fier-item]').forEach(el=>{
  const q=FIER_FILTER.q.toLocaleLowerCase('ro-RO');
  const match=(!q||el.dataset.search.includes(q))&&
   (FIER_FILTER.rarity==='all'||el.dataset.rarity===FIER_FILTER.rarity)&&
   (FIER_FILTER.where==='all'||el.dataset.where===FIER_FILTER.where)&&
   (FIER_FILTER.tier==='all'||el.dataset.tier===FIER_FILTER.tier);
  el.style.display=match?'':'none';if(match)shown++;
 });
 const count=document.getElementById('fier-count');
 if(count)count.textContent=shown+' obiecte afișate';
 const empty=document.getElementById('fier-empty');
 if(empty)empty.style.display=shown?'none':'';
}
