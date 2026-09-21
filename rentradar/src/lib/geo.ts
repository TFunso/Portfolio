const EARTH_RADIUS_MILES = 3958.8;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two lat/lng points, in miles. */
export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** A bounding box approximation, used to prefilter rows in SQL before the
 *  exact (and more expensive) haversine check. 1 degree latitude is a
 *  constant ~69 miles; longitude shrinks with cos(latitude). */
export function boundingBox(center: GeoPoint, radiusMiles: number) {
  const latDelta = radiusMiles / 69;
  const lngDelta = radiusMiles / (69 * Math.max(0.1, Math.cos(toRadians(center.lat))));
  return {
    minLat: center.lat - latDelta,
    maxLat: center.lat + latDelta,
    minLng: center.lng - lngDelta,
    maxLng: center.lng + lngDelta,
  };
}
