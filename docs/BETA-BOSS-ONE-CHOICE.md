# Silver Throne BETA — Pasul 17: o alegere semnificativă înainte de căpitan

Data: 8 noiembrie 2026. Fără un sistem nou de explorare; o singură decizie **opțională** când ajungi la poarta căpitanului în Temnițe.

## Reguli și trade-off
Pe cardul mare din Temnița BETA se afișează patru variante, toate explicit explicate:

| Alegere | Modificare la căpitan | Recompensă după victorie |
| --- | --- | --- |
| Normal (implicit) | Niciuna | Identică |
| Scut | −12% atacul căpitanului | −10% aur și minereu din lupta cu căpitanul |
| Asalt | +8% daunele date căpitanului; +8% atacul lui | Identică |
| Risc | +15% atacul căpitanului | +15% aur și minereu din lupta cu căpitanul |

Nu există o nouă monedă, un nou cost de intrare, recompensă Epic în plus sau un selector după fiecare monstru. În rest, șansele, efectele bossului și sistemele de luptă se calculează normal. Compromisul ales apare și în jurnalul luptei.

## Implementare sigură
- Opțiunile apar **numai** când `S.adventure.di===i`, `S.d===null` și progresul (`S.dp[dk]`) indică ultimul monstru/căpitan. Nu pot fi schimbate în timpul luptei.
- Postura se salvează ca `S.trPlan[dk]`, unde `dk` are indexul Temniței și al dificultății (`i_tier`). Normal înseamnă lipsa valorii.
- `dMk()` o atașează luptei de căpitan. Simularea `dOddsAt()` o vede și folosește un cache separat pentru fiecare postură; nu este nevoie să simulezi o dată după alegerea Scut și să primești șansele vechi după Risc.
- Bonusul/penalizarea de resurse se aplică strict în `trWin()` la **victoria reală** asupra căpitanului (`d.one===1`, `raid==null`, `ev==0`, `!tw`). Se aplică aurului și minereului deja câștigate la acel căpitan, nu experienței, itemelor, fragmentelor ori materialelor.
- După victoria reală postura este ștearsă; o simulare (`d.one=0`) nu plătește nimic și nu șterge alegerea.
- La retragere/pierdere nu există recompensă suplimentară. Opțiunea rămâne schimbabilă pentru încercarea viitoare.
- Evenimentul săptămânal cu chei, Turnul, raidurile, Tronul și LIVE nu folosesc postura. Dificultățile Normal/Greu/Coșmar și progresul lor rămân separate și nemodificate.

## Teste
```sh
node dev/test-beta-boss-one-choice.js
node dev/test-beta-dungeon-tactical-identities.js
node dev/test-beta-dungeon-difficulties-map-menu.js
node dev/test-beta-first-dungeon-clarity.js
```

## QA manual necesar înainte de bifare
1. Într-un cont BETA de test, învinge primii trei monștri din Mina Cenușie. Înaintea căpitanului apar patru alegeri; nu apar la monștrii anteriori.
2. Alege Scut, verifică reducerea atacului, șansa recalculată și scăderea de aur/minereu **doar după victoria reală**.
3. Reia progresul, alege Risc: atacul căpitanului e mai mare; aur/minereu primesc doar bonusul procentual specific.
4. Alege Asalt și verifică daunele efective (nu doar eticheta din UI).
5. Reîncarcă pagina după selecție, înainte de luptă. Alegerea rămâne și procentul afișat este consistent.
6. Verifică scăderea și pierderea unei lupte: nu se poate obține bonus fără victorie.
7. Într-o Temniță care permite Greu/Coșmar, selectează o altă dificultate; postura nu este transferată între `0_0` și `0_1`.
8. Verifică ecranul compact pe mobil și păstrează unicul buton principal de Luptă.
9. LIVE și BETA din afara Temnițelor nu au butoane sau recompense suplimentare.

**Status:** implementare BETA tehnică; pasul 17 rămâne nebifat până la QA autenticat mobil/desktop. Nu necesită SQL.
