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

// The sidebar rail rewrites the page grid and Quarto's sidebar, so a rule of
// it that reached a site without the rail would restyle that site's pages.
// These tests hold the two lines that keep it from happening: every rule in
// sidebar-rail.css is scoped under the class sidebar-rail.js sets (and drops
// on a page it doesn't drive), and nothing that loads without the option --
// the bundle's CSS, the theme, the other chrome -- styles the rail's markup.
// npm run test:layout checks the same in a browser, on a fixture page with
// the rail switched off.

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '..', '..')
const SCOPE = 'html.vm-sidebar-rail'
const GRID = /^html\.vm-sidebar-rail body\.(floating|docked)(:has\(nav#TOC\))? \.page-columns$/

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

// Every style rule's selector list, with at-rule preludes (@media ...)
// left out: a flat scan for "prelude {", which is all this file uses.
function selectors(css) {
  const out = []
  for (const match of stripComments(css).matchAll(/([^{}]+)\{/g)) {
    const prelude = match[1].trim()
    if (prelude.startsWith('@')) continue
    for (const sel of prelude.split(',')) out.push(sel.trim())
  }
  return out
}

// The page grid applies in embed mode too (the frame hides the sidebar, but
// its track would still push the app right); everything else -- the
// off-canvas panel, the rail -- skips a frame.
test('every selector in sidebar-rail.css is scoped under html.vm-sidebar-rail, and all but the grid skip embed mode', () => {
  const sels = selectors(fs.readFileSync(path.join(here, 'sidebar-rail.css'), 'utf8'))
  assert.ok(sels.length > 10, `expected the rail's rules, found ${sels.length} selectors`)
  const unscoped = sels.filter(sel => !GRID.test(sel) && !sel.startsWith(SCOPE + ':not(.vm-embed) '))
  assert.deepEqual(unscoped, [])
  assert.equal(sels.filter(sel => GRID.test(sel)).length, 4, 'the floating and docked grid, each with and without a TOC')
})

test('nothing loaded without the option styles the rail or its classes', () => {
  // Rail markup and state, and the page-grid/sidebar it takes over. The
  // only mention allowed outside sidebar-rail.css is embed.css hiding the
  // rail in a frame.
  const railSelector = /#vm-sidebar-rail|\.vm-rail-cluster|\.vm-sidebar-open|\.vm-sidebar-pinned|\.vm-sidebar-rail\b|--vm-rail-|--vm-header-height|--vm-secondary-nav-height/
  const files = []
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(css|scss)$/.test(entry.name) && entry.name !== 'sidebar-rail.css') files.push(full)
    }
  }
  walk(path.join(repo, 'src'))
  const offenders = []
  for (const file of files) {
    for (const sel of selectors(fs.readFileSync(file, 'utf8'))) {
      if (!railSelector.test(sel)) continue
      if (path.basename(file) === 'embed.css' && sel === 'html.vm-embed #vm-sidebar-rail') continue
      offenders.push(`${path.relative(repo, file)}: ${sel}`)
    }
  }
  assert.deepEqual(offenders, [])
})

// sidebar-rail.js against a minimal document: the class goes on <html> at
// load and comes off at init when there is no sidebar to drive.
function loadRail({ sidebar = null, embed = false } = {}) {
  const classes = new Set(embed ? ['vm-embed'] : [])
  const appended = []
  const listeners = {}
  const doc = {
    readyState: 'loading',
    documentElement: {
      classList: {
        add: c => classes.add(c),
        remove: c => classes.delete(c),
        contains: c => classes.has(c)
      },
      style: { setProperty: () => {} }
    },
    body: { appendChild: el => appended.push(el), classList: { add() {}, remove() {}, toggle() {}, contains: () => false } },
    addEventListener: (type, fn) => { listeners[type] = fn },
    getElementById: id => (id === 'quarto-sidebar' ? sidebar : null),
    querySelector: () => null
  }
  const run = new Function('document', 'window', fs.readFileSync(path.join(here, 'sidebar-rail.js'), 'utf8'))
  run(doc, {})
  return { classes, appended, listeners }
}

test('the class is on <html> before DOMContentLoaded, so the first paint is already laid out', () => {
  const { classes } = loadRail()
  assert.ok(classes.has('vm-sidebar-rail'))
})

test('a page with no sidebar navigation gets the class taken off and no rail', () => {
  const { classes, appended, listeners } = loadRail({ sidebar: null })
  listeners.DOMContentLoaded()
  assert.equal(classes.has('vm-sidebar-rail'), false)
  assert.equal(appended.length, 0)
})

test('a sidebar that is not Quarto sidebar navigation is left alone', () => {
  const sidebar = { classList: { contains: () => false } }
  const { classes, appended, listeners } = loadRail({ sidebar })
  listeners.DOMContentLoaded()
  assert.equal(classes.has('vm-sidebar-rail'), false)
  assert.equal(appended.length, 0)
})

test('embed mode keeps the class, for the page grid, and builds no rail', () => {
  const sidebar = { classList: { contains: c => c === 'sidebar-navigation' } }
  const { classes, appended, listeners } = loadRail({ sidebar, embed: true })
  listeners.DOMContentLoaded()
  assert.equal(classes.has('vm-sidebar-rail'), true)
  assert.equal(appended.length, 0)
})
