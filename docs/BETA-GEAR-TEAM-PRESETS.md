# Silver Throne BETA — Echipament și formații simple (pașii 12, 13 și 15)

Data: 8 noiembrie 2026.

## Pasul 12 — Armă potrivită clasei
În Rucsac și în selectorul de echipament, o armă arată tipul de clasă pentru care dă bonusul existent:
- Sabie pentru Campion, Topor pentru Războinic, Arc pentru Arcaș, Buzdugan pentru Paznic, Toiag pentru Mag, Sceptru pentru Vraci.
- Dacă luptătorul selectat are clasa corespunzătoare, apare „✓ Potrivit clasei”; altfel apare clasa recomandată și cea selectată.
- Comparația existentă de obiecte (mai bun/mai slab, statistici detaliate) rămâne. Nu blocăm echiparea unei arme nepotrivite și nu schimbăm bonusurile.

Eticheta se afișează numai în BETA, fără efect asupra LIVE. Armura/coiful/cizmele/bijuteriile rămân universale.

## Pasul 13 — Patru formații, fără clickuri inutile
Fila **Echipă → Compoziție și presetări** adaugă formațiile:
- Erou singur
- Erou +1
- Erou +2
- Erou +3 (după deblocarea celui de-al patrulea loc, nivelul 30)

„Formează” alege luptătorii deja activi și apoi cei disponibili în rezervă. Butonul **„Memorează echipa curentă”** salvează clasele pentru mărimea curentă într-una dintre cele patru configurații (`S.mrTeamPresets`), iar „Activează” reface acele clase. După salvare, configurațiile persistă prin salvarea existentă.

Protecții: eroul nu se scoate, un erou căzut nu poate porni o formație, nu se schimbă formația în luptă/aventură, nu se depășește plafonul, mercenarii plecați în expediții nu se întorc automat. O configurație salvată incompletă nu schimbă parțial echipa; mesajul explică de ce nu se poate încărca.

## Pasul 15 — Curățenie rapidă sigură
În Rucsac există deja „Vinde” și „Dezmembrează” în lot. Această etapă le acoperă cu teste pentru a nu șterge niciodată:
- obiectele legendare;
- obiectele Epic sau mai rare;
- obiectele blocate de jucător.

Este necesară confirmarea pentru lot și în caz de anulare inventarul rămâne identic. **„Ridică tot” din Topitorie există deja** și este testat: colectează numai sloturile cu forjare finalizată, cel mult o dată. Indicii echipării normale rămân cei din `S.inv` real, nu poziția din UI filtrat.

## Siguranță și limitări
Fără schimbări ale economiei, dropurilor, claselor, costurilor sau bazei de date. UI-ul formațiilor și al etichetelor este numai pentru BETA; LIVE rămâne neschimbat. Configurațiile sunt salvate pe personaj, nu sincronizate între conturi diferite.

## Teste automate
```sh
node dev/test-beta-gear-team-presets.js
node dev/test-beta-first-loot-weapon.js
node dev/test-beta-campaign-solo.js
node dev/test-beta-mercenary-default-names.js
```
Suita completă CI rulează toate testele `dev/test-*.js`.

## QA manual înainte de bifare
1. În BETA, selectează un Campion și compară Sabie/Arc; schimbă selecția pe Arcaș. Cardurile indică clasa potrivită în Rucsac și la înlocuirea slotului.
2. În Echipă → Compoziție, memorează erou +2, intră solo, revino la +2: mercenarii corecți revin fără dublare.
3. Memorează un Mag și trimite-l în expediție. Activarea formației salvate trebuie refuzată fără să scoată echipa curentă.
4. Verifică erou +3 la nivel sub 30 (dezactivat) și la nivel 30 (activ).
5. Intră în Temniță, încearcă schimbarea formației: nu este permisă.
6. În Rucsac, blochează un Comun, lasă un Legendar și un Epic, apoi vinde/dezmembrează în lot. Se consumă doar Comune/Magic neblocate, după confirmare.
7. Verifică mobil și desktop. Pe LIVE nu apare noul control de preseturi și nu sunt schimbate etichetele vechi.

**Status:** implementare BETA, verificarea în browser este necesară înainte de bifarea pașilor.
