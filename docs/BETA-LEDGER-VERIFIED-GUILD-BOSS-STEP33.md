# Silver Throne BETA — pasul 33 / SQL34: dovadă server-side pentru lovitura bossului de breaslă

**Stare:** SQL34 instalat în Silver-Throne-Test, cu **9/9 verificări de structură `true`** confirmate de operator. Testul cu o lovitură reală nouă și verificarea ledgerului rămân de efectuat. Instalarea nu se face automat. Ruleaz-o **manual numai în Supabase Silver-Throne-Test**, după SQL14–19 și SQL25–26. **NU LIVE.** Nu schimbă `guild_api`, recompensele, viețile, numărul de lovituri disponibile, salvările sau progresul.

## Ce se schimbă cu adevărat

La un atac asupra bossului de breaslă, funcția existentă `guild_api('boss')` verifică membrul și limita de două atacuri zilnice, calculează contribuția și creează un rând `guild_boss_hits`. Acest rând are un `id` emis de PostgreSQL, nu un UUID ales de browser.

SQL34 înregistrează acel **eveniment confirmat de server**, în aceeași tranzacție, în registrul privat `beta_economy_ledger`. Fiecare `id` al loviturii produce o cheie `guild-boss-hit:<id>`, contorizată cel mult o dată, chiar dacă un eveniment ar fi reexecutat. Contorul nou `beta_economy_accounts.verified_guild_boss_hits` este **doar în modul shadow**, separat de bunurile jucătorului. Înregistrarea are **zero** aur, minereu și XP; nu schimbă mărcile de breaslă și nu face import retroactiv al loviturilor.

Triggerul refuză un hit cu utilizator diferit de `auth.uid()`, fără acces BETA, fără apartenență la breaslă, cu zi/săptămână greșite sau cu daune nepozitive. Scrierea directă în `guild_boss_hits` rămâne interzisă utilizatorilor obișnuiți; nu există un nou RPC public care acceptă lovituri sau daune arbitrare.

**Limită importantă:** serverul confirmă că *acțiunea a fost acceptată de guild_api*, nu că eroul deține realmente echipamentul sau statisticile publicate în `world_players`. De asemenea, rapoartele de Temniță/Turn `guild_api('report')` folosesc încă evenimente/UUID-uri create de browser și rămân nevalidate. Nu prezentăm SQL34 drept anti-cheat complet.

## Instalare (manual, doar BETA)

1. Verifică proiectul **Silver-Throne-Test**, apoi fă backup BETA. Nu deschide proiectul LIVE pentru această instalare.
2. Confirmă SQL26 deja activ și schema Breslelor SQL19. **Nu rerula** SQL14, SQL25 sau SQL26.
3. Deschide [SQL34 în GitHub](https://github.com/a4f-del/silver-throne/blob/main/supabase/34-beta-ledger-verified-guild-boss-hit.sql), apoi **Raw**, și rulează fișierul integral în SQL Editor BETA. Include `BEGIN`, `COMMIT` și diagnosticul final.
4. Verifică toate cele **9 rezultate `true`**:

| Control | Așteptat |
|---|---|
| `hit_counter_exists` | `true` |
| `hit_delta_exists` | `true` |
| `boss_trigger_active` | `true` |
| `sql26_trigger_preserved` | `true` |
| `trigger_not_callable_by_players` | `true` |
| `trigger_not_callable_by_anon` | `true` |
| `direct_hits_denied` | `true` |
| `guild_api_preserved` | `true` |
| `ledger_sources_preserved` | `true` |

## QA după instalare

Dintr-un cont **BETA** membru al unei bresle, execută **o lovitură normală** asupra bossului. Nu modifica manual tabelele și nu apela funcțiile interne.

Verifică numai în SQL Editor din **Silver-Throne-Test**:

```sql
SELECT event_key, source, verified_guild_boss_hit_delta,
       gold_delta, ore_delta, xp_delta, revision, created_at
FROM public.beta_economy_ledger
WHERE source = 'guild_boss_hit_verified'
ORDER BY id DESC LIMIT 10;
```

Pentru o lovitură nouă trebuie să existe o singură înregistrare, cu `verified_guild_boss_hit_delta=1` și toate cele trei valori economice egale cu **zero**. Verifică că viața bossului, limita 2/zi și progresul breslei au rămas identice cu regulile anterioare. Reîncărcarea paginii nu trebuie să dubleze evenimentul. Hituri istorice anterioare SQL34 nu sunt importate.

Un eșec al triggerului anulează tranzacția loviturii, nu o plătește parțial. Dacă apare o eroare, păstrează mesajul și verifică schema BETA; nu încerca să recuperezi lovitura prin `INSERT` direct în tabele. Instalarea însăși nu consumă încercări.

## Teste și pașii rămași

`node dev/test-beta-ledger-verified-guild-boss-hit.js` verifică static precondițiile, drepturile, legătura la RPC și modelul de idempotentă/zero recompense. **Nu rulează PostgreSQL real și nu certifică autorizarea Supabase.**

Următorul prag major al pasului 33 este proveniența autoritativă a nivelului/obiectelor și un motor server-side pentru rezultatul PvP/Tron. Ulterior, contractele de Temniță/Turn pot fi mutate pe evenimente autentice ale serverului, fără a invalida retroactiv progresul existent.
