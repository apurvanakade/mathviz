/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * F CDF: P(X <= x) for X ~ F(d1, d2), the distribution of a ratio of two
   * independent chi-squared variables each divided by its degrees of
   * freedom (numerator `d1` first). It is
   * I_{d1·x/(d1·x+d2)}(d1/2, d2/2). `1 - fCdf(x, d1, d2)` is an upper-tail
   * probability (the p-value of a variance-ratio test or an ANOVA) to
   * about 1e-16 absolute; for a smaller one with its relative precision,
   * take `regularizedBeta(d1 / 2, d2 / 2, d1 * x / (d1 * x + d2)).upper`.
   *
   * @param {number} x - Values `<= 0` give `0`; `Infinity` gives `1`.
   * @param {number} d1 - Numerator degrees of freedom; must be `> 0`.
   * @param {number} d2 - Denominator degrees of freedom; must be `> 0`.
   * @returns {number} In `[0, 1]`; `NaN` for `d1 <= 0`, `d2 <= 0` or a
   *   `NaN` input.
   */
  const fCdf = (x, d1, d2) => {
    if (!(d1 > 0 && d2 > 0) || Number.isNaN(x)) return NaN
    if (x <= 0) return 0
    if (x === Infinity) return 1
    return globalThis.VM.distributions.regularizedBeta(d1 / 2, d2 / 2, d1 * x / (d1 * x + d2)).lower
  }

  Object.assign((globalThis.VM ??= {}).distributions ??= {}, {fCdf})
})(window)
