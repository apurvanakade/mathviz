/**
 * Copyright (c) 2025 Apurva Nakade. All rights reserved.
 * Released under Apache 2.0 license as described in the file LICENSE.
 * Authors: Apurva Nakade
 */

(function attachVM(globalThis) {
  // Returns every edge of a uniform order-N triangulation exactly once, as
  // {a, b} pairs of barycentric triples. Derived from VM.discreteMath.subTriangleTriples,
  // deduping each interior edge (shared by two adjacent triangles).
  const triangulationEdges = (N) => {
    const seen = new Set();
    const edges = [];

    for (const triangle of VM.discreteMath.subTriangleTriples(N)) {
      for (let i = 0; i < 3; i++) {
        const a = triangle[i];
        const b = triangle[(i + 1) % 3];
        const aKey = a.join(',');
        const bKey = b.join(',');
        const key = aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ a, b });
      }
    }

    return edges;
  };

  globalThis.VM = {...globalThis.VM, discreteMath: {...globalThis.VM?.discreteMath, triangulationEdges}}
})(window)
