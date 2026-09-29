/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { chiSquaredCdf } = VM.distributions

test('chiSquaredCdf(x, 2) is the Exponential(1/2) CDF', () => {
  for (const x of [0.5, 2, 9]) {
    assert.ok(Math.abs(chiSquaredCdf(x, 2) - (1 - Math.exp(-x / 2))) < 1e-14)
  }
})

test('chiSquaredCdf matches reference values for odd k', () => {
  // scipy.stats.chi2.cdf(7.814727903251178, 3) = 0.95
  assert.ok(Math.abs(chiSquaredCdf(7.814727903251178, 3) - 0.95) < 1e-12)
  // chi2.cdf(1, 1) = P(|Z| <= 1)
  assert.ok(Math.abs(chiSquaredCdf(1, 1) - 0.6826894921370859) < 1e-14)
})

test('chiSquaredCdf is 0 at and below 0', () => {
  assert.equal(chiSquaredCdf(0, 3), 0)
  assert.equal(chiSquaredCdf(-2, 3), 0)
})
