/* ============================================================================
   Silver Throne — erou.js
   Crearea eroului la primul cont: bărbat sau femeie, portret și nume. Se poate schimba oricând din Echipă.

   • Portretele sunt desenate aici (SVG), 4 pentru bărbat și 4 pentru femeie (HERO_ICONS).
     Dacă puneți un portret pictat la imagini/eroi/<id>.jpeg (de ex. imagini/eroi/f3.jpeg), se afișează
     automat peste cel desenat; dacă fișierul lipsește, rămâne desenul.
   • Eroul primește: f.g ('m' / 'f'), f.ic (id-ul portretului) și numele. S.hc = 1 după creare.
   • Jucătorii existenți nu sunt întrebați la intrare; își pot alege portretul din Echipă.
   • av() din index.html folosește heroAv() pentru orice luptător cu f.ic (și pentru eroii altor jucători din
     Lume și clasament, care își publică portretul).
   Se încarcă înainte de cont.js.
   ========================================================================== */
const FACE = 'M24.5 26C24.5 18.6 27.6 15.4 32 15.4S39.5 18.6 39.5 26C39.5 33.6 36.6 39.6 32 39.6S24.5 33.6 24.5 26Z';
const FACEF = 'M25.2 26C25.2 18.8 28 15.6 32 15.6S38.8 18.8 38.8 26C38.8 33 36.2 38.8 32 38.8S25.2 33 25.2 26Z';
const eyes = (c = '#1b1410', y = 26.6) => `<ellipse cx="28.6" cy="${y}" rx="1.25" ry="1.05" fill="${c}"/><ellipse cx="35.4" cy="${y}" rx="1.25" ry="1.05" fill="${c}"/>`;
const brows = (c, y = 24) => `<path d="M26.6 ${y}Q28.6 ${y - 1.2} 30.4 ${y - 0.2}M33.6 ${y - 0.2}Q35.4 ${y - 1.2} 37.4 ${y}" stroke="${c}" stroke-width="1.1" fill="none" stroke-linecap="round"/>`;
const shade = (f) => `<path d="${f}" fill="url(#hs)" />`;
const bg = (a, b) => `<radialGradient id="hb" cx="50%" cy="35%" r="70%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>`;
const DEF = (a, b) => `<defs>${bg(a, b)}<linearGradient id="hs" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient><linearGradient id="st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d7dde0"/><stop offset="1" stop-color="#6d7a81"/></linearGradient><linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset="1" stop-color="#b98a2a"/></linearGradient></defs><rect width="64" height="64" fill="url(#hb)"/>`;
const neck = s => `<path d="M28 36H36V46H28Z" fill="${s}"/><path d="M28 38H36V41C33 43 31 43 28 41Z" fill="#000" opacity=".2"/>`;

