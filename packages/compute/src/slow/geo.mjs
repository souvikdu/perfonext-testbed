// P2 — O(n^2) proximity search. No spatial index; every trail is compared to every
// other trail. `get_hotspots` should rank `findNearbyTrails` at or near the top and
// `suggest_optimizations` should flag it as CPU-bound.

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversine(aLat, aLon, bLat, bLon) {
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function findNearbyTrails(trails, radiusKm = 120) {
  const result = [];
  for (let i = 0; i < trails.length; i += 1) {
    const a = trails[i];
    const neighbours = [];
    for (let j = 0; j < trails.length; j += 1) {
      if (i === j) continue;
      const b = trails[j];
      const distance = haversine(a.lat, a.lon, b.lat, b.lon);
      if (distance <= radiusKm) {
        neighbours.push({ slug: b.slug, distance });
      }
    }
    neighbours.sort((x, y) => x.distance - y.distance);
    result.push({ slug: a.slug, neighbours: neighbours.slice(0, 5) });
  }
  return result;
}
