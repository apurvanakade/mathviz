/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { normalCdf } = VM.distributions

test('normalCdf matches reference values of the standard normal', () => {
  // Reference values: scipy.stats.norm.cdf.
  const cases = [[0, 0.5], [1, 0.8413447460685429], [-1.96, 0.024997895148220435],
    [2, 0.9772498680518208], [-3, 0.0013498980316300946]]
  for (const [x, expected] of cases) {
    assert.ok(Math.abs(normalCdf(x) - expected) < 1e-14, `x=${x}: got ${normalCdf(x)}`)
  }
})

test('normalCdf is relatively accurate deep in the lower tail', () => {
  // scipy.stats.norm.cdf(-10) = 7.619853024160527e-24
  assert.ok(Math.abs(normalCdf(-10) / 7.619853024160527e-24 - 1) < 1e-10)
})

test('normalCdf uses mean and variance (not sd)', () => {
  assert.ok(Math.abs(normalCdf(7, 5, 4) - normalCdf(1)) < 1e-15)
})

test('normalCdf is NaN for a non-positive variance', () => {
  assert.ok(Number.isNaN(normalCdf(0, 0, 0)))
})
