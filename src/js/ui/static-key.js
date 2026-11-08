/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // The key under a simple Observable Plot figure (a convergence or error
  // plot). Plot.legend names series by color only -- every swatch is a
  // solid square -- so a dashed reference line, a shaded band and a solid
  // curve in the same color were indistinguishable in it. Each swatch here
  // is a small SVG drawn with the same options the mark was given, so the
  // key shows what the chart shows. The option names are Plot's own
  // (`stroke`, `strokeDasharray`, `fillOpacity`, `r`, ...), and so are the
  // defaults, so an item can be the mark's options copied over.
  //
  // It is static on purpose: a figure the reader reads rather than explores
  // has nothing to toggle (an app's Plotly chart has VM.ui.legendOverlay).
  // Styled by static-key.css; colors are taken as given, so a cell that
  // builds a key from chartColors re-runs on a theme toggle like the chart.

  const SVG_NS = "http://www.w3.org/2000/svg"
  const SWATCH_HEIGHT = 12

  // Plot's defaults for each mark, so an item copied from a mark's options
  // draws the same with or without the defaults spelled out.
  const DEFAULTS = {
    line: {stroke: "currentColor", strokeWidth: 1.5},
    area: {fill: "currentColor"},
    dot: {r: 3, strokeWidth: 1.5}
  }

  const MARK_OPTIONS = ["stroke", "strokeWidth", "strokeDasharray", "strokeOpacity", "fill", "fillOpacity", "r"]

  const markSpecs = (item) => {
    if (item.marks) return item.marks
    const spec = {mark: item.mark}
    for (const key of MARK_OPTIONS) if (item[key] !== undefined) spec[key] = item[key]
    return [spec]
  }

  // Plot.dot: an unfilled dot is stroked in currentColor; a filled one has
  // no stroke unless it asks for one.
  const dotPaint = (spec) => spec.fill === undefined
    ? {fill: "none", stroke: spec.stroke ?? "currentColor"}
    : {fill: spec.fill, stroke: spec.stroke ?? "none"}

  const svgElement = (tag, attrs) => {
    const el = document.createElementNS(SVG_NS, tag)
    for (const [name, value] of Object.entries(attrs)) {
      if (value !== undefined) el.setAttribute(name, String(value))
    }
    return el
  }

  const drawMark = (spec, width, height) => {
    const mark = spec.mark ?? "line"
    if (!(mark in DEFAULTS)) throw new TypeError(`staticKey: unknown mark "${mark}" (use "line", "area" or "dot")`)
    const s = {...DEFAULTS[mark], ...spec}
    const stroke = {
      "stroke-width": s.strokeWidth,
      "stroke-dasharray": s.strokeDasharray,
      "stroke-opacity": s.strokeOpacity
    }
    const mid = height / 2
    if (mark === "line") {
      return svgElement("line", {
        x1: 1, y1: mid, x2: width - 1, y2: mid,
        stroke: s.stroke, "stroke-linecap": "round", ...stroke
      })
    }
    if (mark === "area") {
      // The band fills the swatch's middle, not its full height, so it
      // reads as the same size as the text beside it.
      const inset = (height - SWATCH_HEIGHT) / 2 + 1
      return svgElement("rect", {
        x: 0, y: inset, width, height: height - 2 * inset,
        fill: s.fill, "fill-opacity": s.fillOpacity,
        stroke: s.stroke ?? "none", ...stroke
      })
    }
    const paint = dotPaint(s)
    return svgElement("circle", {
      cx: width / 2, cy: mid, r: s.r,
      fill: paint.fill, "fill-opacity": s.fillOpacity, stroke: paint.stroke, ...stroke
    })
  }

  /**
   * A key for an Observable Plot figure whose swatches show each series'
   * line style -- dashes, width, a shaded band, a dot -- not just its
   * color. Append it next to the chart (`figure.append(chart, key)`).
   *
   * @param {Array<Object>} items - One row each, in order. Each item is
   *   `{label, mark, ...options}`, or `{label, marks: [...]}` for a swatch
   *   drawn as several marks on top of each other (a band with its mean
   *   line, a line with dots), each `{mark, ...options}`.
   * @param {string} items[].label - The series name shown beside the swatch.
   * @param {("line"|"area"|"dot")} [items[].mark="line"] - What to draw:
   *   a horizontal line, a filled rectangle, or a dot in the middle.
   * @param {string} [items[].stroke] - Line color; for a dot, its outline.
   *   Defaults as in Plot: `"currentColor"` for a line and for an unfilled
   *   dot, none for an area or a filled dot.
   * @param {number} [items[].strokeWidth=1.5]
   * @param {string} [items[].strokeDasharray] - e.g. `"6,4"`.
   * @param {number} [items[].strokeOpacity]
   * @param {string} [items[].fill] - Area or dot fill (`"currentColor"`
   *   for an area by default; an unfilled dot is hollow).
   * @param {number} [items[].fillOpacity]
   * @param {number} [items[].r=3] - A dot's radius; the swatch grows to fit.
   * @param {Object} [options]
   * @param {number} [options.swatchWidth=28] - Swatch width in px, wide
   *   enough to show two periods of a `"6,4"` dash.
   * @returns {HTMLDivElement} `<div class="vm-static-key">` holding one
   *   `<span class="vm-static-key-item">` per item: an `aria-hidden` `<svg>`
   *   swatch, then a `<span>` with the label. Colors are used as given (not
   *   validated). Throws a `TypeError` on a `mark` other than the three.
   */
  const staticKey = (items, options = {}) => {
    const width = options.swatchWidth ?? 28
    const root = document.createElement("div")
    root.className = "vm-static-key"
    for (const item of items) {
      const specs = markSpecs(item)
      // A dot bigger than the swatch makes the swatch taller rather than
      // being clipped; every other mark fits the default height.
      let height = SWATCH_HEIGHT
      for (const spec of specs) {
        if ((spec.mark ?? "line") !== "dot") continue
        const r = spec.r ?? DEFAULTS.dot.r
        const sw = spec.strokeWidth ?? DEFAULTS.dot.strokeWidth
        height = Math.max(height, Math.ceil(2 * r + sw))
      }
      const svg = svgElement("svg", {width, height, viewBox: `0 0 ${width} ${height}`, "aria-hidden": "true"})
      for (const spec of specs) svg.append(drawMark(spec, width, height))

      const text = document.createElement("span")
      text.textContent = item.label

      const row = document.createElement("span")
      row.className = "vm-static-key-item"
      row.append(svg, text)
      root.append(row)
    }
    return root
  }

  Object.assign((globalThis.VM ??= {}).ui ??= {}, {staticKey})
})(window)
