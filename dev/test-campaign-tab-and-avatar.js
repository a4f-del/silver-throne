/* Tests for the missing Campanie handler and undefined.jpeg avatar fallback.
   Run: node dev/test-campaign-tab-and-avatar.js */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const ter = fs.readFileSync(path.join(__dirname, '../teritorii.js'), 'utf8');
const idx = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');

const mt = ter.match(/function mtab\(k\) \{[\s\S]*?\n\}/);
assert(mt, 'The map must define mtab() for its button onclick');
const state = { tab: 'm', mt: 'l', msg: 'old' };
let renders = 0;
const mtab = new Function('S', 'go', mt[0] + '; return mtab;')(state, () => renders++);
mtab('k');
assert.equal(state.mt, 'k', 'Campanie must open');
assert.equal(state.msg, '');
assert.equal(renders, 1);
mtab('invalid');
assert.equal(state.mt, 'k', 'Ignore invalid tabs');
assert.equal(renders, 1);
mtab('l');
assert.equal(state.mt, 'l', 'Lumea must open');
assert.equal(renders, 2);
assert(ter.includes('onclick="mtab('), 'The buttons must use the defined function');

const avLine = idx.match(/^function av\(f,z\)\{.*\}$/m);
assert(avLine, 'Avatar generator must exist');
const av = new Function('AV','S','av0','skinOn','MPIC','AVF','HS', avLine[0] + '; return av;')(
  {}, { prem: 0 }, () => '<svg>fallback</svg>', () => false, {}, { Campion: 'campion' }, {});
const missingClass = av({ c: 'UnknownNpcClass', n: 'NPC' }, 44);
assert(missingClass.includes('imagini/erou.jpeg'), 'Unknown class must use an existing fallback portrait');
assert(!missingClass.includes('undefined.jpeg'), 'Must not attempt undefined.jpeg');
console.log('OK: Campanie/Lumea navigation and avatar fallback.');
