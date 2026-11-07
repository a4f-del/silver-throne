# Silver Throne BETA — Pasul 04: prima pradă și prima armă

Data: 7 noiembrie 2026 · implementare BETA, fără SQL.

## Ce schimbăm pentru eroii NOI

**Prima pradă**: după învingerea Căpitanului Cenușii în Mina Cenușie, `leave()` capturează o singură dată cantitățile efective de aur, minereu, experiență și lista obiectelor câștigate. Rezumatul apare în același card `Drumul Eroului → Cenușa de la poartă`, înainte de revendicarea premiului jurământului. **Prada din temniță și premiul jurământului sunt două recompense diferite**; nu se acordă nimic suplimentar prin rezumat. Dacă nu s-a obținut un obiect (drop aleatoriu), jocul explică acest lucru și indică Topitoria. Datele se salvează în `S.jeFirstLoot`; nu există flux separat de revendicare a prăzii.

**Prima armă**: în pasul `Oțel pentru cei rămași`, ecranul Echipă primește deasupra filelor obișnuite un card care recomandă o armă din rucsac potrivită clasei eroului. Dacă slotul este gol, arată acest lucru simplu, fără statistici avansate. Butonul **„Pune pe Erou”** selectează eroul și apelează funcția normală `equip(i)` cu **indexul real din S.inv**, înregistrând același contor de echipare ca întotdeauna. Dacă nu există armă potrivită, apare butonul **„Mergi la Topitorie”**.

**Topitoria**: un mesaj scurt pentru pașii `Urmele din cenușă` și `Oțel pentru cei rămași` explică selectarea **Tip: Armă → Sabie**, potrivită pentru Campion. Butonul **„Selectează sabia eroului”** modifică doar opțiunile de forjare din interfață, fără a consuma materiale, fără a crea item și fără a schimba șansa de succes. Jucătorul apasă în continuare butonul obișnuit `Forjează` și ridică rezultatul.

**Ghidarea cu o singură săgeată** urmărește acum și noul buton de echipare sau butonul de selectare a Sabiei, fără overlay suplimentar.

## Restricții de siguranță

- Doar `ST_SERVER==='beta'` și eroii cu `S.journeyV===1` + `S.journeyUxV===2`. LIVE și salvările BETA mai vechi sunt neschimbate.
- Nu sunt schimbate dropurile, procentele de forjare, resursele, costurile, inventarul sau bonusurile de clasă; **nu există armă garantată** după primul căpitan.
- Pradă capturată o singură dată, după aplicarea încasării prin `leave()`; reîncărcarea nu dublează recompensele.
- Echiparea folosește motorul original: dacă personajul selectat anterior era un mercenar, noul buton comută la erou.
- Nu se forțează un slot sau o clasă nepotrivită; toate celelalte arme rămân disponibile în rucsacul normal.
- Nu sunt necesare migrări SQL.

## Teste

```sh
node dev/test-beta-first-loot-weapon.js
node dev/test-beta-new-player-first-captain.js
node dev/test-beta-new-hero-guidance.js
node dev/test-beta-onboarding-focus.js
```

## Verificare vizuală necesară în BETA

1. Erou nou, Mina Cenușie → căpitan învins → în `Drumul Eroului` apar cantitățile reale; dacă nu a căzut obiect, mesajul nu promite unul.
2. Revendică premiul jurământului: se acordă o singură dată și cardul de pradă nu mai concurează cu pasul Arcașului.
3. Primește Arcașul, forjează și ridică o **Sabie** la Topitorie.
4. Intră în Echipă: cardul arată numele armei și **„Pune pe Erou”** deasupra echipamentului (inclusiv dacă fila activă pe mobil este „Echipament”).
5. Dacă era selectat Arcașul, butonul echipează tot **Eroul**, fără să modifice echipamentul Arcașului.
6. Verifică scenariul fără armă în rucsac: recomandarea duce în Topitorie, unde se poate selecta Sabia fără cost.
7. Închide/reîncarcă pagina între boss, forjare și echipare: nu se dublează aurul, prada sau obiectele.
8. Verifică mobil 390×844 și desktop 1366×768; butonul este vizibil, fără un popup care să acopere jocul.

**Pasul 04 rămâne nebifat** până când este verificat vizual. Pasul 03 a fost acceptat de utilizator în BETA.
