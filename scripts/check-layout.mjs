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
//   - the category cloud not moved above the grid, or without "All" first,
//     not cleared by Back to "All", or left above the window after a
//     card's tag filters the grid;
//   - on a page whose only listing has a custom template, the cloud not
//     moved above that listing, or not filtering its rows;
//   - on a site with no project mathviz:, a page's mathviz-page: options
//     ignored (fixtures/page-options/);
//   - a page that sets an option with mathviz-page: losing the options
//     _quarto.yml sets (the referrer meta, fonts, sidebar rail and search);
//   - the sidebar rail not hiding the sidebar, not opening, pinning and
//     closing, not centring the body column at the grid: width (in a frame
//     too), squeezing a TOC, or drawing a rail in a frame -- or anything of
//     it reaching a page that turns it off (no-rail.qmd);
//   - a draggable point drawn away from the data point it stands for
//     (after a drag, a theme toggle or a resize), escaping its bounds,
//     losing its value on a theme toggle, showing a focus ring after a
//     mouse drag, or trapping a touch scroll that starts beside it.
//   - an Observable Plot chart without the SVG modebar, or with two; the
//     bar on the wrong host, not at the figure's corner, rebuilt by a
//     re-run, shown on a chart that opted out, a Plotly block or a color
//     legend; a bare Plot cell moved by it; fullscreen enlarging anything
//     but the host, or not letterboxing the figure.
//
// The checks came from Visual Math Lab's crawl, which ran them on every one
// of its pages and was cut back because a heavy page on a busy runner made
// them flaky. Here they run on small fixture pages, one at a time.
//
// Usage: npm run test:layout              (render, then check)
//        node scripts/check-layout.mjs --no-render   (reuse each fixture's _site)

import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// Two fixture sites: layout/ sets project mathviz: options, as Visual Math
// Lab does; page-options/ sets none, so its page's mathviz-page: options
// are the only ones.
const siteDir = path.join(repoRoot, 'fixtures', 'layout')
const pageOptionsDir = path.join(repoRoot, 'fixtures', 'page-options')
// Ceilings, not delays: a settled page costs one poll. Generous because the
// first load on a cold CI runner fetches Plotly, math.js and MathJax from
// their CDNs; every later load is served from the shared context's cache.
const navigationTimeoutMs = 60000
const settleTimeoutMs = 30000
const pages = ['index.html', 'sliders.html', 'multi.html']
const listingPages = ['cards.html']
const pageOptionsPages = ['posts.html']
const dragPages = ['drag.html']
// Prose pages for the sidebar rail: one with a TOC under it, one that turns
// it off with mathviz-page:.
const railPages = ['rail-toc.html', 'no-rail.html']
// Lecture-notes prose: inline math, theorems, an exercise, a callout.
const prosePages = ['prose.html']
// The SVG modebar in each situation it has to tell apart.
const modebarPages = ['modebar.html']

// The fixture site is its own Quarto project, which only finds an extension
// in its own _extensions/ -- so copy this checkout's in (gitignored), the
// way `npm run build` mirrors it into starter/.
function render(dir) {
  const target = path.join(dir, '_extensions', 'mathviz')
  fs.rmSync(target, { recursive: true, force: true })
  fs.cpSync(path.join(repoRoot, '_extensions', 'mathviz'), target, { recursive: true })
  const result = spawnSync('quarto', ['render', dir], { stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`quarto render ${path.relative(repoRoot, dir)} failed`)
}

// Module scripts don't load from file://, so serve _site/ over HTTP.
const contentTypes = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png'
}

function serve(outDir) {
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
  if (!document.getElementById('vm-sidebar-rail')) problems.push('no #vm-sidebar-rail (sidebar-rail)')
  return problems
}

// The sidebar rail at rest, on a page it drives: the class on <html>, the
// rail, the sidebar off-canvas, and the body column centred in the window
// at the width the fixture's grid: asks for (body-width 1000px less two
// 1.5em gutters), which reaches the stylesheet only through the custom
// properties the filter writes.
function railAtRestProblems(bodyWidth) {
  const problems = []
  const root = document.documentElement
  if (!root.classList.contains('vm-sidebar-rail')) problems.push('html.vm-sidebar-rail not set')
  const rail = document.getElementById('vm-sidebar-rail')
  if (!rail) return [...problems, 'no #vm-sidebar-rail']
  const sidebar = document.getElementById('quarto-sidebar')
  if (!sidebar) return [...problems, 'no #quarto-sidebar']
  const sb = sidebar.getBoundingClientRect()
  if (sb.right > 1) problems.push(`the closed sidebar is on screen (right edge at ${Math.round(sb.right)}px)`)
  const toggle = rail.querySelector('button[data-vm-toggle]').getBoundingClientRect()
  if (toggle.width < 20 || toggle.left < 0 || toggle.left > 20) problems.push(`the rail's toggle is not at the left edge (${Math.round(toggle.left)}px, ${Math.round(toggle.width)}px wide)`)
  const header = document.getElementById('quarto-header')
  if (header && toggle.top < header.getBoundingClientRect().bottom - 1) problems.push('the rail sits under the navbar')
  if (bodyWidth) {
    const em = parseFloat(getComputedStyle(document.querySelector('.page-columns')).fontSize)
    const expectWidth = Math.round(bodyWidth - 3 * em)
    const col = document.querySelector('#quarto-document-content').getBoundingClientRect()
    const width = Math.round(col.width)
    if (Math.abs(width - expectWidth) > 2) problems.push(`body column ${width}px wide, expected ${expectWidth}px from grid: body-width`)
    // Within half a gutter: the grid has one more 1.5em track right of the
    // column (the collapsed margin) than left of it.
    const offCentre = Math.round(col.left + col.width / 2 - root.clientWidth / 2)
    if (Math.abs(offCentre) > 14) problems.push(`body column ${offCentre}px off the window's centre`)
  }
  return problems
}

