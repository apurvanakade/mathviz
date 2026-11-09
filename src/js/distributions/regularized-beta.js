/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // The special function behind the Student's t and F CDFs, as
  // regularizedGamma is behind the normal and chi-squared ones. Both halves
  // are returned for the same reason: the continued fraction converges fast
  // only for x below the mean-ish point (a + 1) / (a + b + 2), so above it
  // the function is evaluated through I_x(a, b) = 1 - I_{1-x}(b, a), and
  // whichever side was computed directly keeps its relative precision. A
  // p-value of 1e-20 from a t-test is the upper half, not 1 - (1 - 1e-20).
  // Numerical Recipes' betacf, with the modified Lentz method.
  const EPS = 1e-15
  const TINY = 1e-300
  const MAX_ITER = 500

  const continuedFraction = (a, b, x) => {
    const qab = a + b
    const qap = a + 1
    const qam = a - 1
    let c = 1
    let d = 1 - qab * x / qap
    if (Math.abs(d) < TINY) d = TINY
    d = 1 / d
    let h = d
    for (let m = 1; m <= MAX_ITER; m++) {
      const m2 = 2 * m
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2))
      d = 1 + aa * d
      if (Math.abs(d) < TINY) d = TINY
      c = 1 + aa / c
      if (Math.abs(c) < TINY) c = TINY
      d = 1 / d
      h *= d * c
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
      d = 1 + aa * d
      if (Math.abs(d) < TINY) d = TINY
      c = 1 + aa / c
      if (Math.abs(c) < TINY) c = TINY
      d = 1 / d
      const delta = d * c
      h *= delta
      if (Math.abs(delta - 1) < EPS) break
    }
    return h
  }

  /**
   * The regularized incomplete beta function I_x(a, b) (the lower one) and
   * 1 - I_x(a, b) (the upper one). I_x(a, b) is the CDF at x of a
   * Beta(a, b) variable; the Student's t and F CDFs are built on it.
   *
   * @param {number} a - Must be `> 0`.
   * @param {number} b - Must be `> 0`.
   * @param {number} x - In `[0, 1]`; values outside are clamped.
   * @returns {{lower: number, upper: number}} `lower` = I_x(a, b) and
   *   `upper` = 1 - I_x(a, b), each accurate on its own in the tail where
   *   the other is close to 1. `{lower: 0, upper: 1}` for `x <= 0`,
   *   `{lower: 1, upper: 0}` for `x >= 1`; `{lower: NaN, upper: NaN}` for
   *   `a <= 0`, `b <= 0` or a `NaN` input.
   */
  const regularizedBeta = (a, b, x) => {
    if (!(a > 0 && b > 0) || Number.isNaN(x)) return {lower: NaN, upper: NaN}
    if (x <= 0) return {lower: 0, upper: 1}
    if (x >= 1) return {lower: 1, upper: 0}
    const logGamma = globalThis.VM.distributions.logGamma
    const logPrefactor = logGamma(a + b) - logGamma(a) - logGamma(b) +
      a * Math.log(x) + b * Math.log1p(-x)
    if (x < (a + 1) / (a + b + 2)) {
      const lower = Math.exp(logPrefactor) * continuedFraction(a, b, x) / a
      return {lower, upper: 1 - lower}
    }
    const upper = Math.exp(logPrefactor) * continuedFraction(b, a, 1 - x) / b
    return {lower: 1 - upper, upper}
  }

  Object.assign((globalThis.VM ??= {}).distributions ??= {}, {regularizedBeta})
})(window)
