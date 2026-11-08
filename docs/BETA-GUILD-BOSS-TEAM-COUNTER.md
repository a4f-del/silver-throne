# Silver Throne BETA — Pasul 26: contraclasa bossului de breaslă

Data: 8 noiembrie 2026. **Migrare SQL separată, numai pentru Supabase Silver-Throne-Test. Nu rula în LIVE.**

## Problema
Funcția server-side pentru boss acorda bonusul de contraclasă numai dacă eroul principal publicat în Lume avea clasa potrivită. Majoritatea eroilor sunt Campioni, astfel încât Vraciul, Arcașul și Paznicul activi în echipă nu contau, deși fuseseră publicați ca parte din apărarea Lumii.

## Corecția BETA
Migrarea 18 citește în funcția guild_api **unitățile salvate în public.world_players.units**, nu câmpul de clasă al eroului. Bonusul existent (+25%, plafonat la 18.000 daune) se aplică dacă formația validă de maximum trei luptători conține:
- un Vraci când bossul are contra de Vraci;
- un Arcaș când contra este Arcaș (forma internă a SQL este Arcas);
- un Paznic când contra este Paznic.

Formatul formației este verificat prin world_units_ok, iar expansiunea JSON este protejată pentru instantanee istorice invalide. Nu se acceptă clasa/formația din parametrii atacului bossului. Valoarea de bază și plafonul daunelor, două atacuri zilnice, viața bossului, premiile, contractele și permisiunile rămân nemodificate.

## Limitarea de securitate
Deși atacul bossului citește **numai instantaneul păstrat de server**, publicarea inițială a formației în Lume este încă originată din client. world_units_ok validează formatul și limitele, dar nu demonstrează criptografic că acel cont deține fiecare mercenar. Este o îmbunătățire de corectitudine a compoziției, **nu o soluție completă anti-cheat**. Pasul 33 rămâne obligatoriu înainte de extinderea competiției publice.

## Instalare
Fișierul supabase/18-beta-guild-boss-team-counter.sql se execută manual **după** migrarea 17. Nu este executat de GitHub și nu trebuie rulat în LIVE.

Pe un mediu de test autorizat, verifică un erou Campion alături de Vraci/Arcaș/Paznic, atacuri cu și fără contraclasă și alternarea săptămânală a bossului. Verifică că cele două atacuri zilnice și limitele de daune nu se schimbă. Testează și o formație invalida/absentă; bonusul nu trebuie acordat. Confirmă păstrarea obiectivelor săptămânale ale migrării 17, invitațiile/rangurile și RLS.

## Teste automate
- node dev/test-beta-guild-boss-team-counter.js
- node dev/test-beta-guild-weekly-contracts.js
- node dev/test-beta-guilds.js
- toate testele dev/test-*.js din GitHub Actions

Testele automate includ verificări de structură SQL, protecții și simulări pure; **nu execută SQL într-un Postgres autentificat**. Acesta este un punct separat de QA.

**Status:** codul BETA propus; pasul 26 nu se bifează până la test SQL și QA manual.
