/**
 * Copyright (c) 2025 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Shared fill color for a triangle given its (up to 3) vertex colors: a
  // vivid indigo for a rainbow (RGB) triangle -- chosen to contrast
  // clearly with the gold used elsewhere (e.g. combinatorial-proof's RG
  // triangles) -- the one thing every Sperner's lemma page cares about --
  // and no fill at all otherwise, so
  // the rainbow triangles stay the visual focus. Pages that care about RGB
  // orientation (e.g. the geometric proof) or give some other triangle
  // class its own meaning (e.g. combinatorial-proof's RG "hallway"
  // triangles) should handle those cases themselves and only fall back to
  // this for the rest.
  const triangleFillColor = (colors) => {
    const distinct = new Set(colors);
    if (distinct.size === 3) return 'rgba(75, 0, 130, 0.55)';
    return 'none';
  };

  globalThis.VM = {...globalThis.VM, discreteMath: {...globalThis.VM?.discreteMath, triangleFillColor}}
})(window)
