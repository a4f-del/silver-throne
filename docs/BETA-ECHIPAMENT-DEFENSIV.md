# Bonus defensiv experimental pe echipamente — doar BETA

## De ce
La nivel 50, două conturi cu echipament echivalent au arătat dueluri la Tron prea scurte. După fixul PR #16 (limitare per lovitură și inițiativă), testăm și creșterea supraviețuirii prin obiecte.

## Reguli BETA propuse
| Obiect | Viață din obiect | Apărare din obiect |
| --- | --- | --- |
| Armură | +35% | +20% |
| Coif | +35% | +20% |
| Cizme | +35% | +20% |
| Bijuterie | +35% | +20% dacă obiectul are apărare |
| Arme și relicve | Neschimbate | Neschimbate |

De exemplu, o armură de +100 viață / +50 apărare afișează și oferă în BETA **+135 viață / +60 apărare**. Bonusul nu se acumulează repetat la refresh. Se aplică și obiectelor deja obținute; nu trebuie forjate din nou.

## Implementare
`echipament-balance.js` returnează statistici efective pentru afișare, luptă și evaluarea echipării automate. **Nu rescrie** `it.s` în salvare și nu schimbă SQL-ul Supabase. Pe LIVE, se folosesc exact valorile actuale ale obiectelor.

## Testare manuală
1. Integrează PR-ul și reîncarcă `https://a4f-del.github.io/silver-throne/?server=beta` (Ctrl+Shift+R).
2. Verifică același item în Echipă/Inventar: viața și apărarea afişate sunt mai mari.
3. Vindecă complet eroul după actualizarea maximului de viață.
4. **Re-publică apărarea** la Tron cu **Actualizează apărarea**, apoi testează cu două conturi de nivel 50 și echipament identic. Regele poate avea protecție; folosește instrumentul de resetare doar în BETA.
5. Urmărește de câte lovituri este nevoie pentru victorie și dacă ambele conturi pot câștiga.
6. Compară în LIVE: itemele și luptele trebuie să fie neschimbate.

## Limitări
E o calibrare inițială, nu o promisiune de 50/50. Viața maximă crește, dar viața curentă nu se reface automat: e nevoie de Infirmerie. Rezultatul PvP rămâne calculat în browser; validarea anti-trișat server-side este o problemă separată.
