/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Least-squares fit of a degree-`degree` polynomial
  // y = c0 + c1*x + c2*x^2 + ... + c_degree*x^degree
  // through points = [{x, y}, ...], solved via the normal equations
  // (Vandermonde^T * Vandermonde * c = Vandermonde^T * y). Uses mathjs's
  // LU solver — plain Gaussian elimination on the normal equations loses
  // too much precision once degree approaches the point count (e.g. degree
  // 9 through 10 points, an exact interpolation rather than a loose fit).
  //
  // Returns {coeffs, evaluate, totalSquaredError}, or null if there are
  // fewer points than coefficients (degree + 1) or the system is singular.
  const polynomialFit = (mathjs, points, degree) => {
    const numCoeffs = degree + 1
    if (points.length < numCoeffs) return null

    const design = []
    const yValues = []
    for (const p of points) {
      const row = []
      let power = 1
      for (let k = 0; k < numCoeffs; k++) {
        row.push(power)
        power *= p.x
      }
      design.push(row)
      yValues.push(p.y)
    }

    const designT = mathjs.transpose(design)
    const normalMatrix = mathjs.multiply(designT, design)
    const normalRhs = mathjs.multiply(designT, yValues)

    let solved
    try {
      solved = mathjs.lusolve(normalMatrix, normalRhs)
    } catch (e) {
      return null
    }

    const coeffs = []
    for (const row of solved) coeffs.push(row[0])

    const evaluate = x => {
      let result = 0
      let power = 1
      for (let k = 0; k < numCoeffs; k++) {
        result += coeffs[k] * power
        power *= x
      }
      return result
    }

    let totalSquaredError = 0
    for (const p of points) {
      const residual = evaluate(p.x) - p.y
      totalSquaredError += residual * residual
    }

    return {coeffs, evaluate, totalSquaredError}
  }

  globalThis.VM = {...globalThis.VM, numerical: {...globalThis.VM?.numerical, polynomialFit}}
})(window)
