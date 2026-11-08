# Silver Throne BETA — pasul 33 / SQL39: minereu SHADOW cu proveniență din raid început

**Stare:** cod în GitHub, instalare manuală **doar** în Supabase **Silver-Throne-Test**, după SQL25/26 și SQL37/38. Nu se aplică în LIVE. Operatorul a confirmat pentru SQL38 **trei contoare la 0**. Rezultatul distinct al verificărilor structurale SQL38 9/9 nu a fost furnizat.

## Ce schimbă

SQL39 introduce o dovadă verificabilă de proveniență pentru **+1 minereu SHADOW** per *raid PvP început* cu succes prin server, conform SQL26. Aceasta nu este recompensă de victorie sau pradă: arată doar că serverul a creat un raid și a consumat energia reală. Minereul este exclusiv în registrul SQL25 (`beta_economy_accounts.ore`), care nu este portofelul jucătorului și nu este afișat ca resursă utilizabilă.

Dovada `beta_forge_shadow_ore_grants` este privată și unește ID-ul evenimentului SQL26 cu noul eveniment economic; un ID de sursă se poate credita **cel mult o dată**. Funcția internă `beta_forge_shadow_reconcile_raid_ore_internal(p_limit)` citește evenimentele din SQL26, le verifică din nou prin `world_raids`, apartenența BETA și `state='shadow'`, apoi aplică atomar +1 minereu prin mecanismul privat SQL25. Cheile de tranzacție sunt construite pe server; niciun UUID, user_id, rezultat, loot sau cantitate nu este acceptat din browser.

Funcția **nu este un RPC pentru jucători**: `authenticated`, `anon` și `PUBLIC` nu au dreptul EXECUTE, iar prezența unui `auth.uid()` respinge încercarea chiar și în cazul unei permisiuni greșite. Interogarea inițială este fără lockuri pe ledger, apoi se blochează contul și se revalidează sursa, evitând inversarea ordinii de lockuri SQL25/26/37. La concurență, după primul credit, al doilea worker sare peste eveniment; la o eroare, întreaga tranzacție se anulează.

`admin_adjustment` este folosit drept tip tehnic compatibil cu SQL25 pentru înregistrarea creditului. **Proveniența nu este susținută de această etichetă**, ci de cheia evenimentului SQL26 și de tabela separată de granturi. Nu reinterpreta ajustările administrative existente drept minereu câștigat legitim.

## Ce NU schimbă

Nu adaugă trigger pe `world_raids` și nu rescrie `world_raid_start` sau `beta_economy_apply_internal`. Instalarea singură **nu creditează nimic**; reconcilierea este o acțiune operator/worker separată. Nu modifică jocul real, energiile, victoriile, aurul, minereul local `S.ore`, inventarul, forjarea curentă, guild_api sau LIVE. Minereul SHADOW nu este minereu autoritativ câștigat din mină; este un stimul de test pentru tranzacțiile shadow.

## Instalare manuală (numai BETA)

1. Selectează **Silver-Throne-Test** în Supabase și fă backup BETA.
2. Confirmă SQL26, SQL37 și SQL38 instalate; dacă SQL38 nu avea 9/9 `true`, verifică întâi acele coloane. Nu rerula migrările anterioare.
3. Deschide [SQL39 din GitHub](https://github.com/a4f-del/silver-throne/blob/main/supabase/39-beta-verified-raid-shadow-ore-provenance.sql), apasă **Raw** și execută fișierul integral în SQL Editor BETA.
4. Prima interogare trebuie să returneze **9/9 `true`**, pentru `ore_provenance_table_exists`, `ore_provenance_rls`, `players_cannot_grant_ore`, `players_cannot_read_grants`, `anon_cannot_grant_ore`, `ore_reconciler_exists`, `players_cannot_reconcile_ore`, `anon_cannot_reconcile_ore`, `sql26_trigger_preserved`.
5. A doua interogare raportează totaluri agregate. `shadow_ore_grants=0` și `shadow_forge_operations=0` sunt așteptate la o instalare fără operațiuni anterioare. **`total_ore_shadow` poate fi diferit de 0** în caz de teste sau credite shadow anterioare; nu îl reseta și nu îl trata automat ca anomalie.

## QA opțional, numai după confirmarea structurii

După existența unui raid început în mod normal prin joc (nu direct prin INSERT), operatorul poate executa în SQL Editor **Silver-Throne-Test**:

```sql
SELECT public.beta_forge_shadow_reconcile_raid_ore_internal(5);
```

`new_ore_grants` poate fi 0 dacă nu există evenimente eligibile, sau între 1 și 5 dacă sunt. La retry aceleași evenimente nu trebuie creditate încă o dată. **Acest pas schimbă solduri shadow**, deci nu îl executa în LIVE și nu îl rula în buclă fără verificările QA. Nu este necesar pentru a instala SQL39.

Test local/CI: `node dev/test-beta-verified-raid-shadow-ore.js` (inspecție statică + model de idempotentă, concurență și rollback). **Nu este test PostgreSQL real, nu verifică politici RLS cu sesiuni autentificate și nu dovedește corectitudinea luptelor.** Progresul, echipamentul, sursele reale de minereu și emiterea obiectelor la forjarea din UI rămân neautoritare; pasul 33 nu este încheiat.
