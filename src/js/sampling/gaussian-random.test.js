/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { seededRandom, gaussianRandom } = VM.sampling

test('gaussianRandom is deterministic for a given underlying rng', () => {
  const a = gaussianRandom(seededRandom(7))
  const b = gaussianRandom(seededRandom(7))
  const seqA = Array.from({length: 10}, () => a())
  const seqB = Array.from({length: 10}, () => b())
  assert.deepEqual(seqA, seqB)
})

test('gaussianRandom produces samples with approximately mean 0 and variance 1', () => {
  const gaussian = gaussianRandom(seededRandom(123))
  const sampleCount = 20000
  let sum = 0
  let sumSquares = 0
  for (let i = 0; i < sampleCount; i++) {
    const x = gaussian()
    sum += x
    sumSquares += x * x
  }
  const mean = sum / sampleCount
  const variance = sumSquares / sampleCount - mean * mean
  assert.ok(Math.abs(mean) < 0.05, `expected mean near 0, got ${mean}`)
  assert.ok(Math.abs(variance - 1) < 0.1, `expected variance near 1, got ${variance}`)
})

test('gaussianRandom uses both halves of each Box-Muller pair', () => {
  let calls = 0
  const base = seededRandom(5)
  const counted = () => { calls++; return base() }
  const gaussian = gaussianRandom(counted)
  for (let i = 0; i < 10; i++) gaussian()
  assert.equal(calls, 10)
})

test('gaussianRandom never returns a non-finite value, even when rng returns 0', () => {
  const gaussian = gaussianRandom(() => 0)
  for (let i = 0; i < 4; i++) assert.ok(Number.isFinite(gaussian()))
})