// A first visit from 992px up: the sidebar pinned and docked -- on screen
// at the left edge, the rail riding its right edge, and the body column
// clear of it (the grid gives up the panel's width rather than the panel
// covering the start of every line).
function railDockedProblems() {
  const problems = []
  const root = document.documentElement
  if (!root.classList.contains('vm-sidebar-pinned')) problems.push('a first visit is not pinned at desktop width')
  const sidebar = document.getElementById('quarto-sidebar')
  const rail = document.getElementById('vm-sidebar-rail')
  if (!sidebar || !rail) return [...problems, 'no #quarto-sidebar or #vm-sidebar-rail']
  const sb = sidebar.getBoundingClientRect()
  if (Math.abs(sb.left) > 1) problems.push(`the docked sidebar's left edge is at ${Math.round(sb.left)}px, not 0`)
  if (Math.abs(rail.getBoundingClientRect().left - sb.right) > 1) problems.push('the rail does not ride the docked sidebar\'s edge')
  if (rail.querySelector('[data-vm-pin]').getAttribute('aria-pressed') !== 'true') problems.push('aria-pressed not true on the pin of a docked sidebar')
  const col = document.querySelector('#quarto-document-content').getBoundingClientRect()
  const railRight = rail.getBoundingClientRect().right
  if (col.left < railRight - 1) problems.push(`the docked sidebar and rail (right edge ${Math.round(railRight)}px) cover the body column (left edge ${Math.round(col.left)}px)`)
  if (root.scrollWidth > root.clientWidth) problems.push(`the docked page scrolls sideways (${root.scrollWidth}px in ${root.clientWidth}px)`)
  return problems
}

// A first visit in a window wide enough for the column to sit clear of the
// docked sidebar where it is: docking doesn't move it. The column used to
// re-centre in the space beside the panel, half the panel's width right of
// where it sat with the sidebar closed, when nothing overlapped it.
async function railWideProblems(context, url) {
  const page = await context.newPage()
  await page.setViewportSize({ width: 1920, height: 1080 })
  const problems = await load(page, url)
  const left = () => page.evaluate(() => document.querySelector('#quarto-document-content').getBoundingClientRect().left)
  const docked = await left()
  for (const problem of await page.evaluate(railDockedProblems)) problems.push(problem)
  for (const problem of await railUndockProblems(page)) problems.push(problem)
  const undocked = await left()
  if (Math.abs(docked - undocked) > 1) problems.push(`docking moved the body column ${Math.round(docked - undocked)}px in a 1920px window, where it clears the sidebar where it is`)
  await page.close()
  return problems
}

// The hamburger on a docked sidebar closes and unpins it, giving the column
// back its full width.
async function railUndockProblems(page) {
  await page.locator('#vm-sidebar-rail button[data-vm-toggle]').click()
  await page.waitForTimeout(350)
  const problems = []
  if (await page.evaluate(() => document.documentElement.classList.contains('vm-sidebar-pinned'))) problems.push('the hamburger did not unpin a docked sidebar')
  return problems
}

// Opening, pinning and closing, from closed: the hamburger opens the panel
// with the rail riding its right edge, Escape closes it, the pin keeps it
// open through a click outside, and the hamburger closes and unpins it.
async function railInteractionProblems(page) {
  const problems = []
  const sidebarLeft = () => page.evaluate(() => Math.round(document.getElementById('quarto-sidebar').getBoundingClientRect().left))
  const isOpen = () => page.evaluate(() => document.documentElement.classList.contains('vm-sidebar-open'))
  const settle = () => page.waitForTimeout(350)
  const toggle = page.locator('#vm-sidebar-rail button[data-vm-toggle]')
  const pin = page.locator('#vm-sidebar-rail button[data-vm-pin]')
  for (const problem of await railUndockProblems(page)) problems.push(problem)
  await toggle.click()
  await settle()
  if (!(await isOpen())) problems.push('the hamburger did not open the sidebar')
  if (Math.abs(await sidebarLeft()) > 1) problems.push(`the open sidebar's left edge is at ${await sidebarLeft()}px, not 0`)
  const railLeft = await page.evaluate(() => Math.round(document.getElementById('vm-sidebar-rail').getBoundingClientRect().left))
  const sidebarRight = await page.evaluate(() => Math.round(document.getElementById('quarto-sidebar').getBoundingClientRect().right))
  if (Math.abs(railLeft - sidebarRight) > 1) problems.push(`the rail (${railLeft}px) does not ride the open sidebar's edge (${sidebarRight}px)`)
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') problems.push('aria-expanded not true on the open sidebar')
  await page.keyboard.press('Escape')
  await settle()
  if (await isOpen()) problems.push('Escape did not close the sidebar')
  await pin.click()
  await settle()
  if (!(await isOpen())) problems.push('the pin did not open the sidebar')
  if ((await pin.getAttribute('aria-pressed')) !== 'true') problems.push('aria-pressed not true on the pin')
  await page.mouse.click(900, 400)
  await settle()
  if (!(await isOpen())) problems.push('a click outside closed a pinned sidebar')
  await toggle.click()
  await settle()
  if (await isOpen()) problems.push('the hamburger did not close a pinned sidebar')
  if ((await pin.getAttribute('aria-pressed')) !== 'false') problems.push('closing with the hamburger did not unpin')
  await toggle.click()
  await settle()
  await page.mouse.click(900, 400)
  await settle()
  if (await isOpen()) problems.push('a click outside did not close the sidebar')
  return problems
}

// With the rail on, a page with a TOC gets Quarto's own right-hand margin
// back (the rail's grid collapses it otherwise, to a 26px-wide TOC).
function railTocProblems() {
  const toc = document.querySelector('#quarto-margin-sidebar')
  if (!toc) return ['no TOC (#quarto-margin-sidebar)']
  const width = Math.round(toc.getBoundingClientRect().width)
  return width < 100 ? [`the TOC is ${width}px wide`] : []
}

