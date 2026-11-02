/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Browser layout test: renders the fixture site in fixtures/layout/ through this
// checkout's extension and asserts, in a real Chromium, what the unit tests'
// stubbed DOM cannot see -- the page renders wrong without anything throwing:
//
//   - slider tracks squeezed by a cascade fight (Observable Inputs injects its
//     `.oi-<hash>` rules at runtime, after mathviz.css, and wins every tie;
//     tracks once measured 0px), at desktop and phone width;
//   - the playback popover clipped by an ancestor's overflow (it is visible
//     only because it is a top-layer [popover]);
//   - a slider below the chart it drives;
//   - a page that scrolls sideways on a phone;
//   - ?embed=1 / ?embed=<id> showing anything but the chosen .vm-app, or
//     showing it narrower than the content column;
//   - the Share dialog's links and <iframe> snippet.
//   - the sidebar search box not narrowing the menu;
//   - grid listing cards wider than --vm-card-width, more than one to a
//     row on a phone, or with a title pushed off the card's left edge (the
//     auto margins of a prose-width rule once centred every short one);
//   - the category cloud not moved above the grid, or without "All" first;
//   - a page that sets an option with mathviz-page: losing the options
//     _quarto.yml sets (the referrer meta, fonts and sidebar search).
//
// The checks came from Visual Math Lab's crawl, which ran them on every one
// of its pages and was cut back because a heavy page on a busy runner made
// them flaky. Here they run on small fixture pages, one at a time.
//
// Usage: npm run test:layout              (render, then check)
//        node scripts/check-layout.mjs --no-render   (reuse fixtures/layout/_site)

import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const siteDir = path.join(repoRoot, 'fixtures', 'layout')
const outDir = path.join(siteDir, '_site')
// Ceilings, not delays: a settled page costs one poll. Generous because the
// first load on a cold CI runner fetches Plotly, math.js and MathJax from
// their CDNs; every later load is served from the shared context's cache.
const navigationTimeoutMs = 60000
const settleTimeoutMs = 30000
const pages = ['index.html', 'sliders.html', 'multi.html']
const listingPages = ['cards.html']

// The fixture site is its own Quarto project, which only finds an extension
// in its own _extensions/ -- so copy this checkout's in (gitignored), the
// way `npm run build` mirrors it into starter/.
function render() {
  const target = path.join(siteDir, '_extensions', 'mathviz')
  fs.rmSync(target, { recursive: true, force: true })
  fs.cpSync(path.join(repoRoot, '_extensions', 'mathviz'), target, { recursive: true })
  const result = spawnSync('quarto', ['render', siteDir], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error('quarto render fixtures/layout failed')
}

// Module scripts don't load from file://, so serve _site/ over HTTP.
const contentTypes = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png'
}

function serve() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let file = path.join(outDir, urlPath)
    if (!file.startsWith(outDir)) { res.writeHead(403); res.end(); return }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html')
    if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return }
    res.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

// The functions below run in the page (page.evaluate), so they can't use
// anything from this module.

