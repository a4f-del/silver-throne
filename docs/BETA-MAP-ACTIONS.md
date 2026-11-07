# Meniuri de acțiuni direct pe hartă — BETA

La click/tap pe **satul altui jucător** din Hartă → Lumea apare un meniu compact **lângă sat**, cu:
- ⚔ **Atacă**: pornește `lwAttack(p.id)`, cu aceleași verificări de nivel, atacuri disponibile și cooldown ca înainte. Butonul este dezactivat dacă atacul este imposibil.
- 👤 **Profil**: deschide `lwProfile(p.id)`, fără să cobori până la panoul de sub hartă.
- ✉ **Mesaj**: iconiță prezentă dar **dezactivată explicit**. În repo nu există încă mesagerie între jucători / endpoint de trimitere. Butonul nu pretinde că trimite și are tooltip clar. Mesageria reală necesită o etapă separată de backend + UI + protecții anti-spam.

Pe **satul propriu**, meniul oferă **Profil**, fără buton de auto-atac.

La click/tap pe **sat NPC comun** apare doar ⚔ **Jefuiește**, cu `wnRaid(v.id)` (regulile și RPC-urile NPC existente). Dacă există cooldown individual de 1 oră sau echipa e căzută / nu ai puncte, butonul e dezactivat și afișează explicația.

Meniul este ancorat lângă sat, în limita hărții, și se închide la Esc, click pe fundal, zoom sau selectarea aceluiași sat. Gesturile folosite deja la hartă rămân funcționale.

Implementarea este în `lume-quick.js` și păstrează comportamentul anterior pe **LIVE**. Nu există SQL nou și nu se schimbă salvările sau regulile atacurilor.

## Testare
1. Merge PR → reîncarcă BETA.
2. Hartă → Lumea → click pe sat NPC: ⚔ Jefuiește; verifică cooldown.
3. Click pe satul altui jucător: ⚔, 👤, ✉ (ultimul dezactivat până avem mesagerie reală).
4. Confirmă că Profil deschide profilul; ⚔ nu pornește atac dacă nu ai condițiile îndeplinite.
5. Încearcă tap pe telefon, zoom, tragerea hărții și Esc.
6. Pe LIVE, codul nou nu activează noul meniu.
7. `node dev/test-beta-map-village-actions.js` — regresii UI simplificate.

Nu șterge conturi. Nu este nevoie de SQL.
