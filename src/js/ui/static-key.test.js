/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { staticKey } = VM.ui

// Just enough DOM for staticKey: elements with attributes and children.
const make = (tag, ns) => {
  const el = {tag, ns, className: '', textContent: '', attrs: {}, children: []}
  el.setAttribute = (name, value) => { el.attrs[name] = value }
  el.append = (...nodes) => el.children.push(...nodes)
  return el
}
globalThis.document.createElement = tag => make(tag)
globalThis.document.createElementNS = (ns, tag) => make(tag, ns)

const swatch = row => row.children[0]

test('staticKey builds one labelled row per item, swatch first', () => {
  const key = staticKey([{label: 'sin', stroke: 'red'}, {label: 'cos', stroke: 'blue'}])
  assert.equal(key.className, 'vm-static-key')
  assert.equal(key.children.length, 2)
  const [svg, text] = key.children[1].children
  assert.equal(key.children[1].className, 'vm-static-key-item')
  assert.equal(svg.tag, 'svg')
  assert.equal(svg.ns, 'http://www.w3.org/2000/svg')
  assert.equal(svg.attrs['aria-hidden'], 'true')
  assert.equal(text.textContent, 'cos')
})

test('a line keeps its dash, width and color, with Plot defaults otherwise', () => {
  const key = staticKey([
    {label: 'ref', stroke: 'red', strokeWidth: 2, strokeDasharray: '6,4'},
    {label: 'plain'}
  ])
  const [dashed] = swatch(key.children[0]).children
  assert.equal(dashed.tag, 'line')
  assert.equal(dashed.attrs.stroke, 'red')
  assert.equal(dashed.attrs['stroke-width'], '2')
  assert.equal(dashed.attrs['stroke-dasharray'], '6,4')
  const [plain] = swatch(key.children[1]).children
  assert.equal(plain.attrs.stroke, 'currentColor')
  assert.equal(plain.attrs['stroke-width'], '1.5')
  assert.equal('stroke-dasharray' in plain.attrs, false)
})

test('an area is a filled rect; marks stack in order', () => {
  const key = staticKey([{label: 'band', marks: [
    {mark: 'area', fill: 'blue', fillOpacity: 0.2},
    {mark: 'line', stroke: 'blue'}
  ]}])
  const [rect, line] = swatch(key.children[0]).children
  assert.equal(rect.tag, 'rect')
  assert.equal(rect.attrs.fill, 'blue')
  assert.equal(rect.attrs['fill-opacity'], '0.2')
  assert.equal(rect.attrs.stroke, 'none')
  assert.equal(line.tag, 'line')
})

test('dots paint like Plot.dot and grow the swatch to fit', () => {
  const key = staticKey([
    {label: 'hollow', mark: 'dot'},
    {label: 'filled', mark: 'dot', fill: 'green', r: 8}
  ])
  const [hollow] = swatch(key.children[0]).children
  assert.equal(hollow.attrs.fill, 'none')
  assert.equal(hollow.attrs.stroke, 'currentColor')
  assert.equal(hollow.attrs.r, '3')
  assert.equal(swatch(key.children[0]).attrs.height, '12')
  const [filled] = swatch(key.children[1]).children
  assert.equal(filled.attrs.fill, 'green')
  assert.equal(filled.attrs.stroke, 'none')
  assert.equal(swatch(key.children[1]).attrs.height, '18')
  assert.equal(filled.attrs.cy, '9')
})

test('swatchWidth sets the swatch width', () => {
  const key = staticKey([{label: 'a'}], {swatchWidth: 40})
  assert.equal(swatch(key.children[0]).attrs.width, '40')
  assert.equal(swatch(key.children[0]).children[0].attrs.x2, '39')
})

test('an unknown mark throws', () => {
  assert.throws(() => staticKey([{label: 'a', mark: 'bar'}]), TypeError)
})
