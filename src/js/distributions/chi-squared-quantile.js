/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Chi-squared quantile: the x with `chiSquaredCdf(x, k) = p`, which is
   * the critical value of a chi-squared test at significance `1 - p`
   * (`chiSquaredQuantile(0.95, 3)` is 7.81). Found by bisection on
   * `chiSquaredCdf`, so it is exact to about 1e-12 relative and costs a
   * hundred or so CDF evaluations -- fine for a critical value, not for a
   * loop over thousands of points.
   *
   * @param {number} p - A probability.
   * @param {number} k - Degrees of freedom; must be `> 0`.
   * @returns {number} `0` at `p = 0`, `Infinity` at `p = 1`, `NaN`
   *   for `p` outside `[0, 1]` or `k <= 0`.
   */
  const chiSquaredQuantile = (p, k) => {
    if (!(k > 0) || !(p >= 0 && p <= 1)) return NaN
    if (p === 0) return 0
    if (p === 1) return Infinity
    const cdf = globalThis.VM.distributions.chiSquaredCdf
    // The mean is k, so [0, k] brackets the median; double the top until
    // it brackets p.
    let lo = 0
    let hi = Math.max(k, 1)
    while (cdf(hi, k) < p) {
      lo = hi
      hi *= 2
    }
    for (let i = 0; i < 200; i++) {
      const mid = 0.5 * (lo + hi)
      if (cdf(mid, k) < p) {
        lo = mid
      } else {
        hi = mid
      }
      if (hi - lo <= 1e-12 * hi) break
    }
    return 0.5 * (lo + hi)
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, chiSquaredQuantile}}
})(window)
