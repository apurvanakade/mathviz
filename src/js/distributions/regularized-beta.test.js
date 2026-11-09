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

const { regularizedBeta } = VM.distributions

test('regularizedBeta matches closed forms', () => {
  const choose = (n, k) => { let c = 1; for (let i = 1; i <= k; i++) c = c * (n - k + i) / i; return c }
  for (const x of [0.01, 0.2, 0.4, 0.75, 0.99]) {
    // I_x(1, b) = 1 - (1 - x)^b and I_x(a, 1) = x^a
    assert.ok(Math.abs(regularizedBeta(1, 3.5, x).lower - (1 - (1 - x) ** 3.5)) < 1e-14, `I(1,3.5) x=${x}`)
    assert.ok(Math.abs(regularizedBeta(2.5, 1, x).lower - x ** 2.5) < 1e-14, `I(2.5,1) x=${x}`)
    // I_x(1/2, 1/2) = (2/pi) asin(sqrt x), the arcsine law
    assert.ok(Math.abs(regularizedBeta(0.5, 0.5, x).lower - 2 / Math.PI * Math.asin(Math.sqrt(x))) < 1e-14, `I(.5,.5) x=${x}`)
    // Integer a, b: I_x(a, b) = P(Binomial(a + b - 1, x) >= a)
    const [a, b] = [7, 5]
    let sum = 0
    for (let j = a; j <= a + b - 1; j++) sum += choose(a + b - 1, j) * x ** j * (1 - x) ** (a + b - 1 - j)
    assert.ok(Math.abs(regularizedBeta(a, b, x).lower - sum) < 1e-14, `I(7,5) x=${x}`)
  }
})

test('regularizedBeta keeps a tiny tail relatively accurate on either side', () => {
  // I_x(1, b) upper = (1 - x)^b, far below double-precision epsilon here
  assert.ok(rel(regularizedBeta(1, 40, 0.9).upper, 0.1 ** 40) < 1e-12)
  // and the lower tail: I_x(a, 1) = x^a
  assert.ok(rel(regularizedBeta(40, 1, 0.1).lower, 0.1 ** 40) < 1e-12)
  // symmetry I_x(a, b) = 1 - I_{1-x}(b, a), across the branch point
  for (const x of [0.3, 0.45, 0.6]) {
    const r = regularizedBeta(3, 4, x), s = regularizedBeta(4, 3, 1 - x)
    assert.ok(Math.abs(r.lower - s.upper) < 1e-15 && Math.abs(r.upper - s.lower) < 1e-15, `x=${x}`)
  }
})

test('regularizedBeta endpoints and invalid input', () => {
  assert.deepEqual(regularizedBeta(2, 3, 0), {lower: 0, upper: 1})
  assert.deepEqual(regularizedBeta(2, 3, -1), {lower: 0, upper: 1})
  assert.deepEqual(regularizedBeta(2, 3, 1), {lower: 1, upper: 0})
  for (const [a, b, x] of [[0, 1, 0.5], [1, -1, 0.5], [1, 1, NaN]]) {
    const r = regularizedBeta(a, b, x)
    assert.ok(Number.isNaN(r.lower) && Number.isNaN(r.upper), `${a},${b},${x}`)
  }
})
