# Silver Throne BETA — Pasul 29: protecție la eșec și filtre în Fierărie

Data: 8 noiembrie 2026. Modificări pentru BETA; LIVE păstrează economia anterioară.

## Protecția împotriva ghinionului

Fiecare obiect are contor propriu de eșecuri, pentru fiecare treaptă. În BETA, doar eroii noi din tutorial primesc o creștere de **1 punct procentual** după fiecare eșec și o încercare garantată după limita etapei. Contorul nu se transferă între obiecte, nici între trepte.

| Îmbunătățire | Șansa inițială | Încercarea maximă, garantată |
|---|---:|---:|
| +1 | 90% | 5 |
| +2 | 75% | 7 |
| +3 | 60% | 9 |
| +4 | 45% | 11 |
| +5 | 30% | 13 |
| +6 | 25% | 16 |
| +7 | 20% | 19 |
| +8 | 15% | 22 |
| +9 | 10% | 26 |

Treptele +6–+9 rămân condiționate de Turn. Progresul pe obiect se salvează numai când se face încercarea, nu la simpla navigare. Reușita resetează contorul pentru treapta următoare. LIVE și eroii BETA vechi păstrează șansele fixe, până la o eventuală decizie explicită privind extinderea.

## Aurul se consumă și la eșec

Conform ultimei cerințe, **în BETA aurul, minereul și materialul se consumă la fiecare încercare**, indiferent de rezultat, inclusiv la încercarea garantată. Aurul nu mai este scăzut încă o dată la reușită. La resurse insuficiente nu se consumă nimic. Mesajele și descrierea Fierăriei au fost actualizate. Costurile nominale `upCost(it)` rămân neschimbate.

În LIVE, aurul continuă să se consume numai la reușită până la validarea economică și lansarea în producție. Această regulă economică nouă se aplică **tuturor eroilor BETA**, nu numai eroilor noi. Protecția anti-ghinion rămâne doar pentru eroii noi BETA.

## Filtre instantanee în Fierărie

Se pot filtra obiectele după:
- căutare în numele obiectului sau al personajului;
- raritate: toate, Rare, Epice, Legendare;
- locație: echipate, Rucsac;
- treaptă: neîmbunătățite, în progres, la maxim.

Filtrele nu declanșează rerender la fiecare literă și păstrează focusul inputului. Starea lor rămâne activă după o încercare, până la reîncărcarea paginii. Obiectele sunt doar ascunse vizual: indicii reali `S.inv` și referințele echipamentului nu sunt reordonate. Obiectele deja echipate, inclusiv legendare, pot fi identificate. LIVE nu afișează filtrele noi.

## Teste și QA

Rulează `node dev/test-beta-forge-upgrade-pity.js` și suita `dev/test-*.js` din GitHub Actions. Testul verifică încercarea garantată, fiecare plată de aur/minereu/materiale, independența contoarelor, filtrele și compatibilitatea LIVE.

În browser BETA, verifică pe mobil/desktop că poți căuta nume de arme și personaje, combina filtrele și îmbunătăți exact obiectul selectat. Verifică aurul înainte/după succes și eșec, inclusiv cazul cu resurse insuficiente. Testează refresh-ul și trecerea +8 → +9. Nu folosi conturi LIVE pentru aceste probe.

**Fără SQL.** Pasul 29 rămâne în QA până la testarea vizuală și confirmarea economiei în BETA.