// A page with the rail switched off gets nothing of it: no script, no
// stylesheet, no grid variables, no class, no rail -- and Quarto's own
// sidebar, in its grid track and on screen.
function noRailProblems() {
  const problems = []
  if (document.querySelector('script[src*="sidebar-rail"], link[href*="sidebar-rail"]')) problems.push('a sidebar-rail script or stylesheet is on the page')
  if (Array.from(document.querySelectorAll('style')).some(s => s.textContent.includes('--vm-rail-'))) problems.push('the rail\'s grid variables are on the page')
  if (document.querySelector('meta[name="mathviz:sidebar-pin-key"]')) problems.push('the rail\'s pin-key meta is on the page')
  if (document.documentElement.classList.contains('vm-sidebar-rail')) problems.push('html.vm-sidebar-rail is set')
  if (document.getElementById('vm-sidebar-rail')) problems.push('#vm-sidebar-rail is on the page')
  const sidebar = document.getElementById('quarto-sidebar')
  if (!sidebar) return [...problems, 'no #quarto-sidebar']
  const style = getComputedStyle(sidebar)
  if (style.position === 'fixed') problems.push('the sidebar is position: fixed')
  if (style.transform !== 'none') problems.push(`the sidebar has a transform (${style.transform})`)
  const sb = sidebar.getBoundingClientRect()
  if (sb.left < 0 || sb.width < 150) problems.push(`Quarto's sidebar is not in its own track (left ${Math.round(sb.left)}px, ${Math.round(sb.width)}px wide)`)
  const col = document.querySelector('#quarto-document-content').getBoundingClientRect()
  if (col.left < sb.right - 1) problems.push('the body column overlaps the sidebar')
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
  // Back to the "#category=" All left: Quarto re-applies only a non-empty
  // category, so the cloud has to clear the filter itself. An in-page
  // anchor (a footnote, a heading) changes the hash too, and must not.
  await page.locator('.vm-category-cloud .category', { hasText: 'Probability' }).click({ timeout: 2000 }).catch(() => {})
  await page.waitForTimeout(150)
  await page.evaluate(() => { location.hash = '#fn1' })
  await page.waitForTimeout(150)
  if ((await shown()) !== 1) problems.push(`an in-page anchor (#fn1) under "Probability" left ${await shown()} cards, expected 1`)
  await page.goBack()
  await page.waitForTimeout(150)
  await page.locator('.vm-category-cloud .category--all').click({ timeout: 2000 }).catch(() => {})
  await page.waitForTimeout(150)
  await page.locator('.vm-category-cloud .category', { hasText: 'Probability' }).click({ timeout: 2000 }).catch(() => {})
  await page.waitForTimeout(150)
  await page.goBack()
  await page.waitForTimeout(150)
  if ((await shown()) !== all) problems.push(`Back from "Probability" to "All" left ${await shown()} of ${all} cards`)
  const activeAfterBack = await page.evaluate(() => Array.from(document.querySelectorAll('.vm-category-cloud .category.active'), (e) => e.textContent.trim()))
  if (activeAfterBack.join() !== 'All') problems.push(`after Back to "All" the active entries are ${JSON.stringify(activeAfterBack)}`)
  return problems
}

