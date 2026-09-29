/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { seededRandom, exponentialRandom } = VM.sampling

test('exponentialRandom is reproducible from a seed', () => {
  const a = exponentialRandom(seededRandom(3), 2)
  const b = exponentialRandom(seededRandom(3), 2)
  for (let i = 0; i < 10; i++) assert.equal(a(), b())
})

test('exponentialRandom has mean 1 / rate and non-negative draws', () => {
  const draw = exponentialRandom(seededRandom(11), 4)
  const count = 20000
  let sum = 0
  for (let i = 0; i < count; i++) {
    const x = draw()
    assert.ok(x >= 0)
    sum += x
  }
  assert.ok(Math.abs(sum / count - 0.25) < 0.01, `mean ${sum / count}`)
})
