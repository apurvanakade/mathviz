/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// The starter is the example site: every style feature the extension ships
// is on one of its pages, so `quarto preview starter` shows each of them,
// in light and dark, the way a consumer gets them. css-coverage checks that
// the docs *name* each class; this checks that a starter page *shows* it.
// It is static (no render, no browser): a name passes when
//
// - a starter page or starter/_quarto.yml writes it itself (comments
//   stripped first, so a page that only mentions a class doesn't count), or
// - it is one the library writes, listed in `shownBy` below with the call,
//   markup or option that makes the library write it -- and the starter
//   has that.
//
// So a new class in src/css or src/chrome fails here until a starter page
// shows it, or until `shownBy` says what shows it and a page has that. The
// same for every class and attribute in markup.qmd's "At a glance" table,
// every key in site.qmd's "All the keys" block, and the theme.
//
// What it can't tell: that the page still looks right. That is what
// `quarto preview starter` is for.

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { repoRoot } from './load-vm.mjs'

function read(relative) {
  return fs.readFileSync(path.join(repoRoot, relative), 'utf8')
}

function uniqueSorted(names) {
  return Array.from(new Set(names)).sort()
}

function matchesOf(source, pattern) {
  const found = []
  for (const match of source.matchAll(pattern)) found.push(match[1])
  return found
}

// Whole-word: `vm-play` must not count as shown because `vm-play-button` is.
function mentions(source, name) {
  return new RegExp(`(^|[^a-z0-9-])${name}(?![a-z0-9-])`).test(source)
}

