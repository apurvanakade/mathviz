/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Advances y' = f(t, y), y(t0) = y0 with n fixed steps of (forward)
  // Euler's method and returns the full trajectory {ts, ys}.
  const eulerSolve = (f, t0, y0, tEnd, n) => {
    const h = (tEnd - t0) / n
    const ts = [t0]
    const ys = [y0]
    let t = t0, y = y0
    for (let i = 0; i < n; i++) {
      y = y + h * f(t, y)
      t = t0 + (i + 1) * h
      ts.push(t)
      ys.push(y)
    }
    return {ts, ys}
  }

  globalThis.VM = {...globalThis.VM, eulerSolve}
})(window)
