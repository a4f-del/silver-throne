# Simulator PvP pentru animații — BETA

Simulatorul este vizibil numai pe **BETA**, în panoul 🛠 Administrator, după confirmarea de către server a rolului `is_beta_admin`.

## Configurare
- **Echipa ta:** `Doar eroul`, `Erou + 1 mercenar`, `Erou + 2 mercenari` sau `Erou + 3 mercenari`.
- Pentru fiecare mercenar al atacatorului se poate alege un mercenar recrutat (inclusiv din rezervă), sau `Automat / demonstrativ`. Dacă nu există destui recrutați, se adaugă un portret demonstrativ. Mercenarii din expediții nu sunt scoși din expediție.
- **Echipa adversă:** aceleași patru dimensiuni; poți seta clasa fiecărui apărător (Războinic, Arcaș, Paznic, Mag, Vraci). Eroul advers este fictiv.

Apasă **„Simulează animațiile”** pentru a vedea cardurile portret și schimburile de lovituri. Scenariile merg de la **1v1** până la **4v4**, inclusiv confruntări dezechilibrate (1v4, 3v2 etc.).

## Limitări și siguranță

Este un **simulator vizual**, nu o luptă PvP reală. Daunele, ordinea loviturilor și luptătorii demonstrativi nu sunt calculați după regulile oficiale PvP. Simulatorul folosește motorul existent de **redare** (`fxPlay` + `acFxMarkup`) cu cadre locale independente.

Nu trimite cereri către server, nu consumă din limita de 10 atacuri, nu schimbă Tronul sau clasamentele, nu oferă pradă/XP, nu modifică echipa, expedițiile sau salvarea și nu schimbă configurația LIVE. Nu sunt necesare migrări SQL.

## Teste
```
node dev/test-beta-pvp-simulator.js
```
Testul verifică 16 combinații de dimensiuni, selecții reale/automate de mercenari, izolarea admin/BETA, blocarea simulării când există o luptă reală și restaurarea cozii FX.
