/**
 * Copyright (c) 2025 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Single source of truth for how a pair of distinct Sperner colors is
  // drawn, shared by triangle fills (VM.discreteMath.triangleFillColor) and edge
  // coloring: red+green -> gold, green+blue -> teal, red+blue -> orchid.
  // Returns null if colorA === colorB (no pair to color).
  const pairColor = (colorA, colorB) => {
    if (colorA === colorB) return null;
    const pair = new Set([colorA, colorB]);
    if (pair.has('red') && pair.has('green')) return 'rgba(255, 215, 0, 0.7)';
    if (pair.has('green') && pair.has('blue')) return 'rgba(0, 150, 136, 0.7)';
    if (pair.has('red') && pair.has('blue')) return 'rgba(186, 85, 211, 0.7)';
    return null;
  };

  globalThis.VM = {...globalThis.VM, discreteMath: {...globalThis.VM?.discreteMath, pairColor}}
})(window)
