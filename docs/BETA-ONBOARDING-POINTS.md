# Silver Throne BETA — Pasul 05: puncte fără blocaj prematur
Data: 7 noiembrie 2026.

## Diagnostic
- Eroul nou pornește cu 30 de puncte în bară și o rezervă separată de 120 (`S.bp`).
- Mina Cenușie are trei monștri a câte 1 punct și un căpitan de 2 puncte; o incursiune reușită consumă **5 puncte**.
- Regenerarea obișnuită este 1 punct / 6 minute. La nivelurile 2–10 se acordă puncte suplimentare la creșterea în nivel.
- **Nu este justificată o oră gratuită**: rezerva existentă permite deja să termini începutul fără așteptare, cât timp luptele sunt câștigate și personajele nu rămân căzute.
- Un caz-limită: `sync()` transferă rezerva în bară din timerul periodic, iar `startD()` verifica uneori costul înainte de acel transfer; un jucător cu `S.pts=0` și `S.bp>0` putea primi pentru scurt timp mesajul „nu ai puncte”, deși avea rezervă.

## Modificare limitată
În **BETA**, doar pentru eroii cu ghidarea nouă (`jeFocus()`), `startD()` apelează `sync()` înainte de verificarea costului, dar numai dacă există rezervă și bara este sub plafon. Astfel se folosesc punctele **existente**; `sync()` mută suma din `S.bp` în `S.pts`, fără să genereze puncte sau să reseteze rezerva.

Nu schimbăm `fresh()`, `spend()`, `dCostAt()`, dropurile, progresul sau recompensele. Costul rămâne 1/2 puncte, regenul rămâne 6 minute. Nu atingem LIVE, eroii BETA vechi, Turnul sau PvP.

## Verificare
```sh
node dev/test-beta-onboarding-points.js
node dev/test-beta-new-player-first-captain.js
node dev/test-beta-first-dungeon-clarity.js
```

Testul nou verifică rezerva, costul real, lupta cu căpitanul, rezerva epuizată și lipsa efectului pe LIVE / BETA vechi.

### QA manual necesar înainte de bifare
1. Cu erou nou BETA, intră în Mina Cenușie, învinge 3 monștri și căpitanul; cost total 5 puncte, fără așteptare artificială.
2. Cu un cont de test și o stare controlată `S.pts=0, S.bp>0`, apasă „Luptă”; rezerva se folosește imediat.
3. Când `S.bp=0` și `S.pts=0`, nu poți lupta gratuit; vezi mesajul de regenerare.
4. Dacă eroul sau echipa au căzut, Infirmeria rămâne accesibilă; nu promitem că rezerva de puncte vindecă automat.
5. Reîncarcă pagina între lupte și verifică că rezerva nu se reface sau dublează.
6. Verifică pe mobil și desktop și repetă scenariile de bază pe un cont BETA vechi / LIVE.

**Status:** schimbare tehnică propusă în BETA; pasul 05 rămâne nebifat până la verificarea în joc. Nu necesită SQL.
