/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Student's t quantile: the t with `studentTCdf(t, k) = p`, the critical
   * value of a t-test (`studentTQuantile(0.975, 15)` is 2.131). Found by
   * bisection on the upper half and reflected (the distribution is
   * symmetric about 0), so it is exact to about 1e-12 relative and costs a
   * hundred or so CDF evaluations -- fine for a critical value, not for a
   * loop over thousands of points.
   *
   * @param {number} p - A probability.
   * @param {number} k - Degrees of freedom; must be `> 0`.
   * @returns {number} `-Infinity` at `p = 0`, `0` at `p = 0.5`, `Infinity`
   *   at `p = 1`, `NaN` for `p` outside `[0, 1]` or `k <= 0`.
   */
  const studentTQuantile = (p, k) => {
    if (!(k > 0) || !(p >= 0 && p <= 1)) return NaN
    if (p === 0) return -Infinity
    if (p === 1) return Infinity
    if (p === 0.5) return 0
    const cdf = globalThis.VM.distributions.studentTCdf
    // Search for the upper-tail point with tail area q = min(p, 1 - p),
    // comparing tails (cdf(-t)) rather than cdf(t) against 1 - q, so a
    // tiny q keeps its precision.
    const q = Math.min(p, 1 - p)
    let lo = 0
    let hi = 1
    while (cdf(-hi, k) > q) {
      lo = hi
      hi *= 2
    }
    for (let i = 0; i < 200; i++) {
      const mid = 0.5 * (lo + hi)
      if (cdf(-mid, k) > q) {
        lo = mid
      } else {
        hi = mid
      }
      if (hi - lo <= 1e-12 * hi) break
    }
    const t = 0.5 * (lo + hi)
    return p < 0.5 ? -t : t
  }

  Object.assign((globalThis.VM ??= {}).distributions ??= {}, {studentTQuantile})
})(window)