function sliderTrackProblems() {
  // Both thresholds are derived from a measurement of all 24 sliders on
  // Visual Math Lab at the desktop pass's viewport, not picked by feel:
  //   narrowest legitimate track: 147px, at 49% of its form
  //     (apps/positive-predictive-value, three sliders sharing a panel grid row)
  //   widest: 706px at 80% (the root-finding step sliders)
  //   the regressions being guarded against measured 0px, and 35px in a
  //     ~250px form -- i.e. 14% of it
  // So each floor sits roughly a third below the narrowest real value and
  // far above both failures. Re-measure rather than lower a threshold if a
  // legitimately narrower control is ever added. At a phone's 390px the
  // narrowest is 157px at 50% (the Sperner pages' subdivision slider, whose
  // label takes a line of its own in a bar that narrow), inside both floors.
  //
  // The ratio matters as much as the pixel count: it is what catches a
  // track squeezed by a label or readout that took the row, and unlike an
  // absolute width it does not move when the viewport does.
  const MIN_TRACK_PX = 100
  const MIN_TRACK_RATIO = 0.35
  const bad = []
  for (const input of document.querySelectorAll('.ojs-panel input[type="range"], .ojs-chart-controls input[type="range"]')) {
    const form = input.closest('form') || input
    // Skip anything not actually laid out: a collapsed callout, or a panel
    // hidden at this viewport. offsetParent is null for display:none
    // subtrees, which is exactly those cases.
    if (form.offsetParent === null) continue
    if (form.getBoundingClientRect().width === 0) continue
    const formWidth = form.getBoundingClientRect().width
    const width = Math.round(input.getBoundingClientRect().width)
    const ratio = width / formWidth
    const label = (form.querySelector('label')?.textContent || '?').trim()
    if (width < MIN_TRACK_PX) {
      bad.push(`slider "${label}" track is ${width}px wide (expected >= ${MIN_TRACK_PX}px)`)
    } else if (ratio < MIN_TRACK_RATIO) {
      bad.push(`slider "${label}" track is only ${Math.round(ratio * 100)}% of its control ` +
               `(${width}px of ${Math.round(formWidth)}px, expected >= ${Math.round(MIN_TRACK_RATIO * 100)}%)`)
    }
  }
  return bad
}
function slidersBelowChart() {
  const bad = []
  for (const block of document.querySelectorAll('.ojs-chart-block')) {
    const chart = block.querySelector('.js-plotly-plot')
    if (!chart || chart.offsetParent === null) continue
    const chartTop = chart.getBoundingClientRect().top
    for (const input of block.querySelectorAll('input[type="range"]')) {
      if (input.offsetParent === null) continue
      if (input.getBoundingClientRect().top >= chartTop) {
        const label = (input.closest('form')?.querySelector('label')?.textContent || '?').trim()
        bad.push(`slider "${label}" sits below the chart it drives`)
      }
    }
  }
  return bad
}
function embedProblems(expectedId) {
  const main = document.getElementById('quarto-document-content')
  if (!main) return ['no #quarto-document-content']
  const problems = []
  const apps = main.querySelectorAll('.vm-app')
  if (apps.length === 0) problems.push('no .vm-app block on the page (wrap the app in <div class="vm-app">)')
  let active = null
  for (const app of apps) {
    if (app.classList.contains('vm-app-active')) active = app
  }
  if (active === null) {
    problems.push('no .vm-app-active block')
    return problems
  }
  if (expectedId !== null && active.id !== expectedId) {
    problems.push(`active .vm-app is #${active.id || '(no id)'}, expected #${expectedId}`)
  }
  const activeBox = active.getBoundingClientRect()
  if (activeBox.height === 0) problems.push('the active .vm-app has zero height')
  // Nothing inside the content column (a wrapper with a max-width, say)
  // may hold the app narrower than the column itself. A Plotly chart
  // is fitted to its box, so this shows.
  const columnWidth = main.getBoundingClientRect().width
  if (activeBox.width < 0.9 * columnWidth) {
    problems.push(`the active .vm-app is ${Math.round(activeBox.width)}px wide in a ${Math.round(columnWidth)}px content column`)
  }
  for (const el of main.querySelectorAll('*')) {
    if (el === active || active.contains(el) || el.contains(active)) continue
    if (el.getBoundingClientRect().height > 0) {
      const label = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ').join('.') : '')
      problems.push(`non-app content visible in embed mode: ${label}`)
    }
  }
  return problems
}
// The grid listing on cards.html. `phone` adds the one-column check. The
// card's own box is measured, not its hover panel (a ::before), which
// overhangs it on purpose.
function cardProblems(phone) {
  const problems = []
  const cards = Array.from(document.querySelectorAll('.quarto-grid-item')).filter((card) => card.offsetParent !== null)
  if (cards.length < 3) return [`expected the fixture's 4 cards, found ${cards.length} visible`]
  const cap = parseFloat(getComputedStyle(document.body).getPropertyValue('--vm-card-width')) *
    parseFloat(getComputedStyle(document.documentElement).fontSize)
  if (!(cap > 0)) problems.push('--vm-card-width is not set (theme not loaded?)')
  for (const card of cards) {
    const box = card.getBoundingClientRect()
    const title = card.querySelector('.card-title')
    const name = (title?.textContent || '?').trim()
    if (!phone && cap > 0 && box.width > cap + 1) {
      problems.push(`card "${name}" is ${Math.round(box.width)}px wide, past --vm-card-width (${Math.round(cap)}px)`)
    }
    if (title) {
      const offset = title.getBoundingClientRect().left - box.left
      if (Math.abs(offset) > 1) problems.push(`card "${name}"'s title starts ${Math.round(offset)}px from the card's left edge`)
    }
  }
  if (phone) {
    const lefts = new Set(cards.map((card) => Math.round(card.getBoundingClientRect().left)))
    if (lefts.size !== 1) problems.push(`cards sit in ${lefts.size} columns on a phone, expected 1`)
  }
  const cloud = document.querySelector('.vm-category-cloud')
  const grid = document.querySelector('.quarto-listing-container-grid')
  if (!cloud) {
    problems.push('no .vm-category-cloud (category-cloud.js did not move the cloud)')
  } else {
    if (!grid || !(cloud.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING)) problems.push('the category cloud is not above the grid')
    const first = cloud.querySelector('.category')
    if (!first || !first.classList.contains('category--all') || first.textContent.trim() !== 'All') {
      problems.push(`the cloud's first entry is ${JSON.stringify(first?.textContent.trim() ?? null)}, expected "All"`)
    }
    if (document.getElementById('quarto-margin-sidebar')) problems.push('the emptied margin sidebar is still on the page')
  }
  return problems
}

