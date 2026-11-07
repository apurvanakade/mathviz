/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// One shared watch for elements that appear after load. The self-installing
// modules (slider play buttons, the slider track fill, the draggable legend,
// the SVG fullscreen button) each enhance elements that Observable Inputs
// and OJS create -- and recreate -- long after the page loads, so each used
// to run its own MutationObserver over the whole body. Three of the four
// ran a querySelectorAll on every added node, synchronously: a Plotly
// redraw adds thousands of nodes, every frame of a playback sweep.
//
// Here there is one observer, and however many mutations arrive in a
// frame, each registered selector is queried once, in a requestAnimationFrame
// callback. That callback still runs before the frame is painted, so an
// enhancement (a legend's stored offset, a slider's fill) never shows up a
// frame late.
(function attachVM(globalThis) {
  const watchers = []
  let observer = null
  let scheduled = false

  const run = (watcher) => {
    if (typeof watcher.beforeScan === "function") watcher.beforeScan()
    for (const element of document.querySelectorAll(watcher.selector)) watcher.enhance(element)
  }

  const scan = () => {
    scheduled = false
    for (const watcher of watchers.slice()) run(watcher)
  }

  const observe = () => {
    if (observer || typeof MutationObserver === "undefined" || !document.body) return
    observer = new MutationObserver(() => {
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(scan)
    })
    observer.observe(document.body, {childList: true, subtree: true})
  }

  /**
   * Calls `enhance` on every element matching `selector` now (or at
   * `DOMContentLoaded`, if the page is still loading) and again whenever
   * the DOM changes, batched to at most one query per selector per frame.
   * This is what mathviz's own self-installing modules use; a page or site
   * script that enhances OJS output can use it the same way.
   *
   * `enhance` sees the same element on every pass, so it must be
   * idempotent -- mark what it has done (a `data-*` attribute) and return
   * early.
   *
   * @param {string} selector - A CSS selector, queried over the whole document.
   * @param {(element: Element) => void} enhance
   * @param {Object} [opts]
   * @param {() => void} [opts.beforeScan] - Runs before each pass, e.g. to
   *   drop state kept for elements that have since left the page.
   * @returns {() => void} Stops watching for this selector. A no-op
   *   outside a browser (no `document`), where nothing is ever called.
   */
  const whenAdded = (selector, enhance, opts = {}) => {
    if (typeof document === "undefined" || typeof document.querySelectorAll !== "function") return () => {}
    const watcher = {selector, enhance, beforeScan: opts.beforeScan}
    watchers.push(watcher)
    const start = () => {
      if (!watchers.includes(watcher)) return
      run(watcher)
      observe()
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start)
    else start()
    return () => {
      const index = watchers.indexOf(watcher)
      if (index !== -1) watchers.splice(index, 1)
    }
  }

  Object.assign((globalThis.VM ??= {}).ui ??= {}, {whenAdded})
})(window)
