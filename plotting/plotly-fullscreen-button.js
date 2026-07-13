/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Resize the plot once the browser finishes entering/leaving fullscreen —
  // Plotly doesn't know the div's size changed on its own.
  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement && globalThis.Plotly) {
      globalThis.Plotly.Plots.resize(document.fullscreenElement)
    }
  })

  // A Plotly modebar button (add via config.modeBarButtonsToAdd) that
  // toggles the graph div into the browser's native fullscreen mode.
  // Icon path is Bootstrap Icons' "arrows-fullscreen" (MIT), matching the
  // rest of the site's iconography.
  const fullscreenButton = {
    name: "fullscreen",
    title: "Toggle fullscreen",
    icon: {
      width: 16,
      height: 16,
      path: "M5.828 10.172a.5.5 0 0 0-.707 0l-4.096 4.096V11.5a.5.5 0 0 0-1 0v3.975a.5.5 0 0 0 .5.5H4.5a.5.5 0 0 0 0-1H1.732l4.096-4.096a.5.5 0 0 0 0-.707zm4.344 0a.5.5 0 0 1 .707 0l4.096 4.096V11.5a.5.5 0 1 1 1 0v3.975a.5.5 0 0 1-.5.5H11.5a.5.5 0 0 1 0-1h2.768l-4.096-4.096a.5.5 0 0 1 0-.707zm0-4.344a.5.5 0 0 0 .707 0l4.096-4.096V4.5a.5.5 0 1 0 1 0V.525a.5.5 0 0 0-.5-.5H11.5a.5.5 0 0 0 0 1h2.768l-4.096 4.096a.5.5 0 0 0 0 .707zm-4.344 0a.5.5 0 0 1-.707 0L1.025 1.732V4.5a.5.5 0 0 1-1 0V.525a.5.5 0 0 1 .5-.5H4.5a.5.5 0 0 1 0 1H1.732l4.096 4.096a.5.5 0 0 1 0 .707z"
    },
    click: (gd) => {
      if (document.fullscreenElement === gd) {
        document.exitFullscreen()
      } else {
        gd.requestFullscreen()
      }
    }
  }

  // Patch Plotly.newPlot/react so every chart gets the button automatically
  // — pages call Plotly.newPlot(gd, data, layout, config) as plain imperative
  // code (see CLAUDE.md), so no per-page wiring is needed or expected.
  const addButton = (config) => {
    const buttons = (config && config.modeBarButtonsToAdd) || []
    return {...config, modeBarButtonsToAdd: [...buttons, fullscreenButton]}
  }
  for (const name of ["newPlot", "react"]) {
    const original = globalThis.Plotly[name]
    globalThis.Plotly[name] = (gd, data, layout, config) => original(gd, data, layout, addButton(config))
  }

  globalThis.VM = {...globalThis.VM, fullscreenButton}
})(window)
