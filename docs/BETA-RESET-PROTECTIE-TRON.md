# BETA: buton de resetare a protecției regelui

Acest instrument este destinat **exclusiv** proiectului **Silver-Throne-Test**. Nu afectează Tronul LIVE.

## Instalare
1. În Supabase selectează proiectul **Silver-Throne-Test**.
2. În **SQL Editor → New query** copiază și rulează integral **`supabase/09-beta-throne-reset-protection.sql`**.
3. Confirmă că apare `Success`. Nu repeta celelalte migrări SQL.
4. Integrează PR-ul care adaugă butonul, apoi deschide `https://a4f-del.github.io/silver-throne/?server=beta` și reîncarcă pagina forțat.
5. Intră în **Tronul de Argint**. Cât timp regele este protejat, sub butonul de provocare apare **„Resetează protecția regelui”**.
6. Apasă, confirmă și verifică actualizarea stării. Un alt administrator BETA, nivel minim 10, poate provoca în continuare dacă nu are alte restricții.

## Ce face
RPC-ul `beta_throne_reset_protection()` verifică **în baza de date**, prin `public.is_beta_admin()`, identitatea și autorizarea contului. Pentru regele actual, modifică doar `public.throne_state.protect_until` la timpul curent al Tronului. **Nu** șterge regele, istoricul, provocările, cooldown-ul sau alte limite, și nu modifică datele LIVE.

Dacă butonul nu apare, verifică dacă mai există protecție activă și dacă jocul rulează pe `?server=beta`. Dacă serverul afișează eroare `Could not find the function ... in the schema cache`, rulează SQL-ul pe proiectul BETA. Nu partaja niciodată parole sau chei secrete.

## Verificare
```sql
SELECT to_regprocedure('public.beta_throne_reset_protection()') IS NOT NULL
AS reset_protectie_beta_instalat;
```
