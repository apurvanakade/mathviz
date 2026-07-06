/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

/**
 * Shared helpers for building Plotly traces in the root-finding visualizations.
 *
 * The goal is not to hide every Plotly detail, but to centralize the repetitive
 * trace boilerplate that appears across multiple pages.
 *
 * These helpers are intentionally "thin":
 * - page-level OJS cells still decide which traces exist and what mathematical
 *   meaning they carry;
 * - the utility only standardizes the repetitive Plotly object shape for common
 *   line and marker/text traces;
 * - pages can still override details or extend the returned objects when a
 *   visualization needs something method-specific.
 */
(function attachPlotlyTraceUtils(globalThis) {
  /**
   * Build a Plotly scatter trace whose primary role is drawing a line.
   *
   * This covers several repeated patterns across the method pages:
   * - function curves such as `f(x)` or `g(x)`
   * - reference lines such as `y = 0` or `y = x`
   * - guide segments and tangent/cobweb path segments
   *
   * The helper supports optional dash style, legend visibility, hover control,
   * and marker configuration so it can also be used for `lines+markers` traces
   * without duplicating the surrounding object structure.
   *
   * @param {object} options Trace configuration.
   * @param {Array<unknown>} options.x X coordinates.
   * @param {Array<unknown>} options.y Y coordinates.
   * @param {string} options.name Legend label / trace name.
   * @param {string} options.color Line color.
   * @param {number} options.width Line width.
   * @param {string} [options.dash] Optional Plotly dash style.
   * @param {string} [options.mode="lines"] Plotly scatter mode.
   * @param {boolean} [options.showlegend=true] Whether to show the trace in the legend.
   * @param {string} [options.hoverinfo] Optional Plotly hoverinfo override.
   * @param {object} [options.marker] Optional marker config for mixed traces.
   * @returns {object} Plotly scatter trace configuration.
   */
  const createLineTrace = ({
    x,
    y,
    name,
    color,
    width,
    dash,
    mode = "lines",
    showlegend = true,
    hoverinfo,
    marker
  }) => {
    const trace = {
      x,
      y,
      type: "scatter",
      mode,
      name,
      showlegend,
      line: {
        color,
        width
      }
    }

    if (dash) trace.line.dash = dash
    if (hoverinfo) trace.hoverinfo = hoverinfo
    if (marker) trace.marker = marker

    return trace
  }

  /**
   * Build a Plotly scatter trace whose primary role is highlighting points.
   *
   * This is used for labeled iteration points, endpoints, midpoints, and other
   * emphasized markers that share the same structural shape but differ in data
   * and styling.
   *
   * @param {object} options Trace configuration.
   * @param {Array<unknown>} options.x X coordinates.
   * @param {Array<unknown>} options.y Y coordinates.
   * @param {string} options.name Legend label / trace name.
   * @param {Array<unknown>} [options.text] Optional marker labels.
   * @param {string} [options.textposition] Plotly text placement.
   * @param {string} options.color Marker color.
   * @param {number} options.size Marker size.
   * @param {string} [options.symbol="circle"] Plotly marker symbol.
   * @param {string} [options.mode="markers+text"] Plotly scatter mode.
   * @param {boolean} [options.showlegend=true] Whether to show the trace in the legend.
   * @param {string} [options.lineColor="white"] Marker border color.
   * @param {number} [options.lineWidth=1] Marker border width.
   * @returns {object} Plotly scatter trace configuration.
   */
  const createMarkerTrace = ({
    x,
    y,
    name,
    text,
    textposition,
    color,
    size,
    symbol = "circle",
    mode = "markers+text",
    showlegend = true,
    lineColor = "white",
    lineWidth = 1
  }) => ({
    x,
    y,
    type: "scatter",
    mode,
    name,
    text,
    textposition,
    showlegend,
    marker: {
      color,
      size,
      symbol,
      line: {
        color: lineColor,
        width: lineWidth
      }
    }
  })

  /**
   * Public utility surface consumed by the root-finding Quarto pages.
   *
   * Keeping the API explicit makes it easier to grow this helper file as the
   * visualization refactors continue, while still making it obvious which trace
   * constructors are intended for reuse.
   */
  globalThis.VisualMathPlotlyTraceUtils = {
    createLineTrace,
    createMarkerTrace
  }
})(window)
