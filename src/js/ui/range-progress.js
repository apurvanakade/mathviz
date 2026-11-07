/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Keeps every range slider's --sx custom property in sync with its value,
// as a percentage. sliders.css paints the filled part of the track with a
// gradient sized by --sx: Firefox has ::-moz-range-progress and fills the
// track natively, but WebKit/Blink have no equivalent, so the fill there
// has to be drawn on ::-webkit-slider-runnable-track and therefore has to
// be told how far along the thumb is.
//
// One delegated listener on the document rather than a listener per slider:
// the pages' sliders are created at runtime by Observable Inputs (and are
// recreated whenever a reactive upstream field changes -- see the
// viewof-recreation note in js/ui/apply-example.js), so there is no single
// moment at which they all exist to be wired up individually.
(function attachVM(globalThis) {
  // A range input's numeric attributes, with the HTML defaults for the
  // ones it leaves out. Shared with slider-play.js, which needs the same
  // three numbers to pace a sweep.
  const numberOr = (text, fallback) => {
    if (text === "" || text === null || text === undefined) return fallback
    const value = Number(text)
    return Number.isFinite(value) ? value : fallback
  }

  /**
   * A range input's bounds, read the way the browser reads them: `min`
   * and `max` default to `0` and `100` when absent or unparsable.
   *
   * @param {{min: string, max: string, step: string}} input - An
   *   `<input type="range">` (or anything with those three string fields).
   * @returns {{min: number, max: number, step: number}} `step` is `NaN`
   *   for `step="any"`, a missing step or one that doesn't parse -- "no
   *   grid of its own" to every caller.
   */
  const sliderBounds = (input) => ({
    min: numberOr(input.min, 0),
    max: numberOr(input.max, 100),
    step: numberOr(input.step, NaN)
  })

  Object.assign((globalThis.VM ??= {}).ui ??= {}, {sliderBounds})

  // Everything below is DOM side effects. scripts/load-vm.mjs runs every file
  // listed in src/manifest.mjs against a minimal `document` stub so the unit
  // tests can exercise the real function above, so bail out before touching
  // anything that stub doesn't have.
  if (typeof document === "undefined") return
  if (typeof document.querySelectorAll !== "function") return

  const setProgress = (input) => {
    const {min, max} = sliderBounds(input)
    const value = Number(input.value)
    if (!Number.isFinite(value)) return
    const span = max - min
    let fraction = 0
    if (span > 0) fraction = (value - min) / span
    if (fraction < 0) fraction = 0
    if (fraction > 1) fraction = 1
    input.style.setProperty("--sx", `${fraction * 100}%`)
  }

  // "input" fires while dragging; "change" covers a programmatic set that
  // dispatches change only (applyExampleParams dispatches "input", but a
  // native <select>-driven flow can land on either).
  for (const eventName of ["input", "change"]) {
    document.addEventListener(eventName, (event) => {
      const target = event.target
      if (target && target.matches && target.matches('input[type="range"]')) setProgress(target)
    }, true)
  }

  // Sliders appear (and are replaced wholesale) long after load as OJS
  // cells settle, so watch for them rather than sweeping once.
  globalThis.VM.ui.whenAdded('input[type="range"]', setProgress)
})(window)