// A tag on the last card, scrolled to, filters the grid in place; the
// shorter page must not leave the reader past the cards, below the cloud.
async function cardTagScrollProblems(page) {
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await page.waitForTimeout(150)
  const tag = page.locator('.quarto-grid-item .listing-category', { hasText: 'Probability' })
  await tag.click({ timeout: 2000 }).catch(() => {})
  await page.waitForTimeout(300)
  const top = await page.evaluate(() => document.querySelector('.vm-category-cloud')?.getBoundingClientRect().top ?? null)
  if (top === null || top < -1) return [`after a card's "Probability" tag the cloud is ${top === null ? 'missing' : `${Math.round(-top)}px above the window`}`]
  return []
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

// Quarto zeroes the top margin of the first section's h2, assuming that
// section opens the page; with prose or an app above it, the heading sat on
// them with no room. The theme gives it the same margin as any later h2
// (read off a probe section appended to the page) unless the section is
// main's very first child.
function firstHeadingProblems() {
  const main = document.querySelector('main.content')
  const first = main && main.querySelector(':scope > section')
  const h2 = first && first.querySelector(':scope > h2:first-child')
  if (!h2) return []
  const prev = first.previousElementSibling
  if (!prev) return []
  const probe = document.createElement('section')
  probe.className = 'level2'
  probe.innerHTML = '<h2>probe</h2>'
  main.append(probe)
  const want = getComputedStyle(probe.firstChild).marginTop
  probe.remove()
  const got = getComputedStyle(h2).marginTop
  return got === want ? [] : [`the first section's h2 ("${h2.textContent.trim()}") has margin-top ${got} after other content; later h2s have ${want}`]
}

// The theme's reading rhythm on prose.html (theme.scss, "Block spacing" and
// "Inline math"). Every one of these rendered wrong without throwing:
// MathJax's inline boxes pushed their lines 28-35px apart where plain prose
// keeps 28px, theorems ran into the next paragraph, math drew at 122% of the
// text, and an h3 read as body text.
function proseRhythmProblems() {
  const problems = []
  const main = document.querySelector('main.content')
  const bodySize = parseFloat(getComputedStyle(main.querySelector(':scope > section > p')).fontSize)

  // Lines with inline math as far apart as the paragraph's line height.
  for (const p of main.querySelectorAll('section > p')) {
    if (!p.querySelector('mjx-container') || p.querySelector('mjx-container[display="true"]')) continue
    const lineHeight = parseFloat(getComputedStyle(p).lineHeight)
    const bottoms = []
    const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.parentElement.closest('mjx-container') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    })
    for (let n; (n = walker.nextNode());) {
      const range = document.createRange()
      range.selectNodeContents(n)
      for (const r of range.getClientRects()) if (r.height > 0) bottoms.push(Math.round(r.bottom))
    }
    const lines = [...new Set(bottoms)].sort((a, b) => a - b).filter((v, i, a) => i === 0 || v - a[i - 1] > 4)
    for (let i = 1; i < lines.length; i++) {
      const pitch = lines[i] - lines[i - 1]
      if (Math.abs(pitch - lineHeight) > 2.5) {
        problems.push(`a line of a paragraph with inline math is ${pitch}px below the one above; the line height is ${lineHeight.toFixed(1)}px ("${p.textContent.slice(0, 30)}")`)
        break
      }
    }
  }

  // Math at 110% of the text.
  const math = main.querySelector('p mjx-container')
  if (math) {
    const ratio = parseFloat(getComputedStyle(math).fontSize) / parseFloat(getComputedStyle(math.parentElement).fontSize)
    if (Math.abs(ratio - 1.1) > 0.02) problems.push(`inline math is ${(ratio * 100).toFixed(1)}% of the text, not 110%`)
  }

  // Headings a clear step above the text.
  const h3 = main.querySelector('h3')
  if (h3 && parseFloat(getComputedStyle(h3).fontSize) < bodySize * 1.2) {
    problems.push(`an h3 is ${getComputedStyle(h3).fontSize}, under 1.2x the ${bodySize}px text`)
  }

  // One gap around every set-apart block; none under a heading; a proof a
  // paragraph's distance under its theorem.
  const gap = (a, b) => Math.round(b.getBoundingClientRect().top - a.getBoundingClientRect().bottom)
  const paragraphGap = Math.round(parseFloat(getComputedStyle(main.querySelector('section > p')).marginBottom))
  const blockSel = '.callout, .theorem, .proof, .quarto-float, table.table'
  const gaps = new Set()
  for (const block of main.querySelectorAll(`section > :is(${blockSel})`)) {
    const name = block.className.split(' ').slice(0, 2).join('.') || block.tagName
    const prev = block.previousElementSibling
    const next = block.nextElementSibling
    if (prev && /^H\d$/.test(prev.tagName)) {
      const want = Math.round(parseFloat(getComputedStyle(prev).marginBottom))
      if (Math.abs(gap(prev, block) - want) > 1) problems.push(`${name} is ${gap(prev, block)}px under its heading, not the heading's ${want}px margin`)
    } else if (prev && block.matches('.proof') && prev.matches('.theorem')) {
      if (Math.abs(gap(prev, block) - bodySize) > 2) problems.push(`a proof is ${gap(prev, block)}px under its theorem, not 1rem`)
    } else if (prev) {
      gaps.add(gap(prev, block))
    }
    if (next && !(block.matches('.theorem') && next.matches('.proof'))) gaps.add(gap(block, next))
  }
  if (gaps.size > 1) problems.push(`the gaps around set-apart blocks differ: ${[...gaps].join(', ')}px`)
  const blockGap = [...gaps][0]
  if (blockGap !== undefined && paragraphGap !== undefined && blockGap <= paragraphGap) {
    problems.push(`set-apart blocks are ${blockGap}px from the prose, no more than paragraphs' ${paragraphGap}px`)
  }

  // Items of a prose list apart.
  const second = main.querySelector('section > ul > li + li')
  if (second && gap(second.previousElementSibling, second) < 3) problems.push('the items of a prose list touch')
  return problems
}

