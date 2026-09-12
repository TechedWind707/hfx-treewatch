"use client";

import { useEffect, useState } from "react";

const STEPS = [
  {
    key: "evidence",
    tab: "Evidence",
    caption: "The resident lines the tree up in a guide and takes three photos.",
  },
  {
    key: "confidence",
    tab: "Confidence",
    caption: "The report lands on a Halifax map pin with what was observed, and how sure.",
  },
  {
    key: "review",
    tab: "Human review",
    caption: "It takes its place in the forestry queue, reasons attached, for a person to decide.",
  },
] as const;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/* --- the three illustrations ------------------------------------- */

function CameraGuide() {
  return (
    <svg viewBox="0 0 320 220" className="h-full w-full" aria-hidden="true">
      <rect width="320" height="220" rx="8" fill="#eef2f0" />
      <g stroke="#176b3a" strokeWidth="2" fill="none" opacity="0.75">
        <path d="M96 40h-14v-14M224 40h14v-14M96 180h-14v14M224 180h14v14" />
      </g>
      <g stroke="#0b3d2e" strokeWidth="2" fill="none" opacity="0.55">
        <path d="M160 178V96" />
        <path d="M160 126l-26-24M160 112l28-22M160 148l-22-16" />
        <circle cx="160" cy="80" r="30" />
        <path d="M138 178q22-8 44 0" />
      </g>
      <rect x="82" y="26" width="156" height="168" rx="6" fill="none" stroke="#176b3a" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.5" />
      <text x="160" y="210" textAnchor="middle" fontSize="11" fill="#5f6f68">
        Whole tree, ground to top
      </text>
    </svg>
  );
}

function MapPin() {
  return (
    <svg viewBox="0 0 320 220" className="h-full w-full" aria-hidden="true">
      <rect width="320" height="220" rx="8" fill="#eef2f0" />
      <g stroke="#c3d3cb" strokeWidth="1.5" fill="none">
        <path d="M0 60h320M0 112h320M0 164h320M74 0v220M170 0v220M246 0v220" />
      </g>
      <path d="M0 130 Q90 118 170 140 T320 132 L320 220 L0 220Z" fill="#056cb6" opacity="0.1" />
      <g>
        <ellipse cx="170" cy="118" rx="26" ry="7" fill="#056cb6" opacity="0.16" />
        <path
          d="M170 116c0 0-15-16.5-15-26.5a15 15 0 1 1 30 0C185 99.5 170 116 170 116Z"
          fill="#056cb6"
        />
        <circle cx="170" cy="89" r="5.6" fill="#fff" />
      </g>
      <g fontSize="11" fill="#5f6f68">
        <text x="16" y="30">Quinpool Rd</text>
        <text x="196" y="196">Confirmed by the resident</text>
      </g>
    </svg>
  );
}

function QueueCard() {
  const rows = [
    { ref: "TW-1019", band: "Unscored", w: 100, fill: "#0b3d2e", text: "#fff" },
    { ref: "TW-1037", band: "Critical", w: 84, fill: "#fdecec", text: "#c62828" },
    { ref: "TW-1042", band: "High", w: 58, fill: "#fdf3e4", text: "#d97706", rising: true },
    { ref: "TW-1028", band: "Low", w: 22, fill: "#f2f5f4", text: "#6f807a" },
  ];
  return (
    <svg viewBox="0 0 320 220" className="h-full w-full" aria-hidden="true">
      <rect width="320" height="220" rx="8" fill="#f8faf9" />
      {rows.map((r, i) => (
        <g key={r.ref} transform={`translate(18 ${20 + i * 48})`}>
          <rect
            width="284"
            height="38"
            rx="6"
            fill="#fff"
            stroke={r.rising ? "#176b3a" : "#dce6e0"}
            strokeWidth={r.rising ? 2 : 1}
          />
          <text x="12" y="23" fontSize="12" fontWeight="600" fill="#0b3d2e">
            {r.ref}
          </text>
          <rect x="70" y="11" width="66" height="17" rx="8.5" fill={r.fill} />
          <text x="103" y="23" fontSize="10" fontWeight="700" textAnchor="middle" fill={r.text}>
            {r.band.toUpperCase()}
          </text>
          <rect x="150" y="17" width="120" height="5" rx="2.5" fill="#eef2f0" />
          <rect x="150" y="17" width={(r.w / 100) * 120} height="5" rx="2.5" fill="#176b3a" opacity="0.65" />
        </g>
      ))}
    </svg>
  );
}

const PANELS = [CameraGuide, MapPin, QueueCard];

export function HeroVisual() {
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduced || paused) return;
    const t = setInterval(() => setActive((i) => (i + 1) % STEPS.length), 3200);
    return () => clearInterval(t);
  }, [reduced, paused]);

  /* Reduced motion: the same three states, side by side, no movement. */
  if (reduced) {
    return (
      <div className="grid gap-3">
        {STEPS.map((s, i) => {
          const Panel = PANELS[i];
          return (
            <figure
              key={s.key}
              className="flex items-center gap-4 rounded-card border border-line bg-surface p-3"
            >
              <div className="h-20 w-28 shrink-0 overflow-hidden rounded">
                <Panel />
              </div>
              <figcaption className="text-sm">
                <span className="font-semibold text-ink">{s.tab}</span>
                <span className="mt-0.5 block leading-snug text-muted">{s.caption}</span>
              </figcaption>
            </figure>
          );
        })}
      </div>
    );
  }

  const Panel = PANELS[active];

  return (
    <div
      className="rounded-card border border-line bg-surface p-3 shadow-[0_1px_2px_rgba(11,61,46,0.05)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="aspect-[320/220] w-full overflow-hidden rounded">
        <Panel />
      </div>

      <div className="mt-3 flex gap-1.5" role="tablist" aria-label="How TreeWatch works">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            role="tab"
            type="button"
            aria-selected={i === active}
            onClick={() => {
              setActive(i);
              setPaused(true);
            }}
            className={`flex-1 rounded-md px-2 py-2 text-xs font-semibold transition ${
              i === active
                ? "bg-mist text-forest"
                : "text-muted hover:bg-canvas hover:text-ink"
            }`}
          >
            {s.tab}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="mt-2 min-h-[2.5rem] px-1 text-sm leading-snug text-muted">
        {STEPS[active].caption}
      </p>
    </div>
  );
}
