"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CircleMarker, Map as LeafletMap } from "leaflet";

import "leaflet/dist/leaflet.css";

import { cn } from "@/lib/utils";
import { formatClock } from "@/lib/duration";
import {
  missingLeadingFixSeconds,
  positionAtTime,
  routeLatLngs,
} from "@/lib/track-analysis";
import type { TrackPoint } from "@/lib/track";

interface RouteMapProps {
  points: TrackPoint[];
  className?: string;
  height?: number;
  // Instant currently hovered on any chart, in seconds from the start. The map
  // drops a marker there so the reader sees where on the route a spike in pace
  // or heart rate happened.
  hoverT?: number | null;
}

const ROUTE_COLOR = "#2a78d6";
const START_COLOR = "#1baf7a";
const END_COLOR = "#eb6834";
const HOVER_COLOR = "#4a3aa7";

export function RouteMap({
  points,
  className,
  height = 320,
  hoverT = null,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  // Leaflet is imported lazily inside the effect; the hover effect needs the
  // same module handle to build its marker.
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const hoverMarkerRef = useRef<CircleMarker | null>(null);

  // Memoized so the effects below key off the track, not off every render.
  const route = useMemo(() => routeLatLngs(points), [points]);
  const missingFixS = useMemo(
    () => missingLeadingFixSeconds(points),
    [points],
  );

  useEffect(() => {
    if (!containerRef.current || route.length < 2) return;

    let cancelled = false;
    let frame = 0;

    // Leaflet touches `window` at import time, so it is pulled in on mount
    // rather than at module scope — this component only ever runs in the
    // browser, but its module graph is still evaluated during the SSR pass.
    void (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        // Wheel zoom inside a scrolling modal hijacks the scroll; the zoom
        // buttons and dragging still work.
        scrollWheelZoom: false,
      });
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const latLngs = route.map((p) => [p.lat, p.lng] as [number, number]);
      const line = L.polyline(latLngs, {
        color: ROUTE_COLOR,
        weight: 4,
        opacity: 0.9,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(map);

      // Circle markers rather than pins: Leaflet's default icons are image
      // assets whose URLs break under a bundler, and these need no assets.
      const endpoint = (
        at: [number, number],
        fillColor: string,
        label: string,
      ) =>
        L.circleMarker(at, {
          radius: 6,
          color: "#ffffff",
          weight: 2,
          fillColor,
          fillOpacity: 1,
        })
          .addTo(map)
          .bindTooltip(label);

      endpoint(latLngs[0], START_COLOR, "Départ");
      endpoint(latLngs[latLngs.length - 1], END_COLOR, "Arrivée");

      map.fitBounds(line.getBounds(), { padding: [20, 20] });
      // The map mounts inside a tab that may have been hidden until now, so
      // its container size can still be stale on the first paint. The frame is
      // cancellable: leaving the tab tears the map down, and invalidateSize on
      // a removed map throws.
      frame = requestAnimationFrame(() => {
        if (!cancelled) map.invalidateSize();
      });
    })();

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      hoverMarkerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, [route]);

  // Follows the charts' crosshair. Separate from the setup effect so moving
  // the cursor never rebuilds the map.
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    // The map builds asynchronously; an early hover simply does nothing and
    // the next pointer move lands normally.
    if (!map || !L) return;

    if (hoverT === null) {
      hoverMarkerRef.current?.remove();
      hoverMarkerRef.current = null;
      return;
    }

    const at = positionAtTime(points, hoverT);
    if (!at) return;

    if (hoverMarkerRef.current) {
      hoverMarkerRef.current.setLatLng([at.lat, at.lng]);
    } else {
      hoverMarkerRef.current = L.circleMarker([at.lat, at.lng], {
        radius: 7,
        color: "#ffffff",
        weight: 3,
        fillColor: HOVER_COLOR,
        fillOpacity: 1,
        // Above the route line, and never stealing the pointer from the map.
        interactive: false,
      }).addTo(map);
    }
  }, [hoverT, points]);

  if (route.length < 2) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md border bg-muted/40 text-sm text-muted-foreground",
          className,
        )}
        style={{ height }}
      >
        Pas de position GPS enregistrée sur cette séance.
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="w-full overflow-hidden rounded-md border"
        style={{ height }}
      />
      {missingFixS > 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          La montre a mis {formatClock(missingFixS)} à accrocher le GPS : le
          tracé démarre après le début réel de la séance.
        </p>
      )}
    </div>
  );
}
