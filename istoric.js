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
const bhKind = d => d.tw ? 'w' : d.lume ? 'p' : d.tron ? 't' : d.wn ? 's' : d.raid != null ? 'r' : 'd';
function bhTitle(d) {
  if (d.tw) return 'Turnul · până la etajul ' + (d.room || 0);
  if (d.lume) return 'Atac: ' + (d.rn || d.bn);
  if (d.tron) return 'Tronul de Argint · ' + d.bn;
  if (d.raid != null) return (d.lbl || 'Jaf') + ': ' + (d.rn || d.bn || 'sat');
  const g = typeof DG !== 'undefined' && DG[d.di || 0], nm = d.one && typeof trNames === 'function' && trNames(d.di || 0);
  return g ? g.n + (nm ? ' · ' + nm[Math.min(d.room, nm.length - 1)] : '') : 'Temniță';
}
/* res: 'win' (ieși după căpitan), 'retreat' (ieși sau fugi înainte), 'lost' (echipa a căzut) */
function bhAdd(d, res, gold) {
  if (!d || !S || d._bh) return; d._bh = 1;
  const L = d.loot || {}, items = (L.it || []).map(i => ({ n: i.name, r: i.r || 0, lg: i.lg ? 1 : 0 }));
  // BETA: pentru diagnostic, legăm jurnalul LOCAL de ID-ul provocării Tron.
  // Nu îl trimitem pe server și nu îl folosim la validarea victoriei.
  const id = d.tron && S.tron && S.tron.cur
    ? Number(S.tron.cur.id) : NaN;
  S.bh = S.bh || [];
  S.bh.unshift({ t: Date.now(), k: bhKind(d), n: bhTitle(d), res,
    ...(Number.isSafeInteger(id) && id > 0 ? { cid: id } : {}),
    g: gold != null ? gold : (L.gold || 0), o: L.ore || 0, x: res === 'win' || res === 'retreat' ? (L.xp || 0) : 0,
    m: Object.values(L.m || {}).reduce((a, b) => a + b, 0), it: res === 'lost' ? [] : items, log: d.hl || [] });
  if (S.bh.length > BHI.max) S.bh.length = BHI.max;
}
const bhAgo = t => { const s = Math.max(0, (Date.now() - t) / 1000); return s < 60 ? 'acum' : s < 3600 ? `acum ${Math.floor(s / 60)} min` : s < 86400 ? `acum ${Math.floor(s / 3600)} h` : `acum ${Math.floor(s / 86400)} ${Math.floor(s / 86400) === 1 ? 'zi' : 'zile'}`; };
const bhItem = i => `<span class="bh-it ${i.lg ? 'lg' : 'q' + i.r}">${tEsc(i.n)}</span>`;
/* panoul „Ultima luptă” din Coborâre: ultima luptă dintr-o temniță, din ultimele 15 minute */
function bhLast() {
  const b = (S.bh || [])[0]; if (!b || b.k !== 'd' || Date.now() - b.t > 15 * 60e3) return '';
  const RES = { win: ['Victorie', 'win'], retreat: ['Retragere', 'ret'], lost: ['Înfrângere', 'lost'] }, [rt, rc] = RES[b.res] || RES.retreat;
  const gain = [b.g ? `+${b.g} aur` : '', b.o ? `+${b.o} minereu` : '', b.m ? `${b.m} materiale` : '', b.x ? `+${b.x} exp.` : ''].filter(Boolean).join(' · ');
  return `<section class="bh-last"><h2>Ultima luptă <span class="bh-res ${rc}">${rt}</span></h2><div class="mute">${tEsc(b.n)} · ${gain || 'fără pradă'}${b.it.length ? ` · obiecte: ${b.it.map(bhItem).join(', ')}` : ''}</div>`
    + `<details${b.res === 'lost' ? ' open' : ''}><summary>Jurnalul luptei</summary><div class="bh-log">${b.log.map(l => `<div${l.startsWith('—') ? ' class="bh-sep"' : ''}>${tEsc(l)}</div>`).join('')}</div></details></section>`;
}
/* BETA: export voluntar al jurnalului local. Este doar diagnostic, nu
   raport autoritativ către server. Poate conține nume de personaje:
   jucătorul alege explicit dacă îl copiază și distribuie. */
