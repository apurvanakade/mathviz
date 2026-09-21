<!--
Copyright (c) 2026 Apurva Nakade. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Apurva Nakade
-->

# mathviz

Themed charts, control panels and numerical helpers for interactive math
pages. It is the machinery behind [Visual Math Lab](https://www.visualmathlab.com),
packaged as a Quarto extension and as a plain script bundle so any site can
use it.

**Documentation: <https://apurvanakade.github.io/mathviz/>**

## Quick start

**A new site** -- copy the starter, a complete Quarto website with seven
working pages and the extension already installed:

```sh
git clone https://github.com/apurvanakade/mathviz
cp -r mathviz/starter my-site && cd my-site
quarto preview
```

Then copy any page, rename it, and edit its cells. [`starter/README.md`](starter/README.md)
lists what each page shows.

**An existing Quarto site:**

```sh
quarto add apurvanakade/mathviz
```

```yaml
# _quarto.yml
filters:
  - mathviz
```

Every page now has `VM`, math.js, Plotly and the stylesheet. For a
non-Quarto page, or the filter's options, see [Installing](https://apurvanakade.github.io/mathviz/docs/install.html).

## What you get

- **Themed charts** -- Plotly and Observable Plot follow your site's light/dark toggle, with no per-page code.
- **Control panels** -- a few `ojs-*` classes lay Observable inputs out into a tidy panel; step sliders sit above the chart and get a play button.
- **A better modebar and a draggable legend** -- fullscreen, gentler zoom, pan by default; a floating legend that toggles traces.
- **Numerical helpers** -- safe expression parsing, ODE steppers, quadrature, fits, sixteen closed-form densities, seeded randomness.

## Documentation

| | |
|---|---|
| [Building a page](https://apurvanakade.github.io/mathviz/docs/first-chart.html) | the starter's first page, cell by cell |
| [Theming](https://apurvanakade.github.io/mathviz/docs/theming.html) | make the colors and fonts yours |
| [Markup](https://apurvanakade.github.io/mathviz/docs/markup.html) | the `ojs-*` classes that lay out panels and charts |
| [Installing](https://apurvanakade.github.io/mathviz/docs/install.html) | filter options, pinning, non-Quarto pages |
| [API reference](https://apurvanakade.github.io/mathviz/docs/reference/) | every `VM.*` function, with live examples |
| [Starter](starter/) | the clone-and-go site: one page per pattern |

The site is the repository's `docs/` folder rendered with Quarto; `quarto preview` at the repo root serves it locally.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Short version: edit `src/`, add JSDoc and a reference entry, `npm test`, `npm run build`, commit `dist/` too. Changes are listed in [CHANGELOG.md](CHANGELOG.md).

## License

Apache-2.0. Copyright (c) 2026 Apurva Nakade.
