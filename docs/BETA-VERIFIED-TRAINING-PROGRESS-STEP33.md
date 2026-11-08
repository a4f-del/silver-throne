# Silver Throne BETA — Pasul 33 / SQL41: progres de antrenament verificat pe server

**Status:** implementat în GitHub și interfața BETA; SQL41 necesită instalare manuală **numai în Supabase Silver-Throne-Test**, după SQL40. Operatorul a confirmat că SQL40 funcționează în joc. **NU LIVE.** Nicio resetare a salvărilor sau modificare a XP-ului eroului.

## Ce devine real pe server

Acesta este primul **nivel calculat integral pe server din evenimente independente de browser**, dar este în mod deliberat un **nivel SHADOW de antrenament**, nu nivelul personajului.

Funcția existentă `beta_verified_activity_status()` (SQL40) continuă să întoarcă aceleași chei pentru UI și primește un obiect nou `verified_training`. Experiența de test provine exclusiv din `beta_economy_ledger`:

- **25 XP de test** pentru fiecare lovitură la bossul Breslei acceptată de server (SQL34).
- **5 XP de test** pentru fiecare raid **început**, cu energie consumată pe server (SQL26). Un start nu este o victorie, deci nu acordăm XP real de luptă.
- Nivelul de test este `min(50, 1 + floor(XP_test / 100))`. Fiecare prag de 100 de puncte crește doar nivelul SHADOW, fără beneficii. Calculul este determinist, limita XP de test este 1 miliard, iar toate valorile provin din datele serverului.

Nu există endpoint pentru introducerea de XP, nivel, cantitate, rezultat sau `user_id`. Funcția folosește `auth.uid()`, verifică accesul la BETA, citește numai jurnalul privat și returnează valori pentru propriul cont. Reexecutarea unei cereri sau reîncărcarea nu poate dubla XP-ul de test: aceleași evenimente din registru sunt numărate exact o dată.

## Unde se vede

În **BETA → Bresle → Activități confirmate de server · BETA**, în secțiunea deja existentă se afișează în plus:

**Antrenament verificat (SHADOW): N XP de test · nivel de test M**

Valoarea nu este afișată în bara de nivel a eroului și nu este folosită la Temnițe, Tron, PvP, echipament, clasamente, recompense sau costuri. Panoul rămâne închis implicit; înainte de instalarea SQL41, contoarele SQL40 se afișează în continuare fără nivel de test.

## De ce NU am sincronizat S.lvl și S.xp

În prezent progresul principal este acordat local la colectarea prăzii din Temnițe (`S.xp += d.loot.xp`), iar `game_saves` este scris de browser. Nu există încă un eveniment de **victorie în Temniță** cu rezultat autoritativ server-side, nici reconciliere pentru conturile existente. Folosirea XP-ului de test drept nivelul real al eroului ar reseta/denatura progresul, iar creditarea pe startul unui raid ar permite creșterea nivelului fără victorie.

Prin urmare, SQL41 implementează calculul și afișarea unei prime forme de progres **independent de client**, dar **nu încheie** validarea nivelului real. Următorul obiectiv este o luptă/recompensă autoritativă (de exemplu un rezultat de Temniță decis de server), apoi un plan sigur de reconciliere a progresului legacy.

## Instalare manuală și QA — doar BETA

1. Selectează proiectul **Silver-Throne-Test**, fă backup BETA și verifică RPC-ul SQL40 funcțional.
2. Deschide [SQL41 pe GitHub](https://github.com/a4f-del/silver-throne/blob/main/supabase/41-beta-verified-training-progression-rpc.sql), selectează *Raw* și rulează integral în SQL Editor **BETA**. Nu rerula SQL21–40.
3. Prima (și singura) interogare de diagnostic întoarce **9/9 valori `true`** pentru: `status_rpc_exists`, `user_can_read_own_status`, `anon_cannot_read`, `ledger_rls_preserved`, `ledger_private`, `training_fields_installed`, `boss_xp_rate_fixed`, `raid_xp_rate_fixed`, `owner_identity_enforced`.
4. Reîncarcă BETA și deschide Bresle → Activități confirmate de server. Ar trebui să vezi și XP-ul/nivelul **SHADOW**. O valoare inițială de 0 XP, nivel 1, este normală.
5. Opțional, cu un cont BETA care are încercări disponibile, fă o lovitură normală la boss: XP-ul de test trebuie să crească cu exact **25**, o singură dată. Un raid nou început normal crește cu exact **5**. Folosește două conturi pentru a verifica izolare și reîncarcă pentru idempotentă. Nu crea evenimente de test direct în SQL.

**Teste automate:** `node dev/test-beta-verified-training-progress.js` compară regulile deterministe, privilegiile, compatibilitatea SQL40 și UI cu date simulate. CI nu execută PostgreSQL sau lupte reale și nu certifică autoritatea nivelului eroului.

**LIVE și salvările existente rămân neatinse.**
