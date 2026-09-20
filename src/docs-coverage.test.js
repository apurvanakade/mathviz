/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Keeps docs/reference/ complete: every member the bundle attaches to
// VM.<category> must have a `### VM.<category>.<name>` heading in that
// category's reference page, and every such heading must name a member that
// exists. The per-function catalog used to live in CLAUDE.md with nothing
// checking it, and drifted (a documented return shape that the code had
// stopped producing, an undocumented export); this is what stops that from
// happening again.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { loadVM, repoRoot } from '../scripts/load-vm.mjs'

// VM.<category> -> docs/reference/<page>.qmd
const pageFor = {
  expressions: 'expressions',
  numerical: 'numerical',
  sampling: 'sampling',
  filters: 'filters',
  distributions: 'distributions',
  plotting: 'plotting',
  ui: 'ui',
  discreteMath: 'discrete-math'
}

const VM = loadVM()

function headingsIn(page) {
  const file = path.join(repoRoot, 'docs/reference', `${page}.qmd`)
  const source = fs.readFileSync(file, 'utf8')
  const names = []
  // `### VM.plotting.colors()` or `### VM.ui.playbackTweenMs` -- the
  // signature after the name is free-form.
  for (const match of source.matchAll(/^###\s+VM\.(\w+)\.(\w+)/gm)) {
    names.push({ category: match[1], name: match[2] })
  }
  return names
}

test('every VM category has a reference page', () => {
  assert.deepEqual(Object.keys(VM).sort(), Object.keys(pageFor).sort())
})

for (const [category, page] of Object.entries(pageFor)) {
  test(`docs/reference/${page}.qmd documents every VM.${category} member, and nothing else`, () => {
    const exported = Object.keys(VM[category]).sort()
    const headings = headingsIn(page)
    for (const heading of headings) {
      assert.equal(heading.category, category,
        `${page}.qmd has a heading for VM.${heading.category}.${heading.name}, which belongs on another page`)
    }
    const documented = []
    for (const heading of headings) documented.push(heading.name)
    documented.sort()
    assert.deepEqual(documented, exported,
      `VM.${category}: exported ${JSON.stringify(exported)} but ${page}.qmd documents ${JSON.stringify(documented)}`)
  })
}
