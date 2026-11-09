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

const { fQuantile, fCdf } = VM.distributions

test('fQuantile gives the tabulated 5% critical values', () => {
  // F-table F_{0.95, d1, d2}, to the table's 3 decimals
  const cases = [[1, 10, 4.965], [5, 10, 3.326], [12, 15, 2.475], [10, 20, 2.348], [3, 30, 2.922]]
  for (const [d1, d2, expected] of cases) {
    assert.ok(Math.abs(fQuantile(0.95, d1, d2) - expected) < 5e-4, `${d1},${d2}`)
  }
  // F(2, d2) inverts in closed form: x = (d2/2)((1 - p)^(-2/d2) - 1)
  assert.ok(rel(fQuantile(0.95, 2, 7), 3.5 * (0.05 ** (-2 / 7) - 1)) < 1e-11)
})

test('fQuantile inverts fCdf, and lower = 1 / upper with swapped df', () => {
  for (const p of [1e-6, 0.025, 0.5, 0.975]) {
    const x = fQuantile(p, 4, 11)
    assert.ok(rel(fCdf(x, 4, 11), p) < 1e-9, `p=${p}`)
  }
  assert.ok(rel(fQuantile(0.025, 12, 15), 1 / fQuantile(0.975, 15, 12)) < 1e-10)
})

test('fQuantile endpoints and invalid input', () => {
  assert.equal(fQuantile(0, 3, 4), 0)
  assert.equal(fQuantile(1, 3, 4), Infinity)
  assert.ok(Number.isNaN(fQuantile(0.5, 0, 4)))
  assert.ok(Number.isNaN(fQuantile(-0.1, 3, 4)))
})
