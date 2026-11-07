# Prieteni — BETA (PR implementare)

## Funcții
- **Profilul altui jucător → 🤝 Adaugă prieten**: trimite cerere; după trimitere apare statusul „Cerere trimisă”.
- **🤝 Prieteni** în bara de sus: arată cererile primite cu **Acceptă / Refuză**, lista celor acceptați cu **✉ Mesaj / 👤 Profil / Elimină**, precum și cererile trimise, pe care le poți anula.
- **Badge** pentru cererile primite, actualizat la circa 60 de secunde.
- Mesajul deschide compunerea din mesageria existentă, fără sistem nou sau adresă de e-mail.
- Prieteniile sunt legate de cont, nu de salvarea jocului. Relațiile sunt salvate în Supabase și supraviețuiesc reîncărcării.

## Instalare și testare
1. Merge PR-ul.
2. Doar în **Supabase → Silver-Throne-Test → SQL Editor**, rulează complet `supabase/12-beta-world-friends.sql`.
3. Reîncarcă `https://a4f-del.github.io/silver-throne/?server=beta`.
4. Din contul BETA A, Hartă → Lumea → satul contului B → Profil → 🤝 Adaugă prieten.
5. Pe contul B, deschide 🤝 Prieteni → Acceptă. Cererea dispare din așteptare și jucătorul apare la Prieteni.
6. Pe contul A, în 🤝 Prieteni, apasă ✉ Mesaj și verifică faptul că se deschide compunerea către B. Încearcă și 👤 Profil.
7. Testează Refuză, Anulează și Elimină; reîncarcă și confirmă persistenta listei.
8. Pe LIVE nu trebuie să apară noul buton sau RPC-uri de prieteni.

## Securitate
- Tabelul `world_friends` are RLS activ, fără politici care dau acces direct; privilegiile pentru `anon`/`authenticated` sunt revocate.
- RPC-uri `SECURITY DEFINER` cu `search_path=''`, autentificare prin `auth.uid()` și `public.is_beta_admin()`.
- `world_friends_request` verifică identitatea, împiedică cererile către sine și confirmă prezența ambilor jucători în Lume. Un index unic pe pereche neordonată interzice relațiile duplicate.
- Acceptarea și refuzul sunt permise **numai destinatarului cererii**.
- Anularea unei cereri e permisă numai expeditorului; eliminarea prieteniei este permisă oricăruia dintre cei doi.
- Cererile refuzate pot fi retrimise doar după minimum 24 de ore. Maximum 20 cereri trimise rămase în așteptare.
- Nu se schimbă sau șterg datele jocului. Ștergerea contului șterge relațiile prin `ON DELETE CASCADE`.

Nu este nevoie să rulezi nimic în LIVE. Mesajele și sistemul existent de atac rămân nemodificate.
