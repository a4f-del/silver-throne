/* ============================================================================
   Silver Throne — cladiri-art.js
   Registru PUR (fără DOM, fără stare de joc) pentru aspectul vizual al clădirilor:
     tip de clădire + nivel de joc  →  imagine.
   Se încarcă înaintea teritorii.js și poate fi folosit și în Node (teste).

   Cum adaugi:
   - NIVEL 6:   pune imaginea  imagini/cladiri/<fișier>-6.png  pentru fiecare tip și adaugă un prag în `thresholds`
                (ex. [1,3,6,10,15,22]). Nimic altceva nu se schimbă.
   - CLĂDIRE NOUĂ: pune <fișier>-1.png … -N.png, adaugă o intrare în `types` (cheia = cheia clădirii din BN/BL
                din joc) cu `canvas:[lățime,înălțime]` ale imaginilor. Vezi docs/CLADIRI-ARTA.md.
   Nivelul clădirii vine ÎNTOTDEAUNA de la joc (S.bl); acest fișier doar traduce nivelul în imagine.
   ========================================================================== */
(function (root) {
  'use strict';
  const ART = {
    base: 'imagini/cladiri/',
    ext: 'png',
    /* Nivelul de joc de la care începe aspectul 1, 2, 3, 4, 5. Clădirile din joc pot avea nivel 1..~48, dar există 5 imagini.
       Pragurile au fost alese cu simulatorul (dev/sim-economy.js, nivel mediu al clădirilor, jucător nou, zile până la prag):
         nivel  5 → casual ~3 zile  · regulat ~1 zi   · intens ~1 zi     (prima schimbare vizibilă, rapidă)
         nivel 12 → casual ~10 zile · regulat ~4 zile · intens ~2 zile
         nivel 22 → casual ~35 zile · regulat ~20 zile · intens ~12 zile
         nivel 32 → casual ~190 zile · regulat ~95 zile · intens ~60 zile (aspectul final: obiectiv de lungă durată)
       Schimbări dese la început, apoi tot mai rare. Pentru corespondență 1:1 (nivel 1 → aspect 1 … nivel 5 → aspect 5)
       folosește [1, 2, 3, 4, 5]. O clădire poate avea praguri proprii: types.<cheie>.thresholds. */
    thresholds: [1, 5, 12, 22, 32],
    /* cheie = cheia clădirii din joc (BN/BL); file = prefixul fișierelor; canvas = dimensiunea imaginilor (px),
       identică pe toate nivelurile aceleiași clădiri, cu baza desenului jos-centru (scară constantă între niveluri). */
    types: {
      f: { file: 'topitorie',  nm: 'Topitorie',          canvas: [182, 144] },
      i: { file: 'infirmerie', nm: 'Infirmerie',         canvas: [196, 151] },
      b: { file: 'han',        nm: 'Hanul mercenarilor', canvas: [205, 166] },
      d: { file: 'depozit',    nm: 'Depozit',            canvas: [211, 141] },
      z: { file: 'zid',        nm: 'Zid',                canvas: [204, 161] },
      /* Fierăria: imagini pregătite, dar în joc NU există încă o clădire „Fierărie” (nu am inventat reguli pentru ea).
         Când o adaugi în BN/BL cu cheia 'w', se afișează automat. */
      w: { file: 'fierarie',   nm: 'Fierărie',           canvas: [209, 155], inGame: false }
    }
  };
  /* Nivel de joc → aspect 0..N (0 = șantier, fără imagine). Intrări invalide (NaN, negativ, undefined) → 0. */
  ART.th = type => (ART.types[type] && ART.types[type].thresholds) || ART.thresholds;
  ART.tier = function (level, type) {
    const lv = Math.floor(Number(level));
    if (!isFinite(lv) || lv < 1) return 0;
    let t = 0; for (const th of ART.th(type)) if (lv >= th) t++;
    return t;
  };
  ART.tiers = () => ART.thresholds.length;
  /* Următorul prag pentru o clădire la nivelul dat (sau null dacă are aspectul maxim). */
  ART.next = function (level, type) { const t = ART.tier(level, type), th = ART.th(type); return t < th.length ? th[t] : null; };
  ART.keys = () => Object.keys(ART.types).filter(k => ART.types[k].inGame !== false);
  /* URL-ul imaginii pentru (tip, nivel) sau null (nivel 0, tip necunoscut). */
  ART.urlTier = function (type, tier) {
    const t = ART.types[type]; if (!t || tier < 1 || tier > ART.tiers()) return null;
    return ART.base + t.file + '-' + tier + '.' + ART.ext;
  };
  ART.url = (type, level) => ART.urlTier(type, ART.tier(level, type));
  ART.allUrls = function () { const o = []; for (const k in ART.types) for (let t = 1; t <= ART.tiers(); t++) o.push(ART.urlTier(k, t)); return o; };
  if (typeof module !== 'undefined' && module.exports) module.exports = ART;
  root.ST_ART = ART;
})(typeof globalThis !== 'undefined' ? globalThis : this);
