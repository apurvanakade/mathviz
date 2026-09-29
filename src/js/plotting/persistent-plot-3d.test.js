/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

// Stands in for Plotly with the mathviz patch installed on top, so the
// test sees the layout and config the real Plotly would receive.
function patchedPlotly(VM) {
  const calls = []
  const record = (gd, data, layout, config) => calls.push({ layout, config })
  globalThis.Plotly = { newPlot: record, react: record, Icons: { zoom_plus: {}, zoom_minus: {} } }
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' })
  globalThis.document.body = { matches: () => false }
  globalThis.document.createElement = () => ({ className: '', style: {} })
  VM.plotting.installPlotlyPatch()
  return calls
}

test('persistentPlot3d rotates on drag and gets the 3-D modebar', () => {
  globalThis.Plotly = null
  const VM = loadVM()
  const calls = patchedPlotly(VM)
  const originalAutoResize = VM.plotting.autoResize
  VM.plotting.autoResize = () => {}

  const plot = VM.plotting.persistentPlot3d()
  const first = plot([{ type: 'surface', z: [[1]] }])
  const second = plot([{ type: 'surface', z: [[2]] }], { scene: { camera: { eye: { x: 2, y: 2, z: 1 } } } })

  assert.equal(first, second, 'the same div is reused')
  assert.equal(calls[0].layout.scene.dragmode, 'turntable', 'a scene is added even with no layout')
  assert.equal(calls[1].layout.scene.camera.eye.x, 2, "the page's own scene survives")
  assert.equal(calls[1].layout.scene.dragmode, 'turntable')
  assert.equal(calls[1].layout.scene.zaxis.showbackground, false, 'the scene axes are themed')
  const buttons = calls[0].config.modeBarButtons.flat()
  assert.ok(buttons.includes('tableRotation'))
  assert.ok(!buttons.includes('zoom2d'))
  VM.plotting.autoResize = originalAutoResize
})

test("a page's own scene dragmode wins", () => {
  globalThis.Plotly = null
  const VM = loadVM()
  const calls = patchedPlotly(VM)
  globalThis.Plotly.newPlot({}, [], { scene: { dragmode: 'orbit' } }, {})
  assert.equal(calls[0].layout.scene.dragmode, 'orbit')
})

test('a 2-D chart gets no scene and keeps the 2-D modebar', () => {
  globalThis.Plotly = null
  const VM = loadVM()
  const calls = patchedPlotly(VM)
  globalThis.Plotly.newPlot({}, [{ x: [1], y: [2] }], {}, {})
  assert.equal(calls[0].layout.scene, undefined)
  assert.equal(calls[0].layout.dragmode, 'pan')
  assert.ok(calls[0].config.modeBarButtons.flat().includes('zoom2d'))
})

test('themePatch adds the scene axes only when asked', () => {
  globalThis.Plotly = null
  const VM = loadVM()
  globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' })
  globalThis.document.body = { matches: () => false }
  assert.equal(Object.keys(VM.plotting.themePatch()).length, 24)
  const patch = VM.plotting.themePatch({ scene: true })
  assert.equal(Object.keys(patch).length, 24 + 18)
  assert.ok('scene.zaxis.gridcolor' in patch)
})
