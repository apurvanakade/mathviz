<!--
Copyright (c) 2026 Apurva Nakade. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Apurva Nakade
-->

# Contributing to mathviz

Thank you for your interest in contributing! mathviz is the chart theming,
control-panel styling and numerical helper library behind
[Visual Math Lab](https://github.com/apurvanakade/VisualMathLab), packaged
so that any Quarto site (or any web page) can use it.

## Working on the library

```sh
git clone https://github.com/apurvanakade/mathviz && cd mathviz
npm install            # math.js, for the expression tests
npm test               # node --test over src/**/*.test.js
npm run build          # src/ -> dist/mathviz.{js,css} and _extensions/mathviz/dist/
quarto render example.qmd && open example.html   # see it in a real page
```

- **Source lives in `src/`.** `src/js/<category>/<name>.js` is one `VM.<category>.<name>` function per file, wrapped in an IIFE that extends `window.VM`; `src/css/*.css` is the design system, split by concern. Colocate a `<name>.test.js` next to every function that has logic worth testing -- the tests load the real files through `scripts/load-vm.mjs`.
- **Adding a file means adding it to `src/manifest.mjs`** -- that list is the load order the build and the tests both use, and `src/manifest.test.js` fails if a file on disk is missing from it. Put a file after anything it reads at load time (`mustPrecede` in the manifest records the known constraints).
- **`dist/` is generated and committed.** Run `npm run build` before committing a change under `src/`; CI runs the build and fails if the committed `dist/` differs from what it produced. Never edit `dist/` by hand.
- **Colors and fonts are CSS tokens** (`src/css/tokens.css`). JS reads them at call time through `getComputedStyle`; nothing in `src/js` hardcodes a hex except the light-mode fallbacks in `chart-theme.js`. If you add a token, add it to both the light and dark blocks, and update the README's token table.
- **Keep the dark selector in sync in two places**: the `:where(...)` list in `src/css/tokens.css` and `settings.darkSelector` in `src/js/plotting/chart-theme.js`.
- Prefer explicit `for`/`while` loops and `if`/`else` over `.map()/.filter()/.reduce()` chains and ternaries -- the code is read by a mathematics audience more at home in Python than in functional JavaScript. Callbacks an API requires are fine.

## Releasing

1. Bump the version in **three** places -- `package.json`, `_extensions/mathviz/_extension.yml`, and `VERSION` in `_extensions/mathviz/mathviz.lua` (the build refuses to run if they disagree).
2. `npm run build`, commit, `git tag vX.Y.Z`, `git push --tags`.
3. Consumers update with `quarto update apurvanakade/mathviz@vX.Y.Z` (Quarto) or by changing the tag in their jsDelivr URL.

## Licensing Policy

By contributing to this repository, you agree that your contributions will be licensed under the project's [Apache License 2.0](LICENSE).

Because copyright in this project is distributed, you retain ownership of your code, but you grant the community a perpetual, royalty-free license to use, modify, and distribute it under the Apache 2.0 terms.

---

## File Header Templates

To maintain consistency and ensure everyone receives proper academic and legal credit, **every new code or content file added to this repository must include a copyright header at the very top.**

Please copy, paste, and update the template matching your file's language:

### 1. Quarto Documents (`.qmd`) and Markdown Files (`.md`)

```markdown
<!--
Copyright (c) [Year] [Your Name]. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: [Your Name]
-->

```

### 2. JavaScript / CSS Files (`.js`, `.mjs`, `.css`)

```javascript
/**
 * Copyright (c) [Year] [Your Name]. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: [Your Name]
 */

```

### 3. Lua Filters (`.lua`)

```lua
-- Copyright (c) [Year] [Your Name]. All rights reserved.
-- Released under Apache 2.0 license as described in the file LICENSE.
-- Authors: [Your Name]

```

### 4. Configuration Files (`.yml`)

```yaml
# Copyright (c) [Year] [Your Name]. All rights reserved.
# Released under Apache 2.0 license as described in the file LICENSE.
# Authors: [Your Name]

```

---

## Managing Headers on Existing Files

* **Minor edits:** If you are fixing a bug, adjusting layout spacing, or correcting a typo in an existing file, you do not need to alter the header.
* **Significant additions:** If you contribute a substantial new feature, script, or section to an existing file, please add your name to the `Authors` line of that file:

```text
Authors: Apurva Nakade, [Your Name]
```
