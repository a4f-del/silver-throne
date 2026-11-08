# Silver Throne BETA — Pașii 23–24: PvP lizibil și prestigiu Tron

**Actualizare SQL30 (BETA):** apărarea satului folosește acum întreaga echipă activă, **până la 4 luptători de la nivelul 30**, iar Tronul rămâne duel erou contra erou. Această notă înlocuiește referirile istorice la limita de 3 din documentul de mai jos. Detalii: `docs/BETA-WORLD-FOUR-DEFENDERS-THRONE-AUTOSYNC-STEP33.md`.

Data: 8 noiembrie 2026.

## Pasul 23 — Comparație după puterea reală a echipei din Lume
În BETA am separat explicit două bucle:
- **Lumea:** atacurile împotriva altor jucători folosesc o fantomă a echipei publicate (maxim **3 luptători** conform `TT.CFG.maxUnits`). Reperul de putere local trebuie să folosească **`tronTeamUnits()`**, același tip de instantaneu trimis public în Lume, nu `tronUnits()` (care în BETA reprezintă doar eroul pentru Tron).
- **Tron:** dueluri **erou contra erou**, fără plasarea mercenarilor în fantomă.

Panoul unui adversar din Lume arată:
- puterea echipei tale / adversarului; 
- o recomandare orientativă: adversar mai slab, forțe apropiate sau adversar mai puternic;
- atenționarea că puterea **nu este un procent de victorie** și că obiectele/compoziția pot influența lupta;
- când atacul este indisponibil, motivul autorizării, cu text escapate.

Protecțiile deja prezente rămân neatinse: nivel minim pentru atacator și apărător, cooldown pe același adversar, bara de atacuri, lupta activă, raportare către server `world_raid_start`. Recomandarea este UI, nu permite ocolirea niciunui gard.

## Pasul 24 — Prestigiu Tron, fără putere suplimentară
Ecranul Tronului BETA păstrează clasamentul săptămânii, coroana, protecția temporară, numărul de provocări și Sala Faimei. Îmbunătățiri de prezentare:
- Locul propriu din clasament și timpul acumulat sunt explicite.
- Sala Faimei este într-o secțiune extensibilă, cu sezoanele încheiate și numele câștigătorilor; nu obligă un jucător nou să deruleze toate sezoanele.
- Regulile spun că premiul competitiv este **prestigiul, istoria și titlurile**. Nu există buff permanent pentru rege.
- Controlul de resetare a protecției regelui în BETA, destinat QA, este vizibil doar în modul `DEV()`, nu tuturor jucătorilor BETA. Operația rămâne autorizată server-side; ascunderea UI nu este un substitut pentru validarea SQL.

Nu se modifică durata sezonului, algoritmul clasamentului, calculul puterii pentru duelul erou vs erou, limitele zilnice sau rezultatele de luptă.

## Teste
```sh
node dev/test-beta-pvp-throne-clarity.js
node dev/test-beta-pvp-card-animations.js
node dev/test-beta-duel-balance.js
node dev/test-beta-world-friends.js
```
Suita GitHub Actions execută automat toate `dev/test-*.js`.

## QA manual necesar
1. În BETA, selectează un jucător din Lume cu puterea publicată mai mare/apropiată/mai mică și verifică recomandarea și puterea reală a echipei (nu doar a eroului).
2. Cu un adversar protejat de nivel sau în cooldown, verifică butonul de atac dezactivat și explicația corectă, fără consum de încercări.
3. Atacă un adversar eligibil: serverul trebuie să confirme, iar fantoma să aibă cel mult trei luptători. Apărătorul nu pierde resurse.
4. Deschide Tronul: duelul rămâne între eroi, cu protecția și limitele publicate de server.
5. Verifică „Locul tău”, clasamentul actual și Sala Faimei extensibilă cu sezoanele existente.
6. Pe un cont BETA obișnuit nu trebuie să apară butonul administrativ de resetare a protecției; pentru administrator este vizibil doar când `DEV()` este activ.
7. Verifică mobil și desktop, plus izolarea LIVE.

**Status:** îmbunătățiri UI BETA, fără QA autentificată; pașii 23–24 rămân nebifați. Nu necesită SQL.
