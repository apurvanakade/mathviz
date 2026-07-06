/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

/**
 * Shared status rendering for the root-finding pages.
 */
(function attachRenderStatusUtils(globalThis) {
  const getStatusClassName = statusType =>
    statusType === "good"
      ? "ojs-status ojs-status-good"
      : statusType === "bad"
        ? "ojs-status ojs-status-bad"
        : "ojs-status ojs-status-warn"

  const renderStatus = ({html, statusType, message, label = "Status:"}) => {
    const className = getStatusClassName(statusType)

    return html`<div class="${className}">
      <strong>${label}</strong> ${message}
    </div>`
  }

  globalThis.VisualMathRenderStatusUtils = {
    renderStatus
  }
})(window)
