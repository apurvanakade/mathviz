<!--
Copyright (c) 2026 Apurva Nakade. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Apurva Nakade
-->

# mathviz starter

A complete Quarto website that uses [mathviz](https://github.com/apurvanakade/mathviz): every feature on a working page, every site option turned on, the extension already installed. Copy the folder and it runs.

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
3. List it under `sidebar` in `_quarto.yml`. Give it a `description:` and `categories:` for its card in `gallery.qmd`.

The pages, simplest first:

| Page | Shows |
|---|---|
| `index.qmd` | a text field and a slider driving one chart -- the pattern every page follows |
| `function-explorer.qmd` | a floating legend that toggles traces; a field that turns red on bad input |
| `step-slider.qmd` | an iteration slider above the chart with a play button; a results table with CSV download |
| `ode-convergence.qmd` | Euler / RK4 steppers; a Plotly chart and an Observable Plot chart sharing the theme |
| `distribution-explorer.qmd` | a closed-form density with a histogram of seeded samples under it |
| `try-an-example.qmd` | a "Try an example" dropdown that fills the fields and runs the page |
| `observable-plot.qmd` | Observable Plot with the theme applied, and the SVG modebar (fullscreen) every Plot chart gets |
| `draggable-points.qmd` | points the reader drags on a chart, as an input; one kept inside a triangle |
| `panels.qmd` | every panel layout class (`ojs-row`, `ojs-grid`, `ojs-fill`, `ojs-auto`, `ojs-end`) and every kind of input; a bar of sliders, one without a play button |
| `readouts.qmd` | a static key and a stat row under a chart; a legend in the top-right corner; a hand-built SVG with the modebar, and a chart without one |
| `prose.qmd` | color words that match their traces; callouts, a theorem, a table, a figure and a reference list in the theme; one app to embed |
| `quiet-apps.qmd` | the unboxed look for prose-first sites (`quiet-apps`), on this page alone |
| `quiet-toc.qmd` | a long prose page with the quiet table of contents (`quiet-toc`), on this page alone |
| `gallery.qmd` | a card for every page, with a category cloud |

Each file starts with a comment saying what it demonstrates and where the relevant documentation is.

`_quarto.yml` turns on every site option (theme, fonts, sidebar rail and search, embed, Share), each with a comment, and three pages turn on one for themselves (`category-cloud`, `quiet-apps`, `quiet-toc`); `banner.html` is a note of the site's own that embedded apps hide. Delete what you don't want.

## Make it yours

- **Site name, pages, theme**: `_quarto.yml`. The mathviz theme is on; any light/dark Bootswatch pair works instead, and the charts follow the toggle.
- **Share**: set `share: site-url` to your site's address.
- **Colors and fonts**: add a `styles.css`, list it under `format: html: css:` in `_quarto.yml`, and redeclare `--vm-*` tokens -- see [Theming](https://apurvanakade.github.io/mathviz/docs/theming.html).
- **Layout classes** (`ojs-panel`, `ojs-row`, `ojs-chart-block`, …): [Markup](https://apurvanakade.github.io/mathviz/docs/markup.html).
- **Every function**: the [API reference](https://apurvanakade.github.io/mathviz/docs/reference/).

## Upgrade the library

```sh
quarto update apurvanakade/mathviz@v1.16.1
```

Name the release you want (the newest is at the top of the [changelog](https://github.com/apurvanakade/mathviz/blob/main/CHANGELOG.md)); without a tag Quarto installs the `main` branch. `quarto update` replaces `_extensions/mathviz/` with that release. Don't edit it by hand.
