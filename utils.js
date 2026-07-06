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

  // Appends all finite values from `values` to `arr`. Optional maxAbs cap.
  const pushFiniteValues = (arr, values, {maxAbs = Infinity} = {}) => {
    for (const v of values) {
      if (Number.isFinite(v) && Math.abs(v) <= maxAbs) arr.push(Number(v))
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

  // Returns a DOM table node styled with the shared ojs-table classes.
  const renderTable = ({html, headers, rows}) => html`
    <div class="ojs-table-container"><table class="ojs-table">
      <thead><tr>${headers.map(h => html`<th>${h}</th>`)}</tr></thead>
      <tbody>${rows.map(row => html`<tr>${row.map(cell => html`<td>${cell}</td>`)}</tr>`)}</tbody>
    </table></div>`

  globalThis.VM = {makeFunction, makeDerivative, pushFiniteValues, paddedRange, renderTable}
})(window)