async function checkProsePage(context, base, relPath) {
  const errors = []
  for (const [label, width] of [['desktop', 1280], ['phone', 390]]) {
    const page = await context.newPage()
    await page.setViewportSize({ width, height: 844 })
    page.on('pageerror', err => errors.push(`${label} pageerror: ${err.message}`))
    for (const problem of await load(page, base + relPath)) errors.push(`${label}: ${problem}`)
    for (const problem of await page.evaluate(proseRhythmProblems)) errors.push(`${label}: ${problem}`)
    for (const problem of await page.evaluate(firstHeadingProblems)) errors.push(`${label}: ${problem}`)
    await page.close()
  }
  return errors
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
  // First, before anything below presses Escape (which closes and unpins
  // it): the first visit's docked sidebar, then undocked for the rest, laid
  // out as it was before pinned became the default.
  for (const problem of await page.evaluate(railDockedProblems)) errors.push(`sidebar rail: ${problem}`)
  for (const problem of await railUndockProblems(page)) errors.push(`sidebar rail: ${problem}`)
  for (const problem of await page.evaluate(sliderTrackProblems)) errors.push(`desktop: ${problem}`)
  for (const problem of await page.evaluate(slidersBelowChart)) errors.push(`desktop: ${problem}`)
  for (const problem of await popoverProblems(page)) errors.push(`desktop: ${problem}`)
  for (const problem of await shareProblems(page)) errors.push(`share: ${problem}`)
  for (const problem of await page.evaluate(sidebarSearchProblems)) errors.push(`sidebar search: ${problem}`)
  for (const problem of await page.evaluate(firstHeadingProblems)) errors.push(`desktop: ${problem}`)
  for (const problem of await page.evaluate(railAtRestProblems, 1000)) errors.push(`sidebar rail: ${problem}`)
  if (relPath === 'index.html') {
    await page.reload({ waitUntil: 'load' })
    for (const problem of await railInteractionProblems(page)) errors.push(`sidebar rail: ${problem}`)
    for (const problem of await railWideProblems(context, base + relPath)) errors.push(`wide: sidebar rail: ${problem}`)
  }
  await page.close()

  // A phone (390x844, an iPhone 14).
  const phone = await context.newPage()
  await phone.setViewportSize({ width: 390, height: 844 })
  watch(phone, 'phone ')
  for (const problem of await load(phone, base + relPath)) errors.push(`phone: ${problem}`)
  for (const problem of await phone.evaluate(sliderTrackProblems)) errors.push(`phone: ${problem}`)
  const scrollWidth = await phone.evaluate(() => document.documentElement.scrollWidth)
  if (scrollWidth > 390) errors.push(`phone: the page scrolls sideways (${scrollWidth}px wide in a 390px window)`)
  for (const problem of await phone.evaluate(railAtRestProblems, null)) errors.push(`phone sidebar rail: ${problem}`)
  await phone.close()

  // Embed mode: ?embed=1, then ?embed=<id> for every id-tagged block.
  const embed = await context.newPage()
  watch(embed, 'embed ')
  for (const problem of await load(embed, `${base}${relPath}?embed=1`)) errors.push(`embed=1: ${problem}`)
  if (!(await embed.evaluate(() => document.documentElement.classList.contains('vm-embed')))) {
    errors.push('embed: html.vm-embed not set')
  }
  if (await embed.evaluate(() => !!document.getElementById('vm-sidebar-rail'))) {
    errors.push('embed: the sidebar rail is on an embedded page')
  }
  // The frame hides the sidebar; its grid track must go with it, or the app
  // sits right of centre (the rail's grid applies in a frame for this).
  const offCentre = await embed.evaluate(() => {
    const app = document.querySelector('.vm-app-active')
    if (!app) return 0
    const r = app.getBoundingClientRect()
    return Math.round(r.left + r.width / 2 - document.documentElement.clientWidth / 2)
  })
  if (Math.abs(offCentre) > 14) errors.push(`embed: the app is ${offCentre}px off the frame's centre`)
  // embed=1 shows the page's first .vm-app; when that has an id, insist on it.
  const firstId = await embed.evaluate(() => {
    const first = document.querySelector('.vm-app')
    if (first && first.id) return first.id
    return null
  })
  for (const problem of await embed.evaluate(embedProblems, firstId)) errors.push(`embed=1: ${problem}`)
  // The frame is sized to the app (height: calc(100vh - 1rem)); anything
  // that adds to it, such as a margin from the theme, makes the frame scroll.
  const frameOverflow = await embed.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
  if (frameOverflow > 1) errors.push(`embed=1: the frame scrolls (${frameOverflow}px taller than the window)`)
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
  for (const problem of await cardTagScrollProblems(phone)) errors.push(`phone: ${problem}`)
  await phone.evaluate(() => window.scrollTo(0, 0))
  // The hover panel overhangs a card by $vm-card-lift-pad; hovered, it must
  // still fit the window.
  await phone.locator('.quarto-grid-item').first().hover({ timeout: 2000 }).catch(() => {})
  const scrollWidth = await phone.evaluate(() => document.documentElement.scrollWidth)
  if (scrollWidth > 390) errors.push(`phone: the page scrolls sideways (${scrollWidth}px wide in a 390px window)`)
  await phone.close()
  return errors
}

// The rail's prose pages: rail-toc.html (rail on, with a TOC) and
// no-rail.html (rail off), each at desktop width and on a phone.
async function checkRailPage(context, base, relPath) {
  const errors = []
  const watch = (page, prefix) => {
    page.on('pageerror', err => errors.push(`${prefix}pageerror: ${err.message}`))
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(`${prefix}console.error: ${msg.text()}`)
    })
  }
  const off = relPath === 'no-rail.html'
  const page = await context.newPage()
  watch(page, '')
  for (const problem of await load(page, base + relPath)) errors.push(`desktop: ${problem}`)
  if (off) {
    for (const problem of await page.evaluate(noRailProblems)) errors.push(`desktop: ${problem}`)
  } else {
    for (const problem of await page.evaluate(railDockedProblems)) errors.push(`desktop: ${problem}`)
    for (const problem of await page.evaluate(railTocProblems)) errors.push(`desktop docked: ${problem}`)
    for (const problem of await railUndockProblems(page)) errors.push(`desktop: ${problem}`)
    for (const problem of await page.evaluate(railAtRestProblems, null)) errors.push(`desktop: ${problem}`)
    for (const problem of await page.evaluate(railTocProblems)) errors.push(`desktop: ${problem}`)
  }
  await page.close()
  if (!off) for (const problem of await railWideProblems(context, base + relPath)) errors.push(`wide: ${problem}`)

  const phone = await context.newPage()
  await phone.setViewportSize({ width: 390, height: 844 })
  watch(phone, 'phone ')
  for (const problem of await load(phone, base + relPath)) errors.push(`phone: ${problem}`)
  if (!off) for (const problem of await phone.evaluate(railAtRestProblems, null)) errors.push(`phone: ${problem}`)
  const scrollWidth = await phone.evaluate(() => document.documentElement.scrollWidth)
  if (scrollWidth > 390) errors.push(`phone: the page scrolls sideways (${scrollWidth}px wide in a 390px window)`)
  await phone.close()
  return errors
}

