<!--
Copyright (c) 2026 Apurva Nakade. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Apurva Nakade
-->

# mathviz starter

A complete Quarto website that uses [mathviz](https://github.com/apurvanakade/mathviz): seven working pages, the extension already installed. Copy the folder and it runs.

## Quick start

```sh
git clone https://github.com/apurvanakade/mathviz
cp -r mathviz/starter my-site && cd my-site
quarto preview
```

Requires [Quarto](https://quarto.org/docs/get-started/) 1.4 or later. Nothing else to install: the extension is in `_extensions/`, and math.js and Plotly load from a CDN.

## Add a page

1. Copy any `.qmd` here (`index.qmd` is the smallest) to `my-page.qmd`.
2. Edit its cells. Every `VM.*` function and every `ojs-*` class comes from the extension; nothing to import.
3. List it under `navbar` in `_quarto.yml`.

The pages, simplest first:

| Page | Shows |
|---|---|
| `index.qmd` | a text field and a slider driving one chart -- the pattern every page follows |
| `function-explorer.qmd` | a floating legend that toggles traces; a field that turns red on bad input |
| `step-slider.qmd` | an iteration slider above the chart with a play button; a results table with CSV download |
| `ode-convergence.qmd` | Euler / RK4 steppers; a Plotly chart and an Observable Plot chart sharing the theme |
| `distribution-explorer.qmd` | a closed-form density with a histogram of seeded samples under it |
| `try-an-example.qmd` | a "Try an example" dropdown that fills the fields and runs the page |
| `observable-plot.qmd` | Observable Plot with the theme applied and a fullscreen button |

Each file starts with a comment saying what it demonstrates and where the relevant documentation is.

## Make it yours

- **Site name, pages, theme**: `_quarto.yml`. Any light/dark Bootswatch pair works; the charts follow the toggle.
- **Colors and fonts**: add a `styles.css`, list it under `format: html: css:` in `_quarto.yml`, and redeclare `--vm-*` tokens -- see [Theming](https://apurvanakade.github.io/mathviz/docs/theming.html).
- **Layout classes** (`ojs-panel`, `ojs-row`, `ojs-chart-block`, …): [Markup](https://apurvanakade.github.io/mathviz/docs/markup.html).
- **Every function**: the [API reference](https://apurvanakade.github.io/mathviz/docs/reference/).

## Upgrade the library

```sh
quarto update apurvanakade/mathviz
```

`_extensions/mathviz/` is what `quarto add apurvanakade/mathviz` installs; `quarto update` replaces it with the latest tag. Don't edit it by hand.
