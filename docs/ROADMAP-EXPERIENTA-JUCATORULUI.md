# Silver Throne — Roadmap de experiență (jucător nou → endgame)
Data: 7 noiembrie 2026 · BETA / implementări incrementale.

## Obiectiv
Facem jocul mai clar, mai satisfăcător și mai ușor de întreținut, fără sisteme repetitive noi. Cele trei bucle principale rămân:
**Temnițe = progres, Turn = provocare endgame, Lume/Tron = competiție/social.**
Expedițiile mercenarilor sunt activități pasive, nu o a patra buclă obligatorie.

## Reguli pentru fiecare pas
- Ordinea de mai jos este prioritatea implicită. **Începem cu noul jucător**.
- Un pas = un PR BETA mic, cu teste automate și checklist manual; se bifează numai după testarea în BETA și confirmare.
- LIVE, salvările existente, progresul, inventarele și breslele nu se resetează sau modifică neintenționat.
- Schimbările SQL sunt documentate separat; merge-ul GitHub nu execută migrări Supabase.
- Nu adăugăm monede, clădiri, raiduri sau sisteme de farming înainte să fie clar că sunt necesare.
- Dacă un pas depinde de altul, se implementează mai întâi prerechizitul de siguranță.
- Statusuri: [ ] planificat; [x] verificat în joc și acceptat.

## ETAPA A — PRIMELE 10–15 MINUTE (prioritatea maximă)

- [ ] **01. Parcurs QA de jucător nou.** Test BETA cu erou nou autorizat: cont → creare erou → prolog → primul mercenar → prima Temniță → primul căpitan → pradă → echipare → următor obiectiv. Documentăm blocajele, clickurile inutile și erorile. Nu resetăm personajele existente.
  - **În lucru (audit de cod):** am corectat contradicția primului jurământ: retragerea înainte de căpitan nu îl finalizează, iar obiectivul cere acum explicit Căpitanul Cenușii. Test logic adăugat; **pasul 01 rămâne nebifat** până la verificarea în browser a parcursului complet, conform `docs/BETA-NEW-PLAYER-QA-STEP01.md`.
- [ ] **02. Un singur obiectiv vizibil.** Drumul Eroului este CTA principal; nu concurează cu ghidul vechi, misiuni, popup-uri, bannerul de ritm sau explicații care acoperă ecranul. Testăm pe desktop și mobil.
  - **În implementare (BETA):** o singură săgeată + highlight contextual (tab, clădire, buton concret), ascundere/reactivare și compatibilitate mobil. Document: `docs/BETA-ONBOARDING-GUIDANCE.md`. Pasul 02 rămâne nebifat până la verificarea în browser cu erou nou.
- [x] **03. Prima luptă și primul căpitan.** Prima experiență de Temniță trebuie să se înțeleagă intuitiv: cum alegi inamicul, cum ataci, când apare căpitanul, cum revii după victorie. Fără apăsări inutile de «Părăsește».
  - **Verificat și acceptat de utilizator în BETA (desktop):** adversarul curent, întoarcerea din previzualizare și victoria căpitanului sunt clare. Test automat: `dev/test-beta-first-dungeon-clarity.js`. Verificarea specifică pe mobil rămâne recomandată.
- [ ] **04. Prima recompensă și prima armă.** Jucătorul vede ce a câștigat, o comparație simplă cu echipamentul actual și un buton clar «Echipează». Nu forțăm să învețe toate statisticile.
  - **În lucru în BETA:** rezumat al primei prăzi reale, integrat în Drumul Eroului; card direct pentru a pune o armă pe Erou; dacă nu există armă potrivită, ghidare spre Topitorie și selectarea Sabiei. Test: `dev/test-beta-first-loot-weapon.js`. Verificarea vizuală încă necesară.
- [ ] **05. Puncte fără blocaj prematur.** Testăm dacă primele 10–15 minute pot fi terminate fără așteptare de regenerare; dacă este nevoie, introducem un buget limitat de lupte/tutorial fără puncte, cu protecții anti-farm. Nu oferim o oră de farming gratuit.
  - **În lucru (BETA):** rezerva actuală de 120 puncte acoperă prima temniță de 5 puncte; înaintea unei lupte noul tutorial transferă imediat rezerva disponibilă prin `sync()` dacă bara este goală. Fără lupte gratuite, fără resetări și fără schimbări LIVE. Test: `dev/test-beta-onboarding-points.js`; verificarea în browser este încă necesară. Detalii: `docs/BETA-ONBOARDING-POINTS.md`.
