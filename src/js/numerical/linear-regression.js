/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Ordinary least-squares fit of a line y = slope*x + intercept through
  // points [{x, y}, ...]. Returns {slope, intercept, xlo, xhi} (xlo/xhi are
  // the first and last point's x, for drawing the fitted segment), or null
  // if there are fewer than two points or the x-values don't vary (a
  // vertical/degenerate fit).
  const linearRegression = points => {
    if (points.length < 2) return null

    const pointCount = points.length
    let sx = 0, sy = 0, sxy = 0, sxx = 0
    for (const p of points) {
      sx += p.x
      sy += p.y
      sxy += p.x * p.y
      sxx += p.x * p.x
    }
    const denom = pointCount * sxx - sx * sx
    if (denom === 0) return null

    const slope = (pointCount * sxy - sx * sy) / denom
    const intercept = (sy - slope * sx) / pointCount
    return {slope, intercept, xlo: points[0].x, xhi: points[pointCount - 1].x}
  }

  globalThis.VM = {...globalThis.VM, numerical: {...globalThis.VM?.numerical, linearRegression}}
})(window)
