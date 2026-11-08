# Silver Throne BETA — Pasul 23: PvP lizibil și adversari potriviți

Data: 8 noiembrie 2026.

## Schimbări
În Lume, noua secțiune **„Adversari potriviți”** arată până la trei sate de jucători care sunt efectiv atacabile acum, ordonate după apropierea de puterea echipei publicate în Lume. Nu introducem un „matchmaking” server-side și nu rezervăm adversarii. Jucătorul alege dacă îi examinează, apoi poate folosi atacul normal.

Eticheta de comparație este doar **orientativă**:
- „Mai slab decât tine” când puterea adversarului este cel mult 80% din puterea ta;
- „Putere apropiată de a ta” între pragurile de 80% și 125%;
- „Mai puternic decât tine” de la 125%;
- „Putere necunoscută” dacă un instantaneu nu are putere validă.

Procentul de victorie **nu** este estimat sau promis. Componența, abilitățile, viața și ceilalți factori contează.

## Corectarea comparației
În BETA, panoul satului selectat compara anterior puterea publicată a apărătorului (până la trei luptători) cu `tronUnits()` — **doar eroul atacatorului**, deoarece Tronul este duel 1 contra 1. Comparația afișată putea fi înșelătoare. Folosim acum `TT.power(tronTeamUnits())`, exact ca `lwSnap().power`, adică maximum trei membri ai fantomei Lumii.

Regulile sunt explicate distinct:
- **Lumea:** fantoma publicată a echipei, maximum trei luptători.
- **Tronul BETA:** duel numai cu eroul principal.
- LIVE păstrează interfața anterioară.

## Protecții
Lista se obține cu **`lwCan(p)` existent**, deci păstrează:
- nivelul minim al atacatorului și imunitatea jucătorilor începători;
- cooldown-ul pentru același adversar;
- bara de atacuri și regenerarea ei;
- interdicția în mijlocul altei lupte sau la rezultat netrimis;
- luptătorii căzuți.

Funcția server-side `world_raid_start` rămâne autoritatea finală și poate refuza un atac dacă starea s-a schimbat. Nu schimbăm ratele, nivelurile, plafonul echipei, recompensele sau rezultatul luptei. Funcția listează doar adversarii momentan atacabili din instantaneul cunoscut; nu garantează că nu au fost atacați între timp.

## Verificare automată
```sh
node dev/test-beta-pvp-matchmaking-readable.js
node dev/test-beta-guild-ranks-invites.js
```
Suita GitHub Actions rulează toate testele JavaScript. Verifică suplimentar: izolare LIVE, folosirea puterii de trei luptători, compararea saturilor de puteri apropiate, ordonarea, excluderea jucătorilor protejați și în cooldown, lipsa atacurilor și codificarea sigură a ID-ului din linkurile afișate.

## QA manual necesar
1. Intră cu un cont de test BETA nivel minimum 5, care are erou și doi mercenari, și verifică dacă puterea „a ta” este cea a fantomei Lumii, nu doar a eroului.
2. Verifică secțiunea cu trei adversari și selecția pe hartă. Nu porni atacuri reale cu un cont de producție.
3. Verifică un jucător sub nivelul minim și unul în cooldown: nu apar în recomandări și nu pot fi atacați.
4. Consumă bara de atacuri doar într-un mediu de test: secțiunea arată motivul absenței adversarilor, iar serverul refuză un atac nou.
5. În Tron, confirmă că BETA continuă cu duelul eroului, fără mercenari.
6. Pe un cont LIVE și unul BETA vechi, verifică regulile existente. Verifică afișarea pe mobil și desktop.

**Status:** PR BETA și test automat; nu bifa pasul 23 fără QA vizual și verificarea autentificată. Fără SQL.
