/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Returns a JS number evaluated from a constant expression
  // (e.g. "1 + 2*3 + pi - e"), or null if the expression can't be parsed
  // or doesn't evaluate to a finite number.
  const makeNumber = (mathjs, expr) => {
    const normalized = String(expr).trim().replaceAll("π", "pi")
    try {
      const value = Number(mathjs.evaluate(normalized))
      if (!Number.isFinite(value)) return null
      return value
    } catch {
      return null
    }
  }

  globalThis.VM = {...globalThis.VM, expressions: {...globalThis.VM?.expressions, makeNumber}}
})(window)
