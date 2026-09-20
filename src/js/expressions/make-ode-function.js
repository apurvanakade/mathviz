/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Returns a JS function ((t, y) => number) or null if the expression
  // can't be parsed. The returned function returns NaN on evaluation
  // errors. Used for ODE right-hand sides y' = f(t, y).
  const makeFunction2 = (mathjs, expr) => {
    const normalized = String(expr).trim().replaceAll("π", "pi")
    try {
      const compiled = mathjs.compile(normalized)
      return (t, y) => {
        try { return Number(compiled.evaluate({t, y})) } catch { return NaN }
      }
    } catch {
      return null
    }
  }

  globalThis.VM = {...globalThis.VM, expressions: {...globalThis.VM?.expressions, makeFunction2}}
})(window)
