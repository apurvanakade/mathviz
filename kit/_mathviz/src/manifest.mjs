/**
 * Copyright (c) 2026 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

// Load order for the functions this site adds to mathviz, for both
// scripts/build.mjs and scripts/load-vm.mjs. Same shape as mathviz's own
// src/manifest.mjs: when a file moves upstream, its entry goes into that
// file's `js`/`css` list, after anything it reads at load time.
//
// Everything here runs after mathviz's own bundle, so any VM.* function
// mathviz ships (VM.sampling.seededRandom, VM.plotting.config, ...) is
// already defined.

export const js = [
]

export const css = [
]
