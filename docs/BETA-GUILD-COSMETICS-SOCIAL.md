# Silver Throne BETA — Pasul 28: însemne cosmetice și social

Data: 8 noiembrie 2026. Atelier strict cosmetic, fără bonusuri de putere și fără monedă nouă.

## Ce se poate personaliza

Un conducător sau ofițer poate cheltui **propriile însemne** obținute din premiile existente ale breslei pentru a debloca un aspect folosit de întreaga breaslă.

| Tip | Variante | Cost în însemne |
| --- | --- | --- |
| Emblemă | Scut (implicit), Soare, Lup, Coroană | 0 / 15 / 25 / 40 |
| Steag | Cenușiu (implicit), Verde de Codru, Purpură Regală | 0 / 15 / 30 |
| Ramă | Bronz (implicit), Argint, Aur | 0 / 15 / 40 |

Atelierul arată o previzualizare cu emblema, steagul și rama, plus trei categorii compacte. Cumpărarea **deblochează și aplică imediat** aspectul. Un aspect deblocat poate fi reutilizat gratuit. Membrii/veteranii pot vedea aspectele, dar nu le pot modifica. Nu există procente, aur, experiență, bonusuri pentru boss, PvP sau Tron.

## Validare server-side

SQL 20 adaugă trei câmpuri estetice în guilds și un tabel de deblocări cu RLS și fără acces direct pentru anon/authenticated. RPC-ul dedicat guild_cosmetics_api verifică:
- identitatea auth.uid(), accesul BETA și apartenența reală la breaslă;
- rolul conducător/ofițer pentru cumpărare/equipare;
- catalogul de variante și **costul calculat pe server**, nu din browser;
- însemne suficiente în rândul membrului, sub blocare FOR UPDATE;
- unicitatea deblocărilor, prevenind o dublă cumpărare;
- deblocarea înaintea echipării unei variante plătite.

Breslele existente primesc variantele gratuite, fără a pierde fonduri/progres. Aspectele cumpărate sunt ale **breslei**, nu ale contului care a plătit, și rămân la breaslă când jucătorul o părăsește. Însemnele sunt personale și numai persoana autorizată care cumpără plătește.

## Integrare socială

Funcțiile deja existente rămân active și au teste distincte:
- invitații directe acceptate/refuzate, expirare 7 zile și limită de 12 invitații/24 h;
- rangurile Conducător, Ofițer, Veteran, Membru, cu drepturi validate pe server;
- TAG-ul breslei în Lume și în profil, plus invitații din profil;
- mesageria și notificările pentru mesaje, cererile de prietenie și invitațiile de breaslă.

Schimbarea vizuală este afișată în headerul breslei și în previzualizarea din atelier. Nu alterăm identificatorii publici sau schemele de mesagerie și nu introducem noi notificări intrusive.

## Instalare BETA

Migrare **manuală**: supabase/20-beta-guild-cosmetics.sql în proiectul Silver-Throne-Test, după SQL 14–19. Verifică backup, roluri și drepturile de EXECUTE/RLS. **Nu aplica în LIVE.** Fără migrare, interfața explică absența atelierului, iar breslele, invitările, rangurile și mesajele continuă să funcționeze.

## Teste automate

```sh
node dev/test-beta-guild-cosmetics-social.js
node dev/test-beta-guild-ranks-invites.js
node dev/test-beta-map-guild-invite-fix.js
node dev/test-beta-world-mail.js
node dev/test-beta-world-friends.js
node dev/test-beta-guild-weekly-contracts.js
```

Toate regresiile sunt rulate și de GitHub Actions. Testele Node validează SQL static și clientul pe simulări; **nu execută migrarea într-un PostgreSQL real**.

## QA manual înainte de bifare

1. Cu un cont BETA conducător, verifică previzualizarea, cumpără o emblemă de 15 însemne și confirmă scăderea exactă a balanței pe server. Refolosește-o fără cost.
2. Încearcă două cumpărări simultane și o cumpărare cu fonduri insuficiente — fără însemne negative/dublări.
3. Cu ofițer, membru și veteran, verifică cine poate aplica/debloca și cine poate doar vedea aspectele.
4. Intră și ieși din breaslă: deblocările rămân la breaslă, nu pe contul cumpărătorului.
5. Invitații în așteptare, acceptare/refuz, promovare, limită invitații, mesagerie, cereri de prietenie și badge-uri de notificare; nu trebuie să apară regresii.
6. Verifică aspectul compact pe mobil, headerul și LIVE (unde atelierul nu trebuie să existe).

**Status:** cod BETA și SQL20 pregătite; pasul 28 rămâne nebifat până la test Postgres autentificat și QA mobil/desktop.
