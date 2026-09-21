import type { GeoPoint } from "@/lib/geo";

interface MapboxGeocodeResponse {
  features?: Array<{ center: [number, number]; place_name?: string }>;
}

/**
 * Resolves a freeform location string (city, ZIP, street address, "near
 * <landmark>") to coordinates via Mapbox Geocoding. Returns null when no
 * token is configured or nothing matches, so callers fall back to an
 * unfiltered (or city-exact) search rather than erroring the whole request.
 */
export async function geocodeLocation(query: string): Promise<GeoPoint | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token || !query.trim()) return null;

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
    query,
  )}.json?access_token=${token}&limit=1&country=us`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) return null;
    const data = (await res.json()) as MapboxGeocodeResponse;
    const feature = data.features?.[0];
    if (!feature) return null;
    const [lng, lat] = feature.center;
    return { lat, lng };
  } catch (err) {
    console.error("Geocoding failed:", err);
    return null;
  }
}