- [ ] **06. Poveste bine dozată.** Prologul și scenele mercenarilor au continuare clară, pot fi revăzute sau sărite, nu întrerup lupta și nu impun citirea mai multor ferestre.
  - **În lucru (BETA):** nume prestabilite pentru cei cinci tovarăși, recrutare directă fără dialog de numire, povești scurte cu text extins opțional și arhivă de recitire în Han fără spoilere. Scenele nu se deschid în luptă; LIVE și salvările BETA vechi rămân neschimbate. Test: `dev/test-beta-mercenary-default-names.js`; ghid: `docs/BETA-MERCENARY-DEFAULT-NAMES.md`. QA vizual necesar înainte de bifare.
- [ ] **07. Sat progresiv și navigare simplă.** Pentru noii eroi, arătăm doar clădirile utile atunci; restul se dezvăluie natural. «Vezi toate clădirile» rămâne disponibil. Vindecarea se vede când ai un rănit.
  - **Implementat anterior în BETA, în verificare:** patru clădiri de bază, deblocare progresivă, acces la toate la cerere, Infirmerie la rănire. Regresie: `dev/test-beta-onboarding-focus.js`; QA mobil/desktop rămâne necesar.
- [ ] **08. Următorul obiectiv după tutorial.** După primul căpitan și prima armă, un singur card indică următoarea temniță, pragul de nivel și ce îmbunătățire te-ar ajuta.
  - **În lucru (BETA):** după cele șase jurăminte și deschiderea Campaniei apare un card unic pentru următoarea temniță, cu nivel cerut, nivel actual și sfat de pregătire; dispare după apăsare. Nu concurează cu obiectivul activ. Detalii: `docs/BETA-ONBOARDING-STEPS07-09.md`.
- [ ] **09. Zilnice fără presiune.** Evidențiem trei obiective uzuale; celelalte rămân opționale. Nu condiționăm progresul de completarea unei liste administrative lungi.
  - **În lucru (BETA):** primele trei misiuni sunt vizibile, celelalte trei sunt opționale și extinse la cerere. Recompensele, progresul și bonusul zilnic rămân neschimbate. Test: `dev/test-beta-onboarding-next-and-dailies.js`.

**Criteriu de ieșire etapa A:** un tester care nu cunoaște jocul poate descrie, fără explicații externe, ce trebuie să facă și de ce; finalizează o primă experiență de Temniță, primește/equipează o recompensă și cunoaște următorul obiectiv. Verificăm desktop + mobil.

## ETAPA B — PROGRESIA NIVEL 8–30

- [ ] **10. Repere de progres 5/8/15/20/30.** Fiecare deblocare importantă are un mesaj scurt: ce s-a deschis, unde, de ce contează; fără popup-uri în cascadă.
  - **În lucru (BETA):** un singur card contextual, după tutorial și Campanie, cu locul deblocării; pragurile depășite se marchează pentru a evita notificările în cascadă. Ghid QA: `docs/BETA-PROGRESSION-MILESTONES-CAPTAINS.md`.
- [ ] **11. «Pregătește-te pentru următorul căpitan».** Un card contextual arată ținta, șansa estimată și 1–2 acțiuni reale care ar putea ajuta (echipament, compoziție, vindecare). Nu promitem creșteri exacte de șanse fără simulare.
  - **În lucru (BETA):** pe cardul mare al Temniței, lângă șansa reală, maximum un sfat concret din viața echipei, șansa calculată sau contraclasă. Nu schimbă calculul de luptă.
- [ ] **12. Comparație de obiecte după clasă.** Etichetă sugestivă pentru erou/mercenar + comparație față de ce are echipat; statisticile detaliate rămân disponibile.
  - **În lucru (BETA):** rucsacul și selectorul de slot arată clasa recomandată de tipul armei și compatibilitatea cu luptătorul selectat; păstrează comparațiile existente, fără schimbări la formula de bonus. Test: `dev/test-beta-gear-team-presets.js`.
