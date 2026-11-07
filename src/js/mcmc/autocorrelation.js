/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // The shared estimator: whole-series mean, the lag-0 sum of squares as
  // the denominator (the biased estimator, so every value lies in [-1, 1]),
  // and one lag computed on demand. Returns null for a series that is
  // constant up to rounding: the computed mean is off by up to about
  // n * eps * max|v|, so such a series can still leave a denominator of
  // rounding noise, which would otherwise come out as autocorrelations of
  // noise over noise.
  const acfEstimator = (values) => {
    const n = values.length
    let mean = 0
    for (const v of values) mean += v
    mean /= n
    const centered = new Float64Array(n)
    let denom = 0
    let maxAbs = 0
    for (let t = 0; t < n; t++) {
      centered[t] = values[t] - mean
      denom += centered[t] * centered[t]
      if (Math.abs(values[t]) > maxAbs) maxAbs = Math.abs(values[t])
    }
    const noise = n * Number.EPSILON * maxAbs
    if (!(denom > n * noise * noise)) return null
    return (lag) => {
      let num = 0
      for (let t = lag; t < n; t++) num += centered[t] * centered[t - lag]
      return num / denom
    }
  }

  /**
   * Sample autocorrelation function of a series, the standard MCMC mixing
   * diagnostic: `acf[k]` is the correlation between `x[t]` and `x[t + k]`,
   * using the whole-series mean and the lag-0 sum of squares as the
   * denominator (the biased estimator, so every value lies in `[-1, 1]`).
   *
   * @param {number[]} values - The series, e.g. one coordinate of a chain.
   * @param {number} [maxLag=50] - Largest lag returned; capped at
   *   `values.length - 1`.
   * @returns {number[]} `acf[0..maxLag]`, with `acf[0] = 1`. A constant
   *   series (zero variance) returns `[1, 0, 0, ...]` rather than `NaN`s,
   *   and an empty or one-element series returns `[1]`. "Constant" is judged
   *   relative to the values' own magnitude, so rescaling a series never
   *   changes its autocorrelations.
   */
  const autocorrelation = (values, maxLag = 50) => {
    const n = values.length
    if (n < 2) return [1]
    const lagMax = Math.min(maxLag, n - 1)
    const out = new Array(lagMax + 1).fill(0)
    out[0] = 1
    const rhoAt = acfEstimator(values)
    if (rhoAt === null) return out
    for (let lag = 1; lag <= lagMax; lag++) out[lag] = rhoAt(lag)
    return out
  }

  /**
   * Effective sample size of a correlated series,
   * `n / (1 + 2 * (rho_1 + rho_2 + ...))`, summing the autocorrelations
   * up to (not including) the first one that is `<= 0`. Truncating there is
   * what keeps the noisy tail of the ACF from swamping the sum; it is the
   * initial-positive-sequence rule in its simplest form.
   *
   * @param {number[]} values - The series, e.g. one coordinate of a chain.
   * @param {number} [maxLag=1000] - Largest lag the sum may reach.
   * @returns {number} A value in `(0, n]` for positively correlated
   *   chains. Never more than `n`: a chain whose lag-1 autocorrelation is
   *   already negative counts as independent. `0` for an empty series.
   *   `NaN` for a chain that never moves (every value equal): its
   *   autocorrelation is undefined, and reporting `n` would call the worst
   *   possible chain a perfectly mixing one.
   */
  // Each lag is computed only once the sum reaches it; the sum stops at the
  // first non-positive one, usually within a few dozen. Computing all
  // maxLag = 1000 up front took ~90 ms per call on a 100 000-step chain.
  const effectiveSampleSize = (values, maxLag = 1000) => {
    const n = values.length
    if (n < 2) return n

    let moved = false
    for (const v of values) {
      if (v !== values[0]) {
        moved = true
        break
      }
    }
    if (!moved) return NaN

    const rhoAt = acfEstimator(values)
    if (rhoAt === null) return n
    const lagMax = Math.min(maxLag, n - 1)
    let sum = 0
    for (let lag = 1; lag <= lagMax; lag++) {
      const rho = rhoAt(lag)
      if (rho <= 0) break
      sum += rho
    }
    return n / (1 + 2 * sum)
  }

  Object.assign((globalThis.VM ??= {}).mcmc ??= {}, {autocorrelation, effectiveSampleSize})
})(window)
