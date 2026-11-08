# Silver Throne BETA — Pasul 33: auditul încrederii competiției (etapa 1)

Data: 8 noiembrie 2026. **Consolidare parțială; nu reprezintă anti-cheat complet.** Migrare manuală **numai** pentru Supabase Silver-Throne-Test.

## Probleme demonstrate

Codul inițial permite clientului să declare:
1. Puterea publicată în `world_join(p)`, fără corelare cu unitățile trimise. Aceasta poate falsifica comparațiile și clasamentul de putere.
2. Victoria, aurul și experiența din `world_raid_finish(p_id,p_win,p_gold,p_xp)`. Serverul verifică identitatea, existența raidului și consumul de energie la start, dar **nu reface lupta** și accepta până la 10 milioane în raport.
3. Statistici pentru fantoma Tronului până la maximul tehnic int32, dar nu dovada echipamentului sau a nivelului real. `throne_challenge_finish` continuă să primească rezultatul din browser.
4. `game_saves.game_data` este încă salvat direct de browser. Fără o sursă autoritativă pentru experiență/echipament și un simulator de luptă pe server, nicio verificare a formei JSON nu poate demonstra că personajul deține statisticile declarate.

## Migrare nouă SQL 21: măsuri conservative

`supabase/21-beta-world-competitive-hardening.sql` adaugă două tabele private de audit, accesibile numai din RPC-uri cu drepturi controlate (RLS activ, drepturi directe revocate).

### Lume: putere derivată
Serverul verifică `world_units_ok`, apoi calculează singur `power` cu formula existentă:

`sum(hp + 6 × atk + 10 × def)`

Câmpul `p.power` nu mai poate modifica direct puterea afișată. Diferențele dintre puterea declarată și cea calculată sunt numărate în `beta_world_publish_audit`. Acest lucru asigură **consecvența** raportului, dar nu verifică încă posesia unităților sau caracteristicile acestora.

### Lume: premii raportate
În `world_raid_finish`, serverul nu mai acceptă arbitrar valori de milioane pentru `gold` și `xp` în jurnalul raidurilor. Limitele sunt largi, calculate din nivelurile publicate ale atacatorului/apărătorului, astfel încât să nu excludă lootul normal sau bonusurile:

`gold_max = ceil((60+30×min(defLevel,attLevel+5))×factor×6+500)`

`xp_max = ceil((20+8×min(defLevel,attLevel+5))×factor×1.5×4+200)`

`factor = clamp(defLevel / attLevel, 0.3, 1.2)`

Se înregistrează atât valorile revendicate, cât și cele acceptate, în `beta_world_result_audit`. **Limitele nu verifică victoria** și nici modificările deja făcute de client în salvarea personală. Câmpul `reported_win` din audit reflectă numai declarația browserului.

### Tron
`throne_publish` păstrează duelul BETA cu un singur erou și îngustează maximul tehnic pentru `hp`, `atk`, `def` la 1.000.000 fiecare, în loc de ~2,1 miliarde. Nu se schimbă daunele, inițiativa, bonusurile sau formula duelului. Limita tehnică **nu** echivalează cu verificarea statisticilor reale.

Toate cele trei RPC-uri refuză accesul în afara listei `beta_admins`.

## Ce NU este rezolvat — obligatoriu înainte de extinderea competiției

- **Sursa server-side a progresului:** nivel/exp, obiecte, upgrade-uri, mercenari și echipament trebuie salvate/validate prin tranzacții autoritative, nu doar din `game_saves` controlabil de client.
- **Rezultatul luptei:** serverul trebuie să genereze sau să reproducă o luptă cu seed, intrări și reguli validate. Până atunci, `world_raid_finish` și `throne_challenge_finish` acceptă `p_win` din browser. Nu le prezenta drept rezultate verificate.
- **Bresle:** `guild_api` citește `world_players.units` și puterea derivată, dar unitățile au fost inițial declarate de client; bonusurile sunt structural validate, nu dovada proprietății.
- **Rate limiting și monitorizare reală:** verificare a comportamentului anormal pe date de test înainte de a modifica pragurile sau a sancționa utilizatori.

## Instalare BETA (operator autorizat)

1. Confirmă proiectul **Silver-Throne-Test**, fă backup și verifică instalarea SQL 02, 04, 06, 07 și migrările BETA 14–20 relevante. SQL21 nu este inclus automat în GitHub Pages.
2. Execută manual doar `supabase/21-beta-world-competitive-hardening.sql`. Nu rula în LIVE.
3. La final, verificarea read-only trebuie să întoarcă patru valori `true`. Nu repeta SQL02/04/06 după SQL21: ar restaura funcțiile vulnerabile vechi.
4. Testează pe conturi **BETA**: publicarea unei echipe reale, comparația puterii, raid pornit și terminat, duel 1v1, cooldown și limite, taburile Bresle/Tron/Clasament. Verifică tabelele de audit prin SQL Editor, nu din browser.
5. Verifică două raportări pentru același raid: jurnalul nu trebuie să dubleze intrarea. Simulează valori prea mari doar într-un mediu de test izolat, niciodată cu date LIVE.
6. Verifică accesul neautorizat și politica RLS pe tabelele audit. Verifică explicit că un rezultat declarat `p_win=true` **nu** este considerat dovadă server-side.

## Teste automate

```sh
node dev/test-beta-competition-trust-guards.js
node dev/test-beta-pvp-throne-clarity.js
node dev/test-beta-guild-boss-formation-roles.js
```

GitHub Actions rulează toate testele `dev/test-*.js`. Sunt verificări statice și modele matematice; **nu execută migrarea într-un PostgreSQL real și nu testează lupta autoritativă**.

**Status:** etapă 1 parțială. Pasul 33 rămâne nebifat până la implementarea sursei autoritative și a rezultatelor de luptă verificate pe server.