- [ ] **13. Echipe salvate simplu.** Preseturi erou singur, erou +1/+2/+3 mercenari; respectăm limita de luptători și mercenarii plecați în expediții.
  - **În lucru (BETA):** patru preseturi rapide în fila Compoziție, cu salvarea claselor pentru fiecare dimensiune și reactivare sigură; eroul căzut, lupta activă, expedițiile și plafonul sunt protejate. Ghid: `docs/BETA-GEAR-TEAM-PRESETS.md`.
- [ ] **14. Informații tactice pentru căpitani.** Arătăm abilitatea specială, clasa care îl contracarează și dacă este în echipă/rezervă direct pe ecranul mare al Temniței.
  - **În lucru (BETA):** abilitatea căpitanului și contraclasa apar pe cardul mare, cu indicarea prezenței doar dacă mercenarul este activ și în viață; nu oferă informații false despre luptătorii în rezervă. Test: `dev/test-beta-progression-milestones-captains.js`.
- [ ] **15. Inventar și revendicări rapide.** Echipare directă, «Ridică toate» unde este sigur, sortare/filtrare și dezmembrare/vânzare în lot cu protecție pentru obiectele legendare și blocate.
  - **Parțial existent, testare extinsă BETA:** filtre, sortare, echipare directă și vânzare/dezmembrare în lot există deja; testul nou verifică protecția pentru Legendare/Epic/blocate, anularea și faptul că „Ridică tot” din Topitorie colectează doar sloturile finalizate, o singură dată.

**Criteriu de ieșire etapa B:** un jucător de nivel 20 înțelege ce temniță să joace, cum să-și pregătească echipa și cum să folosească obiectele obținute, fără să navigheze inutil prin Sat.

## ETAPA C — TEMNIȚE, TURN, ENDGAME

**Previzualizare vizuală BETA — Coborâre compactă (noiembrie 2026):** o temniță recomandată cu progres vizibil, Relicva săptămânii și Turnul în două carduri secundare, lista completă de temnițe ascunsă implicit și reguli utile într-un panou extensibil. Cheile, progresul, costurile și recompensele existente rămân intacte; LIVE nu se modifică. QA vizual mobil/desktop necesar. Test: `dev/test-beta-coborare-hub.js`. Ghid: `docs/BETA-COBORARE-SIMPLIFIED-HUB-PREVIEW.md`. **Completări BETA:** în Coborâre, titlul și descrierea repetate au fost înlocuite cu echipa activă și controalele Erou singur/Readu mercenarii/+ Adaugă, afișate o singură dată deasupra temniței recomandate. Echipa activă este vizibilă și lângă acțiunea Luptă în pregătirea temniței, iar Ultima luptă/Jurnalul se consultă exclusiv din LUPTE. Teste: `dev/test-beta-coborare-party-and-lupte.js` și regresiile existente pentru temnițe; verificarea pe ecran real rămâne necesară.


- [ ] **16. Identitate tactică pentru fiecare Temniță.** Mai puțin «aceiași monștri cu statistici diferite»; 1–2 mecanici recognoscibile pentru fiecare, fără a crea alt sistem de explorare.
  - **În lucru (BETA):** fiecare din cele 10 Temnițe are un efect tematic slab pentru monștrii obișnuiți, explicat pe card și în jurnal. Simularea de victorie include efectele. Nu atingem LIVE, PvP, Turnul, Tronul sau economia. Test: `dev/test-beta-dungeon-tactical-identities.js`; QA: `docs/BETA-DUNGEON-TACTICAL-IDENTITIES.md`. Verificarea în browser încă necesară.
- [ ] **17. O alegere înainte de căpitan.** Opțional: siguranță, ofensivă sau pradă cu risc. O singură decizie semnificativă pe incursiune; păstrăm dificultățile Normal/Greu/Coșmar și progresul separat.
  - **În lucru (BETA):** înainte de căpitan apare un selector opțional Normal/Scut/Asalt/Risc, cu efecte și costuri clare; fiecare dificultate își memorează alegerea separat, iar bonusul de pradă se aplică doar după victorie reală. Test: `dev/test-beta-boss-one-choice.js`; ghid: `docs/BETA-BOSS-ONE-CHOICE.md`. QA vizual necesar.
