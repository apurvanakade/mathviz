/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { convergenceFit } = VM.numerical

function rowsOf(maxN, errorAt) {
  const rows = []
  for (let n = 1; n <= maxN; n++) rows.push({ n, error: errorAt(n) })
  return rows
}

test('convergenceFit recovers the order of an error that falls like n^-p', () => {
  const { order, exact, exactFromN, points } = convergenceFit(rowsOf(40, n => 3 / n ** 2), 1, 'error')
  assert.ok(Math.abs(order - 2) < 1e-10, `order ${order}`)
  assert.equal(exact, false)
  assert.equal(exactFromN, null)
  assert.equal(points.length, 40)
})

test('convergenceFit fits only the second half of the run', () => {
  // Pre-asymptotic for n < 20, order 1 after: a fit over every n would be off.
  const { order, fit } = convergenceFit(rowsOf(40, n => (n < 20 ? 1 / n ** 5 : 1e-6 / n)), 1, 'error')
  assert.ok(Math.abs(order - 1) < 1e-10, `order ${order}`)
  assert.equal(fit.xlo, Math.log10(20))
})

test('convergenceFit reports a method exact on the problem as exact, with no fit', () => {
  const { exact, exactFromN, fit, order, points } = convergenceFit(rowsOf(10, () => 1e-16), 1, 'error')
  assert.equal(exact, true)
  assert.equal(exactFromN, 1)
  assert.equal(fit, null)
  assert.ok(Number.isNaN(order))
  assert.equal(points.length, 0)
})

test('convergenceFit scales the rounding floor with the reference and reports exact from n', () => {
  // 1e-9 is above the floor for reference 1 but below it for reference 1e4.
  const errorAt = n => (n < 5 ? 1 / n : 1e-9)
  assert.equal(convergenceFit(rowsOf(10, errorAt), 1, 'error').exactFromN, null)
  const { exact, exactFromN, points } = convergenceFit(rowsOf(10, errorAt), 1e4, 'error')
  assert.equal(exact, false)
  assert.equal(exactFromN, 5)
  assert.equal(points.length, 4)
})

test('convergenceFit skips non-finite errors and reads the error under errorKey', () => {
  const rows = []
  for (let n = 1; n <= 20; n++) rows.push({ n, other: n === 3 ? NaN : 1 / n })
  const { points, order } = convergenceFit(rows, 1, 'other')
  assert.equal(points.length, 19)
  assert.ok(Math.abs(order - 1) < 1e-10, `order ${order}`)
  assert.equal(convergenceFit(rowsOf(5, () => Infinity), 1, 'error').exact, false)
})

test('convergenceFit takes the absolute value of a signed error', () => {
  const { order, exact } = convergenceFit(rowsOf(40, n => -2 / n ** 3), 1, 'error')
  assert.equal(exact, false)
  assert.ok(Math.abs(order - 3) < 1e-10, `order ${order}`)
})
