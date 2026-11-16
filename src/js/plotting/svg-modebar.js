/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // The modebar of a chart drawn as inline SVG -- Observable Plot, or a
  // hand-built <svg> -- the counterpart of the one plotly-fullscreen-
  // button.js patches onto every Plotly chart. An SVG has no modebar of its
  // own, so this adds one from outside: a small bar of buttons pinned to the
  // figure's top-right corner. Today it holds one button, fullscreen; a new
  // button is one more entry in BUTTONS below and reaches every SVG chart
  // on every page, the way a new Plotly modebar button reaches every Plotly
  // chart through the patch.
  //
  // Automatic for Observable Plot. Plot's SVG carries its generated
  // `plot-<hash>` class, so it is recognised wherever it lands and needs no
  // markup: every Plot chart gets the bar. A hand-built <svg> has nothing to
  // recognise it by, so its wrapper opts in with `ojs-svg-block` next to
  // `ojs-chart-block`; from there both go through the same code. A chart
  // opts out with `data-vm-modebar="off"` on it or any ancestor.
  //
  // The bar belongs to a *host*, the element fullscreen enlarges: the
  // nearest .ojs-chart-block, so a controls bar, legend, key and stat row in
  // it come along; else Quarto's per-cell output wrapper
  // (.cell-output-display), which an OJS re-run keeps while it replaces the
  // SVG inside; else the SVG's parent. The bar is a direct child of the
  // host, never inside a cell's output, so a re-run (which rebuilds the
  // SVG) never rebuilds the bar with it. The host gets `vm-svg-host`, which
  // every CSS rule for it keys on (chart-block.css).
  //
  // A host that holds a Plotly chart shows no bar: Plotly's own modebar
  // already has the fullscreen button. Checked on every update rather than
  // once, because OJS renders cells asynchronously -- at load time a
  // Plotly block has no chart in it yet either.
  //
  // The bar is pinned to the top-right corner of the *figure* -- the union
  // of the host's figure SVGs, measured rather than assumed -- not of the
  // host or the cell. A Plot.plot SVG with a fixed width sits left-aligned
  // in a wider column, and in fullscreen every figure is letterboxed into
  // the middle of the screen, so the cell's corner and the picture's corner
  // are not the same point. It is re-measured whenever the host resizes, a
  // figure SVG resizes or is replaced, or fullscreen toggles.
  //
  // Fullscreen letterboxing is CSS (chart-block.css, `.vm-svg-host:fullscreen`),
  // the same chain of fill-and-center wrappers the Plotly block uses; the
  // one thing CSS can't know is the picture's aspect ratio, so each figure
  // SVG is tagged `vm-fs-figure` and given its ratio as --vm-svg-aspect
  // here, from its viewBox or width/height attributes.

  // Plot's chart SVG, not its color-ramp legend (`plot-<hash>-ramp`), which
  // is a legend rather than a figure.
  const PLOT_SELECTOR = 'svg[class^="plot-"]:not([class$="-ramp"])'
  const BLOCK_SELECTOR = ".ojs-chart-block.ojs-svg-block"
  const HOST_CLASS = "vm-svg-host"
  const BAR_CLASS = "vm-svg-modebar"
  const BUTTON_CLASS = "vm-svg-modebar-button"
  const FIGURE_CLASS = "vm-fs-figure"
  const ASPECT_PROP = "--vm-svg-aspect"
  const OPT_OUT = '[data-vm-modebar="off"]'
  // SVGs that are a chart's furniture rather than the chart: the controls
  // bar's play icons, a legend's or key's swatches, button glyphs, and a
  // Plotly chart's own layers. chart-block.css's centering rule mirrors
  // this list.
  const NOT_FIGURE = ".ojs-chart-controls, .ojs-legend-overlay, .vm-static-key, button, .js-plotly-plot"
  // An inline icon (a play button's glyph, a legend swatch) is never this
  // wide; a figure always is.
  const MIN_FIGURE_WIDTH = 64
  // How far inside the figure's corner the bar sits, in px.
  const INSET = 6

  // The width/height ratio an <svg> draws at, from its attributes: the
  // viewBox when there is one (Observable Plot and hand-built SVGs alike
  // set it), else explicit width/height, else null for "measure it". Pure,
  // and exported so it can be unit-tested without a DOM.
  /**
   * The width/height ratio an `<svg>` draws at, from its attributes.
   *
   * @param {{viewBox?: string, width?: string|number, height?: string|number}} attrs
   * @returns {number|null} From a four-part `viewBox` when it has one, else
   *   from `width`/`height` when both are positive, else `null` ("measure
   *   it").
   */
  const svgAspectRatio = ({viewBox, width, height}) => {
    if (typeof viewBox === "string") {
      const parts = viewBox.trim().split(/[\s,]+/)
      if (parts.length === 4) {
        const w = parseFloat(parts[2])
        const h = parseFloat(parts[3])
        if (w > 0 && h > 0) return w / h
      }
    }
    const w = parseFloat(width)
    const h = parseFloat(height)
    if (w > 0 && h > 0) return w / h
    return null
  }

  // The smallest box containing every given rect ({left, top, right,
  // bottom}); null for no rects. Pure, exported for the same reason.
  /**
   * The smallest box containing every given rect.
   *
   * @param {{left: number, top: number, right: number, bottom: number}[]} rects
   * @returns {{left: number, top: number, right: number, bottom: number}|null}
   *   `null` for an empty list.
   */
  const figureBounds = (rects) => {
    let bounds = null
    for (const rect of rects) {
      if (bounds === null) {
        bounds = {left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom}
        continue
      }
      if (rect.left < bounds.left) bounds.left = rect.left
      if (rect.top < bounds.top) bounds.top = rect.top
      if (rect.right > bounds.right) bounds.right = rect.right
      if (rect.bottom > bounds.bottom) bounds.bottom = rect.bottom
    }
    return bounds
  }

  Object.assign((globalThis.VM ??= {}).plotting ??= {}, {svgAspectRatio, figureBounds})

  // Everything below is DOM side effects. scripts/load-vm.mjs runs every file
  // listed in src/manifest.mjs against a minimal `document` stub so the unit
  // tests can exercise the real functions above, so bail out before touching
  // anything that stub doesn't have.
  if (typeof document === "undefined") return
  if (typeof document.querySelectorAll !== "function") return
  if (typeof document.createElement !== "function") return

  // The modebar's buttons, in order. Each is {name, title, icon() ->
  // {width, height, path}, available(), click(host)}; a button whose
  // available() is false is left out, and a bar with no buttons is not
  // added at all. Fullscreen reuses the Plotly modebar's button -- its
  // glyph, its availability rule (no iPhone Safari, no frame without
  // allow="fullscreen") and its toggle -- so the two can't drift apart.
  const BUTTONS = [
    {
      name: "fullscreen",
      title: "Toggle fullscreen",
      icon: () => globalThis.VM.plotting.fullscreenButton.icon,
      available: () => globalThis.VM.plotting.fullscreenButton.available(),
      click: (host) => globalThis.VM.plotting.fullscreenButton.toggle(host)
    }
  ]

  // The figure SVGs: every <svg> in the host that is wide enough to be a
  // picture, isn't chart furniture and hasn't opted out.
  const findFigures = (host) => {
    const figures = []
    for (const svg of host.querySelectorAll("svg")) {
      if (svg.closest(NOT_FIGURE) || svg.closest(OPT_OUT)) continue
      if (svg.getBoundingClientRect().width < MIN_FIGURE_WIDTH) continue
      figures.push(svg)
    }
    return figures
  }

  const markFigure = (svg) => {
    if (svg.classList.contains(FIGURE_CLASS)) return
    svg.classList.add(FIGURE_CLASS)
    let ratio = svgAspectRatio({
      viewBox: svg.getAttribute("viewBox"),
      width: svg.getAttribute("width"),
      height: svg.getAttribute("height")
    })
    if (ratio === null) {
      const rect = svg.getBoundingClientRect()
      if (rect.height > 0) ratio = rect.width / rect.height
    }
    if (ratio !== null) svg.style.setProperty(ASPECT_PROP, String(ratio))
  }

  const makeBar = (host) => {
    const bar = document.createElement("div")
    bar.className = BAR_CLASS
    for (const spec of BUTTONS) {
      if (!spec.available()) continue
      const button = document.createElement("button")
      button.type = "button"
      button.className = BUTTON_CLASS
      button.dataset.vmButton = spec.name
      button.title = spec.title
      button.setAttribute("aria-label", spec.title)
      const icon = spec.icon()
      button.innerHTML = `<svg viewBox="0 0 ${icon.width} ${icon.height}" width="16" height="16" aria-hidden="true"><path d="${icon.path}" fill="currentColor"/></svg>`
      button.addEventListener("click", () => spec.click(host))
      bar.appendChild(button)
    }
    if (bar.childElementCount === 0) return null
    return bar
  }

  // Where an SVG's bar goes: see the header comment.
  const hostFor = (svg) =>
    svg.closest(".ojs-chart-block") ?? svg.closest(".cell-output-display") ?? svg.parentElement

  const enhance = (host) => {
    if (host.querySelector(`:scope > .${BAR_CLASS}`)) return
    const bar = makeBar(host)
    if (bar === null) return
    host.classList.add(HOST_CLASS)
    host.appendChild(bar)

    let figureObserver = null
    let mutationObserver = null
    const observed = new Set()

    const update = () => {
      if (!host.isConnected) {
        if (figureObserver) figureObserver.disconnect()
        if (mutationObserver) mutationObserver.disconnect()
        document.removeEventListener("fullscreenchange", scheduleUpdate)
        return
      }
      const figures = findFigures(host)
      // Stop watching SVGs a re-run has already thrown away.
      for (const svg of observed) {
        if (svg.isConnected) continue
        figureObserver.unobserve(svg)
        observed.delete(svg)
      }
      const rects = []
      for (const svg of figures) {
        markFigure(svg)
        rects.push(svg.getBoundingClientRect())
        // A re-run replaces the SVG; the observer has to follow it.
        if (figureObserver && !observed.has(svg)) {
          figureObserver.observe(svg)
          observed.add(svg)
        }
      }
      const bounds = figureBounds(rects)
      // Nothing drawn yet (the cell hasn't run), or a Plotly chart whose own
      // modebar already offers all of this: keep the bar out of the way.
      bar.hidden = bounds === null || host.querySelector(".js-plotly-plot") !== null
      if (bar.hidden) return
      const hostRect = host.getBoundingClientRect()
      bar.style.top = `${bounds.top - hostRect.top + INSET}px`
      bar.style.right = `${hostRect.right - bounds.right + INSET}px`
    }

    // Measuring forces a layout, so at most one update per frame however
    // many mutations and resizes arrive in it -- during a playback sweep
    // the controls bar alone changes on every frame.
    let scheduled = false
    const scheduleUpdate = () => {
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(() => {
        scheduled = false
        update()
      })
    }

    if (typeof ResizeObserver !== "undefined") {
      figureObserver = new ResizeObserver(scheduleUpdate)
      figureObserver.observe(host)
    }
    // Cell re-runs swap the SVG out; there is no resize to observe on a
    // node that was replaced wholesale. Mutations inside the controls bar,
    // the legend or the modebar itself never change the figure, so they
    // don't count.
    if (typeof MutationObserver !== "undefined") {
      mutationObserver = new MutationObserver((records) => {
        for (const record of records) {
          const target = record.target.nodeType === 1 ? record.target : record.target.parentElement
          if (target && target.closest(`.ojs-chart-controls, .ojs-legend-overlay, .${BAR_CLASS}`)) continue
          scheduleUpdate()
          return
        }
      })
      mutationObserver.observe(host, {childList: true, subtree: true})
    }
    document.addEventListener("fullscreenchange", scheduleUpdate)
    update()
  }

  globalThis.VM.ui.whenAdded(PLOT_SELECTOR, (svg) => {
    if (svg.closest(OPT_OUT) || svg.closest(NOT_FIGURE)) return
    const host = hostFor(svg)
    if (host) enhance(host)
  })
  globalThis.VM.ui.whenAdded(BLOCK_SELECTOR, (block) => {
    if (block.closest(OPT_OUT)) return
    enhance(block)
  })
})(window)
