/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Student's t CDF: P(T <= t) for T with `k` degrees of freedom, through
   * the regularized incomplete beta function,
   * P(|T| >= |t|) = I_{k/(k+t²)}(k/2, 1/2). Relatively accurate far into
   * either tail: `studentTCdf(-40, 5)` is a small number, not 0, so
   * `1 - studentTCdf(t, k)` is the wrong way to get an upper tail -- use
   * `studentTCdf(-t, k)`, the same number by symmetry, computed directly.
   *
   * @param {number} t - Any real; `±Infinity` give `1`/`0`.
   * @param {number} k - Degrees of freedom; must be `> 0` (need not be an
   *   integer, as Welch's test needs).
   * @returns {number} In `[0, 1]`; `NaN` for `k <= 0` or a `NaN` input.
   */
  const studentTCdf = (t, k) => {
    if (!(k > 0) || Number.isNaN(t)) return NaN
    if (t === Infinity) return 1
    if (t === -Infinity) return 0
    // I_{k/(k+t²)}(k/2, 1/2) is the two-tailed probability P(|T| >= |t|),
    // and small exactly when |t| is large, so the tail is computed directly.
    const tail = 0.5 * globalThis.VM.distributions.regularizedBeta(k / 2, 0.5, k / (k + t * t)).lower
    return t > 0 ? 1 - tail : tail
  }

  Object.assign((globalThis.VM ??= {}).distributions ??= {}, {studentTCdf})
})(window)
