/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Moves files from a site's mathviz-local overlay (kit/_mathviz/, copied
// into that site) into src/ here. The overlay is laid out path for path like
// src/, so this is a copy plus manifest bookkeeping:
//
//   node scripts/port.mjs ../my-site/_mathviz                  # everything
//   node scripts/port.mjs ../my-site/_mathviz ui/stat-row.js stat-row.css
//
// - Each named file (default: every entry in the overlay's manifest) is
//   copied to the same path under src/js/ or src/css/, with its .test.js
//   alongside when there is one. A file that already exists here is
//   overwritten -- that is an overlay patching an upstream member -- and
//   reported as such, so check the diff.
// - A js entry new to src/manifest.mjs goes in after the last entry of the
//   same category (the end of the list for a new one); a css entry at the
//   end. Load-order constraints between the ported files are the overlay's
//   and are not carried over: add them to `mustPrecede` by hand.
//
// It does not write docs. `npm test` then fails in docs-coverage for each
// new member, naming it -- the reference entry is part of the pull request.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const overlay = process.argv[2]
if (!overlay) {
  console.error('Usage: node scripts/port.mjs <site>/_mathviz [file ...]')
  process.exit(1)
}
const overlayRoot = path.resolve(overlay)
const overlayManifest = await import(pathToFileURL(path.join(overlayRoot, 'src/manifest.mjs')))

let wanted = process.argv.slice(3)
if (wanted.length === 0) wanted = [...overlayManifest.js, ...overlayManifest.css]

const manifestPath = path.join(repoRoot, 'src/manifest.mjs')
const ourManifest = await import(pathToFileURL(manifestPath))
let manifestText = fs.readFileSync(manifestPath, 'utf8')

function copy(kind, rel) {
  const from = path.join(overlayRoot, 'src', kind, rel)
  const to = path.join(repoRoot, 'src', kind, rel)
  if (!fs.existsSync(from)) {
    console.error(`missing in overlay: src/${kind}/${rel}`)
    process.exit(1)
  }
  const existed = fs.existsSync(to)
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.copyFileSync(from, to)
  console.log(`${existed ? 'replaced' : 'added   '} src/${kind}/${rel}${existed ? '   <- an upstream file; review the diff' : ''}`)
  if (kind === 'js') {
    const test = rel.replace(/\.js$/, '.test.js')
    if (fs.existsSync(path.join(overlayRoot, 'src/js', test))) {
      fs.copyFileSync(path.join(overlayRoot, 'src/js', test), path.join(repoRoot, 'src/js', test))
      console.log(`         src/js/${test}`)
    }
  }
}

// Inserts `'rel',` into the named array literal of src/manifest.mjs, after
// the line of `anchor` (an existing entry) or before the closing bracket.
function insert(list, rel, anchor) {
  const open = manifestText.indexOf(`export const ${list} = [`)
  const close = manifestText.indexOf('\n]', open)
  let at = close
  if (anchor) {
    const line = manifestText.indexOf(`  '${anchor}',\n`, open)
    at = manifestText.indexOf('\n', line)
  }
  manifestText = manifestText.slice(0, at) + `\n  '${rel}',` + manifestText.slice(at)
}

const js = [...ourManifest.js]
const newCategories = []
for (const rel of wanted) {
  if (rel.endsWith('.css')) {
    copy('css', rel)
    if (!ourManifest.css.includes(rel)) insert('css', rel, null)
    continue
  }
  copy('js', rel)
  if (js.includes(rel)) continue
  const category = rel.split('/')[0]
  let anchor = null
  for (const entry of js) {
    if (entry.startsWith(category + '/')) anchor = entry
  }
  if (anchor === null && !newCategories.includes(category)) newCategories.push(category)
  insert('js', rel, anchor)
  js.splice(anchor === null ? js.length : js.indexOf(anchor) + 1, 0, rel)
}
fs.writeFileSync(manifestPath, manifestText)

console.log(`
Next:
  npm test          docs-coverage names every member without a docs/reference/ entry
  npm run build
  add a CHANGELOG.md [Unreleased] entry, then open a pull request`)
if (newCategories.length > 0) {
  console.log(`
New categor${newCategories.length === 1 ? 'y' : 'ies'}: ${newCategories.join(', ')}.
  Add docs/reference/<category>.qmd and the pageFor entry in scripts/docs-coverage.test.js.`)
}
console.log(`
Load-order constraints between the ported files are not copied: check the
overlay's manifest.test.js and add any to mustPrecede in src/manifest.mjs.`)