// fixtures/page-options/posts.html's only listing has a custom template
// (plain rows, as a blog index has): with no grid, default or table listing
// to prefer, the cloud goes above it, "All" first, and filters its rows. Its
// site sets no project mathviz:, so the cloud is there only if the page's
// mathviz-page: was read.
async function checkPostsPage(context, base, relPath) {
  const errors = []
  const page = await context.newPage()
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`))
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
  })
  errors.push(...await load(page, base + relPath))
  errors.push(...await page.evaluate(() => {
    const problems = []
    const cloud = document.querySelector('.vm-category-cloud')
    const listing = document.querySelector('.quarto-listing-container-custom')
    if (!cloud) return ['no .vm-category-cloud (category-cloud.js did not move the cloud)']
    if (!listing || !(cloud.compareDocumentPosition(listing) & Node.DOCUMENT_POSITION_FOLLOWING)) problems.push('the category cloud is not above the custom listing')
    const first = cloud.querySelector('.category')
    if (!first || !first.classList.contains('category--all')) problems.push(`the cloud's first entry is ${JSON.stringify(first?.textContent.trim() ?? null)}, expected "All"`)
    if (document.getElementById('quarto-margin-sidebar')) problems.push('the emptied margin sidebar is still on the page')
    return problems
  }))
  const shown = () => page.evaluate(() => Array.from(document.querySelectorAll('.post-row'))
    .filter((row) => row.offsetParent !== null).length)
  const all = await shown()
  await page.locator('.vm-category-cloud .category', { hasText: 'Probability' }).click({ timeout: 2000 }).catch(() => {})
  await page.waitForTimeout(150)
  if ((await shown()) !== 1) errors.push(`"Probability" left ${await shown()} rows, expected 1`)
  await page.locator('.vm-category-cloud .category--all').click({ timeout: 2000 }).catch(() => {})
  await page.waitForTimeout(150)
  if ((await shown()) !== all) errors.push(`"All" left ${await shown()} of ${all} rows`)
  await page.close()
  return errors
}

// drag.html's first chart draws a small Plotly marker (the trace named
// "probe") at the draggable point's value, so the handle can be measured
// against where Plotly itself puts that data point.
function dropState() {
  const gd = document.querySelector('#drop .vm-drag-host')
  if (!gd) return null
  const handle = gd.querySelector('.vm-drag-point')
  const probe = gd.querySelector('.scatterlayer .trace:last-child .point')
  if (!handle || !probe) return null
  const center = (el) => {
    const r = el.getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }
  const active = document.activeElement
  return {
    value: gd.value,
    handle: center(handle),
    probe: center(probe),
    color: getComputedStyle(handle).color,
    readout: document.querySelector('#drop-readout')?.textContent ?? '',
    focused: active === handle,
    focusRing: active === handle && handle.matches(':focus-visible')
  }
}

function handleMarkupProblems() {
  const problems = []
  const handles = document.querySelectorAll('.vm-drag-point')
  if (handles.length !== 4) problems.push(`expected 4 draggable points (1 + 3), found ${handles.length}`)
  for (const handle of handles) {
    const name = handle.getAttribute('aria-label')
    if (handle.getAttribute('role') !== 'slider') problems.push(`point ${name} has no role="slider"`)
    if (!name) problems.push('a point has no aria-label')
    if (!handle.getAttribute('aria-valuetext')) problems.push(`point ${name} has no aria-valuetext`)
    if (handle.tabIndex !== 0) problems.push(`point ${name} is not in the tab order`)
    if (getComputedStyle(handle).touchAction !== 'none') problems.push(`point ${name} lets a touch scroll instead of drag`)
  }
  return problems
}

async function dragProblems(page) {
  const problems = []
  // Plotly redraws through the paint cell after each move; give it a moment.
  const settle = () => page.waitForTimeout(250)
  const aligned = async (when) => {
    const state = await page.evaluate(dropState)
    if (!state) {
      problems.push(`${when}: no point or probe marker on the first chart`)
      return null
    }
    const off = Math.hypot(state.handle.x - state.probe.x, state.handle.y - state.probe.y)
    if (off > 1) problems.push(`${when}: the point is drawn ${off.toFixed(1)}px from its data point`)
    return state
  }
  // The chart can still be settling into its box after load (autoResize,
  // late fonts): wait until the point stops moving before pressing on it.
  let last = null
  for (let i = 0; i < 40; i++) {
    const state = await page.evaluate(dropState)
    if (state && last && state.handle.x === last.handle.x && state.handle.y === last.handle.y) break
    last = state
    await page.waitForTimeout(100)
  }
  const start = await aligned('on load')
  if (!start) return problems

  await page.mouse.move(start.handle.x + 4, start.handle.y + 4)
  await page.mouse.down()
  await page.mouse.move(start.handle.x + 64, start.handle.y - 26, { steps: 5 })
  await page.mouse.up()
  await settle()
  const dragged = await aligned('after a drag')
  if (dragged) {
    if (dragged.value.x <= start.value.x || dragged.value.y <= start.value.y) {
      problems.push(`a drag right and up moved the point from ${JSON.stringify(start.value)} to ${JSON.stringify(dragged.value)}`)
    }
    if (dragged.readout === start.readout) problems.push('a drag did not reach the cell that reads the point (no input event)')
    if (!dragged.focused) problems.push('a dragged point did not take the keyboard focus')
    if (dragged.focusRing) problems.push('a mouse drag left a keyboard focus ring on the point')
  }

  if (!dragged) return problems

  // Off the chart, past its top-left corner: the point stops at its bounds.
  await page.mouse.move(dragged.handle.x, dragged.handle.y)
  await page.mouse.down()
  await page.mouse.move(2, 2, { steps: 5 })
  await page.mouse.up()
  await settle()
  const clamped = await aligned('after a drag off the chart')
  if (clamped && (clamped.value.x !== 0 || clamped.value.y !== 0.5)) {
    problems.push(`a drag off the chart's top-left left the point at ${JSON.stringify(clamped.value)}, not its bounds' corner {x: 0, y: 0.5}`)
  }

  await page.keyboard.press('ArrowRight')
  await settle()
  const keyed = await aligned('after an arrow key')
  if (keyed && Math.abs(keyed.value.x - 0.05) > 1e-9) problems.push(`ArrowRight moved x from 0 to ${keyed.value.x}, not by its step 0.05`)

  // jump: a click on the plot area brings the point there.
  const pad = await page.locator('#drop .vm-drag-pad').boundingBox()
  if (!pad) {
    problems.push('no jump pad on the first chart')
  } else {
    await page.mouse.click(pad.x + pad.width * 0.75, pad.y + pad.height * 0.75)
    await settle()
    const jumped = await aligned('after a click on the plot area')
    if (jumped) {
      const off = Math.hypot(jumped.handle.x - (pad.x + pad.width * 0.75), jumped.handle.y - (pad.y + pad.height * 0.75))
      if (off > 1) problems.push(`a click on the plot area left the point ${off.toFixed(1)}px from the click`)
    }
  }

  const before = await page.evaluate(dropState)
  await page.evaluate(() => window.quartoToggleColorScheme())
  await page.waitForTimeout(600)
  const toggled = await aligned('after a theme toggle')
  if (toggled && before) {
    if (JSON.stringify(toggled.value) !== JSON.stringify(before.value)) {
      problems.push(`a theme toggle moved the point from ${JSON.stringify(before.value)} to ${JSON.stringify(toggled.value)}`)
    }
    if (toggled.color === before.color) problems.push(`a theme toggle left the point's color at ${before.color}`)
  }
  await page.evaluate(() => window.quartoToggleColorScheme())

  await page.setViewportSize({ width: 800, height: 720 })
  await page.waitForTimeout(600)
  await aligned('after a resize')
  return problems
}

