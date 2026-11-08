# Silver Throne — Mod de test BETA: PvP fără cooldown între aceleași sate (SQL29)

**Stadiu:** modificările de frontend sunt în GitHub, iar SQL29 trebuie executat **manual** în Supabase **Silver-Throne-Test**. Nu rula în LIVE și nu rula din nou vechile SQL02/21 după SQL29.

## Ce oferă

În Lume, imediat sub bara de atacuri, administratorii BETA văd opțiunea **„🧪 PvP fără cooldown · BETA”**, cu butonul **Activează / Dezactivează**.

Activare:
- Elimină **numai** cooldownul de aproximativ 6 ore dintre atacurile asupra **aceluiași jucător/sat**.
- Poți relua atacul imediat după încheierea raidului anterior și trimiterea rezultatului.
- **Consumă în continuare un punct de atac** și îl recuperezi conform regulilor normale.
- Nu ocolește nivelul minim, protecția începătorilor, interdicția autoatacului, blocarea raidurilor simultane sau limitele portofelului.
- Nu acordă resurse suplimentare și nu modifică rezultatul, simulatorul sau istoricul atacurilor.

Este o setare **per cont**, dezactivată implicit, stocată într-un tabel privat Supabase. La reîncărcarea jocului este citită din nou de pe server. Poate fi dezactivată oricând. Doar administratorii înscriși în `beta_admins` o pot configura sau folosi; serverul verifică acest lucru la fiecare RPC, chiar dacă un jucător modifică interfața.

## Instalare

1. Confirmă că ești în proiectul **Supabase Silver-Throne-Test**, fă backup.
2. SQL29 depinde de SQL22 și SQL26 (deja confirmate), **nu** depinde de SQL28: îl poți instala chiar dacă SQL28 nu a fost rulat încă.
3. Deschide `supabase/29-beta-world-pvp-no-cooldown-admin.sql` în GitHub, apasă **Raw**, copiază tot și execută în SQL Editor BETA.
4. Verifică șase rezultate `true` la final:
   - `settings_table_exists`
   - `settings_rls_enabled`
   - `test_mode_rpc_callable`
   - `raid_start_respects_test_mode`
   - `sql26_ledger_trigger_preserved`
   - `direct_settings_write_denied`
5. În jocul BETA fă **Ctrl + Shift + R**, intră în **Lume**, caută sub bara de atacuri opțiunea de test și apasă **Activează**.
6. Atacă un sat încheind raidul normal, apoi repetă împotriva aceluiași sat. Butonul **Atacă** trebuie să rămână disponibil, dacă ai energie.
7. Apasă **Dezactivează**. Cooldownul normal pe același sat trebuie să reapară, în baza orei ultimului atac.

## Verificări tehnice fără a modifica date

Pentru propriul cont de administrator, poți apela RPC-ul din interfața jocului. În SQL Editor poți inspecta doar starea agregată fără a expune UUID-uri:

```sql
SELECT enabled, count(*) AS conturi
FROM public.beta_world_raid_test_settings
GROUP BY enabled
ORDER BY enabled;
```

Un rezultat gol imediat după instalare este normal: opțiunea este implicit dezactivată și nu s-au creat încă setări pentru niciun utilizator.

## Compatibilitate și securitate

- SQL29 înlocuiește **doar** `world_raid_start(uuid)`, păstrând semnătura și mecanismul de energie. Nu înlocuiește `world_raid_finish` din SQL24.
- Triggerele de audit SQL22, înregistrarea energiei SQL26 și simulatorul SQL27 continuă să fie executate la pornirea raidului.
- `world_get` continuă să returneze cooldownurile normale; `lume.js` le ignoră **doar** când serverul confirmă setarea activă.
- Tabelul `beta_world_raid_test_settings` are RLS activ, fără drepturi directe pentru anon/authenticated.
- `beta_world_raid_test_mode(p_enabled)` verifică explicit `auth.uid()` și `is_beta_admin()`; setarea nu poate fi activată de un cont neautorizat.
- Nu se șterge progres, nu se editează manual `world_raids.started_at` și nu se anulează atacurile existente.

## Limitări și depanare

Dacă apare în UI **„Disponibil după instalarea SQL 29”**, înseamnă că scriptul nu a fost încă instalat în BETA sau cache-ul Supabase nu a încărcat RPC-ul; reîncarcă pagina după instalare.

Dacă tot nu poți ataca, verifică mesajul exact: **„Nu mai ai atacuri”** este limitarea de energie, nu cooldownul dintre sate. **„Ai deja un atac în curs”** înseamnă că raidul anterior trebuie încheiat sau să expire. Aceste condiții rămân intenționat active.

**Test static:** `node dev/test-beta-world-pvp-no-cooldown-admin.js` verifică separarea BETA/LIVE, permisiunile, condițiile neocolite, butonul și scenariile de atac. Nu înlocuiește un test autentificat de PostgreSQL.