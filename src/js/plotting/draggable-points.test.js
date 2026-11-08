/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { draggablePoints } = VM.plotting

// Just enough DOM for the module: elements are Node EventTargets (which
// honour addEventListener's `signal`), with a class list, attributes and
// children. The chart is one of these with a `_fullLayout` whose axes
// convert the way Plotly's linear axes do.
class FakeElement extends EventTarget {
  constructor (tag) {
    super()
    this.tagName = tag
    this.children = []
    this.parent = null
    this.style = {}
    this.attributes = {}
    this.hidden = false
    this.tabIndex = -1
    this.classes = new Set()
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      contains: (name) => this.classes.has(name)
    }
  }

  set className (value) { this.classes = new Set(value.split(' ').filter(Boolean)) }
  get className () { return Array.from(this.classes).join(' ') }
  setAttribute (name, value) { this.attributes[name] = String(value) }
  getAttribute (name) { return this.attributes[name] ?? null }
  append (...nodes) {
    for (const node of nodes) {
      node.parent = this
      this.children.push(node)
    }
  }

  remove () {
    if (!this.parent) return
    this.parent.children = this.parent.children.filter((child) => child !== this)
    this.parent = null
  }

  focus () { this.focused = true }
  setPointerCapture (id) { this.captured = id }
  getBoundingClientRect () { return {left: 0, top: 0} }
}

globalThis.document.createElement = (tag) => new FakeElement(tag)

// Pixel 0 is the axis's low end on x and its high end on y, as in Plotly;
// a range given high-to-low is a reversed axis.
const axis = (offset, length, range, vertical) => {
  const ax = {_offset: offset, _length: length, range, d2l: (v) => v, l2d: (v) => v}
  const [a, b] = range
  if (vertical) {
    ax.l2p = (v) => (b - v) / (b - a) * ax._length
    ax.p2l = (p) => b - p / ax._length * (b - a)
  } else {
    ax.l2p = (v) => (v - a) / (b - a) * ax._length
    ax.p2l = (p) => a + p / ax._length * (b - a)
  }
  return ax
}

// x: [0, 10] over pixels 50..250; y: [0, 1] over pixels 20..120.
const chart = (xRange = [0, 10], yRange = [0, 1]) => {
  const gd = new FakeElement('div')
  gd._fullLayout = {xaxis: axis(50, 200, xRange, false), yaxis: axis(20, 100, yRange, true)}
  const handlers = {}
  gd.on = (name, fn) => { (handlers[name] ??= []).push(fn) }
  gd.removeListener = (name, fn) => { handlers[name] = (handlers[name] ?? []).filter((h) => h !== fn) }
  gd.emit = (name) => { for (const fn of handlers[name] ?? []) fn() }
  gd.handlers = handlers
  return gd
}

const layerOf = (gd) => gd.children.find((child) => child.classes.has('vm-drag-layer'))
const handlesOf = (gd) => layerOf(gd).children.filter((child) => child.classes.has('vm-drag-point'))
const padOf = (gd) => layerOf(gd).children.find((child) => child.classes.has('vm-drag-pad'))

const fire = (target, type, props = {}) => {
  const event = new Event(type, {cancelable: true})
  Object.assign(event, {pointerId: 1, pointerType: 'mouse', button: 0, ...props})
  target.dispatchEvent(event)
  return event
}

const countInputs = (gd) => {
  const seen = {count: 0}
  gd.addEventListener('input', () => { seen.count += 1 })
  return seen
}

