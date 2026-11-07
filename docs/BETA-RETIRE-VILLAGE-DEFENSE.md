# BETA: retragerea apărării satului + teste de fum

## Motiv
În Silver Throne BETA, Lumea folosește sate NPC comune, care se pot jefui, dar nu cuceri. În schimb, în cod au rămas funcții de apărare pasivă a satului, străjeri și valori `vd` („% apărarea satului”) de pe obiecte. Apărarea fantomei echipei în PvP **nu** folosește aceste valori; PvP și raidurile NPC sunt păstrate.

## Ce schimbă acest PR (doar BETA)
- **Oprire atacuri automate** asupra satului personal în `atkCheck()`: vechiul cronometru nu mai poate scădea aleatoriu aur și minereu.
- **Fără recrutare de străjeri noi** sau cumpărare de bonusuri defensiv-economice pentru Zid. Clădirea „Apărare” nu mai este accesibilă din Satul BETA; accesarea unei rute salvate afișează un mesaj neutru, fără cheltuieli.
- **Nu se mai generează `vd` pe echipamentul nou**: efectul affixelor „Străjuitor” / „al Zidarului” devine apărare obișnuită în BETA, cu aceeași identitate vizuală a obiectului.
- **Obiectele istorice cu `s.vd` rămân intacte în salvări.** La calculul statisticilor, bonusul vechi este convertit în apărare normală (+1 apărare la aproximativ 4% din valoarea veche); nu este afișat ca statistică inutilă. În LIVE rămâne complet neschimbat.
- **Curățare texte și panouri**: Lumea comună nu mai promite teritorii personale, clasamentul „Teritorii” și vechiul contor lateral sunt ascunse în BETA, Zidul nu mai afișează upgrade mecanic.
- **Steagurile și renovările de prestigiu rămân disponibile** și sunt doar cosmetice. Nu modificăm `S.ren`, `S.cos`, `S.gd`, `S.ter` sau obiectele existente.
- **Întreținerea teritoriilor era deja dezactivată** (`terDaily() === 0` și `terB() === 0`); nu există SQL ori ștergere de date.
- PvP real din Lume, apărarea fantomei echipei, satele NPC comune, recompensa jefuirii, cele 4 ore de cooldown și Campania rămân intacte.

## Curățarea codului în siguranță
- `vMold()` **nu este încă eliminată**: `vMmap()` o folosește explicit ca fallback dacă harta ilustrată eșuează. Ștergerea ei fără teste ar produce exact un alt ecran gol.
- `lootItem()` **există în `teritorii.js`**. Dacă apare „lootItem is not defined”, trebuie verificată încărcarea scripturilor și eventualele erori de inițializare; nu ajută duplicarea funcției.
- `vK()`, `vB()`, `hero()`, `portrait0()` și hookurile `ptHook`, `bzHook`, `rwHook` vor fi evaluate pentru eliminare **în PR-uri separate**, fiecare cu verificarea tuturor apelurilor și teste de regresie. Acest PR nu șterge funcții a căror dependență nu a fost demonstrată inexistentă.
- `dev/test-beta-village-defense-retirement.js`: verifică echipament LIVE/BETA, resursele, UI, `lootItem` și parsează **toate scripturile jocului într-o singură declarație lexicală** pentru a detecta coliziuni precum cea care a blocat jocul la modulul de prieteni.

## Test de fum efectiv, ecran cu ecran
Fișier: `dev/smoke-beta-screens.mjs`. Deschide un browser Chromium și **randează fiecare ecran** din Sat, Echipă, Coborâre, Lumea, Campanie, Tron și Clasament, raportând `ReferenceError`, `SyntaxError`, `TypeError` și paginile fără conținut.

Este intenționat separat de testele fără browser. Necesită instalare locală Playwright și **un cont QA BETA de unică folosință** cu sesiunea exportată la un fișier din afara repo-ului:

```sh
npm install --no-save playwright
npx playwright install chromium
ST_BETA_SMOKE_STATE=/cale/locala/qa-auth-state.json node dev/smoke-beta-screens.mjs
```

Nu comite fișierul `qa-auth-state.json`: conține sesiunea contului. Smoke test-ul *nu* dă click pe luptă sau cumpărături; înlocuiește temporar `save()` în fila de test, navighează pe o copie a stării și restaurează interfața. Folosește numai conturi QA, nu conturile principale. Acest test **trebuie rulat pe BETA după merge**; nu poate fi verificat complet doar din GitHub.

## Test manual
1. Merge PR → hard-refresh `https://a4f-del.github.io/silver-throne/?server=beta`.
2. Deschide Sat → confirma că nu mai există „Apărare”; Topitorie / Antrenament → nicio creștere de Zid activă.
3. Deschide un obiect vechi „Străjuitor” / „al Zidarului” → vezi apărare de luptă în locul valorii vechi „apărarea satului”; obiectul nu dispare.
4. Jefuiește un NPC, testează un PvP și verifică recompensele și cooldown-ul.
5. Confirma că steagurile și renovările sunt disponibile.
6. Verifică LIVE separat: mecanica veche rămâne neschimbată până aprobăm o migrare distinctă.

**Fără SQL și fără resetarea datelor.**