// cards.qmd turns the cloud on with mathviz-page:; the options _quarto.yml
// sets must reach it too. A page-level mathviz: would have replaced them,
// and nothing would throw -- the page would just lack them.
function projectOptionProblems() {
  const problems = []
  if (document.querySelector('meta[name="referrer"]')?.content !== 'same-origin') problems.push('no <meta name="referrer" content="same-origin"> (referrer)')
  if (!document.querySelector('link[href*="mathviz-fonts-"]')) problems.push('no mathviz-fonts stylesheet (fonts)')
  if (!document.querySelector('.vm-sidebar-search')) problems.push('no .vm-sidebar-search (sidebar-search)')
  return problems
}

// Clicking a category filters the grid, and "All" brings every card back;
// so do Enter and Space on a focused entry.
async function cloudFilterProblems(page) {
  const shown = () => page.evaluate(() => Array.from(document.querySelectorAll('.quarto-grid-item'))
    .filter((card) => card.offsetParent !== null).length)
  const all = await shown()
  const problems = []
  await page.locator('.vm-category-cloud .category', { hasText: 'Probability' }).click({ timeout: 2000 }).catch(() => {})
  await page.waitForTimeout(150)
  if ((await shown()) !== 1) problems.push(`"Probability" left ${await shown()} cards, expected 1`)
  await page.locator('.vm-category-cloud .category--all').click({ timeout: 2000 }).catch(() => {})
  await page.waitForTimeout(150)
  if ((await shown()) !== all) problems.push(`"All" left ${await shown()} of ${all} cards`)
  await page.locator('.vm-category-cloud .category', { hasText: 'Probability' }).focus().catch(() => {})
  await page.keyboard.press('Enter')
  await page.waitForTimeout(150)
  if ((await shown()) !== 1) problems.push(`Enter on a focused "Probability" left ${await shown()} cards, expected 1`)
  await page.locator('.vm-category-cloud .category--all').focus().catch(() => {})
  await page.keyboard.press(' ')
  await page.waitForTimeout(150)
  if ((await shown()) !== all) problems.push(`Space on a focused "All" left ${await shown()} of ${all} cards`)
  const allActive = await page.evaluate(() => document.querySelector('.vm-category-cloud .category--all')?.classList.contains('active'))
  if (!allActive) problems.push('"All" is not .active after clearing the filter')
  return problems
}

