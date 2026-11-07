/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Plotly event listeners that survive a redraw from scratch.
//
// Plotly.newPlot begins with Plots.purge, which deletes the graph div's
// event emitter -- every `gd.on(...)` listener goes with it -- and makes a
// new one. Plotly.react does the same whenever it decides a full redraw is
// needed (a changed config, say). A listener attached once, behind an
// "already listening" flag, then silently stops firing: anchored-view.js
// stopped noticing the reader's zoom after a page called newPlot a second
// time on the same div, and draggablePoints' handles stopped following the
// chart.
//
// So listeners are registered here, on the div, and re-attached after every
// newPlot/react by the shared Plotly patch (plotly-fullscreen-button.js).
// Re-attaching is remove-then-add, which is a no-op for a listener that is
// still there, so it needs no Plotly internals to tell the two cases apart.
(function attachVM(globalThis) {
  const attach = (gd) => {
    if (!gd || typeof gd.on !== "function" || !gd.__vmListeners) return
    for (const [event, handler] of gd.__vmListeners) {
      if (typeof gd.removeListener === "function") gd.removeListener(event, handler)
      gd.on(event, handler)
    }
  }

  /**
   * Attaches Plotly event listeners to a graph div that stay attached when
   * the chart is redrawn from scratch. `Plotly.newPlot` (and `Plotly.react`,
   * when it decides on a full redraw) throws away every `gd.on(...)`
   * listener; ones registered here are put back after each such call by the
   * shared Plotly patch.
   *
   * Safe to call before the div has been drawn (its listeners are attached
   * on the next microtask, by which time `newPlot` has given it `.on`), and
   * with no `handlers` at all, which re-attaches everything registered --
   * what the patch does. Call that form yourself only for a chart drawn
   * with the patch off.
   *
   * @param {HTMLElement} gd - The graph div.
   * @param {Object<string, Function>} [handlers] - `{plotly_relayout: fn, ...}`.
   * @returns {() => void} Removes the listeners this call added (from the
   *   div and from the registry). A no-op function for a missing `gd`.
   */
  const keepListening = (gd, handlers) => {
    if (!gd || typeof gd !== "object") return () => {}
    if (!gd.__vmListeners) gd.__vmListeners = []
    const added = []
    for (const event of Object.keys(handlers ?? {})) {
      const entry = [event, handlers[event]]
      gd.__vmListeners.push(entry)
      added.push(entry)
    }
    attach(gd)
    // A div that newPlot hasn't reached yet has no .on; newPlot gives it one
    // synchronously, before this runs.
    if (typeof gd.on !== "function") Promise.resolve().then(() => attach(gd))
    return () => {
      gd.__vmListeners = gd.__vmListeners.filter((entry) => !added.includes(entry))
      for (const [event, handler] of added) {
        if (typeof gd.removeListener === "function") gd.removeListener(event, handler)
      }
    }
  }

  Object.assign((globalThis.VM ??= {}).plotting ??= {}, {keepListening})
})(window)
