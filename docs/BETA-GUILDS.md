# Bresle BETA: contract saptamanal si capitan comun

## Instalare

1. Integreaza codul din PR si publica GitHub Pages BETA.
2. In **Supabase Silver-Throne-Test**, deschide SQL Editor.
3. Ruleaza integral **`supabase/14-beta-guilds.sql`**. Depinde de tabelele deja instalate din `02-lume.sql` si de `is_beta_admin()` din `07-beta-access.sql`.
4. Nu rula migrarile in LIVE. Codul UI este ascuns in LIVE.

> **Atentie:** simplul merge al codului NU executa SQL-ul. Fara scriptul 14, vei vedea mesajul de eroare din fereastra Bresle.

## Intrare si membri

Breslele sunt disponibile doar pe serverul BETA pentru conturile admise. Butonul **Bresle** apare in bara superioara cand esti in Sat/Lume, nu in timpul unei aventuri. Fondatorul stabileste numele (3-32 caractere) si sigla (2-5 litere/cifre). Breasla primeste un cod de invitatie unic, iar ceilalti intra prin cod.

- Maximum **20 membri** pe breasla, un singur clan per cont.
- Fondatorul devine conducator. Cand acesta pleaca, conducerea se transfera celui mai vechi membru ramas; cand ultimul membru pleaca, breasla se sterge.
- Datele sunt comune si sunt pastrate in Supabase, nu in salvarea locala.
- Nu exista cost de creare sau de aderare.

## Contractul saptamanal

Se reseteaza in fiecare **luni la ora 00:00, ora Romaniei**. Toate luptele victorioase in Temnite (si cele cu capitanul) raporteaza progres, iar fiecare etaj castigat in Turn contribuie cu 1.

| Obiectiv | Tinta saptamanala |
| --- | ---: |
| Lupte castigate in Temnite | 150 |
| Capitani invinsi pe Greu sau Cosmar | 25 |
| Etaje castigate in Turn | 1.000 |

Treptele se deblocheaza atunci cand **fiecare** obiectiv ajunge la 25% / 60% / 100%, cu rotunjire in sus. Pentru revendicare, fiecare membru are nevoie de cel putin **3 contributii personale** in acea saptamana (inclusiv lovituri asupra bossului).

- Bronz: **+10 insemne de breasla**.
- Argint: **+20 insemne de breasla**.
- Aur: **+40 insemne de breasla**.

Premiile sunt individuale si se revendica o singura data pe treapta, in aceeasi saptamana. Insemnele sunt o moneda separata de test, stocata pe server; nu pot fi cheltuite deocamdata si nu modifica aurul, XP, echipamentul sau economia.

**Limita de integritate a BETA:** motorul actual calculeaza luptele din Temnite si Turn in browser. Serverul primeste rapoarte cu identificator unic, le deduplica si le plafoneaza zilnic (40 victorii Temnite, 12 capitani Greu/Cosmar, 120 etaje Turn/membru), dar nu poate verifica independent ca fiecare lupta chiar s-a produs. Pentru competitii serioase sau recompense valoroase, mecanica necesita validare autoritativa a luptelor pe server.

## Capitanul comun

- **Strajerul Cenusii**, cu viata comuna pe saptamana.
- Viata maxima de baza este **24.000 + 12.000 pentru fiecare membru activ** (un membru este activ daca si-a vizitat contul/Lumea in ultimele 7 zile, ori s-a alaturat recent). Cand numarul activilor se modifica, HP se ajusteaza pastrand damage-ul acumulat, pana la infrangere.
- Fiecare membru are **2 atacuri gratuite pe zi**, fara puncte si fara a consuma limita de atacuri PvP.
- Lovitura si daunele sunt calculate de SQL pe baza nivelului si puterii publicate in Lume; damage-ul trimis de browser este ignorat.
- Bossul roteste saptamanal abilitatea `poison`, `storm` sau `wave` (aceleasi familii de abilitati ca in `trepte.js`). Contraclasa este Vraci, Arcas sau Paznic, in functie de abilitate; eroul de clasa corespunzatoare da bonus la atac. Serverul aplica bonusul.
- La lovitura reusita este afisata **o animatie de impact** cu damage-ul confirmat de server. Aceasta este o versiune *lovitura comuna*, nu o lupta completa pe ture cu bossul. Abilitatea este afisata si influenteaza contraclasa, dar nu executa inca efecte asupra echipei.
- Dupa infrangerea bossului, membrul cu cel putin o lovitura si cel putin 3 contributii poate revendica **+20 insemne** suplimentare, o singura data.

## Securitate si compatibilitate

- Tabele cu RLS activ si fara acces direct pentru `authenticated` / `anon`; operatiile sunt prin `guild_api` (SECURITY DEFINER, verificari `auth.uid()` si `is_beta_admin()`).
- Cotizatiile, obiectivele si premiile sunt in date server; revendicarile au marcatori care previn dublarea premiilor.
- Nu modifica Tronul, clasamentul, luptele PvP, expirarea lor ori soldurile portofelului.
- Daca jucatorul este offline la raportarea unei victorii, evenimentul sta temporar in `S.guildEvents` si se retrimite la conectare cat timp apartine saptamanii si breslei curente.
- LIVE si datele serverului LIVE nu sunt afectate.

## Verificari locale

```bash
node dev/test-beta-guilds.js
node dev/test-beta-guild-boss-replay.js
```

Dupa instalarea SQL, testeaza manual cu doua conturi de administrator BETA: creare, cod de invitatie, aderare, raport de victorie Temnita/Turn, boss de 2 ori intr-o zi, revendicare, parasire cu transfer de conducere, resetul de luni. Testele locale nu pot inlocui acest smoke test pe server.
