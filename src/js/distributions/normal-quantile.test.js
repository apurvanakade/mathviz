/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { normalQuantile, normalCdf } = VM.distributions

test('normalQuantile gives the familiar critical values', () => {
  assert.ok(Math.abs(normalQuantile(0.975) - 1.959963984540054) < 1e-12)
  assert.ok(Math.abs(normalQuantile(0.025) + 1.959963984540054) < 1e-12)
  assert.equal(normalQuantile(0.5), 0)
})

test('normalQuantile inverts normalCdf across all three regions', () => {
  for (const p of [1e-12, 1e-4, 0.02, 0.1, 0.5, 0.9, 0.98, 1 - 1e-6]) {
    const x = normalQuantile(p)
    assert.ok(Math.abs(normalCdf(x) / p - 1) < 1e-10, `p=${p}: cdf(${x}) = ${normalCdf(x)}`)
  }
})

test('normalQuantile scales by the variance', () => {
  assert.ok(Math.abs(normalQuantile(0.975, 10, 9) - (10 + 3 * 1.959963984540054)) < 1e-11)
})

test('normalQuantile endpoints and invalid input', () => {
  assert.equal(normalQuantile(0), -Infinity)
  assert.equal(normalQuantile(1), Infinity)
  assert.ok(Number.isNaN(normalQuantile(1.5)))
  assert.ok(Number.isNaN(normalQuantile(0.5, 0, 0)))
})
