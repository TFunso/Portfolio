import { describe, expect, it } from "vitest";
import { boundingBox, haversineMiles } from "@/lib/geo";

describe("haversineMiles", () => {
  it("returns ~0 for the same point", () => {
    expect(haversineMiles(34.0522, -118.2437, 34.0522, -118.2437)).toBeCloseTo(0, 3);
  });

  it("matches the known LA-to-SF distance within a few miles", () => {
    // Los Angeles -> San Francisco is ~347 miles great-circle.
    const distance = haversineMiles(34.0522, -118.2437, 37.7749, -122.4194);
    expect(distance).toBeGreaterThan(330);
    expect(distance).toBeLessThan(360);
  });
});

describe("boundingBox", () => {
  it("produces a box that contains the center point", () => {
    const center = { lat: 39.9612, lng: -82.9988 };
    const box = boundingBox(center, 10);
    expect(center.lat).toBeGreaterThanOrEqual(box.minLat);
    expect(center.lat).toBeLessThanOrEqual(box.maxLat);
    expect(center.lng).toBeGreaterThanOrEqual(box.minLng);
    expect(center.lng).toBeLessThanOrEqual(box.maxLng);
  });

  it("grows with radius", () => {
    const center = { lat: 39.9612, lng: -82.9988 };
    const small = boundingBox(center, 5);
    const large = boundingBox(center, 50);
    expect(large.maxLat - large.minLat).toBeGreaterThan(small.maxLat - small.minLat);
  });
});
