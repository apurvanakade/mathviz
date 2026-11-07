/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { logGamma } = VM.distributions

test('logGamma matches known Gamma function values', () => {
  assert.ok(Math.abs(logGamma(1) - 0) < 1e-9, 'Gamma(1) = 1')
  assert.ok(Math.abs(logGamma(2) - 0) < 1e-9, 'Gamma(2) = 1')
  assert.ok(Math.abs(logGamma(5) - Math.log(24)) < 1e-9, 'Gamma(5) = 4! = 24')
  assert.ok(Math.abs(logGamma(10) - Math.log(362880)) < 1e-7, 'Gamma(10) = 9!')
  assert.ok(Math.abs(logGamma(0.5) - Math.log(Math.sqrt(Math.PI))) < 1e-9, 'Gamma(0.5) = sqrt(pi)')
})

test('logGamma stays finite well past the point Gamma itself overflows', () => {
  assert.ok(Number.isFinite(logGamma(500)))
  assert.ok(Number.isFinite(logGamma(2000)))
})

test('logGamma is ln|Γ| where Γ is negative, and Infinity at the poles', () => {
  const { logGamma } = VM.distributions
  // Γ(-0.5) = -2√π
  assert.ok(Math.abs(logGamma(-0.5) - Math.log(2 * Math.sqrt(Math.PI))) < 1e-12)
  // Γ(-1.5) = 4√π/3 > 0
  assert.ok(Math.abs(logGamma(-1.5) - Math.log(4 * Math.sqrt(Math.PI) / 3)) < 1e-12)
  for (const x of [0, -1, -2, -10]) assert.equal(logGamma(x), Infinity)
})

test('logChoose matches small binomial coefficients and is -Infinity outside 0..n', () => {
  const { logChoose } = VM.distributions
  assert.ok(Math.abs(logChoose(10, 3) - Math.log(120)) < 1e-12)
  assert.ok(Math.abs(logChoose(5, 0)) < 1e-12)
  assert.ok(Number.isFinite(logChoose(2000, 1000)))
  assert.equal(logChoose(5, 6), -Infinity)
  assert.equal(logChoose(5, -1), -Infinity)
})
