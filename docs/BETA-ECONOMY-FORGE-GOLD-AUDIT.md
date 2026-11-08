# Silver Throne BETA — Pasul 31: auditul economic al aurului în Fierărie

Data: 8 noiembrie 2026. **Model teoretic**, nu statistici observate din Supabase. Fără modificări suplimentare ale economiei.

## Ce s-a schimbat la pasul 29

În BETA, fiecare încercare de îmbunătățire consumă **aur + minereu + materiale**, indiferent de reușită. Aurul este taxat o singură dată per încercare. Pentru eroii noi BETA, șansa crește cu un punct procentual după eșec și există o încercare garantată la limita treptei; pentru eroii BETA vechi, probabilitatea rămâne fixă. În LIVE, aurul rămâne taxat doar la reușită.

Prețul nominal per încercare nu s-a schimbat:

`40 × nivelul obiectului × treapta dorită × (raritate + 1)`

## Costul așteptat pentru un obiect Epic, nivel 30

Aceasta este estimarea **doar pentru încercările pe treapta indicată**, presupunând pornirea cu zero eșecuri pe treapta respectivă. Nu reprezintă costul total al tuturor treptelor anterioare.

| Treapta | Șansa inițială | Aur pe încercare | Încercări medii (BETA nou) | Aur mediu BETA nou | Aur mediu BETA vechi | Aur mediu LIVE |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| +1 | 90% | 4.800 | 1,11 | ~5.300 | ~5.300 | 4.800 |
| +3 | 60% | 14.400 | 1,65 | ~23.700 | 24.000 | 14.400 |
| +5 | 30% | 24.000 | 3,12 | ~74.900 | 80.000 | 24.000 |
| +7 | 20% | 33.600 | 4,35 | ~146.300 | 168.000 | 33.600 |
| +8 | 15% | 38.400 | 5,35 | ~205.600 | 256.000 | 38.400 |
| +9 | 10% | 43.200 | 6,84 | ~295.600 | 432.000 | 43.200 |

La treapta +9, eroul BETA nou are o garanție la cel mult **26 de încercări**, ceea ce limitează costul brut al aurului pentru acea treaptă la **1.123.200 aur**. Aceasta este limita cazului cel mai nefavorabil, **nu** suma așteptată. Eroii BETA vechi, care încă folosesc șanse fixe, nu au această limită.

## Interpretare

- Cerința de consum al aurului la eșec este implementată și testată; economia din LIVE nu a fost schimbată.
- La niveluri înalte noua regulă este un consum semnificativ de aur. Acesta poate fi util contra inflației, dar poate crea un obstacol mare pentru jucătorii endgame care nu au protecția anti-ghinion.
- Nu este corect să considerăm această simulare drept dovadă că jocul are prea mult aur sau prea puține resurse. Pentru o ajustare de balans sunt necesare date reale: producția aurului pe nivel, utilizarea Fierăriei, raidurile NPC reușite, vânzările din Piață și Bazar, costurile de vindecare și tranzacțiile.
- Cooldownul NPC din BETA rămâne **o oră per sat**, cu verificare atomică pe server, iar un raid complet consumă în mod normal două puncte. Auditul economic existent acoperă premiul de bază al căpitanului NPC fără a pretinde că include toate dropurile.
- Nu schimbăm deocamdată costurile nominale, șansele, ratele dropurilor sau limitele raidurilor. Monitorizarea reală și QA mobil/desktop sunt necesare înainte de bifarea pasului 31.

## Verificări

```sh
node dev/test-beta-economy-forge-gold-audit.js
node dev/test-beta-forge-upgrade-pity.js
node dev/test-beta-economy-baseline.js
node dev/test-beta-npc-cooldown-1h.js
```

Suita completă `dev/test-*.js` rulează prin GitHub Actions. Testele sunt izolate și nu consumă aur real.

**Status:** model matematic și regresii; verificarea economiei pe date reale BETA rămâne deschisă.
