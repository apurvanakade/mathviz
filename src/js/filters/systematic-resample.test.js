/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { systematicResample } = VM.filters

test('systematicResample copies each particle floor or ceil of n w times', () => {
  const weights = [0.1, 0.5, 0.15, 0.25]
  for (const u of [0, 0.3, 0.99]) {
    const indices = systematicResample(weights, u)
    assert.equal(indices.length, 4)
    const counts = [0, 0, 0, 0]
    for (const j of indices) counts[j] += 1
    for (let j = 0; j < 4; j++) {
      const target = 4 * weights[j]
      assert.ok(counts[j] >= Math.floor(target) && counts[j] <= Math.ceil(target), `u=${u}, j=${j}: ${counts[j]}`)
    }
  }
})

test('systematicResample normalizes the weights itself', () => {
  assert.deepEqual(systematicResample([2, 0, 6], 0.5), [0, 2, 2])
})

test('systematicResample skips zero-weight particles and returns sorted indices', () => {
  const indices = systematicResample([0, 1, 0, 1, 0], 0.1)
  assert.deepEqual(indices, [1, 1, 1, 3, 3])
})

test('systematicResample on degenerate input', () => {
  assert.deepEqual(systematicResample([], 0.5), [])
  assert.deepEqual(systematicResample([0, 0], 0.5), [])
})
