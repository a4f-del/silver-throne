# Silver Throne — două servere, LIVE + BETA

## LIVE
- Păstrează URL-ul și cheia publicabilă deja folosite în `index.html`.
- `?server=beta` nu poate schimba LIVE fără configurarea BETA.
- Autentificarea LIVE păstrează cheia de sesiune implicită Supabase.
- Salvările LIVE continuă să folosească `mina-cenusie-v1:<user-id>`.

## BETA
- Proiect Supabase separat, cu bază de date și conturi de Auth separate.
- Configurează `ST_BETA_CONFIG.url` și `ST_BETA_CONFIG.publishableKey` în `servere.js`.
- **Nu adăuga cheia secretă sau service_role**. Cheia publishable este concepută pentru client.
- La conectare, `contEnter` solicită `is_beta_admin()` de la proiectul BETA. Refuză orice cont neautorizat înainte de citirea salvării/boot.
- Sesiune `silver-throne-beta-auth`, progres local `mina-cenusie-v1:beta:<user-id>`, fără importul unei salvări LIVE.
- Opțiunea `Cont nou` este eliminată din ecranul BETA, iar `contUp` o refuză.
- Linkurile de recuperare parolă păstrează `?server=beta`.
- Selectorul BETA este dezactivat până sunt introduse datele publicabile ale proiectului nou.

## În Supabase BETA (nu în LIVE!)
1. Creează schema de joc necesară (`game_saves`, funcțiile `throne_*`, `world_*` etc.) prin export/import din LIVE sau migrațiile originale. **Nu copia datele personale ale jucătorilor.**
2. În **Authentication > Settings / General Configuration**, dezactivează **Allow new users to sign up**. Lasă anonymous sign-ins dezactivate. În BETA adaugi numai conturile admin, prin invitație din Dashboard.
3. Rulează `supabase/07-beta-access.sql` în SQL Editor **al proiectului BETA**.
4. Invită-ți contul admin în **Authentication > Users**. Conturile cu același email din LIVE și BETA sunt două identități separate; parola nu se copiază.
5. Adaugă UUID-ul / emailul contului BETA în `public.beta_admins` cu instrucțiunea comentată în SQL.
6. Permite în **Authentication > URL Configuration** redirectul paginii BETA, de exemplu `https://a4f-del.github.io/silver-throne/?server=beta`.
7. Revizuiește și restricționează **RLS / grants** pentru toate tabelele de joc din proiectul BETA. Verifică și funcțiile `SECURITY DEFINER` / RPC: verificarea din interfață NU este în sine un zid de securitate la API. Până la audit, permite conturi doar admin prin Auth.
8. Testează conectarea cu un admin invitat (reușită) și un cont obișnuit (refuz). Testează crearea separată a eroului, salvările și comutarea LIVE↔BETA.

## Atenție privind PR-ul Tron 1v1
`supabase/06-tron-duel-1v1.sql` din PR #10 **nu se rulează** până când schema inițială a Tronului nu a fost încărcată în proiectul BETA. Nu aplica migrarea din PR #10 în LIVE înainte să fie testată integral.

## Verificări rapide
- LIVE rămâne implicit; conturile active LIVE nu sunt deconectate de această actualizare.
- BETA nu funcționează și nu este selectabilă fără configurație.
- Fără sesiune BETA nu se vede jocul; fără `is_beta_admin() = true` accesul este blocat.
- Cheile locale și sesiunile sunt diferite între medii.
- Ecranul contului conține butonul pentru schimbarea serverului.
