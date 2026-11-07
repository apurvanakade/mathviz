/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()

test('sliderBounds reads min/max/step with the HTML defaults', () => {
  assert.deepEqual(VM.ui.sliderBounds({min: '2', max: '8', step: '0.5'}), {min: 2, max: 8, step: 0.5})
  const open = VM.ui.sliderBounds({min: '', max: 'abc', step: 'any'})
  assert.equal(open.min, 0)
  assert.equal(open.max, 100)
  assert.ok(Number.isNaN(open.step))
})

test('whenAdded is a no-op outside a browser', () => {
  const stop = VM.ui.whenAdded('.x', () => { throw new Error('called') })
  assert.equal(typeof stop, 'function')
  stop()
})
