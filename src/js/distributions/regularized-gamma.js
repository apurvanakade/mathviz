/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // The one special function behind every CDF in this folder that isn't a
  // closed form: the chi-squared CDF is P(k/2, x/2) and the normal CDF is
  // P(1/2, z²/2). Both halves are returned because each is computed
  // directly where it is accurate -- the series for P below a + 1, the
  // continued fraction for Q above it -- so a tail probability like
  // Q(0.5, 32) (the normal beyond 8 sd) doesn't come out as 1 - 1 = 0.
  // Numerical Recipes' gser/gcf, with the modified Lentz method.
  const EPS = 1e-15
  const TINY = 1e-300
  const MAX_ITER = 500

  const lowerSeries = (a, x, logPrefactor) => {
    let term = 1 / a
    let sum = term
    let ap = a
    for (let n = 0; n < MAX_ITER; n++) {
      ap += 1
      term *= x / ap
      sum += term
      if (Math.abs(term) < Math.abs(sum) * EPS) break
    }
    return sum * Math.exp(logPrefactor)
  }

  const upperContinuedFraction = (a, x, logPrefactor) => {
    let b = x + 1 - a
    let c = 1 / TINY
    let d = 1 / b
    let h = d
    for (let i = 1; i <= MAX_ITER; i++) {
      const an = -i * (i - a)
      b += 2
      d = an * d + b
      if (Math.abs(d) < TINY) d = TINY
      c = b + an / c
      if (Math.abs(c) < TINY) c = TINY
      d = 1 / d
      const delta = d * c
      h *= delta
      if (Math.abs(delta - 1) < EPS) break
    }
    return h * Math.exp(logPrefactor)
  }

  /**
   * The regularized incomplete gamma functions P(a, x) (the lower one) and
   * Q(a, x) = 1 - P(a, x) (the upper one). P(a, x) is the CDF at x of a
   * Gamma(shape a, rate 1) variable, so `regularizedGamma(shape, rate * x)`
   * is the Gamma(shape, rate) CDF and `regularizedGamma(k / 2, x / 2)` the
   * chi-squared one.
   *
   * @param {number} a - Shape; must be `> 0`.
   * @param {number} x - Must be `>= 0`.
   * @returns {{lower: number, upper: number}} `lower` = P(a, x) and
   *   `upper` = Q(a, x), each accurate on its own in the tail where the
   *   other is close to 1. `{lower: 0, upper: 1}` for `x <= 0`;
   *   `{lower: NaN, upper: NaN}` for `a <= 0` or a non-finite input.
   */
  const regularizedGamma = (a, x) => {
    if (!(a > 0) || Number.isNaN(x)) return {lower: NaN, upper: NaN}
    if (x <= 0) return {lower: 0, upper: 1}
    if (x === Infinity) return {lower: 1, upper: 0}
    const logPrefactor = a * Math.log(x) - x - globalThis.VM.distributions.logGamma(a)
    if (x < a + 1) {
      const lower = lowerSeries(a, x, logPrefactor)
      return {lower, upper: 1 - lower}
    }
    const upper = upperContinuedFraction(a, x, logPrefactor)
    return {lower: 1 - upper, upper}
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, regularizedGamma}}
})(window)
