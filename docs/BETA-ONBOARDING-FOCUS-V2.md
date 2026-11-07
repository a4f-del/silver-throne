# BETA — Primele 10 minute fără ghidare concurentă

## Ce se schimbă în această etapă
Înainte, „Drumul Eroului” era singurul jurnal nou, dar bara laterală „Acum”, bannerul de ritm, panourile de previzualizare pentru dezvoltatori și săgeata vechiului ghid concurau vizual cu el. Satul afișa toate cele 11 clădiri imediat.

**Acest PR restrânge experiența doar pentru eroii creați NOI pe BETA după integrare** (`S.journeyUxV=2`, pe lângă `S.journeyV=1`). Nu migrează salvările vechi, inclusiv conturile BETA deja create.

- **Un singur card cu obiectiv și recompensă**: `Drumul Eroului`. Se ascunde lista concurentă „Acum” din sidebar, bannerul evenimentelor, ghidul animat vechi și panoul de test al scenelor din Han. Scena reală a mercenarilor și prologul rămân.
- **Sat progresiv**: inițial doar **Topitorie, Han, Antrenament, Misiuni**. Restul clădirilor nu sunt clickable pe ilustratia Satului și nu apar în bara interioară decât la deblocare.
- **Siguranță**: `Vezi toate clădirile` expune oricând toate cele 11 clădiri fără resetare. Infirmeria apare imediat dacă un membru e rănit sau căzut, chiar dacă nu e etapa ei.
- După prima întoarcere din mină: **Infirmerie**.
- După recrutarea Arcașului și prima forjare, la revendicarea etapei: **Piață + Depozit**.
- După etapa cu Războinicul: **toate clădirile**.
- Pentru orice erou existent BETA sau LIVE: meniul, recompensele și ghidurile rămân neschimbate.

## Punctele în prima oră — proiect separat, nu schimbare ascunsă de echilibru
Propunerea „prima oră fără economie de puncte” este păstrată ca obiectiv de design, dar **nu sunt schimbate consumul sau regenerarea punctelor în acest PR**. În prezent mina și raidurile consumă puncte în funcțiile `startD`, `door`, `spend`. Eliminarea consumului pentru o oră ar introduce risc de farming și ar afecta recompensele.

Etapa recomandată: **Banca de odihnă / introducere limitată cu număr fix de lupte fără puncte**, verificabilă și netransferabilă, după ce testăm ritmul noii introduceri. Nu promitem o oră întreagă de farm gratuit; trebuie definit bugetul și protecția anti-abuz înainte de implementare.

## Testare
1. Integrează PR → refresh BETA → pe un cont BETA nou autorizat, creează un erou nou.
2. După prolog, vezi cardul unic Drumul Eroului; în Sat doar 4 clădiri.
3. În Han, nu vezi panoul de test al scenelor. În sidebar, nu vezi lista „Acum”.
4. Butonul `Vezi toate clădirile` trebuie să ofere acces imediat la clădirile ascunse.
5. Verifică Infirmeria după o rană și după întoarcerea din mină; apoi Piața + Depozitul după etapa cu Arcașul.
6. Conturile BETA vechi și LIVE trebuie să păstreze cele 11 clădiri.
7. Nu este SQL. Nu șterge salvările.
8. `node dev/test-beta-onboarding-focus.js`: regresiile de logică.

## De urmărit în test
Mai ales când după prolog poți recunoaște **singurul lucru important de făcut** și dacă lista de clădiri se dezvăluie suficient de natural fără să fie percepută ca o restricție.
