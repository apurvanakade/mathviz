/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // A Monte Carlo app's headline output is a handful of numbers -- the
  // estimate, its standard error, an acceptance rate -- that change on
  // every slider move. A results table is too heavy for that and a chart
  // title too cramped, so they sit in one row of label-over-value tiles
  // under the chart, inside its .ojs-chart-block, so they stay out of the
  // controls, come along when the chart is fullscreened and are kept by an
  // embedded app. stat-row.css orders the row last in the block and styles
  // it.
  /**
   * A row of small "label / value" readouts.
   *
   * @param {Array<{label: string, value: (string|number), title?: string}>} items -
   *   One tile each, in order. A number `value` is shown as-is (format it
   *   first); `title` becomes the tile's tooltip, for a definition too long
   *   for the label.
   * @returns {HTMLDivElement} `<div class="vm-stat-row">` holding one
   *   `<div class="vm-stat">` per item, each a `.vm-stat-label` and a
   *   `.vm-stat-value`.
   */
  const statRow = (items) => {
    const row = document.createElement("div")
    row.className = "vm-stat-row"
    // The tile count caps the row's width in stat-row.css, so a short row
    // keeps tile-sized tiles instead of stretching them across the page.
    row.style.setProperty("--vm-stat-count", String(items.length))
    for (const item of items) {
      const tile = document.createElement("div")
      tile.className = "vm-stat"
      if (item.title) tile.title = item.title

      const label = document.createElement("div")
      label.className = "vm-stat-label"
      label.textContent = item.label

      const value = document.createElement("div")
      value.className = "vm-stat-value"
      value.textContent = String(item.value)

      tile.append(label, value)
      row.append(tile)
    }
    return row
  }

  Object.assign((globalThis.VM ??= {}).ui ??= {}, {statRow})
})(window)
