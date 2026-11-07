# Silver Throne BETA — Pașii 07–09: Sat, următoarea aventură, zilnice

Data: 8 noiembrie 2026. Experiența nouă este strict pentru eroii noi din BETA, opt-in prin `jeFocus()`.

## Pas 07 — Sat progresiv
Navigarea progresivă era deja implementată. Păstrăm patru clădiri de bază la început (Topitorie, Han, Antrenament, Misiuni), butonul „Vezi toate clădirile”, descoperirea treptată a celorlalte și apariția Infirmeriei imediat ce cineva este rănit. Nu ascundem funcții pentru un erou cu probleme medicale de echipă sau pentru un jucător care alege să vadă tot.

Regresie existentă: `dev/test-beta-onboarding-focus.js`. Verificare manuală încă necesară pe desktop și mobil.

## Pas 08 — Ce urmează după primul tutorial
Până la finalul Drumului Eroului rămâne **un singur obiectiv principal**. După încheierea celor șase jurăminte se oferă întâi butonul deja existent „Deschide Campania”. După ce jucătorul a vizitat Campania, următoarea întoarcere în Sat/Coborâre arată un singur card „Următoarea aventură”.

- Afișează temnița potrivită, nivelul necesar și nivelul actual.
- Sub nivelul 8, recomandă continuarea în Mina Cenușie și prezintă Catacombele Uitate ca pragul următor.
- La nivelul 8, Catacombele devin ținta disponibilă; la nivelul 18, recomandă Cetatea Scufundată. Evenimentele cu chei nu sunt confundate cu progresia obișnuită.
- Dacă un luptător este căzut, recomandă Infirmeria; altfel verifică **arma eroului**; în rest sugerează echipament și vindecare. Nu inventează șanse de victorie.
- Un singur buton duce la Coborâre și marchează cardul ca văzut; revenirea nu repetă mesajul, iar salvarea se face prin `go()`.
- Nu se afișează în Campanie, Lume, Tron sau deasupra unei lupte.

## Pas 09 — Zilnice fără presiune
În Misiuni, primii trei pași ai listei zilnice rămân vizibili, iar celelalte trei sunt într-un `details` „Alte 3 misiuni opționale”, care indică și câte premii pot fi revendicate. Mesajul spune explicit că **nu trebuie să le termini pe toate** pentru a avansa.

Păstrăm identice: generarea misiunilor, identificatorii / indicii, progresul, butoanele de revendicare, recompensele, bonusul de șase și resetarea zilnică. Nu se schimbă economia și nu se elimină nicio misiune.

Pentru eroi BETA vechi și LIVE, ecranul cu șase misiuni rămâne identic.

## Teste

```sh
node dev/test-beta-onboarding-focus.js
node dev/test-beta-onboarding-next-and-dailies.js
node dev/test-drumul-eroului.js
node dev/test-beta-campaign-checklist-link.js
```

În plus, CI rulează toate fișierele `dev/test-*.js` și verificarea de sintaxă.

## QA manual înainte de bifare
1. Erou nou BETA: patru clădiri la început; „Vezi toate clădirile” funcționează; Infirmeria apare la rănire.
2. Termină Drumul Eroului și intră în Campanie: cardul „Următoarea aventură” **nu** acoperă checklistul Campanie.
3. Întoarce-te în Sat, la un nivel sub 8: vezi Catacombele (nivel 8), cu recomandarea de a continua în Mina Cenușie.
4. Apasă butonul cardului: ajungi în Coborâre; refresh-ul nu repetă cardul. La nivel 8, cardul trebuie să descrie Catacombele ca disponibile.
5. Vizitează Misiuni: trei misiuni văzute inițial, trei în secțiunea opțională. Revendică din ambele grupuri; butoanele nu revendică misiunea greșită.
6. După toate șase, bonusul zilnic rămâne disponibil și poate fi revendicat o singură dată.
7. Repetă pe mobil. Verifică și BETA vechi/LIVE pentru izolarea schimbărilor.

**Status:** implementări BETA testabile; pașii 07, 08 și 09 nu se bifează fără test manual în browser. **Nu necesită SQL.**
