/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Least Absolute Deviations (L1) fit of a line y = slope*x + intercept
  // through points = [{x, y}, ...], via Iteratively Reweighted Least
  // Squares (IRLS): starting from the ordinary least-squares (L2) fit,
  // repeatedly re-solve a weighted least-squares problem with weights
  // 1/max(|residual|, epsilon). At convergence this minimizes the sum of
  // absolute residuals rather than their squares, since a weighted squared
  // residual weight*residual^2 = residual^2/|residual| = |residual| once
  // weight = 1/|residual|. This is what makes L1 far less sensitive to a
  // few large outliers than L2: an outlier's residual gets downweighted in
  // proportion to its own size, instead of being squared and dominating
  // the fit.
  //
  /**
   * Least-absolute-deviations (L1) line fit, via IRLS seeded from
   * {@link linearRegression}.
   *
   * @param {{x: number, y: number}[]} points - The data, in drawing order.
   * @param {Object} [opts]
   * @param {number} [opts.maxIterations=100] - Cap on reweighting passes.
   * @param {number} [opts.tolerance=1e-10] - Stop once `|Δslope| + |Δintercept|` falls below this.
   * @param {number} [opts.epsilon=1e-6] - Floor on `|residual|` in the weight
   *   `1 / max(|residual|, epsilon)`, so a point the line passes through
   *   exactly doesn't get infinite weight.
   * @returns {{slope: number, intercept: number, xlo: number, xhi: number, iterations: number}|null}
   *   The fit plus the number of passes taken, or `null` if there are fewer
   *   than two points or the seed fit is degenerate. `xlo`/`xhi` are the
   *   first and last point's `x`, as in {@link linearRegression}.
   */
  const l1Regression = (points, opts = {}) => {
    if (points.length < 2) return null

    const maxIterations = opts.maxIterations ?? 100
    const tolerance = opts.tolerance ?? 1e-10
    const epsilon = opts.epsilon ?? 1e-6

    const fitLine = globalThis.VM.numerical.linearRegression
    const seed = fitLine(points)
    if (!seed) return null
    let slope = seed.slope
    let intercept = seed.intercept

    // Each pass is a weighted least-squares fit, done by linearRegression
    // itself so it gets the same centered, cancellation-free sums.
    const weights = new Array(points.length)
    let iterations = 0
    while (iterations < maxIterations) {
      for (let i = 0; i < points.length; i++) {
        const residual = points[i].y - (slope * points[i].x + intercept)
        weights[i] = 1 / Math.max(Math.abs(residual), epsilon)
      }
      const fit = fitLine(points, {weights})
      if (!fit) break
      iterations++

      const change = Math.abs(fit.slope - slope) + Math.abs(fit.intercept - intercept)
      slope = fit.slope
      intercept = fit.intercept
      if (change < tolerance) break
    }

    return {slope, intercept, xlo: points[0].x, xhi: points[points.length - 1].x, iterations}
  }

  Object.assign((globalThis.VM ??= {}).numerical ??= {}, {l1Regression})
})(window)
