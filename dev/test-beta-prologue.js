/* Silver Throne — regresii prolog BETA.
   Test fara browser sau Supabase: node dev/test-beta-prologue.js */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const prolog = fs.readFileSync(path.join(__dirname, '../prolog.js'), 'utf8');
const stories = fs.readFileSync(path.join(__dirname, '../mercenari-poveste.js'), 'utf8');

function makeDocument() {
  const map = new Map();
  const document = {
    head: { appendChild() {} },
    body: { appendChild(e) { map.set(e.id, e); } },
    getElementById(id) { return map.get(id) || null; },
    querySelector() { return null; },
    createElement() {
      let id = '';
      return {
        set id(value) { id = value; }, get id() { return id; },
        innerHTML: '', textContent: '', setAttribute() {},
        querySelector() { return { focus() {} }; },
        remove() { map.delete(id); }
      };
    }
  };
  return { document, map };
}
function make(server = 'beta', extra = {}) {
  const { document, map } = makeDocument();
  const S = { hc: 1, mrStoryV: 1, mrPrologPending: 1, mrPrologSeen: 0,
    d: null, fs: [{ h: 1, c: 'Campion' }], rs: [], mrOff: ['Paznic'], ...extra };
  let goes = 0;
  const ctx = {
    S, ST_SERVER: server, document, module: { exports: {} },
    MR: { order: [['Paznic', null]], storyWait: 0 },
    mrAll: () => S.fs, mrHas: () => false,
    tEsc: s => s, av: () => '<svg>portrait</svg>', C: () => 0
  };
  ctx.go = () => { goes++; vm.runInContext('mrStoryPost()', ctx); };
  vm.createContext(ctx);
  vm.runInContext(prolog + '\n' + stories, ctx);
  return { S, map, ctx, goCount: () => goes };
}
const test = make();
vm.runInContext('mrStoryPost()', test.ctx);
assert(test.map.has('st-prolog'), 'Prolog must precede Paznic');
assert(!test.map.has('mr-scene'));
vm.runInContext('stPrologNext()', test.ctx);
assert.equal(vm.runInContext('ST_PROLOG_UI.index', test.ctx), 1);
assert.equal(test.S.mrPrologSeen, 0, 'Do not save progress mid-scene');
vm.runInContext('stPrologNext(); stPrologNext()', test.ctx);
assert.equal(test.S.mrPrologSeen, 1);
assert.equal(test.S.mrPrologPending, 0);
assert(!test.map.has('st-prolog'));
assert(test.map.has('mr-scene'), 'Paznic should start after the prologue');
assert.equal(test.goCount(), 1);
const skip = make();
vm.runInContext('mrStoryPost(); stPrologSkip()', skip.ctx);
assert.equal(skip.S.mrPrologSeen, 1);
assert(skip.map.has('mr-scene'));
const old = make('beta', { mrStoryV: undefined, mrPrologPending: undefined, mrPrologSeen: undefined, mrOff: [] });
vm.runInContext('mrStoryPost(); stPrologPreview(); stPrologSkip()', old.ctx);
assert.equal(old.S.mrPrologSeen, undefined, 'Preview cannot mutate an existing save');
assert.equal(old.S.mrPrologPending, undefined);
assert.equal(old.goCount(), 0);
const live = make('live');
vm.runInContext('mrStoryPost(); stPrologPreview()', live.ctx);
assert(!live.map.has('st-prolog'), 'Prologue must never be shown on LIVE');
const finished = make('beta', { mrPrologSeen: 1, mrPrologPending: 0 });
vm.runInContext('mrStoryPost()', finished.ctx);
assert(!finished.map.has('st-prolog'), 'Prologue must be shown only once');
assert(finished.map.has('mr-scene'));
console.log('OK: prologul precede Paznicul, poate fi sarit, preview e sigur, LIVE neschimbat.');
