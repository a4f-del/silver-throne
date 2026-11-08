# Silver Throne BETA — Pașii 19–20: start rapid în Turn și progres vizibil

Data: 8 noiembrie 2026.

## Pasul 19 — Checkpoint-uri de Turn, fără farming suplimentar

În BETA, după ce ai **învins** etajele 20, 40, 60 și 80, poți selecta startul următoarei urcări din cardul Turnului:

| Record minim obținut | Start nou deblocat |
| --- | --- |
| 0 (implicit) | etajul 1 |
| 20 | etajul 21 |
| 40 | etajul 41 |
| 60 | etajul 61 |
| 80 | etajul 81 |

Pornim de la **etajul următor** pragului învins (nu chiar de la 20/40/60/80) pentru a nu reface gratuit străjerul de prag și obiectul lui.

Regulile rămân:
- O intrare consumă **6 puncte** și una dintre cele **3 urcări zilnice**, indiferent de checkpoint.
- Etajele sărite nu dau **niciun aur, minereu, XP, fragment, obiect sau legendar**. Nu cresc recordul săptămânal și nu deblochează trepte. Numai luptele efectiv câștigate prin `twWin()` produc aceste rezultate.
- `S.d.room=start-1`, astfel `door()` pornește efectiv lupta de la `start` și apelează `twFloor()` cu dificultatea reală acelui etaj. Nu există o luptă la etajul 20 după ce ai ales start 21.
- `S.tw.start` păstrează preferința în salvarea BETA, dar intrarea **revalidează** `S.tw.best` de fiecare dată. Un start arbitrar sau un record insuficient cade înapoi la etajul 1.
- LIVE folosește în continuare start etajul 1, fără selector și fără proprietatea `twStart` pe lupta salvată.

Soluția de recompense este deliberat conservatoare: **fără plată pentru sărituri**, deoarece recompensele de la etajele depășite au fost deja câștigate la primul record. Acest lucru evită farmingul de tip „intră → primește recompensa pentru 20/40/60 etaje fără luptă → ieși”.

## Pasul 20 — Progress la vedere

În cardul existent al Turnului arătăm:
- următorul străjer de etaj 10/20/.../100;
- următorul prag de Fierărie (+6 până la +9), cu progresul de la pragul precedent și bară accesibilă;
- recordul personal și al săptămânii, încercările zilnice și următorul legendar (acestea existau deja, păstrate în același card).

Fără altă fereastră, sistem de realizări sau monedă nouă. Etajele 20/25/30/.../100 și condițiile pentru legendare rămân exact cele din `TW_LG`, cu recompense unice în `twWin()`.

## Teste
```sh
node dev/test-beta-tower-checkpoints.js
node dev/test-beta-adventure-mode.js
node dev/test-beta-adventure-monster-cards.js
node dev/test-beta-pvp-card-animations.js
```
Suita completă este rulată de GitHub Actions.

## QA manual încă necesar
1. Erou BETA nivel 20, record 0: doar etajul 1 activ; celelalte opțiuni blocate.
2. La record 20, selectează etajul 21 și intră: cost exact 6 puncte și o urcare; primul inamic este pe 21, nu 20.
3. Urmărește dificultatea efectivă și prada până la etajul 30: numai luptele câștigate produc recompense; nu apare vreun legendar de la etajele sărite.
4. Repetă la record 40/60/80 și verifică etajele 41/61/81.
5. Ieși, reîncarcă pagina și reintră: preferința salvată se păstrează.
6. Cu 3 urcări deja consumate, nu se poate intra din checkpoint chiar dacă e deblocat.
7. Verifică progress bar, următorul străjer, recordul și următorul legendar pe mobil și desktop.
8. Compară cu LIVE: Turnul începe tot la 1 și nu apar opțiunile noi.

**Status:** cod implementat în BETA, fără verificare browser autentificată. Pașii 19 și 20 rămân nebifați până la QA.
