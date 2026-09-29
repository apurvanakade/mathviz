/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Test-only helper, the counterpart of mathviz's scripts/load-vm.mjs: loads
// the installed mathviz bundle (so VM.sampling.seededRandom and friends
// exist, as they do on a page), then the ACTUAL src/js/**/*.js files listed
// in src/manifest.mjs, in that order, and returns the resulting VM. Tests
// import this so they exercise the real code, not a re-implementation.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { js as manifest } from '../src/manifest.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const repoRoot = path.resolve(__dirname, '..')
const mathvizBundle = path.resolve(repoRoot, '../_extensions/apurvanakade/mathviz/dist/mathviz.js')

export function loadVM() {
  // Same stubs as mathviz's own loader: its bundle patches Plotly and
  // registers document listeners at load time, outside any function, so
  // both need a minimal stand-in even though these tests never touch the
  // DOM. `node --test` runs each test file in its own process, so these
  // globals don't leak between files.
  globalThis.window = globalThis
  globalThis.document = globalThis.document ?? { addEventListener: () => {} }
  if (globalThis.Plotly === undefined) {
    globalThis.Plotly = {
      newPlot: () => {},
      react: () => {},
      Icons: { zoom_plus: {}, zoom_minus: {} }
    }
  }

  ;(0, eval)(fs.readFileSync(mathvizBundle, 'utf8'))
  for (const relPath of manifest) {
    const source = fs.readFileSync(path.join(repoRoot, 'src/js', relPath), 'utf8')
    ;(0, eval)(source)
  }
  return globalThis.VM
}
