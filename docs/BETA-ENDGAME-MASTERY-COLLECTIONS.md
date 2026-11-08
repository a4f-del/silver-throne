# Silver Throne BETA — Pașii 21–22: măiestrie orizontală și colecții endgame

Data: 8 noiembrie 2026. Pentru eroi BETA de nivel 50. Plafonul de nivel rămâne **50**.

## Pasul 21 — Măiestrie fără putere permanentă
În **Echipă → Compoziție și presetări**, eroii de nivel 50 văd patru obiective de prestigiu:
- **Umbra Temnițelor:** trei căpitani diferiți învinși cu eroul **singur în echipa activă** (nu doar ultimul luptător în viață).
- **Vânător de Căpitani:** patru căpitani de Temniță diferiți învinși la nivelul 50.
- **Maestrul Tovarășilor:** patru clase distincte folosite vii în echipa activă la victorii asupra căpitanilor.
- **Străjerul Înalt:** record de minimum etajul 80 în Turn (folosește recordul existent, nu resetează progresul anterior).

Când un obiectiv este atins, jucătorul poate alege un **titlu cosmetic**. Titlul apare în profilul eroului, cu o ramă decorativă; poate fi ascuns. Nu schimbă atac, viață, apărare, critic, șanse, loot, clasament sau statistici PvP. Jucătorul poate schimba titlul din Echipă, dar nu în luptă / aventură.

Numărătoarea de căpitani folosește **numai victorii reale** cu `d.one===1`, `d.raid==null`, `!d.tw`, `!d.ev`, după ce eroul a atins nivelul 50. Este memorată ca `S.eg.bosses`, `S.eg.solo`, `S.eg.classes`, fără un event store nou. O victorie nu este numărată de două ori pe același `d`; în simularea cotelor `d.one=0` se ignoră.

## Pasul 22 — Colecții cu obiectele deja existente
Trei grupuri vizuale din cele 10 legendare ale Turnului:
- **Ecourile Adâncurilor:** Amuleta Mareelor / Pașii Furtunii / Coiful Ochilor Violeți;
- **Arsenalul Turnului:** Platoșa de Fum / Arcul de Smarald / Toiagul de Ametist;
- **Coroana Cenușii:** Crucea Izvorului / Ciocanul Tunetului / Lama Zorilor / Scutul Regelui.

Colecția citește legenda `LG` și `TW_LG` din joc și **doar** obiectele deținute acum, fie în `S.inv`, fie echipate pe erou/mercenari (`f.eq`). Un legendar care a fost câștigat dar nu se mai află în inventar sau pe nimeni apare explicit drept **„obținut cândva”**, nu „deținut”. Elementele inexistente apar „lipsește”.

Nu creăm seturi cu bonusuri de statistică, clase noi de item, material nou sau monedă de colecție. Totul este UI de progres și personalizare.

## Compatibilitate și siguranță
- Exclusiv BETA și nivel 50 pentru panou, obiective și titluri.
- Un erou existent de nivel 50 poate vedea colecția obiectelor deja deținute și recordul existent; realizările bazate pe lupte încep de la aceste modificări, fără a inventa retroactiv victorii.
- Nu se modifică nicio salvare LIVE; nu este necesară migrare SQL.
- Datele `S.eg` sunt citite cu validare pe clase cunoscute și indici de Temniță existenți; valorile arbitrare nu acordă putere.
- UI-ul nu modifică inventarul și nu citește imagini din adrese externe.
- Păstrăm toate celelalte obiective și sistemul de luptă.

## Teste
```sh
node dev/test-beta-endgame-mastery-collections.js
node dev/test-beta-gear-team-presets.js
node dev/test-beta-tower-checkpoints.js
node dev/test-drumul-eroului.js
```

CI rulează toate testele din `dev/test-*.js`.

## QA autenticată rămasă
1. Erou de nivel 49 BETA / erou LIVE: panoul nu apare; la nivel 50 BETA apare în Echipă → Compoziție.
2. Învinge trei căpitani **diferiți** numai cu eroul. Nu număra trei victorii repetate asupra aceluiași căpitan și nici o echipă în care mercenarii au căzut.
3. Învinge căpitani cu patru clase distincte în echipă. Verifică numărătoarea și alegerea titlului.
4. Verifică un record Turn 80 deja salvat: titlul corespunzător devine disponibil fără o nouă urcare.
5. Schimbă titlul, verifică profilul eroului și refresh; încearcă schimbarea în luptă (trebuie blocată).
6. Mută un legendar din Rucsac pe mercenar și apoi în rezervă: colecția rămâne deținută o singură dată. După pierderea lui, starea devine „obținut cândva” când există istoric.
7. Verifică un browser mobil și desktop: secțiunea rămâne compactă, fără scroll orizontal pentru obiecte.
8. Reconfirmă că bonusurile din luptă și recompensa căpitanului sunt identice față de aceeași situație înainte de PR.

**Status:** implementare tehnică BETA, nevalidată în browser autentificat. Pașii 21–22 rămân nebifați până la QA.
