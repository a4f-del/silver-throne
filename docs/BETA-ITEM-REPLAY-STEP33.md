# Silver Throne BETA — pasul 33 / SQL36: motor privat de reconstrucție a obiectelor

**Stare:** pregătit în GitHub, **neinstalat în Supabase**. Rulează manual numai în **Silver-Throne-Test**, după SQL35, cu backup. NU LIVE. Acest pas înregistrează numai funcții SQL: **fără emitere de obiecte**, fără import retroactiv, fără schimbarea inventarului, echipamentului, aurului, materialelor, forjării sau recompenselor.

## Ce este gata

SQL36 transpune în PostgreSQL formula actuală `mkItem` din `index.html`, pentru toate cele șase categorii de echipament: arme, armuri, coifuri, cizme, bijuterii și relicve. Include cele șase subtipuri de arme (sabie, topor, arc, buzdugan, toiag, sceptru), multiplicatorii de raritate/calitate, bonusurile de clasă și toate prefixele/sufixele disponibile la nivelul obiectului. Păstrează conversia BETA `vd` → apărare efectivă (valoare /4, rotunjită, minimum 1).

Un `server_roll_seed` stocat în receiptul privat SQL35 alege determinist prefixul, sufixul și, unde este cazul, numele de bază. Același receipt produce același obiect la reexecutare, fără o nouă extragere aleatorie sau creditare.

**Diferență de mecanică intenționată:** motorul clientului folosește `Math.random()` sau selecții făcute de jucător; SQL36 alege din **aceleași afixe valide**, dar determinist din seed. Este o metodă nouă pentru obiecte *viitoare*, nu o recreare a norocului obiectelor vechi. Funcția reproduce statisticile unui obiect valid generat de `mkItem` cu selecțiile respective, nu pretinde să știe ce selecție a avut loc în trecut.

Modelul cu seed și MD5 este reproductibil, dar **nu este RNG criptografic**. Seedul trebuie să fie emis pe server, ascuns înainte de închiderea evenimentului și securizat de viitorul emitent; în această etapă SQL36 nu oferă funcție de mint. **Nu este folosit încă pentru recompense competitive.**

## Limite de încredere

- Funcția publică din schema SQL `beta_item_replay_receipt_v1(receipt_id)` este **revocată** pentru `authenticated`, `anon` și `PUBLIC`; doar un backend privilegiat o poate apela. Nici generatorul și nici funcțiile auxiliare nu sunt accesibile prin RPC de jucător.
- Pentru a reconstrui un obiect, funcția citește tipul, nivelul, raritatea, calitatea, template-ul și seedul **din receiptul SQL35**. Nu folosește un JSON cu statistici trimise de browser.
- Nu creează receipturi, nu modifică salvări și nu oferă obiecte în rucsac.
- Validarea reală a rezultatului de Temniță/forjă și a provenienței echipamentului rămâne deschisă. SQL35 nu poate primi „evenimente verificate” doar pentru că un client le numește astfel.

## Instalare și verificări (numai BETA)

1. Asigură-te că în Supabase ai selectat **Silver-Throne-Test**, nu LIVE, și fă backup.
2. Verifică instalarea SQL35. Ai indicat că ai terminat etapa precedentă; cele 9 valori de verificare SQL35 nu au fost furnizate separat. Dacă vreuna nu a fost `true`, rezolvă mai întâi acel lucru.
3. Deschide [SQL36 în GitHub](https://github.com/a4f-del/silver-throne/blob/main/supabase/36-beta-item-replay-model.sql), apasă **Raw** și rulează fișierul integral în SQL Editor **BETA**. Nu rerula SQL25–35.
4. Prima interogare finală trebuie să întoarcă **9/9 `true`**: `receipt_replay_exists`, `replay_model_exists`, `receipt_replay_private`, `raw_model_private`, `generator_helpers_private`, `receipts_still_private`, `sql35_guard_preserved`, `common_sword_fixture`, `deterministic_rare_fixtures`.
5. A doua interogare arată doar numărul de receipturi. În BETA, cât timp nu există emitent autoritativ, este de așteptat să rămână **0**.

## Testare și progres

`node dev/test-beta-item-replay-model.js` verifică în Node.js catalogul SQL față de valorile originale și compară mii de combinații de tip, nivel, raritate, calitate, subtip și seed cu `mkItem` din joc. Totodată verifică absența unui RPC de mint și drepturile private. **Acesta este un test de paritate al modelului JavaScript și o inspecție statică SQL, nu un test executat în PostgreSQL.** Verificările SQL36 în Supabase sunt necesare separat.

După această etapă: evenimente server-side de forjare și recompensă, consum atomic de resurse server-side și emiterea unui receipt pe baza acelor evenimente. Abia după QA cu încercări repetate, reconnect și două conturi putem analiza validarea echipamentului în Lume/Tron. Obiectele istorice rămân *legacy*, fără penalizare sau ștergere automată. LIVE rămâne neschimbat.
