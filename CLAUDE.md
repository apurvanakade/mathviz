<!--
Copyright (c) 2026 Apurva Nakade. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Apurva Nakade
-->

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

mathviz is the shared chart/control/numerics library behind [Visual Math Lab](https://github.com/apurvanakade/VisualMathLab), extracted so other sites can use it. It ships two ways from one source tree: as a **Quarto extension** (`_extensions/mathviz/`, installed with `quarto add apurvanakade/mathviz`, enabled with `filters: [mathviz]`) and as a **plain script bundle** (`dist/mathviz.js` + `dist/mathviz.css`, served from jsDelivr by tag). The README is the front door with the quick start; `starter/` is the clone-and-go site a newcomer copies (one page per pattern -- the former recipes); `docs/` (rendered with `quarto render`, published to GitHub Pages) is the consumer-facing guide and API reference. The guide says only what to write, the reference (including `reference/internals.qmd`) holds every mechanism -- keep technical detail out of the guide pages. This file is for working on the library itself.

## Where this code is authored

**`src/`, `scripts/build.mjs`, `scripts/load-vm.mjs`, `package.json` and
`_extensions/mathviz/{_extension.yml,mathviz.lua}` are mirrored into this
repository from [VisualMathLab](https://github.com/apurvanakade/VisualMathLab)'s
`_mathviz/` folder, which is where they are authored. Edits to them here are
overwritten by the next sync.** That repository builds the apps this library
exists for, so a shared function is written where it is first needed and
travels out from there; its `CLAUDE.md` has the full picture.

Every sync lands on the `sync/from-visualmathlab` branch with one standing
pull request, never directly on `main`, and this repository's CI gates it.

**Authored here, and not mirrored:** `docs/**` (the guide and the API
reference), `starter/**`, `_quarto.yml`, `CHANGELOG.md`, the Markdown files
at the root, and `.github/**`. Writing a new member's reference entry is
work that happens *here*, on the sync branch: `scripts/docs-coverage.test.js`
fails CI until it exists, which is what keeps `main` — and the published docs
— honest without making it a VisualMathLab contributor's problem.

So the two everyday loops are:

- **Changing a function, a token, a CSS rule** — do it in VisualMathLab under
  `_mathviz/`, where you can try it on a real app page. It arrives here on its
  own.
- **Documenting one, or editing the guide or the starter** — do it here, on the
  sync branch if a sync is waiting on it.

## Commands

- `npm test` — `node --test` over every `src/**/*.test.js`. Tests load the real source files through `scripts/load-vm.mjs` (indirect `eval` into a stubbed `window`, in manifest order) rather than re-implementing anything. Requires `npm install` once (only `mathjs`, for the expression tests).
- `npm run build` — `scripts/build.mjs` concatenates `src/js/**` and `src/css/**` in the order `src/manifest.mjs` lists them into `dist/`, syntax-checks the JS, copies both files into `_extensions/mathviz/dist/`, and mirrors the whole extension into `starter/_extensions/mathviz/` (what `quarto add` would install there). Dependency-free. The sync workflow runs it here after copying `src/` in, so `dist/`, the extension copy and the starter mirror all land rebuilt; run it yourself after any change you make here that feeds the build. `dist/` and the starter mirror are committed and CI fails if either is stale.
- `npm run check` — test + build + `git diff --exit-code` on the built files; what CI runs.
- `quarto render` — renders the docs site (`docs/**/*.qmd`) through the extension in place (`_quarto.yml` at the repo root makes the repo the Quarto project, so `_extensions/` is found with no install step) into `_site/` (gitignored). `quarto preview` for live reload. Every docs page is a real page using the library, so this is also the broadest smoke test — CI runs it. OJS errors only show in a browser: serve `_site/` over HTTP (module scripts don't load from `file://`) and check the console; `.observablehq--error` is the class a failed cell renders with.
- `quarto render starter` — the starter is its own Quarto project (own `_quarto.yml`, excluded from the root render allowlist) using the mirrored extension, the way a consumer has it; CI renders it too. `starter/index.qmd` is the minimal page (the walkthrough in `docs/first-chart.qmd` is this file).
- To try the extension in another Quarto project: `quarto add /path/to/mathviz --no-prompt` from that project (a local directory is accepted; it copies `_extensions/mathviz/` in — re-run after each `npm run build`). A symlink at `_extensions/mathviz` is **not** discovered by Quarto (it checks `isDirectory()` on the raw dirent). Visual Math Lab no longer does this: it builds the extension straight out of its own `_mathviz/` with `npm run build:mathviz`.

## Layout and the rules that hold it together

```
_extensions/mathviz/   the Quarto extension: _extension.yml, mathviz.lua, dist/ (copied by the build)
dist/                  generated bundle, committed (jsDelivr target); never hand-edit
src/manifest.mjs       THE load order, for both the build and the tests
src/js/<category>/     one VM.<category>.<fn> per file (a few export 2–3 that belong together), IIFE extending window.VM; tests colocated
src/css/               tokens.css (all --vm-* defaults), then panel, chart-block, swatch, legend-controls, modebar, sliders, table
scripts/               load-vm.mjs (test loader), build.mjs, docs-coverage.test.js + css-coverage.test.js (authored here; see above)
starter/               clone-and-go Quarto site: README, _quarto.yml, index.qmd + one page per pattern, _extensions/mathviz/ (build mirror)
_quarto.yml            the docs site project (output-dir _site, render allowlist)
docs/                  the site: guide pages at the top level, reference/<category>.qmd + reference/internals.qmd
```

- **Every `src/js` file must be listed in `src/manifest.mjs`**, after anything it reads at load time; `src/manifest.test.js` enforces both the completeness and the `mustPrecede` constraints. The build inserts a `;` between JS files because each is an IIFE ending in a call — `})(window)`, or `})()` for `range-progress.js`, which exports nothing — with no trailing semicolon, and two of those in a row parse as `})(window)(function …)`, a call — valid syntax, so `node --check` can't catch it.
- **Version lives in three places** — `package.json`, `_extensions/mathviz/_extension.yml`, `VERSION` in `mathviz.lua` — and the build refuses to run unless they agree. The version names the `site_libs/quarto-contrib/mathviz-<version>/` folder in a consumer's output, which is what busts their cache on upgrade.
- **The Lua filter adds one html dependency per vendor `<script>` tag** (`mathviz-mathjs`, `mathviz-plotly`, and `mathviz-referrer` for the optional meta), each *before* the `mathviz` dependency that carries the bundle. Three Quarto facts force this shape, all verified against Quarto 1.7's source: (1) `quarto.doc.include_text("in-header", ...)` lands in `header-includes`, which is emitted *below* the whole dependency block, so a Plotly tag added that way loads after `mathviz.js` — and `plotly-fullscreen-button.js` patches `Plotly.newPlot` the moment it runs; (2) within one dependency `scripts` are emitted before `head`, so the tags can't share the bundle's dependency; (3) Quarto's `injectHtml` iterates a *live* `children` collection while moving nodes out of it, so a `head` string with several tags loses every second one — one tag per dependency is the workaround. `scripts`/`stylesheets` entries must be local files (Quarto copies them), hence raw `<script>` tags in `head` for the CDN URLs. A head-only dependency creates no `site_libs` folder.
- **Extension CSS loads before a project's `css:` files but after its compiled theme SCSS.** That is why every default in `src/css/tokens.css` is wrapped in `:where()` (zero specificity): a consumer's plain `:root { --vm-x: ... }` must win whatever the order. Don't unwrap them.
- **Dark mode is one selector list in two places** — `settings.darkSelector` in `src/js/plotting/chart-theme.js` and the `:where(...)` block in `src/css/tokens.css`. Change both or neither. Default: `body.quarto-dark` (Quarto's toggle), `html[data-bs-theme="dark"]`/`body[data-bs-theme="dark"]` (Bootstrap 5.3), `html.vm-dark`/`body.vm-dark` (anyone else) — root-scoped on purpose, never a bare `[data-bs-theme="dark"]`/`.vm-dark`: Quarto sets that same attribute directly on its `<nav>` to force a dark navbar independent of the page theme, and since custom properties inherit down the DOM, an unscoped match leaked the whole dark palette into the navbar on a light page (shipped in v0.1.0, fixed in v0.1.1 — see the header comments in both files for the story).
- **`src/css` targets Quarto OJS and Observable Inputs markup on purpose** — `.cell-output-display` (Quarto's per-cell output wrapper), `.quarto-layout-cell`, `form[class^="oi-"]` (Observable Inputs' generated forms). Quarto OJS is the primary host; the rules are harmless elsewhere. Observable Inputs injects its own `.oi-<hash>` rules into `<head>` at runtime, *after* any stylesheet, so a rule of ours that ties on specificity with one of those loses silently and only in the browser — out-specify it (scope under `.ojs-panel`/`.ojs-chart-controls` plus `form[class^="oi-"]`) or use `!important`, as the existing rules do.
- Prefer explicit `for`/`while` loops and `if`/`else` over `.map()/.filter()/.reduce()` chains and ternaries in `src/js` — the code is read by a Python-oriented audience. Callbacks required by an API (Plotly config values, `Plot` accessors, `addEventListener`) are fine. Stateful closures that exist for a real reason are not a style violation.
- **Every public function has a JSDoc block** in the style of `src/js/plotting/padded-range.js` (summary, `@param` with types and `[opts.key=default]`, `@returns` with the exact shape, and the edge behaviour: what returns `null`, what isn't validated). The prose comments around it carry the *why*; don't fold them into the JSDoc or delete them. The build concatenates comments into `dist/`, so they reach consumers.
- **Every `VM.*` member has a `### VM.<category>.<name>(…) {#name}` heading in `docs/reference/<category>.qmd`** (`discreteMath` → `discrete-math.qmd`). `scripts/docs-coverage.test.js` loads the bundle, walks `VM`, and fails on any member without a heading or heading without a member. Since `src/` is mirrored and `docs/` is not, the two no longer land in one commit: the sync branch arrives red, and the entry is written on it before it can merge.
- **Every token in `tokens.css` has a row in `docs/theming.qmd`'s live table; every other `--vm-*` property and every `ojs-*`/`vm-*` class the CSS uses is mentioned in `markup.qmd`, `theming.qmd` or `reference/internals.qmd`.** `scripts/css-coverage.test.js` enforces it (comments stripped first). It checks names, not prose: a changed value under an unchanged name still needs a read of the diff against the guide, which is step 4 of `/land-pr`.
- **A PR that touches `src/` must touch `CHANGELOG.md`** — CI's `changelog` job, skipped by the `no-changelog` label. Sync PRs arrive red on it for the same reason as docs-coverage.
- **Nothing merges itself.** The mirror workflow opens the sync PR without auto-merge. Land any PR with the `/land-pr` skill (`.claude/skills/land-pr/SKILL.md`), run when asked: fix or answer the review comments, check the guide and CHANGELOG against the diff, wait for green CI, then squash-merge.
- Every new file starts with the license header for its type — see CONTRIBUTING.md.

## Releasing

A release spans both repositories, in this order:

1. **In VisualMathLab**, run the `Release mathviz` workflow with the new version. It sets the three versions (`package.json`, `_extension.yml`, `mathviz.lua` — the build refuses to run unless they agree), rebuilds, tests, commits to `develop`, and syncs.
2. **Here**, the sync pull request now carries the bump. Move the `Unreleased` entries in `CHANGELOG.md` under the new version and write any missing `docs/reference/` entries **on that branch** — `scripts/docs-coverage.test.js` is telling you which. The install snippets in `docs/` and `README.md` name a tag, so bump those too. Land it with `/land-pr` (review comments, docs checked against the diff, green CI, then merge); once it reaches `main`, `.github/workflows/docs.yml` republishes the docs site.
3. **Here**, run the `Tag release` workflow. It tags whatever version `main` declares, after re-checking that `main` is built and that the tag is new.

Consumers then `quarto update apurvanakade/mathviz@vX.Y.Z`, or bump the tag in their jsDelivr URLs. Visual Math Lab is no longer one of them — it builds the extension from its own `_mathviz/`, so it already has the change; the tag is for everyone else.


## API surface

`window.VM` has eight namespaces — `expressions`, `numerical`, `sampling`, `filters`, `distributions`, `plotting`, `ui`, `discreteMath` — one per `src/js/<category>/` folder. When adding a category, follow the same pattern (a new folder, a new `VM.<category>`, a new `docs/reference/<category>.qmd`, a new entry in the `pageFor` map in `scripts/docs-coverage.test.js`) rather than adding flat top-level functions.

Signatures and behaviour live in the JSDoc in each source file and, with context and live examples, in `docs/reference/`. Don't duplicate them here. What belongs here is what a consumer doesn't need and an editor does — the invariants below.

Files that export more than one member, by design: `plotting/chart-theme.js` (14 — the theme is one concern), `ui/slider-play.js` (`playbackDuration`, `playbackFrame`, and the number `playbackTweenMs`), `filters/kalman-1d-filter.js` (`kalman1DStep`, `kalman1DFilter`), `plotting/plotly-fullscreen-button.js` (`fullscreenButton` object, `installPlotlyPatch`), `plotting/svg-fullscreen-button.js` and `ui/draggable-overlay.js` (two pure helpers each, exported for tests). `ui/range-progress.js` exports nothing.

## Invariants and gotchas

Each of these was learned from a real bug. The docs explain them to consumers where relevant (`docs/theming.qmd`, `docs/troubleshooting.qmd`); this is the editor's list.

- **Read `--vm-*` tokens from `document.body`, never `document.documentElement`.** The light tokens are on `:root` but the dark ones under selectors matching `<body>`, so `<html>` reports the light value in dark mode. `cssVar()` in `chart-theme.js` did this once and every chart's hover label rendered as a white box on the dark theme. Everything reads through `cssVar()`; keep it that way.
- **Theme changes are notified two frames late, and only on a real change.** Quarto flips the body class and swaps the stylesheet as separate steps, class first, so an inline callback reads the outgoing theme. `onThemeChange` defers via two `requestAnimationFrame`s and compares `themeName()` **inside** the deferral — `<body>`'s class list is shared (Visual Math Lab's sidebar rail writes `.vm-sidebar-open`/`.vm-sidebar-pinned` to it), and without the comparison every such write rebuilt every chart on the page. Same guard, same placement, in `plotly-fullscreen-button.js`'s relayout subscriber (it subscribes to `onThemeChange` rather than owning a second observer). Keep the comparison inside the two-frame wait, not around it.
- **Palette = `FALLBACK` in `chart-theme.js` + both CSS blocks in `tokens.css`.** Adding a color means all three. `FALLBACK` is only for when no stylesheet is loaded (CDN user who skipped the CSS, the Node stub). `colorway()` excludes `halo` on purpose — cycling a trace onto the background color makes it invisible.
- **Colors are read at call time; a cell that stores them must depend on `chartColors`.** `colors()`, `alpha()`, `vertexColor()`, `pairColor()`, `triangleFillColor()` all read the live theme. A page cell that stores their output in a data structure goes stale on a toggle unless it has a `chartColors;` dependency line. Their unit tests assert the light-theme values (the Node stub has no `<body>`, so `isDark()` is false).
- **`hoverLabel()` must be applied per trace.** Plotly derives a trace's tooltip background from that trace's color unless the trace sets `hoverlabel`, so a layout-level default never shows. The patch's `withTraceDefaults` does this; if you build a chart outside the patch, do it yourself.
- **`themePatch()` is flat on purpose.** `Plotly.relayout` replaces whatever attribute a key names wholesale, so a nested `{xaxis: {...}}` would wipe a page's own `xaxis.title`/`range`. Dotted keys only.
- **`layout()` has small non-zero margins; never `margin: {l:0,r:0,t:0,b:0}` in a page layout.** It defeats `automargin` and jams the rotated y-title against the edge.
- **`autoResize` must self-disconnect.** Charts are built detached (Plotly measures 0×0), so every `mainPlot` needs a resize once the div lands — but a bare `ResizeObserver` outlives its div and throws `"Resize must be passed a displayed plot div element."` when a re-run replaces it. The observer checks `div.isConnected` and disconnects.
- **The modebar is an explicit `config.modeBarButtons` list, not `ToAdd`/`ToRemove`** — swapping the zoom buttons via the latter relocates them to the end of the bar. Safe only because every chart is 2-D cartesian. `ZOOM_STEP = 1.25` is module-private.
- **Floating UI inside an OJS cell must be a native `[popover]` (top layer).** Quarto's `.cell-output-display` has `overflow: auto`, a scroll container that clips escaping descendants; the playback popover was cut to a sliver until it moved to the top layer. No `z-index` fixes a clip. This applies to any future floating element, not just that popover. Only the position is set from script (no cross-browser anchor positioning yet), which is also what clears Quarto's fixed navbar and the window's right edge.
- **`applyExampleParams` takes selector strings, waits 100 ms after every field, and must be called from one plain DOM listener.** Direct `viewof` references make the calling cell reactive on views the function itself recreates — an endless loop (observed hitting Chrome's history-API throttling). OJS's reactive cascade settles in ~40 ms (rAF-paced), so a `setTimeout(0)` yield is too short and the next field's value is silently discarded; 100 ms is the margin. A native `<select>` fires `input` *and* `change` per pick, so a cell reactive on its value runs the function twice and the two cascades race — attach one listener to a stable element instead. Order `params` so upstream fields (a "max" that caps a slider) come first.
- **Slider playback's popover/tween coupling goes one way.** `slider-play.js` publishes `VM.ui.playbackTweenMs` (90% of the value gap, capped at 300 ms, `0` when idle); `chart-theme.js`'s `layout()` reads it at call time. `chart-theme.js` must not know playback exists beyond that read, and `slider-play.js` must not touch Plotly.
- **The playback preference (`localStorage["vm-playback"]`) is deliberately not URL-synced**, unlike every page input — it isn't part of the computation a shared link reproduces.
- **Self-installing modules mark what they've enhanced** (`data-vm-play-ready`, `data-vm-draggable`, `Plotly.__vmPatched`) and must stay idempotent, because they run on load, on `DOMContentLoaded`, and on every `MutationObserver` callback.
- **`svg-fullscreen-button.js` measures the *figure*, not the cell.** A fixed-width Plot SVG is narrower than its column; the button pins to the union of the block's figure SVGs (≥ 64 px wide, excluding the controls bar, the legend and button icons — `chart-block.css` has a selector mirroring the same test for centering). The `:fullscreen` wrappers are flex *columns* so a caption above a figure stays above it.
- **`linearRegression`/`l1Regression` return `xlo`/`xhi` as the first and last point's x**, not min/max — for drawing the fitted segment over sorted data. Documented; don't "fix" it without checking the convergence plots that rely on it.
- **`simpsonEstimate` skips non-finite samples rather than propagating `NaN`**, including endpoints, and doesn't validate that `n` is even. Both are documented behaviour for pages where a reader types the integrand.

If any single `VM.<category>` grows past ~15 functions, split its reference page into sub-sections (as `plotting.qmd` and `distributions.qmd` already are) rather than letting one flat list run long.