function bhExport(i) {
  const b = S && Array.isArray(S.bh) ? S.bh[i] : null;
  if (!b) return '';
  const date = Number.isFinite(b.t) ? new Date(b.t).toISOString() : 'necunoscută';
  const id = Number.isSafeInteger(b.cid) && b.cid > 0 ? 'Provocare Tron #'+b.cid+'\n' : '';
  const status = { win: 'Victorie', retreat: 'Retragere', lost: 'Înfrângere' }[b.res] || 'Necunoscut';
  const lines = Array.isArray(b.log) ? b.log.slice(-BHI.lines).map(x => String(x).slice(0, 1000)) : [];
  return 'Silver Throne BETA · jurnal local (nevalidat de server)\n'+
    id+'Data: '+date+'\nLupta: '+String(b.n || '')+'\nRezultat local: '+status+
    '\n---\n'+(lines.join('\n') || 'Fără jurnal.');
}
async function bhCopy(i, button) {
  const content = bhExport(i);
  if (!content) return;
  try {
    if (typeof navigator === 'undefined' || !navigator.clipboard ||
        typeof navigator.clipboard.writeText !== 'function')
      throw new Error('Clipboard indisponibil');
    await navigator.clipboard.writeText(content);
    if (button && button.isConnected) button.textContent = '✓ Jurnal copiat';
  } catch (_) {
    if (typeof window !== 'undefined' && typeof window.prompt === 'function')
      window.prompt('Selectează și copiază jurnalul:', content);
  }
}
function bhOpen() {
  const list = S.bh || [], RES = { win: ['Victorie', 'win'], retreat: ['Retragere', 'ret'], lost: ['Înfrângere', 'lost'] };
  const rows = list.map((b,i) => {
    const [rt, rc] = RES[b.res] || RES.retreat, gain = [b.g ? `+${b.g} aur` : '', b.o ? `+${b.o} minereu` : '', b.m ? `${b.m} materiale` : '', b.x ? `+${b.x} exp.` : ''].filter(Boolean).join(' · ');
    return (i===0?'<div class="bh-latest-label">Ultima luptă · deschide pentru jurnal</div>':'') + `<details class="bh-r"><summary><img class="uii bh-k" src="${b.k === 'w' ? 'imagini/lume/turn.webp' : 'imagini/ui/' + (BHI.ic[b.k] || 'nav-coborare') + '.webp'}" alt=""><span class="bh-m"><b>${tEsc(b.n)}</b> <span class="bh-res ${rc}">${rt}</span><small>${bhAgo(b.t)}</small><br><small>${gain || 'fără pradă'}</small>${b.it.length ? `<br><small>Obiecte: ${b.it.map(bhItem).join(', ')}</small>` : ''}</span></summary>`
      + (b.k === 't'
        ? '<div class="bh-copy"><button type="button" onclick="bhCopy('+i+',this)">📋 Copiază jurnalul</button>'+
          (Number.isSafeInteger(b.cid)&&b.cid>0?'<span>Provocare #'+b.cid+'</span>':'')+'</div>' : '')+
      `<div class="bh-log">${b.log.length ? b.log.map(l => `<div${l.startsWith('—') ? ' class="bh-sep"' : ''}>${tEsc(l)}</div>`).join('') : '<div class="mute">Fără jurnal.</div>'}</div></details>`;
  }).join('');
  mdl(`<h3>Lupte · Istoric și jurnal</h3><p class="mute">Ultimele ${BHI.max} coborâri, atacuri și provocări. Atinge una ca să-i vezi jurnalul.</p><div class="bh-l">${rows || '<p class="mute">Nu ai dat încă nicio luptă.</p>'}</div>`, 'bh');
}
(function () {
  if (typeof document === 'undefined' || !document.head) return;
  const st = document.createElement('style');
  st.textContent = `#lgm.bh .lgm-c,#lgm.bh>div{max-width:620px;width:94vw;text-align:left}.bh-l{text-align:left;max-height:62vh;overflow:auto;display:flex;flex-direction:column;gap:6px;margin-top:8px}
.bh-latest-label{color:#e7cb8a;font:700 12px Cinzel,Georgia,serif;margin:3px 0 -2px;padding:2px 3px}
.bh-r{border:1px solid var(--line);border-radius:10px;background:#0e1214}.bh-r summary{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;cursor:pointer;list-style:none}.bh-r summary::-webkit-details-marker{display:none}
.bh-k{width:30px!important;height:30px!important;flex:none}.bh-m{flex:1;min-width:0;font-size:14px}.bh-m small{color:var(--mute);margin-left:6px}.bh-m br+small{margin-left:0}
.bh-res{font-size:11.5px;padding:1px 7px;border-radius:9px;margin-left:4px}.bh-res.win{background:#1f4a2a;color:#9fe3ad}.bh-res.ret{background:#3a3220;color:#f0d27a}.bh-res.lost{background:#4a1f1f;color:#f1a29b}
.bh-copy{display:flex;gap:9px;align-items:center;padding:7px 11px}.bh-copy button{font-size:12px;padding:5px 10px}.bh-copy span{font-size:11px;color:var(--mute)}
.bh-log{border-top:1px solid var(--line);padding:8px 12px;font-size:12.5px;line-height:1.45;color:#cfd3d6;max-height:260px;overflow:auto}.bh-sep{color:var(--gold2);font-weight:700;margin-top:6px}
.bh-last details{margin-top:6px}.bh-last summary{cursor:pointer;color:var(--gold2);font-size:13.5px}.bh-last .bh-log{border:1px solid var(--line);border-radius:8px;margin-top:6px;max-height:220px}
.bh-it{font-weight:700}.bh-it.q0{color:#d4d4d4}.bh-it.q1{color:#7fd88c}.bh-it.q2{color:#73a9ff}.bh-it.q3{color:#c590ff}.bh-it.lg{color:#ffb347}`;
  document.head.appendChild(st);
})();
