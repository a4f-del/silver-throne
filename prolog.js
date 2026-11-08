/* Silver Throne — prologul "Ultima scânteie" (BETA).
   Scene scurte pentru eroii NOI, separate de progres si de backend.
   Conturile BETA existente pot vedea previzualizarea la Han. */
const ST_PROLOG_SCENES = [
  {
    title: 'Satul care nu mai doarme',
    place: 'Capitolul I · Întoarcerea',
    image: 'imagini/sat/sat-1.jpg',
    prose: 'Te întorci la un sat în care ferestrele au rămas întunecate. Pe ziduri stă cenușă, iar la poartă nu se mai aude glasul străjerilor. Oamenii așteaptă pe cineva care să nu plece.',
    quote: '„Câtă vreme mai arde o scânteie, satul nu este pierdut.”'
  },
  {
    title: 'Vatra Regală s-a stins',
    place: 'Capitolul II · Umbra regelui',
    image: 'imagini/temnite/tronul-cenusiu.jpg',
    prose: 'Vestea ajunge până la tine: Regele Cenușiu a stins Vatra Regală. Șase sigilii păstrează puterea Cenușii, iar drumul spre Tronul de Argint este închis de căpitani și jurăminte uitate.',
    quote: '„Tronul nu se cucerește într-o singură luptă. Mai întâi trebuie aprinsă speranța.”'
  },
  {
    title: 'Primul jurământ',
    place: 'Capitolul III · La poartă',
    image: 'imagini/harta/regiune-1.jpg',
    prose: 'Nu ai încă o armată, nici o coroană. Ai doar drumul din față și hotărârea de a apăra satul. La porțile lui te așteaptă ultimul Paznic — un om care nu și-a părăsit postul.',
    quote: '„Nimeni nu poate ridica singur un regat din cenușă.”'
  }
];
const ST_PROLOG_UI = { active: false, index: 0, preview: false };
function stPrologDue() {
  return typeof S !== 'undefined' && S
    && S.hc === 1 && S.mrStoryV === 1
    && S.mrPrologPending === 1 && !S.mrPrologSeen;
}
function stPrologRender() {
  const modal = document.getElementById('st-prolog');
  if (!modal || !ST_PROLOG_UI.active) return;
  const scene = ST_PROLOG_SCENES[ST_PROLOG_UI.index];
  const last = ST_PROLOG_UI.index === ST_PROLOG_SCENES.length - 1;
  modal.innerHTML = `<div class="stp-card">
    <div class="stp-hero" style="background-image:linear-gradient(180deg,#0b101244,#0b1012ec),url('${scene.image}')">
      <div class="stp-eyebrow">♛ Silver Throne · ${ST_PROLOG_UI.preview ? 'Previzualizare BETA' : 'Prolog'}</div>
      <div class="stp-chapter">${scene.place}</div>
      <h2 id="st-prolog-title">${scene.title}</h2>
    </div>
    <div class="stp-content">
      <div class="stp-progress" aria-label="Scena ${ST_PROLOG_UI.index + 1} din ${ST_PROLOG_SCENES.length}">${ST_PROLOG_SCENES.map((_, i) =>
        `<i class="${i <= ST_PROLOG_UI.index ? 'on' : ''}"></i>`).join('')}</div>
      <p class="stp-prose">${scene.prose}</p>
      <blockquote class="stp-quote">${scene.quote}</blockquote>
      <div class="stp-buttons">
        ${ST_PROLOG_UI.index ? '<button type="button" onclick="stPrologBack()">Înapoi</button>' : ''}
        <button type="button" class="p" onclick="stPrologNext()">${last
          ? (ST_PROLOG_UI.preview ? 'Închide previzualizarea' : 'Întâlnește Paznicul')
          : 'Mai departe'}</button>
        <button type="button" onclick="stPrologSkip()">${ST_PROLOG_UI.preview ? 'Închide' : 'Sari peste'}</button>
      </div>
      <p class="stp-note">${ST_PROLOG_UI.preview
        ? 'Previzualizare: nu se schimbă echipa sau progresul.'
        : 'Poți sări peste prolog fără să pierzi nimic din joc.'}</p>
    </div>
  </div>`;
  modal.querySelector('.stp-buttons .p')?.focus();
}
function stPrologShow(preview) {
  if (((!preview && !stPrologDue()))) return;
  if (document.getElementById('st-prolog') || document.getElementById('mr-scene')
      || document.getElementById('mr-m')) return;
  ST_PROLOG_UI.active = true;
  ST_PROLOG_UI.preview = !!preview;
  ST_PROLOG_UI.index = 0;
  const m = document.createElement('div');
  m.id = 'st-prolog';
  m.setAttribute('role', 'dialog');
  m.setAttribute('aria-modal', 'true');
  m.setAttribute('aria-labelledby', 'st-prolog-title');
  document.body.appendChild(m);
  stPrologRender();
}
function stPrologClose() {
  document.getElementById('st-prolog')?.remove();
  ST_PROLOG_UI.active = false;
  ST_PROLOG_UI.index = 0;
  ST_PROLOG_UI.preview = false;
}
function stPrologFinish() {
  const preview = ST_PROLOG_UI.preview;
  if (!ST_PROLOG_UI.active) return;
  if (!preview && stPrologDue()) {
    /* Persistam o singura data, doar la final/sarire, astfel incat refresh-ul
       in mijlocul prologului sa nu piarda introducerea. */
    S.mrPrologPending = 0;
    S.mrPrologSeen = 1;
  }
  stPrologClose();
  if (!preview) go(); /* dupa prolog, mrStoryPost afiseaza Paznicul */
}
function stPrologNext() {
  if (!ST_PROLOG_UI.active) return;
  if (ST_PROLOG_UI.index >= ST_PROLOG_SCENES.length - 1) stPrologFinish();
  else { ST_PROLOG_UI.index++; stPrologRender(); }
}
function stPrologBack() {
  if (!ST_PROLOG_UI.active || ST_PROLOG_UI.index <= 0) return;
  ST_PROLOG_UI.index--;
  stPrologRender();
}
function stPrologSkip() { stPrologFinish(); }
function stPrologPreview() {
  if (!S || S.d || document.getElementById('lgm')) return;
  stPrologShow(true);
}
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const style = document.createElement('style');
  style.textContent = `
#st-prolog{position:fixed;inset:0;z-index:25020;display:flex;align-items:center;justify-content:center;padding:16px;background:#05070af0;backdrop-filter:blur(5px)}
.stp-card{width:min(550px,100%);max-height:calc(100vh - 32px);overflow-y:auto;border:1px solid var(--gold);border-radius:13px;background:#11171a;box-shadow:0 18px 65px #000e}
.stp-hero{min-height:190px;background-position:center;background-size:cover;display:flex;flex-direction:column;justify-content:flex-end;text-align:center;padding:22px 22px 18px;box-sizing:border-box}
.stp-eyebrow{font:700 11px Cinzel,serif;letter-spacing:.15em;text-transform:uppercase;color:#eed18a}
.stp-chapter{margin-top:14px;color:#d1d8d8;font-size:12px}
.stp-hero h2{margin:8px 0 0;color:#f0d27a;font:700 25px Cinzel,Georgia,serif;text-shadow:0 2px 7px #000}
.stp-content{padding:14px 22px 20px;text-align:center}
.stp-progress{display:flex;justify-content:center;gap:6px;margin:0 0 15px}
.stp-progress i{display:block;width:25px;height:3px;border-radius:3px;background:#4b5154}
.stp-progress i.on{background:#f0d27a}
.stp-prose{font-size:15px;line-height:1.65;color:var(--ink);margin:0 0 14px}
.stp-quote{margin:0 0 17px;padding:10px 12px;border-left:2px solid var(--gold);text-align:left;font-style:italic;color:var(--gold2);background:#ffffff08;font-size:14px;line-height:1.6}
.stp-buttons{display:flex;justify-content:center;flex-wrap:wrap;gap:9px}
.stp-buttons button{min-width:110px}
.stp-note{font-size:12px;color:var(--mute);margin:12px 0 0}
@media(max-width:460px){.stp-hero{min-height:150px;padding:12px}.stp-hero h2{font-size:21px}.stp-content{padding:13px 15px}.stp-prose{font-size:14px}}
@media(prefers-reduced-motion:reduce){#st-prolog *{animation:none!important}}
`;
  document.head.appendChild(style);
})();
if (typeof module !== 'undefined' && module.exports)
  module.exports = { ST_PROLOG_SCENES, stPrologDue };
