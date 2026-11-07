/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Least-squares fit of a degree-`degree` polynomial
  // y = c0 + c1*x + c2*x^2 + ... + c_degree*x^degree
  // through points = [{x, y}, ...].
  //
  // Two things keep it accurate where the textbook route (normal equations
  // V^T V c = V^T y in the raw powers of x) falls apart:
  // - x is first mapped onto [-1, 1] (t = (x - center) / halfWidth). Raw
  //   powers of x = 100..110 are all nearly parallel columns; powers of t
  //   are not.
  // - The scaled Vandermonde matrix is solved by QR (math.js's qr, then a
  //   triangular solve), not through V^T V, which squares its condition
  //   number. Degree 9 through 11 points at x = 100..110 left a squared
  //   error of 0.41 that way; this way it is at rounding level.
  // `evaluate` works in t, so it keeps that accuracy; `coeffs` are converted
  // back to powers of x for display, which for data far from x = 0 can lose
  // digits that `evaluate` does not.
  //
  /**
   * Least-squares polynomial fit of a given degree.
   *
   * @param {Object} mathjs - A math.js instance (its QR decomposition and
   *   triangular solver do the linear algebra).
   * @param {{x: number, y: number}[]} points - The data.
   * @param {number} degree - Degree of the polynomial; there must be at
   *   least `degree + 1` points.
   * @returns {{coeffs: number[], evaluate: (x: number) => number, totalSquaredError: number}|null}
   *   `coeffs` are `[c0, c1, ..., c_degree]` in increasing power of `x`,
   *   `evaluate` is the fitted polynomial as a function (computed in the
   *   well-conditioned scaled basis, so prefer it to summing `coeffs`
   *   yourself), and `totalSquaredError` is the sum of squared residuals
   *   over `points`. `null` if there are fewer points than coefficients,
   *   fewer distinct x-values than coefficients (the fit isn't unique), or
   *   a non-finite coordinate.
   */
  const polynomialFit = (mathjs, points, degree) => {
    const numCoeffs = degree + 1
    if (!Number.isInteger(degree) || degree < 0 || points.length < numCoeffs) return null

    let lo = Infinity
    let hi = -Infinity
    for (const p of points) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null
      if (p.x < lo) lo = p.x
      if (p.x > hi) hi = p.x
    }
    const center = (lo + hi) / 2
    // All x equal: only a constant is determined; the rank check below
    // rejects anything higher.
    const halfWidth = hi > lo ? (hi - lo) / 2 : 1
    const scaled = x => (x - center) / halfWidth

    const design = []
    const yValues = []
    for (const p of points) {
      const t = scaled(p.x)
      const row = []
      let power = 1
      for (let k = 0; k < numCoeffs; k++) {
        row.push(power)
        power *= t
      }
      design.push(row)
      yValues.push(p.y)
    }

    let Q, R
    try {
      ({Q, R} = mathjs.qr(design))
    } catch (e) {
      return null
    }
    // Rank check on R's diagonal, relative to its largest entry.
    let largest = 0
    for (let k = 0; k < numCoeffs; k++) largest = Math.max(largest, Math.abs(R[k][k]))
    for (let k = 0; k < numCoeffs; k++) {
      if (!(Math.abs(R[k][k]) > 1e-12 * largest)) return null
    }

    // Q^T y, first numCoeffs entries, then back-substitution on R's top block.
    const rhs = []
    for (let k = 0; k < numCoeffs; k++) {
      let sum = 0
      for (let i = 0; i < points.length; i++) sum += Q[i][k] * yValues[i]
      rhs.push(sum)
    }
    const scaledCoeffs = new Array(numCoeffs)
    for (let k = numCoeffs - 1; k >= 0; k--) {
      let sum = rhs[k]
      for (let j = k + 1; j < numCoeffs; j++) sum -= R[k][j] * scaledCoeffs[j]
      scaledCoeffs[k] = sum / R[k][k]
    }

    const evaluate = x => {
      const t = scaled(x)
      let result = 0
      for (let k = numCoeffs - 1; k >= 0; k--) result = result * t + scaledCoeffs[k]
      return result
    }

    // Back to powers of x: t^k = sum_j C(k, j) x^j (-center)^(k-j) / halfWidth^k.
    const coeffs = new Array(numCoeffs).fill(0)
    for (let k = 0; k < numCoeffs; k++) {
      let binomial = 1
      for (let j = 0; j <= k; j++) {
        if (j > 0) binomial = binomial * (k - j + 1) / j
        coeffs[j] += scaledCoeffs[k] * binomial * Math.pow(-center, k - j) / Math.pow(halfWidth, k)
      }
    }

    let totalSquaredError = 0
    for (const p of points) {
      const residual = evaluate(p.x) - p.y
      totalSquaredError += residual * residual
    }

    return {coeffs, evaluate, totalSquaredError}
  }

  Object.assign((globalThis.VM ??= {}).numerical ??= {}, {polynomialFit})
})(window)