- [ ] **18. Feedback de luptă pe toate modurile.** Verificăm portrete mari, selecție, animații și claritatea daunelor pe Temnițe, Turn, PvP și Tron; performanță și accesibilitate pe mobil.
  - **În lucru (BETA):** am făcut Skip idempotent, accesibil la tastatură, cu Escape/focus corect; redarea respectă `prefers-reduced-motion` și logul/ținta au etichete accesibile. Acoperire de regresie pentru Temnițe, Turn, PvP/Lume și Tron. Test: `dev/test-beta-combat-feedback-accessibility.js`; QA: `docs/BETA-COMBAT-FEEDBACK-ACCESSIBILITY.md`. FPS și utilizabilitatea reală pe mobil rămân de verificat.
- [ ] **19. Turn cu puncte de pornire.** Deblocări după record (de exemplu 1/20/40/60/80), cu recompense ajustate pentru etajele sărite și fără farming suplimentar.
  - **În lucru (BETA):** recordurile 20/40/60/80 permit start de la 21/41/61/81. Etajele sărite dau 0 recompense, ca să nu creeze farming; costul de 6 puncte și 3 încercări zilnice rămân. Test: `dev/test-beta-tower-checkpoints.js`. Ghid: `docs/BETA-TOWER-CHECKPOINTS-PROGRESS.md`.
- [ ] **20. Recompensele Turnului mai lizibile.** Praguri, record, următorul legendar și progres până la următoarea îmbunătățire — vizibile fără a consulta mai multe meniuri.
  - **În lucru (BETA):** cardul Turnului include următorul străjer și progresul spre următorul prag de Fierărie, alături de recorduri și lista de legendare deja existente. Nu apar noi ferestre, resurse sau bonusuri; QA mobil/desktop necesar.
- [ ] **21. Măiestrie după nivelul 50.** Obiective orizontale: solo, clase, căpitani, realizări și titluri/portrete; fără nivel 100 și fără statistică permanentă care escaladează la infinit.
  - **În lucru (BETA):** patru realizări orizontale la nivel 50, cu titluri și rame strict cosmetice, fără putere permanentă. Victorii reale la căpitani, solo și cu clase diferite, plus recordul Turnului. Test: `dev/test-beta-endgame-mastery-collections.js`; QA: `docs/BETA-ENDGAME-MASTERY-COLLECTIONS.md`.
- [ ] **22. Colecții și seturi endgame.** Evidențiem echipamentele și legendarele deținute, seturile incomplete și obiectivele de colecție; începem cu UI, nu cu o nouă monedă.
  - **În lucru (BETA):** trei colecții vizuale folosesc cele 10 legendare ale Turnului, cu distincția explicită între deținute, obținute cândva și lipsă; nu adăugăm set-bonusuri, monede sau statistici. QA vizual necesar.

**Criteriu de ieșire etapa C:** un jucător de nivel 50 are scopuri vizibile, dar poate sări luptele deja triviale din Turn și nu trebuie să farmeze activități redundante.

## ETAPA D — LUME, PvP, TRON, BRESLE

- [ ] **23. PvP lizibil și echilibrat.** Recomandări după putere; explicăm echipa limitată la 3 pentru fantoma Lumii și duelul cu eroul la Tron. Respectăm protecția începătorilor și limitele de atac.
  - **În lucru (BETA):** comparația orientativă și limitele Lume/Tron sunt implementate; completăm cu 3 adversari atacabili ordonați după puterea fantomei Lumii, păstrând protecțiile și atacurile server-side. Test: `dev/test-beta-pvp-opponent-suggestions.js`; QA: `docs/BETA-PVP-OPPONENT-SUGGESTIONS.md`.
  - **În lucru (BETA):** am corectat comparația care folosea eroul solo în loc de echipa de trei a Lumii; explicăm riscul orientativ și păstrăm protecția, cooldownul și numărul de atacuri. Test: `dev/test-beta-pvp-throne-clarity.js`; ghid: `docs/BETA-PVP-THRONE-PRESTIGE.md`.
- [ ] **24. Provocări Tron de prestigiu.** Istoric/sezoane/titluri și clasamente clare; nu adăugăm bonusuri de putere permanente pentru deținător.
  - **În lucru (BETA):** clasamentul arată poziția jucătorului, Sala Faimei se extinde la cerere, regulile sunt explicite despre prestigiul fără buff; controlul QA de resetare e ascuns non-adminilor. Sezonul și competiția nu se schimbă.
