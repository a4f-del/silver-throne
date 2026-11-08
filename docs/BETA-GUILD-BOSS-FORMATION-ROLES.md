# Silver Throne BETA — Pasul 27: formații tactice la bossul de breaslă

Data: 8 noiembrie 2026. Implementare BETA, bazată pe migrările SQL 17 și 18, cu SQL 19 separat.

## Ce se schimbă

Cele trei locuri ale echipei publicate în Lume determină acum, pe server, contribuții distincte la atacul bossului de breaslă. Sunt bonusuri asupra *daunelor utile ale incursiunii*, nu vindecare reală sau reducere persistentă a HP-ului eroului.

| Rol | Clase | Modificare |
| --- | --- | --- |
| Ofensivă | Războinic, Arcaș, Mag | +4% din baza atacului pentru fiecare clasă distinctă |
| Protecție | Paznic sau Gardian | +4% continuitate a atacului |
| Vindecare | Vraci | +4% continuitate a atacului |
| Contraclasă săptămânală | Vraci / Arcaș / Paznic | bonus existent x1,25, dacă acea clasă apare în echipa validă |

Beneficiile se cumulează doar în cele maximum trei locuri și în limita a **14.000 daune înainte de contraclasă, 18.000 după contraclasă**, respectiv HP-ul rămas al bossului. Nu schimbăm cele două încercări zilnice, premiile, contractele, resursele sau statisticile personajelor.

## Sursă și sincronizare

Înainte de consumul unei încercări, browserul sincronizează echipa actuală în Lume prin `lwSync(true)` și verifică confirmarea publicării. Dacă publicarea eșuează, **nu apelează guild_api('boss')**, păstrând încercarea. Două clickuri simultane sunt blocate cât timp sincronizarea sau atacul sunt active.

RPC-ul bossului folosește doar `public.world_players.units` și `public.world_units_ok` pentru a stabili clasele. Nu se acceptă unități/clase/bonusuri trimise în cererea de atac. Formarea echipei este salvată în SQL odată cu lovitura, inclusiv contribuțiile de ofensivă/protecție/vindecare și aplicarea contraclasei. UI poate arăta ultima lovitură confirmată de server, fără estimări locale, numai după ce RPC-ul returnează indicatorul `formation_rules=true`.

### Limitare importantă de securitate

`world_players.units` este totuși publicat inițial din client, iar `world_units_ok` verifică doar schema și limitele, nu dovada proprietății eroului sau echipamentului. **Acest pas nu este anti-cheat complet.** Validarea autoritativă a compoziției și puterii rămâne obiectivul pasului 33 înainte de extinderea competiției în public.

## Activare SQL (doar operator BETA)

Migrarea `supabase/19-beta-guild-boss-formation-roles.sql` se aplică **manual în Supabase Silver-Throne-Test**, după 14–18; nu este executată de merge-ul GitHub și NU se aplică în LIVE. Scriptul adaugă câmpuri de jurnal cu valori implicite pentru loviturile vechi, apoi înlocuiește `guild_api` tranzacțional, fără resetări.

Nu instala scriptul înainte de a verifica migrările 17 și 18. Dacă lipsesc, noua interfață rămâne compatibilă și nu va afișa defalcarea până ce SQL19 este instalat.

## Teste

```sh
node dev/test-beta-guild-boss-formation-roles.js
node dev/test-beta-guild-boss-team-counter.js
node dev/test-beta-guild-boss-replay.js
node dev/test-beta-guild-weekly-contracts.js
```

Suita completă `dev/test-*.js` rulează în GitHub Actions. Testele Node validează structura SQL, rolurile simulate și imposibilitatea trimiterii atacului dacă sincronizarea eșuează, dar **nu înlocuiesc executarea reală în Postgres**.

## QA autentificat înainte de bifare

1. Cu Campion + Vraci, apoi Campion + Paznic și Campion + Arcaș/Mag/Războinic, publică echipa în Lume și verifică bonusurile din ultima lovitură.
2. Repetă pentru cele trei contraclase săptămânale; nu aștepta un bonus de contraclasă de la un luptător care nu se află în fantoma publicată.
3. Forțează o eroare de sincronizare a Lumii: nu trebuie să se consume niciuna dintre cele două încercări.
4. Apasă rapid de două ori pe atac: o singură înregistrare pe server.
5. Verifică viața bossului aproape de zero, plafonul daunelor și premiile săptămânii; niciun număr nu devine negativ.
6. Testează LIVE (nemodificat) și BETA pe desktop/mobil. Verifică permisiunile RPC și RLS.

**Status:** cod + SQL documentat; pasul 27 rămâne nebifat fără QA Postgres și vizual.
