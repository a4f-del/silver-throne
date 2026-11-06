# Instalarea serverului Silver Throne BETA fără Docker

## Stare și scop
Acest pachet reconstruiește schema și funcțiile din LIVE, **fără datele utilizatorilor**, în proiectul `Silver-Throne-Test` din Supabase. Codul sursă al celor 15 funcții Tron a fost recuperat din exportul SQL furnizat; scriptul Bazarului provine din SQL-ul furnizat. Configurația Tronului a fost recreată din `tron-logic.js` și `world-data.js` (valorile LIVE din tabelul `throne_config` nu au fost exportate).

**Aceasta este o migrare nouă, încă netestată pe o bază reală. Nu rula scriptul în LIVE.**

## Precondiții
- Proiectul Supabase BETA există și este selectat în Dashboard.
- SQL-ul `supabase/07-beta-access.sql` din PR #11 a fost deja executat **doar în BETA**.
- Contul de administrator este deja în `public.beta_admins` (în SQL Editor: `select count(*) from public.beta_admins;` dă cel puțin 1).
- În `Authentication`, înregistrarea publică este dezactivată; sunt invitați numai administratorii.
- Nu copia utilizatori, salvări, parole sau înregistrări din proiectul LIVE.

## Instalare simplă (o singură interogare)
1. Deschide fișierul `supabase/BETA-SETUP-COMPLET.sql` din PR #12.
2. Copiază **tot textul**, deschide **Silver-Throne-Test → SQL Editor → New query**, lipește și apasă Run.
3. Dacă apare o eroare, oprește-te și transmite mesajul exact. Nu rula scriptul încă o dată în LIVE.
4. Dacă apare `Success`, verifică rezultatul cu interogarea de mai jos.

Scriptul combinat rulează, în ordine: `00-beta-core.sql`, `01-throne-beta.sql`, `02-lume.sql`, `04-portret.sql`, `05-portofel.sql`, `08-bazar-beta.sql`, `03-cont.sql` și migrarea Tronului 1v1 `06-tron-duel-1v1.sql` din PR #10.

## Verificare doar-citire
```sql
SELECT 'game_saves' AS obiect, to_regclass('public.game_saves') IS NOT NULL AS exista
UNION ALL SELECT 'throne_profiles', to_regclass('public.throne_profiles') IS NOT NULL
UNION ALL SELECT 'throne_state', to_regclass('public.throne_state') IS NOT NULL
UNION ALL SELECT 'world_players', to_regclass('public.world_players') IS NOT NULL
UNION ALL SELECT 'wallet', to_regclass('public.wallet') IS NOT NULL
UNION ALL SELECT 'bazar_listings', to_regclass('public.bazar_listings') IS NOT NULL
UNION ALL SELECT 'bazar_inbox', to_regclass('public.bazar_inbox') IS NOT NULL
UNION ALL SELECT 'is_beta_admin', to_regprocedure('public.is_beta_admin()') IS NOT NULL
UNION ALL SELECT 'throne_publish', to_regprocedure('public.throne_publish(text,integer,jsonb)') IS NOT NULL
UNION ALL SELECT 'bazar_buy', to_regprocedure('public.bazar_buy(bigint)') IS NOT NULL;
```
Toate trebuie să fie `true`.

## Autorizare și testare
- În BETA, funcția `is_beta_admin()` permite intrarea în client numai pentru conturile din `beta_admins`. `game_saves` folosește RLS pe utilizator și acest rol.
- Dacă sunt necesare *două* conturi pentru un duel PvP, invită încă un cont **separat, tot administrator BETA**, apoi adaugă UUID-ul în `beta_admins` și `admins`. Nu migra conturi din LIVE.
- Pentru testul prin browser trebuie configurat PR #11 (selector) și codul PR #10 (Tron duel); PR #10 limitează acum 1v1 strict la `ST_SERVER === 'beta'`, astfel încât LIVE să păstreze regula veche.
- În proiectul BETA, SQL-ul Tronului acceptă un singur erou la publicare, fără plafon artificial. Nu aplicăm acest SQL în LIVE.
- **Limită importantă:** serverul primește valorile eroului din browser și nu le poate valida complet. Pentru o competiție reală anti-trișat, calculele trebuie mutate în backend autoritativ.
- Nu publicăm în LIVE modificări nevalidate și nu ștergem cei 7 jucători.

## Dependențe
`08-bazar-beta.sql` conține `wallet_sync` și trebuie rulat după `05-portofel.sql`. `02-lume.sql` are nevoie de tabelele Tronului. `04-portret.sql` înlocuiește `world_join` din `02-lume.sql`. `06-tron-duel-1v1.sql` trebuie rulat după schema Tronului.

## Notă
Dump-ul de coloane al LIVE nu surprinde toate politicile, trigger-ele și funcțiile ascunse. Acest pachet recreează componentele cunoscute și necesare clientului; nu este o clonă binară garantată a întregii baze LIVE. BETA trebuie verificată prin conectare și teste funcționale.
