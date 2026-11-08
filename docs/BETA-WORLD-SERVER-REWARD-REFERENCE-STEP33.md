# Silver Throne BETA — pasul 33, etapa 4: SQL24, jurnal de recompense calculat pe server

**Status: cod in GitHub. Instalare MANUALA in Supabase Silver-Throne-Test, doar dupa SQL21–23. NU LIVE.** Nu reseteaza progres, conturi, bresle sau luptatori.

## Schimbarea fata de SQL21

La finalul unui atac PvP din Lume, browserul continua sa trimita `p_win`, `p_gold` si `p_xp` pentru compatibilitate. Cu SQL24 instalat, serverul **nu mai foloseste `p_gold` si `p_xp` ca valori din jurnalul competitiv**. Acestea sunt pastrate doar ca sume raportate de browser in `beta_world_result_audit`.

Serverul calculeaza sumele in `world_raids.gold/xp`, folosind nivelurile `attacker_level/defender_level` din captura SQL22 de la START, cu fallback la `world_players` pentru atacuri vechi. Formula pastreaza valorile de baza si un bonus mediu de victorie (zarul 6..12 este inlocuit cu 9):

- `effective_level = min(defender_level, attacker_level + 5)`
- `factor = clamp(defender_level / attacker_level, 0.3, 1.2)`
- `gold = round((60+30*effective_level)*factor + (9+3*attacker_level)*2.55)`
- `xp = round((20+8*effective_level)*factor*1.5 + (8+4*attacker_level)*2.55)`
- La infrangere, gold=0 si xp=0.

Exemplu: nivel 50 contra nivel 50, victorie raportata → 1965 aur si 1160 XP in jurnal, indiferent de cat aur/XP declara clientul.

## Securitate si limite

- Functia `world_raid_finish(bigint,boolean,integer,integer)` isi pastreaza semnatura, verificarea BETA `is_beta_admin()`, proprietatea raidului, `FOR UPDATE`, statisticile atacurilor si idempotenta pentru raportari repetate.
- SQL22 continua sa captureze finalizarea prin trigger. SQL21 continua sa pastreze discrepanta dintre sumele cerute si cele inregistrate.
- Se creeaza tabelul privat `beta_world_reward_reference`, cu RLS, fara acces direct pentru PUBLIC/anon/authenticated si cate un rand per raid.
- `credited_to_wallet=false` **nu este o eroare**: SQL24 NU crediteaza salvarea `game_saves`. Jocul inca plateste prada prin vechiul motor din browser. Aurul/XP-ul din jurnal pot diferi de prada afisata jucatorului; `lume.js` clarifica aceasta diferenta doar in BETA.
- **Victoria (`p_win`) ramane declarata de browser si poate fi falsificata.** Nivelurile capturate vin din `world_players`, unde publicarea initiala este tot din browser. Inventarul, portofelul si calculul luptei nu au devenit autoritative pe server.
- Nu folosi datele din acest tabel pentru a bloca utilizatori, acorda bonusuri repetate, recalcula retroactiv progresul sau declara anti-cheat complet.
- Raidurile pornite/terminate anterior SQL24 nu se rescriu si nu primesc retroactiv inregistrare in tabelul nou.

## Instalare si verificare

1. In Supabase verifica sa fii in **Silver-Throne-Test**. Fa backup.
2. Deschide `supabase/24-beta-world-server-reward-reference.sql`, copiaza intreg continutul din **Raw** si ruleaza in SQL Editor BETA. Nu relua SQL02, SQL21 sau SQL22 ulterior, pentru ca pot suprascrie RPC-ul de la SQL24.
3. Interogarea finala a migrarii trebuie sa intoarca patru coloane `true`: `reward_table_exists`, `reward_rls_enabled`, `reward_rpc_installed`, `sql22_finish_trigger_preserved`.
4. Intra cu doua conturi de test BETA, publica echipele si finalizeaza **un raid nou** dupa instalare.
5. Verifica read-only:

```sql
SELECT r.raid_id, r.attacker_level, r.defender_level,
       r.win_reported, r.reference_gold, r.reference_xp,
       r.credited_to_wallet,
       a.claimed_gold, a.claimed_xp, a.accepted_gold, a.accepted_xp
FROM public.beta_world_reward_reference r
LEFT JOIN public.beta_world_result_audit a ON a.raid_id=r.raid_id
ORDER BY r.raid_id DESC LIMIT 10;
```

`reference_gold/reference_xp` trebuie sa fie identice cu `accepted_gold/accepted_xp`. Daca `claimed_gold/claimed_xp` difera, este asteptat; sunt raportate de browser si NU sunt dovezi de frauda.

6. Verifica o infrangere (0/0 in referinta) si daca un retry la `world_raid_finish` returneaza `already=true` fara incrementarea contoarelor. Nu incerca replay-uri in afara conturilor QA.

## Verificari tehnice

`node dev/test-beta-server-reward-reference.js` este test static + model numeric. Nu ruleaza PostgreSQL si nu verifica paritatea portofelului cu jurnalul. CI ruleaza si celelalte teste `dev/test-*.js`.

## Urmatoarea etapa obligatorie

Crearea unui registru *real*, autoritativ pentru aur/XP/materiale/obiecte si a tranzactiilor server-side pentru obtinere, cheltuire, forjare, inventar si nivel, apoi un motor PvP/Tron cu rezultat verificat pe server. Pana atunci, SQL24 securizeaza **numai sumele din jurnal**, nu recompensa efectiva si nu validitatea victoriei.