function isSettled(isApp) {
  for (const el of document.querySelectorAll('.observablehq--running')) {
    const cell = el.closest('[data-nodetype]')
    if (cell && cell.dataset.nodetype === 'declaration') continue
    return false
  }
  if (isApp) {
    const app = document.querySelector('.vm-app')
    // A figure, not any <svg>: every slider's play button carries an icon
    // one, which exists long before (or without) the chart.
    if (app && !app.querySelector('.js-plotly-plot, svg:not(button svg)')) return false
  }
  // Untypeset math is raw TeX, which a nowrap span can stretch far past a
  // phone's width (a 789px line once, on Visual Math Lab), so a layout check
  // run before MathJax finishes measures a page no reader sees.
  for (const el of document.querySelectorAll('span.math')) {
    if (!el.querySelector('mjx-container')) return false
  }
  return true
}

// Returns the problems found while loading: a page that never settles, or a
// failed OJS cell, would otherwise pass every check below by having nothing
// to measure.
//
// Waits for `load`, not `networkidle`: the latter needs 500ms with no request
// in flight, which a page still pulling MathJax's lazy pieces from a CDN on a
// busy runner may not reach -- Visual Math Lab's crawl timed out that way.
// isSettled is the real readiness test, and it doesn't care about the network.
async function load(page, url) {
  const problems = []
  try {
    await page.goto(url, { waitUntil: 'load', timeout: navigationTimeoutMs })
  } catch (err) {
    // Report it against this page rather than abort the whole run, and still
    // run the settle wait and checks below: they say whether anything came.
    // Not every failure is a timeout (a refused connection, an aborted
    // navigation), so name the timeout only when it was one.
    if (err.name === 'TimeoutError') {
      problems.push(`page did not load within ${navigationTimeoutMs}ms: ${err.message.split('\n')[0]}`)
    } else {
      problems.push(`page.goto failed: ${err.message.split('\n')[0]}`)
    }
  }
  try {
    await page.waitForFunction(isSettled, true, { timeout: settleTimeoutMs, polling: 50 })
  } catch {
    problems.push(`page did not settle within ${settleTimeoutMs}ms (cells running, no chart, or untypeset math)`)
  }
  const failedCells = await page.evaluate(() => document.querySelectorAll('.observablehq--error').length)
  if (failedCells > 0) problems.push(`${failedCells} OJS cell(s) failed (.observablehq--error)`)
  return problems
}

// Opens each playback popover and asserts it paints where it says it is --
// getBoundingClientRect alone would not notice, since a clipped element
// still reports a full-size box.
async function popoverProblems(page) {
  const problems = []
  const carets = page.locator('.vm-play-more')
  const caretCount = await carets.count()
  if (caretCount === 0) problems.push('no playback button on any slider')
  for (let i = 0; i < caretCount; i++) {
    const caret = carets.nth(i)
    if (!(await caret.isVisible())) continue
    await caret.click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(150)
    const problem = await page.evaluate(() => {
      const panel = document.querySelector('.vm-play-panel:popover-open')
      if (!panel) return 'playback popover did not open'
      const r = panel.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) return 'playback popover opened with a zero-size box'
      // The panel's top-left region is the part that leaves an ancestor's box
      // first, so it is where clipping shows up.
      const hit = document.elementFromPoint(r.left + Math.min(20, r.width / 2), r.top + 6)
      if (hit && (hit === panel || panel.contains(hit))) return null
      let what = 'nothing'
      if (hit) what = hit.id || (hit.className || '').toString().trim().split(/\s+/)[0] || hit.tagName
      return `playback popover is not visible at its own coordinates (covered/clipped by: ${what})`
    })
    if (problem) problems.push(problem)
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(100)
  }
  return problems
}

