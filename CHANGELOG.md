<!--
Copyright (c) 2026 Apurva Nakade. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Apurva Nakade
-->

# Changelog

All notable changes to mathviz. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/) and are the tags consumers pin (`quarto add apurvanakade/mathviz@vX.Y.Z`, `…/mathviz@vX.Y.Z/dist/…`).

## [Unreleased]

### Added

- Four CSS tokens for control chrome, all listed on the Theming page: `--vm-on-accent` (text and icons drawn *on* `--vm-accent`), `--vm-control-h` (the one height every control in a panel or controls bar takes), `--vm-label-size` (the size a control's label is set in) and `--vm-select-chevron` (the `<select>` dropdown arrow, declared per theme as a whole `url()` because `var()` does not resolve inside a `data:` URI).
- `scripts/css-coverage.test.js`: `npm test` now fails if a token in `tokens.css` is missing from the Theming page's table (or the table lists one that doesn't exist), or if a `--vm-*` property or `ojs-*`/`vm-*` class the CSS uses is mentioned nowhere in the docs. CI also fails a pull request that changes `src/` without a `CHANGELOG.md` entry, unless it carries the `no-changelog` label.
- `<select>` inside `.ojs-panel`, and the number readout beside a slider in `.ojs-chart-controls`, are now skinned like every other field. Both previously rendered as bare browser defaults -- a square-cornered, full-width box and a stock spinner -- next to rounded, bordered inputs.

### Changed

- Panels and controls bars are more compact. Every control shares `--vm-control-h`; labels are set at `--vm-label-size` in `--vm-text-soft` with Observable Inputs' own label padding reset, which takes a field from roughly 70 px to 48 px (the label used to be taller than the control it labels). `.ojs-grid`'s auto-fit floor drops from 250 px to 200 px with slightly wider gaps, so four controls fit one row at normal page width where three did before, and `.ojs-panel` now spaces its own top-level rows with a margin rather than relying on each label's height.
- An `ojs-fill` text field sharing an `ojs-row` with other controls takes the width they leave instead of a fixed 20 em, so a long expression field and its Plot button fill the row as one unit. On a row of its own it still starts at 20 em.
- Filled buttons in a panel take `--vm-on-accent` rather than `#fff`, and lose their inset highlight. White on the dark theme's pale accent measured 2.09:1 -- below even the 3:1 large-text floor -- which made every button hard to read in dark mode.
- `.ojs-chart-controls` no longer carries a box shadow. It sits directly under the panel above it, and a second shadowed card read as two stacked slabs rather than one control strip.
- `.vm-invalid` reads `--vm-color-alt` with no hardcoded `#dc2626` fallback, so a page that redefines the palette gets its own red.
- `npm run build` mirrors the extension into `starter/_extensions/mathviz` only when a `starter/` directory is present, so the same script also runs in VisualMathLab, which mirrors out only the code. No change here, where `starter/` always exists.

## [0.1.4] - 2026-09-21

### Fixed

- The floating legend (`VM.ui.legendOverlay`) is hidden for a narrow **chart** (under 600px wide) rather than a narrow **viewport** (under 992px). The viewport breakpoint read every `<iframe>` of ordinary column width as a phone, so a chart embedded in another site lost its legend on a desktop with room to spare. `.ojs-chart-block` is now a named inline-size query container (`vm-chart`) and the rule is a `@container` query on it. On a page this also means a tablet-width chart (roughly 600-990px) now shows the legend; a phone's does not, and fullscreen is unchanged.

## [0.1.3] - 2026-09-21

### Added

- Prose swatch modifiers for every palette color: `vm-swatch-fn`, `-muted`, `-ink` and `-accent3` join `-alt`, `-ok`, `-warn`, `-accent2` (and `-accent`). Blue Sperner vertices should now be described with `-fn`, which reads the same token `vertexColor('blue')` does; `-accent` reads the UI accent, which only equals it in the default palette.
- `starter/`: a complete, clone-and-go Quarto website -- a first page plus one page per pattern (function explorer, step slider with playback, ODE with a convergence plot, distribution explorer, "try an example" dropdown, Observable Plot) -- with the extension mirrored in by `npm run build` and rendered by CI.

### Changed

