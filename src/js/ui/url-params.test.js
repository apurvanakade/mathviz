/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { urlParam, syncUrlParams } = VM.ui

test('urlParam types its value like the fallback', () => {
  const search = '?n=250&bad=abc&empty=&name=Barbell&lazy=1&off=false'
  assert.equal(urlParam('n', 10, {search}), 250)
  assert.equal(urlParam('bad', 10, {search}), 10)
  assert.equal(urlParam('empty', 10, {search}), 10)
  assert.equal(urlParam('missing', 10, {search}), 10)
  assert.equal(urlParam('name', 'Cycle', {search}), 'Barbell')
  assert.equal(urlParam('lazy', false, {search}), true)
  assert.equal(urlParam('off', true, {search}), false)
})

test('syncUrlParams sets changed keys, drops defaults and keeps other keys', () => {
  const search = '?embed=pi-app&pi_n=500&other=x'
  const query = syncUrlParams({pi_n: [1000, 1000], pi_seed: [7, 1]}, {search})
  assert.equal(query, 'embed=pi-app&other=x&pi_seed=7')
  assert.equal(syncUrlParams({a: [1, 1]}, {search: ''}), '')
})

test('syncUrlParams writes to history when reading the live URL, keeping history.state', () => {
  const calls = []
  globalThis.location = {search: '?keep=1', pathname: '/chapters/x.html', hash: '#sec'}
  globalThis.history = {state: {router: 1}, replaceState: (state, title, url) => calls.push([state, url])}
  syncUrlParams({n: [5, 1]})
  assert.deepEqual(calls, [[{router: 1}, '/chapters/x.html?keep=1&n=5#sec']])
})

test('syncUrlParams throttles a burst of writes and always lands the last one', async (t) => {
  t.mock.timers.enable({apis: ['setTimeout']})
  const calls = []
  globalThis.location = {search: '', pathname: '/p.html', hash: ''}
  globalThis.history = {
    state: null,
    replaceState: (state, title, url) => {
      calls.push(url)
      globalThis.location.search = url.includes('?') ? url.slice(url.indexOf('?')) : ''
    }
  }
  // Let the previous test's write age out of the interval.
  t.mock.timers.tick(1000)
  globalThis.performance = {now: () => Date.now()}
  for (let i = 1; i <= 60; i++) syncUrlParams({n: [i, 0]})
  t.mock.timers.tick(1000)
  // Two burst writes at most: the leading one is skipped or written, the
  // trailing one carries the final value.
  assert.ok(calls.length <= 2, `wrote ${calls.length} times`)
  assert.equal(calls.at(-1), '/p.html?n=60')
})

test('syncUrlParams does not write an unchanged query', (t) => {
  t.mock.timers.enable({apis: ['setTimeout']})
  const calls = []
  globalThis.location = {search: '?n=3', pathname: '/p.html', hash: ''}
  globalThis.history = {state: null, replaceState: (state, title, url) => calls.push(url)}
  syncUrlParams({n: [3, 0]})
  t.mock.timers.tick(1000)
  assert.deepEqual(calls, [])
})
