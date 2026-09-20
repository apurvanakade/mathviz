/**
 * Copyright (c) 2025 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Colors a barycentric triple [a, b, c] (a + b + c = N) satisfying
  // Sperner's condition: each vertex of the outer triangle (two of the
  // three coordinates are 0) gets its own fixed color -- (0,0,N) red,
  // (N,0,0) green, (0,N,0) blue -- each boundary edge point (one
  // coordinate is 0) gets one of its two endpoint colors uniformly at
  // random, and each interior point gets any of the three colors
  // uniformly at random.
  const spernerColor = (a, b, c) => {
    if (a === 0 && b === 0) return 'red'
    if (b === 0 && c === 0) return 'green'
    if (c === 0 && a === 0) return 'blue'
    if (a === 0) return Math.random() < 0.5 ? 'red' : 'blue'
    if (b === 0) return Math.random() < 0.5 ? 'red' : 'green'
    if (c === 0) return Math.random() < 0.5 ? 'green' : 'blue'
    const r = Math.random()
    if (r < 1 / 3) return 'red'
    if (r < 2 / 3) return 'green'
    return 'blue'
  }

  globalThis.VM = {...globalThis.VM, discreteMath: {...globalThis.VM?.discreteMath, spernerColor}}
})(window)
