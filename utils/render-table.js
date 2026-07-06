/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

/**
 * Shared table rendering for the root-finding pages.
 */
(function attachRenderTableUtils(globalThis) {
  const renderTable = ({html, headers, rows}) => html`
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

  globalThis.VisualMathRenderTableUtils = {
    renderTable
  }
})(window)
