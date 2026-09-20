<!--
Copyright (c) 2026 Apurva Nakade. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Apurva Nakade
-->

# mathviz

Chart theming, control panels and numerical helpers for interactive math
pages. It is the machinery behind [Visual Math Lab](https://www.visualmathlab.com),
packaged as a Quarto extension and as a plain script bundle so any site can
use it.

What you get, with no per-page wiring:

- **Themed charts.** `VM.plotting.layout()` / `config()` / `plotOptions()` give Plotly and Observable Plot the same fonts, grid, palette and tooltip style, read live from CSS custom properties -- so charts follow your site's light/dark toggle, and re-theme the instant it flips.
- **A modebar worth using.** Every Plotly chart gets a fullscreen button, gentler zoom in/out steps, pan as the default drag, and no box/lasso select -- automatically, by patching `Plotly.newPlot`/`react`.
- **Control-panel CSS.** `ojs-panel`, `ojs-row`, `ojs-grid` lay out Observable `Inputs.*` controls into a tidy panel; `ojs-chart-block` + `ojs-chart-controls` put step sliders directly above a chart (and keep them there in fullscreen).
- **Slider playback.** Every range slider inside a panel gets a play/pause button with speed and loop/bounce options.
- **A floating, draggable legend** that toggles trace visibility (`VM.ui.legendOverlay`), replacing Plotly's own.
- **Numerical helpers**: safe expression parsing via math.js, ODE steppers, quadrature, least-squares, closed-form probability densities, seeded random numbers, 1-D filters, Sperner-triangulation combinatorics.

## Install

### Quarto site or book

```sh
quarto add apurvanakade/mathviz
```

then in `_quarto.yml` (or a single page's front matter):

```yaml
filters:
  - mathviz
```

That puts math.js, Plotly, `mathviz.js` and `mathviz.css` into every HTML page's `<head>`, in that order, served from your own `site_libs/`. Options, all optional:

```yaml
mathviz:
  plotly: false             # your pages draw with D3/canvas/Plot; skip Plotly
  mathjs: false             # ...or math.js. Either also accepts a URL string
  css: false                # bring your own stylesheet
  referrer: same-origin     # emit <meta name="referrer"> before the CDN tags
```

Update later with `quarto update apurvanakade/mathviz`. Pin a version with `quarto add apurvanakade/mathviz@v0.1.0`.

### Any other web page

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/apurvanakade/mathviz@v0.1.0/dist/mathviz.css">
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/apurvanakade/mathviz@v0.1.0/dist/mathviz.js"></script>
```

Load Plotly **before** `mathviz.js` (the modebar patch runs when the bundle loads; if Plotly arrives later, call `VM.plotting.installPlotlyPatch()` yourself). `dist/mathviz.js` is a plain concatenation of the source files -- readable, un-minified, ~140 kB.

## A first chart

````markdown
::: {.ojs-panel .ojs-row}
```{ojs}
viewof fText = Inputs.text({label: "f(x)", value: "sin(x)"})
```
:::

::: {.ojs-chart-block}
```{ojs}
vmTheme = Generators.observe(notify => VM.plotting.onThemeChange(notify))
chartColors = VM.plotting.colors(vmTheme)
```
```{ojs}
mainPlot = {
  const f = VM.expressions.makeFunction(math, fText)   // null if it won't parse
  const xs = [], ys = []
  for (let i = 0; i <= 400; i++) { xs.push(-6 + 12*i/400); ys.push(f ? f(xs[i]) : NaN) }
  const div = document.createElement("div")
  div.className = "plotly-box-large"
  Plotly.newPlot(div,
    [{x: xs, y: ys, mode: "lines", line: {color: chartColors.fn}, showlegend: false}],
    VM.plotting.layout({xaxis: {title: "x"}, annotations: f ? [] : VM.plotting.emptyState("Couldn't parse that")}),
    VM.plotting.config())
  VM.plotting.autoResize(div)
  return div
}
```
:::
````

[`example.qmd`](example.qmd) is this, runnable: `quarto render example.qmd`.

The `vmTheme`/`chartColors` pair is what makes *trace* colors follow a theme toggle: chart chrome (axes, grid, tooltip) is re-themed for you by a `relayout`, but a color you baked into a trace only changes when the cell re-runs, and `colors(vmTheme)` creates that reactive dependency (`colors()` ignores its argument).

## Theming: the `--vm-*` contract

Everything -- panels, sliders, legend, chart chrome, chart palette -- is driven by CSS custom properties declared in [`src/css/tokens.css`](src/css/tokens.css). The defaults are wrapped in `:where()`, which has zero specificity, so a plain declaration in your own stylesheet always wins regardless of load order:

```css
:root {
  --vm-accent: #b45309;
  --vm-color-fn: #b45309;
  --vm-font-sans: "Inter", system-ui, sans-serif;
}
body.quarto-dark {
  --vm-accent: #fbbf24;
  --vm-color-fn: #fbbf24;
}
```

| Token | Used for |
|---|---|
| `--vm-bg`, `--vm-surface`, `--vm-surface-hover` | page and panel backgrounds |
| `--vm-text`, `--vm-text-soft` | text, axis labels |
| `--vm-border`, `--vm-grid` | panel borders, chart gridlines |
| `--vm-accent`, `--vm-accent-hover` | buttons, focus rings, slider fill |
| `--vm-radius`, `--vm-radius-sm`, `--vm-shadow` | panel shape |
| `--vm-font-sans` | chart text |
| `--vm-color-fn` / `-alt` / `-ok` / `-muted` / `-ink` / `-warn` / `-accent2` / `-accent3` / `-halo` | the chart palette `VM.plotting.colors()` returns, keyed by role: the function itself, an alternate trace, a converged marker, de-emphasized, strokes, a warning, two more accents, and the ring drawn around a marker (white on light, the page background on dark) |

**Dark mode** is detected by a selector matched against `<html>` and `<body>`: by default `body.quarto-dark` (Quarto's toggle), `[data-bs-theme="dark"]` (Bootstrap 5.3), or `.vm-dark`. Declare your dark tokens under one of those, or under your own selector and tell the JS: `VM.plotting.configure({darkSelector: ".my-dark"})`.

JS reads tokens from `document.body` at call time, so a chart built after a toggle sees the new values.

## Markup contract

| Class | Put it on | Effect |
|---|---|---|
| `ojs-panel` | a `<div>` around your `Inputs.*` cells | the control panel chrome |
| `ojs-row` / `ojs-grid` | the same div, or a nested div | one flex row / an auto-wrapping grid of controls |
| `ojs-fill` / `ojs-auto` / `ojs-end` | an input's wrapper (via `classList.add`) | fill the row / natural width / push right |
| `ojs-chart-block` | a `<div>` around the chart cell | anchor for the legend; what the fullscreen button fullscreens |
| `ojs-chart-controls` | a `<div>` inside the block, holding sliders | a bar directly above the chart that comes along into fullscreen |
| `ojs-svg-block` | alongside `ojs-chart-block`, for Observable Plot / hand-drawn SVG | adds the fullscreen button Plotly charts get from the modebar |
| `plotly-box-large` | the Plotly graph div | a tall responsive chart box |
| `vm-swatch vm-swatch-alt` (`-ok`, `-warn`, `-accent`, `-accent2`) | a `<span>` in prose | tints a color word with the matching palette color |
| `data-vm-play="off"` | a slider or ancestor | opt that slider out of the play button |

## What needs what

| | Plain JS | Needs Plotly | Needs Observable (`Inputs`/`htl`) |
|---|---|---|---|
| `VM.expressions.*` (pass a math.js instance as the first argument) | ✓ | | |
| `VM.numerical.*`, `VM.sampling.*`, `VM.filters.*`, `VM.distributions.*`, `VM.discreteMath.*` | ✓ | | |
| `VM.plotting.colors/colorway/alpha/themeName/onThemeChange/subscript/plotOptions/paddedRange` | ✓ | | |
| `VM.plotting.layout/config/hoverLabel/emptyState/themePatch/autoResize/fullscreenButton/installPlotlyPatch` | | ✓ | |
| `VM.ui.legendOverlay` (a `viewof`-compatible view), `VM.ui.applyExampleParams` | | | ✓ |
| `VM.ui.renderTable({html, headers, rows})` | | | ✓ (`html` is htl's tag; emits Bootstrap table classes) |
| slider play button, draggable legend, SVG fullscreen button | ✓ self-installing | | |

The full per-function reference is in [`CLAUDE.md`](CLAUDE.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: edit `src/`, `npm test`, `npm run build`, commit `dist/` too.

## License

Apache-2.0. Copyright (c) 2026 Apurva Nakade.
