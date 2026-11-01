/* ============================================================================
   Silver Throne — portofel.js
   Portofelul pe server (supabase/05-portofel.sql): aurul, minereul, materialele și nivelul se trimit periodic
   la server, care acceptă cheltuielile, dar câștigurile doar până la o limită plauzibilă pe oră. Răspunsul
   serverului devine valoarea din joc (păstrând ce s-a schimbat cât timp se aștepta răspunsul).
   Dacă fișierul SQL nu e rulat încă, jocul merge ca înainte.
   ========================================================================== */
const PF = { busy: 0, off: 0, at: 0, n: 0 };
async function pfSync() {
  if (PF.busy || PF.off || typeof tronRpc !== 'function' || typeof CONT === 'undefined' || !CONT.user || !CONT.booted || !S) return;
  PF.busy = 1;
  const g0 = Math.floor(S.gold || 0), o0 = Math.floor(S.ore || 0), m0 = { ...(S.mat || {}) }, l0 = S.lvl;
  const r = await tronRpc('wallet_sync', { p_gold: g0, p_ore: o0, p_mats: m0, p_lvl: l0 });
  PF.busy = 0;
  if (r.error) { if (/Could not find the function|does not exist|schema cache/i.test(r.error)) PF.off = 1; return; }
  const d = r.data || {}; if (d.gold == null) return;
  const before = [S.gold, S.ore, JSON.stringify(S.mat), S.lvl].join('|');
  /* valoarea serverului + ce s-a schimbat în joc între timp */
  S.gold = Math.max(0, d.gold + (Math.floor(S.gold || 0) - g0));
  S.ore = Math.max(0, d.ore + (Math.floor(S.ore || 0) - o0));
  const cur = S.mat || {}, nm = {}, ks = new Set([...Object.keys(d.mats || {}), ...Object.keys(cur), ...Object.keys(m0)]);
  for (const k of ks) { const v = Math.max(0, ((d.mats || {})[k] || 0) + ((cur[k] || 0) - (m0[k] || 0))); if (v > 0) nm[k] = v; }
  S.mat = nm;
  /* nivelul din joc nu se coboară: serverul își ține nivelul acceptat (pentru limite, Lume și clasament) */
  if (d.cut && !d.first) S.msg = 'Serverul a corectat resursele: unele câștiguri nu erau plauzibile.';
  PF.at = Date.now(); PF.n++;
  if (before !== [S.gold, S.ore, JSON.stringify(S.mat), S.lvl].join('|') && typeof go === 'function') go();
}
if (typeof window !== 'undefined') { setTimeout(pfSync, 4000); setInterval(pfSync, 45000); }
