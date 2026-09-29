/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // The 3-D counterpart of persistentPlot. What makes a chart 3-D to the
  // Plotly patch and the theme is a `scene` in its layout: that is what
  // swaps in the 3-D modebar, makes dragging rotate the scene (turntable)
  // rather than inherit the 2-D "pan", and themes the scene's axes. A page
  // can leave `scene` out -- a surface trace alone draws in 3-D -- and
  // would then get none of that, so this closure always passes one.
  /**
   * A reusable Plotly chart for 3-D traces (`surface`, `scatter3d`,
   * `mesh3d`, ...). Used exactly like {@link persistentPlot}:
   *
   *     surfacePlot = VM.plotting.persistentPlot3d({height: "420px"})
   *     surfacePlot(data, layout)            // in the display cell
   *
   * Dragging rotates the scene about its vertical axis (`turntable`,
   * Plotly's own 3-D default), the scroll wheel zooms, and the modebar has
   * the 3-D tools (turntable/orbit rotation, pan, zoom, reset camera).
   *
   * @param {Object} [opts] - As for {@link persistentPlot}: `className`,
   *   `height`.
   * @returns {(data: Object[], layout: Object, config?: Object) => HTMLElement}
   *   Draws or redraws and returns the same div every time. The layout's
   *   `scene` (camera, axis titles, `dragmode`, ...) is kept; one is added
   *   when it has none.
   */
  const persistentPlot3d = (opts = {}) => {
    const plot = globalThis.VM.plotting.persistentPlot(opts)
    return (data, layout, config) => {
      const page = layout ?? {}
      return plot(data, {...page, scene: {...page.scene}}, config)
    }
  }

  globalThis.VM = {...globalThis.VM, plotting: {...globalThis.VM?.plotting, persistentPlot3d}}
})(window)
