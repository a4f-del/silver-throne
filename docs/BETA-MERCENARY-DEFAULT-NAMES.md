# Silver Throne BETA — Pasul 06, parte 1: mercenari cu nume proprii

Data: 7 noiembrie 2026. Schimbarea propusă se aplică **numai** noilor eroi BETA, cu `jeFocus()` activ (`journeyV=1`, `journeyUxV=2`) și marcajul `S.mrPresetV=1` înscris doar la crearea eroului.

## De ce
În scenariul de introducere, jucătorul primea un dialog narativ, apăsa „Primește-l”, apoi era obligat să treacă printr-un al doilea dialog pentru a accepta un nume deja sugerat. Era un pas artificial, mai ales pe mobil. Acest lucru se simplifică fără a elimina personalizarea.

## Nume recomandate
- Paznic — **Toma**
- Arcaș — **Ilinca**
- Războinic — **Radu**
- Vraci — **Matei**
- Mag — **Ioana**

Sunt primele nume din sugestiile deja existente în `MR.sug`. Dacă un nume este deja folosit de un personaj din echipă, se folosește următorul nume disponibil din lista clasei.

## Funcționare
1. În scena mercenarului, numele său este vizibil înainte de recrutare.
2. „Primește-l” adaugă imediat mercenarul în echipă sau rezervă. Nu apare o fereastră obligatorie pentru alegerea numelui.
3. Mesajul de confirmare arată numele mercenarului și explică opțiunea `Cont → Nume`.
4. Prima schimbare de nume rămâne gratuită pentru fiecare mercenar (`f.rnf` este neschimbat).
5. Scenele, condițiile de deblocare, progresul, forța, echipamentul, darurile și costurile nu sunt afectate.

## Poveste fără întreruperi suplimentare
- Scena noului mercenar afișează **numele**, un dialog scurt și butonul de recrutare. Explicația lungă poate fi deschisă la „Citește povestea completă”, fără a fi obligatorie.
- „Mai târziu” rămâne disponibil; oferta nu dispare și poate fi acceptată ulterior din Han.
- În Han, eroii BETA noi văd un mic detaliu „Revede poveștile tovarășilor” cu prologul și scenele deja descoperite. Nu mai apare panoul BETA de previzualizare cu toate spoilerele.
- Eroii noi nu pot deschide sau previzualiza o scenă peste luptă.
- Conturile BETA vechi păstrează instrumentele QA de previzualizare, iar LIVE rămâne neschimbat.

## Siguranță
- Eroii deja creați în BETA (fără `mrPresetV`) și eroii LIVE păstrează fereastra de numire și propriile nume.
- Nu rescriem în masă salvările existente și nu atingem datele de pe server.
- Personajele noi păstrează marcajul de recrutare obișnuit; tutorialul le recunoaște imediat.
- Fără SQL, fără recompense noi.

## Teste propuse
```sh
node dev/test-beta-mercenary-default-names.js
node dev/test-beta-mercenary-story.js
node dev/test-beta-new-player-first-captain.js
node dev/test-drumul-eroului.js
```

## QA manual obligatoriu în BETA
1. Creează un **erou nou de test**: după prolog, scena Paznicului îl prezintă ca Toma.
2. Apasă „Primește-l”: intră direct în echipă, fără fereastra „Cum se numește?”.
3. Mergi în `Cont → Nume` și verifică prima redenumire gratuită, apoi reîncarcă jocul.
4. Recrutează celelalte clase: toate numele sunt afișate în scenă și păstrate după refresh.
5. Folosește un erou numit „Toma”: Paznicul primește automat următoarea sugestie („Petru”).
6. Verifică erou BETA vechi și LIVE: numele și fluxul de numire nu se schimbă.
7. Testează mobil și desktop; nu trebuie să apară un popup după scena de recrutare.

Acesta este doar **primul subpas** al pasului 06 (povestea și ferestrele mercenarilor). Pasul 06 rămâne nebifat până la testare și acceptare.
