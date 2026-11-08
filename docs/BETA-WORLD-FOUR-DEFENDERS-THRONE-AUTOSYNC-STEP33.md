# Silver Throne — Pasul 33 / SQL30: apărarea satului cu 4 luptători și Tron automat (BETA)

**Status:** cod JS în GitHub; **SQL30 se instalează MANUAL numai pe Supabase Silver-Throne-Test**. LIVE nu se modifică la nivel de bază de date. Nu șterge conturi, progres, echipament sau raiduri.

## Reguli noi

**Lume / apărarea satului**
- Publică **echipa activă**, nu un grup separat: eroul + până la 3 mercenari, maximum **4** luptători începând cu nivelul **30**.
- Sub nivelul 30, limita rămâne de 3 luptători, conform `TMAX()` din joc. Eroul singur sau o echipă incompletă sunt acceptați.
- Statistica fiecărui apărător este extrasă prin `tronTeamUnits()`, folosind `mhp(f)`, `atkOf(f)`, `bon(f)` și trăsăturile, incluzând echipamentul actual.
- În BETA, `lwFight` folosește `TT.throneDuelUnit` pentru fantomele Lumii, pentru a **nu tăia viața/atacul/apărarea la vechile praguri de nivel 40**. Rămâne multiplicatorul de atac al fantomei de 1,62. LIVE păstrează plafonul anterior.
- Echipa se republică automat în BETA la schimbarea echipamentului, echipei sau statisticilor, inclusiv din afara hărții, după o scurtă pauză pentru a grupa modificările. Sunt trimise doar schimbările de instantaneu.
- SQL30 schimbă numai validatorul `world_units_ok`, adaugă un trigger pentru limita 3/4 după nivel și actualizează `CHECK actions_count` al simulatorului SQL27 de la 240 la 320 pentru luptele 4v4.
- SQL28 rămâne esențial: limitele per clasă (10× referințele statice) protejează împotriva publicării unor valori exagerate. SQL30 **refuză instalarea dacă SQL28 nu este instalat cu trigger activ**.

**Tron / apărarea eroului**
- În BETA este în continuare **1v1, erou contra erou**.
- Nu mai este necesară apăsarea pe „Actualizează apărarea”: la conectare și după schimbarea nivelului, numelui sau a statisticilor eroului din echipament, clientul publică automat noul instantaneu prin `throne_publish`. Urmărește o semnătură locală pentru a evita RPC-uri repetitive.
- O luptă activă nu declanșează modificarea apărării; după revenirea la joc, se reia verificarea.
- Dacă publicarea eșuează, se reîncearcă cu temporizare și se afișează un mesaj în fila Tron. Fără acces la server, ultima apărare publicată rămâne cea existentă.
- **Limitare:** inventarul și statisticile provin încă din client, nu există dovadă server-side a fiecărui obiect. Publicarea automată este confort, nu anti-cheat complet. Nu schimbă rezultatul duelurilor.

## Corecție SQLSTATE 42P13 — parametrul existent `u`

Versiunea inițială din GitHub definea `world_units_ok(p_units jsonb)`, deși funcția deja instalată de SQL02 avea argumentul numit `u`. PostgreSQL refuză redenumirea unui parametru cu `CREATE OR REPLACE FUNCTION` și semnalează `42P13`.

**Corecția este deja aplicată:** SQL30 păstrează `world_units_ok(u jsonb)` și folosește `u` în corp. Nu executa sugestia PostgreSQL de `DROP FUNCTION`; există funcții și triggere dependente. Dacă întregul SQL30 a fost rulat într-o singură tranzacție, eroarea a anulat migrarea, fără să schimbe datele. Copiază din nou fișierul actualizat din **Raw**, execută tot SQL30 doar în BETA și verifică toate cele șapte rezultate `true`. Nu este nevoie să rerulezi SQL28.

## Corecție SQLSTATE 42601 — condiția de la linia 94

O versiune anterioară a SQL30 folosea `CASE WHEN NEW.level>=30 THEN 4 ELSE 3 END THEN` direct în condiția `IF` din triggerul `beta_world_team_size_by_level_guard`. Pentru a elimina ambiguitatea de parsare, acum funcția setează mai întâi variabila `v_max_units` (3 implicit, 4 de la nivelul 30) și o compară în `IF`.

