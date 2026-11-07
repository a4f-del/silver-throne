# Remediere: butonul Campanie, world_npc_get 404, imagini/undefined.jpeg

## Cauze găsite
1. **Campanie nu răspunde / `mtab is not defined`**: `teritorii.js` genera butoane `onclick="mtab('k')"` și `mtab('l')`, dar funcția nu exista. Acest PR o definește, păstrând taburile și starea salvării.
2. **`imagini/undefined.jpeg`**: pentru un avatar cu clasă necunoscută sau incompletă, `AVF[f.c]` era `undefined` și browserul cerea un fișier inexistent. Acum se folosește `imagini/erou.jpeg` (fișier existent), iar fallbackul SVG rămâne vizibil.
3. **RPC `world_npc_get` 404 în Silver-Throne-Test**: clientul `tinut.js` întreabă Supabase despre cooldownul satelor NPC, dar funcțiile RPC nu sunt instalate în schema BETA inițială. Am adăugat două funcții BETA și o tabelă nouă, cu acces verificat pe server pentru administratorii BETA. `tinut.js` nu mai trimite simultan cereri redundante când schema nu e pregătită.

## Activare
1. Integrează PR-ul de pe GitHub.
2. În **Supabase → Silver-Throne-Test (BETA) → SQL Editor** deschide și rulează **numai** `supabase/10-beta-world-npc.sql`. **NU** aplica în LIVE și **NU** repeta `BETA-SETUP-COMPLET.sql`.
3. Confirmă că SQL Editor afișează `Success`, apoi verifică doar existența:
```sql
SELECT
  to_regprocedure('public.world_npc_get()') IS NOT NULL AS npc_get_ok,
  to_regprocedure('public.world_npc_raid(integer, integer)') IS NOT NULL AS npc_raid_ok;
```
4. Deschide `https://a4f-del.github.io/silver-throne/?server=beta`, apasă Ctrl+Shift+R, intră în **Hartă** și verifică ambele butoane **Lumea** și **Campanie**.
5. În Campanie trebuie să apară povestea **Tronul Cenușiu**, sigiliile și capitolele. Întoarce-te în Lumea și verifică dacă harta se încarcă. Verifică consola: nu ar mai trebui să apară `mtab is not defined`, `undefined.jpeg` sau 404 la `world_npc_get`.
6. Pentru satul NPC, atacă numai pe BETA; cooldownul de **4 ore** trebuie să fie individual pentru fiecare utilizator și sat.

## Siguranță
- **LIVE este păstrat neschimbat ca bază de date**. Noua funcție `mtab` și fallbackul avatarului sunt corecții globale de interfață cu comportament identic pe ambele servere.
- În SQL, `world_npc_get()` și `world_npc_raid(p_x, p_y)` sunt disponibile doar conturilor autentificate și înscrise în `public.beta_admins`. Tabela este protejată cu RLS și nu oferă acces direct la date prin API.
- Codul SQL nu șterge date. Nu este nevoie de chei secrete sau Docker.

## Limitări
Validat sintactic și cu teste unitare în cod pentru `mtab` și avatar. SQL-ul trebuie executat în BETA manual; fără acces la proiectul Supabase nu putem confirma funcțiile live sau harta din browser. Dacă o altă eroare 404 rămâne, este nevoie de URL-ul complet al resursei respective.
