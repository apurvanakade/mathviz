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

// quiet-toc.css restyles Quarto's table of contents and the margin sidebar
// that holds it. A rule of it that selected anything else would restyle a
// page with no table of contents (an introduction page that sets
// `toc: false`, a listing), whose margin sidebar is still in the DOM, empty
// or holding margin notes. So every selector names the list, nav#TOC inside
// #quarto-margin-sidebar, or that sidebar only when it has one.
// npm run test:layout checks the same in a browser, on fixture pages with
// and without a table of contents.

const here = path.dirname(fileURLToPath(import.meta.url))

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

test('every selector in quiet-toc.css is scoped to a table of contents in the margin sidebar', () => {
  const sels = selectors(fs.readFileSync(path.join(here, 'quiet-toc.css'), 'utf8'))
  assert.ok(sels.length > 5, `expected the stylesheet's rules, found ${sels.length} selectors`)
  const scoped = /^(body |html:not\(\.vm-embed\) )?#quarto-margin-sidebar( nav#TOC|:has\(nav#TOC\)$)/
  assert.deepEqual(sels.filter(sel => !scoped.test(sel)), [])
})

// Quarto hides the margin sidebar below 768px, and embed mode hides it in a
// frame, each with a `display: none` this file's selectors outrank. So the
// one rule that sets `display` (the flex box that centres the list) applies
// only from 768px up and outside a frame; unguarded, it put the list back
// on a phone.
test('quiet-toc.css sets display only from 768px up and outside embed mode', () => {
  const css = stripComments(fs.readFileSync(path.join(here, 'quiet-toc.css'), 'utf8'))
  const displays = css.match(/[^-]display\s*:/g) || []
  assert.equal(displays.length, 2, 'the heading\'s display: none and the sidebar\'s display: flex')
  assert.match(css, /#toc-title \{\s*display: none;/)
  assert.match(css, /@media \(min-width: 768px\) \{\s*html:not\(\.vm-embed\) #quarto-margin-sidebar:has\(nav#TOC\) \{[^}]*display: flex;/)
})

// The filter loads it only for `quiet-toc`, as a stylesheet with no script.
test('mathviz.lua loads chrome/quiet-toc.css only when quiet-toc is on', () => {
  const lua = fs.readFileSync(path.resolve(here, '..', '..', '_extensions', 'mathviz', 'mathviz.lua'), 'utf8')
  const block = lua.match(/if enabled\(opts, "quiet-toc"\) then([\s\S]*?)\n  end/)
  assert.ok(block, 'no `if enabled(opts, "quiet-toc")` block in mathviz.lua')
  assert.match(block[1], /stylesheets = \{ "chrome\/quiet-toc\.css" \}/)
  assert.equal(lua.split('chrome/quiet-toc.css').length - 1, 1, 'chrome/quiet-toc.css is loaded from one place')
})
