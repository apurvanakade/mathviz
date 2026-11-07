/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Every math.js-backed member of VM.expressions: the four compilers
// (makeFunction, makeFunctionOfT, makeFunction2, makeDerivative) and
// makeNumber. They were five files with the same normalize-compile-wrap
// body each; one private `compile` now holds it, so the input
// normalization and the never-throw contract can't drift between them.
(function attachVM(globalThis) {
  // A value typed into a text field, ready for math.js: trimmed, with `π`
  // spelled the way math.js knows it.
  const normalize = (expr) => String(expr).trim().replaceAll("π", "pi")

  // Compiles `node` (anything with .evaluate(scope)) into a function of the
  // named variables that returns a number and never throws: a point where
  // evaluation fails (a domain error, a free variable left unbound) gives
  // NaN, and so does a non-numeric result (a matrix, a complex number).
  const wrap = (compiled, names) => (...args) => {
    const scope = {}
    for (let i = 0; i < names.length; i++) scope[names[i]] = args[i]
    try { return Number(compiled.evaluate(scope)) } catch { return NaN }
  }

  const compile = (mathjs, expr, names) => {
    try {
      return wrap(mathjs.compile(normalize(expr)), names)
    } catch {
      return null
    }
  }

  /**
   * Compiles a math.js expression in `x` into a plain JavaScript function.
   *
   * Input is normalized first: trimmed, with `π` replaced by `pi`, so a
   * value typed into a text field can be passed straight through.
   *
   * @param {Object} mathjs - A math.js instance (the global `math` on a page that loads it).
   * @param {string} expr - An expression in `x`, e.g. `"sin(x) + x^2/4"`.
   * @returns {((x: number) => number)|null} The compiled function, or `null`
   *   if the expression can't be parsed. The returned function yields `NaN`
   *   (never throws) when evaluation fails at a point.
   */
  const makeFunction = (mathjs, expr) => compile(mathjs, expr, ["x"])

  /**
   * Like {@link makeFunction}, but binds the free variable as `t` instead of
   * `x` -- for pages where the natural parameter is time (a parametric
   * curve `x(t)`, `y(t)`) rather than a spatial coordinate.
   *
   * @param {Object} mathjs - A math.js instance.
   * @param {string} expr - An expression in `t`, e.g. `"cos(2t)"`.
   * @returns {((t: number) => number)|null} The compiled function, or `null`
   *   if the expression can't be parsed. Yields `NaN` where evaluation fails.
   */
  const makeFunctionOfT = (mathjs, expr) => compile(mathjs, expr, ["t"])

  /**
   * Compiles an expression in `t` and `y` into a two-argument function --
   * the right-hand side of a first-order ODE `y' = f(t, y)`, in the shape
   * {@link VM.numerical.eulerSolve} and {@link VM.numerical.rk4Solve} take.
   *
   * @param {Object} mathjs - A math.js instance.
   * @param {string} expr - An expression in `t` and `y`, e.g. `"y - t^2 + 1"`.
   * @returns {((t: number, y: number) => number)|null} The compiled
   *   function, or `null` if the expression can't be parsed. Yields `NaN`
   *   where evaluation fails.
   */
  const makeFunction2 = (mathjs, expr) => compile(mathjs, expr, ["t", "y"])

  /**
   * Like {@link makeFunction}, but compiles the symbolic derivative df/dx of
   * the expression instead of the expression itself.
   *
   * @param {Object} mathjs - A math.js instance.
   * @param {string} expr - An expression in `x`.
   * @returns {((x: number) => number)|null} The derivative as a function, or
   *   `null` if the expression can't be parsed or differentiated. The
   *   returned function yields `NaN` where evaluation fails.
   */
  const makeDerivative = (mathjs, expr) => {
    try {
      return wrap(mathjs.derivative(normalize(expr), "x").compile(), ["x"])
    } catch {
      return null
    }
  }

  /**
   * Evaluates a constant math.js expression to a JavaScript number. This is
   * what lets every numeric field on a page (an initial guess, an interval
   * endpoint, a step count) accept `pi/4` or `2^10` rather than only a
   * literal.
   *
   * @param {Object} mathjs - A math.js instance.
   * @param {string} expr - A constant expression, e.g. `"1 + 2*3 + pi - e"`.
   * @returns {number|null} The value, or `null` if the expression can't be
   *   parsed, references a free variable, or doesn't evaluate to a finite
   *   number.
   */
  const makeNumber = (mathjs, expr) => {
    try {
      const value = Number(mathjs.evaluate(normalize(expr)))
      if (!Number.isFinite(value)) return null
      return value
    } catch {
      return null
    }
  }

  Object.assign((globalThis.VM ??= {}).expressions ??= {}, {
    makeFunction, makeFunctionOfT, makeFunction2, makeDerivative, makeNumber
  })
})(window)
