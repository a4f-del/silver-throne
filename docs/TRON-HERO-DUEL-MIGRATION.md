# Tronul de Argint — duel 1 contra 1 (versiune de test)

## Obiectiv
Tronul folosește numai **eroul principal** al provocatorului contra **eroului principal** publicat de deținător, cu statistici reale (fără plafon). **Lumea** păstrează raidurile cu echipă.

## Client în acest PR
- `tronUnits()` publică un singur erou (cel cu `h`).
- `tronTeamUnits()` păstrează toate unitățile pentru Lume.
- `tronFight()` izolează eroul principal în `S.fs` numai pe durata duelului; `tronCheck()` restaurează echipa la terminare.
- `TT.throneDuelUnit()` nu plafonează statisticile. Multiplicatorul actual al atacului fantomei este încă păstrat.
- Apărarea veche a deținătorului, dacă are mai multe unități, este redusă provizoriu la prima unitate client-side.

## BLOCAJ SERVER — nu integra până nu se actualizează Supabase
Fișierul `supabase/01-throne.sql` la care face referire `tron.js` **nu există în repository**. Nu este sigur să inventăm schema sau să presupunem că serverul nu plafonează.

Înainte de merge trebuie:
1. Adăugat SQL-ul sursă real pentru funcțiile `throne_publish`, `throne_challenge_start`, `throne_challenge_finish` și configurația lor.
2. Pe server: validare `ghost.units` de **exact o unitate** (erou principal), fără clamp de `hp/atk/def` la vechiul nivel 40; valori finite, validare și măsuri anti-trișat.
3. Normalizate apărările deja publicate: primul luptător **nu este garantat** a fi eroul în datele vechi. Cere republicarea eroului principal, nu alegere arbitrară.
4. Actualizată eventuala oglindire SQL a `ghostCapLevel`, `ghostAtkMult`, `maxUnits` numai pentru Tron (nu pentru Lume).
5. Testate lupte la nivel 10, 30, 50; vindecarea eroului, moartea, fugă, refresh în duel, recuperarea echipei și afișajul.
6. Calibrat multiplicatorul fantomei 1.62 într-un duel 1v1 (poate favoriza mult apărătorul).

**Nu merge-uiți acest PR până nu se finalizează migrarea Supabase și testele.** Nu schimbă `index.html`, nu e o livrare live completă.
