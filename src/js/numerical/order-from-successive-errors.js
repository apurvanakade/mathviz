/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // The order p of an iteration with e_{k+1} ≈ C·e_k^p is the slope of
  // log e_{k+1} against log e_k. Two rules keep that slope honest.
  // Errors at rounding level are dropped: once the iterates stop changing,
  // each pair sits near (-16, -16) and pulls the slope toward 1.
  // And only the trailing run of pairs whose error shrinks is fitted: a run
  // that diverges or wanders has no order to report, and the steps before
  // the method settles skew the slope.
  /**
   * The observed order of convergence of one run of an iterative method
   * (Newton, secant, ...), from its successive errors: the points
   * `(log10 e_k, log10 e_{k+1})` and the least-squares line through the
   * trailing run where the error shrinks. The order is the line's slope.
   *
   * @param {Object[]} rows - One row per step, in order.
   * @param {string} errorKey - The row field holding the error after that
   *   step (for a method with no known root, the step size
   *   `|x_{k+1} - x_k|`). Its absolute value is used; a non-finite error
   *   breaks the run there.
   * @param {string} [scaleKey] - The row field holding the size of the
   *   value the error is measured against (`x_{k+1}` for a root finder).
   *   Row k's error counts as rounding level when it is at or below
   *   `1e-12 * max(1, |row[scaleKey]|)`. Omitted, every scale is 1.
   * @returns {{points: {x: number, y: number}[],
   *   fit: {slope: number, intercept: number, xlo: number, xhi: number}|null,
   *   order: number}}
   *   - `points`: one per pair of consecutive rows whose errors are both
   *     above rounding level, in step order.
   *   - `fit`: `linearRegression` over the trailing points with y < x (the
   *     error shrank), or `null` when fewer than two trail the run (it
   *     diverged, cycled or stopped too soon). `xlo`/`xhi` are the first and
   *     last fitted point's x.
   *   - `order`: `fit.slope`, or `NaN` without a fit.
   */
  const orderFromSuccessiveErrors = (rows, errorKey, scaleKey) => {
    const errors = []
    const aboveFloor = []
    for (const row of rows) {
      const scale = scaleKey === undefined ? 1 : Math.abs(row[scaleKey])
      const roundoffFloor = 1e-12 * Math.max(1, scale)
      const error = Math.abs(row[errorKey])
      errors.push(error)
      aboveFloor.push(Number.isFinite(error) && error > roundoffFloor)
    }

    const points = []
    for (let k = 0; k < errors.length - 1; k++) {
      if (aboveFloor[k] && aboveFloor[k + 1]) {
        points.push({x: Math.log10(errors[k]), y: Math.log10(errors[k + 1])})
      }
    }

    let tailStart = points.length
    while (tailStart > 0 && points[tailStart - 1].y < points[tailStart - 1].x) tailStart--
    const fit = globalThis.VM.numerical.linearRegression(points.slice(tailStart))
    let order = NaN
    if (fit) order = fit.slope
    return {points, fit, order}
  }

  globalThis.VM = {...globalThis.VM, numerical: {...globalThis.VM?.numerical, orderFromSuccessiveErrors}}
})(window)