async function shareProblems(page) {
  const button = page.locator('.vm-share-button').first()
  if ((await button.count()) === 0) return ['no Share button on the .vm-app']
  await button.click({ timeout: 2000 }).catch(() => {})
  await page.waitForTimeout(150)
  const problem = await page.evaluate(() => {
    const dialog = document.querySelector('dialog.vm-share-dialog')
    if (!dialog || !dialog.open) return 'share button did not open the dialog'
    const labelledBy = dialog.getAttribute('aria-labelledby')
    const label = labelledBy ? document.getElementById(labelledBy) : null
    if (!label || !label.textContent.trim()) return 'share dialog has no accessible name (aria-labelledby)'
    const code = dialog.querySelector('.vm-share-code')
    if (!code) return 'share dialog has no snippet textarea'
    const snippet = code.value
    if (!snippet.includes('<iframe')) return `share snippet is missing <iframe: ${snippet}`
    if (!snippet.includes('embed=')) return `share snippet is missing embed=: ${snippet}`
    if (!snippet.includes('https://example.com')) return `share snippet does not point at share.site-url: ${snippet}`
    const withInputs = dialog.querySelector('.vm-share-link-inputs')
    const plain = dialog.querySelector('.vm-share-link-plain')
    if (!withInputs || !plain) return 'share dialog is missing a page link'
    for (const link of [withInputs, plain]) {
      if (!link.href.startsWith('https://example.com/')) return `share link does not point at share.site-url: ${link.href}`
      if (link.href.includes('embed=')) return `share link carries embed=: ${link.href}`
    }
    if (plain.href.includes('?')) return `share link without inputs still has a query string: ${plain.href}`
    return null
  })
  await page.evaluate(() => {
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close()
  })
  if (problem) return [problem]
  return []
}

// The sidebar search box narrows the menu as the reader types. Driven
// through events rather than Playwright's fill(), so it works the same
// whether or not a site keeps the sidebar off-canvas.
function sidebarSearchProblems() {
  const input = document.querySelector('#quarto-sidebar .vm-sidebar-search input')
  if (!input) return ['no sidebar search box (.vm-sidebar-search)']
  const visible = () => Array.from(document.querySelectorAll('#quarto-sidebar li.sidebar-item'))
    .filter((li) => getComputedStyle(li).display !== 'none')
    .map((li) => li.querySelector('.menu-text')?.textContent.trim())
  const type = (text) => {
    input.value = text
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }
  const empty = document.querySelector('#quarto-sidebar .vm-sidebar-search-empty')
  const shows = (el) => el && getComputedStyle(el).display !== 'none'
  const problems = []
  const all = visible().length
  if (all < 3) problems.push(`expected the fixture's 3 sidebar entries, found ${all}`)
  type('several')
  const hits = visible()
  if (hits.length !== 1 || hits[0] !== 'Several sliders') problems.push(`"several" left ${JSON.stringify(hits)}, expected ["Several sliders"]`)
  if (shows(empty)) problems.push('"No matching pages" shows while there is a match')
  type('zzzz')
  if (visible().length !== 0) problems.push('"zzzz" left entries visible')
  if (!shows(empty)) problems.push('"No matching pages" does not show for a query with no match')
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  if (input.value !== '') problems.push('Escape did not clear the search box')
  if (visible().length !== all) problems.push(`clearing the search left ${visible().length} of ${all} entries visible`)
  return problems
}

async function checkPage(context, base, relPath) {
  const errors = []
  const watch = (page, prefix) => {
    page.on('pageerror', err => errors.push(`${prefix}pageerror: ${err.message}`))
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`${prefix}console.error: ${msg.text()}`)
    })
  }

  // Desktop, at Playwright's default 1280x720.
  const page = await context.newPage()
  watch(page, '')
  for (const problem of await load(page, base + relPath)) errors.push(`desktop: ${problem}`)
  for (const problem of await page.evaluate(sliderTrackProblems)) errors.push(`desktop: ${problem}`)
  for (const problem of await page.evaluate(slidersBelowChart)) errors.push(`desktop: ${problem}`)
  for (const problem of await popoverProblems(page)) errors.push(`desktop: ${problem}`)
  for (const problem of await shareProblems(page)) errors.push(`share: ${problem}`)
  for (const problem of await page.evaluate(sidebarSearchProblems)) errors.push(`sidebar search: ${problem}`)
  await page.close()

  // A phone (390x844, an iPhone 14).
  const phone = await context.newPage()
  await phone.setViewportSize({ width: 390, height: 844 })
  watch(phone, 'phone ')
  for (const problem of await load(phone, base + relPath)) errors.push(`phone: ${problem}`)
  for (const problem of await phone.evaluate(sliderTrackProblems)) errors.push(`phone: ${problem}`)
  const scrollWidth = await phone.evaluate(() => document.documentElement.scrollWidth)
  if (scrollWidth > 390) errors.push(`phone: the page scrolls sideways (${scrollWidth}px wide in a 390px window)`)
  await phone.close()

  // Embed mode: ?embed=1, then ?embed=<id> for every id-tagged block.
  const embed = await context.newPage()
  watch(embed, 'embed ')
  for (const problem of await load(embed, `${base}${relPath}?embed=1`)) errors.push(`embed=1: ${problem}`)
  if (!(await embed.evaluate(() => document.documentElement.classList.contains('vm-embed')))) {
    errors.push('embed: html.vm-embed not set')
  }
  // embed=1 shows the page's first .vm-app; when that has an id, insist on it.
  const firstId = await embed.evaluate(() => {
    const first = document.querySelector('.vm-app')
    if (first && first.id) return first.id
    return null
  })
  for (const problem of await embed.evaluate(embedProblems, firstId)) errors.push(`embed=1: ${problem}`)
  const ids = await embed.evaluate(() => {
    const found = []
    for (const app of document.querySelectorAll('#quarto-document-content .vm-app[id]')) found.push(app.id)
    return found
  })
  for (const id of ids) {
    for (const problem of await load(embed, `${base}${relPath}?embed=${encodeURIComponent(id)}`)) errors.push(`embed=${id}: ${problem}`)
    for (const problem of await embed.evaluate(embedProblems, id)) errors.push(`embed=${id}: ${problem}`)
  }
  await embed.close()
  return errors
}