// A touch that starts on the chart but not on a point must still scroll the
// page: nothing between the plot area and the page may set touch-action:
// none.
function touchScrollProblems() {
  const gd = document.querySelector('#corners .vm-drag-host')
  if (!gd) return ['no second chart']
  const r = gd.querySelector('.nsewdrag')?.getBoundingClientRect() ?? gd.getBoundingClientRect()
  // Low in the plot area, under the triangle's base and clear of its points.
  let el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height * 0.85)
  if (!gd.contains(el)) return [`the second chart's plot area is covered by ${el?.className || el?.tagName}`]
  if (!el) return ['nothing under the second chart\'s plot area']
  for (; el; el = el.parentElement) {
    if (getComputedStyle(el).touchAction === 'none') {
      return [`a touch on the plot area beside the points can't scroll the page (touch-action: none on ${el.className || el.tagName})`]
    }
  }
  return []
}

async function checkDragPage(context, base, relPath) {
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
  for (const problem of await page.evaluate(handleMarkupProblems)) errors.push(`desktop: ${problem}`)
  for (const problem of await dragProblems(page)) errors.push(`desktop: ${problem}`)
  await page.close()

  const phone = await context.newPage()
  await phone.setViewportSize({ width: 390, height: 844 })
  watch(phone, 'phone ')
  for (const problem of await load(phone, base + relPath)) errors.push(`phone: ${problem}`)
  // Drawn detached, the chart starts at Plotly's 700px default and is
  // resized to the column after it lands; measure the phone-width one.
  await phone.waitForFunction(() => {
    const area = document.querySelector('#corners .nsewdrag')
    return area && area.getBoundingClientRect().right <= window.innerWidth
  }, null, { timeout: settleTimeoutMs, polling: 50 }).catch(() => errors.push('phone: the second chart never fitted the window'))
  await phone.locator('#corners').scrollIntoViewIfNeeded()
  for (const problem of await phone.evaluate(touchScrollProblems)) errors.push(`phone: ${problem}`)
  const scrollWidth = await phone.evaluate(() => document.documentElement.scrollWidth)
  if (scrollWidth > 390) errors.push(`phone: the page scrolls sideways (${scrollWidth}px wide in a 390px window)`)
  await phone.close()
  return errors
}

// Each fixture case is a div with an id (see modebar.qmd): its expected bar
// count, and the host the bar must sit on.
function modebarLayoutProblems() {
  const problems = []
  const visibleBars = (root) => {
    const bars = []
    for (const bar of root.querySelectorAll('.vm-svg-modebar')) {
      if (!bar.hidden) bars.push(bar)
    }
    return bars
  }
  const expect = [
    ['in-block', 1, '.ojs-chart-block'],
    ['bare', 1, '.cell-output-display'],
    ['off', 0, null],
    ['hand-built', 1, '.ojs-chart-block'],
    ['plotly', 0, null],
    ['ramp', 0, null]
  ]
  for (const [id, count, hostSelector] of expect) {
    const root = document.getElementById(id)
    if (!root) { problems.push(`#${id}: case missing from the fixture`); continue }
    const bars = visibleBars(root)
    if (bars.length !== count) { problems.push(`#${id}: ${bars.length} SVG modebar(s) showing, expected ${count}`); continue }
    if (count === 0) continue
    const bar = bars[0]
    const host = bar.parentElement
    if (!host.matches(hostSelector) || !host.classList.contains('vm-svg-host')) {
      problems.push(`#${id}: the bar's parent is ${host.className || host.tagName}, expected ${hostSelector}.vm-svg-host`)
    }
    if (!bar.querySelector('.vm-svg-modebar-button[data-vm-button="fullscreen"]')) problems.push(`#${id}: no fullscreen button in the bar`)
    // Pinned inside the figure's top-right corner.
    const figure = host.querySelector('svg.vm-fs-figure')
    if (!figure) { problems.push(`#${id}: no figure SVG tagged vm-fs-figure`); continue }
    const f = figure.getBoundingClientRect()
    const b = bar.getBoundingClientRect()
    if (Math.abs(f.right - b.right) > 12 || Math.abs(b.top - f.top) > 12) {
      problems.push(`#${id}: the bar is not at the figure's top-right corner (figure right/top ${Math.round(f.right)}/${Math.round(f.top)}, bar ${Math.round(b.right)}/${Math.round(b.top)})`)
    }
  }
  // A chart in a block is centered; a bare cell's chart keeps its place.
  const centred = (id) => {
    const svg = document.querySelector(`#${id} svg.vm-fs-figure`)
    const cell = svg && svg.closest('.cell-output-display')
    if (!svg || !cell) return null
    const s = svg.getBoundingClientRect()
    const c = cell.getBoundingClientRect()
    return {offset: Math.round(s.left + s.width / 2 - (c.left + c.width / 2)), left: Math.round(s.left - c.left)}
  }
  const inBlock = centred('in-block')
  if (inBlock && Math.abs(inBlock.offset) > 2) problems.push(`#in-block: the figure is ${inBlock.offset}px off the block's centre`)
  const bare = centred('bare')
  if (bare && bare.left > 2) problems.push(`#bare: the bare cell's figure was moved ${bare.left}px from the cell's left edge`)
  return problems
}

