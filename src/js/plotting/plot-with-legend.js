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
  // marker, then its fill.
  const traceColor = (trace) => {
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
   * @returns {{label: string, color: string|undefined}[]}
   */
  const legendItems = (data) => {
    const items = []
    const seen = new Set()
    for (const trace of data) {
      if (trace.name === undefined || trace.showlegend === false || seen.has(trace.name)) continue
      seen.add(trace.name)
      items.push({label: trace.name, color: traceColor(trace)})
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
    for (const key of Object.keys(fullLayout)) {
      if (!/^[xy]axis\d*$/.test(key)) continue
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
   * or shows the traces of that name; unnamed traces and `showlegend: false`
   * ones are always drawn. The axes keep the ranges they had with every
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
    const items = legendItems(data)
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
    const draw = () => {
      const shown = legend.value
      const visible = []
      for (const trace of data) {
        if (trace.name === undefined || trace.showlegend === false || shown.includes(trace.name)) visible.push(trace)
      }
      return plot(visible, pinnedLayout)
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

  globalThis.VM = {...globalThis.VM, plotting: {...globalThis.VM?.plotting, legendItems, lockedAxes, plotWithLegend}}
})(window)
