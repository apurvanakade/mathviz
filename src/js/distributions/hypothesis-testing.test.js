/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const rel = (got, want) => Math.abs(got - want) / Math.abs(want)

const D = VM.distributions
const { hypothesisTest } = D

const normal = {cdf: x => D.normalCdf(x), quantile: p => D.normalQuantile(p)}
const tDist = k => ({cdf: x => D.studentTCdf(x, k), quantile: p => D.studentTQuantile(p, k)})
const chi2 = k => ({cdf: x => D.chiSquaredCdf(x, k), quantile: p => D.chiSquaredQuantile(p, k)})
const fDist = (a, b) => ({cdf: x => D.fCdf(x, a, b), quantile: p => D.fQuantile(p, a, b)})
const area = (dist, regions) => regions.reduce((s, [a, b]) => s + (b > a ? dist.cdf(b) - dist.cdf(a) : 0), 0)
const close = (got, want, tol, msg) => assert.ok(Math.abs(got - want) <= tol, `${msg}: got ${got}, want ${want}`)

test('hypothesisTest: a two-sided z-test', () => {
  const r = hypothesisTest(normal, -2.25)
  close(r.critical[0], -1.959964, 1e-6, 'lower critical')
  close(r.critical[1], 1.959964, 1e-6, 'upper critical')
  close(r.pValue, 2 * D.normalCdf(-2.25), 1e-15, 'p')
  assert.equal(r.reject, true)
  close(r.pValueRegion[0][1], -2.25, 0, 'own tail')
  close(r.pValueRegion[1][0], 2.25, 1e-9, 'mirrored tail')
})

test('hypothesisTest: one-sided t-tests', () => {
  const less = hypothesisTest(tDist(15), -2, {alternative: 'less'})
  close(less.critical[0], -1.753, 5e-4, 'critical')
  close(less.pValue, D.studentTCdf(-2, 15), 0, 'p')
  assert.deepEqual(less.rejectionRegion, [[-Infinity, less.critical[0]]])
  assert.deepEqual(less.pValueRegion, [[-Infinity, -2]])
  const greater = hypothesisTest(tDist(7), 1.94, {alternative: 'greater', alpha: 0.01})
  assert.equal(greater.reject, false)
  assert.deepEqual(greater.pValueRegion, [[1.94, Infinity]])
})

test('hypothesisTest: a two-sided test on a skewed distribution splits the tails by area', () => {
  const dist = fDist(12, 15)
  for (const x of [0.4, 2.34]) {
    const r = hypothesisTest(dist, x)
    close(area(dist, [r.rejectionRegion[0]]), 0.025, 1e-10, `lower alpha/2, x=${x}`)
    close(area(dist, [r.rejectionRegion[1]]), 0.025, 1e-10, `upper alpha/2, x=${x}`)
    const [a, b] = r.pValueRegion.map(reg => area(dist, [reg]))
    close(a, b, 1e-9, `equal p tails, x=${x}`)
    close(a + b, r.pValue, 1e-9, `p is the shaded area, x=${x}`)
  }
})

test('hypothesisTest: reject exactly when the statistic is in the rejection region', () => {
  const cases = [[normal, -4, 4], [tDist(4), -6, 6], [chi2(5), 0.01, 25], [fDist(3, 9), 0.01, 8]]
  for (const [dist, lo, hi] of cases) {
    for (const alternative of ['two-sided', 'less', 'greater']) {
      for (const alpha of [0.01, 0.05, 0.2]) {
        for (let i = 0; i <= 50; i++) {
          const x = lo + (hi - lo) * i / 50
          const r = hypothesisTest(dist, x, {alternative, alpha})
          if (r.critical.some(c => Math.abs(c - x) < 1e-6)) continue
          const inRegion = r.rejectionRegion.some(([a, b]) => x >= a && x <= b)
          assert.equal(r.reject, inRegion, `${alternative} alpha=${alpha} x=${x}`)
          close(area(dist, r.pValueRegion), r.pValue, 1e-8, `${alternative} x=${x}`)
        }
      }
    }
  }
})

test('hypothesisTest: sf keeps a tiny upper p-value', () => {
  const plain = hypothesisTest(normal, 9, {alternative: 'greater'})
  const withSf = hypothesisTest({...normal, sf: x => D.normalCdf(-x)}, 9, {alternative: 'greater'})
  assert.equal(plain.pValue, 0)
  assert.ok(Math.abs(withSf.pValue - D.normalCdf(-9)) / D.normalCdf(-9) < 1e-12)
})