const HERO_ICONS = {
  /* ---------------- bărbați */
  m1: { n: 'Cavalerul', g: 'm', svg: DEF('#3a4a52', '#10161a')
    + `<path d="M6 64C8 50 18 44 32 44S56 50 58 64Z" fill="url(#st)" stroke="#2a3134" stroke-width="1.2"/><path d="M14 52Q32 46 50 52" stroke="#2a3134" stroke-width="1" fill="none" opacity=".6"/>`
    + `<path d="M18 33C18 17 24 10 32 10S46 17 46 33V42C46 45.5 41 47.5 32 47.5S18 45.5 18 42Z" fill="url(#st)" stroke="#2a3134" stroke-width="1.3"/>`
    + `<path d="M32 10V20" stroke="#2a3134" stroke-width="1.6"/><path d="M23 27.5H41V31.5H34.4V43H29.6V31.5H23Z" fill="#0b0e10"/>`
    + `<circle cx="28" cy="29.5" r="1" fill="#f0d27a" opacity=".85"/><circle cx="36" cy="29.5" r="1" fill="#f0d27a" opacity=".85"/>`
    + `<path d="M30 6Q38 4 44 12Q38 9 33 11Z" fill="#9c2f29"/>` },
  m2: { n: 'Vânătorul', g: 'm', svg: DEF('#2c4032', '#0d130f')
    + `<path d="M6 64C8 49 18 43 32 43S56 49 58 64Z" fill="#2f4a35"/><path d="M22 47L32 56 42 47" stroke="#1d3022" stroke-width="2" fill="none"/>`
    + neck('#b47f5a')
    + `<path d="M15 44C14 24 21 9 32 9S50 24 49 44C45 40 41 38 40 31V24C40 19 37 16 32 16S24 19 24 24V31C23 38 19 40 15 44Z" fill="#3a5a40" stroke="#1d3022" stroke-width="1.2"/>`
    + `<path d="${FACE}" fill="#c98e66"/>` + shade(FACE)
    + `<path d="M24 22C26 16.5 29 15.5 32 15.5S38 16.5 40 22C37 19.5 35 19 32 19S27 19.5 24 22Z" fill="#000" opacity=".45"/>`
    + eyes() + brows('#3b2615', 24.4)
    + `<path d="M25.2 31C26 38 28.5 42.5 32 42.5S38 38 38.8 31C37 34 35 35.5 32 35.5S27 34 25.2 31Z" fill="#5a3a22"/><path d="M30 36.4Q32 37.4 34 36.4" stroke="#2a1a10" stroke-width=".9" fill="none"/>` },
  m3: { n: 'Barbarul', g: 'm', svg: DEF('#4a3524', '#120c08')
    + `<path d="M17 18C13 26 13 40 15 50L22 48C20 40 21 30 24 24Z" fill="#3b2615"/><path d="M47 18C51 26 51 40 49 50L42 48C44 40 43 30 40 24Z" fill="#3b2615"/>`
    + `<path d="M6 64C8 50 18 45 32 45S56 50 58 64Z" fill="#6b4a2e"/><path d="M6 64C7 56 12 50 18 48C15 53 14 58 15 64ZM58 64C57 56 52 50 46 48C49 53 50 58 49 64Z" fill="#a07a52"/>`
    + `<path d="M8 58Q12 54 10 50M14 60Q17 55 15 51M50 58Q52 54 54 50" stroke="#c9a77a" stroke-width="1" fill="none"/>`
    + neck('#e0ad88')
    + `<path d="${FACE}" fill="#e8b896"/>` + shade(FACE)
    + `<path d="M23.5 25C23 15 27 11 32 11S41 15 40.5 25C39 20 36 18 32 18S25 20 23.5 25Z" fill="#3b2615"/>`
    + `<path d="M23.6 21.5Q32 18.5 40.4 21.5L40 24Q32 21.2 24 24Z" fill="#9c2f29"/>`
    + eyes() + brows('#3b2615', 25)
    + `<path d="M25 30C25.5 39 28 45 32 45S38.5 39 39 30C37 33.5 35 34.6 32 34.6S27 33.5 25 30Z" fill="#c08a3e"/><path d="M29 36Q32 37.6 35 36" stroke="#6b4a1e" stroke-width="1" fill="none"/>`
    + `<path d="M29.5 42L28.5 47M34.5 42L35.5 47" stroke="#c08a3e" stroke-width="1.6" stroke-linecap="round"/>` },
  m4: { n: 'Lordul', g: 'm', svg: DEF('#4a2430', '#12080c')
    + `<path d="M4 64C6 49 17 43 32 43S58 49 60 64Z" fill="#6e1f2a"/><path d="M20 45L32 60 44 45" fill="#d7dde0"/><path d="M24 46L32 56 40 46" fill="#3a2028"/>`
    + `<circle cx="32" cy="55" r="2.6" fill="url(#gd)" stroke="#5c430c" stroke-width=".8"/>`
    + neck('#d7a27c')
    + `<path d="${FACE}" fill="#e3ad87"/>` + shade(FACE)
    + `<path d="M24 25C23.5 16 27 12.5 32 12.5S40.5 16 40 25C38.5 21 37 19.5 34 19C30 18.5 27 20 24 25Z" fill="#1d1a19"/>`
    + `<path d="M24.5 19.5L26.5 13.5 29.3 17 32 12 34.7 17 37.5 13.5 39.5 19.5Q32 17.6 24.5 19.5Z" fill="url(#gd)" stroke="#5c430c" stroke-width=".7"/><circle cx="32" cy="16.6" r="1" fill="#c0504a"/>`
    + eyes() + brows('#1d1a19', 24.4)
    + `<path d="M28.5 33.6Q32 32.6 35.5 33.6Q32 34.6 28.5 33.6Z" fill="#1d1a19"/><path d="M30.5 36.2Q32 37 33.5 36.2" stroke="#7a4a35" stroke-width=".8" fill="none"/>` },
  /* ---------------- femei */
  f1: { n: 'Valkiria', g: 'f', svg: DEF('#34464f', '#0e1417')
    + `<path d="M21 26C17 34 17 44 19 54L23 54C22 46 22 38 25 30ZM43 26C47 34 47 44 45 54L41 54C42 46 42 38 39 30Z" fill="#e2c47a"/><path d="M19.5 34H22.5M19 39H22M19.2 44H22.2M41.5 34H44.5M42 39H45M41.8 44H44.8" stroke="#a8862f" stroke-width="1"/>`
    + `<path d="M8 64C10 51 19 46 32 46S54 51 56 64Z" fill="url(#st)" stroke="#2a3134" stroke-width="1.2"/>`
    + neck('#e8b896')
    + `<path d="${FACEF}" fill="#f1c9a8"/>` + shade(FACEF)
    + `<path d="M22.5 25C22.5 15 26.5 10.5 32 10.5S41.5 15 41.5 25L39 23C38 19 35.5 17.5 32 17.5S26 19 25 23Z" fill="url(#st)" stroke="#2a3134" stroke-width="1.1"/>`
    + `<path d="M23 18C17 14 13 15 10 18C14 18 17 20 19 23C20 21 21.5 19.5 23 18Z" fill="#e9eef0" stroke="#7d8a91" stroke-width=".8"/><path d="M41 18C47 14 51 15 54 18C50 18 47 20 45 23C44 21 42.5 19.5 41 18Z" fill="#e9eef0" stroke="#7d8a91" stroke-width=".8"/>`
    + `<path d="M31 11V18.5H33V11Z" fill="#7d8a91"/>`
    + eyes('#1f2a33', 26.8) + brows('#a8862f', 24.6)
    + `<path d="M30.4 34.4Q32 35.4 33.6 34.4" stroke="#b5655a" stroke-width="1.2" fill="none" stroke-linecap="round"/>` },
  f2: { n: 'Iscoada', g: 'f', svg: DEF('#3a2742', '#100a12')
    + `<path d="M6 64C8 49 18 43 32 43S56 49 58 64Z" fill="#3b2a45"/><path d="M20 46Q32 54 44 46" stroke="#1e1424" stroke-width="2" fill="none"/>`
    + neck('#c69072')
    + `<path d="M15 45C14 24 21 9 32 9S50 24 49 45C45 41 41 38 40 31V24C40 19 37 16 32 16S24 19 24 24V31C23 38 19 41 15 45Z" fill="#4a3456" stroke="#1e1424" stroke-width="1.2"/>`
    + `<path d="${FACEF}" fill="#d9a07f"/>` + shade(FACEF)
    + `<path d="M25 24C25.5 19 28 16.5 32 16.5C30 19 28.5 23 28.8 30C27 28 25.6 26 25 24Z" fill="#1b1012"/><path d="M39 24C38.5 19 36 16.5 32 16.5C33 18 34 20 35 21Z" fill="#1b1012"/>`
    + eyes('#1b1012', 26.8) + brows('#1b1012', 24.6)
    + `<path d="M25.4 31.5Q32 34 38.6 31.5L38.6 36C36.5 38.6 34.4 39.4 32 39.4S27.5 38.6 25.4 36Z" fill="#2b1f33"/>` },
  f3: { n: 'Prințesa', g: 'f', svg: DEF('#4a2a20', '#140a07')
    + `<path d="M22 17C15 23 14 38 17 56L24 52C22 42 22 32 25 25ZM42 17C49 23 50 38 47 56L40 52C42 42 42 32 39 25Z" fill="#9a3a1e"/>`
    + `<path d="M8 64C10 51 19 46 32 46S54 51 56 64Z" fill="#5a3a24"/><path d="M8 64C10 51 19 46 32 46L32 50C22 50 15 55 13 64Z" fill="#6e4a30"/><path d="M27 47L32 53 37 47" stroke="url(#gd)" stroke-width="1.6" fill="none"/>`
    + neck('#e8b896')
    + `<path d="${FACEF}" fill="#f1c9a8"/>` + shade(FACEF)
    + `<path d="M24.6 26C24 16 27.6 11.5 32 11.5S40 16 39.4 26C38 21 35.6 18.6 32 18.2C28.4 18.6 26 21 24.6 26Z" fill="#b2462a"/>`
    + `<path d="M25.6 19.4Q32 15.6 38.4 19.4L37.6 20.8Q32 17.8 26.4 20.8Z" fill="url(#gd)"/><path d="M32 14.4L33.4 17.2H30.6Z" fill="url(#gd)"/><circle cx="32" cy="17.4" r=".9" fill="#5fc4d0"/>`
    + eyes('#2a3a1a', 26.8) + brows('#8a3018', 24.6)
    + `<path d="M30.3 34.2Q32 35.4 33.7 34.2" stroke="#b5554a" stroke-width="1.3" fill="none" stroke-linecap="round"/>` },
  f4: { n: 'Vrăjitoarea', g: 'f', svg: DEF('#1f3c40', '#081214')
    + `<path d="M20 20C14 28 15 44 18 52L26 50C23 42 23 32 25 26ZM44 20C50 28 49 44 46 52L38 50C41 42 41 32 39 26Z" fill="#14181c"/>`
    + `<path d="M6 64C8 50 18 45 32 45S56 50 58 64Z" fill="#1f5257"/><path d="M24 46L32 64 40 46" fill="#163a3e"/>`
    + `<path d="M28.5 50L32 55.5 35.5 50Z" fill="#7ee8ff" opacity=".9"/><circle cx="32" cy="52" r="5" fill="#7ee8ff" opacity=".18"/>`
    + neck('#8d5a3b')
    + `<path d="${FACEF}" fill="#a26a47"/>` + shade(FACEF)
    + `<path d="M24.6 25C24 15.5 27.6 11.5 32 11.5S40 15.5 39.4 25C38 20 36 18 32 17.8C28 18 26 20 24.6 25Z" fill="#14181c"/><ellipse cx="32" cy="11" rx="5" ry="3.6" fill="#14181c"/><path d="M28 11.4H36" stroke="#7ee8ff" stroke-width=".8" opacity=".7"/>`
    + eyes('#0e1214', 26.8) + brows('#14181c', 24.6)
    + `<circle cx="25.2" cy="31" r="1" fill="url(#gd)"/><circle cx="38.8" cy="31" r="1" fill="url(#gd)"/>`
    + `<path d="M30.3 34.2Q32 35.2 33.7 34.2" stroke="#5a2a20" stroke-width="1.2" fill="none" stroke-linecap="round"/>` }
};

