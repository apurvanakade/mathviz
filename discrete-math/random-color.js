/**
 * Copyright (c) 2025 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Picks 'red', 'green', or 'blue' uniformly at random, ignoring position --
  // used to demonstrate what happens when Sperner's boundary condition is
  // violated.
  const randomColor = () => {
    const r = Math.random()
    if (r < 1 / 3) return 'red'
    if (r < 2 / 3) return 'green'
    return 'blue'
  }

  globalThis.VM = {...globalThis.VM, discreteMath: {...globalThis.VM?.discreteMath, randomColor}}
})(window)
