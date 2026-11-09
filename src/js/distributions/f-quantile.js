/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * F quantile: the x with `fCdf(x, d1, d2) = p`, the critical value of an
   * F-test (`fQuantile(0.95, 12, 15)` is 2.475). Found by bisection on
   * `fCdf`, so it is exact to about 1e-12 relative and costs a hundred or
   * so CDF evaluations -- fine for a critical value, not for a loop over
   * thousands of points.
   *
   * @param {number} p - A probability.
   * @param {number} d1 - Numerator degrees of freedom; must be `> 0`.
   * @param {number} d2 - Denominator degrees of freedom; must be `> 0`.
   * @returns {number} `0` at `p = 0`, `Infinity` at `p = 1`, `NaN` for `p`
   *   outside `[0, 1]`, `d1 <= 0` or `d2 <= 0`.
   */
  const fQuantile = (p, d1, d2) => {
    if (!(d1 > 0 && d2 > 0) || !(p >= 0 && p <= 1)) return NaN
    if (p === 0) return 0
    if (p === 1) return Infinity
    const cdf = globalThis.VM.distributions.fCdf
    // The median is near 1 for any degrees of freedom, so [0, 1] brackets
    // it; double the top until it brackets p.
    let lo = 0
    let hi = 1
    while (cdf(hi, d1, d2) < p) {
      lo = hi
      hi *= 2
    }
    for (let i = 0; i < 200; i++) {
      const mid = 0.5 * (lo + hi)
      if (cdf(mid, d1, d2) < p) {
        lo = mid
      } else {
        hi = mid
      }
      if (hi - lo <= 1e-12 * hi) break
    }
    return 0.5 * (lo + hi)
  }

  Object.assign((globalThis.VM ??= {}).distributions ??= {}, {fQuantile})
})(window)