- [ ] **25. Contracte de breaslă adaptate.** Ținte săptămânale în funcție de membrii activi la începutul săptămânii; praguri care nu se schimbă în timpul săptămânii.
  - **În lucru (BETA):** migrarea SQL 17 fixează pragurile săptămânilor noi în funcție de contribuțiile/înscrierile membrilor din săptămâna anterioară; rândurile existente și premiile rămân neschimbate. UI folosește țintele primite de la server și păstrează fallbackul vechi până la instalarea manuală în Supabase BETA. Test: `dev/test-beta-guild-weekly-contracts.js`; QA: `docs/BETA-GUILD-FROZEN-WEEKLY-CONTRACTS.md`. Necesită test SQL într-o bază de test înainte de bifare.
- [ ] **26. Repară contraclasa bossului de breaslă.** În SQL14, bonusul folosește clasa eroului publicat; pentru eroul Campion nu valorifică Vraci/Arcaș/Paznic din echipă. Corectăm și testăm server-side, fără a permite valori arbitrare din browser.
  - **În lucru (BETA):** migrarea SQL 18 verifică prezența contraclasei în cei maximum 3 membri ai fantomei Lumii stocați pe server; nu acceptă clase din cererea pentru boss. Păstrează limitele atacurilor, capacele daunelor și contractele săptămânale. Validarea publicării originale din browser rămâne pentru pasul 33. Test: `dev/test-beta-guild-boss-team-counter.js`; QA: `docs/BETA-GUILD-BOSS-TEAM-COUNTER.md`. SQL manual și QA autentic necesare înainte de bifare.
- [ ] **27. Bossul de breaslă — formații reale.** După fixul 26, alegerea compoziției echipei trebuie să conteze: protecție, vindecare, daune, cu calcul/validare sigură pe server.
  - **În lucru (BETA):** migrarea SQL 19 introduce bonusuri separate, plafonate, pentru ofensivă, protecție și vindecare în contribuția la boss, calculate numai din unitățile publicate pe server. Lovitura stochează defalcarea pentru afișare; clientul sincronizează echipa înainte de atac și nu consumă încercarea dacă publicarea eșuează. Nu alterează HP-ul eroilor. Test: `dev/test-beta-guild-boss-formation-roles.js`; QA: `docs/BETA-GUILD-BOSS-FORMATION-ROLES.md`. Validarea anti-cheat a publicării inițiale rămâne la pasul 33. Necesar test SQL manual în BETA.
- [ ] **28. Însemnele breslei și socialul.** Utilizare cosmetică a însemnelor (steaguri, rame, embleme) și teste complete pentru invitații, ranguri, mesagerie și notificări.
  - **În lucru (BETA):** migrarea SQL 20 introduce un catalog de embleme/steaguri/rame cumpărate exclusiv din însemne personale, cu drepturi conducător/ofițer, costuri și deblocări verificate pe server. Atelier compact cu previzualizare, fără schimbări de putere. Invitațiile, rangurile, mesajele și notificările existente sunt păstrate și acoperite prin regresii. Test: `dev/test-beta-guild-cosmetics-social.js`; QA: `docs/BETA-GUILD-COSMETICS-SOCIAL.md`. Migrarea se execută manual numai în Supabase BETA.

**Criteriu de ieșire etapa D:** participarea în Lume/Breaslă este ușor de înțeles, breslele mici pot progresa, iar competițiile importante au validări fiabile.

## ETAPA E — ECONOMIE, CORECTITUDINE, CALITATE

- [ ] **29. Protecție la ghinion în Fierărie.** Mecanism previzibil după eșecuri repetate, calibrat prin simulări; păstrăm un cost real al îmbunătățirilor.
  - **În lucru (BETA):** contor pe obiect/treaptă cu +1 punct procentual per eșec și garanție; filtre instantanee după nume, raritate, locație și treaptă; aurul, minereul și materialele se consumă la fiecare încercare BETA, inclusiv eșecul. LIVE neschimbat. Test: `dev/test-beta-forge-upgrade-pity.js`; document: `docs/BETA-FORGE-UPGRADE-PITY-AND-FILTERS.md`. QA vizual și economic în așteptare.
  - **În lucru (BETA):** șansele cresc cu 1 punct procentual după eșec, per obiect/treaptă; numărul maxim de încercări variază între 5 și 26. Garanția nu elimină costul minereului și al materialelor. Simularea probabilistică pentru +9 reduce media încercărilor de la 10,00 la aproximativ 6,84 (-31,6%), fără reducere de cost pe încercare. Test: `dev/test-beta-forge-upgrade-pity.js`; QA: `docs/BETA-FORGE-UPGRADE-PITY.md`. Live și BETA vechi neschimbate; QA mobil și persistența salvării necesare.
