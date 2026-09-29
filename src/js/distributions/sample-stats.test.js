/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { sampleStats } = VM.distributions

test('sampleStats uses n - 1 by default and n with ddof 0', () => {
  const values = [2, 4, 4, 4, 5, 5, 7, 9]
  const unbiased = sampleStats(values)
  assert.equal(unbiased.n, 8)
  assert.equal(unbiased.mean, 5)
  assert.ok(Math.abs(unbiased.variance - 32 / 7) < 1e-12)
  const population = sampleStats(values, {ddof: 0})
  assert.ok(Math.abs(population.variance - 4) < 1e-12)
  assert.ok(Math.abs(population.sd - 2) < 1e-12)
})

test('sampleStats stays accurate with a large offset', () => {
  const values = [1e9 + 1, 1e9 + 2, 1e9 + 3]
  assert.ok(Math.abs(sampleStats(values).variance - 1) < 1e-6)
})

test('sampleStats on too few values', () => {
  const empty = sampleStats([])
  assert.equal(empty.n, 0)
  assert.ok(Number.isNaN(empty.mean))
  const one = sampleStats([3])
  assert.equal(one.mean, 3)
  assert.ok(Number.isNaN(one.variance))
  assert.equal(sampleStats([3], {ddof: 0}).variance, 0)
})
