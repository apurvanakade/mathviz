/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Two rules make the reported order match the textbook one.
  // Errors at rounding level are noise, not convergence: left in, they
  // flatten the line (a method exact on the problem would report order 0).
  // And the first few n are pre-asymptotic: a fit over every n reported
  // explicit Euler at order 5 on a stiff ODE. Fitting only the second half
  // of the run, n ≥ max/2, keeps the line on the part that has settled.
  /**
   * The observed order of convergence of a method run at n = 1, 2, …, max:
   * the points of its log-log error-vs-n plot and the least-squares line
   * through their tail, whose negated slope is the order.
   *
   * @param {Object[]} rows - One row per n, each with a numeric `n` and the
   *   error under `errorKey`. Rows whose error isn't finite are skipped.
   * @param {number} reference - The exact value the errors are measured
   *   against. It only sets the rounding floor, `1e-12 * max(1, |reference|)`.
   * @param {string} errorKey - The row field holding the error. Its
   *   absolute value is used, so a signed error (approx - exact) works too.
   * @returns {{points: {x: number, y: number}[],
   *   fit: {slope: number, intercept: number, xlo: number, xhi: number}|null,
   *   order: number, exact: boolean, exactFromN: number|null}}
   *   - `points`: `{x: log10 n, y: log10 error}` for every error above the
   *     floor, in row order.
   *   - `fit`: `linearRegression` over the points with n ≥ (largest n) / 2,
   *     or `null` (exact, or fewer than two such points). Its x is log10 n,
   *     and `xlo`/`xhi` are the first and last tail point's x, so the
   *     segment they describe spans the fitted tail.
   *   - `order`: `-fit.slope`, or `NaN` without a fit.
   *   - `exact`: every finite error is at or below the floor. `false` when
   *     there are no finite errors at all.
   *   - `exactFromN`: the n from which every later finite error is at or
   *     below the floor, or `null` if the last one isn't.
   */
  const convergenceFit = (rows, reference, errorKey) => {
    const roundoffFloor = 1e-12 * Math.max(1, Math.abs(reference))
    let maxN = 0
    for (const row of rows) {
      if (row.n > maxN) maxN = row.n
    }
    const tailStart = Math.log10(maxN / 2)

    const points = []
    const tail = []
    let finiteErrors = 0
    let exactFromN = null
    for (const row of rows) {
      const error = Math.abs(row[errorKey])
      if (!Number.isFinite(error)) continue
      finiteErrors++
      if (error <= roundoffFloor) {
        if (exactFromN === null) exactFromN = row.n
        continue
      }
      exactFromN = null
      const point = {x: Math.log10(row.n), y: Math.log10(error)}
      points.push(point)
      if (point.x >= tailStart) tail.push(point)
    }

    const exact = finiteErrors > 0 && points.length === 0
    let fit = null
    if (!exact) fit = globalThis.VM.numerical.linearRegression(tail)
    let order = NaN
    if (fit) order = -fit.slope
    return {points, fit, order, exact, exactFromN}
  }

  globalThis.VM = {...globalThis.VM, numerical: {...globalThis.VM?.numerical, convergenceFit}}
})(window)
