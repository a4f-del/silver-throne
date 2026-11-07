# Silver Throne — Poveste + animații moderne (plan 10 misiuni, Sprint 1 implementat)

## Viziune
*Arc narativ*: **Cenușa și Jurământul**, în continuarea prologului „Ultima scânteie”.
Fiecare misiune se leagă de o acțiune deja existentă. Nu introduce repetări artificiale ale luptelor sau obligații care blochează progresul.

## Planul de 10 misiuni

| # | Titlu | Deblocare / obiectiv | Personaj / consecință | Stadiu |
| --- | --- | --- | --- | --- |
| 1 | Ultimul jurământ | Primește și numește Paznicul | Satul are din nou un apărător | **Implementat Sprint 1** |
| 2 | Sub piatra arsă | Ieși o dată cu pradă din prima mină | Urmele din cenușă duc la Arcaș | **Implementat Sprint 1** |
| 3 | Hanul celor rămași | Antrenează eroul, apoi primește și numește Războinicul | Veteranul crede din nou în sat | **Implementat Sprint 1** |
| 4 | Mâinile care vindecă | Învinge primul căpitan, apoi primește Vraciul | Răniții au un protector | Plan Sprint 2 |
| 5 | Cunoașterea interzisă | Atinge nivelul 5, explorează Lumea, primește Magul | Magul dezvăluie originea sigiliilor | Plan Sprint 2 |
| 6 | Primul semn de cenușă | Vizitează primul loc de interes din ținut | Găsești o urmă a regelui | Plan viitor |
| 7 | Sate sub cenușă | Eliberează / cucerește prima așezare | Oamenii încep să se întoarcă | Plan viitor |
| 8 | Umbra căpitanului | Învinge un căpitan important pentru Campanie | Se rupe un pas din blestem | Plan viitor |
| 9 | Primul sigiliu | Încheie primul capitol din Campania Tronul Cenușiu | Reaprinde o parte a Vetrei Regale | Plan viitor |
| 10 | Chemarea Tronului | Ajungi la nivelul 10 și deschizi Tronul | Drumul spre coroană începe | Plan viitor |

**Important:** Misiunile 4–10 sunt un plan narativ. Încă nu creează condiții, recompense sau schimbări în joc. La implementare, condițiile vor fi corelate cu progresul real al Campaniei. Nu includem recompense noi pentru ele până când sunt echilibrate.

## Sprint 1 implementat — primele 3 misiuni

### Sistem
- `poveste-misiuni.js` conține definițiile `SQ_ACT`, condițiile, panoul și recompensa.
- Progres salvat în `S.sq.claimed`, un array de ID-uri acordate. Este independent de `S.tu` (ghid), `S.cn` (progresul existent) și misiunile zilnice.
- Ordinea este strictă: misiunea 2 se deschide doar după **revendicarea** misiunii 1; misiunea 3 după revendicarea misiunii 2.
- Obiectivele pot fi îndeplinite în avans: sistemul folosește contoarele deja existente și lista de mercenari, fără să piardă progresul.
- Misiunea 1: `Paznic` există în echipă/rezervă cu nume confirmat.
- Misiunea 2: `C('l') >= 1` (prima ieșire cu pradă), care e deja pasul ghidului.
- Misiunea 3: `C('t') >= 1`, iar `Războinic` are nume confirmat.
- Recompense mici **suplimentare**, separate de ghid: #1 **20 aur**, #2 **15 minereu**, #3 **35 aur + 5 minereu**. Fiecare e acordată cel mult o dată; nu se acordă nimic automat doar prin deschiderea panoului.
- După cele trei revendicări, panoul indică încheierea primului arc și poate duce la Campanie.

### Când apare
- Doar BETA cu un erou cu `mrStoryV=1` și prolog finalizat (`mrPrologSeen=1`). LIVE și BETA fără această experiență nu primesc recompense.
- Panoul apare pe **pagina de start a Satului**, sub ghidul existent, nu forțează închiderea tutorialului.
- În **Sat → Han → 🎬 BETA · Scenele tovarășilor → 📜 Primele misiuni de poveste** există o previzualizare pentru toate conturile BETA, inclusiv cele de nivel 50; previzualizarea **nu modifică salvarea sau resursele**.
- Butonul misiunii te duce la Han, Antrenament sau Coborâre. Un inel luminos evidențiază destinația (clădire sau butonul de Coborâre).

### Animații
- Panoul apare discret (fade + deplasare 10px).
- Patru particule de cenușă luminoasă urcă lent în fundal (CSS, fără încărcare mare).
- Clădirile au reacție la hover în mod poveste; destinația misiunii pulsează.
- Progresul se umple lin.
- După revendicare, un card mic de recompensă apare la baza ecranului, cu o scânteie aurie.
- Pe mobil, panoul și butoanele se așază într-o singură coloană.
- `prefers-reduced-motion: reduce` dezactivează efectele.

## Testare recomandată pe BETA
1. Integrează PR-ul; deschide `https://a4f-del.github.io/silver-throne/?server=beta` și reîncarcă.
2. Pe un cont BETA existent, **Sat → Han → Scenele tovarășilor → Primele misiuni de poveste**. Verifică textul și animațiile de dialog, fără modificarea progresului.
3. Pentru fluxul complet, creează un erou pe **un cont BETA nou și autorizat**, nu șterge conturile de nivel 50. Parcurge prologul; pe pagina principală Sat apare „Ultimul jurământ”.
4. Recrutează/denumește Paznicul, apoi revendică **20 aur**. Revendicarea nu poate fi repetată nici după reîncărcare.
5. Revino din prima Coborâre, revendică **15 minereu**, apoi fă primul antrenament și recrutează Războinicul; revendică **35 aur + 5 minereu**.
6. Verifică în LIVE că panoul și marcajele noi nu apar.
7. Rulare regresii: `node dev/test-beta-story-quests.js` (logică, recompense o singură dată, prevenirea claim prematur, BETA/LIVE).

**Nu este nevoie de SQL**. Salvarile existente nu sunt rescrise. Testele automate nu validează aspectul final în browser; verifică și pe telefon.
