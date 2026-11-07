/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()

// The handful of DOM calls renderTable makes.
class Node {
  constructor (tag) {
    this.tagName = tag
    this.nodeType = tag === '#text' ? 3 : 1
    this.children = []
    this.className = ''
    this.listeners = {}
    this.textValue = ''
  }

  append (...items) {
    for (const item of items) {
      if (item && item.tagName === '#fragment') this.children.push(...item.children)
      else this.children.push(typeof item === 'string' ? Object.assign(new Node('#text'), {textValue: item}) : item)
    }
  }

  remove () {}
  click () { (this.listeners.click ?? []).forEach((fn) => fn({preventDefault () {}})) }
  addEventListener (type, fn) { (this.listeners[type] ??= []).push(fn) }
  get textContent () { return this.tagName === '#text' ? this.textValue : this.children.map((c) => c.textContent).join('') }
  set textContent (value) { this.children = [Object.assign(new Node('#text'), {textValue: value})] }
}

const find = (node, tag) => node.tagName === tag ? [node] : node.children.flatMap((c) => find(c, tag))

test('renderTable builds the toolbar and table from strings, numbers and nodes', () => {
  globalThis.document.createElement = (tag) => new Node(tag)
  globalThis.document.createDocumentFragment = () => new Node('#fragment')
  const math = new Node('span')
  math.append('x_n')
  const fragment = VM.ui.renderTable({headers: ['n', math], rows: [[0, '1.5'], [1, 2]]})
  const [table] = find(fragment, 'table')
  assert.equal(table.className, 'table table-sm table-bordered small')
  const cells = find(table, 'td')
  assert.deepEqual(cells.map((c) => c.textContent), ['0', '1.5', '1', '2'])
  assert.equal(cells[0].className, 'text-nowrap text-center')
  assert.equal(cells[1].className, 'text-nowrap text-end')
  assert.equal(find(table, 'th')[1].children[0], math, 'a node header is inserted as is')
})

test('the CSV download quotes \\r and reads node headers by their text', () => {
  globalThis.document.createElement = (tag) => new Node(tag)
  globalThis.document.createDocumentFragment = () => new Node('#fragment')
  globalThis.document.body = new Node('body')
  let blobText = null
  globalThis.Blob = class { constructor (parts) { blobText = parts.join('') } }
  globalThis.URL.createObjectURL = () => 'blob:x'
  globalThis.URL.revokeObjectURL = () => {}
  const header = new Node('span')
  header.append('err')
  const fragment = VM.ui.renderTable({headers: ['n', header], rows: [[0, 'a\rb']]})
  const [link] = find(fragment, 'a')
  link.click()
  assert.equal(blobText, 'n,err\n0,"a\rb"')
})
