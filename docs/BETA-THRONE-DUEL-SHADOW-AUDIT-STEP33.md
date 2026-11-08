# Silver Throne BETA — Pasul 33 / SQL31: audit independent pentru duelurile Tronului

**Status:** migrarea este pregătită în GitHub, **neinstalată** până când o rulezi în Supabase **Silver-Throne-Test**. Nu se rulează în LIVE. Nu schimbă verdictul duelului, punctele, apărarea, săptămâna Tronului sau recompensele.

## De ce mai avem nevoie de pasul 33?

Atacul Tronului folosește `throne_challenge_start()`, iar după lupta din browser trimite `throne_challenge_finish(p_id,p_win)`. Serverul verifică drepturile și provocarea, dar nu știe încă dacă rezultatul `p_win` reflectă lupta reală. În plus, eroul și echipamentul publicat sunt încă date calculate de client.

SQL27 a introdus un simulator pasiv pentru **Lume**, nu pentru **Tron**. SQL31 completează observația Tronului, fără să forțeze un câștigător până la paritatea motorului.

## Ce adaugă SQL31

- Tabel privat `beta_throne_challenge_shadow`, cu RLS și **fără acces direct pentru jucători**.
- Un trigger `AFTER INSERT` pe `throne_challenges`: la o provocare nouă, îngheață câte un erou din `throne_profiles` pentru provocator și pentru regele actual, plus nivelurile disponibile. Nu acceptă parametri de profil de la browser la finalul duelului.
- O estimare **orientativă** bazată pe viață, atac și apărare. Categoriile sunt `challenger_favored`, `holder_favored`, `contested`, `royal_guard`, `insufficient_data`. Estimarea ignoră abilități, inițiativa aleatorie, critice și cap-ul de daună și **nu dovedește victoria sau trișarea**.
- Un trigger `AFTER UPDATE OF finished`: marchează data finalizării și copiază verdictul înregistrat de funcția originală, dacă există un câmp boolean denumit `win`, `won` sau `victory`. În celelalte cazuri `reported_win` rămâne NULL, iar `result_field` devine `unavailable`. Nu inventăm rezultatul.
- Captură idempotentă: același `challenge_id` este introdus o singură dată; instantaneul nu este rescris la retry. Ștergerea provocării originale șterge prin CASCADE înregistrarea de audit.

Nicio funcție oficială `throne_challenge_start`, `throne_challenge_finish` sau `throne_publish` nu este înlocuită. Instrumentarea gestionează erorile cu avertizări, ca o problemă de audit să nu blocheze un duel legitim.

## Instalare numai în BETA

1. Asigură-te că ai un backup Supabase BETA și că ai ales proiectul **Silver-Throne-Test**, nu LIVE.
2. SQL30 a fost deja confirmat de tine cu 7/7 verificări; el implică existența validatorului SQL28. **Nu mai rula SQL28 sau SQL30.**
3. Deschide [`supabase/31-beta-throne-duel-shadow-audit.sql`](https://github.com/a4f-del/silver-throne/blob/main/supabase/31-beta-throne-duel-shadow-audit.sql), apasă **Raw** și copiază **întregul fișier** în SQL Editor BETA.
4. Rulează o singură dată. Scriptul este tranzacțional (`BEGIN` / `COMMIT`) și are verificări la final.

**Toate cele 8 coloane trebuie să fie `true`:** `throne_shadow_exists`, `shadow_rls_enabled`, `shadow_not_readable_by_clients`, `throne_start_capture_active`, `throne_finish_capture_active`, `capture_functions_private`, `sql28_throne_guard_preserved`, `original_throne_rpcs_preserved`.

### Verificare după un duel nou

După instalare, pornește o **provocare nouă** în Tron din BETA și finalizeaz-o. În **SQL Editor BETA**, interogarea următoare arată doar metadatele auditului, nu eroii sau identificatorii conturilor:

```sql
SELECT challenge_id, challenge_started_at,
       CASE WHEN jsonb_typeof(challenger_units)='array'
            THEN jsonb_array_length(challenger_units)
            ELSE NULL END AS challenger_count,
       CASE WHEN holder_units IS NULL THEN 0
            WHEN jsonb_typeof(holder_units)='array'
              THEN jsonb_array_length(holder_units)
            ELSE NULL END AS holder_count,
       estimate, result_field, reported_win,
       completed_at IS NOT NULL AS finish_captured
FROM public.beta_throne_challenge_shadow
ORDER BY challenge_started_at DESC LIMIT 10;
```

Pentru duelul împotriva regelui ar trebui să vezi `challenger_count=1`, `holder_count=1` și, după finalizare, `finish_captured=true`. Când Tronul este gol și lupta se desfășoară împotriva Gărzii Regale, `holder_count=0` și `estimate='royal_guard'`. `reported_win` poate rămâne NULL dacă tabela nu expune un verdict boolean și asta **nu** trebuie interpretat ca eșec al duelului.

Nu utiliza o provocare pornită înainte de SQL31 drept test: acea provocare nu a putut primi instantaneul de start retroactiv.

## Ce mai lipsește pentru finalizarea pasului 33

- O **sursă server-side pentru nivel, echipament și inventar**, care să poată verifica statisticile reale ale eroului.
- **Paritate între motorul de luptă și simulatorul server-side**, inclusiv inițiativă, abilități, critice și alte efecte; doar apoi serverul poate decide oficial victoria.
- **Credite economice server-side** pentru luptele verificate, în registrul SQL25, legate de o reconciliere sigură a salvărilor existente — fără reseturi.
- Teste reale cu două conturi BETA și exerciții de fraudă, retry și reconectare.

`dev/test-beta-throne-duel-shadow-audit.js` a trecut verificările statice și modelul de estimare. **Nu este test SQL în PostgreSQL real**; instalarea și testul cu o provocare autentică rămân de confirmat.

LIVE rămâne neschimbat.