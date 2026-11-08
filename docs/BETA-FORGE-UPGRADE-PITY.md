# Silver Throne BETA — Pasul 29: protecție la ghinion în Fierărie

Data: 8 noiembrie 2026. Modificarea privește **Fierăria** (îmbunătățirile de obiecte), nu Topitoria (crearea de obiecte). Se aplică numai eroilor BETA cu `jeFocus()` activ; LIVE și salvările BETA vechi păstrează șansele și fluxul anterior.

## Situația anterioară
Șansele de îmbunătățire sunt `90%, 75%, 60%, 45%, 30%, 25%, 20%, 15%, 10%` pentru +1…+9. Eșecul consumă minereu și materialul special, dar nu aur. Nu exista un număr maxim de încercări la Fierărie. Topitoria are deja o protecție separată după eșecuri repetate, care nu se modifică.

## Regula nouă — pentru fiecare obiect și fiecare treaptă
După fiecare eșec, șansa următoarei încercări crește cu **un punct procentual**. Există un plafon garantat de încercări pentru fiecare treaptă, la care șansa ajunge la 100%. Numărătoarea este salvată **în obiectul respectiv** (`upFails`, `upStep`) și este resetată la reușită; nu se transferă la alt obiect și nici la treapta următoare.

| Îmbunătățire | Șansă de pornire | Încercarea garantată | Încercări medii înainte | Încercări medii după |
|---|---:|---:|---:|---:|
| +1 | 90% | 5 | 1,11 | 1,11 |
| +2 | 75% | 7 | 1,33 | 1,33 |
| +3 | 60% | 9 | 1,67 | 1,65 |
| +4 | 45% | 11 | 2,22 | 2,17 |
| +5 | 30% | 13 | 3,33 | 3,12 |
| +6 | 25% | 16 | 4,00 | 3,64 |
| +7 | 20% | 19 | 5,00 | 4,35 |
| +8 | 15% | 22 | 6,67 | 5,35 |
| +9 | 10% | 26 | 10,00 | 6,84 |

*Valorile medii sunt calculate exact din distribuția Bernoulli a șanselor progresive și garanției, nu din anecdote sau estimări vizuale. Valoarea efectivă pentru un jucător variază.*

## Economia este păstrată
- Aurul se cheltuie **o singură dată, la succes**.
- Minereul și materialul special se consumă **la fiecare încercare**, inclusiv la încercarea garantată.
- Formula costului și creșterea statisticilor (+8% pe treaptă) sunt neschimbate.
- Garanția limitează coada de ghinion, dar nu produce obiecte gratuite. Pentru +9, numărul mediu al încercărilor scade aproximativ cu 31,6%, ceea ce trebuie monitorizat în BETA înainte de LIVE.

## Interfață
Fiecare obiect eligibil arată șansa exactă *a următoarei încercări* și progresul de forma `5/26 încercări (ultima garantată)`. Mesajul după eșec arată șansa următoare. Se explică explicit că resursele se consumă și în continuare.

## Verificare automată
```sh
node dev/test-beta-forge-upgrade-pity.js
```
În plus, GitHub Actions rulează toate testele `dev/test-*.js`. Testul folosește un generator determinist care forțează 25 eșecuri pe +9 și verifică reușita la încercarea 26, separat pe două obiecte, precum și costurile exacte și izolarea LIVE/BETA vechi.

## QA manual obligatoriu
1. Cu erou nou BETA de nivel ≥15 și materiale suficiente, îmbunătățește un obiect și verifică șansa/progresul după eșec.
2. Încearcă pe două obiecte diferite: eșecurile unuia nu trebuie să afecteze celălalt.
3. Reîncarcă jocul după eșec și verifică persistența numărătorii, atât pentru obiectele echipate, cât și pentru cele din rucsac.
4. La reușită, verifică resetarea pentru treapta următoare și +8% statistică/treaptă.
5. Verifică costurile efective pe eșec și pe reușită; fără minereu/materiale nu se poate încerca, nici dacă următoarea încercare este garantată.
6. Pe LIVE și cont BETA vechi, șansele rămân neschimbate.
7. Testează afișarea pe mobil și desktop.

**Status:** implementare propusă în BETA și test automat; pasul nu este bifat înainte de QA vizual și monitorizarea resurselor. Nu necesită SQL.
