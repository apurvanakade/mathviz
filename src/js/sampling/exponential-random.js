/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Inverse-transform sampler for the exponential distribution: turns a
   * uniform generator into an Exponential(rate) one (mean `1 / rate`),
   * via `-log(1 - U) / rate`.
   *
   * @param {() => number} rng - A uniform `[0, 1)` generator, e.g. the return
   *   value of {@link seededRandom}. One draw is consumed per sample.
   * @param {number} [rate=1] - Must be `> 0`; not validated.
   * @returns {() => number} An Exponential(rate) generator.
   */
  const exponentialRandom = (rng, rate = 1) => {
    return () => -Math.log(1 - rng()) / rate
  }

  globalThis.VM = {...globalThis.VM, sampling: {...globalThis.VM?.sampling, exponentialRandom}}
})(window)
