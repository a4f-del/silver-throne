# Drumul Eroului — experiența unificată (BETA, doar eroi noi)

## De ce
Ghidul vechi și cele 3 misiuni experimentale apăreau în paralel, cu explicații și recompense redundante. „Drumul Eroului” oferă o singură cale, cu un obiectiv curent, ajutor doar la cerere și recompense consolidate.

## Fluxul de început
1. **Cenușa de la poartă**: prolog → Paznic → prima ieșire cu pradă din mină. **50 aur + 15 minereu** (combină 30 aur/15 minereu din vechiul ghid și 20 aur din misiunea de poveste).
2. **Urmele din cenușă**: Arcașul apare când revii pe pagina principală a Satului, apoi fă prima forjare. **30 aur + 25 minereu** (combină 30 aur/10 minereu din ghid și 15 minereu din misiunea de poveste).
3. **Oțel pentru cei rămași**: echipează prima armă. **30 aur + 5 minereu** (din ghid).
4. **Jurământul veteranului**: antrenament → Războinic la Han. **135 aur + 5 minereu** (60 aur pentru antrenament și 40 aur pentru Han, din ghid; 35 aur/5 minereu din misiunea de poveste).
5. **Vești din sat**: vizitează clădirea Misiuni. **30 aur** (din ghid).
6. **Dincolo de palisadă**: primul raid asupra unui sat. **80 aur + 20 minereu** (din ghid).

În acest mod nu mai sunt două cereri de recompense pentru aceeași acțiune. Toate cele șase recompense sunt revendicate exclusiv prin jurnal, o singură dată, cu marcajul persistent `S.je.done`. Nu schimbăm echilibrul sau sistemele vechi pentru alți jucători.

## Interfață
- Un singur card **Drumul Eroului** vizibil contextual, cu titlu, obiectiv, progres, recompensă și „Continuă”. Nu se arată în timpul luptelor.
- Povestea și explicațiile mecanicilor se deschid sub „📜 Poveste și ajutor”. Fără ferestre automate pentru tutorial sau misiuni noi.
- Reperele din Sat pulsează discret; după revendicare apare un singur toast cu recompensa.
- Pe mobil butoanele sunt pe un rând separat; efectele respectă `prefers-reduced-motion`.
- Scenele mercenarilor rămân în locurile lor, inclusiv Vraciul doar în Infirmerie după ce ai recrutat Arcașul și Războinicul. Dacă amâni Arcașul, cardul te îndrumă la Han.
- Există o **previzualizare BETA în Han** pentru conturile existente; nu modifică resurse sau personaje.

## Izolare și migrare
- `S.journeyV=1` se setează **numai la creare de erou nou, exclusiv pe BETA**.
- Salvările LIVE și toți eroii BETA existenți rămân cu sistemul pe care îl aveau. Nu se migrează și nu se șterge nimic.
- `tuChk()` (ghidul vechi) nu acordă recompense pentru eroii cu journeyV=1.
- `sqEnabled()` exclude journeyV=1, astfel încât panoul experimental și recompensele sale nu dublează noul fir.
- `jeReady()` așteaptă prologul. Nu este nevoie de SQL.

## Testare
1. Merge PR și reîncarcă `https://a4f-del.github.io/silver-throne/?server=beta`.
2. **Cont existent:** Sat → Han → Scenele tovarășilor → „📜 Drumul Eroului (nou)”: doar preview, fără recompense sau resetare.
3. **Erou BETA nou, autorizat:** prolog → Paznic → obiectivul pentru mină. Confirmă că nu se afișează ghidul vechi ori alt panou de misiune.
4. Prima ieșire din mină → scena Arcașului la întoarcerea în Sat (nu în luptă), apoi forjă și echipare.
5. Antrenament → Războinic la Han. Vezi și Infirmeria pentru Vraci dacă ai bătut un căpitan.
6. Verifică misiunile zilnice și primul raid; revendică premiile, reîncarcă și asigură-te că nu se acordă din nou.
7. `node dev/test-drumul-eroului.js` pentru teste logice. Testarea vizuală pe telefon se face după merge.
