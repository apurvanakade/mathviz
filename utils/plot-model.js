/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

/**
 * Shared helpers for building derived plot-model state in the root-finding pages.
 *
 * These utilities sit between the numerical method computation and the Plotly
 * rendering cells. They help the OJS pages answer questions such as:
 * - which iteration rows are currently visible?
 * - what finite values should contribute to the plotted bounds?
 * - what padded axis range should be used for the current view?
 * - which sampled function values are safe to include in range estimation?
 *
 * The helpers attach to `window.VisualMathPlotModelUtils` because the Quarto
 * pages load them through a plain `<script>` tag.
 */
(function attachPlotModelUtils(globalThis) {
  /**
   * Push finite numeric values into an existing array.
   *
   * This is useful when range estimation needs to aggregate values from many
   * sources (initial inputs, iteration rows, sampled function values, tangent
   * endpoints, and so on) while consistently ignoring invalid numbers.
   *
   * @param {number[]} target Destination array that will be mutated.
   * @param {unknown[]} values Candidate values to append.
   * @param {{ maxAbs?: number }} [options={}] Optional magnitude cap.
   * @returns {number[]} The mutated target array for convenient chaining.
   */
  const pushFiniteValues = (target, values, options = {}) => {
    const maxAbs = options.maxAbs ?? Infinity

    for (const value of values) {
      if (Number.isFinite(value) && Math.abs(value) <= maxAbs) {
        target.push(Number(value))
      }
    }

    return target
  }

  /**
   * Append sampled function values across an interval into an array.
   *
   * Pages use this when estimating vertical plot bounds from the visible x-range.
   *
   * @param {number[]} target Destination array that will be mutated.
   * @param {(x: number) => number} fn Numeric function to sample.
   * @param {{ lo: number, hi: number, count?: number, maxAbs?: number }} options
   *   Sampling options for the interval and filtering.
   * @returns {number[]} The mutated target array.
   */
  const appendSampledFunctionValues = (target, fn, options) => {
    const {lo, hi} = options
    const count = options.count ?? 400
    const maxAbs = options.maxAbs ?? Infinity

    if (!Number.isFinite(lo) || !Number.isFinite(hi) || count < 2) {
      return target
    }

    for (let i = 0; i < count; i++) {
      const x = lo + (hi - lo) * i / (count - 1)
      pushFiniteValues(target, [fn(x)], {maxAbs})
    }

    return target
  }

  /**
   * Select the currently visible iteration prefix for step-by-step controls.
   *
   * The pages all reveal rows cumulatively from step 0 onward, so this helper
   * centralizes the slicing behavior.
   *
   * @param {Array<object>} rows Full iteration history.
   * @param {unknown} stepControl Current step-control value from OJS.
   * @returns {Array<object>} Visible prefix of the iteration rows.
   */
  const sliceVisibleRows = (rows, stepControl) => {
    const visibleCount = Math.min(Number(stepControl), rows.length) + 1
    return rows.slice(0, visibleCount)
  }

  /**
   * Build a padded numeric range from collected values.
   *
   * When no usable values exist, the provided empty range is used directly.
   * When all values collapse to a single point, the range is first widened by
   * `singularPadding` so later proportional padding behaves well.
   *
   * @param {unknown[]} values Candidate values contributing to the range.
   * @param {{
   *   emptyRange: [number, number],
   *   singularPadding: number,
   *   relativePadding: number,
   *   minPadding: number
   * }} options Range-shaping options.
   * @returns {{ lo: number, hi: number }} Padded range bounds.
   */
  const createPaddedRange = (values, options) => {
    const finiteValues = values.filter(Number.isFinite).map(Number)

    let lo
    let hi

    if (finiteValues.length === 0) {
      ;[lo, hi] = options.emptyRange
    } else {
      lo = Math.min(...finiteValues)
      hi = Math.max(...finiteValues)

      if (lo === hi) {
        lo = lo - options.singularPadding
        hi = hi + options.singularPadding
      }
    }

    const width = hi - lo
    const pad = Math.max(options.relativePadding * width, options.minPadding)

    return {
      lo: lo - pad,
      hi: hi + pad
    }
  }

  globalThis.VisualMathPlotModelUtils = {
    pushFiniteValues,
    appendSampledFunctionValues,
    sliceVisibleRows,
    createPaddedRange
  }
})(window)
