/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Systematic resampling, the usual resampling step of a particle filter:
   * n evenly spaced pointers `(i + u) / n` read off the cumulative
   * weights, so particle j is copied either floor(n w_j) or ceil(n w_j)
   * times. It uses a single uniform draw and has lower variance than n
   * independent multinomial draws.
   *
   * @param {number[]} weights - Non-negative; normalized here, so they need
   *   not sum to 1.
   * @param {number} u - One uniform draw in `[0, 1)`, e.g. `rng()`.
   * @returns {number[]} `weights.length` indices into `weights`, in
   *   increasing order. Empty for an empty array; `[]` also when every
   *   weight is 0 (nothing to resample from).
   */
  const systematicResample = (weights, u) => {
    const n = weights.length
    let total = 0
    for (const weight of weights) total += weight
    const indices = []
    if (n === 0 || !(total > 0)) return indices
    let j = 0
    let cumulative = weights[0] / total
    for (let i = 0; i < n; i++) {
      const pointer = (i + u) / n
      // j < n - 1 guards against the last cumulative sum landing a hair
      // below 1 in floating point.
      while (pointer >= cumulative && j < n - 1) {
        j += 1
        cumulative += weights[j] / total
      }
      indices.push(j)
    }
    return indices
  }

  globalThis.VM = {...globalThis.VM, filters: {...globalThis.VM?.filters, systematicResample}}
})(window)
