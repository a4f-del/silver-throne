# Silver Throne BETA — Pasul 34: verificări de lansare, salvări și browser

Data: 8 noiembrie 2026. Fără schimbări de economie, progresie sau migrări SQL în această etapă.

## Ce am adăugat

### 1. Smoke static automat pentru fișiere web / PWA
`dev/test-beta-release-assets.js` verifică:
- fiecare JS/CSS/manifest/iconă locală referită de `index.html` și `manifest.webmanifest` există;
- niciun JS/CSS local nu apare de două ori sau fără versiune de cache;
- toate scripturile locale și scriptul inline principal pot fi analizate sintactic;
- manifestul PWA și politica service worker „network first” nu interceptează Supabase/CDN;
- modulele esențiale — Lume, Tron, Cont, atelierul breslei, filtrele Fierăriei — există.

Nu testează pixelii sau compatibilitatea browserelor și nu face cereri web.

### 2. Compatibilitatea salvărilor LIVE/BETA
`load(src)` nu mai presupune că toate salvările vechi au `S.ui`. Dacă lipsesc preferințele sau sunt invalide, inițializează o structură goală înainte de a accesa `S.ui.q`/`S.ui.p`/`S.ui.s`. Inventarul, formațiile, aurul, minereul și programele de progres rămân neschimbate.

`dev/test-beta-save-compatibility.js` rulează în memorie funcțiile **reale** `load` și `save` cu mai multe scenarii: salvări LIVE/BETA fără UI, echipamentul eroului în format vechi, eroul aflat în rezervă, transfer de materiale istorice, păstrarea contoarelor de eșec din Fierărie, a presetărilor și a sumelor. Nu folosește niciun cont, nu trimite date în Supabase și nu scrie în localStorage real.

### 3. Smoke manual în browser pentru mobil și desktop
`dev/smoke-beta-screens.mjs` acoperă acum inclusiv ecranul **Fierăriei**, activând temporar nivelul de test doar într-o copie din memoria paginii. Opțional, `ST_SMOKE_MOBILE=1` rulează un al doilea tur la lățimea de 390px și raportează depășirile orizontale de peste 20px.

Acest instrument cere un cont **BETA de QA explicit creat și de unică folosință**, cu sesiunea locală disponibilă; niciun secret/cookie nu intră în repository. Nu apasă butoanele de atac, cumpărare sau îmbunătățire și încearcă să suprime salvările pe durata simulării.

## Comenzi

Teste statice automate CI:

```sh
node dev/test-beta-release-assets.js
node dev/test-beta-save-compatibility.js
node --check dev/smoke-beta-screens.mjs
```

Pentru QA real, de pe calculatorul operatorului (cu fișierul de autentificare generat **local** prin Playwright, în afara repository-ului):

```sh
ST_BETA_SMOKE_STATE=/cale/privata/qa-auth-state.json ST_SMOKE_MOBILE=1 node dev/smoke-beta-screens.mjs
```

Nu publica fișierul de autentificare și nu-l atașa în probleme GitHub. Nu folosi un cont LIVE. Evită executarea împotriva unui cont BETA cu progres important.

## Ce rămâne deschis înainte de bifare

- Rularea efectivă a smoke testului autentificat în Chromium, desktop și mobil, inclusiv verificarea elementelor noi din Fierărie și Bresle.
- Verificare manuală a layoutului pe iOS/Safari și Android/Chrome, în special elemente de căutare, select-uri și harta Lumii.
- Un test de restaurare a unei salvări reale **redactate**, cu backup și validarea faptului că nu a pierdut inventarul sau progresul. Nu transfera date personale în teste.
- Verificarea instalării și funcționării migrărilor SQL BETA 17–21; GitHub Pages nu le aplică.
- Telemetrie minimă pentru finalizarea tutorialului, primul boss, retenția D1/D7 și activitatea endgame. Nu inventăm măsurători și nu adăugăm colectare nouă de date fără plan de confidențialitate și sursă server-side.

**Status:** implementare statică/teste și un mic fix de compatibilitate. QA autentificat și telemetry rămân deschise. Pasul 34 nu trebuie bifat înainte de acestea.