test('one point draws the chart once with no traces and returns its div as the view', () => {
  const gd = chart()
  const calls = []
  const view = draggablePoints((data, layout) => { calls.push([data, layout]); return gd }, {value: {x: 5, y: 0.25}})
  assert.equal(view, gd)
  assert.deepEqual(calls, [[[], {}]])
  assert.deepEqual(view.value, {x: 5, y: 0.25})
  assert.ok(gd.classes.has('vm-drag-host'))
  const [handle] = handlesOf(gd)
  assert.equal(handle.getAttribute('role'), 'slider')
  assert.equal(handle.tabIndex, 0)
  assert.equal(handle.getAttribute('aria-label'), 'Point')
  assert.equal(handle.getAttribute('aria-valuetext'), 'x 5, y 0.25')
  assert.equal(handle.style.color, 'var(--vm-color-fn)')
  // x 5 is 100px into a 200px axis that starts at 50; y 0.25 is 75px down a
  // 100px axis that starts at 20.
  assert.equal(handle.style.transform, 'translate(150px, 95px)')
})

test('the value getter returns a copy', () => {
  const gd = draggablePoints(chart(), {value: {x: 1, y: 0.5}})
  gd.value.x = 9
  assert.deepEqual(gd.value, {x: 1, y: 0.5})
})

test('dragging a point follows the pointer, fires input, and stays in bounds off the chart', () => {
  const gd = draggablePoints(chart(), {value: {x: 5, y: 0.25}, xBounds: [0, 8]})
  const inputs = countInputs(gd)
  const [handle] = handlesOf(gd)
  fire(handle, 'pointerdown', {clientX: 150, clientY: 95})
  assert.equal(handle.captured, 1)
  assert.ok(handle.classes.has('vm-drag-active'))

  fire(handle, 'pointermove', {clientX: 110, clientY: 70})
  assert.deepEqual(gd.value, {x: 3, y: 0.5})
  assert.equal(inputs.count, 1)
  assert.equal(handle.getAttribute('aria-valuetext'), 'x 3, y 0.5')

  // Far past the chart's right and top edges: x stops at its bound, y at the
  // top of the visible range.
  fire(handle, 'pointermove', {clientX: 900, clientY: -400})
  assert.deepEqual(gd.value, {x: 8, y: 1})

  fire(handle, 'pointerup')
  assert.ok(!handle.classes.has('vm-drag-active'))
  fire(handle, 'pointermove', {clientX: 50, clientY: 120})
  assert.deepEqual(gd.value, {x: 8, y: 1})
})

test('a drag ends when the capture is lost or a move comes with no button held', () => {
  for (const [type, props] of [['lostpointercapture', {}], ['pointermove', {clientX: 120, clientY: 95, buttons: 0}]]) {
    const gd = draggablePoints(chart(), {value: {x: 5, y: 0.25}})
    const [handle] = handlesOf(gd)
    fire(handle, 'pointerdown', {clientX: 150, clientY: 95})
    fire(handle, 'pointermove', {clientX: 130, clientY: 95, buttons: 1})
    assert.deepEqual(gd.value, {x: 4, y: 0.25})
    fire(handle, type, props)
    assert.ok(!handle.classes.has('vm-drag-active'), type)
    fire(handle, 'pointermove', {clientX: 50, clientY: 120, buttons: 0})
    fire(handle, 'pointermove', {clientX: 50, clientY: 120})
    assert.deepEqual(gd.value, {x: 4, y: 0.25}, type)
  }
})

test('with jump, a drag from the plot area ends when a move comes with no button held', () => {
  const gd = draggablePoints(chart(), {value: {x: 5, y: 0.5}, jump: true})
  const pad = padOf(gd)
  fire(pad, 'pointerdown', {clientX: 110, clientY: 70})
  assert.deepEqual(gd.value, {x: 3, y: 0.5})
  fire(pad, 'pointermove', {clientX: 130, clientY: 70, buttons: 0})
  fire(pad, 'pointermove', {clientX: 150, clientY: 70})
  assert.deepEqual(gd.value, {x: 3, y: 0.5})
})

test('a drag keeps the offset at which the point was grabbed', () => {
  const gd = draggablePoints(chart(), {value: {x: 5, y: 0.5}})
  const [handle] = handlesOf(gd)
  fire(handle, 'pointerdown', {clientX: 156, clientY: 70})
  fire(handle, 'pointermove', {clientX: 176, clientY: 70})
  assert.deepEqual(gd.value, {x: 6, y: 0.5})
})

