/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  // Lanczos approximation (g=7, n=9) to ln(Gamma(x)) for x > 0. Used instead
  // of Math.log(math.gamma(x)) because Gamma(x) itself overflows
  // Number.MAX_VALUE past x ~ 171 -- binomial coefficients and the
  // gamma/beta/t/F densities on this page need x well past that.
  const lanczosCoefficients = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ]

  /**
   * Natural log of the Gamma function, ln Γ(x), by Lanczos approximation
   * (g = 7, n = 9; reflection formula below 0.5). Every factorial and
   * Beta-function normalizing constant in `VM.distributions` goes through
   * this in log space, which is why `binomialPmf(k, 500, p)` doesn't
   * overflow on the way to a perfectly ordinary answer.
   *
   * @param {number} x - Any real number.
   * @returns {number} ln |Γ(x)| -- the log of the absolute value, since Γ is
   *   negative on (-1, 0), (-3, -2), ... -- accurate to ~15 significant
   *   digits for `x > 0`. `Infinity` at the poles (`0` and the negative
   *   integers), `NaN` for `NaN`.
   */
  const logGamma = (x) => {
    if (x <= 0 && Number.isInteger(x)) return Infinity
    if (x < 0.5) {
      // Reflection formula: Gamma(x) * Gamma(1-x) = pi / sin(pi*x). The
      // absolute value because Gamma(x) < 0 where sin(pi*x) < 0 (x in
      // (-1, 0), (-3, -2), ...), and the log of a negative number is NaN.
      return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - logGamma(1 - x)
    }
    const y = x - 1
    const t = y + 7.5
    let a = lanczosCoefficients[0]
    for (let i = 1; i < 9; i++) a += lanczosCoefficients[i] / (y + i)
    return 0.5 * Math.log(2 * Math.PI) + (y + 0.5) * Math.log(t) - t + Math.log(a)
  }

  /**
   * Natural log of the binomial coefficient, ln C(n, k), through
   * {@link logGamma} -- so it stays finite where C(n, k) itself overflows
   * (C(2000, 1000) has 600 digits). The building block of the binomial,
   * negative binomial and hypergeometric PMFs.
   *
   * @param {number} n
   * @param {number} k
   * @returns {number} `logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1)`.
   *   `-Infinity` when `k < 0` or `k > n` for integer `n`, `k` (C is 0
   *   there); otherwise not validated, so real arguments give the gamma-
   *   function generalization.
   */
  const logChoose = (n, k) => {
    if (Number.isInteger(n) && Number.isInteger(k) && (k < 0 || k > n)) return -Infinity
    return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1)
  }

  Object.assign((globalThis.VM ??= {}).distributions ??= {}, {logGamma, logChoose})
})(window)
