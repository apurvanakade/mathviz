/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Exact integer arithmetic in BigInt, so a literal like "0.1234567890123"
  // or "123456789012345678/3" is reduced exactly rather than through a
  // double; the result is handed back as Numbers only when both parts fit
  // in Number.MAX_SAFE_INTEGER (otherwise it could not be exact).
  const gcd = (a, b) => {
    if (a < 0n) a = -a
    if (b < 0n) b = -b
    while (b !== 0n) [a, b] = [b, a % b]
    return a === 0n ? 1n : a
  }

  const MAX = BigInt(Number.MAX_SAFE_INTEGER)

  const reduce = (num, den) => {
    if (den < 0n) {
      num = -num
      den = -den
    }
    const divisor = gcd(num, den)
    num /= divisor
    den /= divisor
    if (num > MAX || -num > MAX || den > MAX) return null
    // `+ 0` turns a -0 (from "-0" or "-0/5") into 0.
    return {num: Number(num) + 0, den: Number(den)}
  }

  // A decimal literal already matched by /^-?\d*\.\d+$/: the digits after
  // the point over the matching power of ten.
  const parseDecimal = (text) => {
    const negative = text.startsWith("-")
    const [intPart, fracPart] = (negative ? text.slice(1) : text).split(".")
    const den = 10n ** BigInt(fracPart.length)
    let num = BigInt(intPart || "0") * den + BigInt(fracPart)
    if (negative) num = -num
    return reduce(num, den)
  }

  /**
   * Parses a rational-number *literal* into an exact reduced fraction, for
   * displaying values such as Butcher-tableau coefficients without floating
   * point noise.
   *
   * Unlike its siblings in `VM.expressions`, this takes no math.js instance
   * and does not evaluate expressions: only a plain integer (`"3"`, `"-3"`),
   * a fraction of integers (`"1/2"`, `"-1 / 3"`) or a decimal (`"0.25"`,
   * `".5"`) is accepted. `"1/2 + 1"`, `"pi"`, `"1e3"` and `"1."` all
   * return `null`.
   *
   * @param {string} expr - The literal to parse; surrounding whitespace is ignored.
   * @returns {{num: number, den: number}|null} Numerator and denominator in
   *   lowest terms with `den > 0` (computed exactly, however many digits
   *   the literal has), or `null` for an empty string, a zero denominator,
   *   anything that isn't one of the three literal forms, or a reduced
   *   fraction whose numerator or denominator exceeds
   *   `Number.MAX_SAFE_INTEGER` (it could not be represented exactly).
   */
  const makeRational = expr => {
    const text = String(expr).trim()
    if (text === "") return null

    const fractionMatch = text.match(/^(-?\d+)\s*\/\s*(-?\d+)$/)
    if (fractionMatch !== null) {
      const den = BigInt(fractionMatch[2])
      if (den === 0n) return null
      return reduce(BigInt(fractionMatch[1]), den)
    }

    if (/^-?\d+$/.test(text)) return reduce(BigInt(text), 1n)

    if (/^-?\d*\.\d+$/.test(text)) return parseDecimal(text)

    return null
  }

  Object.assign((globalThis.VM ??= {}).expressions ??= {}, {makeRational})
})(window)