test('a move that changes nothing fires no input', () => {
  const gd = draggablePoints(chart(), {value: {x: 10, y: 0.5}})
  const inputs = countInputs(gd)
  const [handle] = handlesOf(gd)
  fire(handle, 'pointerdown', {clientX: 250, clientY: 70})
  fire(handle, 'pointermove', {clientX: 400, clientY: 70})
  assert.equal(inputs.count, 0)
})

test('only the primary button starts a drag', () => {
  const gd = draggablePoints(chart(), {value: {x: 5, y: 0.5}})
  const [handle] = handlesOf(gd)
  fire(handle, 'pointerdown', {clientX: 150, clientY: 70, button: 2})
  fire(handle, 'pointermove', {clientX: 200, clientY: 70})
  assert.deepEqual(gd.value, {x: 5, y: 0.5})
})

test('arrow keys move by step, Shift by ten steps, and stop at the bounds', () => {
  const gd = draggablePoints(chart(), {value: {x: 5, y: 0.5}, step: {x: 0.5, y: 0.05}})
  const [handle] = handlesOf(gd)
  const right = fire(handle, 'keydown', {key: 'ArrowRight'})
  assert.ok(right.defaultPrevented)
  assert.deepEqual(gd.value, {x: 5.5, y: 0.5})
  fire(handle, 'keydown', {key: 'ArrowUp'})
  assert.ok(Math.abs(gd.value.y - 0.55) < 1e-12)
  fire(handle, 'keydown', {key: 'ArrowLeft', shiftKey: true})
  assert.equal(gd.value.x, 0.5)
  fire(handle, 'keydown', {key: 'ArrowLeft', shiftKey: true})
  assert.equal(gd.value.x, 0)
  const other = fire(handle, 'keydown', {key: 'a'})
  assert.ok(!other.defaultPrevented)
})

test('the default step is a hundredth of the bounds', () => {
  const gd = draggablePoints(chart(), {value: {x: 5, y: 0.5}, yBounds: [0, 0.5]})
  const [handle] = handlesOf(gd)
  fire(handle, 'keydown', {key: 'ArrowRight'})
  fire(handle, 'keydown', {key: 'ArrowDown'})
  assert.deepEqual(gd.value, {x: 5.1, y: 0.495})
})

test('arrow keys move the way the screen does on a reversed axis', () => {
  const gd = draggablePoints(chart([10, 0], [1, 0]), {value: {x: 5, y: 0.5}, step: {x: 1, y: 0.1}})
  const [handle] = handlesOf(gd)
  fire(handle, 'keydown', {key: 'ArrowRight'})
  fire(handle, 'keydown', {key: 'ArrowUp'})
  assert.deepEqual(gd.value, {x: 4, y: 0.4})
})

test('constrain sees the bounded point, its index and the others, and has the last word', () => {
  const seen = []
  const gd = draggablePoints(chart(), {
    value: [{x: 1, y: 0.1}, {x: 2, y: 0.2}],
    constrain: (point, index, points) => {
      seen.push([point, index, points])
      return {x: Math.round(point.x), y: 0}
    }
  })
  const handles = handlesOf(gd)
  fire(handles[1], 'pointerdown', {clientX: 90, clientY: 100})
  fire(handles[1], 'pointermove', {clientX: 400, clientY: 30})
  assert.deepEqual(seen, [[{x: 10, y: 0.9}, 1, [{x: 1, y: 0.1}, {x: 2, y: 0.2}]]])
  assert.deepEqual(gd.value, [{x: 1, y: 0.1}, {x: 10, y: 0}])
})

