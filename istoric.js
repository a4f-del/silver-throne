/* ============================================================================
   Silver Throne — istoric.js
   Istoricul luptelor: fiecare coborâre, atac asupra unui jucător, provocare la Tron sau jaf se salvează la final,
   cu rezultatul, prada (inclusiv obiectele) și jurnalul luptelor. Se păstrează ultimele 20, în S.bh.
   Butonul „Lupte” din bara de sus deschide lista (cont.js îl creează lângă Clasament).
   ========================================================================== */
const BHI = { max: 20, lines: 80, ic: { d: 'nav-coborare', p: 'ui-tabara', t: 'nav-tron', s: 'nav-harta', r: 'nav-harta' } };
/* la sfârșitul fiecărei lupte, jurnalul ei se adaugă la jurnalul coborârii */
function bhPush(d, f) {
  if (!d || !f || !Array.isArray(f.log)) return;
  const boss = f.es && f.es.some(e => e.b);
  d.hl = (d.hl || []).concat([`— ${d.lume || d.tron ? 'Lupta' : boss ? 'Căpitanul' : 'Camera ' + ((d.room || 0) + 1)} —`], f.log.slice(-30));
  if (d.hl.length > BHI.lines) d.hl = d.hl.slice(-BHI.lines);
}
const bhKind = d => d.lume ? 'p' : d.tron ? 't' : d.wn ? 's' : d.raid != null ? 'r' : 'd';
function bhTitle(d) {
  if (d.lume) return 'Atac: ' + (d.rn || d.bn);
  if (d.tron) return 'Tronul de Argint · ' + d.bn;
  if (d.raid != null) return (d.lbl || 'Jaf') + ': ' + (d.rn || d.bn || 'sat');
  const g = typeof DG !== 'undefined' && DG[d.di || 0]; return g ? g.n : 'Temniță';
}
/* res: 'win' (ieși după căpitan), 'retreat' (ieși sau fugi înainte), 'lost' (echipa a căzut) */
function bhAdd(d, res, gold) {
  if (!d || !S || d._bh) return; d._bh = 1;
  const L = d.loot || {}, items = (L.it || []).map(i => ({ n: i.name, r: i.r || 0, lg: i.lg ? 1 : 0 }));
  S.bh = S.bh || [];
  S.bh.unshift({ t: Date.now(), k: bhKind(d), n: bhTitle(d), res, g: gold != null ? gold : (L.gold || 0), o: L.ore || 0, x: res === 'win' || res === 'retreat' ? (L.xp || 0) : 0,
    m: Object.values(L.m || {}).reduce((a, b) => a + b, 0), it: res === 'lost' ? [] : items, log: d.hl || [] });
  if (S.bh.length > BHI.max) S.bh.length = BHI.max;
}
const bhAgo = t => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 60 ? 'acum' : s < 3600 ? `acum ${Math.floor(s / 60)} min` : s < 86400 ? `acum ${Math.floor(s / 3600)} h` : `acum ${Math.floor(s / 86400)} ${Math.floor(s / 86400) === 1 ? 'zi' : 'zile'}`; };
const bhItem = i => `<span class="bh-it ${i.lg ? 'lg' : 'q' + i.r}">${tEsc(i.n)}</span>`;
function bhOpen() {
  const list = S.bh || [], RES = { win: ['Victorie', 'win'], retreat: ['Retragere', 'ret'], lost: ['Înfrângere', 'lost'] };
  const rows = list.map(b => {
    const [rt, rc] = RES[b.res] || RES.retreat, gain = [b.g ? `+${b.g} aur` : '', b.o ? `+${b.o} minereu` : '', b.m ? `${b.m} materiale` : '', b.x ? `+${b.x} exp.` : ''].filter(Boolean).join(' · ');
    return `<details class="bh-r"><summary><img class="uii bh-k" src="imagini/ui/${BHI.ic[b.k] || 'nav-coborare'}.webp" alt=""><span class="bh-m"><b>${tEsc(b.n)}</b> <span class="bh-res ${rc}">${rt}</span><small>${bhAgo(b.t)}</small><br><small>${gain || 'fără pradă'}</small>${b.it.length ? `<br><small>Obiecte: ${b.it.map(bhItem).join(', ')}</small>` : ''}</span></summary>`
      + `<div class="bh-log">${b.log.length ? b.log.map(l => `<div${l.startsWith('—') ? ' class="bh-sep"' : ''}>${tEsc(l)}</div>`).join('') : '<div class="mute">Fără jurnal.</div>'}</div></details>`;
  }).join('');
  mdl(`<h3>Istoricul luptelor</h3><p class="mute">Ultimele ${BHI.max} coborâri, atacuri și provocări. Atinge una ca să-i vezi jurnalul.</p><div class="bh-l">${rows || '<p class="mute">Nu ai dat încă nicio luptă.</p>'}</div>`, 'bh');
}
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `#lgm.bh .lgm-c,#lgm.bh>div{max-width:620px;width:94vw;text-align:left}.bh-l{text-align:left;max-height:62vh;overflow:auto;display:flex;flex-direction:column;gap:6px;margin-top:8px}
.bh-r{border:1px solid var(--line);border-radius:10px;background:#0e1214}.bh-r summary{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;cursor:pointer;list-style:none}.bh-r summary::-webkit-details-marker{display:none}
.bh-k{width:30px!important;height:30px!important;flex:none}.bh-m{flex:1;min-width:0;font-size:14px}.bh-m small{color:var(--mute);margin-left:6px}.bh-m br+small{margin-left:0}
.bh-res{font-size:11.5px;padding:1px 7px;border-radius:9px;margin-left:4px}.bh-res.win{background:#1f4a2a;color:#9fe3ad}.bh-res.ret{background:#3a3220;color:#f0d27a}.bh-res.lost{background:#4a1f1f;color:#f1a29b}
.bh-log{border-top:1px solid var(--line);padding:8px 12px;font-size:12.5px;line-height:1.45;color:#cfd3d6;max-height:260px;overflow:auto}.bh-sep{color:var(--gold2);font-weight:700;margin-top:6px}
.bh-it{font-weight:700}.bh-it.q0{color:#d4d4d4}.bh-it.q1{color:#7fd88c}.bh-it.q2{color:#73a9ff}.bh-it.q3{color:#c590ff}.bh-it.lg{color:#ffb347}`;
  document.head.appendChild(st);
})();
