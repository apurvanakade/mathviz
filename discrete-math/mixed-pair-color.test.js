/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { pairColor } = VM.discreteMath

test('pairColor returns the correct shared color for each mixed pair, order-independent', () => {
  const gold = 'rgba(255, 215, 0, 0.7)'
  const teal = 'rgba(0, 150, 136, 0.7)'
  const orchid = 'rgba(186, 85, 211, 0.7)'
  const cases = [
    ['red', 'green', gold],
    ['green', 'red', gold],
    ['green', 'blue', teal],
    ['blue', 'green', teal],
    ['red', 'blue', orchid],
    ['blue', 'red', orchid],
  ]
  for (const [a, b, expected] of cases) {
    assert.equal(pairColor(a, b), expected, `pairColor(${a}, ${b})`)
  }
})

test('pairColor returns null when both colors match', () => {
  for (const color of ['red', 'green', 'blue']) {
    assert.equal(pairColor(color, color), null)
  }
})
