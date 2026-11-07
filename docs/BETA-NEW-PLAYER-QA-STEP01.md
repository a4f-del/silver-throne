# Silver Throne BETA — Pas 01: auditul primelor 10–15 minute

Data: 7 noiembrie 2026
Status: **audit de cod și test logic finalizate; testul manual cu cont BETA nou este încă necesar**.

## Scop și siguranță

Primul obiectiv trebuie să fie simplu de urmat pentru o persoană care nu a jucat niciodată:
crearea eroului → prolog → întâlnirea cu Paznicul → Mina Cenușie → căpitan → recompensă → Arcaș / prima forjare → prima armă echipată.

Nu se resetează conturi BETA sau LIVE existente. Noile scene sunt declanșate doar pentru **eroii creați noi pe BETA**, cu `S.journeyV=1` și `S.journeyUxV=2`. Testele logice nu pot valida durata percepută, accesibilitatea, șansele de înfrângere în lupta reală sau eventuale probleme vizuale din browser.

## Constatare reparată acum

**P01 — obiectiv inițial contradictoriu.** Primul pas spunea „Poți ieși înainte de căpitan”, dar verifica `C('l')>=1`, iar codul `leave()` acordă `cn('l')` într-o Temniță cu lupte separate numai după căpitan. Retragerea voluntară din ecranul dedicat nu acordă acest contor. În consecință, un începător putea respecta instrucțiunea și totuși să rămână blocat.

**Corecție BETA:** primul pas cere explicit învingerea căpitanului din Mina Cenușie, cu indicatorul real `C('bs')>=1`. Textul explică faptul că retragerea timpurie păstrează progresul din temniță, dar nu finalizează jurământul. Recompensa de 50 aur / 15 minereu și regulile de luptă nu se schimbă.

**Test:** `node dev/test-beta-new-player-first-captain.js` acoperă obiectivul, retragerea timpurie, victoria căpitanului, revendicarea o singură dată, pasul următor, încărcarea salvării, izolarea BETA/LIVE și obiectivele existente.

## Matrice de test manual — de verificat pe cont BETA de test nou

| Pas | Acțiune | Ce trebuie să fie vizibil/funcțional | Status |
| --- | --- | --- | --- |
| 1 | Creează un cont BETA de test admis și primul erou | Nume și portret; niciun progres LIVE importat | Nevalidat în browser |
| 2 | Parcurge sau sari prologul | Prolog o singură dată, apoi scena Paznicului | Nevalidat în browser |
| 3 | Primește și numește Paznicul | Primul card Drumul Eroului; acțiunea principală devine Coborâre | Nevalidat în browser |
| 4 | Intră în Mina Cenușie | Meniurile Satului dispar; progresul și portretele monștrilor sunt clare | Nevalidat în browser |
| 5 | Învinge 1–3 monștri sau retrage-te | Progresul din mină se păstrează; jurământul încă nu se poate revendica | Nevalidat în browser |
| 6 | Învinge Căpitanul Cenușii | Ieșire automată, pradă aplicată o singură dată, primul jurământ complet | Nevalidat în browser |
| 7 | Revino în Sat, revendică primul jurământ | +50 aur, +15 minereu o singură dată; Arcașul este oferit în Sat | Nevalidat în browser |
| 8 | Recrutează Arcașul și forjează | Funcționează Topitoria fără meniuri de care nu ai nevoie | Nevalidat în browser |
| 9 | Ridică și echipează o armă | Inventarul arată obiectul și progresul „Oțel pentru cei rămași” | Nevalidat în browser |
| 10 | Reîncarcă pagina în momentele 3, 5, 7, 9 | Progresul salvat nu se pierde și premiile nu se dublează | Nevalidat în browser |
| 11 | Repetă pașii esențiali pe telefon | Dialoguri, obiective și butoane rămân vizibile fără scroll greu | Nevalidat în browser |
| 12 | Intră cu un cont BETA vechi / în LIVE | Tutorialul nou nu migrează și nu modifică eroii existenți | Nevalidat în browser |

### Întrebări de observație pentru tester
- Care este primul buton pe care ai vrea să îl apeși și de ce?
- Înțelegi ce este o temniță și când s-a terminat?
- Ai înțeles de ce un obiect este mai bun și unde se echipează?
- Ce ai face după prima armă, fără instrucțiuni externe?
- Unde ai fost blocat sau ai deschis un meniu în plus?
- Cât timp real a trecut până la primul căpitan și prima armă?

## Confirmări din cod

- Prologul și Drumul Eroului au gardă exclusiv BETA și sunt activabile pentru eroii noi.
- Paznicul este oferit înaintea Minei, Arcașul după prima coborâre încheiată cu căpitan.
- Mina Cenușie este accesibilă la nivelul 1; prima secvență are 3 monștri și 1 căpitan, cu costuri de puncte mici față de rezerva inițială (1+1+1+2 puncte, fără a calcula înfrângeri repetate).
- Căpitanul învins produce `cn('bs')`; noul mod de Temniță revine automat și păstrează prada.
- Progresul Drumul Eroului este idempotent (`S.je.done`); opt-in doar BETA.
- Nu avem încă măsurarea efectivă a duratei primelor 10–15 minute sau testul real în browser.

## Condiții pentru bifarea pasului 01

Nu bifăm pasul 01 în roadmap până când matricea de mai sus nu este verificată în joc și ne sunt cunoscute blocajele vizuale, dificultatea căpitanului și durata reală. **Următorul pas rămâne 02 — un singur obiectiv vizibil — numai după validarea acestui parcurs.**

## Comenzi locale

```sh
node dev/test-beta-new-player-first-captain.js
node dev/test-beta-prologue.js
node dev/test-beta-mercenary-story.js
node dev/test-beta-onboarding-focus.js
node dev/test-beta-adventure-mode.js
```
