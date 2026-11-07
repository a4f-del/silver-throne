# BETA — Ecran de Temniță compact, fără scroll pentru butonul Luptă

Data: 7 noiembrie 2026.

## Ce s-a schimbat

Înainte, în ecranul dedicat de Temniță, înălțimea portretului (270–400px), cardurile progresului și panoul de pregătire împingeau butonul **Luptă / Înfruntă căpitanul** sub limita ferestrei, inclusiv la 1649×928 (captura utilizatorului).

Acum:
- Ecranul de pregătire are clasă separată `ac-dungeon`; **lupta activă** folosește în continuare `ac-combat`, nemodificat.
- Portretul și progresul folosesc înălțimi compacte, proporționale cu viewportul (`dvh`). Păstrăm fotografia, numele, viața/atacul estimat, abilitatea căpitanului, șansele, echipamentul sugerat și componența echipei.
- **Butonul primar este imediat după șansele de câștig**, înainte de informațiile ajutătoare; nu mai este împins la baza cardului.
- Echipa este afișată ca o bandă compactă cu viața fiecărui personaj, fără a elimina membrii.
- Pe mobil, portretul și acțiunea apar **alături**, nu ca două blocuri verticale; pentru ecrane scunde reduc suplimentar înălțimea cardurilor.
- Pe ecrane neobișnuit de mici sau cu setări mari de font poate rămâne scroll natural. **Nu folosim `overflow:hidden` sau înălțimi fixe care ar tăia controale.** Important este că butonul de luptă apare înaintea informațiilor secundare.
- Numai în BETA; LIVE păstrează interfața originală. Fără SQL, fără modificări de economie, puncte, daune sau salvări.

## Regresii automate

```sh
node dev/test-beta-compact-dungeon-screen.js
node dev/test-beta-adventure-monster-cards.js
node dev/test-beta-dungeon-difficulties-map-menu.js
```

## Verificare vizuală manuală recomandată

- Desktop 1649×928 (captură de referință), 1366×768 și 1280×720: Mina Cenușie, ultimul pas — nume, progres, boss, șanse și buton vizibile, fără scroll.
- Mobil 390×844, 360×740 și dispozitiv cu înălțime sub 720px: butonul Luptă vizibil imediat, fără scroll vertical obligatoriu; pe ecrane foarte mici este acceptabil ca detaliile echipei să aibă scroll natural.
- Testează temnițe cu cinci/șase monștri și dificultățile Greu/Coșmar la nivel adecvat; selectorul de dificultate trebuie să rămână vizibil și funcțional.
- Prima luptă manuală și automată, victoria, reîncărcarea paginii, retragerea și revenirea la Sat trebuie să se comporte identic.

Acest PR adresează **pregătirea pentru luptă în Temnițe**. Un audit separat poate compacta ulterior ecranul **din timpul luptei** dacă testele vizuale relevă aceeași problemă.
