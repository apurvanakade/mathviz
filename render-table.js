/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Returns a DOM table node, styled entirely with Bootstrap utility classes:
  // table/table-sm/table-bordered for structure, small for compact text, and
  // per-column text-center/text-end + text-nowrap for the numeric data
  // (the first column is the iteration number; the rest are numeric).
  const renderTable = ({html, headers, rows}) => {
    const cellClass = i => `text-nowrap ${i === 0 ? "text-center" : "text-end"}`
    return html`
      <div class="ojs-table-container"><table class="table table-sm table-bordered small">
        <thead><tr>${headers.map((h, i) => html`<th class="${cellClass(i)}">${h}</th>`)}</tr></thead>
        <tbody>${rows.map(row => html`<tr>${row.map((cell, i) => html`<td class="${cellClass(i)}">${cell}</td>`)}</tr>`)}</tbody>
      </table></div>`
  }

  globalThis.VM = {...globalThis.VM, renderTable}
})(window)
