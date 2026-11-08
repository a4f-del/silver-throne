# Silver Throne — SQL23 BETA: audit pasiv al progresului

**Status:** cod in GitHub; migrarea NU se instaleaza automat in Supabase. Executa MANUAL doar in **Silver-Throne-Test**, dupa SQL22. NU in LIVE.

## De ce este necesar

Clientul salveaza inca intregul obiect S folosind un upsert direct in `public.game_saves` (din `cont.js`). Nu exista momentan o sursa server-side autoritativa pentru XP, aur, inventar sau echipament. SQL23 este un pas de observabilitate, NU rezolva aceasta limita de securitate.

## Schimbari

- Tabel privat `public.beta_save_progress_audit`, cu cel mult un rand pentru fiecare cont; RLS activ si drepturi directe revocate.
- Trigger `beta_save_progress_change` care captureaza fiecare salvare noua sau schimbata la `game_saves` fara sa necesite o schimbare in browser.
- Retine valori numerice sintetice: nivel, XP, aur, minereu, numar de obiecte, marimea echipei si a rezervelor.
- Retine amprente MD5 ale inventarului si echipei pentru a observa schimbari, **NU** pentru a dovedi autenticitatea obiectelor.
- Semnaleaza, doar in audit, valori negative sau schimbari foarte mari intre doua salvari: nivel >10, aur >2.000.000, XP >2.000.000, minereu >100.000, inventar >250 obiecte. Pragurile NU inseamna dovada de trisare: importurile, restaurarile si evenimentele pot cauza diferente legitime.
- Nu stocheaza intregul JSON al salvarilor si nu expune datele altor jucatori prin RPC.
- Daca auditul da eroare, triggerul emite avertizare in logurile PostgreSQL, iar salvarea de joc merge mai departe.

## Instalare

1. Confirma proiectul **Supabase Silver-Throne-Test** si fa backup.
2. Confirma SQL07, SQL21, SQL22; SQL22 fusese deja verificat cu toate cele patru valori `true`.
3. Deschide `supabase/23-beta-save-progress-audit.sql`, apasa **Raw**, copiaza tot si executa in SQL Editor din BETA.
4. Cele trei verificari de la sfarsitul scriptului trebuie sa fie `true`: `audit_table_exists`, `rls_enabled`, `save_trigger_exists`.
5. Intra in BETA cu un cont de test, schimba ceva minor (de exemplu un obiect sau o actiune care salveaza) si asteapta salvarea online. Nu folosi LIVE.
6. In SQL Editor, ruleaza:

```sql
SELECT observed_changes, flagged_changes, level_value,
       gold_value, xp_value, ore_value, inventory_count,
       party_count, reserves_count, last_flags,
       last_anomaly_flags, observed_at
FROM public.beta_save_progress_audit
ORDER BY observed_at DESC LIMIT 10;
```

Observatii: randurile deja existente in `game_saves` nu sunt copiate retroactiv; o noua salvare declanseaza captura. `last_flags` se poate goli la urmatoarea salvare normala, iar `last_anomaly_flags` ramane disponibil pana la un alt eveniment semnalat. Nu publica identificatorii sau statisticile personale.

## Test

Test static/model numeric: `node dev/test-beta-save-progress-audit.js`. Acesta NU ruleaza PostgreSQL, NU valideaza politicile RLS efectiv si NU confirma ca fiecare recompensa/inventar este legitim.

## Etapele viitoare (nu sunt implementate prin SQL23)

1. Transferul proprietatii aurului, nivelului, echipamentului si resurselor catre tranzactii server-side si comenzi de joc validate.
2. Simulator de lupta determinist cu stare/seed si rezultate calculate pe server, cu teste de paritate fata de motorul de browser.
3. Abia dupa migrari de date si teste, folosirea progresului server-side in Lume, Tron, Bresle si clasamente.

Nu reseta niciodata automat salvarile existente pe baza indicatorilor din SQL23. LIVE ramane neatins.
