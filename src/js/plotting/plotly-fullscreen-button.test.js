/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

// The patch has to survive a page with no Plotly at all -- the library also
// serves pages that draw with D3 or a canvas -- and must not double-wrap
// newPlot when asked twice (once at load, once on DOMContentLoaded).

function allowFullscreen(on) {
  globalThis.document.fullscreenEnabled = on
  globalThis.Element = class { requestFullscreen() {} }
}

// A patched Plotly whose newPlot/react record what they were given.
function patchedPlotly() {
  globalThis.Plotly = null
  const VM = loadVM()
  const calls = []
  const original = (...args) => { calls.push(args) }
  globalThis.Plotly = { newPlot: original, react: original, Icons: { zoom_plus: {}, zoom_minus: {} } }
  VM.plotting.installPlotlyPatch()
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' })
  globalThis.document.body = { matches: () => false }
  return { VM, calls }
}

test('loads without Plotly and reports the patch as not installed', () => {
  globalThis.Plotly = null
  const VM = loadVM()
  assert.equal(VM.plotting.installPlotlyPatch(), false)
  assert.equal(typeof VM.plotting.fullscreenButton, 'object')
})

test('patches newPlot/react once Plotly exists, and only once', () => {
  globalThis.Plotly = null
  const VM = loadVM()
  const calls = []
  const original = (gd, data, layout, config) => calls.push({ data, layout, config })
  globalThis.Plotly = { newPlot: original, react: original, Icons: { zoom_plus: {}, zoom_minus: {} } }

  assert.equal(VM.plotting.installPlotlyPatch(), true)
  const patched = globalThis.Plotly.newPlot
  assert.notEqual(patched, original)
  assert.equal(VM.plotting.installPlotlyPatch(), true, 'second call is a no-op')
  assert.equal(globalThis.Plotly.newPlot, patched, 'must not wrap the wrapper')

  globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' })
  globalThis.document.body = { matches: () => false }
  allowFullscreen(true)
  globalThis.Plotly.newPlot({}, [{ x: [1], y: [2] }], { xaxis: { title: 'x' } }, {})
  assert.equal(calls.length, 1)
  const [{ data, layout, config }] = calls
  assert.equal(layout.xaxis.title, 'x', "the page's own layout survives")
  assert.equal(layout.dragmode, 'pan')
  assert.equal(layout.paper_bgcolor, 'rgba(0,0,0,0)', 'the shared theme is layered underneath')
  assert.ok(data[0].hoverlabel, 'the themed hoverlabel is injected per trace')
  assert.ok(Array.isArray(config.modeBarButtons))
  assert.equal(config.modeBarButtons.at(-1)[0], VM.plotting.fullscreenButton)
})

test('themes the one-argument figure form, keeping its frames', () => {
  const { calls } = patchedPlotly()
  allowFullscreen(true)
  const frames = [{ name: 'f0' }]
  globalThis.Plotly.newPlot({}, { data: [{ x: [1] }], layout: { title: 't' }, frames })
  const [[, figure, layout]] = calls
  assert.equal(layout, undefined, 'still called with one figure object')
  assert.equal(figure.layout.title, 't')
  assert.equal(figure.layout.paper_bgcolor, 'rgba(0,0,0,0)')
  assert.ok(figure.data[0].hoverlabel)
  assert.ok(Array.isArray(figure.config.modeBarButtons))
  assert.equal(figure.frames, frames)
})

test("keeps a page's own modeBarButtons and applies ToRemove/ToAdd to the shared list", () => {
  const { calls } = patchedPlotly()
  allowFullscreen(true)
  const own = [['toImage']]
  globalThis.Plotly.newPlot({}, [], {}, { modeBarButtons: own })
  assert.equal(calls[0][3].modeBarButtons, own)

  const extra = { name: 'mine', click: () => {} }
  globalThis.Plotly.newPlot({}, [], {}, { modeBarButtonsToRemove: ['toImage', 'zoomIn2d'], modeBarButtonsToAdd: [extra] })
  const names = calls[1][3].modeBarButtons.flat().map((b) => (typeof b === 'string' ? b : b.name))
  assert.ok(!names.includes('toImage'))
  assert.ok(!names.includes('zoomIn'))
  assert.ok(names.includes('zoomOut'))
  assert.equal(names.at(-1), 'mine')
})

test('leaves the fullscreen button out where element fullscreen is unavailable', () => {
  const { VM, calls } = patchedPlotly()
  allowFullscreen(false)
  globalThis.Plotly.newPlot({}, [], {}, {})
  assert.ok(!calls[0][3].modeBarButtons.flat().includes(VM.plotting.fullscreenButton))
  assert.equal(VM.plotting.fullscreenButton.available(), false)
})

test('re-attaches keepListening listeners after every newPlot', () => {
  const { VM } = patchedPlotly()
  // A div whose emitter, like Plotly's, is replaced on each newPlot.
  const div = {}
  const fresh = () => {
    const listeners = new Map()
    div.on = (event, fn) => { listeners.set(event, [...(listeners.get(event) ?? []), fn]) }
    div.removeListener = (event, fn) => { listeners.set(event, (listeners.get(event) ?? []).filter((f) => f !== fn)) }
    div.emit = (event) => { for (const fn of listeners.get(event) ?? []) fn() }
  }
  globalThis.Plotly.newPlot = ((patched) => (...args) => { fresh(); return patched(...args) })(globalThis.Plotly.newPlot)
  fresh()
  let fired = 0
  VM.plotting.keepListening(div, { plotly_afterplot: () => { fired++ } })
  div.emit('plotly_afterplot')
  globalThis.Plotly.newPlot(div, [], {}, {})
  div.emit('plotly_afterplot')
  assert.equal(fired, 2)
})

test('resolves a graph div given by id', () => {
  const { calls } = patchedPlotly()
  const div = { id: 'chart' }
  globalThis.document.getElementById = (id) => (id === 'chart' ? div : null)
  globalThis.Plotly.newPlot('chart', [], { yaxis: { scaleanchor: 'x', range: [0, 1] }, xaxis: { range: [0, 1] } }, {})
  assert.equal(calls[0][0], 'chart', 'Plotly still gets what the page passed')
  assert.ok(div.__vmView, 'the view is tracked on the element')
})
