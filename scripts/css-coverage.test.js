/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The CSS counterpart of docs-coverage.test.js, and in scripts/ for the same
// reason: src/ is mirrored from VisualMathLab, docs/ is authored here.
//
// docs-coverage walks VM.*, so a sync that only touched src/css stayed green
// while the guide drifted -- four tokens missing from the Theming table and a
// stale ojs-grid width went unnoticed across three syncs. This checks the
// names mechanically:
//
// - every token tokens.css declares has a row in docs/theming.qmd's live
//   table, and every row names a token that exists;
// - every other --vm-* property the CSS reads or sets (runtime layout state)
//   is listed in docs/reference/internals.qmd;
// - every ojs-* / vm-* class a stylesheet selects on is mentioned in the
//   guide (markup.qmd, theming.qmd) or in internals.qmd.
//
// It can't tell whether the prose describing a name is still true -- a
// changed value or behaviour under an unchanged name. That still needs a
// read of the diff against the guide before a sync is merged: step 4 of
// .claude/skills/land-pr/SKILL.md.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { repoRoot } from './load-vm.mjs'

const cssDir = path.join(repoRoot, 'src/css')

function read(relative) {
  return fs.readFileSync(path.join(repoRoot, relative), 'utf8')
}

// Comments mention names in passing (".ojs-panels" in a sentence about
// nesting), so strip them before looking for selectors and properties.
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function uniqueSorted(names) {
  return Array.from(new Set(names)).sort()
}

function matchesOf(source, pattern) {
  const found = []
  for (const match of source.matchAll(pattern)) found.push(match[1])
  return found
}

const stylesheets = []
for (const name of fs.readdirSync(cssDir).sort()) {
  if (name.endsWith('.css')) {
    stylesheets.push({ name, css: stripComments(read(`src/css/${name}`)) })
  }
}

const tokensCss = stripComments(read('src/css/tokens.css'))
const theming = read('docs/theming.qmd')
const internals = read('docs/reference/internals.qmd')
const guide = read('docs/markup.qmd') + theming + internals

test('docs/theming.qmd lists every token tokens.css declares, and nothing else', () => {
  const declared = uniqueSorted(matchesOf(tokensCss, /(--vm-[a-z0-9-]+)\s*:/g))
  // Rows of the live table: ["--vm-bg", "page background: ..."]
  const documented = uniqueSorted(matchesOf(theming, /\["(--vm-[a-z0-9-]+)"/g))
  assert.deepEqual(documented, declared,
    `tokens.css declares ${JSON.stringify(declared)} but theming.qmd's table lists ${JSON.stringify(documented)}`)
})

test('every other --vm-* property the CSS uses is listed in internals.qmd', () => {
  const declared = new Set(matchesOf(tokensCss, /(--vm-[a-z0-9-]+)\s*:/g))
  const missing = []
  for (const sheet of stylesheets) {
    for (const name of matchesOf(sheet.css, /(--vm-[a-z0-9-]+)/g)) {
      if (!declared.has(name) && !internals.includes(name)) {
        missing.push(`${name} (${sheet.name})`)
      }
    }
  }
  assert.deepEqual(uniqueSorted(missing), [],
    'runtime --vm-* properties with no entry under internals.qmd#generated-classes')
})

test('every ojs-* / vm-* class the CSS selects on is documented', () => {
  const missing = []
  for (const sheet of stylesheets) {
    for (const name of matchesOf(sheet.css, /\.((?:ojs|vm)-[a-z0-9-]+)/g)) {
      // Whole-word: `vm-play` must not count as documented because
      // `vm-play-button` is.
      const mention = new RegExp(`(^|[^a-z0-9-])${name}(?![a-z0-9-])`)
      if (!mention.test(guide)) missing.push(`${name} (${sheet.name})`)
    }
  }
  assert.deepEqual(uniqueSorted(missing), [],
    'classes with no mention in markup.qmd, theming.qmd or reference/internals.qmd')
})
