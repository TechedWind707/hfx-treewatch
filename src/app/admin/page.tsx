import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { PriorityChip, ConfidenceMeter } from "@/components/PriorityChip";
import { getQueue, summarise } from "@/lib/data";
import { queueMetrics } from "@/lib/domain/queue";
import { STATUS_STAFF_LABELS } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  tone = "plain",
}: {
  label: string;
  value: number;
  tone?: "plain" | "alert" | "warn";
}) {
  const tones = {
    plain: "text-ink",
    alert: "text-critical",
    warn: "text-high",
  } as const;
  return (
    <div className="rounded-card border border-line bg-surface px-4 py-3">
      <div className={`text-2xl font-semibold tabular-nums ${tones[tone]}`}>{value}</div>
      <div className="mt-0.5 text-xs leading-tight text-muted">{label}</div>
    </div>
  );
}

function age(days: number) {
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export default async function QueuePage() {
  const cases = await getQueue();
  const open = cases.filter((c) => c.status !== "closed");
  const closed = cases.filter((c) => c.status === "closed");
  const stats = summarise(cases);

  return (
    <>
      <SiteHeader
        workspace={{
          label: "Forestry workspace",
          href: "/admin",
          actor: "K. Pictou",
        }}
      />

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl">Triage queue</h1>
            <p className="mt-1 text-sm text-muted">
              Unscored first, then by priority band, then by age-adjusted score.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Open cases" value={stats.open} />
          <Stat label="Unscored — review first" value={stats.unscored} tone="alert" />
          <Stat label="Critical" value={stats.critical} tone="alert" />
          <Stat label="High" value={stats.high} tone="warn" />
          <Stat label="Flagged low confidence" value={stats.lowConfidence} tone="warn" />
        </div>

        {/* Queue */}
        <ol className="mt-7 space-y-2.5">
          {open.map((c, i) => {
            const m = queueMetrics(c);
            const unscored = m.effectivePriority === "unscored";

            return (
              <li key={c.id}>
                <Link
                  href={`/admin/${c.reference}`}
                  className={`block rounded-card border bg-surface p-4 transition hover:border-forest ${
                    unscored ? "border-deep border-l-4" : "border-line"
                  }`}
                >
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                    <span className="mt-0.5 w-6 shrink-0 text-sm font-semibold tabular-nums text-muted">
                      {i + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">{c.reference}</span>
                        <PriorityChip
                          priority={m.effectivePriority}
                          size="sm"
                          overridden={m.isOverridden}
                        />
                        {c.lowConfidence && (
                          <span className="rounded-full bg-high-bg px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-high ring-1 ring-high/30">
                            Low confidence
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 truncate text-sm text-body">
                        {c.addressText ?? `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`}
                      </p>
                      <p className="mt-1 line-clamp-1 text-sm text-muted">
                        {c.description}
                      </p>

                      {unscored && (
                        <p className="mt-2 rounded bg-canvas px-2.5 py-1.5 text-xs text-deep">
                          Scoring did not complete
                          {c.scoringError ? ` — ${c.scoringError}` : ""}. Raised for manual
                          review.
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1.5 text-right">
                      {c.priorityScoreModel != null ? (
                        <>
                          <div className="text-sm font-semibold tabular-nums text-ink">
                            {m.effectiveScore}
                            <span className="ml-1 text-xs font-normal text-muted">
                              queue score
                            </span>
                          </div>
                          <div className="text-xs tabular-nums text-muted">
                            model {c.priorityScoreModel}
                            {m.agePoints > 0 && ` + ${m.agePoints} age`}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-muted">no model score</div>
                      )}
                      <ConfidenceMeter confidence={c.confidence} low={c.lowConfidence} />
                      <div className="text-xs text-muted">
                        {age(m.daysOpen)} · {STATUS_STAFF_LABELS[c.status]}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>

        {closed.length > 0 && (
          <>
            <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-muted">
              Recently closed
            </h2>
            <ul className="mt-3 space-y-2">
              {closed.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/${c.reference}`}
                    className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface/60 px-4 py-3 text-sm transition hover:border-forest"
                  >
                    <span className="font-semibold text-ink">{c.reference}</span>
                    <span className="min-w-0 flex-1 truncate text-muted">
                      {c.addressText}
                    </span>
                    <span className="text-xs text-muted">
                      closed by {c.closedBy ?? "forestry"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="mt-10 max-w-3xl border-l-2 border-line-strong pl-4 text-xs leading-relaxed text-muted">
          Priority and score are produced by the scoring service from the resident&rsquo;s
          photographs and answers. They are a reviewing order, not a prediction of tree
          failure. Every band can be overridden, and the original is kept.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
