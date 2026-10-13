/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Keeps the reader's view on a chart whose axes are locked to each other
// (`yaxis.scaleanchor: "x"`, a circle that must look round).
//
// Plotly honours scaleanchor by widening one axis past the range asked for,
// until the two scales match in the chart's box, and it writes the widened
// range back into the chart's layout. Two things then go wrong:
//
// - Every resize fits from the range on screen, which is already widened, so
//   each one widens again: drag a split-layout divider back and forth, or
//   rotate a tablet a few times, and the chart zooms further out each time.
//   The first resize does it too -- a chart is drawn detached, in Plotly's
//   700x450 default box, before it lands on the page.
// - `uirevision` can't keep a reader's zoom across a redraw: the range the
//   page passes never equals the widened one in the layout, so Plotly sees a
//   new range every time and replaces the zoom with it.
//
// The fix is to remember the view the reader wants -- the page's requested
// ranges, until the reader zooms or pans -- and fit from that: after every
// resize (VM.plotting.autoResize calls fitView), and on a redraw with the
// same uirevision (the newPlot/react patch calls trackView). Charts without
// a scaleanchor are left alone entirely.
(function attachVM(globalThis) {
  const AXIS = /^[xy]axis\d*$/

  const isAnchored = (layout) => {
    if (!layout || typeof layout !== "object") return false
    for (const key of Object.keys(layout)) {
      if (AXIS.test(key) && layout[key] && layout[key].scaleanchor !== undefined) return true
    }
    return false
  }

  const requestedRanges = (layout) => {
    const ranges = {}
    for (const key of Object.keys(layout)) {
      if (!AXIS.test(key) || !layout[key]) continue
      const range = layout[key].range
      if (Array.isArray(range) && range.length === 2) ranges[key] = [range[0], range[1]]
    }
    return ranges
  }

  const copyRanges = (ranges) => {
    const out = {}
    for (const key of Object.keys(ranges)) {
      if (ranges[key] === null) out[key] = null
      else out[key] = ranges[key].slice()
    }
    return out
  }

  const sameRange = (a, b) => {
    if (a === null || b === null) return a === b
    return Number(a[0]) === Number(b[0]) && Number(a[1]) === Number(b[1])
  }

  /**
   * Reads one axis's range out of a `plotly_relayout` event, which spells it
   * either as one array (`"xaxis.range": [a, b]`) or as its two ends
   * (`"xaxis.range[0]": a, "xaxis.range[1]": b`).
   *
   * @param {Object} event - The event data Plotly passes to the handler.
   * @param {string} axis - `"xaxis"`, `"yaxis2"`, ...
   * @returns {Array|null} `[lo, hi]`, `"auto"` when the event switched the
   *   axis to autorange (the modebar's autoscale), or `null` when the event
   *   doesn't touch this axis's range (or names only one end).
   */
  const rangeFromRelayout = (event, axis) => {
    if (!event) return null
    if (event[`${axis}.autorange`] === true) return "auto"
    const whole = event[`${axis}.range`]
    if (Array.isArray(whole)) return [whole[0], whole[1]]
    const lo = event[`${axis}.range[0]`]
    const hi = event[`${axis}.range[1]`]
    if (lo === undefined || hi === undefined) return null
    return [lo, hi]
  }

  // The relayout that puts a view on screen. An axis the reader autoscaled
  // is left to Plotly: autorange fits from the data every time, so it has
  // no ratchet to undo.
  const viewUpdate = (view) => {
    const update = {}
    for (const key of Object.keys(view)) {
      if (view[key] !== null) update[`${key}.range`] = view[key].slice()
    }
    return update
  }

  const listen = (gd) => {
    if (gd.__vmViewListening || typeof gd.on !== "function") return
    gd.__vmViewListening = true
    // A double-click resets the view. Plotly's own reset follows this event
    // and restores the initial range -- the widened one -- and reports it as
    // an ordinary range, so the relayout it fires is taken as the reset.
    gd.on("plotly_doubleclick", () => {
      if (gd.__vmView) gd.__vmView.resetting = true
    })
    gd.on("plotly_relayout", (event) => {
      const state = gd.__vmView
      if (!state) return
      if (state.resetting) {
        state.resetting = false
        state.moved = false
        state.view = copyRanges(state.requested)
        setTimeout(() => {
          if (gd.isConnected) globalThis.Plotly?.relayout(gd, viewUpdate(state.view))
        }, 0)
        return
      }
      for (const key of Object.keys(state.view)) {
        let range = rangeFromRelayout(event, key)
        if (range === null) continue
        if (range === "auto") range = null
        // fitView's own relayout reports the view it applied; that is not
        // the reader moving it.
        if (sameRange(range, state.view[key])) continue
        state.view[key] = range
        state.moved = true
      }
    })
  }

  /**
   * Records the view of a chart with a `scaleanchor` axis, so that
   * {@link fitView} can restore it after a resize, and keeps a reader's zoom
   * across a redraw with an unchanged `layout.uirevision`. The shared
   * `Plotly.newPlot`/`Plotly.react` patch calls it on every chart, so a page
   * never does; call it yourself only on a chart drawn with the patch off.
   *
   * @param {HTMLElement} gd - The chart's div.
   * @param {Object} layout - The layout about to be drawn.
   * @returns {Object} The layout to draw: `layout` itself, or, when the
   *   reader has zoomed or panned and `uirevision` is unchanged, a copy whose
   *   axis ranges are the reader's. A layout with no `scaleanchor` axis is
   *   returned as is and forgets any recorded view.
   */
  const trackView = (gd, layout) => {
    if (!gd || !isAnchored(layout)) {
      if (gd) gd.__vmView = undefined
      return layout
    }
    const requested = requestedRanges(layout)
    const state = gd.__vmView
    const sameRevision = state && layout.uirevision !== undefined && layout.uirevision === state.uirevision
    if (sameRevision && state.moved) {
      state.requested = requested
      const out = {...layout}
      for (const key of Object.keys(state.view)) {
        if (state.view[key] !== null && out[key]) out[key] = {...out[key], range: state.view[key].slice()}
      }
      return out
    }
    gd.__vmView = {uirevision: layout.uirevision, requested, view: copyRanges(requested), moved: false, resetting: false}
    // Plotly gives a div its .on() inside the newPlot this layout is about
    // to be passed to, so the listeners go on just after that call.
    Promise.resolve().then(() => listen(gd))
    return layout
  }

  /**
   * Puts a chart's recorded view (see {@link trackView}) back on screen,
   * fitted to the chart's current box. `VM.plotting.autoResize` calls it
   * after every resize.
   *
   * @param {HTMLElement} gd - The chart's div.
   * @returns {Promise|null} Plotly's relayout promise, or `null` when the
   *   chart has no recorded view (no `scaleanchor` axis, or no explicit
   *   range) or Plotly isn't loaded.
   */
  const fitView = (gd) => {
    const state = gd && gd.__vmView
    if (!state || !globalThis.Plotly) return null
    const update = viewUpdate(state.view)
    if (Object.keys(update).length === 0) return null
    listen(gd)
    return globalThis.Plotly.relayout(gd, update)
  }

  globalThis.VM = {
    ...globalThis.VM,
    plotting: {...globalThis.VM?.plotting, trackView, fitView, rangeFromRelayout}
  }
})(window)
