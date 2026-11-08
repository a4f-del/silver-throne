# Silver Throne · Pasul 33, etapa 5 — registru economic server-side (SQL25, BETA)

**Status:** cod în GitHub, necesită instalare manuală în Supabase **Silver-Throne-Test**. Nu aplica în LIVE. Nu resetează progres, conturi, inventar sau portofele.

## Scop

`supabase/05-portofel.sql` și `portofel.js` au deja un mecanism `wallet_sync` care limitează creșterile într-un buget de timp. Dar acesta acceptă **valorile propuse de browser**, inclusiv cheltuielile, iar `cont.js` continuă să trimită obiectul de salvare `S` în `game_saves`. SQL21–24 oferă audit sau valori în jurnalul competitiv, nu autoritatea reală asupra recompenselor.

SQL25 creează **un registru nou, separat**, cu tranzacții care pot fi aplicate doar de cod server-side autorizat, fără ca vreun utilizator să declare direct sumele. Această etapă este infrastructură necesară, **nu încă înlocuirea portofelului jocului**.

## Ce se instalează

- `beta_economy_accounts`: solduri separate `gold`, `ore`, `xp`, revizie și stare `shadow` (implicit).
- `beta_economy_ledger`: operații cu cheie unică `(user_id,event_key)`, sursă aprobată, diferențe și soldurile după tranzacție; niciun client nu primește acces direct la acest tabel.
- `beta_economy_apply_internal(uuid,text,text,bigint,bigint,bigint)`: operație `SECURITY DEFINER`, **EXECUTE revocat explicit** de la PUBLIC, anon, authenticated. Nu o lega de un RPC public care transmite diferențele din browser. Folosită ulterior numai de comenzi server-side ce calculează și validează costuri/recompense.
- `beta_economy_status()`: permite unui jucător autentificat și autorizat în BETA să vadă **numai propria stare shadow**, fără drept de modificare sau acces la istoricul altor conturi.

Operarea este atomică și serializată prin `FOR UPDATE`; soldurile nu pot deveni negative, cheia unui eveniment nu poate fi aplicată de două ori, iar reutilizarea aceleiași chei cu altă sumă e refuzată. La o reîncercare validă răspunde cu **soldul curent** și revizia tranzacției inițiale.

## Ce NU face încă

- Nu importă aur, XP sau obiecte din `game_saves`, nici din `wallet`.
- Nu transferă aurul/XP-ul din SQL24 în registru: victoria în PvP e încă anunțată de client.
- Nu aplică operațiuni pentru forjare, magazin, piață, temnițe sau echipare până când fiecare mecanism are comenzi server-side validate.
- Nu modifică `wallet_sync`, `world_raid_finish`, `throne_*`, `guild_*`, salvările, clasamentele sau economia actuală.
- Nu este încă o dovadă că echipamentul unui jucător aparține acelui cont. Un `state='shadow'` și `authoritative_for_game=false` sunt comportamentul corect deocamdată.

## Instalare și QA în BETA

1. Confirmă proiectul **Silver-Throne-Test** și fă backup înaintea unei migrări.
2. Confirmă că SQL23 și SQL24 sunt instalate (utilizatorul a confirmat cele 4 verificări SQL24).
3. Deschide `supabase/25-beta-authoritative-economy-ledger-foundation.sql`, apasă **Raw**, copiază întreg scriptul și execută-l în SQL Editor BETA.
4. La final, toate **6** valorile trebuie să fie `true`: `accounts_exist`, `ledger_exists`, `accounts_rls`, `ledger_rls`, `mutation_not_exposed`, `own_status_callable`.
5. Testează login, salvare, Lume, Tron, bresle, Fierărie. Nu trebuie să existe schimbări vizibile în resurse.
6. În SQL Editor (read-only), poți verifica faptul că instalarea **nu a importat automat datele**:

```sql
SELECT (SELECT count(*) FROM public.beta_economy_accounts) AS accounts_created,
       (SELECT count(*) FROM public.beta_economy_ledger) AS ledger_entries;
```

Aceste numere ar trebui să fie 0 imediat după o instalare curată, în absența oricăror operațiuni interne făcute între timp.

**Nu testa credite arbitrare pe un cont real** și nu încărca cheia `service_role` în frontend. Nu încerca să faci funcția internă accesibilă jucătorilor pentru a „testa” plățile.

## Teste de regresie

`node dev/test-beta-authoritative-economy-ledger.js`. Verifică structura SQL, permisiunile declarate, păstrarea mecanismelor existente și un model numeric de tranzacții (credit, debit, retry, coliziune de cheie, sold insuficient). Testul JavaScript poate trece fără ca SQL să poată fi compilat într-un PostgreSQL real; instalarea și testarea RLS/authenticată sunt obligatorii.

## Următoarele schimbări, înainte de terminarea pasului 33

1. Alegem o singură operațiune de joc cu recompensă/cost verificabil (nu o victorie PvP trimisă de browser).
2. Adăugăm RPC server-side care calculează acea operațiune, aplică registrul intern și este idempotent.
3. Planificăm conversia progresului preexistent prin backup, reconciliere și acceptarea explicită a unui sold inițial verificat — **niciodată creditat automat din JSON client**.
4. Extindem mecanismul la aur, XP, materiale, inventar/echipament și forjare.
5. Simulăm determinist luptele pe server și validăm rezultatul înainte de recompense, clasamente sau Tron.
6. Abia după paritate și QA pe conturi BETA putem dezactiva vechiul `wallet_sync` client-originat și promova în LIVE.

Până atunci, pasul 33 rămâne **deschis**.