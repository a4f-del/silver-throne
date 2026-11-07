# Prolog experimental — Ultima scânteie (doar BETA)

## Povestea
Trei scene scurte, cu imagini existente din joc:
1. **Satul care nu mai doarme** — întoarcerea în satul acoperit de cenușă
2. **Vatra Regală s-a stins** — Regele Cenușiu și cele șase sigilii care ascund Tronul de Argint
3. **Primul jurământ** — la poartă te așteaptă ultimul Paznic

Textul urmează povestea deja existentă în **Campania: Tronul Cenușiu**. Nu adaugă bătălii, resurse, bonusuri sau misiuni obligatorii.

## Cui apare
- Automat **doar eroului creat nou pe BETA după integrarea acestui PR**, înainte de scena de întâlnire a Paznicului.
- În salvarea acestuia se adaugă `mrPrologPending=1`; după „Întâlnește Paznicul” sau „Sari peste”, prologul se marchează `mrPrologSeen=1`.
- La reîncărcarea paginii în mijlocul prologului, acesta poate porni din nou de la scena 1; starea nu se pierde.
- Pentru eroii BETA existenți: **Sat → Han → 🎬 BETA · Scenele tovarășilor → Prolog · Ultima scânteie**. Previzualizarea poate fi repetată și nu modifică salvarea.
- **LIVE neschimbat**. Nu este necesar SQL nou în Supabase.

## Test recomandat pe telefon, fără să pierzi progresul
1. Integrează PR-ul și reîncarcă `https://a4f-del.github.io/silver-throne/?server=beta`.
2. Pe contul BETA actual, deschide **Sat → Han → Scenele tovarășilor → Prolog · Ultima scânteie**.
3. Parcurge „Mai departe” de două ori și apoi „Închide previzualizarea”. Verifică imaginile, textul și butoanele pe mobil.
4. Deschide-l din nou și apasă „Sari peste” / „Închide”: trebuie să se închidă imediat, fără progres modificat.
5. Pentru parcursul complet, folosește **un erou nou de pe un cont BETA autorizat separat**. După „Începe aventura” din crearea eroului, prologul trebuie să apară înainte de Paznic. După închiderea prologului, trebuie să apară întâlnirea cu Paznicul. Nu e necesar să ștergi conturile de nivel 50.

## Verificări
`node dev/test-beta-prologue.js` testează afișarea înaintea Paznicului, parcurgerea și omiterea scenelor, previzualizarea fără modificarea salvării, prevenirea repetării și izolarea de LIVE.

**Notă:** Testele de logică nu înlocuiesc un test vizual pe telefon. Dacă imaginea nu se încarcă, sunt folosite căi către imagini deja prezente în repository, dar încărcarea în browser trebuie verificată.
