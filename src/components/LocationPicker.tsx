"use client";

import { useRef, useState } from "react";

/**
 * Coordinate picker over a static Halifax basemap.
 *
 * Deliberately dependency-free so the judge flow never waits on a tile server.
 * Swapping in Leaflet + OSM tiles later is a change to this component only —
 * everything downstream takes lat/lng.
 */

const BBOX = { north: 44.72, south: 44.6, west: -63.72, east: -63.5 };

function toPercent(lat: number, lng: number) {
  return {
    x: ((lng - BBOX.west) / (BBOX.east - BBOX.west)) * 100,
    y: ((BBOX.north - lat) / (BBOX.north - BBOX.south)) * 100,
  };
}

function fromPercent(x: number, y: number) {
  return {
    lng: BBOX.west + (x / 100) * (BBOX.east - BBOX.west),
    lat: BBOX.north - (y / 100) * (BBOX.north - BBOX.south),
  };
}

export function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number, accuracyM: number | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const placed = lat != null && lng != null;
  const pos = placed ? toPercent(lat, lng) : null;

  function setFromEvent(clientX: number, clientY: number) {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const x = Math.min(100, Math.max(0, ((clientX - box.left) / box.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - box.top) / box.height) * 100));
    const c = fromPercent(x, y);
    onChange(c.lat, c.lng, null);
  }

  function nudge(dLat: number, dLng: number) {
    if (!placed) return;
    onChange(
      Math.min(BBOX.north, Math.max(BBOX.south, lat + dLat)),
      Math.min(BBOX.east, Math.max(BBOX.west, lng + dLng)),
      null,
    );
  }

  function useMyLocation() {
    if (!("geolocation" in navigator)) {
      setNotice("This browser can't share a location. Place the pin by hand instead.");
      return;
    }
    setLocating(true);
    setNotice(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        onChange(p.coords.latitude, p.coords.longitude, p.coords.accuracy ?? null);
      },
      () => {
        setLocating(false);
        setNotice(
          "Location wasn't shared. Place the pin by hand — the report works exactly the same.",
        );
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="rounded-md border border-line-strong px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-canvas disabled:opacity-50"
        >
          {locating ? "Finding you…" : "Use my location"}
        </button>
        <p className="text-sm text-muted">or click the map to place the pin</p>
      </div>

      {notice && (
        <p className="mt-2 rounded border border-line bg-canvas px-3 py-2 text-sm text-body">
          {notice}
        </p>
      )}

      <div
        ref={ref}
        onClick={(e) => setFromEvent(e.clientX, e.clientY)}
        className="relative mt-3 aspect-[16/10] w-full cursor-crosshair overflow-hidden rounded-card border border-line bg-[#eef2f0]"
      >
        {/* Static basemap */}
        <svg viewBox="0 0 640 400" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <rect width="640" height="400" fill="#eef2f0" />
          <path d="M0 250 Q140 232 250 258 T430 250 T640 268 L640 400 L0 400Z" fill="#056cb6" opacity="0.1" />
          <g stroke="#c3d3cb" strokeWidth="1.5" fill="none">
            <path d="M0 92h640M0 168h640M0 250h640M0 322h640" />
            <path d="M112 0v400M228 0v400M340 0v400M452 0v400M556 0v400" />
          </g>
          <g stroke="#b6c8bf" strokeWidth="4" fill="none" opacity="0.85">
            <path d="M0 168h640" />
            <path d="M340 0v400" />
          </g>
          <g fontSize="11" fill="#7a8a83" fontFamily="inherit">
            <text x="12" y="86">Bedford Basin</text>
            <text x="360" y="162">Quinpool Rd</text>
            <text x="348" y="316">Halifax Harbour</text>
            <text x="470" y="240">Dartmouth</text>
          </g>
        </svg>

        {pos && (
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            <svg width="30" height="38" viewBox="0 0 30 38" aria-hidden="true">
              <path
                d="M15 37s-12-13.6-12-22a12 12 0 1 1 24 0c0 8.4-12 22-12 22Z"
                fill="#056cb6"
                stroke="#fff"
                strokeWidth="2"
              />
              <circle cx="15" cy="14" r="4.6" fill="#fff" />
            </svg>
          </span>
        )}

        {!placed && (
          <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm font-medium text-muted">
            Tap where the tree is
          </p>
        )}
      </div>

      {/* Keyboard route to the same result */}
      {placed && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            Nudge
          </span>
          {[
            { label: "North", d: [0.0008, 0] },
            { label: "South", d: [-0.0008, 0] },
            { label: "West", d: [0, -0.001] },
            { label: "East", d: [0, 0.001] },
          ].map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={() => nudge(b.d[0], b.d[1])}
              className="rounded border border-line-strong px-2.5 py-1 text-xs font-medium text-ink hover:bg-canvas"
            >
              {b.label}
            </button>
          ))}
          <span className="ml-auto font-mono text-xs tabular-nums text-muted">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        </div>
      )}
    </div>
  );
}
