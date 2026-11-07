/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // A static figure (no controls of its own) still wants mathviz's legend
  // rather than Plotly's: the same swatch rows as every app, draggable,
  // hidden on a narrow chart. Wiring it the documented way takes three
  // cells per chart (traces, `viewof` legend, plot) inside an
  // .ojs-chart-block div; this does the same wiring inside one cell, for
  // pages with many such figures.

  // The color a legend row should show for a trace: its line, then its
  // marker, then its fill -- and for a trace that sets none, the colorway
  // color Plotly gives it. Plotly hands out colorway colors in trace order,
  // skipping only traces the page set `visible: false` (plots.js counts
  // `_input.visible !== false`), so that count is replayed here.
  const ownColor = (trace) => {
    if (typeof trace.line?.color === "string") return trace.line.color
    if (typeof trace.marker?.color === "string") return trace.marker.color
    if (typeof trace.fillcolor === "string") return trace.fillcolor
    return undefined
  }

  /**
   * The rows `VM.ui.legendOverlay` needs for a Plotly `data` array: one per
   * trace with a `name` and without `showlegend: false`, in trace order,
   * colored like the trace. Two traces with the same name share one row.
   *
   * @param {Object[]} data - Plotly traces.
   * @param {string[]} [colorway] - The chart's color cycle, for traces that
   *   set no color of their own: the layout's `colorway` if it has one,
   *   else `VM.plotting.colorway()`, which is what the patch gives Plotly.
   * @returns {{label: string, color: string|undefined}[]} `color` is
   *   `undefined` for a trace colored per point (a `marker.color` array)
   *   with no line color, and for an uncolored trace when `colorway` is
   *   empty.
   */
  const legendItems = (data, colorway = globalThis.VM.plotting.colorway()) => {
    const items = []
    const seen = new Set()
    let colorIndex = 0
    for (const trace of data) {
      let color = ownColor(trace)
      // A per-point color array has no one color to show; no swatch beats
      // a colorway color the points don't have.
      const perPoint = Array.isArray(trace.marker?.color)
      if (color === undefined && !perPoint && colorway.length > 0) color = colorway[colorIndex % colorway.length]
      if (trace.visible !== false) colorIndex++
      if (trace.name === undefined || trace.showlegend === false || seen.has(trace.name)) continue
      seen.add(trace.name)
      items.push({label: trace.name, color})
    }
    return items
  }

  /**
   * Layout overrides that pin every cartesian axis (`xaxis`, `yaxis`,
   * `xaxis2`, ...) at the range it was drawn with, so hiding a trace doesn't
   * rescale the chart or move its grid. Ranges are copied as Plotly resolved
   * them, which for a log axis is already in log units -- what `range`
   * expects there too. An axis the page fixed itself (a `range` in its own
   * layout) is left alone.
   *
   * @param {Object} fullLayout - The drawn div's `_fullLayout`.
   * @param {Object} layout - The layout the page passed.
   * @returns {Object} `{xaxis: {...layout.xaxis, range, autorange: false},
   *   ...}` for each axis to pin; `{}` when `fullLayout` is missing.
   */
  const lockedAxes = (fullLayout, layout) => {
    const out = {}
    if (!fullLayout) return out
    for (const key of globalThis.VM.plotting.subplotKeys(fullLayout).cartesian) {
      const own = layout[key] ?? {}
      if (Array.isArray(own.range)) continue
      const range = fullLayout[key]?.range
      if (!Array.isArray(range) || range.length !== 2) continue
      out[key] = {...own, range: [range[0], range[1]], autorange: false}
    }
    return out
  }

  /**
   * Draws a chart with a `VM.ui.legendOverlay` over it instead of Plotly's
   * legend, and returns both in an `.ojs-chart-block`. Clicking a row hides
   * or shows the traces of that name (as `visible: "legendonly"`, so every
   * trace keeps its index and its colorway color); unnamed traces and
   * `showlegend: false` ones are always drawn. The axes keep the ranges they had with every
   * trace shown -- the first click pins them (see `lockedAxes`) -- so hiding
   * a trace never rescales the chart or moves its grid. A new call (new
   * data, a theme toggle) starts unpinned again. Use it as a cell's value:
   *
   *     VM.plotting.plotWithLegend(myPlot, traces, layout)
   *
   * @param {(data: Object[], layout: Object) => HTMLElement} plot - A chart
   *   function such as `VM.plotting.persistentPlot()`'s return value.
   * @param {Object[]} data - Plotly traces.
   * @param {Object} layout - Plotly layout; `showlegend` is forced `false`.
   * @returns {HTMLDivElement} The `.ojs-chart-block`: a div holding the
   *   legend, then the one `plot` returned. With no legend rows, the block
   *   holds only the chart.
   */
  const plotWithLegend = (plot, data, layout) => {
    const items = legendItems(data, layout?.colorway ?? globalThis.VM.plotting.colorway())
    const block = document.createElement("div")
    block.className = "ojs-chart-block"
    const quietLayout = {...layout, showlegend: false}
    if (items.length === 0) {
      block.append(plot(data, quietLayout))
      return block
    }
    const legend = globalThis.VM.ui.legendOverlay(items)
    let div = null
    let pinnedLayout = quietLayout
    // Hidden traces stay in the array as "legendonly" rather than being
    // removed: removing one shifted every later trace's index, so each
    // uncolored trace after it took the next colorway color on a click.
    // "legendonly" (unlike `false`) still advances Plotly's color count.
    const draw = () => {
      const shown = legend.value
      const traces = []
      for (const trace of data) {
        const always = trace.name === undefined || trace.showlegend === false
        if (always || shown.includes(trace.name)) traces.push(trace)
        else traces.push({...trace, visible: "legendonly"})
      }
      return plot(traces, pinnedLayout)
    }
    // Pin the axes on the first click, while every trace is still drawn and
    // the chart is on the page (it was drawn detached, so Plotly's marker
    // padding is only right once it has been resized into place).
    legend.addEventListener("input", () => {
      if (pinnedLayout === quietLayout) pinnedLayout = {...quietLayout, ...lockedAxes(div?._fullLayout, quietLayout)}
      draw()
    })
    const legendCell = document.createElement("div")
    legendCell.append(legend)
    const chartCell = document.createElement("div")
    div = draw()
    chartCell.append(div)
    block.append(legendCell, chartCell)
    return block
  }

  Object.assign((globalThis.VM ??= {}).plotting ??= {}, {legendItems, lockedAxes, plotWithLegend})
})(window)
