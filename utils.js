/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  const normalize = text => String(text).trim().replaceAll("π", "pi")

  // Returns a JS function (x => number) or null if the expression can't be parsed.
  // The returned function returns NaN on evaluation errors.
  const makeFunction = (mathjs, expr) => {
    try {
      const compiled = mathjs.compile(normalize(expr))
      return x => {
        try { return Number(compiled.evaluate({x})) } catch { return NaN }
      }
    } catch {
      return null
    }
  }

  // Like makeFunction but returns the symbolic derivative df/dx.
  const makeDerivative = (mathjs, expr) => {
    try {
      const compiled = mathjs.derivative(normalize(expr), "x").compile()
      return x => {
        try { return Number(compiled.evaluate({x})) } catch { return NaN }
      }
    } catch {
      return null
    }
  }

  // Returns {lo, hi} padded axis range from an array of values.
  const paddedRange = (values, {emptyRange = [-1, 1], singularPadding = 1, relativePadding = 0.1, minPadding = 0.5} = {}) => {
    const finite = values.filter(Number.isFinite).map(Number)
    if (finite.length === 0) return {lo: emptyRange[0], hi: emptyRange[1]}
    let lo = Math.min(...finite)
    let hi = Math.max(...finite)
    if (lo === hi) { lo -= singularPadding; hi += singularPadding }
    const pad = Math.max(relativePadding * (hi - lo), minPadding)
    return {lo: lo - pad, hi: hi + pad}
  }

  // Returns a DOM table node, styled entirely with Bootstrap utility classes:
  // table/table-sm/table-bordered for structure, small for compact text, and
  // per-column text-center/text-end + text-nowrap for the numeric data
  // (the first column is the iteration number; the rest are numeric).
  const renderTable = ({html, headers, rows}) => {
    const cellClass = i => `text-nowrap ${i === 0 ? "text-center" : "text-end"}`
    return html`
      <div class="ojs-table-container"><table class="table table-sm table-bordered small">
        <thead><tr>${headers.map((h, i) => html`<th class="${cellClass(i)}">${h}</th>`)}</tr></thead>
        <tbody>${rows.map(row => html`<tr>${row.map((cell, i) => html`<td class="${cellClass(i)}">${cell}</td>`)}</tr>`)}</tbody>
      </table></div>`
  }

  globalThis.VM = {makeFunction, makeDerivative, paddedRange, renderTable}
})(window)
