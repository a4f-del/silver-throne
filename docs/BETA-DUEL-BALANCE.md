# Echilibrare dueluri Tron BETA (eroi vs eroi)

## Problema observată
La nivel 50, cu echipamente identice, provocatorul putea elimina regele dintr-o singură lovitură. În motorul actual atacatorul beneficiază de abilități speciale și critice, în timp ce apărarea publicată este o fantomă cu statistici de bază; în plus atacatorul începea mereu primul.

## Schimbările din acest PR
- **Exclusiv în BETA și doar împotriva unei fantome reale de jucător la Tron:** fiecare lovitură individuală produce cel mult **38% din viața maximă a țintei**; daunele sub limită nu sunt modificate.
- Cap-ul se aplică simetric: lovituri ale provocatorului și atacul fantomei regelui. La viață completă, o singură lovitură nu poate câștiga meciul.
- **Inițiativa este aleasă 50/50** pentru provocator sau rege. Dacă regele începe, atacă o dată înainte de primul atac al provocatorului. Aceasta este înregistrată în jurnalul luptei și în starea locală.
- Gărzii Regale (Tronul gol), luptele din Lume și LIVE **nu** li se aplică noile reguli.
- Nu este necesar niciun SQL nou în Supabase; nu atingem baza de date și nici cele 7 conturi LIVE.

## Testare manuală
1. Integrează PR-ul, intră în `?server=beta` și reîncarcă pagina forțat.
2. Cu două conturi BETA nivel 50, aceeași echipare, publică din nou apărarea regelui.
3. Dacă există protecție, folosește **Resetează protecția regelui** (opțiunea deja instalată BETA).
4. Provoacă de câteva ori și urmărește jurnalul luptei: „Inițiativa duelului: regele atacă primul!” sau „provocatorul atacă primul!”.
5. La viață completă, un atac nu trebuie să elimine un erou într-o singură lovitură. Când atacurile sunt suficient de puternice încât să atingă limita de 38%, sunt necesare cel puțin 3 lovituri pentru a învinge.
6. Confirmă că echipa revine după duel și că în **LIVE** sistemul actual nu s-a schimbat.

## Limitări
- Aceasta este o **primă calibrare**, nu garanția unei rate exacte de victorie 50/50. Efectele abilităților, specializărilor și obiectelor pot favoriza anumite configurații; regele încă atacă în mod normal, cu multiplicatorul vechi 1,62×.
- Jocul calculează rezultatul în browser, iar rezultatul nu este autoritativ validat de server (risc de manipulare). Nu promovăm noua regulă în LIVE fără teste și fără protecții anti-trișat.
- Între lupte, vindecă eroul înainte să compari șansele, altfel un personaj deja rănit poate pierde mai repede.
