/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { orderFromSuccessiveErrors } = VM.numerical

// e_{k+1} = C·e_k^p from e_0.
function errorsOf(e0, C, p, steps) {
  const errors = [e0]
  for (let k = 1; k < steps; k++) errors.push(C * errors[k - 1] ** p)
  return errors
}

function rowsOf(errors, scales) {
  const rows = []
  for (let k = 0; k < errors.length; k++) rows.push({ error: errors[k], scale: scales ? scales[k] : 1 })
  return rows
}

const fitErrors = (errors, scales) => orderFromSuccessiveErrors(rowsOf(errors, scales), 'error', 'scale')

test('orderFromSuccessiveErrors recovers p from e_{k+1} = C e_k^p', () => {
  const { order, points } = fitErrors(errorsOf(0.5, 1, 2, 4))
  assert.ok(Math.abs(order - 2) < 1e-10, `order ${order}`)
  assert.equal(points.length, 3)
  const linear = fitErrors(errorsOf(0.5, 0.5, 1, 20))
  assert.ok(Math.abs(linear.order - 1) < 1e-10, `order ${linear.order}`)
})

test('orderFromSuccessiveErrors drops errors at rounding level', () => {
  // Converged: the last errors sit at 1e-16, and (−16, −16) pairs would pull the slope toward 1.
  const errors = [...errorsOf(0.5, 1, 2, 4), 1e-16, 1e-16, 1e-16]
  const { order, points } = fitErrors(errors)
  assert.equal(points.length, 3)
  assert.ok(Math.abs(order - 2) < 1e-10, `order ${order}`)
})

test('orderFromSuccessiveErrors scales the floor with the scale field', () => {
  // 1e-9 is above the floor at scale 1 but at rounding level at scale 1e4.
  const errors = [1e-3, 1e-6, 1e-9]
  assert.equal(fitErrors(errors).points.length, 2)
  assert.equal(fitErrors(errors, [1e4, 1e4, 1e4]).points.length, 1)
})

test('orderFromSuccessiveErrors fits only the trailing shrinking run', () => {
  // Wanders first (error grows), then converges quadratically.
  const errors = [0.1, 0.4, ...errorsOf(0.5, 1, 2, 4)]
  const result = fitErrors(errors)
  assert.ok(Math.abs(result.order - 2) < 1e-10, `order ${result.order}`)
  assert.equal(result.fit.xlo, Math.log10(0.5))
})

test('orderFromSuccessiveErrors reports no order for a diverging or cycling run', () => {
  assert.equal(fitErrors([1, 2, 4, 8, 16]).fit, null)
  assert.ok(Number.isNaN(fitErrors([1, 2, 1, 2, 1, 2]).order))
  assert.equal(fitErrors([]).fit, null)
})

test('orderFromSuccessiveErrors without scaleKey uses scale 1', () => {
  const rows = rowsOf([1e-3, 1e-6, 1e-9], [1e4, 1e4, 1e4])
  assert.equal(orderFromSuccessiveErrors(rows, 'error').points.length, 2)
})