async function modebarProblems(page) {
  const problems = [...await page.evaluate(modebarLayoutProblems)]
  // The interactions below need the bars the layout check looks for.
  if (problems.length > 0) return problems
  // A re-run keeps the same bar.
  const before = await page.evaluateHandle(() => document.querySelector('#in-block .vm-svg-modebar'))
  await page.locator('#in-block input[type=range]').fill('35')
  await page.waitForTimeout(300)
  const kept = await page.evaluate((old) => {
    const bars = document.querySelectorAll('#in-block .vm-svg-modebar')
    return bars.length === 1 && bars[0] === old
  }, before)
  if (!kept) problems.push('#in-block: a re-run rebuilt the bar or added a second one')
  // Hidden at rest, shown on hover.
  await page.mouse.move(0, 0)
  await page.waitForTimeout(300)
  const rest = await page.evaluate(() => getComputedStyle(document.querySelector('#bare .vm-svg-modebar')).opacity)
  if (rest !== '0') problems.push(`#bare: the bar shows at rest (opacity ${rest})`)
  await page.locator('#bare svg.vm-fs-figure').hover()
  await page.waitForTimeout(300)
  const hovered = await page.evaluate(() => getComputedStyle(document.querySelector('#bare .vm-svg-modebar')).opacity)
  if (hovered !== '1') problems.push(`#bare: the bar does not show on hover (opacity ${hovered})`)
  // Fullscreen enlarges the host and letterboxes the figure.
  for (const id of ['in-block', 'bare']) {
    await page.locator(`#${id} svg.vm-fs-figure`).hover()
    await page.locator(`#${id} .vm-svg-modebar-button[data-vm-button="fullscreen"]`).click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(500)
    const problem = await page.evaluate((caseId) => {
      const host = document.querySelector(`#${caseId} .vm-svg-host`) ?? document.querySelector(`#${caseId}.vm-svg-host`)
      if (!document.fullscreenElement) return 'fullscreen did not open'
      if (document.fullscreenElement !== host) return `fullscreen enlarged ${document.fullscreenElement.className}, not the host`
      const f = host.querySelector('svg.vm-fs-figure').getBoundingClientRect()
      const fillsWidth = f.width > window.innerWidth * 0.9
      const fillsHeight = f.height > window.innerHeight * 0.75
      if (!fillsWidth && !fillsHeight) return `the figure is ${Math.round(f.width)}x${Math.round(f.height)} in a ${window.innerWidth}x${window.innerHeight} fullscreen`
      return null
    }, id)
    if (problem) problems.push(`#${id}: ${problem}`)
    await page.evaluate(() => document.fullscreenElement && document.exitFullscreen())
    await page.waitForTimeout(300)
  }
  return problems
}

async function checkModebarPage(context, base, relPath) {
  const errors = []
  const page = await context.newPage()
  page.on('pageerror', err => errors.push(`pageerror: ${err.message}`))
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
  })
  for (const problem of await load(page, base + relPath)) errors.push(`desktop: ${problem}`)
  // whenAdded runs a frame after the last cell lands.
  await page.waitForTimeout(300)
  for (const problem of await modebarProblems(page)) errors.push(`desktop: ${problem}`)
  await page.close()
  return errors
}

async function main() {
  if (!process.argv.includes('--no-render')) {
    render(siteDir)
    render(pageOptionsDir)
  }
  const server = await serve(path.join(siteDir, '_site'))
  const pageOptionsServer = await serve(path.join(pageOptionsDir, '_site'))
  const base = `http://127.0.0.1:${server.address().port}/`
  const pageOptionsBase = `http://127.0.0.1:${pageOptionsServer.address().port}/`
  const browser = await chromium.launch()
  // One context for every load, so its HTTP cache keeps the CDN scripts
  // (browser.newPage() would open a fresh, empty-cached context each time).
  // Storage is cleared before each navigation instead: the chrome remembers
  // state there (the sidebar pin, the draggable legend's offset, the playback speed), and every
  // load should see a first visit.
  const context = await browser.newContext()
  await context.addInitScript(() => {
    try { localStorage.clear(); sessionStorage.clear() } catch (e) { /* storage unavailable */ }
  })
  let failed = false
  try {
    const runs = [
      ...[...pages, ...listingPages, ...dragPages, ...railPages, ...prosePages, ...modebarPages].map((relPath) => [base, relPath, 'fixtures/layout/']),
      ...pageOptionsPages.map((relPath) => [pageOptionsBase, relPath, 'fixtures/page-options/'])
    ]
    for (const [siteBase, relPath, label] of runs) {
      let check = checkPage
      if (railPages.includes(relPath)) check = checkRailPage
      if (prosePages.includes(relPath)) check = checkProsePage
      if (listingPages.includes(relPath)) check = checkCardsPage
      if (dragPages.includes(relPath)) check = checkDragPage
      if (modebarPages.includes(relPath)) check = checkModebarPage
      if (siteBase === pageOptionsBase) check = checkPostsPage
      const errors = await check(context, siteBase, relPath)
      if (errors.length === 0) {
        console.log(`OK    ${label}${relPath}`)
      } else {
        failed = true
        console.log(`FAIL  ${label}${relPath}`)
        for (const e of errors) console.log(`      ${e}`)
      }
    }
  } finally {
    await browser.close()
    server.close()
    pageOptionsServer.close()
  }
  console.log(failed ? '\nLayout test failed.' : '\nAll layout checks passed.')
  process.exit(failed ? 1 : 0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
