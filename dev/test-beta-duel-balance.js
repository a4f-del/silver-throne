/* Silver Throne — regressions for BETA-only hero vs hero damage cap.
   Run with: node dev/test-beta-duel-balance.js */
'use strict';
const assert = require('node:assert/strict');
const TT = require('../tron-logic.js');

assert.equal(TT.CFG.duelHitCapPct, 0.38);
assert.equal(TT.duelDamageCap(5000, 500), 190, 'one hit must not eliminate a 500 HP player');
assert.equal(TT.duelDamageCap(5000, 100), 38);
assert.equal(TT.duelDamageCap(40, 500), 40, 'normal damage should not be boosted');
assert.equal(TT.duelDamageCap(0, 500), 0);
assert.equal(TT.duelDamageCap(-7, 500), 0);
assert.equal(TT.duelKingStarts(() => 0.1), true, 'king can win initiative');
assert.equal(TT.duelKingStarts(() => 0.9), false, 'challenger can win initiative');

function equalStatsDuel(kingStarts) {
  let hpKing = 500, hpChallenger = 500;
  const first = kingStarts ? 'king' : 'challenger';
  for (let turn = 0; turn < 10 && hpKing > 0 && hpChallenger > 0; turn++) {
    const isFirst = turn % 2 === 0;
    const player = isFirst ? first : (first === 'king' ? 'challenger' : 'king');
    const damage = TT.duelDamageCap(5000, 500);
    if (player === 'king') hpChallenger -= damage;
    else hpKing -= damage;
  }
  return hpKing <= 0 ? 'challenger' : 'king';
}
assert.equal(equalStatsDuel(true), 'king');
assert.equal(equalStatsDuel(false), 'challenger');
console.log('BETA duel checks passed: no single-hit KO at full health; either side can move first.');
