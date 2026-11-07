/* Silver Throne — scurte intalniri narative pentru mercenarii noi, exclusiv BETA.
   Nu rescrie salvari existente; numai conturile create dupa activarea acestei
   versiuni primesc mrStoryV=1 la finalizarea portretului eroului. */
const MR_STORY = {
  'Paznic': {
    title: 'Jurământul de la poartă', place: 'Porțile satului · prolog',
    clue: 'Un străjer încă păzește poarta, deși ceilalți au plecat.',
    prose: 'Cenușa plutește peste palisade. În fața porții, un om ține un scut crăpat și privește drumul pustiu. Când te apropii, nu îngenunchează și nu cere soldă.',
    quote: '„Nu-mi trebuie un stăpân. Îmi trebuie cineva care să nu fugă atunci când se lasă noaptea.”',
    action: 'Primește-l pe Paznic'
  },
  'Arcaș': {
    title: 'Urmele din cenușă', place: 'Ieșirea din Mina Cenușie · prima expediție',
    clue: 'După prima întoarcere din mină, cineva urmărește aceleași urme.',
    prose: 'Te întorci din prima coborâre când o săgeată se înfige în lemnul de lângă potecă. Din pădure iese un arcaș care urmărea creaturile ieșite din mină. A văzut că ai avut curajul să cobori acolo.',
    quote: '„Singur vei rata câteva umbre. Dacă îmi dai un loc lângă foc, eu nu le voi rata.”',
    action: 'Primește-l pe Arcaș'
  },
  'Războinic': {
    title: 'Sabia fără stăpân', place: 'Hanul · după prima expediție și antrenament',
    clue: 'La Han te așteaptă un veteran care a auzit de izbânzile tale.',
    prose: 'La Han, un veteran cu zale tocite ascultă povestirile despre mina în care ai coborât și despre antrenamentul tău. Își așază sabia pe masă, dar nu întinde mâna după aur.',
    quote: '„Am luptat pentru regi care și-au uitat oamenii. Arată-mi un sat pentru care merită să stau.”',
    action: 'Primește-l pe Războinic'
  },
  'Vraci': {
    title: 'Mâinile care vindecă', place: 'Drumul de întoarcere · după primul căpitan',
    clue: 'După primul căpitan învins, un vindecător îngrijește supraviețuitorii.',
    prose: 'După căderea primului căpitan, găsești lângă drum un vraci care bandajează răniții. Nu întreabă câți dușmani ai ucis, ci câți oameni ai adus înapoi din întuneric.',
    quote: '„O sabie câștigă o clipă. Cineva trebuie să-i țină în viață pe cei care vor lupta mâine.”',
    action: 'Primește-l pe Vraci'
  },
  'Mag': {
    title: 'Cunoașterea interzisă', place: 'Hotarul Lumii · nivelul 5',
    clue: 'Când Lumea se deschide, un străin caută urma Tronului de Argint.',
    prose: 'Dincolo de hotarele satului, pe harta proaspăt deschisă, apare un călător cu semne argintii pe mantie. Privește ținuturile ca și cum ar recunoaște un desen foarte vechi.',
    quote: '„Tronul de Argint nu este doar o coroană. Vino cu mine și îți voi arăta de ce se tem regii de el.”',
    action: 'Primește-l pe Mag'
  }
};
function mrStoryIsBeta() { return typeof ST_SERVER !== 'undefined' && ST_SERVER === 'beta'; }
function mrStoryEnabled() { return mrStoryIsBeta() && typeof S !== 'undefined' && S && S.mrStoryV === 1; }
function mrStoryDue(c) {
  if (!mrStoryEnabled() || !S.hc) return false;
  switch (c) {
    case 'Paznic': return true;
    case 'Arcaș': return C('l') >= 1;
    case 'Războinic': return C('l') >= 1 && C('t') >= 1;
    case 'Vraci': return C('bs') >= 1 && mrHas('Arcaș') && mrHas('Războinic');
    case 'Mag': return S.lvl >= 5;
    default: return false;
  }
}
function mrStoryPlaceReady(c) {
  /* Scenele se deschid doar intr-un loc potrivit, nu in finalul unei lupte.
     Arcasul te asteapta in sat; Vraciul in Infirmerie, dupa ce ai format echipa. */
  if (c === 'Arcaș') return S.tab === 'a' && !S.vil;
  if (c === 'Vraci') return S.tab === 'a' && S.vil === 'i';
  if (c === 'Războinic') return S.tab === 'a' && S.vil === 'h';
  if (c === 'Mag') return S.tab === 'm' && S.mt === 'l';
  return true;
}
function mrStorySeen(c) { return Array.isArray(S.mrStorySeen) && S.mrStorySeen.includes(c); }
function mrStoryMark(c) {
  S.mrStorySeen = S.mrStorySeen || [];
  if (!S.mrStorySeen.includes(c)) S.mrStorySeen.push(c);
}
let MR_SCENE = null;
function mrStoryClose() {
  document.getElementById('mr-scene')?.remove();
  MR_SCENE = null;
}
function mrStoryShow(c, preview) {
  if (!mrStoryIsBeta() || !MR_STORY[c] || typeof S === 'undefined' || !S || S.d) return;
  if (!preview && (!mrStoryEnabled() || !(S.mrOff || []).includes(c) || mrHas(c))) return;
  mrStoryClose();
  const story = MR_STORY[c], m = document.createElement('div');
  const named = !preview && typeof mrPresetEnabled==='function' && mrPresetEnabled() && typeof mrDefaultName==='function';
  MR_SCENE = { c, preview: !!preview };
  m.id = 'mr-scene'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
  m.setAttribute('aria-labelledby', 'mr-scene-title');
  m.innerHTML = `<div class="mrs-card">
    <div class="mrs-top">✦ ${preview ? 'BETA · previzualizare' : 'Un nou tovarăș'} ✦</div>
    <div class="mrs-place">${tEsc(story.place)}</div>
    <div class="mrs-avatar">${av({ c, n: c }, 104)}</div>
    ${named ? `<div class="mrs-name"><b>${tEsc(mrDefaultName(c))}</b> · ${tEsc(c)}</div>` : ''}
    <h2 id="mr-scene-title">${tEsc(story.title)}</h2>
    ${named
      ? `<blockquote class="mrs-quote">${tEsc(story.quote)}</blockquote>
        <details class="mrs-more"><summary>📜 Citește povestea completă</summary><p class="mrs-prose">${tEsc(story.prose)}</p></details>`
      : `<p class="mrs-prose">${tEsc(story.prose)}</p>
        <blockquote class="mrs-quote">${tEsc(story.quote)}</blockquote>`}
    <div class="mrs-actions">${preview
      ? '<button type="button" class="p" onclick="mrStoryClose()">Închide previzualizarea</button>'
      : `<button type="button" class="p" onclick="mrStoryJoin()">${tEsc(story.action)}</button><button type="button" onclick="mrStoryLater()">Mai târziu</button>`}
    </div>
    ${preview ? '<p class="mute mrs-note">Doar o previzualizare. Nu schimbă echipa sau progresul.</p>'
      : '<p class="mute mrs-note">Dacă amâni, îl poți recruta gratuit din Han oricând.</p>'}
  </div>`;
  document.body.appendChild(m);
  const first = m.querySelector('button'); if (first) first.focus();
}
function mrStoryJoin() {
  if (!MR_SCENE || MR_SCENE.preview || !mrStoryEnabled()) return;
  const c = MR_SCENE.c;
  if (!(S.mrOff || []).includes(c) || mrHas(c)) return mrStoryClose();
  mrStoryMark(c); mrStoryClose();
  mrRecruit(c); /* BETA nou: recrutare directă cu nume; fluxurile vechi păstrează numirea */
}
function mrStoryLater() {
  if (!MR_SCENE || MR_SCENE.preview || !mrStoryEnabled()) return;
  const c = MR_SCENE.c;
  mrStoryMark(c); mrStoryClose(); go();
}
function mrStoryPreview(c) {
  if (!mrStoryIsBeta() || !MR_STORY[c] || document.getElementById('mr-m')) return;
  mrStoryShow(c, true);
}
function mrStoryPost() {
  if (!mrStoryEnabled() || S.d || mrAll().some(f => f.nn)) return;
  /* Crearea eroului ramane in DOM ~320 ms dupa inchidere.
     Nu considera .hc-ul ascuns o fereastra activa si nu bloca prologul. */
  if (document.getElementById('mr-scene') || document.getElementById('mr-m')
    || document.getElementById('lgm') || document.getElementById('st-prolog')) return;
  const gate = document.getElementById('gate');
  if (gate && !gate.classList.contains('g-out')) {
    if (!MR.storyWait) {
      MR.storyWait = 1;
      setTimeout(() => { MR.storyWait = 0; mrPost(); }, 550);
    }
    return;
  }
  /* Prologul noului erou vine intotdeauna INAINTEA scenei Paznicului. */
  if (typeof stPrologDue === 'function' && stPrologDue()) {
    stPrologShow(false);
    return;
  }
  const c = MR.order.map(x => x[0]).find(c =>
    (S.mrOff || []).includes(c) && !mrHas(c) && !mrStorySeen(c) && mrStoryPlaceReady(c));
  if (c) mrStoryShow(c, false);
}
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const css = document.createElement('style');
  css.textContent = `
#mr-scene{position:fixed;inset:0;z-index:25010;display:flex;align-items:center;justify-content:center;padding:16px;background:#05070ae8;backdrop-filter:blur(5px)}
.mrs-card{width:min(530px,100%);max-height:calc(100vh - 32px);overflow-y:auto;box-sizing:border-box;padding:22px 24px 18px;text-align:center;border:1px solid var(--gold);border-radius:14px;background:radial-gradient(ellipse at 50% 0,#32302a,#101416 75%);box-shadow:0 20px 65px #000e}
.mrs-top{font:700 11px Cinzel,serif;letter-spacing:.15em;text-transform:uppercase;color:var(--gold2)}
.mrs-place{margin-top:7px;color:var(--mute);font-size:12px}
.mrs-avatar{margin:15px auto 10px;display:flex;justify-content:center}
.mrs-card h2{font:700 23px Cinzel,serif;color:var(--gold2);margin:8px 0 14px}
.mrs-name{margin:0 0 6px;font-size:14px;color:var(--gold2)}.mrs-name b{font-size:16px}
.mrs-more{margin:0 0 13px;text-align:left;color:var(--mute);font-size:13px}.mrs-more summary{cursor:pointer;color:var(--gold2);padding:5px 0}.mrs-more[open] .mrs-prose{margin:8px 0 2px;font-size:13px;line-height:1.5}
.mrs-prose{font-size:15px;line-height:1.7;color:var(--ink);margin:0 0 13px}
.mrs-quote{border-left:2px solid var(--gold);margin:12px 0 19px;padding:9px 14px;color:var(--gold2);font-size:15px;line-height:1.6;text-align:left;font-style:italic;background:#ffffff09}
.mrs-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
.mrs-actions button{min-width:130px}
.mrs-note{font-size:12px;margin:12px 0 0}
@media(max-width:460px){.mrs-card{padding:16px}.mrs-card h2{font-size:20px}.mrs-prose,.mrs-quote{font-size:14px}}
@media(prefers-reduced-motion:reduce){#mr-scene *{animation:none!important}}
`;
  document.head.appendChild(css);
})();
if (typeof module !== 'undefined' && module.exports)
  module.exports = { MR_STORY, mrStoryDue, mrStoryPlaceReady, mrStoryIsBeta };
