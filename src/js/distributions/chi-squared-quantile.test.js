/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { chiSquaredQuantile, chiSquaredCdf } = VM.distributions

test('chiSquaredQuantile gives the tabulated 5% critical values', () => {
  // scipy.stats.chi2.ppf(0.95, k)
  const cases = [[1, 3.841458820694124], [2, 5.991464547107979], [3, 7.814727903251178],
    [9, 16.918977604620448]]
  for (const [k, expected] of cases) {
    const x = chiSquaredQuantile(0.95, k)
    assert.ok(Math.abs(x - expected) < 1e-9, `k=${k}: got ${x}`)
  }
})

test('chiSquaredQuantile inverts chiSquaredCdf, including far past the mean', () => {
  for (const p of [0.001, 0.5, 0.999999]) {
    const x = chiSquaredQuantile(p, 4)
    assert.ok(Math.abs(chiSquaredCdf(x, 4) - p) < 1e-10, `p=${p}`)
  }
})

test('chiSquaredQuantile endpoints and invalid input', () => {
  assert.equal(chiSquaredQuantile(0, 3), 0)
  assert.equal(chiSquaredQuantile(1, 3), Infinity)
  assert.ok(Number.isNaN(chiSquaredQuantile(0.5, 0)))
  assert.ok(Number.isNaN(chiSquaredQuantile(-0.1, 3)))
})
