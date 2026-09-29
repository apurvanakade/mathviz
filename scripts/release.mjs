/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Prepares a release: everything that names the version, in one step.
//
//   node scripts/release.mjs 0.1.12
//
// 1. The three version files -- package.json, _extension.yml and the Lua
//    filter's VERSION. scripts/build.mjs refuses to build unless they agree,
//    and the Lua VERSION names the site_libs/quarto-contrib/mathviz-<version>/
//    folder, which is what busts a returning reader's cache.
// 2. CHANGELOG.md: the [Unreleased] entries move under a dated heading for
//    the new version, and the compare links at the bottom follow.
// 3. The `apurvanakade/mathviz@vX.Y.Z` install snippets in README.md, docs/
//    and starter/.
//
// It does not build, commit or tag. .github/workflows/release.yml runs it,
// rebuilds, tests and opens a pull request; tag-release.yml tags once that
// merges. Fine to run by hand too.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const version = process.argv[2]
if (!/^\d+\.\d+\.\d+$/.test(String(version))) {
  console.error(`Usage: node scripts/release.mjs <major.minor.patch>  (got ${JSON.stringify(version)})`)
  process.exit(1)
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8')
const write = (rel, text) => fs.writeFileSync(path.join(repoRoot, rel), text)

function fail(message) {
  console.error(message)
  process.exit(1)
}

// ---- 1. version files ----

const versionFiles = [
  ['package.json', /^(\s*"version":\s*")([^"]+)(")/m],
  ['_extensions/mathviz/_extension.yml', /^(version:\s*)(\S+)()$/m],
  ['_extensions/mathviz/mathviz.lua', /^(local VERSION\s*=\s*")([^"]+)(")/m]
]

const previous = read('package.json').match(versionFiles[0][1])[2]

// Strictly newer only: an older version would duplicate a CHANGELOG heading,
// and tag-release.yml would quietly accept its existing tag.
function isNewer(next, current) {
  const a = next.split('.')
  const b = current.split('.')
  for (let i = 0; i < 3; i++) {
    if (Number(a[i]) !== Number(b[i])) return Number(a[i]) > Number(b[i])
  }
  return false
}
if (!isNewer(version, previous)) fail(`${version} is not newer than the current ${previous}.`)

// Every check runs before anything is written, so a refusal leaves the tree
// untouched.
for (const [rel, pattern] of versionFiles) {
  if (!pattern.test(read(rel))) fail(`${rel}: no version line matching ${pattern}`)
}

// ---- 2. CHANGELOG.md ----

let changelog = read('CHANGELOG.md')
const unreleased = '## [Unreleased]\n'
const start = changelog.indexOf(unreleased)
if (start < 0) fail('CHANGELOG.md: no "## [Unreleased]" heading')
const bodyStart = start + unreleased.length
const nextHeading = changelog.indexOf('\n## [', bodyStart)
const body = changelog.slice(bodyStart, nextHeading).trim()
if (body === '') fail('CHANGELOG.md: [Unreleased] is empty -- nothing to release.')

const today = new Date().toISOString().slice(0, 10)
changelog = changelog.slice(0, bodyStart) + `\n## [${version}] - ${today}\n\n` + body + '\n' + changelog.slice(nextHeading)

const unreleasedLink = /^\[Unreleased\]: (\S+)\/compare\/v[^.]+\.[^.]+\.[^.]+\.\.\.HEAD$/m
const linkMatch = changelog.match(unreleasedLink)
if (!linkMatch) fail('CHANGELOG.md: no [Unreleased] compare link')
const base = linkMatch[1]
changelog = changelog.replace(unreleasedLink,
  `[Unreleased]: ${base}/compare/v${version}...HEAD\n[${version}]: ${base}/compare/v${previous}...v${version}`)

for (const [rel, pattern] of versionFiles) {
  write(rel, read(rel).replace(pattern, `$1${version}$3`))
  console.log(`${rel}: ${previous} -> ${version}`)
}
write('CHANGELOG.md', changelog)
console.log(`CHANGELOG.md: [Unreleased] -> [${version}] - ${today}`)

// ---- 3. install snippets ----

function markdownFiles(dir) {
  const out = []
  for (const entry of fs.readdirSync(path.join(repoRoot, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== '_extensions' && !entry.name.startsWith('.') && !entry.name.startsWith('_site')) {
        out.push(...markdownFiles(rel))
      }
    } else if (entry.name.endsWith('.qmd') || entry.name.endsWith('.md')) {
      out.push(rel)
    }
  }
  return out
}

const snippet = /apurvanakade\/mathviz@v\d+\.\d+\.\d+/g
const candidates = ['README.md', ...markdownFiles('docs'), ...markdownFiles('starter')]
for (const rel of candidates) {
  const before = read(rel)
  const after = before.replace(snippet, `apurvanakade/mathviz@v${version}`)
  if (after !== before) {
    write(rel, after)
    console.log(`${rel}: install snippets -> v${version}`)
  }
}
