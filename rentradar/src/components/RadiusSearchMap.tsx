"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MapView, type MapViewProps } from "@/components/MapView";

/** Wraps MapView so its radius slider writes back to the URL (?radiusMiles=)
 *  and re-triggers the server-rendered search, instead of being purely
 *  cosmetic. A thin client wrapper because a server component can't pass a
 *  function prop down to MapView directly. */
export function RadiusSearchMap(props: Omit<MapViewProps, "onRadiusChange">) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleRadiusChange(miles: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("radiusMiles", String(miles));
    router.push(`${pathname}?${params.toString()}`);
  }

  return <MapView {...props} onRadiusChange={handleRadiusChange} />;
}
