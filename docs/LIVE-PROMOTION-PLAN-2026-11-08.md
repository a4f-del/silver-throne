# Silver Throne — Plan de promovare BETA → LIVE (8 noiembrie 2026)

**Status: evaluare pregatitoare. NU s-a executat nicio migrare SQL pe LIVE, nu s-a sters niciun cont si nu s-a facut o activare globala a functionalitatilor BETA.**

## Constatarea principala

Cele doua medii folosesc aceleasi fisiere din GitHub Pages, dar proiecte Supabase, sesiuni si salvari separate. Modificarile de frontend deja prezente in `main` pot aparea in LIVE doar acolo unde nu sunt conditionate de `ST_SERVER === 'beta'`. Functionalitatile BETA cu date server-side nu sunt activate prin simpla publicare a JS.

Codul actual contine inca reguli care restrictioneaza BETA la admini:
- `cont.js` verifica `is_beta_admin()` si dezactiveaza inscrierile in BETA.
- `bresle.js` (`guildEnabled`), `world-mail.js` (`wmBeta`) si `world-friends.js` (`wfEnabled`) sunt limitate explicit la BETA.
- `tron.js` activeaza duelul 1v1 folosind `tronIsBetaDuel()`.
- SQL21 inlocuieste trei RPC-uri care verifica `public.is_beta_admin()`. Daca este copiat nemodificat in LIVE, poate refuza jucatorii publici.
- `game_saves.game_data` este inca scris direct de browser; statisticile echipei si rezultatele PvP/Tron sunt raportate de client. SQL21–23 sunt doar limite/audit, nu motor anti-cheat autoritativ.
- Migrarea SQL02/04/06 reluata dupa SQL21 ar putea suprascrie versiunile mai noi de RPC.

## Lotul A — candidati siguri de promovare

Modificari de interfata fara tabele noi si fara schimbarea regulilor de recompense: incadrarea profilului jucatorului din Lume, responsive, inchiderea Breslelor pe backdrop/Escape, mesaje clare si alte imbunatatiri UI care au teste si confirmare manuala. Unele exista deja in frontendul comun; verificarea efectiva pe LIVE trebuie facuta pe site, fara mutare de date.

La LIVE, fereastra Breslelor ramane ascunsa pana cand functia este promovata complet; faptul ca s-a corectat un dialog nu obliga activarea modulului.

## Lotul B — necesita migrare de productie, NU copiere directa a SQL BETA

Bresle: schema si RPC din SQL14–20 necesita o migrare de productie dedicata, RLS, permisiuni si eliminarea *doar* a portii beta_admin, pastrand autentificarea, limitele, drepturile pe ranguri, deduplicarea si protejarea recompenselor. Socialul (prieteni, invitatii, mesaje) trebuie verificat pentru abuz, permisiuni si confidentialitate.

Tron 1v1: SQL06 trebuie adaptat cu un plan de conversie al apararilor existente, verificat pe o clona de schema, si testat cu conturi reale de QA. Nu suprascrie SQL21/22 la intamplare.

Lume si clasamente: dupa ce sursa server-side a unitatilor si rezultatelor poate fi validata, se creeaza RPC-uri sigure pentru LIVE. In acest moment browserul poate declara castigarea luptei; verificarea de putere si auditul nu o impiedica.

Economia, echipamentul, progresia si botul Premium: pasii BETA inca nebifati in roadmap se promoveaza individual numai dupa QA economic, persistenta si testare multi-device. Nu se combina toate regulile diferite intr-un singur deploy.

## Lotul C — NU se promoveaza drept anti-cheat complet

SQL21: audit si plafonare limitata, cu restrictii `is_beta_admin()`.
SQL22: snapshot PvP si estimare orientativa, fara verdict autoritativ.
SQL23: audit pasiv al salvarilor, fara verificarea posesiei obiectelor.
Toate necesita o evaluare separata a accesului si a cerintelor de productie. Niciunul nu trebuie copiat direct pe LIVE.

## Checklist pentru lansarea unui lot

1. Export privat/backup consistent al datelor LIVE si configuratiei Auth; verificare restaurare intr-o baza izolata. Nu publica backupuri, user IDs sau secrete in GitHub.
2. Rularea `supabase/CHECK-live-promotion-readiness.sql` **read-only** in LIVE, pentru inventarul obiectelor si RLS. Rezultatul `false` poate fi normal; niciun rezultat singular nu demonstreaza readiness.
3. Construieste migrari LIVE noi, tranzactionale si idempotente pentru *lotul selectat*, cu verificari de preconditii si rollback documentat. Nu rula in ordine oarba SQL02–23 si **nu executa SQL07 sau SQL21 direct in LIVE**.
4. Test in clona anonimizata / staging pentru proceduri, RLS si accesul unui jucator non-admin. Testeaza simultan mai multe sesiuni, reconnect, duplicate rewards si failover la salvare.
5. Activeaza explicit fiecare functie pentru LIVE prin feature flags independente de `ST_SERVER`, doar dupa instalarea RPC-urilor si verificarea drepturilor. Pastreaza posibilitatea de dezactivare a functiei fara a sterge date.
6. Canary initial pentru conturi de QA LIVE (fara acces la alte conturi), apoi deschidere graduala. Urmareste erorile RPC si datele economiei fara a colecta secretul utilizatorilor.
7. Raspuns la incidente: dezactiveaza flagul client si revoca RPC-ul expus vulnerabil; foloseste backup restaurat doar cu plan si comunicare. Nu rula migrarile vechi peste functiile noi.
8. Confirma functional UI desktop/mobil, tutorial, Temnite, Turn, Lume, raiduri, Tron, Bresle, atelier si salvare/relogare.

## De ce NU stergem conturile sau progresul

Nu exista o cerinta tehnica demonstrata de resetare. Stergerea progresului LIVE ar fi ireversibila fara backup si nu rezolva faptul ca rezultatul luptei este declarat de browser. O conversie bine definita a schemei este preferabila unui reset, chiar daca operatorul accepta resetarea.

**Criteriu de lansare competitiva publica:** persistenta autoritativa a resurselor/personajelor + rezultate de lupta calculate/verificate server-side + QA real RLS/rate-limit/bonusuri. Pana atunci se poate publica doar partea UI non-competitiva sau functionalitatea marcata explicit experimentala si separata.
