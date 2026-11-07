/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Centered (two-pass) sums rather than the one-pass `n·Σx² − (Σx)²`: that
  // textbook form subtracts two nearly equal numbers whenever the x-values
  // sit far from 0 relative to their spread, and with x = 1e9 + i it came
  // out exactly 0 -- a perfectly good fit reported as vertical. Centering
  // first keeps every term on the scale of the spread itself.
  /**
   * Least-squares fit of a line `y = slope*x + intercept`, optionally
   * weighted. Every convergence-order plot uses this on `(log h, log error)`
   * pairs, where the slope is the observed order.
   *
   * @param {{x: number, y: number}[]} points - The data, in the order the
   *   fitted segment should be drawn.
   * @param {Object} [opts]
   * @param {number[]} [opts.weights] - One non-negative weight per point
   *   (weighted least squares); every point weighs 1 when omitted. Not
   *   validated beyond its total being positive.
   * @returns {{slope: number, intercept: number, xlo: number, xhi: number}|null}
   *   The fit, or `null` if there are fewer than two points, the weights
   *   don't sum to a positive number, or the x-values don't vary (a
   *   vertical, degenerate fit). Accurate however far the x-values sit from
   *   0. `xlo`/`xhi` are the **first and last** point's `x` -- not the min
   *   and max -- so the segment they describe covers the data only when
   *   `points` is sorted.
   */
  const linearRegression = (points, opts = {}) => {
    const pointCount = points.length
    if (pointCount < 2) return null
    const weights = opts.weights
    const weight = (i) => (weights === undefined ? 1 : weights[i])

    let sw = 0, swx = 0, swy = 0
    for (let i = 0; i < pointCount; i++) {
      const w = weight(i)
      sw += w
      swx += w * points[i].x
      swy += w * points[i].y
    }
    if (!(sw > 0)) return null
    const meanX = swx / sw
    const meanY = swy / sw

    let sxx = 0, sxy = 0
    for (let i = 0; i < pointCount; i++) {
      const w = weight(i)
      const dx = points[i].x - meanX
      sxx += w * dx * dx
      sxy += w * dx * (points[i].y - meanY)
    }
    if (!(sxx > 0)) return null

    const slope = sxy / sxx
    const intercept = meanY - slope * meanX
    return {slope, intercept, xlo: points[0].x, xhi: points[pointCount - 1].x}
  }

  Object.assign((globalThis.VM ??= {}).numerical ??= {}, {linearRegression})
})(window)
