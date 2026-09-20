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

**Documentation: <https://apurvanakade.github.io/mathviz/>** -- guides, a
full API reference with live examples, and complete recipe pages to copy.
Every chart on that site is drawn by the library; toggle the theme to see it
follow.

What you get, with no per-page wiring:

- **Themed charts.** `VM.plotting.layout()` / `config()` / `plotOptions()` give Plotly and Observable Plot the same fonts, grid, palette and tooltip style, read live from CSS custom properties -- so charts follow your site's light/dark toggle, and re-theme the instant it flips.
- **A modebar worth using.** Every Plotly chart gets a fullscreen button, gentler zoom in/out steps, pan as the default drag, and no box/lasso select -- automatically, by patching `Plotly.newPlot`/`react`.
- **Control-panel CSS.** `ojs-panel`, `ojs-row`, `ojs-grid` lay out Observable `Inputs.*` controls into a tidy panel; `ojs-chart-block` + `ojs-chart-controls` put step sliders directly above a chart (and keep them there in fullscreen).
- **Slider playback.** Every range slider inside a panel gets a play/pause button with speed and loop/bounce options.
- **A floating, draggable legend** that toggles trace visibility (`VM.ui.legendOverlay`), replacing Plotly's own.
- **Numerical helpers**: safe expression parsing via math.js, ODE steppers, quadrature, least-squares, sixteen closed-form probability densities, seeded random numbers, 1-D filters, Sperner-triangulation combinatorics.

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

Update later with `quarto update apurvanakade/mathviz`. Pin a version with `quarto add apurvanakade/mathviz@v0.1.1`.

### Any other web page

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/apurvanakade/mathviz@v0.1.1/dist/mathviz.css">
<script src="https://cdn.jsdelivr.net/npm/mathjs@15.2.0/lib/browser/math.js"></script>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<script src="https://cdn.jsdelivr.net/gh/apurvanakade/mathviz@v0.1.1/dist/mathviz.js"></script>
```

Load Plotly **before** `mathviz.js` (the modebar patch runs when the bundle loads; if Plotly arrives later, call `VM.plotting.installPlotlyPatch()` yourself). `dist/mathviz.js` is a plain concatenation of the documented source files -- readable, un-minified, ~170 kB.

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

[`example.qmd`](example.qmd) is this, runnable: `quarto render example.qmd`. The docs walk through it [cell by cell](https://apurvanakade.github.io/mathviz/docs/first-chart.html).

The `vmTheme`/`chartColors` pair is what makes *trace* colors follow a theme toggle: chart chrome (axes, grid, tooltip) is re-themed for you by a `relayout`, but a color you baked into a trace only changes when the cell re-runs, and `colors(vmTheme)` creates that reactive dependency (`colors()` ignores its argument).

## Theming in one paragraph

Everything is driven by `--vm-*` CSS custom properties declared in [`src/css/tokens.css`](src/css/tokens.css), wrapped in `:where()` so a plain `:root { --vm-accent: … }` in your own stylesheet wins regardless of load order. Dark mode is detected by `body.quarto-dark`, `[data-bs-theme="dark"]` on `html`/`body`, or `.vm-dark` on `html`/`body`; name your own with `VM.plotting.configure({darkSelector})`. The full token table, live, is on the [Theming](https://apurvanakade.github.io/mathviz/docs/theming.html) page.

## Documentation

| | |
|---|---|
| [Installing](https://apurvanakade.github.io/mathviz/docs/install.html) | both channels, every filter option, what needs what |
| [Your first chart](https://apurvanakade.github.io/mathviz/docs/first-chart.html) | the page above, cell by cell |
| [Theming](https://apurvanakade.github.io/mathviz/docs/theming.html) | every token, dark-mode detection, following the theme in a chart |
| [Markup contract](https://apurvanakade.github.io/mathviz/docs/markup.html) | every `ojs-*` / `vm-*` class and `data-vm-*` attribute, with live examples |
| [API reference](https://apurvanakade.github.io/mathviz/docs/reference/) | every `VM.*` function |
| [Recipes](https://apurvanakade.github.io/mathviz/docs/recipes/) | complete pages: function explorer, step slider with playback, ODE with convergence plot, distribution explorer, example presets, Observable Plot |
| [Troubleshooting](https://apurvanakade.github.io/mathviz/docs/troubleshooting.html) | symptom → cause → fix |

The site is the repository's `docs/` folder rendered with Quarto; `quarto preview` at the repo root serves it locally.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: edit `src/`, add JSDoc and a reference entry, `npm test`, `npm run build`, commit `dist/` too. Changes are listed in [CHANGELOG.md](CHANGELOG.md).

## License

Apache-2.0. Copyright (c) 2026 Apurva Nakade.