test('several points number a single label, takes one per point, and colors per point', () => {
  const two = [{x: 1, y: 0.1}, {x: 2, y: 0.2}]
  let handles = handlesOf(draggablePoints(chart(), {value: two, label: 'Corner'}))
  assert.deepEqual(handles.map((h) => h.getAttribute('aria-label')), ['Corner 1', 'Corner 2'])
  handles = handlesOf(draggablePoints(chart(), {value: two, label: ['A', 'B'], color: ['red', 'var(--vm-color-alt)']}))
  assert.deepEqual(handles.map((h) => h.getAttribute('aria-label')), ['A', 'B'])
  assert.deepEqual(handles.map((h) => h.style.color), ['red', 'var(--vm-color-alt)'])
})

test('format sets what a screen reader announces', () => {
  const gd = draggablePoints(chart(), {value: {x: 1, y: 0.5}, format: (p, i) => `θ ${p.x}, d ${p.y}, #${i}`})
  assert.equal(handlesOf(gd)[0].getAttribute('aria-valuetext'), 'θ 1, d 0.5, #0')
})

test('setting the value moves the points without an input event, and rebuilds them for a new count', () => {
  const gd = draggablePoints(chart(), {value: [{x: 1, y: 0.1}]})
  const inputs = countInputs(gd)
  gd.value = [{x: 5, y: 0.25}]
  assert.equal(handlesOf(gd)[0].style.transform, 'translate(150px, 95px)')
  assert.equal(handlesOf(gd)[0].getAttribute('aria-valuetext'), 'x 5, y 0.25')
  gd.value = [{x: 0, y: 0}, {x: 10, y: 1}, {x: 5, y: 0.5}]
  assert.equal(handlesOf(gd).length, 3)
  assert.equal(handlesOf(gd)[2].getAttribute('aria-label'), 'Point 3')
  assert.equal(inputs.count, 0)
})

test('a redraw puts the points back where the new axes draw them, keeping the value', () => {
  const gd = draggablePoints(chart(), {value: {x: 5, y: 0.25}})
  gd._fullLayout.xaxis = axis(50, 400, [0, 10], false)
  gd.emit('plotly_afterplot')
  assert.equal(handlesOf(gd)[0].style.transform, 'translate(250px, 95px)')
  assert.deepEqual(gd.value, {x: 5, y: 0.25})
})

test('a point zoomed out of view is hidden', () => {
  const gd = draggablePoints(chart(), {value: {x: 5, y: 0.25}})
  gd._fullLayout.xaxis = axis(50, 200, [6, 10], false)
  gd.emit('plotly_relayout')
  assert.equal(handlesOf(gd)[0].hidden, true)
})

test('with jump, a mouse press on the plot area moves the nearest point there and drags it', () => {
  const gd = draggablePoints(chart(), {value: [{x: 1, y: 0.5}, {x: 9, y: 0.5}], jump: true})
  const pad = padOf(gd)
  assert.deepEqual([pad.style.left, pad.style.top, pad.style.width, pad.style.height], ['50px', '20px', '200px', '100px'])
  fire(pad, 'pointerdown', {clientX: 210, clientY: 45})
  assert.deepEqual(gd.value, [{x: 1, y: 0.5}, {x: 8, y: 0.75}])
  assert.ok(handlesOf(gd)[1].focused)
  fire(pad, 'pointermove', {clientX: 230, clientY: 45})
  assert.deepEqual(gd.value[1], {x: 9, y: 0.75})
})

test('with jump, a touch moves the point on a tap and not on a scroll', () => {
  const gd = draggablePoints(chart(), {value: {x: 5, y: 0.5}, jump: true})
  const pad = padOf(gd)
  const down = fire(pad, 'pointerdown', {pointerType: 'touch', clientX: 70, clientY: 70})
  assert.ok(!down.defaultPrevented)
  assert.deepEqual(gd.value, {x: 5, y: 0.5})
  fire(pad, 'pointercancel', {pointerType: 'touch'})
  fire(pad, 'pointerup', {pointerType: 'touch', clientX: 70, clientY: 70})
  assert.deepEqual(gd.value, {x: 5, y: 0.5})

  fire(pad, 'pointerdown', {pointerType: 'touch', clientX: 70, clientY: 70})
  fire(pad, 'pointerup', {pointerType: 'touch', clientX: 70, clientY: 70})
  assert.deepEqual(gd.value, {x: 1, y: 0.5})
})

