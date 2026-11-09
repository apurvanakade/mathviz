/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const rel = (got, want) => Math.abs(got - want) / Math.abs(want)

const { fCdf, fPdf, chiSquaredCdf, studentTCdf } = VM.distributions

test('fCdf matches the closed form for 2 numerator degrees of freedom', () => {
  // F(2, d2): P(X <= x) = 1 - (1 + 2x/d2)^(-d2/2)
  for (const d2 of [1, 4, 17]) {
    for (const x of [0.05, 0.8, 3, 40]) {
      assert.ok(Math.abs(fCdf(x, 2, d2) - (1 - (1 + 2 * x / d2) ** (-d2 / 2))) < 1e-14, `d2=${d2} x=${x}`)
    }
  }
})

test('fCdf ties to t and chi-squared', () => {
  // T² ~ F(1, k): P(F <= t²) = P(|T| <= t)
  for (const t of [0.4, 1.7, 3]) {
    assert.ok(Math.abs(fCdf(t * t, 1, 9) - (2 * studentTCdf(t, 9) - 1)) < 1e-13, `t=${t}`)
  }
  // d1·F -> chi-squared(d1) as d2 -> infinity
  assert.ok(Math.abs(fCdf(7 / 3, 3, 1e9) - chiSquaredCdf(7, 3)) < 1e-7)
})

test('fCdf is the integral of fPdf', () => {
  const {simpsonEstimate} = VM.numerical
  for (const [d1, d2] of [[3, 8], [12, 15]]) {
    for (const x of [0.5, 1.4, 3]) {
      // The density behaves like u^(d1/2 - 1) at 0, which Simpson's rule
      // integrates slowly; u = s² makes the integrand smooth.
      const area = simpsonEstimate(s => 2 * s * fPdf(s * s, d1, d2), 0, Math.sqrt(x), 4000)
      assert.ok(Math.abs(fCdf(x, d1, d2) - area) < 1e-9, `${d1},${d2} x=${x}`)
    }
  }
})

test('fCdf endpoints and invalid input', () => {
  assert.equal(fCdf(0, 3, 4), 0)
  assert.equal(fCdf(-2, 3, 4), 0)
  assert.equal(fCdf(Infinity, 3, 4), 1)
  assert.ok(Number.isNaN(fCdf(1, 0, 4)))
  assert.ok(Number.isNaN(fCdf(1, 3, -1)))
  assert.ok(Number.isNaN(fCdf(NaN, 3, 4)))
})
