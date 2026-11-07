# BETA — Ritmul începutului: poveste în loc de suprapuneri

## Problema observată
Imediat după prolog, jucătorul primea Paznicul, prima misiune era deja completată, iar vechiul ghid se afișa în același timp cu panoul noilor misiuni. După primul căpitan, Arcașul și Vraciul apăreau prea aproape unul de altul, ceea ce putea da impresia că intră în echipă chiar în timpul luptei.

## Noua ordine
1. **Prologul „Ultima scânteie”** → alegi să continui sau îl sari.
2. **Paznicul** → îl primești și îi alegi numele. **Prima misiune nu este completată automat.**
3. **Misiunea 1, „Ultimul jurământ”**: după ce ai numit Paznicul, efectuezi **prima coborâre și te întorci din mină** (`C('l') >= 1`). Abia apoi poți revendica **20 aur**.
4. La întoarcerea în **pagina principală Sat**, Arcașul îți oferă scena lui. **Nu în timpul căpitanului și nu peste ecranul cu pradă.**
5. **Misiunea 2, „Sub piatra arsă”**: numești Arcașul și forjezi prima armă (`C('f') >= 1`); abia apoi poți revendica **15 minereu**.
6. **Misiunea 3, „Hanul celor rămași”**: faci antrenamentul și recrutezi Războinicul la Han. Recompensa rămâne **35 aur + 5 minereu**.
7. **Vraciul** nu mai este prezentat imediat după căpitan. Trebuie să fi învins un căpitan și să-i fi recrutat pe Arcaș și Războinic; scena apare **la intrarea în Infirmerie**. Dacă învingi căpitanul mai devreme, oferta rămâne disponibilă.
8. **Magul** rămâne la nivelul 5, când intri în Lume.

## O singură îndrumare, nu două
- Pe noii eroi BETA cu prolog terminat, **ghidul tutorial existent este ascuns inițial**. El continuă să urmărească progresul în fundal și nu pierde pașii sau recompensele.
- Panoul misiunii prezintă doar **numele, obiectivul scurt, progresul și butonul de acțiune**, nu dialogul lung.
- Dialogul și explicațiile suplimentare sunt sub **„📜 Citește povestea”**; le deschizi doar dacă vrei.
- **„Ai nevoie de ghidul jocului?”** comută la ghidul vechi; **„Înapoi la poveste”** revine la misiune. Ambele rămân disponibile.
- Mercenarii BETA noi **nu mai afișează mesaje pentru oferte în timpul luptelor**.
- LIVE și salvările BETA dinaintea introducerii poveștii își păstrează tutorialul vechi.

## Test pe BETA
1. Merge PR-ul, apoi reîncarcă `https://a4f-del.github.io/silver-throne/?server=beta`.
2. Pentru întregul flux e necesar un **erou nou BETA autorizat**; nu șterge conturile de nivel 50.
3. După prolog și numirea Paznicului, confirmă că misiunea 1 arată doar **1/2**, nu „gata”. Verifică faptul că ghidul nu îți mai acoperă povestea.
4. Deschide **„Ai nevoie de ghidul jocului?”**, apoi revino la poveste. Panourile nu trebuie să fie ambele active implicit.
5. Coboară în Mina Cenușie, bate căpitanul și verifică faptul că **nici Arcașul, nici Vraciul nu deschid ferestre în mijlocul luptei**.
6. Ieși cu prada și revino în **Sat**. Arcașul trebuie să te întâmpine acolo; Vraciul trebuie să aștepte.
7. Acceptă/denumește Arcașul, forjează o armă, apoi revendică misiunea 2.
8. Antrenează eroul și recrutează Războinicul în Han. Apoi deschide **Infirmeria**: dacă ai învins deja un căpitan, îl poți întâlni pe Vraci.
9. Verifică faptul că premiile de poveste nu se pot revendica a doua oară după refresh.

Nu este nevoie de SQL și nu schimbăm datele sau echilibrul de luptă. Previzualizările actuale din Han rămân pentru a vedea scena, dar nu simulează parcursul unui erou nou.