- [ ] **30. Piață, Negustor, Bazar.** Rolul fiecăruia devine evident; eliminăm explicațiile și submeniurile redundante, nu funcțiile utile.
  - **În lucru (BETA):** cele trei file ale aceleiași clădiri au subtitluri scurte și explicații de un rând; mini-ghidurile lungi devin detalii opționale, fără buton obligatoriu „Am înțeles”. Nivelurile, schimburile, taxele și rutele vechi nu se schimbă. Test: `dev/test-beta-market-clarity.js`; QA: `docs/BETA-MARKET-CLARITY-STEP30.md`. LIVE și BETA vechi păstrează interfața existentă.
- [ ] **31. Economia jocului și cooldown NPC de 1 oră.** Măsurăm câștigurile aur/minereu/materiale și impactul asupra progresului și prețurilor; ajustăm numai după date.
  - **Audit teoretic extins (BETA):** raport de cost așteptat al îmbunătățirilor cu aur pierdut la eșec, pentru eroi BETA noi, vechi și LIVE. La +9, Epic nivel 30: aproximativ 295.600 aur/treaptă pentru erou BETA nou, față de 43.200 aur în LIVE; un cost de urmărit în date reale înainte de ajustări. Test: `dev/test-beta-economy-forge-gold-audit.js`; raport: `docs/BETA-ECONOMY-FORGE-GOLD-AUDIT.md`. Cooldownul NPC rămâne o oră, fără ajustări.
  - **Audit BETA (parțial):** am verificat cooldown-ul de 60 minute per sat și costul real al raidului complet (1 punct intrare + 1 punct căpitan), acum explicat în panoul BETA. Modelul reproductibil estimează veniturile fixe NPC pentru nivelurile 5/15/30/45 și 1/3/5 raiduri reușite/oră, comparate cu prețurile Pieței; nu ajustăm economia fără date reale de activitate. Test: `dev/test-beta-economy-baseline.js`; ghid: `docs/BETA-ECONOMY-NPC-BASELINE.md`. Necesare telemetry agregată și QA în joc.
- [ ] **32. Corectitudinea botului Premium.** Verificăm avantajul în progres și în clasamente; păstrăm personalizările cosmetice, evităm pay-to-win.
  - **În lucru (BETA):** botul Premium nu mai poate porni/continua Temnițe, raiduri sau forjări noi. Rămâne asistent pentru colectarea lucrurilor deja forjate, echipare și vindecare cu costurile normale. LIVE și personalizările cosmetice sunt neschimbate. Test: `dev/test-beta-premium-bot-fairness.js`; QA: `docs/BETA-PREMIUM-BOT-FAIRNESS.md`. Avantajele competitive trebuie verificate și în date reale; clientul modificabil nu înlocuiește pasul 33.
