# Silver Throne BETA — Pasul 16: identitatea tactică a Temnițelor

Data: 8 noiembrie 2026. Scope: **doar luptele cu monștri obișnuiți din Temnițele BETA**, fără o nouă buclă de explorare.

## Ce am modificat

Înaintea luptei, cardul de Temniță arată un singur text „Particularitatea acestei Temnițe”. Monștrii normali preiau o versiune *mult mai slabă* a temei căpitanului:

| Temniță / motiv | Mecanică BETA simplificată |
| --- | --- |
| Mina Cenușie / mobilizare | Un adversar primește +8% atac la prima tură |
| Peștera Lupilor / urlet | La a treia tură, atacul monstrului crește cu 8% |
| Catacombele Uitate / absorbție | Refacere limitată de 6% din viață la fiecare două ture |
| Fortul Părăsit / armură | Prima lovitură în monstru face 25% mai puține daune |
| Cetatea Scufundată / val | La fiecare trei ture, un val slab lovește echipa |
| Mlaștina Putredă / otravă | La fiecare trei ture, un singur luptător primește otravă pentru o tură |
| Abisul Cenușiu / umbră | La fiecare trei ture, următoarea lovitură e atenuată 30% |
| Forja Veche / jar | La fiecare trei ture, un singur luptător primește arsură pentru o tură |
| Tronul Cenușiu / renaștere | Un monstru revine o singură dată cu 12% viață |
| Cripta Furtunii / fulger | La fiecare trei ture, un fulger slab lovește un luptător |

Aceste mecanici pot fi înțelese anticipat și sunt descrise și în jurnalul luptei când se declanșează. Abilitățile căpitanilor rămân neschimbate.

## Garduri de siguranță
- Toate mecanicile sunt în `trepte.js`, active exclusiv când `ST_SERVER==='beta'`, pentru `d.raid==null` și lupte normale. **Nu afectează** LIVE, raiduri, PvP, Tron sau etajele Turnului.
- Nu adăugăm obiecte, resurse, costuri, cooldown-uri, puncte sau expediții.
- Simularea șanselor din `dOddsAt()` folosește `d.one=0` ca să nu acorde prada reală. Mecanica **nu mai este condiționată de `d.one`**, ca să fie inclusă și în simularea de victorie. Motorul real și simularea folosesc aceleași efecte.
- După un efect de zonă, dacă au căzut toți eroii, monstrul nu încearcă un atac normal împotriva unor ținte deja căzute.
- Efectele sunt locale fiecărei lupte (pe instanța inamicului); nu se reconfigurează progresul salvat sau dificultățile Normal / Greu / Coșmar.

## Teste
```sh
node dev/test-beta-dungeon-tactical-identities.js
node dev/test-beta-dungeon-difficulties-map-menu.js
node dev/test-beta-first-dungeon-clarity.js
node dev/test-beta-progression-milestones-captains.js
```
Suita GitHub Actions verifică automat toate `dev/test-*.js`.

## QA manual — încă necesar
1. Pe un cont **BETA de test**, parcurge două lupte în Mina Cenușie și vezi textul trăsăturii înainte de luptă și în jurnal.
2. Testează monștrii din Catacombe, Fort și Abis: efectele se aplică doar la atacul/intervalul declarat.
3. În Tronul Cenușiu, un monstru normal renaște numai o dată; căpitanul își păstrează abilitatea proprie.
4. Compară procentul estimat de câștig din temniță cu luptele reale și verifică că simularea nu salvează sau consumă puncte.
5. Verifică luptele din **Turn**, Lume și Tron: niciun adversar nu primește `tm` sau efect de Temniță.
6. Testează pe desktop și pe mobil; ecranul Temniței trebuie să rămână compact.

**Status:** codul și testele sunt propuse în BETA, fără validare vizuală autentificată. Pasul 16 rămâne nebifat până la QA.
