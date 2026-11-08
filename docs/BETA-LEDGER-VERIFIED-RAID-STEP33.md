# Silver Throne BETA — Pasul 33 / SQL26: consumul de energie al raidului înregistrat de server

**Status:** cod pregătit în GitHub. Instalează manual doar în **Supabase Silver-Throne-Test**, după SQL25. NU LIVE.

## Prima integrare reală cu registrul

`world_raid_start(uuid)` verifică pe server identitatea, energia disponibilă, protecția începătorilor și cooldownul; scade **1 energie** înainte de inserarea raidului în `world_raids`. SQL26 adaugă un trigger `AFTER INSERT`, în **aceeași tranzacție**. Dacă startul nu este acceptat de server, nu se creează niciun eveniment nou.

În registrul SQL25, evenimentul este `world-raid-start:<id>`, cu:
- `source='raid_energy_verified'`
- `verified_raid_uses_delta=1`
- `gold_delta=0`, `ore_delta=0`, `xp_delta=0`
- `gold_after`, `ore_after`, `xp_after` neatinse (soldul shadow)

Un contor `verified_raid_uses` din `beta_economy_accounts` se mărește o singură dată per raid. Este un **număr cumulativ de atacuri PvP autorizate**, nu soldul energiei disponibile. Energia propriu-zisă rămâne în `world_players` și nu este debitată a doua oară.

Cheia unică din SQL25 și `FOR UPDATE` împiedică dublarea la un retry. Triggerul verifică `auth.uid() = NEW.attacker` și rolul BETA. Inserarea directă a raidurilor de către rolurile client este revocată; RPC-ul autorizat rămâne singurul flux obișnuit de pornire.

**Ce nu dovedește:** victoria, statisticile echipamentului, recompensa PvP, soldul de aur și obiectele inventarului. `p_win` rămâne de la browser; SQL24 calculează separat numai jurnalul recompenselor.

## Instalare în BETA

1. Fă backup al proiectului **Silver-Throne-Test**.
2. Confirmă că SQL25 a fost instalat cu toate cele **6** valori `true`.
3. Deschide `supabase/26-beta-ledger-world-raid-energy-spend.sql`, apasă **Raw**, copiază integral și rulează în SQL Editor BETA.
4. Rezultatul diagnosticului trebuie să aibă **6 valori true**:
   `counter_column_exists`, `ledger_column_exists`, `raid_ledger_trigger_exists`,
   `sql22_trigger_preserved`, `direct_raid_insert_denied`, `mutation_trigger_not_callable`.

## QA funcțional

1. Cu două conturi BETA, fă **un atac PvP nou**, după instalarea SQL26. Asigură-te că ai un punct de atac disponibil.
2. Verifică inițierea (energia scade o singură dată), finalizarea, cooldownul și echipa capturată de SQL22; repetarea rezultatului nu trebuie să consume încă o energie.
3. În SQL Editor rulează interogarea read-only:

```sql
SELECT l.event_key, l.source, l.verified_raid_uses_delta,
       l.gold_delta, l.ore_delta, l.xp_delta,
       l.revision, l.created_at
FROM public.beta_economy_ledger l
WHERE l.source='raid_energy_verified'
ORDER BY l.id DESC LIMIT 10;
```

Pentru noul raid trebuie să existe exact un rând cu `verified_raid_uses_delta=1`, iar `gold_delta`, `ore_delta`, `xp_delta` toate `0`.

4. Verifică numărul de atacuri înregistrate pe cont, fără a afișa UUID-uri:

```sql
SELECT count(*) AS conturi_cu_atacuri,
       COALESCE(sum(verified_raid_uses),0) AS atacuri_pvp_verificate
FROM public.beta_economy_accounts
WHERE verified_raid_uses>0;
```

5. Un raid început înainte de SQL26 nu apare retroactiv. SQL22 și SQL24 își păstrează rezultatele și jurnalele. Nu rerula SQL02/21/24 după SQL26 dacă nu ai motiv și plan de restaurare.

## Teste și limitări

`node dev/test-beta-ledger-world-raid-energy-spend.js` verifică static codul SQL, sursa evenimentului și o simulare de idempotentă. **Nu execută SQL într-un PostgreSQL real.**

Aceasta este prima operațiune deja validată server-side **oglindită** în registrul securizat. Nu este încă un portofel autoritativ pentru aur, minereu sau XP. Următorul pas este migrarea costurilor și recompenselor reale, cu baseline și inventar server-side, apoi simulatorul PvP/Tron autoritativ. Nu crea recompense economice din simpla pornire a unui raid.