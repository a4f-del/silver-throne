# Silver Throne BETA — Pasul 31: auditul economiei, cooldown NPC de o oră

Data: 8 noiembrie 2026. Acest raport conține un **scenariu teoretic reproductibil**, nu măsurători ale conturilor reale. **Nu ajustăm ratele/dropurile fără date BETA autentificate.**

## Verificarea regulilor existente

- Un sat NPC comun are un **cooldown de 60 de minute per sat și per cont**. Regula este verificată și pe server, nu doar în browser.
- În ecranul raidului, butonul de intrare consumă **1 punct**. Căpitanul raidului mai consumă **1 punct**. O victorie completă costă astfel **2 puncte**, nu 1; aceasta era o neclaritate de afișare, corectată doar în UI-ul BETA.
- Punctele se regenerează cu un ritm de aproximativ **10/oră**, dacă există loc în bară, deci 5 raiduri complete/oră constituie un plafon sustenabil *teoretic* numai dacă sunt cel puțin 5 sate disponibile și toate luptele sunt câștigate.
- Recompensa fixă de la căpitanul NPC, la nivelul efectiv `L`: **`round((60 + 30L) × 1,2)` aur, `5 + L` minereu și `round(20 + 8L)` experiență**. În plus, la victorie apar 2–4 materiale, o șansă de drop de raritate și o șansă de obiect. Loot suplimentar din alte surse, bonusuri de echipament, înfrângeri și convertirea surplusului sunt excluse din estimarea de mai jos.

## Proiecție doar pentru recompensa fixă NPC

| Nivel efectiv | Jafuri reușite/oră | Aur/oră | Minereu/oră | Materiale/oră* | Puncte/oră |
|---:|---:|---:|---:|---:|---:|
| 5 | 1 | 252 | 10 | 3 | 2 |
| 5 | 5 | 1.260 | 50 | 15 | 10 |
| 15 | 1 | 612 | 20 | 3 | 2 |
| 15 | 5 | 3.060 | 100 | 15 | 10 |
| 30 | 1 | 1.152 | 35 | 3 | 2 |
| 30 | 5 | 5.760 | 175 | 15 | 10 |
| 45 | 1 | 1.692 | 50 | 3 | 2 |
| 45 | 5 | 8.460 | 250 | 15 | 10 |

*Materialele sunt reprezentate prin media intervalului uniform 2–4. Simularea nu specifică tipul lor.*

Pentru comparație: prețul unui obiect **Rar** de nivel egal în Piață (dacă magazinul îl generează) este aproximativ 304/752/1.424/2.096 aur la nivelurile 5/15/30/45. Un singur jaf NPC învingător produce aproximativ **0,8 × prețul acelui obiect Rar**. Cinci jafuri pe oră pot însemna echivalentul a aproximativ patru obiecte Rare pe oră, doar din componenta fixă a raidurilor. Aceasta este o **posibilă presiune inflaționistă de monitorizat**, nu dovada că un utilizator obișnuit obține asemenea venituri.

## Surse și costuri incluse în audit

**Surse:** loot NPC fix, minereu și materiale, aur din lootul Temnițelor, vânzare de obiecte, dezmembrare, misiuni zilnice și recompense de autentificare. **Costuri:** obiecte în Piață, reînnoire de stoc `15 × nivelul`, echipament de calitate, vindecări, învieri, refacere afixe, Topitorie și îmbunătățiri Fierărie.

Pasul 29 din BETA scade media încercărilor pentru +9 de la 10 la ~6,84, deci poate reduce consumul mediu de minereu și materiale pentru acea treaptă. Aurul pentru succes rămâne neschimbat.

**Limitări:** nu avem încă distribuția reală a sesiunilor, a numărului de sate disponibile, a ratelor de victorie, a prețurilor efectiv listate în Bazar sau a materialelor consumate de fiecare nivel. De aceea **nu am modificat prețuri, recompense sau cooldown-ul**, în special nu am reintrodus bucle repetitive.

## Ce date trebuie colectate înainte de ajustări

Pentru eroi BETA autorizați, în intervale de 7 zile și agregat pe nivel (1–9, 10–19, 20–29, 30+), avem nevoie de:
- numărul de raiduri NPC reușite/eșuate per cont activ, numărul de sate diferite, puncte cheltuite;
- venituri medii și percentile (p50/p90) de aur, minereu și materiale pe oră activă, defalcate pe sursă;
- cheltuieli pe Piață, Negustor, Bazar, Fierărie, Topitorie, Infirmerie;
- soldurile mediane după 1, 3 și 7 zile; comparație între jucători noi și endgame;
- timpul până la primul echipament Rar și până la +5/+9, plus frecvența acumulării la plafonul Depozitului.

**Nu se colectează date personale, nume sau conținut de mesaje în acest pas.** Instrumentarea pentru cifre agregate necesită un pas separat de validare a sursei și permisiunilor înainte de activare.

## Modificare vizibilă acum

În BETA, panoul unui sat NPC explică: **1 punct la intrare + 1 punct la căpitan = 2 puncte dacă termini**, și că fiecare sat poate fi atacat cel mult o dată pe oră. LIVE rămâne neschimbat.

## Regresie automată

```sh
node dev/test-beta-economy-baseline.js
node dev/test-beta-npc-cooldown-1h.js
node dev/test-beta-forge-upgrade-pity.js
```

Testul citește formula reală de loot NPC, simulează nivelurile 5/15/30/45 și 1/3/5 victorii/oră, verifică costul efectiv de două puncte, cooldown-ul client/server, prețul de magazin și conservarea veniturilor/costurilor. Suita completă GitHub Actions rulează restul regresiilor.

## QA necesar

1. Cu un erou nou BETA, verifică pe un sat NPC panoul cu 2 puncte total. Intră în raid și învinge căpitanul; observă exact 1 + 1 punct și cooldown-ul orar.
2. Reîncarcă pagina, încearcă același sat înainte de o oră: serverul nu permite o a doua intrare.
3. Verifică venitul efectiv, luând în considerare recompensele/bonusurile suplimentare și eventualele pierderi; compară cu scenariile teoretice, nu cu o promisiune de venit.
4. Repetă pe mobil; LIVE păstrează interfața existentă.

**Status:** audit de cod și model economic reproductibil; pasul 31 rămâne deschis până la măsurători reale din BETA. Nu necesită SQL pentru această etapă. 
