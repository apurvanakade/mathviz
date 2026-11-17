/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { persistentPlot } = VM.plotting

test('persistentPlot creates the div once, then reacts on the same div', () => {
  const calls = []
  globalThis.Plotly.newPlot = (div) => calls.push(['newPlot', div])
  globalThis.Plotly.react = (div) => calls.push(['react', div])
  globalThis.document.createElement = () => ({className: '', style: {}})
  const originalAutoResize = VM.plotting.autoResize
  VM.plotting.autoResize = () => {}

  const plot = persistentPlot({height: '300px'})
  const first = plot([], {})
  const second = plot([], {})

  assert.equal(first, second)
  assert.equal(first.className, 'plotly-box-large')
  assert.equal(first.style.height, '300px')
  // plotly-box-large's min-height: 500px would otherwise override it.
  assert.equal(first.style.minHeight, '300px')
  assert.deepEqual(calls.map((c) => c[0]), ['newPlot', 'react'])
  VM.plotting.autoResize = originalAutoResize
})

test('persistentPlot exposes its div, null until the first draw', () => {
  globalThis.Plotly.newPlot = () => {}
  globalThis.Plotly.react = () => {}
  globalThis.document.createElement = () => ({className: '', style: {}})
  const originalAutoResize = VM.plotting.autoResize
  VM.plotting.autoResize = () => {}
  const plot = persistentPlot()
  assert.equal(plot.div, null)
  const div = plot([], {})
  assert.equal(plot.div, div)
  assert.equal(VM.plotting.persistentPlot3d().div, null)
  VM.plotting.autoResize = originalAutoResize
})

test('persistentPlot sizes its div by aspectRatio', () => {
  globalThis.Plotly.newPlot = () => {}
  globalThis.Plotly.react = () => {}
  globalThis.document.createElement = () => ({className: '', style: {}})
  const originalAutoResize = VM.plotting.autoResize
  VM.plotting.autoResize = () => {}
  const div = persistentPlot({aspectRatio: 1.5})([], {})
  // The class clears the box's height and min-height (chart-block.css).
  assert.equal(div.className, 'plotly-box-large vm-plot-aspect')
  assert.equal(div.style.aspectRatio, '1.5')
  assert.equal(div.style.height, undefined)
  assert.equal(persistentPlot()([], {}).className, 'plotly-box-large')
  VM.plotting.autoResize = originalAutoResize
})

test('persistentPlot rejects a bad aspectRatio, and one given with height', () => {
  for (const aspectRatio of [0, -1, NaN, Infinity, '16 / 9', null]) {
    assert.throws(() => persistentPlot({aspectRatio}), RangeError)
  }
  assert.throws(() => persistentPlot({aspectRatio: 1, height: '300px'}), TypeError)
  assert.throws(() => VM.plotting.persistentPlot3d({aspectRatio: 0}), RangeError)
})
