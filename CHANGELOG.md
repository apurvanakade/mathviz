<!--
Copyright (c) 2026 Apurva Nakade. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Apurva Nakade
-->

# Changelog

All notable changes to mathviz. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/) and are the tags consumers pin (`quarto add apurvanakade/mathviz@vX.Y.Z`, `…/mathviz@vX.Y.Z/dist/…`).

## [Unreleased]

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

[Unreleased]: https://github.com/apurvanakade/mathviz/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/apurvanakade/mathviz/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/apurvanakade/mathviz/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/apurvanakade/mathviz/releases/tag/v0.1.0
