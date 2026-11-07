# BETA — „Deschide Campania” merge direct la lista de obiective

Data: 7 noiembrie 2026

## Modificare pentru utilizator

În BETA existau două variante ale cardului de final al poveștii:
- **Drumul Eroului**, pentru eroii noi (`jePanel`).
- **Cenușa și Jurământul**, pentru eroii BETA care au început firul anterior (`sqPanel`).

Ambele afișau `Deschide Campania`, însă navigau doar la începutul filei **Hartă → Campanie**, nu la cerințele concrete.

Acum, la apăsarea butonului **„Deschide Campania și obiectivele”**:

1. Se deschide **Hartă → Campanie** (`S.tab='m'; S.mt='k'`), fără un modal suplimentar.
2. În capitolul curent apare un checklist clar, **„Ce ai de făcut acum”**, cu fiecare adversar / cerință și indicator ✔ / ○, fără modificarea condițiilor.
3. Jocul derulează la **prima sarcină neîndeplinită** și o luminează discret timp de aproximativ 2,6 secunde.
4. Dacă toate sarcinile capitolului sunt îndeplinite, evidențiază butonul **„Încheie capitolul”**.
5. Dacă toate capitolele sunt încheiate, continuă spre obiectivele secundare.
6. După apăsarea notificării, cardul final de onboarding dispare și **nu revine la fiecare afișare**. Jucătorul redeschide oricând Campania din **Hartă → Campanie**.

Ghidarea nu apasă butoane, nu pornește lupte și nu revendică recompense. Accentul vizual este temporar, mobil-friendly și respectă `prefers-reduced-motion`. Progresul capitolelor și obiectivele secundare rămân identice.

## Siguranță

- Numai server **BETA**: butoanele finale de poveste și checklist-ul ghidat nu modifică HTML-ul LIVE.
- `cmpOpenChecklist` refuză să navigheze în timpul unei lupte.
- Preferința de a nu mai repeta cardul este salvată în salvarea eroului (`S.jeCampaignOpened` sau `S.sqCampaignOpened`), nu într-un contor de recompense.
- Nicio modificare în aur, minereu, XP, inventar, capitole revendicate, dificultăți sau SQL.

## Testare

```sh
node dev/test-beta-campaign-checklist-link.js
node dev/test-campaign-tab-and-avatar.js
node dev/test-beta-new-hero-guidance.js
node dev/test-beta-new-player-first-captain.js
```

**Verificare vizuală în browser:** completează jurămintele cu un erou BETA, apasă `Deschide Campania și obiectivele`, verifică poziția și conturul primului obiectiv. Testează și când primul capitol este deja gata (trebuie evidențiat `Încheie capitolul`), apoi revino în Sat ca să confirmi că notificarea finală nu mai revine. Repetă pe mobil.

Testele JS verifică logică și markup, nu înlocuiesc această verificare manuală.
