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

const { studentTCdf, studentTPdf, simpsonEstimate } = { ...VM.distributions, ...VM.numerical }

test('studentTCdf matches the closed forms for 1 and 2 degrees of freedom', () => {
  for (const t of [-30, -2.5, -0.3, 0, 0.7, 4, 100]) {
    // k = 1 is the Cauchy distribution; k = 2 has 1/2 + t / (2 sqrt(2 + t²))
    assert.ok(Math.abs(studentTCdf(t, 1) - (0.5 + Math.atan(t) / Math.PI)) < 1e-14, `k=1 t=${t}`)
    assert.ok(Math.abs(studentTCdf(t, 2) - (0.5 + t / (2 * Math.sqrt(2 + t * t)))) < 1e-14, `k=2 t=${t}`)
  }
})

test('studentTCdf is the integral of studentTPdf', () => {
  for (const k of [3, 7.5, 30]) {
    for (const t of [-3, -1, 0.5, 2.2]) {
      const area = simpsonEstimate(x => studentTPdf(x, k), 0, t, 2000)
      assert.ok(Math.abs(studentTCdf(t, k) - (0.5 + area)) < 1e-10, `k=${k} t=${t}`)
    }
  }
})

test('studentTCdf keeps a far tail relatively accurate', () => {
  // Cauchy: P(T <= -t) = atan(1/t)/pi, about 3.2e-13 at t = 1e12
  const t = 1e12
  assert.ok(rel(studentTCdf(-t, 1), Math.atan(1 / t) / Math.PI) < 1e-12)
  assert.ok(studentTCdf(-40, 5) > 0)
})

test('studentTCdf endpoints and invalid input', () => {
  assert.equal(studentTCdf(Infinity, 4), 1)
  assert.equal(studentTCdf(-Infinity, 4), 0)
  assert.equal(studentTCdf(0, 4), 0.5)
  assert.ok(Number.isNaN(studentTCdf(1, 0)))
  assert.ok(Number.isNaN(studentTCdf(NaN, 3)))
})