// Every class and data-vm-* attribute a stylesheet selects on, bundle and
// chrome alike.
const selected = []
for (const dir of ['src/css', 'src/chrome']) {
  for (const name of fs.readdirSync(path.join(repoRoot, dir)).sort()) {
    if (!name.endsWith('.css')) continue
    const css = read(`${dir}/${name}`).replace(/\/\*[\s\S]*?\*\//g, '')
    for (const found of matchesOf(css, /\.((?:ojs|vm)-[a-z0-9-]+)/g)) selected.push({ name: found, sheet: name })
    for (const found of matchesOf(css, /\[(data-vm-[a-z0-9-]+)/g)) selected.push({ name: found, sheet: name })
  }
}

// The starter's sources, minus comments: HTML comments in the pages, YAML
// comments in the config, and `//` line comments in the ojs cells.
const starterFiles = ['_quarto.yml']
for (const name of fs.readdirSync(path.join(repoRoot, 'starter')).sort()) {
  if (name.endsWith('.qmd') || name.endsWith('.html')) starterFiles.push(name)
}
// (Only whole-line `#` comments, and only in the YAML: in a page they are
// headings.)
const config = read('starter/_quarto.yml').replace(/^\s*#.*$/gm, '')
const starter = [config, ...starterFiles.slice(1)
  .map(name => read(`starter/${name}`)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^\s*\/\/.*$/gm, ''))]
  .join('\n')

// Names the library writes, and what in the starter makes it write them.
// Keep each entry's pattern to the narrowest thing that does.
const shownBy = [
  {
    what: 'a slider in a panel (slider playback)',
    pattern: /Inputs\.range\(/,
    names: ['vm-play', 'vm-play-button', 'vm-play-group', 'vm-play-more', 'vm-play-panel',
      'vm-play-pill', 'vm-play-pill-on', 'vm-play-pills', 'vm-playing', 'vm-has-play']
  },
  {
    what: 'VM.ui.legendOverlay (with its draggable grip)',
    pattern: /VM\.ui\.legendOverlay\(/,
    names: ['ojs-legend-overlay', 'ojs-legend-item', 'ojs-legend-swatch', 'vm-overlay-grip', 'vm-overlay-dragging']
  },
  { what: 'a legend overlay in the top-right corner', pattern: /corner:\s*"top-right"/, names: ['ojs-legend-top-right'] },
  { what: 'VM.ui.renderTable', pattern: /VM\.ui\.renderTable\(/, names: ['ojs-table-toolbar', 'ojs-table-container'] },
  { what: 'VM.ui.statRow', pattern: /VM\.ui\.statRow\(/, names: ['vm-stat-row', 'vm-stat', 'vm-stat-label', 'vm-stat-value'] },
  { what: 'VM.ui.staticKey', pattern: /VM\.ui\.staticKey\(/, names: ['vm-static-key', 'vm-static-key-item'] },
  {
    what: 'VM.plotting.draggablePoints',
    pattern: /VM\.plotting\.draggablePoints\(/,
    names: ['vm-drag-host', 'vm-drag-layer', 'vm-drag-pad', 'vm-drag-point', 'vm-drag-active']
  },
  { what: 'VM.plotting.draggablePoints({pan})', pattern: /draggablePoints\([^)]*\bpan:\s*true/, names: ['vm-drag-panning'] },
  {
    what: 'an Observable Plot chart in a chart block (SVG modebar, fullscreen)',
    pattern: /Plot\.plot\(/,
    names: ['vm-svg-host', 'vm-svg-modebar', 'vm-svg-modebar-button', 'vm-fs-figure']
  },
  { what: 'VM.plotting.persistentPlot({aspectRatio})', pattern: /persistentPlot\(\{[^}]*aspectRatio:/, names: ['vm-plot-aspect'] },
  { what: 'a Plotly chart (fullscreen button)', pattern: /Plotly\.newPlot\(/, names: ['vm-fs-plot-group'] },
  // The starter's dark theme is Quarto's toggle (body.quarto-dark); vm-dark
  // is the same dark palette under the selector for hosts without one.
  { what: 'a light/dark theme pair', pattern: /^\s*dark:/m, names: ['vm-dark'] },
  { what: 'mathviz: embed (or share)', config: /^\s*(embed|share):/m, names: ['vm-embed', 'vm-app-active'] },
  {
    what: 'mathviz: share',
    config: /^\s*share:/m,
    names: ['vm-share-bar', 'vm-share-button', 'vm-share-dialog', 'vm-share-form', 'vm-share-close', 'vm-share-links',
      'vm-share-link', 'vm-share-link-label', 'vm-share-link-status', 'vm-share-copy', 'vm-share-code', 'vm-share-actions',
      'vm-share-checkbox-row', 'vm-share-height', 'vm-share-height-row']
  },
  {
    what: 'mathviz: sidebar-rail',
    config: /^\s*sidebar-rail:/m,
    names: ['vm-sidebar-rail', 'vm-rail-cluster', 'vm-sidebar-open', 'vm-sidebar-pinned', 'data-vm-toggle', 'data-vm-pin']
  },
  {
    what: 'mathviz: sidebar-search',
    config: /^\s*sidebar-search:/m,
    names: ['vm-sidebar-search', 'vm-sidebar-search-empty', 'vm-sidebar-search-hidden']
  }
]

function entryShown(entry) {
  return entry.config ? entry.config.test(config) : entry.pattern.test(starter)
}

test('every class and data-vm-* attribute the CSS selects on is shown by a starter page', () => {
  const missing = []
  for (const { name, sheet } of selected) {
    if (mentions(starter, name)) continue
    const entry = shownBy.find(e => e.names.includes(name))
    if (!entry) missing.push(`${name} (${sheet}): no starter page writes it, and shownBy doesn't say what shows it`)
    else if (!entryShown(entry)) missing.push(`${name} (${sheet}): needs ${entry.what} on a starter page`)
  }
  assert.deepEqual(uniqueSorted(missing), [])
})

test('shownBy names only classes the CSS still selects on', () => {
  const live = new Set(selected.map(s => s.name))
  const stale = shownBy.flatMap(e => e.names).filter(name => !live.has(name))
  assert.deepEqual(uniqueSorted(stale), [])
})

test('every class and attribute in markup.qmd\'s "At a glance" table is on a starter page', () => {
  const markup = read('docs/markup.qmd')
  const table = markup.slice(markup.indexOf('## At a glance'), markup.indexOf('## Panels'))
  // First cell of each row: [`ojs-row`](#ojs-row) / [`ojs-grid`](#ojs-grid) ...
  const names = []
  for (const row of table.split('\n').filter(line => line.startsWith('| [') || line.startsWith('| `'))) {
    const cell = row.split('|')[1]
    for (const code of matchesOf(cell, /`([^`]+)`/g)) {
      // `vm-swatch vm-swatch-alt`, `data-vm-play="off"`: each class, each attribute name.
      // (`-accent` in the prose of a cell is a suffix, not a name.)
      for (const word of code.split(/\s+/)) if (/^[a-z]/.test(word)) names.push(word.replace(/=.*$/, ''))
    }
  }
  assert.ok(names.length > 10, `parsed only ${JSON.stringify(names)} from markup.qmd's table`)
  // An attribute is written as data-x-y="..." in HTML or dataset.xY in an ojs cell.
  const dataset = name => 'dataset.' + name.replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  const missing = names.filter(name => !mentions(starter, name) && !(name.startsWith('data-') && starter.includes(dataset(name))))
  assert.deepEqual(uniqueSorted(missing), [])
})

test('starter/_quarto.yml turns on every key in site.qmd\'s "All the keys", and uses the theme', () => {
  const site = read('docs/site.qmd')
  const block = site.slice(site.indexOf('## All the keys'))
  const yaml = block.slice(block.indexOf('```yaml'), block.indexOf('```', block.indexOf('```yaml') + 7))
  const keys = matchesOf(yaml, /^ {2}([a-z-]+):/gm)
  assert.ok(keys.length > 3, `parsed only ${JSON.stringify(keys)} from site.qmd's key block`)
  // A key may be on for one page only, through that page's mathviz-page:
  // (category-cloud on the listing; quiet-apps, which would otherwise
  // replace the boxed look on every page).
  const pageOptions = starterFiles.slice(1)
    .map(name => (read(`starter/${name}`).match(/^---\n[\s\S]*?\nmathviz-page:\n((?: {2}.*\n)+)/) || [])[1] || '')
    .join('')
  const missing = keys.filter(key => !new RegExp(`^\\s*${key}:`, 'm').test(config + pageOptions))
  assert.deepEqual(missing, [])
  for (const file of ['mathviz-light.scss', 'mathviz-dark.scss']) {
    assert.ok(config.includes(`theme/${file}`), `starter/_quarto.yml doesn't use theme/${file}`)
  }
})
