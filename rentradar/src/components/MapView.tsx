"use client";

import { useEffect, useRef, useState } from "react";
import type { ScoredListing } from "@/types/listing";

export interface MapViewProps {
  listings: ScoredListing[];
  centerLat?: number;
  centerLng?: number;
  radiusMiles?: number;
  onRadiusChange?: (miles: number) => void;
}

const MILES_TO_METERS = 1609.34;

/**
 * Mapbox GL map with pins for each listing and a draggable radius circle.
 * Renders a lightweight placeholder (no external requests) when
 * NEXT_PUBLIC_MAPBOX_TOKEN isn't configured, so the dashboard still works
 * without a Mapbox account in dev/CI.
 */
export function MapView({ listings, centerLat, centerLng, radiusMiles = 5, onRadiusChange }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const [radius, setRadius] = useState(radiusMiles);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token || !containerRef.current) return;
    let cleanup = () => {};

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      mapboxgl.accessToken = token;

      const lat = centerLat ?? listings.find((l) => l.latitude != null)?.latitude ?? 39.9612;
      const lng = centerLng ?? listings.find((l) => l.longitude != null)?.longitude ?? -82.9988;

      const map = new mapboxgl.Map({
        container: containerRef.current!,
        style: "mapbox://styles/mapbox/light-v11",
        center: [lng, lat],
        zoom: 11,
      });
      mapRef.current = map;

      for (const listing of listings) {
        if (listing.latitude == null || listing.longitude == null) continue;
        new mapboxgl.Marker({ color: "#158049" })
          .setLngLat([listing.longitude, listing.latitude])
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>${listing.title}</strong><br/>$${(listing.monthlyRentCents / 100).toFixed(0)}/mo`))
          .addTo(map);
      }

      map.on("load", () => {
        map.addSource("radius", {
          type: "geojson",
          data: circleGeoJson(lng, lat, radius * MILES_TO_METERS),
        });
        map.addLayer({
          id: "radius-fill",
          type: "fill",
          source: "radius",
          paint: { "fill-color": "#158049", "fill-opacity": 0.08 },
        });
        map.addLayer({
          id: "radius-line",
          type: "line",
          source: "radius",
          paint: { "line-color": "#158049", "line-width": 2 },
        });
      });

      cleanup = () => map.remove();
    })();

    return () => cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, listings, centerLat, centerLng]);

  useEffect(() => {
    const map = mapRef.current;
    const source = map?.getSource("radius");
    if (!map || !source || source.type !== "geojson") return;
    const center = map.getCenter();
    (source as import("mapbox-gl").GeoJSONSource).setData(circleGeoJson(center.lng, center.lat, radius * MILES_TO_METERS));
  }, [radius]);

  if (!token) {
    return (
      <div className="flex h-80 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500">
        <p>Map view requires NEXT_PUBLIC_MAPBOX_TOKEN.</p>
        <p>{listings.filter((l) => l.latitude != null).length} of {listings.length} results have coordinates.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div ref={containerRef} className="h-80 w-full" />
      <div className="flex items-center gap-3 bg-white px-4 py-2 text-sm">
        <label htmlFor="radius-slider">Radius: {radius} mi</label>
        <input
          id="radius-slider"
          type="range"
          min={1}
          max={25}
          value={radius}
          onChange={(e) => {
            const next = Number(e.target.value);
            setRadius(next);
            onRadiusChange?.(next);
          }}
        />
      </div>
    </div>
  );
}

function circleGeoJson(lng: number, lat: number, radiusMeters: number, points = 64): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const distanceX = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusMeters / 110540;

  for (let i = 0; i <= points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    coords.push([lng + distanceX * Math.cos(theta), lat + distanceY * Math.sin(theta)]);
  }

  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}
