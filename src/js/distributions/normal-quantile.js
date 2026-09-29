/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Acklam's rational approximation (relative error ~1e-9), then one Halley
  // step against normalCdf, which brings it to full double precision. The
  // three regions are the lower tail, the center and the upper tail.
  const A = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
    1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00]
  const B = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
    6.680131188771972e+01, -1.328068155288572e+01]
  const C = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
    -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00]
  const D = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
    3.754408661907416e+00]
  const P_LOW = 0.02425

  const tailApprox = (q) => {
    return (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
      ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1)
  }

  const standardQuantile = (p) => {
    let z
    if (p < P_LOW) {
      z = tailApprox(Math.sqrt(-2 * Math.log(p)))
    } else if (p <= 1 - P_LOW) {
      const q = p - 0.5
      const r = q * q
      z = (((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q /
        (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1)
    } else {
      z = -tailApprox(Math.sqrt(-2 * Math.log(1 - p)))
    }
    const error = globalThis.VM.distributions.normalCdf(z) - p
    const u = error * Math.sqrt(2 * Math.PI) * Math.exp(0.5 * z * z)
    return z - u / (1 + 0.5 * z * u)
  }

  /**
   * Normal quantile (inverse CDF): the x with `normalCdf(x, mean, variance)
   * = p`. `normalQuantile(0.975)` is the 1.96 of a 95% confidence
   * interval. Parameterized by **variance**, like `normalPdf`.
   *
   * @param {number} p - A probability.
   * @param {number} [mean=0]
   * @param {number} [variance=1] - Must be `> 0`.
   * @returns {number} `-Infinity` at `p = 0`, `Infinity` at `p = 1`,
   *   `NaN` for `p` outside `[0, 1]` or `variance <= 0`.
   */
  const normalQuantile = (p, mean = 0, variance = 1) => {
    if (!(variance > 0) || !(p >= 0 && p <= 1)) return NaN
    if (p === 0) return -Infinity
    if (p === 1) return Infinity
    return mean + Math.sqrt(variance) * standardQuantile(p)
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, normalQuantile}}
})(window)
