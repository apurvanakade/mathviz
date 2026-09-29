/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Chi-squared CDF with `k` degrees of freedom -- exactly
   * `regularizedGamma(k / 2, x / 2).lower`.
   *
   * @param {number} x - `0` for `x <= 0`.
   * @param {number} k - Degrees of freedom; must be `> 0`, otherwise `NaN`.
   * @returns {number} In `[0, 1]`.
   */
  const chiSquaredCdf = (x, k) => {
    return globalThis.VM.distributions.regularizedGamma(k / 2, x / 2).lower
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, chiSquaredCdf}}
})(window)
