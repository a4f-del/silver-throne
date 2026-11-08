# Silver Throne BETA — Pasul 33 / SQL27: simulator PvP pe server, în paralel

**Actualizare SQL30 (BETA):** simulatorul SQL27 continuă să folosească algoritmul inițial, dar validatorul de echipă și limita maximă de acțiuni au fost extinse prin SQL30 pentru **4v4** (maximum **320** acțiuni). Nu se rerulează scriptul istoric SQL27 după SQL30.

**Status:** cod în GitHub, **neinstalat automat** în Supabase. Se rulează doar în **Silver-Throne-Test** după SQL21–26. **Nu LIVE.**

## Ce schimbă

SQL27 adaugă un simulator de luptă **independent de browser**, executat automat în aceeași tranzacție în care SQL22 capturează echipele la începutul unui raid PvP. Nu folosește `p_win` sau `p_gold/p_xp` trimise la final și nu poate fi influențat de schimbarea echipei după pornirea raidului.

Simularea folosește **exclusiv instantaneele de 1–3 luptători** deja păstrate de SQL22:
- HP, ATK și DEF; primul luptător în viață este ținta;
- dauna unei lovituri este `max(1, round(ATK - 0.35 × DEF_țintă))`;
- atacul apărătorului (fantoma) este multiplicat cu `1.62`, precum în client;
- 40 de runde cel mult, 3 atacuri pe echipă/tură cel mult;
- atacatorul începe primul dacă ID-ul raidului e par, altfel apărătorul;
- rezultat `attacker`, `defender`, `draw` sau `unavailable`.

Aceasta este **o regulă simplificată pentru comparație tehnică**, nu paritate cu lupta reală: nu include abilitățile de clasă, criticele, heal, efectele, echipamentul sau aleatorul. Nu interpreta `matches_report=false` ca dovadă de trișare.

## Protecții

- `beta_world_combat_simulations` este privat, cu RLS și fără permisiuni directe.
- Triggerul `beta_world_shadow_simulation_created` se declanșează la inserarea instantaneului SQL22; nu depinde de ordinea triggerelor pe `world_raids`.
- Există cel mult un rezultat per raid, pe `raid_id` PK.
- `beta_world_combat_shadow_simulate` nu este apelabil direct de jucător.
- `beta_world_combat_my_report(bigint)` permite unui jucător **doar raportul raidului propriu, finalizat**, după verificarea accesului BETA. Raportul indică explicit `is_official_result=false`.
- SQL27 **nu modifică** `world_raid_finish`, Tronul, echipele, clasamentele, economia, progresul sau conturile. Păstrează SQL24 și SQL26 intacte.
- Statistici publicate din browser rămân **neverificate ca proveniență din inventar**. Nici simularea independentă nu rezolvă încă această problemă.

## Instalare

1. Verifică proiectul **Supabase Silver-Throne-Test** și fă backup.
2. Confirmă că SQL26 a fost instalat și a trecut testul de raid.
3. Deschide `supabase/27-beta-pvp-shadow-server-simulator.sql` din GitHub, apasă **Raw**, copiază integral în SQL Editor BETA și execută.
4. Cele **6 verificări** de la final trebuie să fie `true`: `simulation_table_exists`, `simulation_rls_enabled`, `simulator_trigger_exists`, `sql22_capture_preserved`, `engine_private`, `own_report_callable`.

## QA autenticat

1. Deschide harta BETA cu două conturi, publică echipele și pornește un **raid PvP nou** după SQL27. Finalizează-l normal.
2. În SQL Editor BETA, folosește această interogare **doar în baza de test**, pentru cele mai recente 10 atacuri:

```sql
SELECT s.raid_id, s.outcome, s.predicted_attacker_win,
       r.win AS client_reported_win, s.rounds, s.actions_count,
       s.attacker_hp_left, s.defender_hp_left,
       CASE WHEN s.predicted_attacker_win IS NULL THEN NULL
            ELSE s.predicted_attacker_win=r.win END AS matches_browser
FROM public.beta_world_combat_simulations s
JOIN public.world_raids r ON r.id=s.raid_id
ORDER BY s.raid_id DESC LIMIT 10;
```

3. Confirmă că simularea există pentru fiecare **raid nou**, iar `rounds` este între 1 și 40; `actions_count` între 1 și 240.
4. Confirmă că victoria, recompensele și clasamentul continuă să funcționeze **exact ca înainte**. SQL27 nu le schimbă.
5. Un raid început înainte de SQL27 nu apare retroactiv. Un raport diferit față de browser este posibil și **așteptat** din cauza regulilor simplificate.
6. Dacă vrei să verifici politica de acces, un jucător poate apela `beta_world_combat_my_report(p_raid_id)` pentru atacul propriu terminat, dar nu pentru raiduri ale altor conturi sau atacuri încă deschise.

## Teste

`node dev/test-beta-pvp-shadow-server-simulator.js` — teste statice și model determinist pentru victorii, înfrângeri, remize, limita de ture și semnătura API. Acesta **nu rulează PostgreSQL** și nu certifică fidelitatea față de motorul real.

## Următorul obiectiv

Înainte ca serverul să decidă oficial `p_win` trebuie să:
1. Stabilim regula de luptă server-side și să verificăm echitatea / paritatea față de motorul real (abilități, efecte, inițiativă).
2. Legăm instantaneele la o sursă de progres, inventar și echipament **autoritativă**, nu la `world_join` controlabil din browser.
3. Modificăm clientul pentru a afișa **rezultatul decis de server** și ajustăm recompensele reale, tranzacțional, în registrul economic.
4. Protejăm Tronul și breslele prin același mecanism, cu testare BETA înainte de LIVE.

**Status pasul 33:** încă nefinalizat. SQL27 este simulare paralelă, nu antifraudă completă.