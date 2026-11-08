# Silver Throne BETA — pasul 33 / SQL35: fundația pentru proveniența obiectelor

**Stare:** cod pregătit în GitHub. **Nu este instalat automat** în Supabase. Instalare manuală numai în **Silver-Throne-Test**, după SQL25–26 și SQL34. **NU LIVE.** Nu importă obiectele vechi, nu resetează salvări și nu schimbă forjarea, recompensele, statisticile, echiparea sau lupta.

## Motivul acestei etape

`game_saves.game_data` este scris încă direct din browser. Inventarul `S.inv` conține obiecte fără identificatori imuabili emiși de server; echipamentul personajelor este tot în obiectul salvat de client. Copierea acestor obiecte într-un tabel SQL **nu le transformă în obiecte autentice**. Din acest motiv nu importăm automat inventarul vechi și nu comparăm jucătorii cu o colecție server-side incompletă.

SQL35 creează o tabelă separată, privată, **`beta_item_provenance_receipts`**, destinată exclusiv obiectelor pe care un sistem viitor le va genera pe server. Un receipt conține:

- UUID-ul generat de PostgreSQL, ID-ul evenimentului din registrul economic SQL25 și numărul obiectului în acel eveniment (unic, anti-duplicare).
- Cheia catalogului, tip, nivel, raritate, calitate și seed server-side. **Nu primește statistici arbitrare din browser**.
- Data emiterii; proprietarul este determinat prin evenimentul din registrul economic, nu printr-un `user_id` inclus în payloadul clientului.

Un trigger verifică faptul că evenimentul asociat are sursa `dungeon_verified` sau `forge_verified`. În prezent nu există niciun emitent de obiecte autorizat pentru acele evenimente în joc. **Un nume de sursă din registru nu este, singur, dovada unei victorii sau a unui obiect legitim**: viitorul motor va trebui să valideze acțiunea, să genereze obiectul, să scrie registrul și receiptul în aceeași tranzacție.

Tabela are RLS activ, drepturile directe ale jucătorilor sunt revocate, iar funcția trigger nu este accesibilă prin RPC. **Nu există un buton sau RPC nou pentru a emite obiecte.** Fără acea integrare, tabelul va rămâne intenționat gol.

## Cum se instalează (numai BETA)

1. Verifică proiectul **Supabase → Silver-Throne-Test** și fă un backup BETA.
2. Confirmă SQL34 cu **9/9 verificări true** — deja confirmat pentru instalare; testul cu o lovitură reală rămâne separat.
3. Deschide [SQL35 din GitHub](https://github.com/a4f-del/silver-throne/blob/main/supabase/35-beta-server-item-provenance-foundation.sql), apoi **Raw**. Rulează întregul fișier în SQL Editor BETA.
4. Prima interogare trebuie să întoarcă **9/9 valori `true`**: `receipts_table_exists`, `receipts_rls_enabled`, `authenticated_cannot_mint`, `authenticated_cannot_read`, `anonymous_cannot_mint`, `verified_source_guard_active`, `source_guard_private`, `event_idempotency_constraint`, `sql34_preserved`.
5. A doua interogare trebuie să întoarcă **0 receipturi / 0 evenimente** într-o instalare proaspătă. Valoarea 0 este **corectă**; niciun obiect vechi nu se transformă retroactiv într-un obiect verificat.

Nu executa în LIVE; nu rula din nou SQL25, SQL26 sau SQL34. Această migrare nu afectează niciun inventar sau premiu.

## QA și ce rămâne de făcut

Test automat: `node dev/test-beta-item-provenance-foundation.js` (static + model al cheilor de eveniment). Nu execută PostgreSQL real și nu verifică în mod direct politica RLS cu un cont autentificat.

**Nu declarăm pasul 33 finalizat.** Sunt încă necesare, în această ordine:

1. Un catalog server-side și un generator deterministic al statisticilor obiectului, cu paritate față de regulile jocului.
2. Evenimente verificabile de forjare/recompensă, care emit receiptul și mișcă resursele în aceeași tranzacție, fără a avea încredere în rezultate sau obiecte declarate de client.
3. Un plan de reconciliere pentru obiectele vechi (statut *legacy/unverified*, fără ștergere, blocare ori penalizare automată).
4. Verificarea proprietății obiectelor la publicarea competiției și un motor autoritativ pentru PvP/Tron, cu teste reale de abuz, retry și reconectare.

**Atenție:** cele 9 valori `true` confirmă doar structura SQL35. Nu validează itemele, iar cele 9 valori confirmate la SQL34 indică instalarea triggerului, nu că s-a efectuat deja un atac real după instalare.
