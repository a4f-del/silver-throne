# BETA · Campania concentrată pe temnițe + erou singur

## Scop
Primele 6 capitole ale campaniei să aibă **o direcție principală**: învinge căpitanii temnițelor, cu sigiliile și recompensele existente. Mercenarii pot lucra la expediții în timp ce eroul înfruntă singur temnița, dacă are echipament suficient de bun.

## Campanie: aceeași poveste, mai puține obligații
În BETA, obiectivele celor 6 capitole sunt:
1. **Cenușa din Mină** → Căpitanul Cenușii (Mina Cenușie).
2. **Drumul Lupilor** → Alfa Haitei (Peștera Lupilor).
3. **Bastionul Corbilor** → Regele Oaselor (Catacombele Uitate); Bastionul rămâne în narațiune, fără cucerire obligatorie.
4. **Furtuna** → Comandantul Fantomă și Străjerul Furtunii (Cripta săptămânală rămâne temniță).
5. **Apele Întunecate** → Căpitanul Înecat și Hidra Mlaștinii.
6. **Tronul Cenușiu** → Stăpânul Abisului, Fierarul Ars, Regele Cenușiu.

Cerințele de raiduri NPC, tabere, indicii, locuri de interes și capturarea Bastionului nu mai blochează niciun capitol. Obiectivele secundare „Pustnic” și „Vânătorul de tabere” devin recompense pentru **3, respectiv 7 căpitani unici**; păstrează ID-urile `pust`/`vana` și nu acordă din nou premiile deja revendicate.

Datele originale `TW.CH` și `TW.SEC` rămân intacte pentru LIVE. În BETA, sunt proiectate prin `cmpChapters()` și `cmpSides()` la momentul afișării sau revendicării. Progresul existent în `S.camp.rw`, `S.camp.sec`, `S.camp.bk` este reutilizat, fără rescriere sau SQL. Recompensele și nivelurile rămân identice.

Ultimul pas din **Drumul Eroului** nu mai cere un jaf: ajunge să vizitezi `Hartă → Lumea`. Dacă un jucător a făcut deja un raid, îl păstrăm drept progres valid.

## Erou singur + mercenari în expediții
Din **Coborâre/Temnițe**, din pagina detaliată a unei temnițe sau din **Han**, pe BETA apare **„⚔ Erou singur”**:
- Mută exclusiv companionii din `S.fs` în `S.rs`, fără pierderea nivelului, echipamentului, sănătății, specializărilor sau faimei.
- Eroul rămâne singur în echipa activă. **Motorul luptelor, șansele, costurile în puncte și prada NU primesc un bonus pentru solo**. Dacă e prea slab, poate pierde.
- Din Han, mercenarii din rezervă pot fi trimiși în **expediții de 1, 4 sau 8 ore** (regulile și recompensele existente).
- Alegerea solo este păstrată în `S.soloDungeon` numai după ce apeși butonul: mercenarii recrutați ulterior intră în rezervă, nu reintră automat în echipă.
- Dacă alegi explicit **„Pune în echipă”**, poți forma imediat din nou un grup; opțiunea solo este dezactivată.
- Nu poți schimba membrii grupului în timpul coborârii și nu poți seta eroul singur dacă acesta este căzut.
- Expedițiile pasive nu pot fi pornite în timpul unei lupte, ca înainte.
- Este disponibil și pentru **eroii existenți BETA**; nu necesită creare de cont nou. **LIVE nu primește această interfață și păstrează comportamentul anterior**.

## Ce NU se modifică în acest PR
În următorul PR BETA, **raidurile satelor-bot din regiunea privată și taberele de bandiți sunt retrase**. Satele NPC **comune** din Lume rămân jefuibile prin `wnRaid` / `world_npc_raid`, iar misiunea zilnică „Jefuiește un sat” poate fi completată prin aceste sate. Datele deja salvate despre tabere nu sunt șterse; LIVE, PvP, Tron, Turnul, mercenarii și expedițiile pasive rămân neschimbate. Locurile de interes ale regiunii sunt lăsate momentan în cod pentru compatibilitate, dar BETA nu mai desenează ținutul privat.

## Testare manuală pe BETA
1. Integrează PR → hard refresh `https://a4f-del.github.io/silver-throne/?server=beta` (fără SQL).
2. Deschide **Hartă → Campanie**. În capitolele 1, 2, 3 și 5 nu trebuie să mai apară cerințe obligatorii de jaf, tabere sau cucerire.
3. Verifică un cont BETA cu un capitol deja revendicat: nu poate revendica același premiu a doua oară.
4. **Coborâre → Temnițe → Erou singur**: verifică în Echipă că doar eroul e activ, iar ceilalți sunt în rezervă.
5. **Han**: trimite un mercenar în expediție, apoi luptă într-o temniță cu eroul singur. Eroul trebuie să poată lupta și după trimitere.
6. Folosește **„Pune în echipă”** după întoarcerea mercenarului. Verifică că toate echipamentele sunt intacte.
7. Încearcă să activezi solo în timpul unei lupte sau cu eroul căzut; trebuie să refuze fără a muta mercenari.
8. Testează și LIVE pentru a confirma lipsa schimbărilor acolo.

Test fără backend: `node dev/test-beta-campaign-solo.js`.

**Nu șterge salvări, nu rula SQL, nu modifica LIVE.**
