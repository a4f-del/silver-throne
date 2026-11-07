# Meniuri de acțiuni direct pe hartă — BETA

La click/tap pe **satul altui jucător** din Hartă → Lumea apare un meniu compact **lângă sat**, cu:
- ⚔ **Atacă**: pornește `lwAttack(p.id)`, cu aceleași verificări de nivel, atacuri disponibile și cooldown ca înainte. Butonul este dezactivat dacă atacul este imposibil.
- 👤 **Profil**: deschide `lwProfile(p.id)`, fără să cobori până la panoul de sub hartă.
- ✉ **Mesaj**: folosește mesageria între jucători deja disponibilă în BETA.

Pe **satul propriu**, meniul oferă **Profil**, fără buton de auto-atac.

La click/tap pe **sat NPC comun** apare doar ⚔ **Jefuiește**, cu `wnRaid(v.id)` (regulile și RPC-urile NPC existente). Dacă există cooldown individual de 1 oră sau echipa e căzută / nu ai puncte, butonul e dezactivat și afișează explicația.

Meniul este ancorat lângă sat, în limita hărții, și se închide la Esc, click pe fundal, zoom sau selectarea aceluiași sat. Gesturile folosite deja la hartă rămân funcționale.

Implementarea este în `lume-quick.js` și păstrează comportamentul anterior pe **LIVE**. Afișarea siglelor celorlalte bresle folosește migrarea SQL16 exclusiv în BETA; nu se schimbă salvările sau regulile atacurilor.

## Testare
1. Merge PR → reîncarcă BETA.
2. Hartă → Lumea → click pe sat NPC: ⚔ Jefuiește; verifică cooldown.
3. Click pe satul altui jucător: ⚔, 👤, ✉ — pictogramele deschid atacul, profilul și mesageria BETA.
4. Confirmă că Profil deschide profilul; ⚔ nu pornește atac dacă nu ai condițiile îndeplinite.
5. Încearcă tap pe telefon, zoom, tragerea hărții și Esc.
6. Pe LIVE, codul nou nu activează noul meniu.
7. `node dev/test-beta-map-village-actions.js` — regresii UI simplificate.

Nu șterge conturi. Nu este nevoie de SQL.


## Ajustare 2026-11-07: meniuri care nu ies din zona vizibila

In BETA, meniul rapid al **jucatorilor** si al **satelor NPC** are latime de maximum **228px** (in loc de 255px), pictograme putin mai compacte si pozitionare bazata pe **inaltimea reala** a meniului. Daca satul e sus pe harta, meniul se deschide dedesubt; daca e jos, deasupra. Pozitia este limitata atat de marginile hartii, cat si de portiunea vizibila a ferestrei. Daca e foarte putin spatiu, panoul poate fi derulat fara a ascunde actiunea Ataca / Jefuieste. Nu se modifica meniul LIVE si nici regulile atacurilor.

## Restaurare dificultati Temnite in ecranul nou

In modul dedicat BETA apar din nou butoanele **Normal / Greu / Cosmar** pentru temnitele unde existau anterior. Dificultatile nedeblocate raman vizibile, dar blocate. Dificultatea se poate alege **dupa Intră, inainte de prima lupta** si se fixeaza pentru restul incursiunii; dupa retragere poti intra din nou si alege alta dificultate. Progresul separat pe dificultati (`S.dp`/`S.dts`) este pastrat; fara migrari si fara schimbari de echilibru. LIVE ramane identic.


## Ajustare: bara minimă cu [TAG] Nume

În BETA, meniul contextual al unui jucător arată numai **`[TAG] Nume`** și dedesubt trei pictograme: **⚔ Atacă / 👤 Profil / ✉ Mesaj**, fără rândul „Nivel” și fără texte sub iconițe. Lățimea este calculată din titlu și numărul de acțiuni, nu fixă. Meniul NPC are numele satului și **⚔ Jefuiește**. Titlurile lungi sunt limitate de lățimea hărții; explicațiile blocărilor rămân în tooltip-uri.

Siglele breslelor apar pentru membrii cu profil publicat în Lume după instalarea `supabase/16-beta-guild-map-tags.sql` în **Silver-Throne-Test** (după SQL14/15). Acesta oferă prin `guild_map_tags` numai perechi **UUID → TAG** și nu schimbă datele existente. Dacă SQL16 nu este instalat, meniul rămâne utilizabil și afișează doar numele (cu excepția siglelor din propria breaslă, care pot fi cunoscute din datele curente).

`gsrProfileInviteButton` din profilul jucătorului folosește acum atribute HTML corect codificate pentru ID-urile UUID; erorile de invitare sunt afișate direct sub buton, fără să închidă profilul. Aceeași reparare se aplică promovării, eliminării și invitațiilor din rezultatele căutării. **SQL15 trebuie să fie deja instalat** pentru a trimite invitații.

Teste: `node dev/test-beta-map-village-actions.js`, `node dev/test-beta-map-guild-invite-fix.js`, `node dev/test-beta-dungeon-difficulties-map-menu.js`.
