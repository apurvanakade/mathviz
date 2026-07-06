/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

/**
 * Shared next/reset step control for the root-finding pages.
 */
(function attachStepControlUtils(globalThis) {
  const createStepControl = ({
    html,
    maxStep,
    initialStep = 0,
    nextLabel = "Next iteration",
    resetLabel = "Reset"
  }) => {
    const div = html`
      <div class="ojs-button-row">
        <button class="ojs-next-button">${nextLabel}</button>
        <button class="ojs-reset-button">${resetLabel}</button>
        <span style="color:#475569;font-weight:600;"></span>
      </div>
    `

    const nextButton = div.querySelector(".ojs-next-button")
    const resetButton = div.querySelector(".ojs-reset-button")
    const label = div.querySelector("span")
    const clamp = value => Math.max(0, Math.min(Number(maxStep) || 0, value))

    let value = clamp(initialStep)
    div.value = value
    label.textContent = `Current step: ${value}`

    nextButton.onclick = () => {
      value = clamp(value + 1)
      div.value = value
      label.textContent = `Current step: ${value}`
      div.dispatchEvent(new CustomEvent("input"))
    }

    resetButton.onclick = () => {
      value = 0
      div.value = value
      label.textContent = `Current step: ${value}`
      div.dispatchEvent(new CustomEvent("input"))
    }

    return div
  }

  globalThis.VisualMathStepControlUtils = {
    createStepControl
  }
})(window)
