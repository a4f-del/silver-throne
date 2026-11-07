/* Regression for BETA mercenary introductions.
   Run locally with: node dev/test-beta-mercenary-story.js
   No DB connection or production save needed. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const story = fs.readFileSync(require('node:path').join(__dirname, '../mercenari-poveste.js'), 'utf8');
const mercenaries = fs.readFileSync(require('node:path').join(__dirname, '../mercenari.js'), 'utf8');

function setup(server = 'beta') {
  const count = { l: 0, t: 0, bs: 0 };
  const S = { mrv: 2, tu: 0, lvl: 1, xp: 0, hc: null, fs: [{ h: 1, c: 'Campion', hp: 100, n: 'Eroul' }],
    rs: [], inv: [], mrOff: [], mrSeen: [], gift: 1, tab: 'a', vil: 'h', mt: 'h' };
  const ctx = { ST_SERVER: server, S, C: k => count[k] || 0, mhp: () => 99,
    TMAX: () => 3, P: a => a[0], TR: [{ n: 'Curajos', d: 'curajos' }],
    GHID: [{ t: 'Bine ai venit!' }, { t: 'Hanul' }], module: { exports: {} } };
  vm.createContext(ctx);
  vm.runInContext(story + '\n' + mercenaries + '\nthis.TEST = {mrTick,mrStoryDue,mrStoryPlaceReady,MR_STORY};', ctx);
  return { count, S, api: ctx.TEST };
}
const beta = setup();
beta.api.mrTick();
assert.equal(beta.S.fs.length, 1, 'No automatic team before hero creation');
assert.equal(beta.S.mrOff.length, 0);
beta.S.hc = 1; beta.S.mrStoryV = 1;
beta.api.mrTick();
assert.deepEqual(Array.from(beta.S.mrOff), ['Paznic']);
assert.equal(beta.S.fs.length, 1, 'No mercenary joins before accepting the scene');
beta.count.l = 1; beta.api.mrTick();
assert.deepEqual(Array.from(beta.S.mrOff), ['Paznic', 'Arcaș']);
beta.count.t = 1; beta.api.mrTick();
assert(beta.S.mrOff.includes('Războinic'));
beta.count.bs = 1; beta.api.mrTick();
assert(beta.S.mrOff.includes('Vraci'));
beta.S.lvl = 5; beta.api.mrTick();
assert.equal(beta.S.mrOff.length, 5);
assert.equal(beta.S.fs.length, 1);
assert.equal(beta.api.mrStoryPlaceReady('Războinic'), true);
assert.equal(beta.api.mrStoryPlaceReady('Mag'), false);
beta.S.tab = 'm'; beta.S.mt = 'l';
assert.equal(beta.api.mrStoryPlaceReady('Mag'), true);
for (const story of Object.values(beta.api.MR_STORY))
  for (const field of ['title','place','prose','quote','clue','action'])
    assert(story[field] && story[field].length > 12);
beta.S.mrStoryV = undefined;
assert.equal(beta.api.mrStoryDue('Paznic'), false, 'Existing save must not enter new onboarding');
const live = setup('live');
live.S.hc = 1;
live.api.mrTick();
assert.deepEqual(Array.from(live.S.fs.map(f => f.c)), ['Campion', 'Paznic', 'Arcaș'], 'LIVE onboarding unchanged');
console.log('OK: all five encounters unlock in order, no early recruits; LIVE unchanged.');
