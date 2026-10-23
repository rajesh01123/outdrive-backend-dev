// Polygons here are rings of [lat, lng] points (the order Leaflet and the admin panel use).
// They are stored as GeoJSON, which is [lng, lat] and closed (first point repeated last).

export const toGeoJsonPolygon = (ring) => {
  const coordinates = ring.map(([lat, lng]) => [lng, lat]);
  coordinates.push(coordinates[0]);
  return { type: 'Polygon', coordinates: [coordinates] };
};

export const fromGeoJsonPolygon = (geoJson) => {
  const points = (geoJson?.coordinates?.[0] || []).map(([lng, lat]) => [lat, lng]);
  return points.length > 1 ? points.slice(0, -1) : points;
};

export const polygonBounds = (ring) => ({
  minLat: Math.min(...ring.map(([lat]) => lat)),
  maxLat: Math.max(...ring.map(([lat]) => lat)),
  minLng: Math.min(...ring.map(([, lng]) => lng)),
  maxLng: Math.max(...ring.map(([, lng]) => lng))
});

// Ray casting. Points exactly on an edge may fall either side, which is fine at map precision.
export const pointInPolygon = ([lat, lng], ring) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [latI, lngI] = ring[i];
    const [latJ, lngJ] = ring[j];
    if ((latI > lat) !== (latJ > lat) && lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI) inside = !inside;
  }
  return inside;
};

const orientation = (a, b, c) => Math.sign((b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]));

const segmentsCross = (p1, p2, p3, p4) => {
  const o1 = orientation(p1, p2, p3);
  const o2 = orientation(p1, p2, p4);
  const o3 = orientation(p3, p4, p1);
  const o4 = orientation(p3, p4, p2);
  return o1 !== o2 && o3 !== o4 && o1 !== 0 && o2 !== 0 && o3 !== 0 && o4 !== 0;
};

const edges = (ring) => ring.map((point, index) => [point, ring[(index + 1) % ring.length]]);

export const isSelfIntersecting = (ring) => {
  const list = edges(ring);
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      // Neighbouring edges share a point and never count as crossing.
      if (j === i + 1 || (i === 0 && j === list.length - 1)) continue;
      if (segmentsCross(list[i][0], list[i][1], list[j][0], list[j][1])) return true;
    }
  }
  return false;
};

export const polygonArea = (ring) =>
  Math.abs(ring.reduce((sum, [lat, lng], index) => {
    const [nextLat, nextLng] = ring[(index + 1) % ring.length];
    return sum + lng * nextLat - nextLng * lat;
  }, 0)) / 2;

export const polygonsOverlap = (a, b) => {
  const boxA = polygonBounds(a);
  const boxB = polygonBounds(b);
  if (boxA.maxLat < boxB.minLat || boxB.maxLat < boxA.minLat || boxA.maxLng < boxB.minLng || boxB.maxLng < boxA.minLng) return false;
  if (a.some((point) => pointInPolygon(point, b)) || b.some((point) => pointInPolygon(point, a))) return true;
  return edges(a).some(([p1, p2]) => edges(b).some(([p3, p4]) => segmentsCross(p1, p2, p3, p4)));
};

export const haversineKm = ([lat1, lng1], [lat2, lng2]) => {
  const toRad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};
