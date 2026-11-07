# BETA — Ghidare contextuală (săgeți și highlight)
Data: 7 noiembrie 2026

## Ce se vede pentru eroii NOI din BETA

Ghidarea reutilizează **Drumul Eroului**, fără să dubleze povestea într-un alt tutorial. Apare maximum **un singur highlight cu o săgeată** la un moment dat, pe acțiunea relevantă.

1. Dacă jucătorul este pe altă pagină, luminează tab-ul potrivit (Sat, Coborâre, Echipă, Hartă).
2. Pe harta Satului evidențiază clădirea recomandată (Han, Topitorie, Antrenament, Misiuni). Într-o clădire deschisă evidențiază butonul corespunzător din banda clădirilor.
3. În Han indică butonul de primire a Paznicului / Arcașului / Războinicului dacă este afișat. În timpul scenelor și numirii mercenarilor, indicația dispare.
4. În Coborâre evidențiază intrarea în Mina Cenușie; după intrare marchează **Luptă** sau, când jucătorul privește un alt portret, monstrul care urmează. În luptă manuală poate evidenția **Lovește**; luptele automate nu sunt întrerupte.
5. După completarea unui obiectiv evidențiază **Primește recompensa**, înainte de a indica următorul ecran.
6. Pentru forjare: **Forjează** sau **Ridică** (când obiectul este gata). În Echipă indică butonul **Pune** al armei; dacă este filtrată, indică filtrul pentru arme. Pentru jurământul antrenamentului indică butonul real de antrenare.

**Fără indicații inutile:** dacă acțiunea nu există în DOM, butonul este dezactivat sau există un dialog peste joc, săgeata nu apare. Nu adăugăm butoane noi care să execute acțiunile în locul utilizatorului. Săgeata este decorativă și are `pointer-events:none`.

## Control și accesibilitate

- Butonul **„Ascunde ghidarea”** se află pe cardul Drumul Eroului; devine **„Arată ghidarea”** după ascundere.
- Preferința `S.jeHintsOff` este salvată împreună cu eroul și se păstrează după refresh. **Nu** este o setare a contului LIVE și nu modifică misiunile.
- Indicația se repoziționează la scroll/resize; poziția săgeții este limitată în interiorul ecranului. La prima intrare într-un ecran cu butonul în afara viewportului, butonul este adus în vedere o singură dată.
- Respectă preferința de sistem `prefers-reduced-motion`; conturul rămâne vizibil fără animații.
- Apare numai în BETA dacă `S.journeyV===1` și `S.journeyUxV===2` — adică pentru noii eroi care au primit actualul Drumul Eroului. Nu se activează pentru salvările vechi sau pentru LIVE.

## Testare

```sh
node dev/test-beta-new-hero-guidance.js
node dev/test-beta-new-player-first-captain.js
node dev/test-beta-onboarding-focus.js
node dev/test-beta-adventure-mode.js
```

Verificare vizuală încă necesară pe desktop și mobil, cu un erou BETA nou: prolog → Paznic → Han → Coborâre → Mina → prima luptă → căpitan → revendicare → Topitorie → Echipă. Testează separat dezactivarea/reactivarea ghidării și reîncărcarea paginii. Nu marca pasul 02 ca finalizat până la aceste verificări.
