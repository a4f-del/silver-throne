# Silver Throne BETA — SQL33 / Pasul 33: raportul Tronului, auditat fără schimbarea regulilor

**Stare:** SQL31 și SQL32 sunt **instalate în Supabase Silver-Throne-Test, 8/8 `true` fiecare**, confirmate de operator. SQL33 a fost **instalat în Supabase Silver-Throne-Test, cu 8/8 verificări `true`**, confirmate de operator. QA cu provocările 27 și 28 a fost realizat: au rezultat două diferențe orientative față de SQL32, explicabile prin limitele modelului; calibrarea și verificarea server-side rămân deschise. LIVE și salvările nu sunt modificate.

## Problema pe care o rezolvăm

La finalul duelului, browserul trimite `p_win` către `throne_challenge_finish`. SQL31 înregistrează finalizarea din tabela `throne_challenges`, însă această tabelă poate să nu conțină un câmp boolean cu verdictul; în acest caz `reported_win=NULL`, iar rezultatele SQL32 nu se pot compara direct.

SQL33 introduce un **wrapper strict BETA**: `beta_throne_challenge_finish_audited(p_id,p_win)`.

Acesta:
- Verifică autentificarea și accesul de administrator BETA, apoi proprietatea provocării.
- Apelează **aceeași funcție oficială** `throne_challenge_finish(p_id,p_win)`. Nu rescrie algoritmul de încoronare, cooldownurile, recompensele sau tranzacțiile Tronului.
- Numai după ce provocarea trece la `finished=true`, notează `p_win` în tabelul privat SQL31, cu sursa `result_field='client_claim_via_rpc'`. Acesta este **verdictul declarat de client**, NU o victorie validată de motorul serverului.
- Nu rescrie un rezultat deja consemnat și nu completează retroactiv provocări care erau finalizate înainte.
- Dacă auditul intern dă eroare, funcția oficială poate totuși încheia duelul; auditul este non-critic.

