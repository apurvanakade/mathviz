/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// sidebar-search.js is one of mathviz's opt-in chrome scripts (see
// mathviz.lua), loaded the way a <script> tag would: an IIFE evaluated in
// global scope against a minimal window/document stub. With no
// #quarto-sidebar in the stub, init() returns without touching the DOM.
globalThis.window = globalThis
globalThis.document = {
  readyState: 'complete',
  addEventListener: () => {},
  getElementById: () => null,
  documentElement: { classList: { contains: () => false } }
}
const here = path.dirname(fileURLToPath(import.meta.url))
;(0, eval)(fs.readFileSync(path.join(here, 'sidebar-search.js'), 'utf8'))
const { normalize, matches } = globalThis.VM.chrome.sidebarSearch

test('normalize drops case, accents and apostrophes, and collapses punctuation', () => {
  assert.equal(normalize('Sperner’s Lemma - Statement'), 'sperners lemma statement')
  assert.equal(normalize("Sperner's Lemma"), 'sperners lemma')
  assert.equal(normalize('  Poincaré   Maps '), 'poincare maps')
  assert.equal(normalize('L1 vs. L2 Regression'), 'l1 vs l2 regression')
})

test('matches finds a query word only at the start of a title word', () => {
  assert.equal(matches('Explicit Methods for ODEs', 'ode'), true)
  assert.equal(matches('Model Fitting', 'ode'), false)
  assert.equal(matches('Newton’s Method', 'newton'), true)
})

test('matches needs every query word, in any order', () => {
  assert.equal(matches('Sperner’s Lemma - Geometric Proof', 'proof sperner'), true)
  assert.equal(matches('Sperner’s Lemma - Statement', 'proof sperner'), false)
})

test('matches ignores the query\'s own case, accents and apostrophes', () => {
  assert.equal(matches("Sperner's Lemma", 'SPERNER’S'), true)
  assert.equal(matches('Poincaré Maps', 'poincare'), true)
})

test('an empty or punctuation-only query matches everything', () => {
  assert.equal(matches('Anything', ''), true)
  assert.equal(matches('Anything', ' - '), true)
})
