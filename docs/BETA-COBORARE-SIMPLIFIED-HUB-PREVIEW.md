# Silver Throne BETA — Previzualizare Coborâre simplificată

**Status:** implementat în frontend pe GitHub pentru **BETA**, fără SQL și fără modificări asupra bazei LIVE. Disponibil după încărcarea noii versiuni `temnite.js?v=2026.11.08-3`. Necesită verificare vizuală în browser.

## Ce vede jucătorul

1. **Echipa pentru temniță** — este acum primul panou din Coborâre, în locul titlului repetat „AVENTURILE TALE / Coborâre” și al paragrafului introductiv. Arată eroul și mercenarii activi, oferă „Erou singur”, „Readu mercenarii” și „+ Adaugă” pentru rezerva disponibilă. `ⓘ Reguli utile` rămâne extensibil lângă el.
2. **Aventura principală** — un card mare cu imaginea temniței, căpitanul, progresul `pas/nr. pași` și un singur buton de intrare. Se recomandă cu prioritate temnița eligibilă unde există progres neîncheiat; altfel, cea mai avansată temniță disponibilă pentru nivel.
3. **Relicva săptămânii** — card compact pentru Cripta Furtunii: cheile disponibile, șansa actuală de 60% la căpitan și intrarea de o cheie, cu explicații extensibile.
4. **Turnul** — card compact cu recordul, urcările rămase, costul de intrare și detalii extensibile cu progresul, punctele de control și legendarele.
5. **Toate temnițele** — o singură listă extensibilă, închisă implicit. Include cardurile și filtrele de acces existente (temnițele care nu s-au deblocat încă rămân blocate); deschiderea rămâne memorată doar pe durata sesiunii curente în interfață.

Pe mobil, secțiunile se aliniază pe o singură coloană. În Temnița deja deschisă și în timpul unei lupte se păstrează paginile speciale existente, fără a schimba ecranul de luptă.

## Ajustări suplimentare — echipa și jurnalul (BETA)

- Controlul **„Erou singur”** din partea de sus a Coborârii are acum și **„↩ Readu mercenarii”**, plus butoane **„+ Adaugă”** lângă fiecare mercenar disponibil din rezervă. Se respectă limita echipei (3, respectiv 4 după nivelul 30), iar mercenarii în expediție sunt afișați indisponibili. Nu poți reconfigura echipa în mijlocul unei lupte.
- În pagina de pregătire a temniței, **toți cei 1–4 luptători activi** sunt prezentați în panoul din dreapta, imediat după butonul **„Luptă”**, înaintea sfaturilor secundare. Portretul adversarului, banda de progres și selectorul de dificultate sunt mai compacte; sfaturile și echipamentul recomandat au fost mutate sub **„ⓘ Sfaturi și echipament”**. Acest lucru reduce necesitatea derulării verticale la rezoluții desktop, fără să ascundă informații.
- Panoul **„Ultima luptă”** a fost eliminat din partea de sus a Coborârii în BETA. În butonul de sus **LUPTE**, prima înregistrare este evidențiată ca ultima luptă și jurnalul ei se deschide prin clic. Celelalte înregistrări sunt păstrate.
- LIVE își păstrează structura anterioară, butonul manual și jurnalul din Coborâre.
- QA nou: `node dev/test-beta-coborare-party-and-lupte.js` — verifică revenirea echipei 1–4, expedițiile, aria de pregătire și istoricul fără dubluri.


- Test suplimentar: `dev/test-beta-coborare-team-header.js` — verifică dispariția titlului vechi, afișarea panoului echipei înaintea temniței recomandate și absența duplicării controalelor.

## Ce NU se modifică

- **Cripta Furtunii:** păstrează exact cheile, eligibilitatea de nivel, costurile și șansa de relicvă. Acum este prezentată ca obiectiv săptămânal în Temnițe, nu un sistem nou.
- **Temnițe:** păstrează dificultățile Normal/Greu/Coșmar, progresul pe fiecare dificultate, costul fiecărei lupte, căpitanii, recompensele și opțiunea erou fără mercenari.
- **Turn:** păstrează nivelul de deblocare, cele trei urcări pe zi, costul de 6 puncte, punctele de control, recompensele și recordurile.
- **LIVE:** păstrează pagina veche, inclusiv cardul mare al evenimentului și cardul mare al Turnului. Implementarea este activată numai când `ST_SERVER==='beta'`.
- Fără reset de conturi, modificări SQL, monetizare nouă sau economie nouă.

## Verificare rapidă

1. Deschide `https://a4f-del.github.io/silver-throne/?server=beta` și reîncarcă forțat pagina cu **Ctrl+Shift+R**.
2. Din meniul principal intră la **Coborâre**. Trebuie să vezi *o temniță recomandată*, sub ea două carduri mai mici (Relicvă și Turn), apoi **Toate temnițele** pliat.
3. Deschide lista completă și alege o altă temniță. Butonul `Intră` trebuie să funcționeze identic cu versiunea precedentă.
4. Verifică o cheie în Cripta Furtunii și intrarea în Turn (unde nivelul și punctele sunt suficiente).
5. Schimbă contul între un începător și un jucător cu nivel înalt: doar recomandarea și disponibilitatea activităților se schimbă, nu datele salvate.
6. Verifică pe mobil: cardurile mici nu trebuie să se suprapună sau să iasă din ecran.

## Teste

`node dev/test-beta-coborare-hub.js` — test JavaScript cu nivel mic, progres existent, nivel înalt, chei epuizate și diferențiere BETA/LIVE. Testele statice și modelul UI au trecut; testarea reală în browser rămâne de făcut.

**Important:** este deocamdată o **reorganizare vizuală**, nu eliminarea mecanicii speciale pentru relicvă. Dacă designul este acceptat, putem discuta separat cum o integrare de gameplay ar afecta cele trei chei și drepturile deja câștigate.