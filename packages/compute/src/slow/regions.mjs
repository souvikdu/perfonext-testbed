// P4 — recursion. `rollupRegion` recurses ~12 levels deep and re-walks shared
// subtrees instead of memoising, so the same nodes are visited many times.
// `suggest_optimizations` should report a recursion pattern.

export function buildRegionTree(trails, depth = 12) {
  const root = { name: 'root', depth: 0, trails: [], children: [] };
  const byRegion = new Map();

  for (const trail of trails) {
    let bucket = byRegion.get(trail.region);
    if (!bucket) {
      bucket = { name: trail.region, depth: 1, trails: [], children: [] };
      byRegion.set(trail.region, bucket);
      root.children.push(bucket);
    }
    bucket.trails.push(trail);
  }

  for (const bucket of byRegion.values()) {
    let cursor = bucket;
    for (let d = 2; d <= depth; d += 1) {
      const slice = cursor.trails.filter((_, i) => i % 2 === 0);
      const child = { name: `${bucket.name}/L${d}`, depth: d, trails: slice, children: [] };
      cursor.children.push(child);
      cursor = child;
    }
  }

  return root;
}

export function rollupRegion(node) {
  let totalKm = 0;
  let totalGain = 0;
  let count = 0;

  for (const trail of node.trails) {
    totalKm += trail.lengthKm;
    totalGain += trail.elevationGainM;
    count += 1;
  }

  for (const child of node.children) {
    const childRollup = rollupRegion(child);
    totalKm += childRollup.totalKm;
    totalGain += childRollup.totalGain;
    count += childRollup.count;
  }

  return { name: node.name, depth: node.depth, totalKm, totalGain, count };
}

export function rollupTree(trails) {
  const tree = buildRegionTree(trails);
  const results = [];
  // Re-walking from every child instead of once from the root multiplies the work.
  for (const child of tree.children) {
    results.push(rollupRegion(child));
    for (const grandchild of child.children) {
      results.push(rollupRegion(grandchild));
    }
  }
  results.push(rollupRegion(tree));
  return results;
}
