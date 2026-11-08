# Silver Throne BETA — pasul 33 / SQL40: activități confirmate, vizibile în Bresle

**Stare:** SQL40 pregătit în GitHub; instalare manuală în **Supabase Silver-Throne-Test**, după SQL26 și SQL34. **NU LIVE.** Această etapă este prima legătură verificabilă dintre un eveniment real acceptat de server, registrul privat și o informație afișată în joc. Nu schimbă nivelul, XP, aurul, energia, obiectele sau rezultatul luptelor.

## Ce vede jucătorul

În **BETA → Bresle**, în interiorul unei bresle, apare secțiunea discretă (închisă implicit) **„Activități confirmate de server · BETA”**. Ea afișează **doar pentru propriul cont**:

- Numărul loviturilor acceptate de server la bossul Breslei după instalarea jurnalului SQL34.
- Numărul raidurilor din Lume **începute** și înregistrate de server în SQL26 (NU victorii).
- Avertizare de QA dacă evenimentele din ledger nu coincid cu contoarele cumulative existente SQL26/34. Nu sancționează sau blochează jucătorul.

UI-ul citește `beta_verified_activity_status()` după sincronizarea Breslei și reîmprospătează după o lovitură reală la boss. Nu folosește numărători din `S` sau date trimise din browser. Niciun `user_id` nu este transmis RPC-ului: serverul derivă identitatea din `auth.uid()` și verifică lista BETA. În lipsa SQL40, în caz de eroare sau la pierderea rețelei, secțiunea afișează disponibilitatea redusă și **nu întrerupe jocul**.

Acești indicatori **nu reprezintă nivelul, XP-ul sau proprietatea echipamentului**. `authoritative_for_game=false` este răspunsul explicit al RPC-ului. Nu transformăm contoare de acțiuni în puncte de progres fictive. Acesta este un flux vertical end-to-end de *evidență autoritativă a acțiunilor*, necesar înainte de mutarea progresului real pe server.

## Securitate și compatibilitate

SQL40 adaugă numai un RPC `STABLE SECURITY DEFINER`, fără parametri și fără scrieri. Registrul SQL25 rămâne privat, RLS rămâne activ, iar RPC-ul necesită un utilizator autentificat aprobat pentru BETA. `anon` nu are `EXECUTE`; utilizatorii autentificați pot citi numai propriile contoare agregate.

RPC-ul validează sursele, cheile de eveniment, flagurile SQL26/34 și faptul că evenimentele originale au diferențe economice zero. Nu citește `game_saves`. Este în mod deliberat numai pentru acțiuni deja acceptate de server. Dacă tabelele de evenimente originare sunt curățate mai târziu, ledgerul rămâne sursa pentru statisticile istorice.

Nu există migrare de salvări, resetări, recompense sau noi trigger-e pe lupte. LIVE nu se modifică: meniul Bresle este disponibil doar în BETA. Scriptul JS este activ și compatibil și înainte de instalarea SQL40, dar pentru valori trebuie instalat RPC-ul.

## Instalare — NUMAI BETA

1. Fă backup BETA și selectează explicit **Silver-Throne-Test** în Supabase.
2. Verifică SQL26 și SQL34 deja active. Nu rerula SQL21–39. SQL39 a fost verificat în BETA cu **9/9 valori `true`**, după confirmarea operatorului.
3. Deschide [SQL40 pe GitHub](https://github.com/a4f-del/silver-throne/blob/main/supabase/40-beta-verified-activity-status-rpc.sql), selectează **Raw** și rulează integral în SQL Editor BETA.
4. Prima (și singura) interogare de control întoarce **9/9 `true`**: `status_rpc_exists`, `own_status_callable`, `anon_status_denied`, `ledger_rls_preserved`, `account_rls_preserved`, `direct_ledger_read_denied`, `direct_account_read_denied`, `sql34_boss_trigger_preserved`, `sql26_raid_trigger_preserved`.
5. Reîncarcă pagina BETA, deschide **Bresle → Activități confirmate de server · BETA**. Dacă acel cont nu are evenimente de după SQL26/34, valorile `0` sunt corecte.

## Test funcțional cu un cont BETA

**Doar când dorești QA real în joc:** notează cele două valori din secțiune. Poți face o lovitură la boss pe calea obișnuită, numai dacă ai încercări disponibile. Reîncarcă/actualizează Breslele: **loviturile** trebuie să crească o singură dată. Separat, pornirea normală a unui raid PvP cu energie disponibilă trebuie să crească **raidurile începute** o singură dată — fără să se afirme vreo victorie. Nu crea artificial evenimente direct în SQL.

Verifică eroarea de rețea, schimbarea contului și retry fără dublare. QA PostgreSQL cu o sesiune neautentificată trebuie să confirme accesul refuzat. Dacă indicatorii nu coincid cu jurnalul, păstrează datele și investighează; nu penaliza utilizatorul.

## Teste automate și ce rămâne

`node dev/test-beta-verified-activity-ui.js` verifică statica SQL, privilegiile, UI cu RPC simulat, retry, izolare între conturi și afișarea datelor. Testele Node **nu execută PostgreSQL** și nu înlocuiesc QA autentificat.

**Pasul 33 nu este terminat:** adevăratul XP/nivel, progresul din temnițe, obiectele, resursele de forjare și decizia PvP/Tron încă nu au autoritate end-to-end pe server. Fluxul SQL40 demonstrează doar un tip restrâns de evenimente de încredere și oferă un indicator concret în joc pentru testarea acestei bariere.
