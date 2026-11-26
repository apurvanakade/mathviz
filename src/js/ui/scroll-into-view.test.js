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
// null) and a root scroll-padding-top of `padding` px, which the helper
// must ignore: it is there only where mathviz's smooth scroll animates.
function page({ scrollY, navbar, padding = 0 }) {
  const calls = []
  globalThis.scrollY = scrollY
  globalThis.scrollTo = (options) => calls.push(options)
  globalThis.document.querySelector = (selector) =>
    selector === 'header.fixed-top' && navbar !== null ? { clientHeight: navbar } : null
  globalThis.document.documentElement = { style: { scrollPaddingTop: `${padding}px` } }
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

test('scrollIntoView lands in the same place whether or not the root has the smooth-scroll padding', () => {
  const without = page({ scrollY: 1000, navbar: 77, padding: 0 })
  scrollIntoView(target(-300))
  const withPadding = page({ scrollY: 1000, navbar: 77, padding: 77 })
  scrollIntoView(target(-300))
  assert.deepEqual(withPadding, without)
  assert.equal(without[0].top, 623)
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
