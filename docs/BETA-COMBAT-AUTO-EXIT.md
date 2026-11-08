# BETA — închiderea automată a luptelor, cu excepția Turnului

**Stare:** implementat în GitHub, disponibil la următoarea reîncărcare a BETA. Nu necesită migrare SQL și nu modifică LIVE.

## Comportament

- **Temnițe:** închiderea automată deja existentă după fiecare monstru rămâne neschimbată. Prada se încasează, iar progresul este păstrat.
- **Lume / raiduri PvP și alte raiduri:** după ultimul cadru al animației de victorie, motorul folosește **aceeași funcție `leave()`** de încasare și revine la fila de unde a pornit lupta. Recompensa, XP-ul și obiectele sunt procesate o singură dată.
- **Tron:** după victorie, încasează recompensa locală conform regulilor existente, marchează victoria pentru `throne_challenge_finish`, restaurează echipa completă după duelul 1v1 și revine în fila Tron. Dacă serverul nu răspunde, rezultatul rămâne în așteptare și este reîncercat — **nu se consideră confirmat până la răspuns**.
- **Înfrângeri:** deja eliminau lupta activă și sunt lăsate ca înainte.
- **Turn:** nu are închidere automată, pentru a permite continuarea etajelor sau retragerea manuală.
- **LIVE:** vechiul flux de `Ieși cu prada` rămâne neschimbat.

Butonul manual `Ieși cu prada` continuă să existe ca fallback în fluxurile unde poate fi afișat; funcția sa, `leave()`, nu își schimbă comportamentul normal. Numai helperul BETA `betaFinishCompletedBattle()` folosește `leave(true)`, ca să evite apelul recursiv la `go()`. Nu presupune că închiderea ferestrei de animație este confirmarea serverului: `tronCheck` și `lumeCheck` continuă să trimită rezultatul separat.

## Protecții

- Închiderea se aplică doar când **`S.d.done === true`**, nu există o rundă activă `S.d.f`, lupta are `raid` și nu este `d.tw` sau `d.one`.
- Verificarea se face prin `go()`, care este apelat la finalul redării cinematice `fxPlay`. Nu se taie animația.
- `leave(true)` șterge `S.d` la prima încasare; următoarele apeluri la `go()` nu pot încasa același rezultat încă o dată.
- La reluarea unei salvări după un raid deja câștigat, `boot()` finalizează închiderea.
- Dacă salvarea veche nu conține destinația `S.rt`, revenim în Tron sau pe hartă; dacă `S.rt` există, `terBack()` restaurează fila exactă de proveniență.
- Nu se schimbă costurile, aurul, XP-ul, inventarul, lupta, cooldownul sau funcțiile Supabase.

## Testare manuală în BETA

1. Deschide `https://a4f-del.github.io/silver-throne/?server=beta`; folosește **Ctrl + Shift + R**.
2. Atacă un sat din Lume: după victorie, verifică întoarcerea la hartă fără `Ieși cu prada`. Verifică resursele și obiectele pentru a exclude creditarea dublă.
3. Intră într-o provocare de Tron, termină lupta (manual sau automat) și verifică întoarcerea la Tron; echipa activă trebuie să aibă din nou eroul și mercenarii. Dacă serverul refuză rezultatul, lasă-l în așteptare pentru reîncercare, nu începe o provocare nouă.
4. În Temnițe, învinge un monstru și verifică întoarcerea la progresul temniței.
5. În Turn, după un etaj câștigat, confirmă că **nu** ești scos automat din incursiune.
6. Test suplimentar: reîncarcă pagina când există o **luptă deja terminată** în salvare. BETA trebuie să o închidă fără să dubleze prada. Nu testa întreruperea unei lupte încă active.

## Teste

`node dev/test-beta-combat-auto-exit.js`: verifică logic închiderea după victorie, exact o încasare, marcarea rezultatului Tron, redirecționarea către Tron/Lume, păstrarea Turnului, Temnițelor și LIVE. Este un test static + de model în JavaScript, nu un test de integrare în browser/Supabase.

**Nu cere SQL.**