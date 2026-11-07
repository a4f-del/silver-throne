/* Bonus defensiv BETA calculat doar la folosire; nu modifica obiectul salvat.
   In LIVE statisticile raman neschimbate. */
function stGearStats(item, server) {
  const stats = item && item.s ? item.s : {};
  if (server !== 'beta' || !item || !['a', 'h', 'b', 'j'].includes(item.t)) return stats;
  const out = { ...stats };
  if (Number.isFinite(out.hp) && out.hp > 0) out.hp = Math.round(out.hp * 1.35);
  if (Number.isFinite(out.def) && out.def > 0) out.def = Math.round(out.def * 1.20);
  return out;
}
if (typeof module !== 'undefined' && module.exports) module.exports = { stGearStats };
