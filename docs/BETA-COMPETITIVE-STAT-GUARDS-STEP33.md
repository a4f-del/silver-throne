# Silver Throne BETA — pasul 33, SQL28: limite de siguranță la publicarea statisticilor PvP

**Status:** cod în GitHub, migrare manuală în **Silver-Throne-Test**. NU LIVE. Necesită SQL21–27 deja instalate. Nu șterge jucători, conturi, salvări, echipamente sau raiduri.

## De ce

Înainte de SQL28, `world_units_ok` și publicarea eroului de Tron din SQL21 permiteau valori individuale de HP, ATK și DEF până la **1.000.000**. Asta este doar un prag tehnic, nu o dovadă că un luptător deține asemenea statistici.

SQL28 introduce un **filtru aplicat server-side**, înainte de salvarea echipei în `world_players.units` sau a fantomei versiunii 2 în `throne_profiles.units`. Sunt patru funcții private și două triggere, fără înlocuirea RPC-urilor `world_join`, `world_raid_finish` ori `throne_publish`.

## Plafoane (foarte permisive)

Folosim datele statice din `tron-logic.js` (`ST_T.CAP`) × **10** pentru fiecare atribut. Plafoanele nu sunt adaptate nivelului și sunt intenționat generoase, până la calibrarea pe personaje BETA reale.

| Clasă | HP maxim | Atac maxim | Apărare maximă |
|---|---:|---:|---:|
| Campion | 28.700 | 3.450 | 2.430 |
| Arcaș | 13.220 | 2.810 | 1.240 |
| Paznic | 13.380 | 2.280 | 1.620 |
| Războinic | 12.620 | 2.450 | 1.670 |
| Mag | 12.640 | 2.330 | 1.210 |
| Vraci | 11.640 | 2.870 | 1.600 |
| Gardian | 13.960 | 2.230 | 2.170 |

Nu schimbăm echipa existentă sau rezultatul vreunui raid. Dacă un client încearcă să publice mai mult decât permite clasa, serverul refuză publicarea (fără să consume energie sau să rescrie progresul).

**Limitare esențială:** un jucător poate în continuare **inventa** o statistică sub aceste limite, deoarece `game_saves`, inventarul și progresul nu sunt încă surse de încredere. SQL28 **nu este un anti-cheat complet**.

## Instalare sigură

1. Verifică să fii în Supabase **Silver-Throne-Test**, fă backup și confirmă că SQL27 a întors cele șase valori `true`.
2. Deschide `supabase/28-beta-competitive-stat-class-guards.sql`, folosește **Raw**, copiază tot și execută în SQL Editor **BETA**.
3. Scriptul face un **preflight**: verifică unitățile existente din Lume și apărările Tronului versiunea 2. Dacă descoperă profile care ar fi refuzate, ridică o eroare cu numărul lor și **întreaga tranzacție se anulează**. Nu resetează automat personajele. În acest caz, NU încerca să ștergi sau să modifici date pentru a forța instalarea; raportăm și investigăm cauza.
4. Dacă scriptul se finalizează, cele **6 verificări** trebuie să fie `true`:
   `world_guard_active`, `throne_guard_active`, `sql22_capture_preserved`, `sql27_simulator_preserved`, `validation_private`, `impossible_stats_rejected`.

## QA pe cont BETA

1. Cu eroul real, intră pe harta Lume și așteaptă publicarea echipei. Verifică lipsa mesajului de eroare.
2. Deschide Tronul și publică apărarea eroului 1v1. Verifică lipsa mesajului de eroare și că puterea rămâne neschimbată.
3. Fă un raid PvP, verifică funcționarea luptei, recompensele, cooldownul și noul rând de simulare SQL27. Niciunul nu ar trebui schimbat de SQL28.
4. Poți verifica validarea printr-o interogare **doar citire**, executată în SQL Editor BETA:

```sql
SELECT
  public.beta_competitive_units_within_bounds(
    '[{"n":"Erou","c":"Campion","hp":2870,"atk":345,"def":243}]'::jsonb
  ) AS legitimate_team_accepted,
  NOT public.beta_competitive_units_within_bounds(
    '[{"n":"Fals","c":"Campion","hp":287000,"atk":34500,"def":24300}]'::jsonb
  ) AS impossible_team_rejected;
```

Ambele rezultate trebuie să fie `true`. Asta **nu testează complet** drepturile anonime sau echilibrul jocului; doar demonstrează regula de validare.

## Dacă un personaj legitim e respins după instalare

Nu îl șterge. În **BETA**, poți dezactiva temporar ambele triggere (fără modificări de date) în SQL Editor:

```sql
ALTER TABLE public.world_players DISABLE TRIGGER beta_competitive_world_units_limits;
ALTER TABLE public.throne_profiles DISABLE TRIGGER beta_competitive_throne_units_limits;
```

Aceasta este o măsură temporară pentru QA, nu pentru LIVE. Păstrează raportul de eroare și recalibrăm limitele înainte de reactivare.

## Rezultatul simulatorului SQL27

`s.outcome` conține numai `attacker`, `defender`, `draw` sau `unavailable`. Mesajul Supabase „Success” înseamnă că interogarea a rulat, nu neapărat că simulatorul a creat un rând. Pentru validarea unui raid nou, execută:

```sql
SELECT s.raid_id, s.outcome, s.rounds, s.predicted_attacker_win,
       r.win AS client_reported_win
FROM public.beta_world_combat_simulations s
JOIN public.world_raids r ON r.id=s.raid_id
ORDER BY s.raid_id DESC LIMIT 5;
```

Dacă nu există încă niciun rând, pornește și finalizează un raid **după** instalarea SQL27.

## Test

`node dev/test-beta-competitive-stat-class-guards.js`: test static + model, compară toate cele 7 clase cu `ST_T.CAP` și verifică acceptarea/rejectarea limitelor, absența resetărilor și păstrarea RPC-urilor. **Nu este test PostgreSQL autentificat**.

## Mai avem de făcut înainte de LIVE

- Nivelul real și itemele trebuie să devină proprietăți verificate de server, nu statistici trimise de client.
- Motorul PvP simplificat SQL27 nu reflectă toate aptitudinile și nu trebuie încă să decidă oficial victoria.
- Abia cu resurse/equipment server-side și verdict server-side verificăm complet Tronul, PvP, Breslele și clasamentele.
