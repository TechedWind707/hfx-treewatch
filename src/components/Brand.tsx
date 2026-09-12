/** Tree-ring and location-pin mark. */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
    >
      <circle cx="16" cy="14" r="11.5" strokeWidth="1.6" opacity="0.35" />
      <circle cx="16" cy="14" r="7.5" strokeWidth="1.6" opacity="0.6" />
      <circle cx="16" cy="14" r="3.5" strokeWidth="1.6" />
      <path
        d="M16 30c0 0-5.2-5.6-5.2-9.2a5.2 5.2 0 1 1 10.4 0C21.2 24.4 16 30 16 30Z"
        fill="var(--color-surface)"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="20.6" r="1.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function Wordmark({ subdued = false }: { subdued?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <Mark className="h-7 w-7 text-forest" />
      <span
        className={`text-[17px] font-semibold tracking-tight ${
          subdued ? "text-ink/80" : "text-ink"
        }`}
      >
        HFX TreeWatch
      </span>
    </span>
  );
}
