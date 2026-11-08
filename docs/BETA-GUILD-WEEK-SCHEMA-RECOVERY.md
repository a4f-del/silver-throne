# Silver Throne BETA — Reparare „record v_w has no field active_at_start”

## Diagnostic confirmat în repository

Migrarea `supabase/17-beta-guild-frozen-contracts.sql` adaugă în `public.guild_weeks` coloanele:
`active_at_start`, `goal_dungeons`, `goal_hard_boss`, `goal_tower`.
Migrarea `supabase/19-beta-guild-boss-formation-roles.sql` **folosește aceste câmpuri**, dar nu le adaugă.
Migrarea `supabase/20-beta-guild-cosmetics.sql` este independentă.

Dacă au fost executate SQL19 (pas 27) și SQL20 (pas 28) **înainte de SQL17 (pas 25)**, `guild_api` poate exista și porni, dar eșuează la primul acces la `v_w.active_at_start`. PostgreSQL poate amâna unele verificări din corpul PL/pgSQL până la prima execuție.

## Remediere recomandată (fără resetări)

1. Deschide **Supabase → Silver-Throne-Test → SQL Editor**, nu LIVE.
2. Verifică proiectul curent și păstrează un backup al bazei BETA.
3. Copiază și execută **integral** `supabase/REPAIR-beta-guild-week-columns-after-19.sql` din repository.
4. Scriptul adaugă idempotent cele patru coloane lipsă, folosind valorile implicite din SQL17 pentru contractele deja create; reinstalează **numai** `guild_week_ensure` din SQL17; nu redefinește `guild_api` și nu atinge SQL19/20.
5. La final, prima interogare de verificare trebuie să arate **4 rânduri** cu cele patru coloane. A doua trebuie să întoarcă `guild_api_exists=true` și `step_27_guild_api_present=true`.
6. Reîncarcă jocul BETA, deschide Bresle și verifică contractul și bossul fără a consuma atacuri în timpul testului.
7. Dacă oricare interogare este greșită, oprește-te și verifică starea migrărilor înainte să rulezi alte fișiere. **Nu** relua SQL14/15/16, deoarece ele pot suprascrie configurări existente.

## Verificări suplimentare non-distructive

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_schema='public' AND table_name='guild_weeks'
  AND column_name IN ('active_at_start','goal_dungeons','goal_hard_boss','goal_tower')
ORDER BY column_name;
```

Verificarea unei săptămâni existente se face **fără UPDATE**:

```sql
SELECT guild_id, week_start, active_at_start,
       goal_dungeons, goal_hard_boss, goal_tower
FROM public.guild_weeks ORDER BY week_start DESC LIMIT 10;
```

## De ce nu executăm direct SQL17 apoi SQL18 apoi SQL19?

Este o ordine validă pentru instalarea de la zero, dar în cazul particular al bazei care are deja SQL19 și SQL20, executarea SQL17 redefinește temporar `guild_api` cu o versiune mai veche. Scriptul de recuperare repară **doar** structura de care depinde funcția curentă și instalează rutina săptămânală, fără acea suprascriere.

## Limitări și siguranță

- Scriptul de recuperare este tranzacțional, are `ADD COLUMN IF NOT EXISTS` și `CREATE OR REPLACE FUNCTION`, nu conține `DROP`, `DELETE` sau `TRUNCATE` și nu atinge progresul existent.
- Pentru contractele deja create, pragurile implicite sunt cele vechi: **150 / 25 / 1000**. Săptămânile create după reparare folosesc formula din SQL17.
- Niciun script GitHub nu se execută automat în Supabase. Nu putem confirma efectul asupra bazei BETA fără acces la SQL Editor/Postgres; testele Node verifică doar codul și dependențele.
- Nu executa în LIVE și nu lansa atacuri de boss ca parte a verificării erorii.

## Regresie

`node dev/test-beta-guild-week-recovery.js` trebuie să treacă împreună cu regresiile existente pentru pașii 25–28.

Status: **reparare pregătită pentru execuție manuală în BETA, fără resetare de date**.
