# Silver Throne BETA — Pasul 33, SQL38: materiale SHADOW din evenimente verificate de server

**Stare:** SQL38 pregătit în GitHub; instalare manuală numai în **Supabase Silver-Throne-Test** după SQL34 și SQL37. LIVE nu se modifică. Operatorul a confirmat un rezultat de **0** pentru contoarele SQL37; verificările structurale 9/9 ale SQL37 nu au fost raportate separat.

## De ce acest pas

SQL37 are nevoie de materiale într-un portofel privat, dar soldurile din `game_saves` sunt încă declarate de browser și **nu** se pot importa ca resurse verificate. SQL38 adaugă un mecanism limitat de proveniență: poate recunoaște o lovitură **nouă și acceptată de server** împotriva bossului de breaslă (eveniment `guild_boss_hit_verified` din SQL34), legată de înregistrarea reală `guild_boss_hits` cu același utilizator, și o poate transforma în **exact un material `cal` în depozitul SHADOW**.

Aceasta dovedește numai că serverul a acceptat o acțiune de breaslă, **nu** că nivelul, echipamentul sau statisticile publicate ale acelui utilizator sunt autentice. Materialul este strict de test și **nu ajunge în depozitul real, în inventar sau în recompensele jocului**.

## Arhitectura sigură

- Tabela privată `beta_forge_shadow_material_grants` conține câte un rând per `event_ledger_id`, cu `PRIMARY KEY`. Nu permite creditarea aceluiași eveniment de două ori, inclusiv la retry.
- Funcția privată `beta_forge_shadow_reconcile_boss_materials_internal(p_limit)` găsește exclusiv evenimente SQL34 verificate printr-un JOIN la `guild_boss_hits`, fără să accepte din browser `user_id`, `damage`, `material_code` sau `quantity`.
- Lockurile SQL, limita strictă de 1–100 evenimente și `FOR UPDATE SKIP LOCKED` protejează procesarea concurentă. Rândul de proveniență și creditarea materialului au loc în **aceeași tranzacție**; la eroare se anulează ambele.
- Nici tabelul și nici funcția nu sunt accesibile direct pentru `authenticated`/`anon`/`PUBLIC`. Funcția respinge un context de jucător chiar și dacă drepturile ar fi relaxate accidental.
- **Nu există trigger automat pe boss, guild_api sau ledger.** Instalarea SQL38 nu modifică atacurile, nu adaugă recompense și nu poate face o luptă să eșueze.
- Nu se creditează **minereu, aur sau XP**. Fără o sursă autoritativă de minereu, SQL37 rămâne incapabil să forjeze obiecte în shadow: aceasta este o limitare deliberată.

## Instalare (numai BETA)

1. Verifică proiectul **Silver-Throne-Test** și fă un backup BETA.
2. Confirmă că SQL34 și SQL37 există. Dacă SQL37 nu a returnat 9/9 `true` la instalare, verifică-l înainte de a continua.
3. Deschide [SQL38 în GitHub](https://github.com/a4f-del/silver-throne/blob/main/supabase/38-beta-guild-boss-shadow-material-provenance.sql), apasă **Raw** și rulează tot scriptul în SQL Editor BETA.
4. Prima interogare trebuie să întoarcă **9/9 `true`**: `provenance_table_exists`, `provenance_rls_enabled`, `player_cannot_grant`, `player_cannot_read_provenance`, `anon_cannot_grant`, `private_reconciler_exists`, `player_cannot_reconcile`, `anon_cannot_reconcile`, `sql34_trigger_preserved`.
5. A doua interogare este agregată. **0 granturi, 0 materiale `cal`, 0 forjări shadow** sunt normale imediat după instalare. Nu șterge date dacă valorile diferă, investighează cauza.

## QA opțional cu evenimente reale

Acesta **nu** este necesar pentru instalarea SQL38. După ce există o lovitură de boss nouă și confirmată în SQL34 și după ce ai făcut backup, operatorul poate rula **numai în SQL Editor Silver-Throne-Test**, fără parametri de jucător:

```sql
SELECT public.beta_forge_shadow_reconcile_boss_materials_internal(5);
```

Rezultatul `new_material_grants` este 0 dacă nu există evenimente eligibile, respectiv numărul granturilor noi (maxim 5) dacă există. Verifică apoi agregatele din finalul SQL38. A doua rulare **nu** trebuie să crediteze din nou aceleași evenimente. Nu folosi date inventate sau INSERT-uri manuale pentru a simula loviturile reale.

Nu da `GRANT EXECUTE` utilizatorilor și nu instala niciodată această migrare în LIVE.

## Teste și ce rămâne

`node dev/test-beta-boss-shadow-material-provenance.js` verifică structura SQL, lipsa privilegiilor publice, sursa SQL34 și un model de idempotentă, retry, rollback și plafon. **Testele Node sunt statice și simulate**; nu înlocuiesc QA-ul PostgreSQL real cu autentificare, concurență și politici RLS.

Pentru trecerea la forjarea reală, mai trebuie o sursă autoritativă pentru minereu, aur și materiale, un nivel verificat pe server, regula completă de reușită/eșec și consumul aurului la eșec, plus integrarea inventarului/echipamentului și reconcilierea fără reset a obiectelor legacy. Pasul 33 rămâne deschis.
