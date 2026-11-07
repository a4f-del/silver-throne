# Silver Throne BETA — introducerile celor cinci tovarăși

## Scop
Întâlniri narative scurte, cu portretul clasei, loc, dialog și alegere, în loc ca mercenarii să apară întâmplător. Nu adăugăm costuri, noi conturi sau tabele SQL; păstrăm sistemul existent de numire a tovarășilor și echipa/rezervele.

| Tovarăș | Când se poate întâlni | Unde este prezentată scena |
| --- | --- | --- |
| Paznicul — **Jurământul de la poartă** | Imediat după crearea unui erou nou | Porțile satului; scena introductivă |
| Arcașul — **Urmele din cenușă** | După prima ieșire cu pradă din Mina Cenușie (contorul `C('l') >= 1`) | La întoarcerea din mină |
| Războinicul — **Sabia fără stăpân** | După prima întoarcere din mină **și** un antrenament (`C('t') >= 1`) | Când vizitezi Hanul |
| Vraciul — **Mâinile care vindecă** | După înfrângerea primului căpitan (`C('bs') >= 1`) | După ieșirea din luptă/temniță |
| Magul — **Cunoașterea interzisă** | La nivelul 5 | Prima vizită la **Hartă → Lumea** |

## Cum funcționează
- Doar eroii **noi pe BETA** au automat această experiență. La prima confirmare a eroului se setează `S.mrStoryV=1`. Eroii deja creați pe BETA sau LIVE își păstrează tovarășii, obiectele și progresul.
- În scene, **Primește-l** declanșează recrutarea gratuită existentă și permite numirea tovarășului; **Mai târziu** păstrează oferta la Han.
- Dacă povestea a fost amânată, Hanul are și **Povestea**, pentru a o revedea. Recrutarea nu poate fi repetată pentru aceeași clasă.
- Dacă sari peste ghid, mercenarii nu apar automat; condițiile de aventură și antrenament rămân valabile.
- În Han, **🎬 BETA · Scenele tovarășilor** afișează cinci butoane de previzualizare. Poți vedea toate scenele și de pe conturile BETA existente, **fără să ștergi salvarea și fără efect asupra echipei**.
- Scenele nu sunt afișate peste lupte, dialogul de numire, editorul eroului sau alte ferestre ale jocului.

## Pași de verificare
1. Integrează PR-ul. Deschide `https://a4f-del.github.io/silver-throne/?server=beta` și reîncarcă forțat.
2. **Pe unul dintre conturile BETA existente:** Sat → **Han** → **🎬 BETA · Scenele tovarășilor**; apasă fiecare clasă pentru a vedea povestea, fără să modifici progresul.
3. Pentru fluxul complet de primire folosește **un cont BETA nou autorizat** sau o salvare BETA de test separată. Nu șterge conturile sau progresul actual pentru acest test.
4. După alegerea eroului apare Paznicul; fă prima coborâre și ieși cu prada pentru Arcaș; fă un antrenament și deschide Hanul pentru Războinic; învinge un căpitan pentru Vraci; urcă la nivelul 5 și intră în Lume pentru Mag.
5. Pentru un tovarăș, apasă **Mai târziu**, apoi verifică oferta rămasă la Han. La unul acceptă, alege numele, reîncarcă pagina și verifică persistența.
6. Pe LIVE, la început Paznicul și Arcașul trebuie să apară exact ca înainte; nicio scenă narativă nu trebuie să apară.

## Limite
Momentul introducerii Arcașului este prima **ieșire din mină**, nu neapărat după un anumit inamic. Magul este deblocat la nivelul 5, dar introducerea se declanșează automat când intri în Lume (sau manual dacă deschizi oferta din Han). Nu am rulat teste end-to-end într-o sesiune de browser cu un erou nou; verificările automate acoperă condițiile, dar experiența vizuală necesită verificare.