// cards.html is a listing, not an app page: no sliders, no .vm-app, so only
// the card, cloud and project-option checks and the phone's sideways scroll
// apply.
async function checkCardsPage(context, base, relPath) {
  const errors = []
  const watch = (page, prefix) => {
    page.on('pageerror', err => errors.push(`${prefix}pageerror: ${err.message}`))
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`${prefix}console.error: ${msg.text()}`)
    })
  }
  const page = await context.newPage()
  watch(page, '')
  for (const problem of await load(page, base + relPath)) errors.push(`desktop: ${problem}`)
  for (const problem of await page.evaluate(cardProblems, false)) errors.push(`desktop: ${problem}`)
  for (const problem of await page.evaluate(projectOptionProblems)) errors.push(`desktop: ${problem}`)
  for (const problem of await cloudFilterProblems(page)) errors.push(`desktop: ${problem}`)
  await page.close()

  const phone = await context.newPage()
  await phone.setViewportSize({ width: 390, height: 844 })
  watch(phone, 'phone ')
  for (const problem of await load(phone, base + relPath)) errors.push(`phone: ${problem}`)
  for (const problem of await phone.evaluate(cardProblems, true)) errors.push(`phone: ${problem}`)
  // The hover panel overhangs a card by $vm-card-lift-pad; hovered, it must
  // still fit the window.
  await phone.locator('.quarto-grid-item').first().hover({ timeout: 2000 }).catch(() => {})
  const scrollWidth = await phone.evaluate(() => document.documentElement.scrollWidth)
  if (scrollWidth > 390) errors.push(`phone: the page scrolls sideways (${scrollWidth}px wide in a 390px window)`)
  await phone.close()
  return errors
}

async function main() {
  if (!process.argv.includes('--no-render')) render()
  const server = await serve()
  const base = `http://127.0.0.1:${server.address().port}/`
  const browser = await chromium.launch()
  // One context for every load, so its HTTP cache keeps the CDN scripts
  // (browser.newPage() would open a fresh, empty-cached context each time).
  // Storage is cleared before each navigation instead: the chrome remembers
  // state there (the draggable legend's offset, the playback speed), and every
  // load should see a first visit.
  const context = await browser.newContext()
  await context.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear() } catch (e) { /* storage unavailable */ }
  })
  let failed = false
  try {
    for (const relPath of [...pages, ...listingPages]) {
      const check = listingPages.includes(relPath) ? checkCardsPage : checkPage
      const errors = await check(context, base, relPath)
      if (errors.length === 0) {
        console.log(`OK    ${relPath}`)
      } else {
        failed = true
        console.log(`FAIL  ${relPath}`)
        for (const e of errors) console.log(`      ${e}`)
      }
    }
  } finally {
    await browser.close()
    server.close()
  }
  console.log(failed ? '\nLayout test failed.' : '\nAll layout checks passed.')
  process.exit(failed ? 1 : 0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
