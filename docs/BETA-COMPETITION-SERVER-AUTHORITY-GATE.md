# Silver Throne — Pasul 33: poarta de securitate a competiției

Data: 8 noiembrie 2026. **STATUS: BLOCAT — validarea autoritativă nu este implementată.** Acest document inventariază problemele și stabilește condițiile de lansare publică. Nu reprezintă anti-cheat; etichetele din interfață doar comunică cinstit starea BETA.

## Constatări direct din codul serverului

| Suprafață | Funcția / sursa | Problemă |
| --- | --- | --- |
| Publicarea Lumii | `world_join` în `supabase/02-lume.sql`, rescrisă de `04-portret.sql` | Nivelul, puterea și unitățile vin din JSON-ul browserului. Limitele numerice și validarea formei nu dovedesc inventarul sau progresul real. |
| Rezultatul PvP | `world_raid_finish(p_id,p_win,p_gold,p_xp)` în SQL02 | Serverul verifică deținătorul atacului și idempotentizarea, **dar acceptă rezultatul boolean și cantitățile din browser**, doar plafonate numeric. |
| Apărarea Tronului | `throne_publish` în SQL06 | Clientul furnizează nivel și `p_ghost.units`. Regula 1v1 și limitele int32 sunt tehnice, nu validare a echipamentului deținut. |
| Finalizarea Tronului | `tronReport` în `tron.js` | Browserul trimite `p_win`. Definiția completă de SQL a `throne_challenge_finish` este în `supabase/01-throne.sql`, fișier **care lipsește din repository-ul actual**; nu putem audita complet decizia serverului. |
| Contracte bresle | `guild_api('report')` în SQL19 | Browserul trimite un ID aleator pentru Temnițe, căpitani și Turn. Deduplarea ID-ului și plafoanele zilnice nu dovedesc că acea luptă a avut loc. |
| Boss breslă | `guild_api('boss')` în SQL19 | Daunele sunt calculate de server din `world_players`, dar puterea și echipa ajung inițial tot din browser. Verificarea `world_units_ok` nu autentifică proveniența statisticilor. |

Acestea sunt limite concrete, nu speculații. **Nu este sigur să prezentăm clasamentele actuale drept competiție protejată anti-cheat.**

## Ce am schimbat acum în BETA

Clasamentele **Lume/Tron** și contractele breslelor afișează explicații scurte, extensibile, că datele sunt provizorii și unele provin din client. Mesajele apar doar în BETA. LIVE nu primește un nou avertisment și nici reguli de joc schimbate. Nu am dezactivat clasamente, nu am resetat progres, nu am diminuat recompense și nu am pretins că vulnerabilitățile s-au închis.

## Arhitectura necesară înainte de extindere publică

### 1. Progres server-side
Introducem un model canonic pentru erou, nivel, XP, resurse, inventar, mercenari, echipamente și drepturi Premium, legat de `auth.uid()`. Salvările locale istorice se importă într-un mod de migrare BETA strict monitorizat, **nevalidate/provizorii** până la revizia lor. Clientul poate propune doar acțiuni (cumpără, echipează, forjează), nu poate scrie direct statistici finale. Permisiuni RLS, server RPC cu `SECURITY DEFINER` corect configurat, fără acces direct al conturilor la câmpurile sensibile.

### 2. Rezolvarea autoritativă a luptelor
Serverul creează o sesiune de luptă cu ID unic, adversar, echipe din starea canonică și un RNG controlat de server. Clientul trimite deciziile sau cere simularea; serverul verifică punctele, HP, cooldown-urile, atacurile și aplică rezultatul și prada o singură dată, tranzacțional. **Nu** se poate trimite separat un `win=true`, cantități de aur sau XP.

### 3. Publicarea Lumii și a Tronului
`world_join` și `throne_publish` derivă nivelul, puterea, clasa și unitățile din profilul serverului. Clientul poate schimba numai elemente cosmetice permise. Un snapshot trimis de client fără proveniență validată nu poate deveni sursă pentru clasamentul competitiv sau bonusul bossului.

### 4. Rapoarte bresle verificabile
Contractele folosesc evenimente semnate/înregistrate de server după victorii reale în Temnițe și Turn. `guild_api('report')` acceptă doar referințe la evenimente deja autorizate, pentru același `auth.uid()`, aceeași săptămână și același tip de eveniment. Deduplarea se face după ID-ul serverului, nu UUID ales de browser.

### 5. Audit de securitate și revenire sigură
Teste PostgreSQL/Supabase autentificate cu două conturi BETA, efectuate după backup, pentru: schimbare arbitrară nivel/power/echipă, `p_win=true` fără luptă, report fals/duplicat, refund/dublu claim, expirare sesiunii, schimbare de cont în timpul unei acțiuni, anulare/retry și concurență. Nicio migrare nu se execută automat la merge. Tranziția trebuie să poată reveni la o stare sigură fără pierderea progresului.

## Poarta de lansare publică

**NU se bifează pasul 33 și NU se activează competiție cu recompense relevante pentru public** până când:
1. avem **în repository** și auditat codul complet de SQL al Tronului (inclusiv `01-throne.sql`);
2. serverul derivă progresul și statisticile fără a avea încredere în JSON-ul din browser;
3. serverul decide și aplică rezultatul real al fiecărei lupte;
4. raportările de breaslă provin din evenimente server-side, verificabile și idempotente;
5. testele de falsificare și simulările pe două conturi sunt verzi, cu QA manual mobil/desktop.

## Verificări efectuate în această etapă

```sh
node dev/test-beta-competition-trust-boundaries.js
```

Testul verifică existența riscurilor **încă nerezolvate** și afișarea corectă a avertismentelor în BETA. Faptul că trece **nu înseamnă** că anti-cheat este implementat. Aceasta este o poartă de audit, nu o certificare.

**Nu se schimbă schema SQL în această etapă.** Orice implementare ulterioară se va face în PR-uri mici, cu migrări separate și teste reale în Supabase BETA, fără a afecta LIVE.
