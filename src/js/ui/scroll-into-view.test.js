/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVM } from '../../../scripts/load-vm.mjs'

const VM = loadVM()
const { scrollIntoView } = VM.ui

// A page scrolled to `scrollY`, with a navbar of `navbar` px (none when
// null). The root's scroll-padding-top isn't stubbed: the helper never reads
// it, and the browser check (`npm run test:layout`, the category cloud with
// and without reduced motion) is what shows the padding doesn't move it.
function page({ scrollY, navbar }) {
  const calls = []
  globalThis.scrollY = scrollY
  globalThis.scrollTo = (options) => calls.push(options)
  globalThis.document.querySelector = (selector) =>
    selector === 'header.fixed-top' && navbar !== null ? { clientHeight: navbar } : null
  globalThis.getComputedStyle = (el) => el.style
  return calls
}

const target = (top, scrollMarginTop = '0px') => ({
  getBoundingClientRect: () => ({ top }),
  style: { scrollMarginTop }
})

test('scrollIntoView puts the target just below the navbar', () => {
  const calls = page({ scrollY: 1000, navbar: 77 })
  scrollIntoView(target(500))
  assert.deepEqual(calls, [{ top: 1423, behavior: 'auto' }])
})

test('scrollIntoView scrolls up to a target above the window', () => {
  const calls = page({ scrollY: 1000, navbar: 77 })
  scrollIntoView(target(-300))
  assert.equal(calls[0].top, 623)
})

test("scrollIntoView adds the target's own scroll-margin-top beyond the navbar", () => {
  const calls = page({ scrollY: 0, navbar: 60 })
  scrollIntoView(target(800, '16px'))
  assert.equal(calls[0].top, 724)
})

test('scrollIntoView scrolls to the target itself on a page with no fixed navbar', () => {
  const calls = page({ scrollY: 200, navbar: null })
  scrollIntoView(target(100, 'auto'))
  assert.equal(calls[0].top, 300)
})

test('scrollIntoView passes the behavior through', () => {
  const calls = page({ scrollY: 0, navbar: 50 })
  scrollIntoView(target(100), { behavior: 'instant' })
  assert.equal(calls[0].behavior, 'instant')
})

test('scrollIntoView throws a TypeError, and scrolls nothing, on a missing element', () => {
  const calls = page({ scrollY: 0, navbar: 50 })
  assert.throws(() => scrollIntoView(null), { name: 'TypeError', message: /got null/ })
  assert.throws(() => scrollIntoView(undefined), TypeError)
  assert.deepEqual(calls, [])
})
