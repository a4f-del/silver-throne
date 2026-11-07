# Tronul de Argint — duel erou principal 1v1 (BETA)

## Scop și compatibilitate
- **LIVE**: păstrează sistemul actual cu echipă de până la trei luptători, publicare `v:1` și plafonul existent al fantomei.
- **BETA**: publică numai eroul principal (`v:2`) și luptă erou versus erou fără plafonul artificial de nivel 40. Statistica eroului este însă validată doar ca tip și limită tehnică în SQL; **nu există încă anti-trișat autoritativ**.
- **Lume**: continuă să publice întreaga echipă, pe ambele servere.

## Migrare server
SQL-ul `supabase/06-tron-duel-1v1.sql` se rulează **numai în Supabase BETA**, niciodată în LIVE. Dacă deja ai rulat integral `supabase/BETA-SETUP-COMPLET.sql` din PR #12, SQL-ul 1v1 este inclus acolo; nu trebuie reluat.

### Verificare fără modificări
Rulează pe **Silver-Throne-Test → SQL Editor**:
```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'throne_profiles'
    AND column_name = 'duel_version'
) AS duel_1v1_instalat;
```
Trebuie să fie `true` înainte să testezi clientul BETA. Dacă este `false`, **nu rula migrarea în LIVE**; ruleaz-o doar în BETA, după ce verifici scriptul și mesajele de eroare.

## Pași de test BETA
1. Intră pe `https://a4f-del.github.io/silver-throne/?server=beta`, loghează-te și verifică salvarea după refresh.
2. Du eroul la nivel 10 (nivel minim pentru Tron). Pe BETA, administratorul poate folosi opțiuni de test dacă sunt disponibile în interfață.
3. Intră în **Tronul de Argint** și apasă **Actualizează apărarea**. Trebuie să vezi numai eroul principal.
4. Dacă Tronul e gol, încearcă o provocare cu **Garda Regală**; apoi verifică rezultatul și întoarcerea la echipă.
5. Cu două conturi autorizate BETA, testează provocator versus deținător, protecția, provocarea în cooldown, reîncărcarea în timpul luptei, pierderea/fuga și restaurarea echipei.
6. Intră în **Lume** și confirmă că puterea și apărarea satului includ încă întreaga echipă.
7. Comută în **LIVE** și asigură-te că mesajele și mecanica Tronului au rămas cele vechi.

## Limitări cunoscute
- Multiplicatorul `ghostAtkMult = 1.62` este păstrat provizoriu; echilibrul duelu­lui trebuie calibrat.
- Frontendul calculează caracteristicile și rezultatul luptei; SQL-ul încă nu verifică statisticile pe baza unui inventar/salvări validate de server.
- La prima etapă folosește conturi/teste fără miză; **nu aplica** această migrare pe LIVE și **nu șterge** cei 7 jucători.

## Integrare
Acest PR înlocuiește implementarea din vechiul PR #10, care intrase în conflict cu `main` după PR #11 și #13. Verificările statice ale sintaxei JavaScript nu înlocuiesc testele de conectare și duel în browser.
