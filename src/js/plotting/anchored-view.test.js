/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { trackView, fitView, rangeFromRelayout } = VM.plotting

// A stand-in graph div: records Plotly event handlers so a test can fire
// them, and the relayouts fitView sends.
function fakeDiv() {
  const handlers = {}
  return {
    isConnected: true,
    handlers,
    on: (name, fn) => { handlers[name] = fn },
    fire: (name, data) => handlers[name] && handlers[name](data)
  }
}

const anchored = (half, uirevision) => ({
  xaxis: {range: [-half, half]},
  yaxis: {range: [-half, half], scaleanchor: 'x'},
  uirevision
})

const settle = () => new Promise((resolve) => setTimeout(resolve, 5))

test('rangeFromRelayout reads both spellings of a range', () => {
  assert.deepEqual(rangeFromRelayout({'xaxis.range': [1, 2]}, 'xaxis'), [1, 2])
  assert.deepEqual(rangeFromRelayout({'yaxis.range[0]': 3, 'yaxis.range[1]': 4}, 'yaxis'), [3, 4])
})

test('rangeFromRelayout reports autoscale, and ignores other axes and half a range', () => {
  assert.equal(rangeFromRelayout({'xaxis.autorange': true}, 'xaxis'), 'auto')
  assert.equal(rangeFromRelayout({'xaxis.range': [1, 2]}, 'yaxis'), null)
  assert.equal(rangeFromRelayout({'xaxis.range[0]': 1}, 'xaxis'), null)
  assert.equal(rangeFromRelayout({autosize: true}, 'xaxis'), null)
})

test('trackView leaves a chart without scaleanchor alone', () => {
  const gd = fakeDiv()
  const layout = {xaxis: {range: [0, 1]}}
  assert.equal(trackView(gd, layout), layout)
  assert.equal(fitView(gd), null)
})

test('fitView refits the requested ranges, not the widened ones', async () => {
  const gd = fakeDiv()
  const relayouts = []
  globalThis.Plotly.relayout = (div, update) => { relayouts.push(update); return Promise.resolve() }
  trackView(gd, anchored(5))
  await settle()
  fitView(gd)
  fitView(gd)
  assert.deepEqual(relayouts, [
    {'xaxis.range': [-5, 5], 'yaxis.range': [-5, 5]},
    {'xaxis.range': [-5, 5], 'yaxis.range': [-5, 5]}
  ])
})

test("a reader's pan becomes the view, and survives a same-uirevision redraw", async () => {
  const gd = fakeDiv()
  trackView(gd, anchored(5, 'curve'))
  await settle()
  gd.fire('plotly_relayout', {'xaxis.range[0]': 0, 'xaxis.range[1]': 2})
  const redrawn = trackView(gd, anchored(5, 'curve'))
  assert.deepEqual(redrawn.xaxis.range, [0, 2])
  assert.deepEqual(redrawn.yaxis.range, [-5, 5])
  // A new uirevision is a new picture: the requested ranges win again.
  const replaced = trackView(gd, anchored(9, 'other'))
  assert.deepEqual(replaced.xaxis.range, [-9, 9])
})

test('without a pan, a same-uirevision redraw takes the new requested ranges', async () => {
  const gd = fakeDiv()
  trackView(gd, anchored(5, 'curve'))
  await settle()
  const redrawn = trackView(gd, anchored(7, 'curve'))
  assert.deepEqual(redrawn.xaxis.range, [-7, 7])
})

test("fitView's own relayout is not mistaken for the reader's", async () => {
  const gd = fakeDiv()
  trackView(gd, anchored(5, 'curve'))
  await settle()
  gd.fire('plotly_relayout', {'xaxis.range': [-5, 5], 'yaxis.range': [-5, 5]})
  assert.deepEqual(trackView(gd, anchored(7, 'curve')).xaxis.range, [-7, 7])
})

test('a double-click resets to the requested ranges', async () => {
  const gd = fakeDiv()
  const relayouts = []
  globalThis.Plotly.relayout = (div, update) => { relayouts.push(update); return Promise.resolve() }
  trackView(gd, anchored(5, 'curve'))
  await settle()
  gd.fire('plotly_relayout', {'xaxis.range': [0, 1], 'yaxis.range': [0, 1]})
  gd.fire('plotly_doubleclick')
  // Plotly's own reset, to the widened initial range.
  gd.fire('plotly_relayout', {'xaxis.range': [-8, 8], 'yaxis.range': [-5, 5]})
  await settle()
  assert.deepEqual(relayouts.at(-1), {'xaxis.range': [-5, 5], 'yaxis.range': [-5, 5]})
  assert.deepEqual(trackView(gd, anchored(7, 'curve')).xaxis.range, [-7, 7])
})

test('scaleanchor: false is not a lock', () => {
  const gd = fakeDiv()
  const layout = {xaxis: {range: [0, 1]}, yaxis: {range: [0, 1], scaleanchor: false}}
  assert.equal(trackView(gd, layout), layout)
  assert.equal(fitView(gd), null)
})

test('an autoscaled axis stays autoscaled across a same-uirevision redraw', async () => {
  const gd = fakeDiv()
  trackView(gd, anchored(5, 'curve'))
  await settle()
  gd.fire('plotly_relayout', {'xaxis.autorange': true, 'yaxis.autorange': true})
  const redrawn = trackView(gd, anchored(5, 'curve'))
  assert.equal(redrawn.xaxis.autorange, true)
  assert.equal(redrawn.xaxis.range, undefined)
  assert.equal(redrawn.yaxis.autorange, true)
  assert.equal(redrawn.yaxis.scaleanchor, 'x')
})

test('an autoscaled axis is left to Plotly on resize', async () => {
  const gd = fakeDiv()
  const relayouts = []
  globalThis.Plotly.relayout = (div, update) => { relayouts.push(update); return Promise.resolve() }
  trackView(gd, anchored(5, 'curve'))
  await settle()
  gd.fire('plotly_relayout', {'xaxis.autorange': true, 'yaxis.autorange': true})
  assert.equal(fitView(gd), null)
  assert.deepEqual(relayouts, [])
})