**Important:** eroarea `syntax error at end of input` poate apărea și dacă în SQL Editor a ajuns o selecție incompletă. Folosește pagina **Raw** actualizată și copiază scriptul **integral** (aproximativ 160 de linii), inclusiv `COMMIT;` și interogarea finală cu cele șapte verificări. Nu executa doar primele 94 de linii. Nu folosi `DROP FUNCTION` și nu rerula SQL02/27/28.

Dacă ai executat întreg scriptul într-o tranzacție `BEGIN; ... COMMIT;`, eroarea a anulat tranzacția. Reia întregul SQL30 actualizat în BETA.

## Ordine de instalare

1. Confirmă proiectul **Silver-Throne-Test** și fă backup.
2. **Dacă SQL28 nu a fost instalat**, rulează-l înainte. SQL28 are un preflight care poate refuza personajele deja peste limite; nu modifica progresul ca să forțezi instalarea.
3. SQL29 (opțiunea PvP fără cooldown) este **independent**; dacă îl folosești deja, SQL30 nu îi suprascrie `world_raid_start`.
4. Copiază `supabase/30-beta-world-four-unit-defense.sql` prin **Raw** în SQL Editor BETA și rulează-l integral.
5. Confirmă că toate cele **7** verificări sunt `true`: `world_accepts_four_units`, `world_rejects_five_units`, `level_30_slot_guard_active`, `sql28_class_limits_preserved`, `sql27_simulator_preserved`, `simulator_four_unit_limit`, `level_guard_private`.
6. Reîmprospătează BETA cu **Ctrl+Shift+R** ca să încarci scripturile noi.

**Nu relua SQL02, SQL21, SQL27 ori SQL28 după SQL30:** SQL02 ar readuce limita de 3, SQL27 este migrarea istorică pentru max 240 acțiuni, iar SQL21 sau SQL02 pot suprascrie RPC-urile mai noi. Fiecare versiune nouă se instalează numai în ordinea specificată.

## Test BETA cu eroul nivel 30+

1. Pune **eroul și 3 mercenari** în echipa activă. Nu intra într-o luptă.
2. Intră în **Lume**; apărarea trebuie să se publice fără erori.
3. În SQL Editor BETA, rulează doar citire:

```sql
SELECT w.name, w.level, jsonb_array_length(w.units) AS defenders,
       jsonb_agg_units.units AS squad
FROM public.world_players w
CROSS JOIN LATERAL (
  SELECT jsonb_agg(jsonb_build_object('name',u->>'n','class',u->>'c'))
    AS units FROM jsonb_array_elements(w.units) u
) jsonb_agg_units
WHERE jsonb_typeof(w.units)='array' AND w.level>=30
ORDER BY w.seen_at DESC LIMIT 10;
```

Verifică pentru contul tău coloana `defenders=4`. Folosește numai proiectul de test; nu publica liste de utilizatori.

4. Cu un al doilea cont BETA, pornește un raid asupra satului respectiv. Ar trebui să apară **4 apărători** în lupta reală. SQL22 păstrează instantaneul la început, iar SQL27 poate genera o simulare 4v4.
5. Cu eroul propriu, schimbă arma sau armura, apoi așteaptă sincronizarea: în **Tron** trebuie să vezi mesajul de publicare automată. Dacă eroul este eligibil (nivel minim 10), valorile publicate trebuie să se modifice fără apăsarea vreunui buton.
6. Verifică în SQL Editor BETA apărarea reală a Tronului:

```sql
SELECT p.level, jsonb_array_length(p.units) AS throne_defenders,
       p.units->0->>'hp' AS hero_hp,
       p.units->0->>'atk' AS hero_atk,
       p.units->0->>'def' AS hero_def,
       p.updated_at
FROM public.throne_profiles p
WHERE p.duel_version=2
ORDER BY p.updated_at DESC LIMIT 10;
```

`throne_defenders` trebuie să fie **1**. După un schimb de echipament care modifică statisticile, `updated_at` ar trebui să se schimbe și valorile să corespundă eroului.

## Teste și limite

- `dev/test-beta-world-four-defenders-throne-autosync.js`: verificări statice și model JS; nu execută SQL în PostgreSQL.
- `dev/test-beta-pvp-throne-clarity.js` și `dev/test-beta-pvp-opponent-suggestions.js`: actualizate pentru 4 apărători.
- Cele 7 verificări SQL nu demonstrează că echipamentul este proprietate verificată server-side sau că simularea SQL27 produce verdict oficial. Pasul 33 rămâne deschis până la reconcilierea inventarului și a luptei pe server.

Nu sunt necesare ștergeri de conturi sau resetări ale progresului.