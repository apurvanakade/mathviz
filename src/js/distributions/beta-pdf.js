/**
 * Copyright (c) 2026 Dhruv Azad. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Dhruv Azad
 */

(function attachVM(globalThis) {
  /**
   * Beta density on `[0, 1]`.
   *
   * @param {number} x - `0` outside `[0, 1]`. At an endpoint, the density's
   *   limit there: at `x = 0` it is `b` for `a = 1` (so `betaPdf(0, 1, 1)`
   *   is `1`), `Infinity` for `a < 1` and `0` for `a > 1`; `x = 1` is the
   *   same with `a` and `b` swapped.
   * @param {number} a - First shape parameter; must be `> 0`.
   * @param {number} b - Second shape parameter; must be `> 0`.
   * @returns {number}
   */
  const betaPdf = (x, a, b) => {
    if (x < 0 || x > 1 || a <= 0 || b <= 0) return 0
    // The endpoint limits. At x = 0 the density is x^(a-1) times a factor
    // that tends to 1/B(1, b) = b when a = 1.
    if (x === 0 || x === 1) {
      const near = x === 0 ? a : b
      const far = x === 0 ? b : a
      if (near === 1) return far
      return near < 1 ? Infinity : 0
    }
    const logGamma = globalThis.VM.distributions.logGamma
    const logB = logGamma(a) + logGamma(b) - logGamma(a + b)
    const logPdf = (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - logB
    return Math.exp(logPdf)
  }

  Object.assign((globalThis.VM ??= {}).distributions ??= {}, {betaPdf})
})(window)
