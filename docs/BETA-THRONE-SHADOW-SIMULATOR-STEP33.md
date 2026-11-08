# Silver Throne BETA — SQL32 / Pasul 33: simulator pasiv pentru duelurile Tronului

**Stare:** SQL31 instalat și confirmat de operator cu **8/8 verificări `true`**. SQL32 este **pregătit în GitHub, neinstalat**. Nu are modificări de frontend, nu necesită ștergeri și nu atinge LIVE.

## De ce un simulator pasiv?

În duelul Tronului, `throne_challenge_finish(p_id,p_win)` primește încă verdictul calculat în browser. SQL31 îngheață instantaneele de erou publicate pentru provocator și pentru rege, dar nu produce o luptă independentă. SQL32 adaugă prima versiune reproductibilă pentru a observa **cât de des un model simplificat diferă de victoria declarată**, fără să folosească estimarea ca autoritate.

### Modelul SQL32 (versiunea 1)

- Duel 1v1, **doar împotriva unui rege cu profil `duel_version=2`**. Fără rege: `unavailable`, fiindcă Garda Regală este creată prin altă formulă.
- Viața, atacul și apărarea provin exclusiv din **snapshoturile SQL31** fixate la start, nu dintr-o cerere a clientului la final.
- Atac normal aproximativ `max(1, round(ATK - 0,35×DEF))`.
- **Numai regele**, fiind apărare-fantomă, are ATK × **1,62**. Eroul provocator nu primește automat acest bonus.
- Fiecare lovitură este plafonată la **38% din viața maximă** a țintei, ca în configurația BETA.
- Inițiativă reproductibilă prin paritatea identificatorului provocării. În joc, inițiativa este aleatorie; simulatorul **nu știe** cine a început duelul real.
- Maximum **60 runde / 120 lovituri**, fără probabilități, critice, abilități, efecte pasive, vindecare, sângerare sau echipament verificat.
- Dacă unul din snapshoturi este absent/incompatibil, rezultatul este `unavailable`. Nu se fabrică un învingător.

**Important:** victoria produsă de acest model este **doar predicție**, nu probă de trișare. Rezultatele apropiate pot fi complet diferite în joc.

## Ce instalează

- `beta_throne_duel_simulations`: tabel privat, RLS activ, fără acces direct pentru `authenticated`/`anon`.
- `beta_throne_duel_simulate_baseline(jsonb,jsonb,bigint)`: funcție pură, inaccesibilă direct clienților, cu limite de formă și clasă din SQL28/30.
- `beta_throne_duel_shadow_auto()`: trigger pe **INSERT în snapshotul SQL31**, care salvează o singură simulare idempotentă per `challenge_id`.
- Un eșec de diagnostic este raportat ca warning SQL, fără să anuleze provocarea validă.
- Nu sunt reexecutate duelurile vechi; datele SQL31 rămân intacte. Nimic nu rescrie `throne_challenge_start`, `throne_challenge_finish`, `throne_publish` sau portofelul.

## Instalare în BETA (manual)

1. Confirmă proiectul **Supabase Silver-Throne-Test** și fă backup. Nu folosi LIVE.
2. Verifică faptul că **SQL31 este instalat** (ai confirmat 8/8). Nu-l mai rula.
3. Deschide [SQL32 în GitHub](https://github.com/a4f-del/silver-throne/blob/main/supabase/32-beta-throne-duel-shadow-simulator.sql), apoi **Raw**. Copiază **întreg scriptul**, inclusiv `BEGIN;`, `COMMIT;` și ultima interogare.
4. Rulează SQL32 în SQL Editor **BETA** și confirmă toate cele opt coloane `true`:

| Verificare | Așteptat |
|---|---|
| `throne_simulations_table_exists` | `true` |
| `simulation_rls_enabled` | `true` |
| `simulations_private` | `true` |
| `simulator_trigger_active` | `true` |
| `sql31_snapshot_trigger_preserved` | `true` |
| `simulator_function_private` | `true` |
| `clear_challenger_case` | `true` |
| `clear_holder_case` | `true` |

## Test cu provocări reale noi

Pentru a testa simulatorul, ai nevoie de o **provocare începută după instalarea SQL32**. Intră în Tron în BETA, provoacă un rege (nu Garda Regală) și încheie duelul. Apoi în SQL Editor din proiectul BETA:

```sql
SELECT s.challenge_id,
       s.outcome AS simulare,
       s.predicted_challenger_win,
       sh.estimate AS estimare_statistica,
       sh.reported_win AS rezultat_raportat,
       CASE
         WHEN sh.reported_win IS NULL
              OR s.predicted_challenger_win IS NULL THEN NULL
         ELSE s.predicted_challenger_win = sh.reported_win
       END AS concordanta,
       s.rounds, s.actions_count,
       sh.completed_at IS NOT NULL AS audit_finalizat
FROM public.beta_throne_duel_simulations s
JOIN public.beta_throne_challenge_shadow sh
  ON sh.challenge_id=s.challenge_id
ORDER BY s.challenge_id DESC
LIMIT 10;
```

**Interpretare:** `simulare=unavailable` când regele nu are un snapshot valid sau când te lupți cu Garda Regală. `rezultat_raportat=NULL` este permis, deoarece SQL31 nu presupune că schema originală are un câmp de rezultat compatibil. `concordanta=false` este normal posibilă din cauza diferențelor dintre simulare și lupta reală.

SQL32 nu adaugă butoane în joc. Jucătorii nu pot citi direct aceste tabele.

## Teste

- `node dev/test-beta-throne-shadow-simulator.js`: validarea formei, RLS și drepturi, limitarea la un singur erou, multiplicatorul aplicat corect, cap-ul de 38%, 60/120, cazuri cu învingători evidenți și rezultat `unavailable`.
- Este o **verificare statică plus model JavaScript**, nu PostgreSQL real.
- Nu revendicăm paritate între simulator și motorul de luptă. Un pas viitor este captarea în siguranță a inițiativei și efectelor pentru comparare, urmată de calcularea autoritativă server-side.

## Status pas 33

**SQL31: instalat 8/8. SQL32: pregătit, neinstalat.** Mai lipsesc proprietatea server-side a inventarului, nivelului și echipamentului; motorul oficial, recompensele verificate și teste cu conturi BETA. Păstrăm progresul existent. LIVE rămâne neschimbat.
