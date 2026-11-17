/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Every chart on a mathviz page is the same closure: create the graph div
  // on the first call with Plotly.newPlot, reuse it with Plotly.react on
  // every later one (which is what keeps a reader's zoom and pan while a
  // slider moves, together with `uirevision`), and hand the div to
  // VM.plotting.autoResize, because it was built detached and Plotly
  // measured it at 0x0. Pages with several charts wrote that closure once
  // per chart; this is it, once.
  /**
   * A reusable Plotly chart for an OJS cell. Call it once in a cell that
   * depends on nothing reactive, then call the returned function from the
   * cell that builds the traces:
   *
   *     mainPlot = VM.plotting.persistentPlot()
   *     mainPlot(data, layout)            // in the display cell
   *
   * @param {Object} [opts]
   * @param {string} [opts.className="plotly-box-large"] - Class of the
   *   graph div; `plotly-box-large` is mathviz's 72vh main-chart box.
   * @param {string} [opts.height] - Inline CSS height, for a secondary chart
   *   that shouldn't take the main chart's box (e.g. `"320px"`). It sets the
   *   min-height too, since the class's own min-height (500px) would
   *   otherwise win over any smaller height.
   * @param {number} [opts.aspectRatio] - Width / height, e.g. `16 / 9`, or
   *   `1` for a square chart. The div keeps its full width and takes its
   *   height from this ratio instead of the class's height and min-height,
   *   so a chart with equal-scale (`scaleanchor`) axes can have the shape
   *   of its data. Fullscreen still letterboxes it at this ratio, and embed
   *   mode still gives it the height the frame leaves. Not combinable with
   *   `height`.
   * @param {string} [opts.maxHeight="72vh"] - With `aspectRatio`: the
   *   tallest the div gets, as a CSS length (e.g. `"600px"`), or `"none"`
   *   for no cap. Past it the div keeps its full width at this height, so a
   *   tall ratio in a wide column stays on screen, and an equal-scale chart
   *   is letterboxed inside the box as with a fixed `height`. The default is
   *   the main chart box's own height. Fullscreen and embed mode ignore it.
   * @throws {TypeError} When both `height` and `aspectRatio` are given, or
   *   `maxHeight` is given without `aspectRatio` or isn't a non-empty string.
   * @throws {RangeError} When `aspectRatio` isn't a finite number above 0.
   * @returns {((data: Object[], layout: Object, config?: Object) => HTMLElement) & {div: HTMLElement|null}}
   *   Draws or redraws and returns the same div every time. `config`
   *   defaults to `VM.plotting.config()`. Its read-only `div` property is
   *   that div, or `null` before the first draw -- for code that needs the
   *   chart without redrawing it (`VM.plotting.draggablePoints` does).
   */
  const persistentPlot = (opts = {}) => {
    const className = opts.className ?? "plotly-box-large"
    const {aspectRatio, maxHeight} = opts
    if (aspectRatio !== undefined) {
      if (opts.height !== undefined) {
        throw new TypeError("persistentPlot: give height or aspectRatio, not both")
      }
      if (typeof aspectRatio !== "number" || !Number.isFinite(aspectRatio) || aspectRatio <= 0) {
        throw new RangeError(`persistentPlot: aspectRatio must be a finite number above 0, got ${aspectRatio}`)
      }
    }
    if (maxHeight !== undefined) {
      if (aspectRatio === undefined) {
        throw new TypeError("persistentPlot: maxHeight caps an aspectRatio chart; give aspectRatio too")
      }
      if (typeof maxHeight !== "string" || maxHeight.trim() === "") {
        throw new TypeError(`persistentPlot: maxHeight must be a CSS length string, got ${maxHeight}`)
      }
    }
    let div = null

    const draw = (data, layout, config) => {
      const Plotly = globalThis.Plotly
      const plotConfig = config ?? globalThis.VM.plotting.config()
      if (div === null) {
        div = document.createElement("div")
        div.className = className
        if (opts.height !== undefined) {
          div.style.height = opts.height
          div.style.minHeight = opts.height
        }
        // The class clears the box's height and min-height (chart-block.css)
        // rather than an inline height doing it, so the fullscreen and embed
        // rules, which out-specify the class, still size the chart there;
        // with width and height both set, they make aspect-ratio moot.
        if (aspectRatio !== undefined) {
          div.className += " vm-plot-aspect"
          div.style.aspectRatio = String(aspectRatio)
          // A custom property rather than an inline max-height, which would
          // out-rank the fullscreen and embed rules that clear the cap.
          if (maxHeight !== undefined) div.style.setProperty("--vm-plot-max-height", maxHeight)
        }
        Plotly.newPlot(div, data, layout, plotConfig)
        globalThis.VM.plotting.autoResize(div)
      } else {
        Plotly.react(div, data, layout, plotConfig)
      }
      return div
    }
    Object.defineProperty(draw, "div", {get: () => div})
    return draw
  }

  Object.assign((globalThis.VM ??= {}).plotting ??= {}, {persistentPlot})
})(window)
