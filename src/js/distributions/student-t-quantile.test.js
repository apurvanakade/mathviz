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

const { studentTQuantile, studentTCdf } = VM.distributions

test('studentTQuantile gives the tabulated two-sided 5% critical values', () => {
  // t-table t_{0.975, k}, to the table's 3 decimals
  const cases = [[1, 12.706], [5, 2.571], [10, 2.228], [15, 2.131], [20, 2.086], [30, 2.042]]
  for (const [k, expected] of cases) {
    assert.ok(Math.abs(studentTQuantile(0.975, k) - expected) < 5e-4, `k=${k}`)
  }
  // k = 1 is Cauchy: quantile = tan(pi (p - 1/2)), exactly
  assert.ok(rel(studentTQuantile(0.975, 1), Math.tan(Math.PI * 0.475)) < 1e-11)
})

test('studentTQuantile inverts studentTCdf and is antisymmetric', () => {
  for (const p of [1e-12, 0.01, 0.3, 0.7, 0.999]) {
    const t = studentTQuantile(p, 6)
    assert.ok(rel(studentTCdf(t, 6), p) < 1e-9, `p=${p}`)
  }
  // 0.25 and 0.75 are exact in binary, so these are the same tail
  assert.ok(Math.abs(studentTQuantile(0.25, 6) + studentTQuantile(0.75, 6)) < 1e-12)
})

test('studentTQuantile endpoints and invalid input', () => {
  assert.equal(studentTQuantile(0, 3), -Infinity)
  assert.equal(studentTQuantile(1, 3), Infinity)
  assert.equal(studentTQuantile(0.5, 3), 0)
  assert.ok(Number.isNaN(studentTQuantile(0.5, 0)))
  assert.ok(Number.isNaN(studentTQuantile(1.1, 3)))
})
