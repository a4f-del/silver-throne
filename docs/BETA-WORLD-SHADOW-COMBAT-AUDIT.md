# Silver Throne BETA — Pasul 33, etapa 2: SQL22 shadow combat audit

Status: pregatit in GitHub, neinstalat automat in Supabase. SQL22 se ruleaza MANUAL doar in Silver-Throne-Test, dupa SQL21. NU LIVE.

## Ce face

- La pornirea unui raid PvP din Lume, triggerul pastreaza o copie server-side a nivelurilor si echipelor publicate de ambii jucatori, plus scoruri orientative.
- La finalizarea raidului (inclusiv expirare), al doilea trigger noteaza verdictul si sumele deja inregistrate in world_raids, fara a le rescrie.
- Datele din tabelul beta_world_combat_shadow sunt private (RLS + REVOKE). Doar operatorul SQL Editor le inspecteaza.
- Nu modifica cooldownurile, energia, rezultatul luptei, recompensele, tronul, breslele sau salvarile.

Estimarea folosită este orientativa, nu o lupta simulata si nu un verdict anti-cheat. Nu include abilitati, critice, vindecari, efecte sau aleator. Echipele si nivelurile din world_players provin initial din browser, deci nu reprezinta dovada proprietatii echipamentului.

## Instalare BETA

1. Confirmă proiectul Silver-Throne-Test si fa backup.
2. Verifica instalarea SQL21.
3. Deschide supabase/22-beta-world-shadow-combat-audit.sql din GitHub si copiaza intregul fisier prin Raw in Supabase SQL Editor.
4. Patru rezultate trebuie sa fie true: shadow_table_exists, rls_enabled, start_trigger_exists, finish_trigger_exists.
5. Cu doua conturi BETA, publica echipele si efectueaza un raid PvP nou, dupa instalare. Verifica si cazul in care raidul este pierdut.
6. Inspecteaza auditul read-only:

```sql
SELECT raid_id, attacker_level, defender_level, estimate,
       reported_win, reported_gold, reported_xp,
       started_at, finished_at
FROM public.beta_world_combat_shadow
ORDER BY started_at DESC LIMIT 10;
```

Raidurile incepute inainte de SQL22 nu primesc retroactiv snapshot. Nu reconstruim istoria din echipele publicate ulterior.

## Test si limita de siguranta

Testul static: node dev/test-beta-world-shadow-combat-audit.js

Testele statice nu executa migrarea intr-un PostgreSQL real si nu compara motorul browserului cu o simulare pe server. SQL22 nu este anti-cheat complet si nu trebuie folosit pentru sanctionare sau modificarea clasamentelor. Pentru protectia reala trebuie progres, echipament si rezultate calculate si validate server-side.