test('without jump there is no pad', () => {
  assert.equal(padOf(draggablePoints(chart(), {value: {x: 5, y: 0.5}})), undefined)
})

test('a second call on the same chart replaces the first', () => {
  const gd = chart()
  draggablePoints(gd, {value: {x: 5, y: 0.5}})
  const oldHandle = handlesOf(gd)[0]
  draggablePoints(gd, {value: {x: 2, y: 0.5}})
  assert.equal(gd.children.filter((child) => child.classes.has('vm-drag-layer')).length, 1)
  assert.equal(gd.handlers.plotly_afterplot.length, 1)
  fire(oldHandle, 'keydown', {key: 'ArrowRight'})
  assert.deepEqual(gd.value, {x: 2, y: 0.5})
})

test('the value has the shape it was given: a point, or an array of one', () => {
  assert.deepEqual(draggablePoints(chart(), {value: {x: 1, y: 0.5}}).value, {x: 1, y: 0.5})
  assert.deepEqual(draggablePoints(chart(), {value: [{x: 1, y: 0.5}]}).value, [{x: 1, y: 0.5}])
  const gd = draggablePoints(chart(), {value: [{x: 1, y: 0.5}], label: 'Corner'})
  assert.equal(handlesOf(gd)[0].getAttribute('aria-label'), 'Corner 1')
})

test('setting a single point keeps it a single point', () => {
  const gd = draggablePoints(chart(), {value: {x: 1, y: 0.5}})
  gd.value = {x: 5, y: 0.25}
  assert.deepEqual(gd.value, {x: 5, y: 0.25})
  assert.equal(handlesOf(gd)[0].style.transform, 'translate(150px, 95px)')
})

test('a missing value, an undrawn div and an unknown axis are refused', () => {
  assert.throws(() => draggablePoints(chart()), TypeError)
  assert.throws(() => draggablePoints(chart(), {value: null}), TypeError)
  assert.throws(() => draggablePoints(new FakeElement('div'), {value: {x: 0, y: 0}}), TypeError)
  assert.throws(() => draggablePoints(chart(), {value: {x: 0, y: 0}, xaxis: 'z'}), TypeError)
})

test('draggablePoints uses a drawn chart function\'s div without redrawing it', () => {
  const gd = chart()
  let draws = 0
  const plot = () => { draws++; return gd }
  Object.defineProperty(plot, 'div', { get: () => gd })
  const view = draggablePoints(plot, { value: { x: 5, y: 0.5 } })
  assert.equal(view, gd)
  assert.equal(draws, 0)
})

test('draggablePoints draws an undrawn chart function once, empty', () => {
  const gd = chart()
  const calls = []
  const plot = (data, layout) => { calls.push([data, layout]); return gd }
  Object.defineProperty(plot, 'div', { get: () => null })
  draggablePoints(plot, { value: { x: 5, y: 0.5 } })
  assert.deepEqual(calls, [[[], {}]])
})

test('draggablePoints handles follow the chart after its listeners are dropped', () => {
  const gd = chart()
  draggablePoints(gd, { value: { x: 5, y: 0.5 } })
  // What Plotly.newPlot does: a fresh emitter, every listener gone.
  for (const name of Object.keys(gd.handlers)) delete gd.handlers[name]
  VM.plotting.keepListening(gd)
  gd._fullLayout.xaxis = axis(0, 200, [0, 10], false)
  gd.emit('plotly_afterplot')
  assert.match(handlesOf(gd)[0].style.transform, /^translate\(100px/)
})
