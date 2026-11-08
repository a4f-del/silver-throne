# Silver Throne BETA — Pasul 32: corectitudinea botului Premium

Data: 8 noiembrie 2026. Schimbare BETA de echitate competitivă, fără SQL și fără resetări de cont.

## Problema descoperită în cod

Botul Premium actual poate funcționa la intervale de 1,5 secunde atât timp cât pagina este deschisă. În varianta anterioară, `botTick0()` putea:
- porni și continua automat coborâri în Temnițe;
- iniția forjări repetate folosind materialele existente;
- ridica obiectele forjate, echipa obiecte și vindeca cu aur;
- în LIVE, iniția și raiduri automate pe sate.

Deși cheltuie aceleași puncte și resurse, **automatizarea continuă a Temnițelor produce timp de progres suplimentar** pentru un serviciu Premium, potențial avantaj în nivel, echipament și competiția socială. Folosirea `S.prem` exclusiv în browser nici nu reprezintă o dovadă server-side a abonamentului.

## Regula BETA după această schimbare

**Asistentul Premium este doar pentru confort**. Poate, când pagina este deschisă:
- colecta automat un obiect deja forjat și finalizat;
- echipa automat un obiect deja deținut;
- vindeca/ridica luptători folosind exact aurul și regulile normale.

**Nu poate** porni sau avansa Temnițe, raiduri, aventuri sau forjări noi. Dacă există o luptă sau aventură activă, asistentul nu intervine. Luptele pornite manual păstrează automatizarea de luptă accesibilă tuturor jucătorilor prin opțiunile normale ale jocului, nu prin exclusivitatea Premium.

În BETA, fila Bot se numește „Asistent Premium · doar confort” și arată numai cele trei opțiuni utile. Configurațiile vechi pentru Temnițe și forjări rămân salvate dar nu se execută în BETA. LIVE păstrează botul existent, nemodificat, până la decizia unei tranziții explicite.

## Ce am păstrat
- Obiectele și statisticile personajelor, progresul actual, timpul de forjare și materialele cheltuite.
- Prețurile de vindecare și aurul pentru echipare/cumpărare.
- Toate skinurile/portretele Premium și elementele cosmetice.
- Recompensele de Temniță, Turn, Bazar și PvP — niciuna nu a fost crescută.
- Funcțiile LIVE, inclusiv vechiul bot, nu sunt modificate.

## Limitarea anti-cheat

Această modificare este o **regulă corectă în clientul BETA oficial**, nu un sistem împotriva browserelor modificate. Datele de inventar/putere transmise de client sunt încă vulnerabile la falsificare dacă serverul le acceptă arbitrar. Pasul 33 trebuie să introducă autoritatea serverului pentru competiție înainte de extinderea publică. Nu prezentăm acest pas drept protecție completă împotriva trișării.

## Teste automate

```sh
node dev/test-beta-premium-bot-fairness.js
```

Testul forțează în simulator scenarii de luptă activă, aventură activă, forjare finalizată, echipare, vindecare și Premium dezactivat. Verifică faptul că în BETA nu se apelează niciodată `bdesc`, `bdown`, `braid`, `bcraft` și că LIVE păstrează traseul anterior.

## QA manual

1. Cu cont Premium BETA și bot activ, lasă pagina deschisă într-un Sat fără luptă: botul nu trebuie să intre singur în Temnițe sau să înceapă forjări.
2. Cu un obiect forjat deja finalizat, botul îl poate colecta; cu un obiect bun deja deținut îl poate echipa; pentru vindecare consumă aurul normal.
3. Într-o Temniță pornită manual, asistentul nu trebuie să avanseze automat camerele. Opțiunile de luptă automate **generale** rămân funcționale.
4. Cu Premium oprit, nu se execută nicio acțiune, chiar dacă setările au fost salvate anterior.
5. Pe LIVE și BETA verifică separat interfața veche și nouă. Nu modifica manual solduri sau clasamente.
6. Pentru a compara competitivitatea reală, măsoară progresul per oră activă (nivel, echipament, etaje, aur) între utilizatori Premium/ne-Premium după controlul nivelului și timpului petrecut în joc.

**Status:** limitarea funcțiilor din BETA este implementabilă și testabilă automat; pasul 32 rămâne nebifat până la QA vizual și analiză de echitate din date reale. Nu necesită SQL.
