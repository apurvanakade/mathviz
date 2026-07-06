/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

/**
 * Shared browser-side utilities for math expression handling in the
 * root-finding visualizations.
 *
 * These helpers intentionally stay small and dependency-light:
 * - they accept the page's already-loaded math.js instance instead of importing it;
 * - they normalize user-entered expressions the same way across all method pages;
 * - they return `null` or `NaN` on invalid input so the surrounding OJS cells can
 *   surface user-facing status messages without throwing runtime errors.
 *
 * The module attaches a single global, `window.VisualMathExpressionUtils`, because
 * Quarto pages currently load these helpers via a plain `<script>` tag.
 */
(function attachMathExpressionUtils(globalThis) {
  /**
   * Normalize user-entered math expressions before compilation.
   *
   * At the moment this does two things:
   * 1. trims surrounding whitespace;
   * 2. replaces the Unicode pi symbol with the math.js identifier `pi`.
   *
   * Keeping normalization here ensures all method pages interpret the same text
   * input consistently.
   *
   * @param {unknown} expr Raw user input from a Quarto/OJS control.
   * @returns {string} Normalized expression text for math.js.
   */
  const normalizeExpression = expr => String(expr).trim().replaceAll("π", "pi")

  /**
   * Compile a scalar math expression safely.
   *
   * Invalid expressions return `null` instead of throwing so the caller can map
   * the failure into a status box inside the visualization.
   *
   * @param {object} mathjs The page's `window.math` instance.
   * @param {unknown} expr Raw user-entered expression.
   * @returns {object|null} A compiled math.js expression, or `null` on failure.
   */
  const tryCompileExpression = (mathjs, expr) => {
    try {
      return mathjs.compile(normalizeExpression(expr))
    } catch (err) {
      return null
    }
  }

  /**
   * Compile the derivative of a scalar expression safely.
   *
   * This is used by Newton's method, which needs both the original function and
   * its derivative. The interface mirrors `tryCompileExpression` so the calling
   * code in the OJS cells stays uniform.
   *
   * @param {object} mathjs The page's `window.math` instance.
   * @param {unknown} expr Raw user-entered expression.
   * @param {string} [variable="x"] Differentiation variable.
   * @returns {object|null} A compiled derivative expression, or `null` on failure.
   */
  const tryCompileDerivativeExpression = (mathjs, expr, variable = "x") => {
    try {
      return mathjs.derivative(normalizeExpression(expr), variable).compile()
    } catch (err) {
      return null
    }
  }

  /**
   * Evaluate a compiled math.js expression and coerce the result to a JS number.
   *
   * The calling pages use `NaN` as their common "evaluation failed" sentinel value.
   * Returning `NaN` here keeps the downstream plotting and iteration code simple:
   * the method-specific cells can rely on `Number.isFinite(...)` checks everywhere.
   *
   * @param {object|null} compiledExpr Compiled math.js expression.
   * @param {object} [scope={}] Variable bindings passed to math.js.
   * @returns {number} Numeric result, or `NaN` when evaluation fails.
   */
  const evaluateCompiledExpression = (compiledExpr, scope = {}) => {
    if (!compiledExpr) return NaN

    try {
      const value = compiledExpr.evaluate(scope)
      return Number(value)
    } catch (err) {
      return NaN
    }
  }

  /**
   * Public utility surface consumed by the root-finding Quarto pages.
   *
   * Keeping this object explicit makes it easy to add helpers later without
   * leaking unrelated names into the global scope.
   */
  globalThis.VisualMathExpressionUtils = {
    normalizeExpression,
    tryCompileExpression,
    tryCompileDerivativeExpression,
    evaluateCompiledExpression
  }
})(window)