const HC_NAMES = { m: ['Radu', 'Vlad', 'Mircea', 'Ștefan', 'Dragoș', 'Bogdan', 'Tudor', 'Matei', 'Sorin', 'Costin', 'Iancu', 'Horia'],
  f: ['Ilinca', 'Ioana', 'Anca', 'Maria', 'Dana', 'Oana', 'Irina', 'Smaranda', 'Ruxandra', 'Doina', 'Sanda', 'Viorica'] };
/* portretele pictate (imagini/eroi/<id>.jpg); desenele vechi rămân doar dedesubt, dacă imaginea lipsește */
const HERO_PIC = { m1: 'Nobilul', m2: 'Veteranul', m3: 'Cavalerul tânăr', f1: 'Cavalerița', f2: 'Comandanta', f3: 'Războinica din nord' };
for (const k in HERO_PIC) if (HERO_ICONS[k]) HERO_ICONS[k].n = HERO_PIC[k];
const hcIds = g => Object.keys(HERO_PIC).filter(k => HERO_ICONS[k] && HERO_ICONS[k].g === g);
const heroId = ic => (HERO_PIC[ic] ? ic : String(ic || '').startsWith('f') ? 'f1' : 'm1');   /* m4 / f4 vechi → primul portret de același gen */
/* id-urile din SVG primesc sufixul portretului: altfel gradientele a două portrete diferite din aceeași pagină s-ar încurca */
let heroN = 0;   /* fiecare portret are gradientele lui: unul ascuns (de ex. echipa din bara de sus, pe telefon) nu le mai poate „împrumuta” celorlalte */
const heroSvg = (id, z) => { const d = HERO_ICONS[id] || HERO_ICONS.m1, u = id + '-' + (++heroN); return `<svg viewBox="0 0 64 64" width="${z}" height="${z}" role="img" aria-label="${d.n}">${d.svg.replace(/id="(\w+)"/g, `id="$1-${u}"`).replace(/url\(#(\w+)\)/g, `url(#$1-${u})`).replace(/<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)"/g, '<ellipse cx="$1" cy="$2" rx="$3" ry="$3"')}</svg>`; };   /* elipse, nu cercuri: unele stiluri din tema.css (inelul de experiență) golesc orice <circle> */
function heroAv(f, z) {
  z = z || 44; const id = heroId(f.ic);
  return `<span class="avw hav" style="width:${z}px;height:${z}px">${heroSvg(id, z)}<img src="imagini/eroi/${id}.jpg" alt="" loading="lazy" onerror="this.remove()"></span>`;
}

/* ------------------------------------------------------------------ CREARE / SCHIMBARE */
const HC = { g: 'm', ic: 'm1', n: '', auto: true, mode: 'new' };
const hcRand = g => { const l = HC_NAMES[g]; return l[Math.floor(Math.random() * l.length)]; };
const hcHero = () => S.fs.find(f => f.h) || S.fs[0];
/* jucătorii vechi (cu progres) nu sunt opriți la intrare */
function hcNeed() {
  if (!S || S.hc) return false;
  if (S.lvl > 1 || S.xp > 0 || (S.inv && S.inv.length) || (S.tu === -1 && S.lvl > 1)) { S.hc = 1; return false; }
  return true;
}
function hcStart(mode) {
  const h = hcHero(), g = h.g || (HERO_ICONS[h.ic] ? HERO_ICONS[h.ic].g : 'm');
  HC.mode = mode; HC.g = g; HC.ic = HERO_PIC[h.ic] ? h.ic : hcIds(g)[0];
  HC.auto = mode === 'new' || !h.n || h.n === 'Eroul'; HC.n = HC.auto && mode === 'new' ? hcRand(g) : h.n;
}
function hcCard() {
  const d = HERO_ICONS[HC.ic], seg = (g, t) => `<button type="button" role="radio" aria-checked="${HC.g === g}" class="${HC.g === g ? 'on' : ''}" onclick="hcG('${g}')">${t}</button>`;
  return `<div class="hc" id="hc-root"><h2 class="g-h">${HC.mode === 'new' ? (HC.g === 'f' ? 'Creează-ți eroina' : 'Creează-ți eroul') : (HC.g === 'f' ? 'Aspectul eroinei' : 'Aspectul eroului')}</h2>`
    + `<div class="hc-prev">${heroAv({ ic: HC.ic }, 84)}<div><b id="hc-pn">${cEsc(HC.n || '…')}</b><small>${d.n}</small></div></div>`
    + `<div class="hc-seg" role="radiogroup" aria-label="Eroul tău este">${seg('m', 'Bărbat')}${seg('f', 'Femeie')}</div>`
    + `<div class="hc-grid" role="radiogroup" aria-label="Portret">${hcIds(HC.g).map(id => `<button type="button" role="radio" aria-checked="${id === HC.ic}" class="${id === HC.ic ? 'on' : ''}" onclick="hcI('${id}')" title="${HERO_ICONS[id].n}">${heroAv({ ic: id }, 60)}<small>${HERO_ICONS[id].n}</small></button>`).join('')}</div>`
    + (HC.mode === 'new' ? `<label class="g-f" for="hc-n"><span>${HC.g === 'f' ? 'Numele eroinei' : 'Numele eroului'}</span><span class="g-in"><input id="hc-n" maxlength="14" autocomplete="off" spellcheck="false" value="${cEsc(HC.n)}" oninput="hcN(this.value)"><button type="button" class="g-eye" onclick="hcRoll()" aria-label="Alt nume" title="Alt nume">🎲</button></span></label>` : `<p class="mute">Numele se schimbă din <b>Cont › Nume</b>.</p>`)
    + `<p class="g-msg" id="hc-msg" role="status"></p><button class="g-go" type="button" onclick="hcDone()">${HC.mode === 'new' ? 'Începe aventura' : 'Salvează'}</button></div>`;
}
function hcRender() { const r = document.getElementById('hc-root'); if (r) r.outerHTML = hcCard(); }
function hcG(g) { if (HC.g === g) return; HC.g = g; HC.ic = hcIds(g)[0]; if (HC.auto) HC.n = hcRand(g); hcRender(); }
function hcI(id) { HC.ic = id; hcRender(); }
function hcN(v) { HC.n = v; HC.auto = false; const p = document.getElementById('hc-pn'), m = document.getElementById('hc-msg'); if (p) p.textContent = v.trim() || '…'; if (m) { m.className = 'g-msg'; m.textContent = ''; } }
function hcRoll() { HC.n = hcRand(HC.g); HC.auto = true; const i = document.getElementById('hc-n'); if (i) i.value = HC.n; hcN(HC.n); HC.auto = true; }
function hcDone() {
  const n = String(HC.n || '').replace(/[<>"&]/g, '').trim().slice(0, 14), m = document.getElementById('hc-msg');
  if (HC.mode === 'new' && n.length < 2) { if (m) { m.className = 'g-msg err'; m.textContent = 'Numele trebuie să aibă cel puțin 2 litere.'; } return; }
  const h = hcHero(); if (HC.mode === 'new') h.n = n; h.g = HC.g; h.ic = HC.ic; const first = !S.hc; S.hc = 1;   /* „Schimbă aspectul” nu atinge numele */
  if (HC.mode === 'new') { contHide(); if (first) S.msg = `Bun venit, ${n}! Satul te așteaptă.`; }
  else lgClose();
  go();
  if (typeof lwSync === 'function' && typeof CONT !== 'undefined' && CONT.user) setTimeout(() => lwSync(true), 0);   /* ceilalți văd imediat portretul și numele */
}
/* din Echipă: aceeași fereastră, într-o fereastră a jocului */
function hcEdit() { hcStart('edit'); mdl(hcCard(), 'hc-b'); }

(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `
.hav{background:#0b0e10}.hav>svg{border-radius:50%}
.hh-r .hav svg,.hav svg{transform:none}
.hc .g-h{margin-bottom:10px}
.hc-prev{display:flex;align-items:center;gap:14px;margin:0 0 12px}
.hc-prev b{display:block;font:700 22px Cinzel,serif;color:var(--ink);overflow-wrap:anywhere}.hc-prev small{color:var(--gold2);font-size:15px}
.hc-seg{display:grid;grid-template-columns:1fr 1fr;margin:0 0 10px;border:1px solid var(--line);border-radius:6px;overflow:hidden}
.hc-seg button{border:0;border-radius:0;box-shadow:none;background:#0b0e10;color:var(--mute);padding:9px;font:700 15px Cinzel,serif}
.hc-seg button.on{background:linear-gradient(180deg,#3a3016,#1d170a);color:var(--gold2)}
.hc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 12px}
.hc-grid button{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 2px;background:#0b0e10;border:1px solid var(--line);border-radius:6px;box-shadow:none}
.hc-grid button.on{border-color:var(--gold2);background:linear-gradient(180deg,#2a2412,#141008);box-shadow:0 0 0 1px var(--gold2),0 0 12px #f0d27a33}
.hc-grid small{font-size:12px;color:var(--mute)}.hc-grid button.on small{color:var(--gold2)}
.hc-seg button:focus-visible,.hc-grid button:focus-visible{outline:2px solid var(--gold2);outline-offset:2px}
.lgm-b.hc-b{width:min(94vw,420px);text-align:left}
@media (max-width:300px){.hc-grid{grid-template-columns:repeat(2,1fr)}}
`;
  document.head.appendChild(st);
})();
