/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { effectiveSampleSize } = VM.mcmc

test('effectiveSampleSize of independent draws is close to n', () => {
  const rng = VM.sampling.seededRandom(11)
  const values = []
  for (let i = 0; i < 5000; i++) values.push(rng())
  const ess = effectiveSampleSize(values)
  assert.ok(ess > 4000 && ess <= 5000, `got ${ess}`)
})

test('effectiveSampleSize of a sticky AR(1) chain is far below n', () => {
  const gaussian = VM.sampling.gaussianRandom(VM.sampling.seededRandom(5))
  const phi = 0.95
  const values = [0]
  for (let i = 1; i < 5000; i++) values.push(phi * values[i - 1] + Math.sqrt(1 - phi * phi) * gaussian())
  // Theory: n (1 - phi) / (1 + phi) ~= 128.
  const ess = effectiveSampleSize(values)
  assert.ok(ess > 60 && ess < 260, `got ${ess}`)
})

test('effectiveSampleSize handles tiny series', () => {
  assert.equal(effectiveSampleSize([]), 0)
  assert.equal(effectiveSampleSize([1]), 1)
})

test('effectiveSampleSize of a chain that never moves is NaN', () => {
  assert.ok(Number.isNaN(effectiveSampleSize([3, 3, 3, 3, 3])))
})

test('effectiveSampleSize agrees with summing autocorrelation by hand', () => {
  const g = VM.sampling.gaussianRandom(VM.sampling.seededRandom(9))
  const chain = []
  let x = 0
  for (let i = 0; i < 5000; i++) { x = 0.8 * x + g(); chain.push(x) }
  const rho = VM.mcmc.autocorrelation(chain, 1000)
  let sum = 0
  for (let k = 1; k < rho.length && rho[k] > 0; k++) sum += rho[k]
  const expected = chain.length / (1 + 2 * sum)
  assert.ok(Math.abs(VM.mcmc.effectiveSampleSize(chain) - expected) < 1e-9 * expected)
})
