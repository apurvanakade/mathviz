/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * The decision of a hypothesis test whose statistic has a known null
   * distribution: its critical values, rejection region and p-value, and
   * the tail intervals the p-value is the area of -- what a chart shades.
   * Works for any continuous null distribution given its CDF and quantile
   * (z, t, chi-squared, F, ...), symmetric or not.
   *
   * A two-sided test puts alpha / 2 in each tail. Its p-value is twice the
   * smaller tail, and the region it covers is the tail the statistic fell
   * in plus the tail of equal area on the other side. For a distribution
   * symmetric about 0 (z, t) that is the familiar |T| >= |t|; for a skewed
   * one (a chi-squared variance test, an F variance ratio) the two
   * boundaries aren't mirror images.
   *
   * @param {{cdf: function(number): number, quantile: function(number): number, sf?: function(number): number}} dist -
   *   The null distribution's CDF and quantile. `sf` (the upper tail,
   *   `1 - cdf`) is optional; pass one computed directly to keep a p-value
   *   below about 1e-16 from rounding to 0.
   * @param {number} observed - The test statistic.
   * @param {object} [opts]
   * @param {"two-sided"|"less"|"greater"} [opts.alternative="two-sided"] -
   *   The direction of H1: "less" rejects for small statistics, "greater"
   *   for large ones.
   * @param {number} [opts.alpha=0.05] - The significance level, in (0, 1).
   * @returns {{pValue: number, reject: boolean, critical: number[], rejectionRegion: Array<[number, number]>, pValueRegion: Array<[number, number]>}}
   *   `critical` holds one value (one-sided) or the lower and upper
   *   (two-sided); `rejectionRegion` and `pValueRegion` are intervals with
   *   `±Infinity` for an open end; `reject` is `pValue <= alpha`. A
   *   two-sided `pValueRegion`'s mirrored interval is empty (`[Infinity,
   *   Infinity]`) when the statistic's tail is below double precision.
   *   Inputs aren't validated: an unknown `alternative` is treated as
   *   two-sided, and a `NaN` statistic gives a `NaN` p-value.
   */
  const hypothesisTest = (dist, observed, opts = {}) => {
    const {alternative = 'two-sided', alpha = 0.05} = opts
    const {cdf, quantile} = dist
    const sf = dist.sf ?? (x => 1 - cdf(x))
    const left = cdf(observed)
    const right = sf(observed)

    if (alternative === 'less') {
      const c = quantile(alpha)
      return {
        pValue: left, reject: left <= alpha, critical: [c],
        rejectionRegion: [[-Infinity, c]], pValueRegion: [[-Infinity, observed]]
      }
    }
    if (alternative === 'greater') {
      const c = quantile(1 - alpha)
      return {
        pValue: right, reject: right <= alpha, critical: [c],
        rejectionRegion: [[c, Infinity]], pValueRegion: [[observed, Infinity]]
      }
    }
    const lo = quantile(alpha / 2)
    const hi = quantile(1 - alpha / 2)
    const pValue = Math.min(1, 2 * Math.min(left, right))
    const pValueRegion = left <= right
      ? [[-Infinity, observed], [quantile(1 - left), Infinity]]
      : [[-Infinity, quantile(right)], [observed, Infinity]]
    return {
      pValue, reject: pValue <= alpha, critical: [lo, hi],
      rejectionRegion: [[-Infinity, lo], [hi, Infinity]], pValueRegion
    }
  }

  Object.assign((globalThis.VM ??= {}).distributions ??= {}, {hypothesisTest})
})(window)