- The documentation is restructured around getting a page built: the guide (landing page with a quick start, Building a page, Theming, Markup, Installing, Troubleshooting) says only what to write; every mechanism it used to explain in passing is now under Reference › Internals. The recipe pages moved into `starter/` as app pages, and `example.qmd` is replaced by `starter/index.qmd`.

## [0.1.2] - 2026-09-21

### Added

- A documentation site (`docs/`, rendered with Quarto and published to GitHub Pages): guides for installing, a first chart, theming, the markup contract and troubleshooting; an API reference page per `VM.*` namespace with live examples; six complete recipe pages.
- JSDoc on every public function in `src/js`, so signatures, defaults and edge behaviour are visible in an editor and travel with `dist/mathviz.js`.
- `src/docs-coverage.test.js`: `npm test` now fails if any `VM.*` member lacks a reference entry, or a reference heading names something that doesn't exist.
- `CHANGELOG.md`.

### Changed

- CI renders the whole docs site (`quarto render`) rather than only `example.qmd`, so every documented snippet is compiled through the extension on each push.
- `README.md` is now a front door that links into the docs; `CLAUDE.md` keeps the invariants and gotchas and no longer duplicates the function catalog.
- `dist/mathviz.js` grew from ~143 kB to ~173 kB, all documentation comments.

### Removed

- The CSS tokens `--vm-font-weight-body` and `--vm-font-weight-display`. They were declared with defaults but read by nothing -- no stylesheet, no script -- so overriding them never had an effect. A site that set them can delete the declarations.

### Fixed

- Documentation that had drifted from the code: `VM.numerical.polynomialFit` returns `{coeffs, evaluate, totalSquaredError}` (not a bare coefficient array); `VM.expressions.makeRational(expr)` takes no math.js instance and parses literals only; `VM.numerical.l1Regression` also returns `iterations`; `VM.ui.renderTable` accepts `csvHeaders` and `filename`; the table classes are `ojs-table-toolbar`/`ojs-table-container` (there is no `ojs-table`); `VM.plotting.themeName()` exists.
- `src/js/ui/slider-play.js` now ends in `})(window)` like every other module (it ended in `})(globalThis);`; behaviour unchanged).
- `.github/workflows/ci.yml` was not valid YAML (an unquoted `run:` containing `: `), so CI had never run; and `npm ci` had no `package-lock.json` to install from. Both fixed, and CI is green.
- Two dead statements in `chart-theme.js` (an unused `surface` read in `layout()`, a no-op in `plotOptions()`) and a stale comment in `gamma-pdf.js` referring to a function that isn't in this library.

## [0.1.1] - 2026-09-20

### Fixed

- The dark-mode selector is root-scoped -- `html[data-bs-theme="dark"]`, `body[data-bs-theme="dark"]`, `html.vm-dark`, `body.vm-dark` -- instead of a bare `[data-bs-theme="dark"]` / `.vm-dark`. Quarto sets `data-bs-theme="dark"` directly on its `<nav>` to force a dark navbar, and since custom properties inherit, the unscoped match leaked the whole dark palette into the navbar on a light page. Changed in both places the list lives (`src/css/tokens.css` and `settings.darkSelector` in `src/js/plotting/chart-theme.js`). A site that relied on `.vm-dark` on some element other than `<html>`/`<body>` must move it.

## [0.1.0] - 2026-09-20

### Added

- Initial release, extracted from [Visual Math Lab](https://github.com/apurvanakade/VisualMathLab)'s `js/` and stylesheet into a standalone library shipped as a Quarto extension (`_extensions/mathviz/`) and a script bundle (`dist/`).
- `VM.expressions`, `VM.numerical`, `VM.sampling`, `VM.filters`, `VM.distributions`, `VM.plotting`, `VM.ui`, `VM.discreteMath`.
- The `--vm-*` token contract, the `ojs-*` panel and chart-block classes, the Plotly modebar patch, slider playback, the draggable legend overlay, the SVG fullscreen button.
- The Lua filter with `plotly`, `mathjs`, `css` and `referrer` options.

[Unreleased]: https://github.com/apurvanakade/mathviz/compare/v0.1.3...HEAD
[0.1.3]: https://github.com/apurvanakade/mathviz/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/apurvanakade/mathviz/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/apurvanakade/mathviz/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/apurvanakade/mathviz/releases/tag/v0.1.0
