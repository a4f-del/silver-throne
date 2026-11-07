/* Bonusurile vechi de apărare a satului sunt pensionate doar în BETA.
   Obiectele salvate NU sunt rescrise: efectul istoric vd se transformă în apărare
   normală (+1 apărare la 4% vd), ca posesorii să nu piardă valoarea obiectelor.
   Statistica LIVE și valorile existente în salvări rămân neschimbate. */
function stVillageDefenseRetired(server) { return server === 'beta'; }
function stGearStats(item, server) {
  const stats = item && item.s ? item.s : {};
  if (!stVillageDefenseRetired(server) || !item) return stats;
  const out = { ...stats };
  if (Number.isFinite(+out.vd) && +out.vd > 0) {
    out.def = (+out.def || 0) + Math.max(1, Math.round(+out.vd / 4));
    delete out.vd;
  }
  if (['a', 'h', 'b', 'j'].includes(item.t)) {
    if (Number.isFinite(out.hp) && out.hp > 0) out.hp = Math.round(out.hp * 1.35);
    if (Number.isFinite(out.def) && out.def > 0) out.def = Math.round(out.def * 1.20);
  }
  return out;
}
if (typeof module !== 'undefined' && module.exports)
  module.exports = { stGearStats, stVillageDefenseRetired };
