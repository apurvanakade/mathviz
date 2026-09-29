/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Mean, variance and standard deviation of an array of draws, in one
   * pass (Welford's update, which stays accurate when the mean is large
   * compared with the spread).
   *
   * @param {number[]} values
   * @param {Object} [opts]
   * @param {number} [opts.ddof=1] - Delta degrees of freedom: the variance
   *   divides by `n - ddof`. `1` is the unbiased sample variance; `0` is
   *   the population variance of the values themselves (NumPy's
   *   `np.var` default).
   * @returns {{n: number, mean: number, variance: number, sd: number}}
   *   `mean` is `NaN` for an empty array; `variance` and `sd` are
   *   `NaN` when `n <= ddof`.
   */
  const sampleStats = (values, opts = {}) => {
    const ddof = opts.ddof ?? 1
    let n = 0
    let mean = 0
    let sumSquares = 0
    for (const value of values) {
      n += 1
      const delta = value - mean
      mean += delta / n
      sumSquares += delta * (value - mean)
    }
    if (n === 0) mean = NaN
    let variance = NaN
    if (n > ddof) variance = sumSquares / (n - ddof)
    return {n, mean, variance, sd: Math.sqrt(variance)}
  }

  globalThis.VM = {...globalThis.VM, distributions: {...globalThis.VM?.distributions, sampleStats}}
})(window)
