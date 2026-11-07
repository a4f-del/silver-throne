/* Regression: defensive item bonuses stay BETA-only and never rewrite saved items.
   Run with: node dev/test-beta-gear-balance.js */
'use strict';
const assert = require('node:assert/strict');
const { stGearStats } = require('../echipament-balance.js');

const cases = [
  ['a', { hp: 100, def: 50, dmg: 2 }, { hp: 135, def: 60, dmg: 2 }],
  ['h', { hp: 200, def: 30 }, { hp: 270, def: 36 }],
  ['b', { hp: 151, def: 31 }, { hp: 204, def: 37 }],
  ['j', { hp: 80, def: 0 }, { hp: 108, def: 0 }],
  ['w', { hp: 80, def: 50 }, { hp: 80, def: 50 }],
  ['r', { hp: 80, def: 50 }, { hp: 80, def: 50 }]
];
for (const [type, raw, expected] of cases) {
  const it = { t: type, s: { ...raw } };
  assert.deepEqual(stGearStats(it, 'beta'), expected, 'BETA for item ' + type);
  assert.deepEqual(stGearStats(it, 'live'), raw, 'LIVE for item ' + type);
  assert.deepEqual(it.s, raw, 'save must not be mutated for item ' + type);
}
assert.deepEqual(stGearStats(null, 'beta'), {});
assert.deepEqual(stGearStats({ t:'a', s:{ hp:0, def:0 }}, 'beta'), {hp:0,def:0});
console.log('OK — bonusuri defensive BETA, LIVE neschimbat, fără modificarea obiectelor salvate.');
