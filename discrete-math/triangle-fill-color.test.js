/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../scripts/load-vm.mjs'

const VM = loadVM()
const { triangleFillColor } = VM.discreteMath

test('triangleFillColor: three distinct colors -> shared rainbow fill', () => {
  assert.equal(triangleFillColor(['red', 'green', 'blue']), 'rgba(75, 0, 130, 0.55)')
  assert.equal(triangleFillColor(['blue', 'red', 'green']), 'rgba(75, 0, 130, 0.55)', 'order-independent')
})

test('triangleFillColor: two or one distinct colors -> no fill', () => {
  assert.equal(triangleFillColor(['red', 'red', 'green']), 'none')
  assert.equal(triangleFillColor(['green', 'blue', 'green']), 'none')
  assert.equal(triangleFillColor(['blue', 'red', 'blue']), 'none')
  assert.equal(triangleFillColor(['red', 'red', 'red']), 'none')
  assert.equal(triangleFillColor(['green', 'green', 'green']), 'none')
  assert.equal(triangleFillColor(['blue', 'blue', 'blue']), 'none')
})
