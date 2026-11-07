/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { legendItems, lockedAxes } = VM.plotting

test('legendItems takes named traces in order, colored by line, marker, then fill', () => {
  const items = legendItems([
    {name: 'a', line: {color: 'red'}},
    {x: [1]},
    {name: 'b', marker: {color: 'blue'}},
    {name: 'c', fillcolor: 'green'},
    {name: 'hidden', showlegend: false, line: {color: 'black'}}
  ])
  assert.deepEqual(items, [{label: 'a', color: 'red'}, {label: 'b', color: 'blue'}, {label: 'c', color: 'green'}])
})

test('legendItems gives traces that share a name one row', () => {
  const items = legendItems([{name: 'a', line: {color: 'red'}}, {name: 'a', line: {color: 'red'}}])
  assert.equal(items.length, 1)
})

test('legendItems skips a per-point marker color array', () => {
  assert.deepEqual(legendItems([{name: 'a', marker: {color: ['red', 'blue']}}]), [{label: 'a', color: undefined}])
})

test('lockedAxes pins every cartesian axis at its drawn range, keeping the page\'s own settings', () => {
  const full = {
    xaxis: {range: [0, 10]},
    yaxis: {range: [-1, 2]},
    xaxis2: {range: [1, 3]},
    scene: {xaxis: {range: [0, 1]}},
    hoverlabel: {}
  }
  const locked = lockedAxes(full, {xaxis: {title: 'n', type: 'log'}})
  assert.deepEqual(locked, {
    xaxis: {title: 'n', type: 'log', range: [0, 10], autorange: false},
    yaxis: {range: [-1, 2], autorange: false},
    xaxis2: {range: [1, 3], autorange: false}
  })
})

test('lockedAxes leaves an axis the page already fixed', () => {
  const locked = lockedAxes({xaxis: {range: [0, 1]}, yaxis: {range: [5, 6]}}, {yaxis: {range: [0, 4]}})
  assert.deepEqual(Object.keys(locked), ['xaxis'])
})

test('lockedAxes returns {} before the chart has been drawn', () => {
  assert.deepEqual(lockedAxes(undefined, {}), {})
})

test('legendItems colors an uncolored trace the way Plotly will, skipping visible: false', () => {
  const colorway = ['c0', 'c1', 'c2']
  const items = legendItems([
    {name: 'a'},
    {name: 'b', visible: false},
    {name: 'c', line: {color: 'red'}},
    {name: 'd'}
  ], colorway)
  assert.deepEqual(items.map((i) => i.color), ['c0', 'c1', 'red', 'c2'])
})

test('plotWithLegend hides a trace as legendonly, keeping every index', () => {
  const draws = []
  const plot = (data) => { draws.push(data); return document.createElement('div') }
  const legendStub = () => {
    const el = new EventTarget()
    el.value = ['b']
    return el
  }
  const originalLegend = VM.ui.legendOverlay
  const originalCreate = globalThis.document.createElement
  VM.ui.legendOverlay = legendStub
  globalThis.document.createElement = () => ({ append () {}, className: '' })
  VM.plotting.plotWithLegend(plot, [{name: 'a'}, {name: 'b'}], {})
  assert.deepEqual(draws[0].map((t) => t.visible), ['legendonly', undefined])
  VM.ui.legendOverlay = originalLegend
  globalThis.document.createElement = originalCreate
})
