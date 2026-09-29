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
