/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Computes a padded {lo, hi} axis range covering an array of values.
   *
   * @param {number[]} values - Sample values (non-finite entries are ignored).
   * @param {Object} [opts]
   * @param {[number, number]} [opts.emptyRange=[-1, 1]] - Range returned when `values` has no finite entries.
   * @param {number} [opts.singularPadding=1] - Padding applied on each side when every finite value is identical (lo === hi).
   * @param {number} [opts.relativePadding=0.1] - Padding as a fraction of the value span (hi - lo).
   * @param {number} [opts.minPadding=0.5] - Minimum padding, used when the relative padding would be too small (small spans).
   * @returns {{lo: number, hi: number}}
   */
  const paddedRange = (values, {emptyRange = [-1, 1], singularPadding = 1, relativePadding = 0.1, minPadding = 0.5} = {}) => {
    const finite = values.filter(Number.isFinite).map(Number)
    if (finite.length === 0) return {lo: emptyRange[0], hi: emptyRange[1]}
    let lo = Math.min(...finite)
    let hi = Math.max(...finite)
    if (lo === hi) { lo -= singularPadding; hi += singularPadding }
    const pad = Math.max(relativePadding * (hi - lo), minPadding)
    return {lo: lo - pad, hi: hi + pad}
  }

  globalThis.VM = {...globalThis.VM, paddedRange}
})(window)
