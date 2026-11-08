# Silver Throne BETA — Pasul 25: obiective săptămânale de breaslă

Data: 8 noiembrie 2026. Migrare numai pentru proiectul Supabase Silver-Throne-Test. **Nu executa în LIVE.**

## Problema
Toate breslele aveau aceleași obiective (150 Temnițe, 25 căpitani Greu/Coșmar, 1.000 etaje de Turn), indiferent de mărime. Atât clientul, cât și SQL-ul verificau praguri fixe.

## Noua regulă
La crearea primei înregistrări a săptămânii, serverul fixează numărul de membri activi de la începutul săptămânii, bazat pe contribuții sau înscriere în săptămâna precedentă. Minimum 1, maximum 20. Țintele noi sunt:
- Temnițe: **12 per membru activ**, plafon 150.
- Căpitani: **2 per membru activ**, plafon 25.
- Turn: **60 etaje per membru activ**, plafon 1.000.

| Membri activi | Temnițe | Căpitani | Turn |
| --- | ---: | ---: | ---: |
| 1 | 12 | 2 | 60 |
| 2 | 24 | 4 | 120 |
| 5 | 60 | 10 | 300 |
| 10 | 120 | 20 | 600 |
| 20 | 150 | 25 | 1.000 |

Pragurile sunt stocate în tabelul guild_weeks, nu se modifică la un apel ulterior și sunt folosite inclusiv de verificările de revendicare bronz, argint și aur. Snapshotul se face și înainte de intrarea/ieșirea unui membru. Contractele deja începute păstrează 150/25/1.000 și progresul existent.

Nu există istoric complet al conectărilor la miezul nopții. Din acest motiv, activitatea este definită reproductibil ca **participare sau intrare în breaslă în săptămâna anterioară**, nu simpla conectare. În breslele de nivel mic, obiectivul Turnului poate rămâne greu până la nivelul 20; evaluăm ulterior dacă necesită o ajustare specială.

## Migrare SQL separată
Fișier: supabase/17-beta-guild-frozen-contracts.sql

Operatorul BETA autorizat verifică mai întâi backup-ul breslelor și instalarea migrărilor 14, 15 și 16. Apoi execută manual fișierul 17 **doar în proiectul de test** și verifică:
1. Contractul deja existent își păstrează pragurile și progresul.
2. Un contract nou primește țintele dinamice server-side.
3. Alăturarea/ieșirea unui membru după începutul săptămânii nu modifică aceste ținte.
4. Revendicările verifică noile praguri și nu dublează premiile.
5. Permisiunile RPC și protecțiile BETA rămân active.

## Teste
- node dev/test-beta-guild-weekly-contracts.js
- node dev/test-beta-guilds.js
- node dev/test-beta-guild-ranks-invites.js
- toate testele dev/test-*.js prin GitHub Actions

**Limitare:** Testele Node verifică logica statică SQL și simularea UI, nu execută migrarea într-un Postgres real. LIVE nu este modificat; până la migrare, interfața recunoaște contractele vechi și le afișează corect.

**Status:** implementare BETA pregătită; pasul 25 nu este bifat până la QA SQL autorizat și verificare în browser.
