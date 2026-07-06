/**
 * Copyright (c) 2026 Apurva Nakade, Copilot. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade, Copilot
 */

/**
 * Shared app-level helpers for the root-finding method pages.
 *
 * These helpers intentionally sit one level above the low-level trace and render
 * utilities. They remove repeated page-framework code so each method page can be
 * defined mostly in terms of:
 * - computation,
 * - derived plot-model state,
 * - method-specific traces,
 * - a small config object.
 */
(function attachMethodAppUtils(globalThis) {
  const renderUtils = globalThis.VisualMathRenderUtils
  const plotlyTraceUtils = globalThis.VisualMathPlotlyTraceUtils

  const samplePoints = ({lo, hi, count}) =>
    Array.from({length: count}, (_, i) => lo + (hi - lo) * i / (count - 1))

  const createSampledFunctionTrace = ({
    range,
    fn,
    name,
    color = "#2563eb",
    width = 3,
    count = 700,
    maxAbs = 1e8
  }) => {
    const xs = samplePoints({lo: range.lo, hi: range.hi, count})
    const ys = xs.map(x => fn(x)).map(y => Number.isFinite(y) && Math.abs(y) < maxAbs ? y : null)

    return plotlyTraceUtils.createLineTrace({
      x: xs,
      y: ys,
      name,
      color,
      width
    })
  }

  const createHorizontalReferenceTrace = ({
    range,
    y = 0,
    name = "y = 0",
    color = "#111827",
    width = 2,
    dash,
    showlegend = true
  }) =>
    plotlyTraceUtils.createLineTrace({
      x: [range.lo, range.hi],
      y: [y, y],
      name,
      color,
      width,
      dash,
      showlegend
    })

  const createDiagonalReferenceTrace = ({
    range,
    name = "y = x",
    color = "#111827",
    width = 2,
    dash = "dash",
    showlegend = true
  }) =>
    plotlyTraceUtils.createLineTrace({
      x: [range.lo, range.hi],
      y: [range.lo, range.hi],
      name,
      color,
      width,
      dash,
      showlegend
    })

  const resolveHeader = (header, tex) =>
    typeof header === "function" ? header(tex) : header

  const renderTableFromColumns = ({html, tex, rows, columns, emptyMessage}) => {
    if (rows.length === 0) {
      return renderUtils.renderEmptyState(html, emptyMessage)
    }

    return renderUtils.renderDataTable({
      html,
      headers: columns.map(column => resolveHeader(column.header, tex)),
      rows: rows.map(row => columns.map(column => column.cell(row)))
    })
  }

  const createPlotLayout = ({
    plotModel,
    title,
    xRangeKey,
    yRangeKey,
    xAxisTitle,
    yAxisTitle,
    xAxis = {},
    yAxis = {},
    shapes = [],
    layout = {}
  }) => {
    const xRange = plotModel[xRangeKey]
    const yRange = plotModel[yRangeKey]

    return {
      title: {
        text: title
      },
      margin: {
        l: 65,
        r: 30,
        t: 60,
        b: 55
      },
      xaxis: {
        title: xAxisTitle,
        range: [xRange.lo, xRange.hi],
        zeroline: true,
        ...xAxis
      },
      yaxis: {
        title: yAxisTitle,
        range: [yRange.lo, yRange.hi],
        zeroline: true,
        ...yAxis
      },
      shapes,
      legend: {
        orientation: "h",
        y: -0.18
      },
      hovermode: "closest",
      ...layout
    }
  }

  const createMethodApp = ({compute, buildPlotModel, buildTraces, config}) => ({
    compute,
    createStepControl: options => renderUtils.createStepControl(options),
    renderOutput: ({html, tex, Plotly, result, stepControl, ...inputs}) => {
      const plotModel = buildPlotModel({result, stepControl, ...inputs})
      const plotDiv = html`<div class="plotly-box-large"></div>`
      const data = buildTraces({plotModel, result, ...inputs})
      const layout = createPlotLayout({
        plotModel,
        title: config.plot.title,
        xRangeKey: config.plot.xRangeKey,
        yRangeKey: config.plot.yRangeKey,
        xAxisTitle: config.plot.xAxisTitle,
        yAxisTitle: config.plot.yAxisTitle,
        xAxis: config.plot.xAxis,
        yAxis: config.plot.yAxis,
        shapes: config.plot.getShapes ? config.plot.getShapes(plotModel) : [],
        layout: config.plot.layout
      })

      Plotly.newPlot(plotDiv, data, layout, {
        responsive: true,
        displaylogo: false
      })

      return html`
        <div>
          ${plotDiv}
          ${renderUtils.renderStatusBox({
            html,
            statusType: result.statusType,
            message: result.message
          })}
          ${renderTableFromColumns({
            html,
            tex,
            rows: plotModel.visibleRows,
            columns: config.table.columns,
            emptyMessage: config.table.emptyMessage
          })}
        </div>
      `
    }
  })

  globalThis.VisualMathMethodAppUtils = {
    createMethodApp,
    createPlotLayout,
    createSampledFunctionTrace,
    createHorizontalReferenceTrace,
    createDiagonalReferenceTrace,
    renderTableFromColumns
  }
})(window)
