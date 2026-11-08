# Silver Throne BETA — Pasul 18: feedback și accesibilitate în toate luptele

Data: 8 noiembrie 2026. Scop: UI/redare; **nu modificăm motorul de combat**.

## Probleme concrete corectate
- Fereastra de redare avea `window.__fxSkip` care putea fi apăsat de mai multe ori (sau înainte de primul cadru). Se puteau programa mai multe `finish()` și rula callbackul `go()` de mai multe ori. Acum `ending` și `finished` fac operația idempotentă: **un singur callback și o singură închidere**.
- În BETA, fereastra are rol `dialog`, `aria-modal` și nume accesibil; la deschidere se pune focusul pe **„Sari peste redarea luptei”**, iar la închidere este restaurat dacă elementul inițial există. Escape sare peste animație o singură dată.
- Dacă sistemul solicită `prefers-reduced-motion: reduce`, în BETA se evită redarea pe cadre **inclusiv la prima luptă**, păstrând însă rezultatul real. Pentru orice redare încă prezentă, `acFxAnimate()` nu mai execută măsurători de layout și mișcări inutile.
- Pe cardurile inamicilor, `aria-pressed` rămâne; numele accesibil include când ținta e selectată sau eliminată. Jurnalul scurt al luptei este `role=log` cu `aria-live=polite`; nu întregul dialog.
- Pe mobil, controalele acțiunilor au înălțime tactilă minimă 44px și focus vizibil la navigare din tastatură.

## Cele patru moduri
- **Temnițe**: `d.one` → `FX.cast.adventure` → card portret BETA, target selectat.
- **Turn**: `d.tw` → aceeași redare; logica etajelor și recompensele nu se schimbă.
- **PvP/Lume**: `d.lume` → portrete ale apărătorilor și cadre cu sursa atacului/daunele reale.
- **Tron**: `d.tron` → portretul regelui/eroului și loviturile păstrate.

LIVE păstrează propriul comportament de redare; UI-ul BETA e activat doar pentru modurile marcate. Cardurile VS istorice nu se suprapun peste ecranele BETA din Temnițe/Turn.

## Siguranță
Nu atingem `hit()`, `step()`, `enemy()`, `win()`, șansele de victorie, resursele, inventarul, reparațiile, breslele sau statisticile PvP. O redare sărită afișează același rezultat deja calculat, iar callbackul este rulat o singură dată.

## Teste
```sh
node dev/test-beta-combat-feedback-accessibility.js
node dev/test-beta-pvp-card-animations.js
node dev/test-beta-adventure-monster-cards.js
node dev/test-beta-compact-dungeon-screen.js
```
GitHub Actions rulează și toată suita `dev/test-*.js`.

## QA vizual și de interacțiune — necesar
1. Pe un cont BETA de test, începe lupta manuală. Cu tastatura, focusul merge la Skip; Escape și două clickuri rapide pe Skip închid redarea o singură dată. Nu apar recompense duplicate.
2. Urmărește cifrele de daune, barele HP și alegerea țintei în Mina Cenușie și într-o Temniță avansată.
3. Repetă cu Turn, duel de Lume și Tron: portretele aliaților/oponenților și efectele critice rămân lizibile.
4. Activează în sistem „Reducerea animațiilor”, reîncarcă pagina și verifică o primă luptă BETA: se ajunge direct la rezultat, fără animația obligatorie.
5. Pe un telefon îngust, încearcă trei butoane de luptă, selectorul țintei, Skip și „Fugi”. Nu trebuie să se suprapună și focusul trebuie să fie vizibil.
6. Verifică un cont LIVE existent: prima luptă și ecranele vechi sunt nemodificate.
7. Pentru măsurarea reală a performanței pe mobil, este necesar un browser/dispozitiv. Testele Node nu pot confirma FPS, răspuns la touch sau cititoare de ecran.

**Status:** cod și regresii BETA; pasul 18 rămâne nebifat până la verificarea reală pe mobil și desktop. Fără SQL.
