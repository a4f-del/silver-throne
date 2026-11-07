# Harta Lumii BETA: fără întunecare și fără zone individuale

## De ce
Vechea hartă plasa un „ținut personal” în jurul satului conectat:
- un oval mare cu umbră (`lwTinut`);
- contur auriu punctat;
- nori negri de explorare (`tnFog`);
- clădiri/markere din harta regională privată (`terMarks`);
- o zonă fără decor, rezervată doar acelui ținut (`tnInside`).

Aceasta nu mai este reprezentarea corectă a **Lumii comune**: satele NPC libere sunt deja generate pe hartă pentru toți jucătorii și se pot ataca cu cooldown de 4 ore.

## Ce am schimbat
Pe **BETA**, `lwTinut` nu mai desenează nici pata întunecată, nici ceața, conturul sau markerii privați. `tnInside` nu mai rezervă goluri personale în decor, astfel încât terenul comun poate fi desenat uniform. Satele jucătorilor și **satele NPC comune** continuă să fie desenate de `lwVil` și `lwWn` ca înainte.

**Nu am eliminat date din salvările personajelor**. Logica regională veche rămâne în cod (inclusiv `S.ter`) ca să nu riscăm afectarea progresului preexistent. Nu s-a modificat `wnList`, `wnRaid`, `world_npc_get`, `world_npc_raid`, nivelul satelor NPC sau cooldownul de 4 ore. Nu necesită SQL.

Pe **LIVE**, zona veche este păstrată temporar: acest PR introduce doar noul aspect BETA.

## Test manual
1. Integrează PR, apoi reîncarcă `https://a4f-del.github.io/silver-throne/?server=beta` cu refresh complet.
2. Deschide **Hartă → Lumea** pe două conturi BETA: nu trebuie să existe petice întunecate/contururi/ceață în jurul satelor jucătorilor.
3. Confirmă că ambele conturi văd aceleași sate NPC, că le pot selecta și că raidul are cooldown individual de 4 ore.
4. Verifică zoom/pan și că satele jucătorilor, Tronul și elementele vizuale rămân vizibile.
5. Nu este nevoie să ștergi date, să recreezi conturi sau să rulezi SQL.

## Test regresie
`node dev/test-beta-shared-world-no-private-fog.js`: stratul privat lipsește doar în BETA, LIVE rămâne neschimbat, salvarea nu este modificată, funcțiile NPC și cooldownul există.
