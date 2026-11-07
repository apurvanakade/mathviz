/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // A cell's text for the CSV: a DOM node (a KaTeX header, an html``
  // fragment) by its textContent rather than "[object HTMLElement]".
  const cellText = (value) => {
    if (value !== null && typeof value === "object" && typeof value.textContent === "string") return value.textContent
    return String(value)
  }

  const csvCell = value => {
    const s = cellText(value)
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const toCsv = (headers, rows) => {
    const allRows = [headers, ...rows]
    const lines = []
    for (const row of allRows) {
      const cells = []
      for (const cell of row) cells.push(csvCell(cell))
      lines.push(cells.join(","))
    }
    return lines.join("\n")
  }

  // The link goes into the document for its click (older Firefox ignores a
  // click on a detached <a download>), and the object URL is revoked only
  // after the browser has had a turn to start the download -- revoking it
  // synchronously can cancel it.
  const downloadCsv = (csv, filename) => {
    const url = URL.createObjectURL(new Blob([csv], {type: "text/csv;charset=utf-8;"}))
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.hidden = true
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  // A cell's content: a node as is, anything else as text -- what htl's
  // `${value}` interpolation did, without a template parse per cell, which
  // made a long table slow to build.
  const fill = (cell, value) => {
    if (value !== null && typeof value === "object" && typeof value.nodeType === "number") cell.append(value)
    else if (value !== null && value !== undefined) cell.append(String(value))
    return cell
  }

  // Returns a DOM table node, styled entirely with Bootstrap utility classes:
  // table/table-sm/table-bordered for structure, small for compact text, and
  // per-column text-center/text-end + text-nowrap for the numeric data
  // (the first column is the iteration number; the rest are numeric).
  //
  // csvHeaders are plain-text column labels for the downloaded file —
  // separate from headers, which may contain KaTeX DOM nodes (from `tex`
  // templates); a node's textContent is used when they aren't given, which
  // can read oddly for typeset math.
  /**
   * Renders a compact, horizontally scrollable results table with a
   * "Download csv" link above it.
   *
   * @param {Object} args
   * @param {Function} [args.html] - htl's `html` tag. No longer used (the
   *   table is built with DOM calls, which is much faster for long tables);
   *   accepted so existing calls keep working.
   * @param {Array} args.headers - Header cells; may be DOM nodes (a `tex`
   *   template's output) as well as strings.
   * @param {Array[]} args.rows - Body rows, one array of cells each, strings,
   *   numbers or DOM nodes. The first column is centered, the rest
   *   right-aligned, all `nowrap`.
   * @param {Array<string>} [args.csvHeaders=headers] - Plain-text header
   *   labels for the download; without them a node header's `textContent`
   *   is used.
   * @param {string} [args.filename="iteration-table.csv"] - Download name.
   * @returns {DocumentFragment} `<div class="ojs-table-toolbar">` + `<div
   *   class="ojs-table-container"><table class="table table-sm
   *   table-bordered small">`.
   */
  const renderTable = ({headers, rows, csvHeaders = headers, filename = "iteration-table.csv"}) => {
    const cellClass = i => {
      if (i === 0) return "text-nowrap text-center"
      return "text-nowrap text-end"
    }
    const make = (tag, className) => {
      const el = document.createElement(tag)
      if (className) el.className = className
      return el
    }

    const downloadLink = make("a")
    downloadLink.href = "#"
    downloadLink.textContent = "Download csv"
    downloadLink.addEventListener("click", event => {
      event.preventDefault()
      downloadCsv(toCsv(csvHeaders, rows), filename)
    })
    const toolbar = make("div", "ojs-table-toolbar")
    toolbar.append(downloadLink)

    const headRow = make("tr")
    for (let i = 0; i < headers.length; i++) headRow.append(fill(make("th", cellClass(i)), headers[i]))
    const thead = make("thead")
    thead.append(headRow)

    const tbody = make("tbody")
    for (const row of rows) {
      const tr = make("tr")
      for (let i = 0; i < row.length; i++) tr.append(fill(make("td", cellClass(i)), row[i]))
      tbody.append(tr)
    }

    const table = make("table", "table table-sm table-bordered small")
    table.append(thead, tbody)
    const container = make("div", "ojs-table-container")
    container.append(table)

    const fragment = document.createDocumentFragment()
    fragment.append(toolbar, container)
    return fragment
  }

  Object.assign((globalThis.VM ??= {}).ui ??= {}, {renderTable})
})(window)
