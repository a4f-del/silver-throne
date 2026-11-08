# Silver Throne BETA — SQL37: tranzacție de forjare SHADOW (fără schimbarea jocului)

**Status:** cod pregătit în GitHub; SQL37 trebuie instalat manual, numai în **Supabase Silver-Throne-Test**. Operatorul a confirmat pentru SQL36 **9/9 verificări true** și `receipturi_inainte_de_emitent = 0`. SQL37 nu este instalat automat. LIVE rămâne neatins.

## Ce rezolvă, ce NU rezolvă

SQL37 creează primul circuit intern **atomic** pentru o forjare care poate produce un receipt autentic SQL35, folosind generatorul privat SQL36. Include:

- Solduri de materiale **SHADOW** în `beta_forge_shadow_materials`, complet separate de `game_saves.S.mat` și de banii vizibili jucătorului.
- Jurnalul privat `beta_forge_shadow_operations`, cu cheie unică `(user_id,request_id)`, legată de evenimentul SQL25 și de unicul receipt SQL35.
- Calcul al costului de minereu conform formulei actuale `Math.round(RAR[r].cost*(1+l*.3))`, plus materiale de afix și raritate din obiectul determinist SQL36. Pentru Epic reușit cere și cinci fragmente. **Nu implementează încă pierderea aurului la eșec, șansa de reușită sau timpul de forjare.**
- Un commit intern care blochează contul economic cu `FOR UPDATE`, verifică toate soldurile private, scade minereul prin `beta_economy_apply_internal`, scade materialele, creează receiptul și înregistrează operațiunea **în aceeași tranzacție PostgreSQL**. Un eșec la orice etapă anulează întreaga tranzacție; un retry cu același ID și aceeași rețetă întoarce rezultatul existent fără un nou debit.
- Seedul pentru obiect este creat **exclusiv de PostgreSQL**, nu din browser.

**Delimitări importante:** Nu este conectat la butonul actual *Forjează*. Nu alimentează soldurile shadow din inventarul, aurul sau minereul clientului. Nu creează recompense în `S.inv` și nu schimbă `S.forge`, `game_saves`, `guild_api`, PvP sau Tron. Într-o instalare nouă, materialele shadow sunt **zero**, iar registrul SQL25 nu este finanțat din salvarea locală. Ca urmare, operațiunile nefinanțate eșuează: acesta este comportamentul **sigur**, nu un bug.

**Acces:** funcțiile `beta_forge_shadow_quote_v1` și `beta_forge_shadow_commit_internal` nu au permisiune EXECUTE pentru `anon`, `authenticated` sau `PUBLIC`. Commitul respinge și sesiuni care au un `auth.uid()`, chiar dacă ar apărea un grant accidental. Doar un backend privilegiat și controlat ar putea folosi ulterior funcția. Nu oferim un endpoint de mint jucătorilor.

## Cazurile de margine păstrate intenționat

- *Bijuterie Magic/Rar/Epic*: exclusă din commitul shadow v1. Clientul calculează materialele de prefix cu `PA`, dar generează prefixul bijuteriei din `PJ`; pentru a evita plata necorespunzătoare, nu presupunem că sunt paritare. Bijuteriile Comune sunt acceptate în model.
- *Nivelul jucătorului*: încă nu este autoritativ. Înaintea conectării la un flux public, un backend trebuie să stabilească nivelul de eligibilitate din progres verificat, **niciodată** din `game_saves`.
- *Afixe*: SQL36 le extrage determinist din seed; UI permite alegerea unor afixe. Această fază nu înlocuiește alegerea jucătorului și nu pretinde paritate a procesului complet de forjare.
- *Eșec la forjă*: nu este tratat încă; SQL37 modelează **doar emiterea reușită în SHADOW**. Costul aurului la eșec și restituirea parțială a materialelor trebuie implementate și testate separat, înainte de activarea forjei online.
- *Inventar legacy*: nu importăm, nu ștergem și nu blocăm obiectele vechi. Nu convertim date trimise de browser în dovadă autoritativă.

## Instalare manuală, exclusiv BETA

1. Confirmă că proiectul Supabase activ este **Silver-Throne-Test** și fă backup BETA.
2. Nu rerula SQL25–36. Confirmarea anterioară pentru SQL36 este **9/9 true** cu **0 receipturi**, ceea ce este compatibil cu precondițiile.
3. Deschide [SQL37 pe GitHub](https://github.com/a4f-del/silver-throne/blob/main/supabase/37-beta-shadow-forge-atomic-internal.sql), selectează *Raw* și execută întregul script în SQL Editor BETA.
4. Prima interogare de diagnostic trebuie să întoarcă **9/9 `true`**. Coloanele sunt `private_materials_exist`, `private_operations_exist`, `material_rls_enabled`, `operations_rls_enabled`, `direct_spend_denied`, `forge_not_callable_by_players`, `forge_not_callable_by_anon`, `basic_quote_fixture` și `sql35_guard_preserved`.
5. A doua interogare prezintă trei contoare agregate. În această fază, **0 operațiuni, 0 rânduri de materiale, 0 receipturi** sunt de așteptat. Dacă există date, nu le șterge; oprește investigarea și verifică sursa cu QA.

**Nu apela manual funcția internă `beta_forge_shadow_commit_internal` și nu alimenta soldurile shadow din valorile salvate ale unui jucător.** Nu expune EXECUTE prin GRANT pentru `authenticated`. Instalarea scriptului doar creează componentele; nu forjează un obiect și nu taxează niciun cont.

## Teste și următoarele acțiuni

`node dev/test-beta-shadow-forge-atomic.js` verifică structura SQL, regulile de acces, calculele de cost pentru cazuri reprezentative și o simulare JS a tranzacției, idempotentei și anulării la sold insuficient. **CI Node nu execută PostgreSQL, nu autentifică utilizatori Supabase și nu demonstrează încă tranzacții reale.** Testarea cu două sesiuni, concurență și fonduri shadow autentificate rămâne necesară după introducerea unei surse de resurse verificate server-side.

**Pentru activarea reală a forjării** mai avem de realizat depozitul autoritativ al resurselor, progresul/nivelul verificat, șansa și timpul de forjare, consumul aurului la eșec, materialele de bijuterii și interoperabilitatea de inventar/echipare. Abia după acestea putem muta UI-ul din browser către RPC fără risc pentru conturile existente.
