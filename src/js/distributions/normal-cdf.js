/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Normal CDF P(X <= x) for X ~ Normal(mean, variance) -- parameterized by
   * **variance**, like `normalPdf`. Accurate to about 1e-15 absolute, and
   * relatively accurate far into either tail (`normalCdf(-10)` is about
   * 7.6e-24, not 0), because the tail comes straight from the upper
   * incomplete gamma function rather than from `1 - (something near 1)`.
   *
   * @param {number} x
   * @param {number} [mean=0]
   * @param {number} [variance=1] - Must be `> 0`; otherwise `NaN`.
   * @returns {number} In `[0, 1]`.
   */
  const normalCdf = (x, mean = 0, variance = 1) => {
    if (!(variance > 0)) return NaN
    const z = (x - mean) / Math.sqrt(variance)
    // P(|Z| <= |z|) = P(1/2, z²/2), so the tail beyond |z| is half of Q.
    const tail = 0.5 * globalThis.VM.distributions.regularizedGamma(0.5, 0.5 * z * z).upper
    if (z < 0) return tail
    return 1 - tail
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, normalCdf}}
})(window)