Frontendul încearcă noul RPC **doar în BETA**. Dacă PostgREST spune explicit că funcția lipsește (de exemplu `PGRST202)), folosește o singură dată apelul vechi și continuă să îl folosească în sesiunea curentă. **Nu face fallback după erori de rețea, permisiuni sau răspuns ambiguu**, pentru a nu dubla finalizarea.

## Instalare SQL33 (manual, numai BETA)

1. Confirmă că proiectul ales este **Silver-Throne-Test**, nu LIVE. Fă backup BETA înainte de schimbare.
2. Nu rula din nou SQL31 sau SQL32.
3. Deschide [SQL33 în GitHub](https://github.com/a4f-del/silver-throne/blob/main/supabase/33-beta-throne-result-claim-audit-rpc.sql), apoi **Raw**.
4. Copiază întreg fișierul în SQL Editor BETA și rulează. Include `BEGIN;`, `COMMIT;` și ultima interogare de verificare.

**Toate cele 8 valori trebuie să fie `true`:**

| Coloană | Așteptat |
|---|---|
| `wrapper_exists` | `true` |
| `authenticated_can_call` | `true` |
| `anonymous_cannot_call` | `true` |
| `shadow_table_still_private` | `true` |
| `sql31_finish_capture_preserved` | `true` |
| `sql32_simulator_preserved` | `true` |
| `official_finish_preserved` | `true` |
| `wrapper_has_admin_guard` | `true` |

## Test real după instalare

1. Deschide BETA și fă **Ctrl + Shift + R**, ca să încarci `tron.js?v=2026.11.08-4`.
2. Finalizează o **provocare nouă** împotriva unui rege real. Nu folosi pentru acest test un duel pornit înainte de SQL31/32.
3. În SQL Editor din **Silver-Throne-Test**, rulează:

```sql
SELECT sh.challenge_id,
       sh.estimate,
       sh.reported_win,
       sh.result_field,
       sim.outcome AS simulare,
       sim.predicted_challenger_win,
       CASE
         WHEN sh.reported_win IS NULL
           OR sim.predicted_challenger_win IS NULL THEN NULL
         ELSE sh.reported_win = sim.predicted_challenger_win
       END AS concordanta_model,
       sh.completed_at IS NOT NULL AS finalizat
FROM public.beta_throne_challenge_shadow sh
LEFT JOIN public.beta_throne_duel_simulations sim
  ON sim.challenge_id=sh.challenge_id
ORDER BY sh.challenge_id DESC
LIMIT 10;
```

Pentru un duel finalizat prin noul apel, când tabela oficială nu include `win`/`won`/`victory`, te aștepți la:
- `result_field='client_claim_via_rpc'`
- `reported_win=true` sau `false` (declarația jocului)
- `finalizat=true`
- `simulare='challenger'` sau `'holder'`, ori `'draw'` când modelul nu decide.

**Nu confunda `concordanta_model=false` cu trișarea.** Modelul SQL32 ignoră inițiativa aleatoare, criticele, abilitățile și alte efecte. Pentru duelurile vechi, `reported_win` poate rămâne `NULL`, ceea ce este normal.

## Diagnostic complet SQL31–33, fără alte migrări

După ce termini cel puțin **un duel nou împotriva unui rege** (nu Garda Regală), poți rula scriptul **doar pentru citire**:

[`supabase/CHECK-beta-throne-sql31-33-audit.sql`](https://github.com/a4f-del/silver-throne/blob/main/supabase/CHECK-beta-throne-sql31-33-audit.sql)

Acesta afișează două rezultate: un rezumat al ultimelor 7 zile (provocări, snapshoturi, simulări și verdicte disponibile) și ultimele 12 provocări cu starea comparației. Nu citește salvări, inventar sau identificatori ai utilizatorilor; nu scrie în baza de date.

- `declaratii_inregistrate_sql33 > 0` confirmă că o provocare nouă a înregistrat `p_win` prin wrapperul SQL33.
- `dueluri_comparabile > 0` confirmă că putem compara cel puțin un duel împotriva regelui, finalizat și cu predicție determinată. Până la prima provocare nouă poate fi 0.
- `diferite > 0` indică o nepotrivire *orientativă* între model și lupta jucată; nu dovedește exploatare sau trișare.
- Dacă `simulari_lipsa > 0` ori există `finalizari_fara_verdict > 0` pentru provocări noi, investigăm jurnalul backendului înainte să declarăm pasul 33 încheiat.

Testul acestui diagnostic este `node dev/test-beta-throne-audit-diagnostic.js` și a trecut. Testul SQL în PostgreSQL cu date noi rămâne de verificat manual în BETA.

## Verificare reală: provocările Tron 27 și 28 (8 noiembrie 2026)

Din diagnosticul BETA, au fost observate două provocări finalizate:

| Challenge | Sursa verdictului | Victorie înregistrată | Model SQL32 | Runde | Concluzie |
|---|---|---|---|---:|---|
| 27 | `won` | `true` | `holder` | 3 | Diferență între model și rezultat |
| 28 | `won` | `true` | `holder` | 3 | Diferență între model și rezultat |

**Notă:** `result_field='won'` este corect. SQL31 a extras verdictul din coloana `won` a tabelului oficial. SQL33, intenționat, nu suprascrie acest câmp cu `client_claim_via_rpc` dacă verdictul era deja capturat.

**Cauze de diferență confirmate în cod:** simulatorul SQL32 aplică `0.35×DEF` la ambele tipuri de lovituri; `spEnemyHit` din joc scade apărarea efectivă completă la atacul regelui. Motorul real poate folosi și abilități cu multiplicatori, critice, vindecare, sângerare, echipament și inițiativă aleatorie. De exemplu, lovitura specială de Campion poate avea multiplicator de `1.8×` sau `2.6×`, pe când SQL32 simulează doar lovituri normale.

Aceste diferențe explică **plauzibil** neconcordanța, dar fără statisticile instantaneelor și jurnalul luptelor nu demonstrează exact ce a schimbat învingătorul în provocările 27 și 28. **Nu declarăm trișare și nu recalculăm rezultatul oficial.**

Pentru comparație suplimentară, fără instalarea vreunei migrări:

[`supabase/CHECK-beta-throne-duels-27-28-parity.sql`](https://github.com/a4f-del/silver-throne/blob/main/supabase/CHECK-beta-throne-duels-27-28-parity.sql)

Interogarea doar pentru citire compară inițiativa alternată, daunele orientative cu `0.35×DEF` față de apărarea completă și două scenarii de abilitate Campion. Nu afișează numele sau identificatorii conturilor, nu rescrie nimic și nu confirmă că abilitatea a fost efectiv folosită. Regresie: `dev/test-beta-throne-combat-parity-gaps.js`.

## Test automat și ce rămâne deschis

`node dev/test-beta-throne-result-claim-audit-rpc.js` — verifică static preflightul SQL, drepturile, păstrarea funcției oficiale, cele opt diagnostice și comportamentul JavaScript cu RPC simulate: noul traseu, lipsa funcției, eroare de rețea, acces refuzat și LIVE. Testul **a trecut**, dar nu execută PostgreSQL sau jocul într-un browser real.

**Pasul 33 este încă în lucru.** Avem comparație observabilă între declarația clientului și simulator, dar nu un rezultat autoritativ server-side. Următoarele lucrări majore sunt sursa autentică a nivelului, inventarului și echipamentului, reproducerea paritară a luptei și plata server-side a recompenselor validate, fără resetarea progresului.

**Nu este necesar să modifici LIVE sau să schimbi conturile BETA pentru această migrare.**