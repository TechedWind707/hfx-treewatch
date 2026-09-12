import { Priority, PRIORITY_LABELS } from "@/lib/domain/types";

const STYLES: Record<Priority, { bg: string; fg: string; ring: string }> = {
  critical: { bg: "bg-critical-bg", fg: "text-critical", ring: "ring-critical/30" },
  high: { bg: "bg-high-bg", fg: "text-high", ring: "ring-high/30" },
  moderate: { bg: "bg-moderate-bg", fg: "text-moderate", ring: "ring-moderate/25" },
  low: { bg: "bg-low-bg", fg: "text-low", ring: "ring-low/25" },
  more_evidence_needed: { bg: "bg-mist", fg: "text-forest", ring: "ring-forest/25" },
  unscored: { bg: "bg-deep", fg: "text-white", ring: "ring-deep/40" },
};

/** Colour is never the only signal — each band carries its own glyph. */
function Glyph({ priority }: { priority: Priority }) {
  const common = { width: 13, height: 13, "aria-hidden": true as const, fill: "currentColor" };
  switch (priority) {
    case "critical":
      return (
        <svg {...common} viewBox="0 0 16 16">
          <path d="M8 1 15 14H1L8 1Zm0 4.6a.8.8 0 0 0-.8.86l.25 3.1a.55.55 0 0 0 1.1 0l.25-3.1A.8.8 0 0 0 8 5.6Zm0 5.3a.85.85 0 1 0 0 1.7.85.85 0 0 0 0-1.7Z" />
        </svg>
      );
    case "high":
      return (
        <svg {...common} viewBox="0 0 16 16">
          <path d="M8 1.5 14.5 8 8 14.5 1.5 8 8 1.5Zm0 3.4a.75.75 0 0 0-.75.82l.23 2.7a.52.52 0 0 0 1.04 0l.23-2.7A.75.75 0 0 0 8 4.9Zm0 5a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Z" />
        </svg>
      );
    case "moderate":
      return (
        <svg {...common} viewBox="0 0 16 16">
          <rect x="2" y="6.6" width="12" height="2.8" rx="1.4" />
        </svg>
      );
    case "low":
      return (
        <svg {...common} viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="3.4" />
        </svg>
      );
    case "more_evidence_needed":
      return (
        <svg {...common} viewBox="0 0 16 16">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm.05 10.3a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Zm.2-7.1c1.5 0 2.6.9 2.6 2.2 0 1-.5 1.5-1.3 2.1-.6.4-.8.7-.8 1.2v.2H7.3v-.4c0-.9.3-1.4 1.1-2 .6-.4.9-.7.9-1.2 0-.6-.5-1-1.1-1-.7 0-1.2.4-1.2 1.1H5.5c0-1.3 1.1-2.2 2.75-2.2Z" />
        </svg>
      );
    case "unscored":
      return (
        <svg {...common} viewBox="0 0 16 16">
          <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm0 1.6a5.4 5.4 0 0 1 3.3 9.68L4.72 4.3A5.36 5.36 0 0 1 8 2.6Zm0 10.8a5.4 5.4 0 0 1-3.3-9.68l6.58 7.98A5.36 5.36 0 0 1 8 13.4Z" />
        </svg>
      );
  }
}

export function PriorityChip({
  priority,
  size = "md",
  overridden = false,
}: {
  priority: Priority;
  size?: "sm" | "md";
  overridden?: boolean;
}) {
  const s = STYLES[priority];
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold uppercase tracking-wide ring-1 ${s.bg} ${s.fg} ${s.ring} ${pad}`}
    >
      <Glyph priority={priority} />
      {PRIORITY_LABELS[priority]}
      {overridden && <span className="font-normal normal-case opacity-80">· staff set</span>}
    </span>
  );
}

/** Confidence is shown separately from priority, always. */
export function ConfidenceMeter({
  confidence,
  low,
}: {
  confidence: number | null;
  low: boolean;
}) {
  if (confidence == null) {
    return <span className="text-xs text-muted">Confidence not available</span>;
  }
  const pct = Math.round(confidence * 100);

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="h-1.5 w-24 overflow-hidden rounded-full bg-line"
        role="img"
        aria-label={`Model confidence ${pct} percent${low ? ", flagged low" : ""}`}
      >
        <div
          className={`h-full rounded-full ${low ? "bg-high" : "bg-forest"}`}
          style={{ width: `${Math.max(3, pct)}%` }}
        />
      </div>
      <span className={`text-xs font-medium ${low ? "text-high" : "text-muted"}`}>
        {pct}% confidence{low && " · low"}
      </span>
    </div>
  );
}
