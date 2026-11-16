/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()

// The Node stub has no DOM; legendOverlay needs only these few members.
const fakeElement = () => {
  const el = new EventTarget()
  el.className = ''
  el.style = {}
  el.children = []
  el.attributes = {}
  el.append = (...nodes) => el.children.push(...nodes)
  el.setAttribute = (name, value) => { el.attributes[name] = value }
  return el
}

const withFakeDocument = (fn) => {
  const original = globalThis.document.createElement
  globalThis.document.createElement = fakeElement
  try { return fn() } finally { globalThis.document.createElement = original }
}

const items = [{label: 'a', color: 'red'}, {label: 'b', color: 'blue'}]

test('legendOverlay starts top-left by default', () => {
  const legend = withFakeDocument(() => VM.ui.legendOverlay(items))
  assert.equal(legend.className, 'ojs-legend-overlay')
})

test('legendOverlay marks a top-right legend so the CSS clears the modebar', () => {
  const legend = withFakeDocument(() => VM.ui.legendOverlay(items, {corner: 'top-right'}))
  assert.equal(legend.className, 'ojs-legend-overlay ojs-legend-top-right')
  assert.deepEqual(legend.value, ['a', 'b'])
})

test('legendOverlay rejects a corner it does not support', () => {
  assert.throws(() => withFakeDocument(() => VM.ui.legendOverlay(items, {corner: 'bottom-right'})), RangeError)
})
