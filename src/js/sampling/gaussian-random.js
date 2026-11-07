/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  /**
   * Box-Muller transform: turns a uniform generator into a standard-normal
   * one (mean 0, variance 1). Scale and shift the output for any other
   * normal: `mean + sd * gaussian()`.
   *
   * Each pair of uniforms yields two independent normals (the cosine and
   * sine halves of the transform), so the generator consumes one uniform
   * per sample on average: two on every odd call, none on every even one.
   * A seeded `rng` still gives a reproducible sequence.
   *
   * @param {() => number} rng - A uniform `[0, 1)` generator, e.g. the return
   *   value of {@link seededRandom}.
   * @returns {() => number} A standard-normal generator.
   */
  const gaussianRandom = (rng) => {
    let spare = null
    return () => {
      if (spare !== null) {
        const out = spare
        spare = null
        return out
      }
      // 1 - u lies in (0, 1], so the log is always finite -- no clamp, and
      // so no truncation of the far tail.
      const radius = Math.sqrt(-2 * Math.log(1 - rng()))
      const angle = 2 * Math.PI * rng()
      spare = radius * Math.sin(angle)
      return radius * Math.cos(angle)
    }
  }

  Object.assign((globalThis.VM ??= {}).sampling ??= {}, {gaussianRandom})
})(window)
