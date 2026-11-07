# Mesagerie privată între jucători — BETA

## Instalare (fără atingerea LIVE)
1. Integrează PR-ul.
2. Intră în **Supabase → Silver-Throne-Test → SQL Editor**, selectează proiectul BETA, nu proiectul LIVE.
3. Execută **întregul** `supabase/11-beta-world-mail.sql` o singură dată (poate fi reluat fără a șterge mesaje).
4. Refresh complet pe `https://a4f-del.github.io/silver-throne/?server=beta`.
5. Pe două conturi BETA autorizate care au satul în Lume, testează fluxul:
   - Hartă → Lumea → satul celuilalt jucător → **✉ Mesaj**.
   - Scrie max. 500 caractere și apasă **Trimite**.
   - Pe contul destinatarului, **✉ Mesaje** din header → inbox.
   - Deschide mesajul (devine citit), apasă **Răspunde**.
   - Mesajele necitite apar ca badge discret; se verifică automat la ~60 secunde.
   - Verifică limita de minimum 30 secunde între trimiteri.
6. Dacă lipsește SQL-ul, inboxul afișează eroarea de server în loc să pretindă că mesageria funcționează.

## Model de securitate
- `public.world_mail`: sender_id, recipient_id, body (1–500 caractere), created_at, read_at. Referințe către `auth.users` cu **ON DELETE CASCADE**, deci ștergerea contului șterge și mesajele sale. Nu se stochează adresele email ale altor jucători.
- **RLS activ, fără politici**, privilegii de tabel revocate `anon` și `authenticated`; numai RPC `SECURITY DEFINER` poate accesa tabela.
- `world_mail_send(p_target,p_body)`: utilizator autentificat + `is_beta_admin()`, expeditorul și destinatarul trebuie să existe în Lume; fără mesaje către sine; lungime controlată; maximum **1 mesaj/30 secunde** și **30/24 ore**, verificate atomic cu lock per expeditor.
- `world_mail_inbox()`: returnează doar **ultimele 50 de mesaje primite** ale utilizatorului conectat și numărul său de mesaje necitite. Nu expune mesaje ale altora.
- `world_mail_read(p_id)`: poate marca drept citit doar un mesaj al destinatarului autentificat.
- Mesajele sunt afișate în DOM cu escapare HTML; niciun script din textul altui jucător nu trebuie executat.
- Nu se folosește `game_saves` pentru mesaje; recompensele, progresul, PVP și cooldownurile NPC sunt neschimbate.
- Mesajele se trimit doar între conturi autentificate din proiectul BETA. Pentru lansare LIVE recomandăm o revizuire separată a raportărilor și mecanismelor de blocare a utilizatorilor.

## Cod
- `world-mail.js`: dialog compunere/inbox/citire/răspuns, notificări și polling.
- `lume-quick.js`: iconița ✉ deschide compunerea reală.
- `lume.js`: buton de mesaj în profilul altui jucător (doar BETA).
- `cont.js`: pornește inboxul numai după autentificare.
- `index.html`: încarcă scriptul și adaugă accesul la Mesaje în header.
- `dev/test-beta-world-mail.js`: verificări logice fără backend.

**Nu rula SQL pe LIVE.** Scriptul nu schimbă tabelele existente ale jocului.
