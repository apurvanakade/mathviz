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

  globalThis.VisualMathRenderUtils = {
    getStatusClassName,
    renderStatusBox,
    renderEmptyState
  }
})(window)
