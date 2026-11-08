# Silver Throne BETA — pasul 33: control de lansare și proveniență competitivă

**Stare:** diagnostic de observabilitate, nu soluție anti-cheat. Nu schimbă mecanicile de luptă, verdictul PvP/Tron, recompensele, inventarul sau progresul. Nu se rulează în LIVE.

## De ce

SQL21–33 limitează statistici, păstrează instantanee, auditează evenimente și simulează lupte, dar încă **nu poate demonstra că un echipament aparține contului sau că o victorie s-a produs**. În special, SQL33 consemnează `p_win` trimis de browser, nu o decizie a unui arbitru server-side. Rapoartele de Temniță/Turn ale breslei conțin un UUID generat în browser; deduplicarea și plafonul zilnic nu demonstrează victoria.

Pentru a nu promova accidental această protecție parțială drept „anti-cheat complet”, `supabase/CHECK-beta-competitive-authority-gates.sql` face trei interogări **doar pentru citire**:

1. Inventariază componente SQL23/25/26/27/31/32/33 și marchează explicit cele **șase blocaje de lansare** ca nerezolvate. `observed=true` indică cel mult existența mecanismului, nu validarea sa sau faptul că pasul 33 este gata.
2. Arată, agregat pe tip, numărul raportărilor Breslei și al raportorilor unici în ultimele 7 zile, fără identificatori.
3. Numără intervalele de un minut în care un jucător a raportat multe evenimente de același tip. Acestea sunt **indicii de QA**, nu dovezi de fraudă, nu declanșează sancțiuni și nu schimbă limitele jocului.

## Execuție manuală (numai BETA)

Deschide proiectul **Supabase Silver-Throne-Test** → SQL Editor și rulează [diagnosticul read-only](https://github.com/a4f-del/silver-throne/blob/main/supabase/CHECK-beta-competitive-authority-gates.sql). Necesită schema breslelor SQL14 și mecanismele BETA instalate. Nu repeta migrările SQL21–33, nu copia acest script în LIVE și nu îl transforma într-o poartă automată care ar aproba lansarea.

Interpretare: `release_blocker` rămâne `sufficient_for_public_competition=false` **intenționat**. Pentru `evidence_only`, `observed=false` indică un mecanism absent sau un posibil nume diferit de obiect; verifică schema efectivă înainte de orice schimbare. În cazul unor raportări foarte rapide, investighează QA într-un mediu izolat. Nu șterge evenimente, nu penaliza jucători și nu inferea trișare dintr-un vârf.

## Criteriile reale de închidere a pasului 33

- Progres, inventar, obiecte, upgrade-uri și echipament cu sursă autoritativă server-side, reconciliate cu salvările existente **fără reset**.
- Rezultat PvP și Tron decis/verificat de un motor server-side paritar cu lupta reală, cu retry idempotent, protecție la curse și teste cu două conturi BETA.
- Contracte de breaslă care progresează din evenimente verificate pe server, nu din UUID-uri generate în browser.
- Recompense plătite atomic pentru evenimente verificate și teste de autorizare, rate limit, reconectare și scenarii abuzive.

Test local/CI: `node dev/test-beta-competitive-authority-gates.js`. Testul verifică delimitarea, caracterul read-only și existența blocajelor în cod; **nu execută PostgreSQL sau QA autentificat**. LIVE este neschimbat.
