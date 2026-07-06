/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

/**
 * Shared rendering helpers for the root-finding OJS pages.
 *
 * These helpers stay deliberately small: they only cover presentation patterns
 * that are structurally identical across the method pages, such as status boxes
 * and empty-state messages.
 */
(function attachRenderUtils(globalThis) {
  /**
   * Map a page-level status type to the shared CSS class string.
   *
   * @param {string} statusType One of "good", "bad", or "warn".
   * @returns {string} CSS class list for the corresponding status box.
   */
  const getStatusClassName = statusType =>
    statusType === "good"
      ? "ojs-status ojs-status-good"
      : statusType === "bad"
        ? "ojs-status ojs-status-bad"
        : "ojs-status ojs-status-warn"

  /**
   * Render a standard status callout using Quarto/OJS's `html` template tag.
   *
   * @param {object} options Render options.
   * @param {Function} options.html OJS `html` template function.
   * @param {string} options.statusType One of "good", "bad", or "warn".
   * @param {string} options.message Status text to display.
   * @param {string} [options.label="Status:"] Leading emphasis label.
   * @returns {unknown} An OJS HTML fragment.
   */
  const renderStatusBox = ({html, statusType, message, label = "Status:"}) => {
    const className = getStatusClassName(statusType)

    return html`<div class="${className}">
      <strong>${label}</strong> ${message}
    </div>`
  }

  /**
   * Render the shared empty-state block used when there is no table content yet.
   *
   * @param {Function} html OJS `html` template function.
   * @param {string} message Empty-state message.
   * @returns {unknown} An OJS HTML fragment.
   */
  const renderEmptyState = (html, message) =>
    html`<div class="ojs-status">${message}</div>`

  /**
   * Render the shared next/reset step control used by the method pages.
   *
   * @param {object} options Control options.
   * @param {Function} options.html OJS `html` template function.
   * @param {number} options.maxStep Largest allowed step index.
   * @param {number} [options.initialStep=0] Starting step value.
   * @param {string} [options.nextLabel="Next iteration"] Label for increment button.
   * @param {string} [options.resetLabel="Reset"] Label for reset button.
   * @returns {HTMLElement} An input-like OJS view element.
   */
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

  /**
   * Render a generic data table using the shared table CSS classes.
   *
   * @param {object} options Render options.
   * @param {Function} options.html OJS `html` template function.
   * @param {Array<unknown>} options.headers Header cell content.
   * @param {Array<Array<unknown>>} options.rows Table body values by row.
   * @returns {unknown} An OJS HTML fragment.
   */
  const renderDataTable = ({html, headers, rows}) => html`
    <div class="ojs-table-wrap">
      <table class="ojs-table">
        <thead>
          <tr>
            ${headers.map(header => html`<th>${header}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => html`
            <tr>
              ${row.map(cell => html`<td>${cell}</td>`)}
            </tr>
          `)}
        </tbody>
      </table>
    </div>
  `

  globalThis.VisualMathRenderUtils = {
    createStepControl,
    getStatusClassName,
    renderDataTable,
    renderStatusBox,
    renderEmptyState
  }
})(window)
