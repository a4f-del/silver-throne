# Silver Throne BETA — Pasul 30: Piață, Negustor și Bazar

Data: 8 noiembrie 2026. Simplificare strict de interfață pentru eroi noi BETA.

## Problema
Satul are deja o **singură clădire Piață**, cu trei file. Fiecare filă afișa un mini-ghid lung, format din trei carduri și buton obligatoriu „Am înțeles” înaintea interfeței utile. Acest lucru repeta explicațiile care se găsesc deja în magazine și adăuga clickuri, mai ales pe telefon.

## Soluție BETA
Filele arată direct rolul fiecărei opțiuni:
- **Piață — Cumperi cu aur:** obiecte obișnuite, disponibile oricând, cu reînnoire automată a stocului.
- **Negustor — Obiecte rare și cristale:** marfă de calitate, schimb de cristale, deblocare după nivelul necesar.
- **Bazar — Schimb între jucători:** listezi/cumperi oferte ale altor jucători, cu taxele existente.

Fiecare filă deschisă afișează **o singură propoziție de orientare**, nu un ghid obligatoriu. Instrucțiunile detaliate existente rămân disponibile într-o secțiune extensibilă „Mai multe despre…” (inclusiv taxele de 2% la listare și 5% la vânzare). Dacă fila este încuiată, vezi doar nivelul necesar, progresul tău și o explicație compactă.

## Ce nu se schimbă
- Trei file în **aceeași** clădire și linkurile vechi către Negustor/Bazar.
- Nivelurile de deblocare: Negustor 10 configurabil; Bazar 15.
- Produsele, aurul, raritățile, reînnoirea mărfii și limitele de cristale.
- Căutarea, filtrarea, listarea, retragerea și cumpărarea din Bazar.
- Taxele 2% și 5%, durata listării, revendicarea obiectelor și validările serverului.
- **LIVE și eroii BETA vechi:** mini-ghidurile și butoanele lor rămân identice.

## Teste
```sh
node dev/test-beta-market-clarity.js
```
Suita completă GitHub Actions acoperă suplimentar sintaxa și celelalte sisteme. Testul verifică trei roluri, instrucțiuni opționale, pragurile de nivel, taxele Bazarului, rutele vechi și izolarea LIVE/BETA.

## QA mobil/desktop înainte de bifare
1. Erou nou BETA, nivel 1: Piața arată subtitlul „Cumperi cu aur” și un ghid compact; poți vedea direct marfa fără buton „Am înțeles”.
2. Deschide „Mai multe despre Piața”: cele trei informații originale sunt disponibile, dar fără popup.
3. La nivel sub 10, deschide Negustorul încuiat; nu se pot cumpăra produse. La nivel 10, verifică interfața reală și cristalele.
4. La nivel 15, intră în Bazar. Cumpărarea, listarea și ofertele tale funcționează ca înainte; taxele sunt explicite.
5. Urmează linkurile vechi către Negustor/Bazar: ajungi în fila potrivită a Pieței.
6. Verifică pe telefon: etichetele scurte nu trebuie să forțeze scroll orizontal sau să acopere butoanele.
7. Verifică LIVE și un erou BETA vechi, care trebuie să păstreze ghidurile originale.

**Status:** implementare de interfață și teste în BETA; pasul rămâne nebifat până la QA vizual. Fără SQL.
