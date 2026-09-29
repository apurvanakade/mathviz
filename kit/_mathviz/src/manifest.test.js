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
import { js, css } from './manifest.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))

function walk(dir, ext) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...walk(full, ext))
    } else if (entry.name.endsWith(ext) && !entry.name.endsWith('.test.js')) {
      out.push(full)
    }
  }
  return out
}

function relativeTo(base, files) {
  const out = []
  for (const file of files) out.push(path.relative(base, file))
  return out.sort()
}

test('every src/js and src/css file is in the manifest exactly once', () => {
  assert.deepEqual([...js].sort(), relativeTo(path.join(here, 'js'), walk(path.join(here, 'js'), '.js')))
  assert.deepEqual([...css].sort(), relativeTo(path.join(here, 'css'), walk(path.join(here, 'css'), '.css')))
  assert.equal(new Set(js).size, js.length)
  assert.equal(new Set(css).size, css.length)
})

// Add an assertion here for each load-order dependency, e.g.
//   assert.ok(js.indexOf('mcmc/autocorrelation.js') < js.indexOf('mcmc/effective-sample-size.js'))