- [ ] **33. Validare server a competiției.** PvP/Tron/rapoarte de breaslă nu trebuie să accepte rezultate sau statistici arbitrare calculate în browser; această etapă este obligatorie înainte de extindere publică.
  - **Audit și întărire parțială (BETA):** SQL21 protejează puterea Lumii și plafonează jurnalul raidurilor; SQL22 păstrează echipele la start și rezultatul raportat, iar SQL23 monitorizează pasiv salvările. Aceste trei instalări au fost confirmate funcționale în BETA. **SQL24 este instalat în BETA, cu toate cele patru verificări SQL confirmate:** derivă aurul/XP-ul din jurnalul competitiv fără a accepta sumele browserului, dar NU le creditează portofelului. **SQL25 a fost instalat și confirmat în BETA (6/6 verificări):** creează un registru economic separat, cu aplicare internă idempotentă și fără acces de scriere pentru jucători; nu importă salvări. **SQL26 a fost instalat și confirmat funcțional în BETA:** înregistrează în registru consumul atacului PvP verificat de server, fără recompense sau schimbări de energie. **SQL27 a fost instalat în BETA, cu 6/6 verificări confirmate:** simulează determinist, în paralel, luptele folosind echipele SQL22, fără să modifice câștigătorul sau lootul; simulatorul nu este încă paritar cu lupta reală. **SQL28 este pregătit în GitHub, încă neinstalat:** impune limite foarte generoase (10× valorile canonice de clasă) pentru publicarea echipelor din Lume și Tron, cu preflight care anulează migrarea dacă ar respinge personaje existente. **SQL29 este pregătit în GitHub, încă neinstalat:** introduce un buton doar pentru administratorii BETA care elimină cooldownul între atacurile repetate asupra aceluiași sat, fără a modifica energia sau rezultatul raidului; SQL28 și SQL29 sunt independente. **SQL30 a fost instalat în BETA, cu 7/7 verificări SQL confirmate:** apărarea satului BETA folosește toată echipa activă (erou + până la 3 mercenari de la nivelul 30), fără vechiul plafon de nivel 40, iar Tronul BETA republică automat statisticile eroului la schimbări de echipament sau nivel. SQL30 necesită SQL28 instalat și extinde simulatorul SQL27 pentru 4v4. **QA încă necesar în joc:** un raid real împotriva unei echipe de patru și schimbarea echipamentului eroului urmată de verificarea republicării Tronului. LIVE rămâne neschimbat. **Flux BETA al luptelor:** victoriile din Lume/Tron și celelalte raiduri se închid automat după animație, cu încasare o singură dată și raportare server-side păstrată; Temnițele aveau deja aut închidere, Turnul rămâne manual. Testare în browser încă necesară (`docs/BETA-COMBAT-AUTO-EXIT.md`). **Neîncheiat:** victoria, nivelul și echipamentul încă provin din client; resursele reale și lupta necesită tranzacții/motor server-side. SQL manual numai în BETA. Ghiduri: `docs/BETA-COMPETITION-TRUST-STEP33.md`, `docs/BETA-WORLD-SERVER-REWARD-REFERENCE-STEP33.md`, `docs/BETA-AUTHORITATIVE-ECONOMY-LEDGER-STEP33.md`, `docs/BETA-LEDGER-VERIFIED-RAID-STEP33.md`, `docs/BETA-PVP-SHADOW-SERVER-SIMULATOR-STEP33.md`, `docs/BETA-COMPETITIVE-STAT-GUARDS-STEP33.md`, `docs/BETA-WORLD-PVP-NO-COOLDOWN-ADMIN.md`, `docs/BETA-WORLD-FOUR-DEFENDERS-THRONE-AUTOSYNC-STEP33.md`.
- [ ] **34. Stabilitate, performanță și simplificare cod.** Smoke-test în browser desktop/mobil, regresii salvări LIVE/BETA, curățare de cod mort numai după verificarea apelurilor, telemetry minimă (primul boss, tutorial completat, D1/D7, activitate endgame).
  - **În lucru (BETA):** smoke CI pentru asseturi/PWA și cache-busting; corecție a salvărilor vechi fără `S.ui`; regresie LIVE/BETA de încărcare/salvare fără conturi reale. Runnerul Playwright manual acoperă Fierăria și opțional viewport mobil. Teste: `dev/test-beta-release-assets.js`, `dev/test-beta-save-compatibility.js`; checklist: `docs/BETA-RELEASE-STABILITY-STEP34.md`. Test browser autentificat, măsurători și telemetrie rămân deschise.

**Criteriu de ieșire etapa E:** economia nu este dominată de un singur farming sau de bot, competițiile sunt corecte și principalele ecrane sunt acoperite de teste reale.

## Primul lucru pe care îl facem: pasul 01
**Livrabil:** o matrice de test pentru un cont nou BETA și un PR mic care elimină blocajele concrete din primele 10–15 minute, fără a redesena încă restul jocului.

Parcurs de verificat:
1. Intrare și creare erou → prolog clar (skip disponibil).
2. Primul mercenar și card unic Drumul Eroului.
3. Intrare în Mina Cenușie → alegere/luptă cu monștri → căpitan.
4. Recompensă → inventar → echipare.
5. Sat → următoarea temniță / obiectiv.
6. Reîncărcare de pagină între oricare două etape; progresul nu se pierde.
7. QA mobil/desktop și regresii pentru erou existent BETA / LIVE.

**Status inițial:** toate etapele de mai sus sunt propuneri, nu marcate ca implementate. Jocul are deja o parte dintre funcțiile de bază; fiecare pas înseamnă validare, simplificare sau completare, nu rescriere.
