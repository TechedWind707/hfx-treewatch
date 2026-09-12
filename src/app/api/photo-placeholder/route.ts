/**
 * Stand-in for object storage.
 *
 * Seeded cases point their photo URLs here so both interfaces render a real
 * image element with real dimensions. When the wrapper's GCS URLs land, the
 * `url` column changes and nothing else does — this route can be deleted.
 */
import { FRAME_LABELS, FrameType } from "@/lib/domain/types";

const TINT: Record<string, string> = {
  full_tree: "#1f6b42",
  base_roots: "#4a5d3a",
  the_problem: "#8a5a22",
  surroundings: "#2b5f7a",
  extra: "#5a5a5a",
};

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!,
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ref = escapeXml(url.searchParams.get("ref") ?? "TW-0000");
  const n = escapeXml(url.searchParams.get("n") ?? "1");
  const frame = (url.searchParams.get("frame") ?? "extra") as FrameType;
  const label = escapeXml(FRAME_LABELS[frame] ?? "Photo");
  const tint = TINT[frame] ?? "#5a5a5a";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" role="img" aria-label="${label}, photo ${n} of ${ref}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${tint}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${tint}" stop-opacity="0.06"/>
    </linearGradient>
  </defs>
  <rect width="800" height="600" fill="#eef2f0"/>
  <rect width="800" height="600" fill="url(#g)"/>
  <g stroke="${tint}" stroke-opacity="0.28" stroke-width="2" fill="none">
    <path d="M400 520 L400 250"/>
    <path d="M400 330 L318 252 M400 300 L478 230 M400 380 L330 330 M400 355 L470 312"/>
    <circle cx="400" cy="215" r="96"/>
    <path d="M330 520 q70 -22 140 0"/>
  </g>
  <text x="40" y="70" font-family="Segoe UI, Helvetica Neue, sans-serif" font-size="30" font-weight="600" fill="${tint}">${label}</text>
  <text x="40" y="106" font-family="Segoe UI, Helvetica Neue, sans-serif" font-size="20" fill="#5f6f68">${ref} · photo ${n}</text>
  <text x="40" y="566" font-family="Segoe UI, Helvetica Neue, sans-serif" font-size="17" fill="#5f6f68">Placeholder — resident photo loads from object storage</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
