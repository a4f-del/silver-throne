# Silver Throne BETA — Pasul 23 (completare): recomandări de adversari

**Actualizare SQL30 (BETA):** comparațiile PvP folosesc acum toată echipa activă din Lume, **maximum 4 apărători** de la nivelul 30; regulile mai vechi despre 3 apărători descriu versiunea precedentă. Detalii: `docs/BETA-WORLD-FOUR-DEFENDERS-THRONE-AUTOSYNC-STEP33.md`.

Data: 8 noiembrie 2026. Modificarea se bazează pe corecțiile PvP/Tron deja integrate în main.

## Funcționalitate
Pe ecranul Lumii, apar cel mult trei adversari momentan atacabili, ordonați după distanța relativă față de **puterea fantomei Lumii**: `TT.power(tronTeamUnits())`, cu maximum trei luptători. Nu estimăm șanse de victorie și nu garantăm disponibilitatea până la apăsarea atacului.

Fiecare rezultat arată nume, nivel, putere și un buton **„Vezi pe hartă”**. Butonul apelează navigarea existentă, fără a consuma un atac. Identificatorii sunt trecuți prin codificare JSON și HTML, fără inserare directă în JavaScript. Nu schimbăm renderul hărții sau locurile jucătorilor.

Lista folosește `lwCan(p)`, care păstrează protecția începătorilor, cooldown-ul pe adversar, energia de atac, interdicția atacului în timpul altei lupte, raportarea precedentă în așteptare și echipa căzută. Serverul revalidează atacul real prin `world_raid_start`.

Lista apare **doar în BETA**. LIVE nu primește nicio modificare de afișare, limite sau calcul. Nu sunt modificări SQL, economie sau statistică permanentă.

## Interacțiunea cu PR anterior
Corecția puterii comparate, explicarea celor trei luptători în Lume și duelul cu eroul la Tron erau deja pe `main`, deci nu se implementează încă o dată. PR-ul inițial (#60) a fost închis fără integrare din cauza conflictului; acest PR adaugă strict lista de recomandări și păstrează celelalte schimbări.

## Teste
```sh
node dev/test-beta-pvp-opponent-suggestions.js
node dev/test-beta-pvp-throne-clarity.js
node dev/test-beta-guild-ranks-invites.js
```
Suita automată GitHub Actions rulează și celelalte regresii.

## QA manual înainte de bifare
1. Cu un cont BETA autorizat, verifică ordinea celor trei sugestii și faptul că butonul deschide satul potrivit.
2. Verifică un adversar sub nivelul minim, unul în cooldown și bara de atacuri goală: niciunul nu este recomandat.
3. Confirmă că în Lume comparația este pe echipa de maximum 3, iar în Tron duelul este 1v1.
4. Verifică pe mobil și desktop, inclusiv revenirea pe hartă. Cu un cont LIVE, secțiunea nouă trebuie să lipsească.
5. Verifică că atacul real rămâne supus autorizării și validării server-side, fără recompense sau atacuri generate de lista de sugestii.

**Status:** doar automatizare și cod BETA; pasul 23 nu se bifează până la QA în browser.
