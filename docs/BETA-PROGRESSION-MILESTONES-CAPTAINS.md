# Silver Throne BETA — Repere de progresie și pregătirea pentru căpitani

Data: 8 noiembrie 2026. Pașii din roadmap: **10, 11 și 14**.

## Scop
Jucătorul înțelege ce a deblocat și de ce contează fără un șir de popup-uri. Înaintea căpitanului vede informațiile tactice deja calculate, fără meniuri noi sau ajustări ale balanței.

## Pasul 10 — Repere 5 / 8 / 15 / 20 / 30
În BETA pentru eroii noi cu `jeFocus()`, după încheierea Drumului Eroului și prima deschidere a Campaniei, cardul unic indică cea mai relevantă deblocare nevăzută:
- nivel 5: Lumea, `Hartă → Lumea`;
- nivel 8: Catacombele Uitate, `Coborâre`;
- nivel 15: Bazarul, `Sat → Piață → Bazar`;
- nivel 20: Turnul, `Coborâre → Turn`;
- nivel 30: al patrulea loc în echipa de Temnițe, `Echipă`.

Cardul este afișat doar în Sat, Coborâre sau Echipă, nu în luptă, nu peste Campanie, nu peste misiunea activă. Un singur buton **„Am înțeles”** marchează persistently pragurile până la cel afișat (`S.jeMilestoneSeen`). Dacă un jucător crește multe niveluri între vizite, apare doar ultimul prag relevant; pragurile intermediare sunt marcate ca văzute pentru a preveni cascadele de popup-uri. Nu se acordă premii prin card.

## Pasul 11 — Pregătire pentru căpitan
În panoul de pregătire mare al Temniței BETA, apare **maximum un sfat scurt**, în această ordine:
1. Cineva din echipă este căzut → Infirmerie.
2. Cineva are sub 55% din viața maximă → vindecare.
3. Estimarea reală de victorie este sub 55% → antrenament/echipament (fără a promite un procent de îmbunătățire).
4. Căpitanul are o contraclasă care lipsește din echipa vie → poți aduce acea clasă.

Butonul Luptă, calculul șanselor, daunele și costul luptei rămân identice.

## Pasul 14 — Contraclasa la vedere
Cardul mare al căpitanului arată abilitatea specială deja existentă, contraclasa citită din `TR_C`, plus dacă aceasta este **vie și activă în echipa curentă**. Un mercenar în rezervă, plecat sau căzut nu este prezentat drept activ. Informația rămâne vizibilă și în previzualizarea căpitanului, dar nu apare acțiune de luptă pe un adversar blocat.

## Restricții
- Modulul `aventura-carduri.js` se folosește doar în ecranul Temniței BETA; milestone-urile sunt doar `jeFocus()`.
- Nu modificăm LIVE, salvările vechi, conținutul temnițelor sau motorul de combat.
- Fără SQL, recompense, costuri sau monede noi.
- Repo-ul folosește cache-busting pentru JS/CSS și CI cu toate regresiile.

## Verificare automată
```sh
node dev/test-beta-progression-milestones-captains.js
node dev/test-beta-first-dungeon-clarity.js
node dev/test-beta-compact-dungeon-screen.js
node dev/test-beta-campaign-checklist-link.js
```

## QA manual înainte de bifare
1. Cu erou nou BETA, după tutorial și Campanie, atinge nivelurile 5, 8, 15, 20 și 30, verificând un singur card cu locul și explicația corectă.
2. Cu un cont de test la nivel 30 care nu a văzut niciun reper, verifică să apară doar nivelul 30, nu cinci ferestre succesive.
3. Reîncarcă după „Am înțeles”: cardul nu revine.
4. În Mina Cenușie, previzualizează căpitanul: abilitatea și Magul contraclasă apar, fără buton de atac pe previzualizarea blocată.
5. Fără Mag în echipa vie, verifică „nu este în echipă”; cu Mag viu, verifică „este în echipa ta”; cu Mag căzut, indicația revine la „nu este în echipă”.
6. Pentru șanse sub 55%, verifică sfatul de pregătire fără modificarea rezultatului simulării; testează o echipă rănită/căzută.
7. Testează pe mobil și desktop, cu cache actualizat. Verifică și LIVE / erou BETA vechi.

**Status:** implementare tehnică BETA și regresii; verificarea vizuală este necesară înainte de bifarea pașilor în roadmap.
