<!--
Copyright (c) 2026 Apurva Nakade. All rights reserved.
Released under Apache 2.0 license as described in the file LICENSE.
Authors: Apurva Nakade
-->

# mathviz-local

The functions and CSS this site adds to [mathviz](https://github.com/apurvanakade/mathviz).
They stay here until they move upstream, or for good if only this site needs
them. The layout matches mathviz's own `src/` path for path, so moving
something upstream is a file copy:

```
src/manifest.mjs     load order (entries go into mathviz's src/manifest.mjs)
src/js/<category>/   one VM.<category>.<fn> per file, IIFE extending window.VM, test alongside
src/css/             stylesheets (into mathviz's src/css/ + its css manifest)
scripts/build.mjs    concatenates src/ into ../_extensions/mathviz-local/dist/
scripts/load-vm.mjs  test loader: the installed mathviz bundle, then src/js in manifest order
```

`../_extensions/mathviz-local/` is a small Quarto extension. Its filter adds
the built bundle to every page after mathviz's (`filters: [mathviz,
mathviz-local]` in `_quarto.yml`), so these functions extend the same `VM`.
A file here at the same path as an upstream one, defining the same member,
replaces it. That's how to hot-patch a mathviz bug before the fix is
released.

```sh
cd _mathviz
node --test                # every src/**/*.test.js
node scripts/build.mjs     # rebuild ../_extensions/mathviz-local/dist/ (commit both)
```

Bump `VERSION` in `mathviz-local.lua` and `version` in `_extension.yml`
whenever `dist/` changes. It names the `site_libs/` folder, and that is what
busts a returning reader's cache.

## Adding a function

1. `src/js/<category>/<kebab-name>.js` defines `VM.<category>.<camelName>`.
   It is an IIFE that spreads into the namespace without clobbering it and
   ends in `})(window)` with **no semicolon**. Copy any file from mathviz's
   `src/js/` for the shape. Reuse mathviz's categories where one fits.
2. Write a JSDoc block, and add `<kebab-name>.test.js` next to it, loading
   the real code with `import { loadVM } from '../../../scripts/load-vm.mjs'`.
3. Add it to `src/manifest.mjs`, after anything it reads at load time.
4. `node --test`, `node scripts/build.mjs`, then use it on a page.

## Moving it upstream

From a mathviz checkout: `node scripts/port.mjs /path/to/this/site/_mathviz`.
That script copies the files into mathviz's `src/`, adds their manifest
entries and lists the reference entries to write. Then open a pull request
there. Once a mathviz release carries the files, delete them here.
