# Silver Throne BETA — Pasul 03: prima luptă și căpitanul

Data: 7 noiembrie 2026 · Ghid de verificare pentru prima temniță.
Status: **implementat în cod, de verificat vizual cu un erou nou în BETA**.

## Problema găsită

În noul ecran de Temniță, toate portretele puteau fi apăsate pentru previzualizare. Dacă jucătorul alegea un monstru învins sau un căpitan încă blocat, `acDungeonPage` ascundea butonul **Luptă**, deși progresul nu era blocat și jucătorul putea continua cu monstrul curent. Nu era evident cum se revine la acțiune.

## Corecția

- Progresul afișează clar **„Urmează: [numele monstrului]”**. La ultimul pas arată **„Ultimul adversar: căpitanul”**.
- Doar portretul adversarului disponibil are `aria-current="step"`; restul pot fi inspectate fără să pornească o luptă.
- Când jucătorul privește un portret trecut/viitor, panoul din dreapta oferă butonul **„Înapoi la [adversarul curent]”**. Acest buton schimbă doar selecția de previzualizare prin `trSelSet`, fără costuri de puncte sau start de combat.
- Când este selectat adversarul disponibil, **„Luptă” / „Înfruntă căpitanul”** rămâne acțiunea principală. Textul precizează că următorul monstru se deblochează după victorie.
- La căpitan, textul spune explicit că este **ultima luptă** și că după victorie eroul revine automat în ecranul **Coborâre**, cu prada acordată.
- Săgeata din ghidarea noilor eroi preferă butonul de revenire când jucătorul a selectat un portret blocat, fără un al doilea tutorial.
- Dimensiunile compacte introduse în PR #45 rămân; butonul de revenire este și el compact și responsive.

**Nu** modificăm costuri, șanse, lupta automată/manuală, XP, dropuri, dificultățile Greu/Coșmar, progresul salvat sau codul LIVE.

## Smoke test de jucător nou

1. Intră în BETA cu un erou nou și mergi în Mina Cenușie.
2. Verifică **„Urmează: Șobolan de mină”** și **Luptă**.
3. Apasă portretul căpitanului din bandă înainte de a ajunge la el: apare **„Înapoi la Șobolan de mină”** și *nu* apare Luptă pentru căpitan.
4. Apasă revenirea: reapar șansele și butonul **Luptă** al monstrului curent.
5. Învinge un monstru; pasul curent și portretul evidențiat avansează automat.
6. Revino pentru o clipă la un monstru învins, apoi apasă **Înapoi la** monstrul actual.
7. La pasul 4/4 verifică numele căpitanului, abilitatea specială, costul și explicația ieșirii automate.
8. Învinge căpitanul: ecranul de aventură dispare automat, prada se acordă o singură dată și este disponibilă din nou navigarea.
9. Verifică la 1366×768 și pe mobil: butonul este vizibil fără scroll obligatoriu către finalul cardului.
10. Reîncarcă pagina între monștri: progresul și selecția din Temniță sunt păstrate corect. Testează separat o dificultate deblocată Greu/Coșmar.

## Teste de regresie

```sh
node dev/test-beta-first-dungeon-clarity.js
node dev/test-beta-compact-dungeon-screen.js
node dev/test-beta-adventure-monster-cards.js
node dev/test-beta-new-hero-guidance.js
node dev/test-beta-adventure-mode.js
```

Nu considerăm verificarea vizuală efectuată numai din testele JS.
