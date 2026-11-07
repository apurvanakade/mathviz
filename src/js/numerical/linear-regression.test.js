/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { linearRegression } = VM.numerical

test('linearRegression recovers slope and intercept of points exactly on a line', () => {
  const points = [{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 7 }]
  const { slope, intercept, xlo, xhi } = linearRegression(points)
  assert.ok(Math.abs(slope - 2) < 1e-10, `slope ${slope}`)
  assert.ok(Math.abs(intercept - 1) < 1e-10, `intercept ${intercept}`)
  assert.equal(xlo, 0)
  assert.equal(xhi, 3)
})

test('linearRegression returns null for fewer than two points', () => {
  assert.equal(linearRegression([]), null)
  assert.equal(linearRegression([{ x: 0, y: 0 }]), null)
})

test('linearRegression returns null for a degenerate vertical fit', () => {
  const points = [{ x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 }]
  assert.equal(linearRegression(points), null)
})

test('linearRegression stays exact when x sits far from 0 (no cancellation)', () => {
  const points = []
  for (let i = 0; i < 10; i++) points.push({ x: 1e9 + i, y: 2 * i + 1 })
  const fit = linearRegression(points)
  assert.ok(fit, 'fit is not null')
  assert.ok(Math.abs(fit.slope - 2) < 1e-9, `slope ${fit.slope}`)
  assert.ok(Math.abs(fit.slope * (1e9 + 3) + fit.intercept - 7) < 1e-4)
})

test('linearRegression with weights ignores zero-weight points', () => {
  const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 100 }]
  const fit = linearRegression(points, { weights: [1, 1, 1, 0] })
  assert.ok(Math.abs(fit.slope - 1) < 1e-12)
  assert.ok(Math.abs(fit.intercept) < 1e-12)
  assert.equal(fit.xhi, 3)
})

test('linearRegression returns null when the weights sum to zero', () => {
  assert.equal(linearRegression([{ x: 0, y: 0 }, { x: 1, y: 1 }], { weights: [0, 0] }), null)
})
