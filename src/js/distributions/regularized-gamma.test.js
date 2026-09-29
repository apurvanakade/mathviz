/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { regularizedGamma } = VM.distributions

const close = (actual, expected, tol, what) => {
  assert.ok(Math.abs(actual - expected) <= tol, `${what}: expected ${expected}, got ${actual}`)
}

test('regularizedGamma(1, x) is the Exponential(1) CDF, on both sides of a + 1', () => {
  for (const x of [0.1, 1, 1.9, 2.5, 10]) {
    const {lower, upper} = regularizedGamma(1, x)
    close(lower, 1 - Math.exp(-x), 1e-14, `P(1, ${x})`)
    close(upper, Math.exp(-x), 1e-14, `Q(1, ${x})`)
  }
})

test('regularizedGamma keeps a tiny upper tail relatively accurate', () => {
  // Q(1, 50) = e^-50; 1 - P would round it to 0.
  const {upper} = regularizedGamma(1, 50)
  assert.ok(Math.abs(upper / Math.exp(-50) - 1) < 1e-12, `got ${upper}`)
})

test('regularizedGamma lower and upper sum to 1 for a half-integer shape', () => {
  for (const x of [0.2, 1.5, 4, 12]) {
    const {lower, upper} = regularizedGamma(2.5, x)
    close(lower + upper, 1, 1e-14, `x=${x}`)
  }
})

test('regularizedGamma edge cases', () => {
  assert.deepEqual(regularizedGamma(2, 0), {lower: 0, upper: 1})
  assert.deepEqual(regularizedGamma(2, -1), {lower: 0, upper: 1})
  assert.deepEqual(regularizedGamma(2, Infinity), {lower: 1, upper: 0})
  assert.ok(Number.isNaN(regularizedGamma(0, 1).lower))
  assert.ok(Number.isNaN(regularizedGamma(1, NaN).upper))
})
