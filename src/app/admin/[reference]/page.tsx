import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { ConfidenceMeter, PriorityChip } from "@/components/PriorityChip";
import { CaseActions } from "@/components/CaseActions";
import { getCase } from "@/lib/data";
import { queueMetrics } from "@/lib/domain/queue";
import {
  DETECTION_HINTS,
  DETECTION_KEYS,
  DETECTION_LABELS,
  DetectionKey,
  FRAME_LABELS,
  FrameType,
  LIMITATIONS_TEXT,
  PRIORITY_MEANING,
  STATUS_STAFF_LABELS,
  WHATS_NEARBY_LABELS,
  WHATS_WRONG_LABELS,
  WHEN_NOTICED_LABELS,
  WhatsNearby,
  WhatsWrong,
  evidencePhotoIndex,
  evidenceText,
} from "@/lib/domain/types";

export const dynamic = "force-dynamic";

/** Which observable features would support each thing the resident ticked. */
const CLAIM_SUPPORT: Record<WhatsWrong, DetectionKey[]> = {
  leaning: ["leaning"],
  branch_hanging: ["hanging_limb"],
  dead_or_bare: ["dead_crown"],
  trunk_damage: ["trunk_crack", "trunk_cavity"],
  roots_lifting: ["roots_lifted"],
  touching_wires: ["wires_visible"],
  blocking_path: ["blocking_path"],
  other: [],
};

function Section({
  title,
  children,
  note,
}: {
  title: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-5">
      <h2 className="text-base">{title}</h2>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function CaseDetail({
  params,
}: PageProps<"/admin/[reference]">) {
  const { reference } = await params;
  const c = await getCase(reference);
  if (!c) notFound();

  const m = queueMetrics(c);
  const unscored = m.effectivePriority === "unscored";

  return (
    <>
      <SiteHeader
        workspace={{ label: "Forestry workspace", href: "/admin", actor: "K. Pictou" }}
      />

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Link
          href="/admin"
          className="text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          &larr; Back to queue
        </Link>

        {/* Case header */}
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl">{c.reference}</h1>
              <PriorityChip priority={m.effectivePriority} overridden={m.isOverridden} />
              {c.lowConfidence && (
                <span className="rounded-full bg-high-bg px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-high ring-1 ring-high/30">
                  Low confidence
                </span>
              )}
            </div>
            <p className="mt-1.5 text-body">
              {c.addressText ?? `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`}
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {STATUS_STAFF_LABELS[c.status]} · submitted{" "}
              {c.submittedAt.toLocaleDateString("en-CA", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {m.daysOpen > 0 && ` · ${m.daysOpen} days open`}
            </p>
          </div>

          <div className="text-right">
            <ConfidenceMeter confidence={c.confidence} low={c.lowConfidence} />
            {c.priorityScoreModel != null && (
              <p className="mt-2 text-sm tabular-nums text-muted">
                model score{" "}
                <span className="font-semibold text-ink">{c.priorityScoreModel}</span>
                {m.agePoints > 0 && ` + ${m.agePoints} age`} ={" "}
                <span className="font-semibold text-ink">{m.effectiveScore}</span> queue
              </p>
            )}
          </div>
        </div>

        {/* Override banner */}
        {m.isOverridden && (
          <div className="mt-5 rounded-card border border-forest/40 bg-mist px-4 py-3">
            <p className="text-sm font-semibold text-deep">
              Staff set this to {m.effectivePriority}. The scoring service said{" "}
              {c.priorityModel}.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-body">{c.overrideReason}</p>
            <p className="mt-1.5 text-xs text-muted">
              {c.overriddenBy} ·{" "}
              {c.overriddenAt?.toLocaleDateString("en-CA", {
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
        )}

        {/* Unscored banner */}
        {unscored && (
          <div className="mt-5 rounded-card border-l-4 border-deep bg-surface px-4 py-3">
            <p className="text-sm font-semibold text-deep">
              Scoring did not complete. This case was raised to the top of the queue.
            </p>
            {c.scoringError && (
              <p className="mt-1 font-mono text-xs text-muted">{c.scoringError}</p>
            )}
            <p className="mt-1.5 text-sm text-body">
              Nothing has been inferred about this tree. Review the resident&rsquo;s
              evidence directly.
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_1fr] lg:items-start">
          {/* ---------------- Resident evidence ---------------- */}
          <div className="space-y-5">
            <Section title="Resident evidence" note="What was submitted, unaltered.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {c.photos.map((p) => (
                  <figure key={p.id} className="min-w-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt={`${FRAME_LABELS[p.frameType as FrameType] ?? p.frameType} — photo ${p.orderIndex + 1} of ${c.reference}`}
                      className="aspect-[4/3] w-full rounded border border-line object-cover"
                    />
                    <figcaption className="mt-1.5 text-xs leading-tight text-muted">
                      <span className="font-medium text-ink">
                        Photo {p.orderIndex + 1}
                      </span>{" "}
                      · {FRAME_LABELS[p.frameType as FrameType] ?? p.frameType}
                    </figcaption>
                  </figure>
                ))}
              </div>

              <blockquote className="mt-5 border-l-2 border-line-strong pl-4 text-[15px] leading-relaxed text-body">
                {c.description}
              </blockquote>

              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                    What looks wrong
                  </dt>
                  <dd className="mt-1.5 space-y-1">
                    {c.whatsWrong.map((w) => (
                      <div key={w} className="text-body">
                        {WHATS_WRONG_LABELS[w as WhatsWrong] ?? w}
                      </div>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                    What&rsquo;s nearby
                  </dt>
                  <dd className="mt-1.5 space-y-1">
                    {c.whatsNearby.map((w) => (
                      <div key={w} className="text-body">
                        {WHATS_NEARBY_LABELS[w as WhatsNearby] ?? w}
                      </div>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                    When noticed
                  </dt>
                  <dd className="mt-1.5 text-body">
                    {WHEN_NOTICED_LABELS[c.whenNoticed] ?? c.whenNoticed}
                  </dd>
                </div>
              </dl>
            </Section>

            {/* ---------------- System reasoning ---------------- */}
            <Section
              title="What the scoring service observed"
              note={
                c.modelVersion
                  ? `${c.modelVersion} · scored ${c.scoredAt?.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}`
                  : "No assessment on file."
              }
            >
              {unscored ? (
                <p className="text-sm text-muted">
                  Nothing to show. The case is waiting on a human.
                </p>
              ) : (
                <div className="space-y-6">
                  {c.evidence.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Cited evidence
                      </h3>
                      <ul className="mt-2 space-y-1.5">
                        {c.evidence.map((e, i) => {
                          const idx = evidencePhotoIndex(e);
                          return (
                            <li key={i} className="flex gap-2.5 text-sm text-body">
                              <span
                                aria-hidden
                                className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-forest"
                              />
                              <span>
                                {evidenceText(e)}
                                {idx !== null && (
                                  <span className="ml-1.5 rounded bg-mist px-1.5 py-0.5 text-[11px] font-medium text-forest">
                                    photo {idx + 1}
                                  </span>
                                )}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {c.conflicts.length > 0 && (
                    <div className="rounded border border-high/30 bg-high-bg px-3.5 py-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-high">
                        Conflicts and gaps
                      </h3>
                      <ul className="mt-2 space-y-1.5">
                        {c.conflicts.map((e, i) => (
                          <li key={i} className="text-sm leading-relaxed text-body">
                            {evidenceText(e)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Resident claim vs observation */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Observable features
                    </h3>
                    <ul className="mt-2 divide-y divide-line">
                      {DETECTION_KEYS.map((key) => {
                        const d = c.detected[key];
                        if (!d) return null;
                        const claimed = c.whatsWrong.some((w) =>
                          CLAIM_SUPPORT[w as WhatsWrong]?.includes(key),
                        );
                        const pct = Math.round(d.conf * 100);

                        return (
                          <li key={key} className="flex items-center gap-3 py-2">
                            <span
                              className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                d.present
                                  ? "bg-mist text-forest"
                                  : "bg-canvas text-muted"
                              }`}
                              aria-hidden
                            >
                              {d.present ? "✓" : "–"}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm text-body">
                                {DETECTION_LABELS[key]}
                                {typeof d.angle_deg === "number" && (
                                  <span className="ml-1.5 font-medium text-ink">
                                    {Math.round(d.angle_deg)}°
                                  </span>
                                )}
                              </span>
                              <span className="block text-xs text-muted">
                                {DETECTION_HINTS[key]}
                              </span>
                            </span>
                            {claimed && (
                              <span
                                className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                                  d.present
                                    ? "bg-mist text-forest"
                                    : "bg-high-bg text-high"
                                }`}
                              >
                                {d.present ? "resident agrees" : "resident disagrees"}
                              </span>
                            )}
                            <span className="w-24 shrink-0 text-right text-xs tabular-nums text-muted">
                              {pct}% present
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {(c.estimated.height_m != null ||
                    c.estimated.trunk_diameter_cm != null) && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Estimated dimensions
                      </h3>
                      <p className="mt-1.5 text-sm text-body">
                        {[
                          c.estimated.height_m != null && `${c.estimated.height_m} m tall`,
                          c.estimated.canopy_spread_m != null &&
                            `${c.estimated.canopy_spread_m} m canopy`,
                          c.estimated.trunk_diameter_cm != null &&
                            `${c.estimated.trunk_diameter_cm} cm trunk`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  )}

                  <p className="border-l-2 border-line-strong pl-3.5 text-xs leading-relaxed text-muted">
                    <span className="font-semibold text-ink">
                      {PRIORITY_MEANING[c.priorityModel]}
                    </span>{" "}
                    {LIMITATIONS_TEXT}
                  </p>
                </div>
              )}
            </Section>

            {/* ---------------- Audit trail ---------------- */}
            <Section
              title="Audit trail"
              note="Internal. Only events marked public reach the resident."
            >
              <ol className="space-y-3">
                {c.events.map((e) => (
                  <li key={e.id} className="flex gap-3 text-sm">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        e.isPublic ? "bg-forest" : "bg-line-strong"
                      }`}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-body">
                        <span className="font-medium text-ink">
                          {e.action.replace(/_/g, " ")}
                        </span>
                        {e.priorValue && e.newValue && (
                          <span className="text-muted">
                            {" "}
                            · {e.priorValue} &rarr; {e.newValue}
                          </span>
                        )}
                      </p>
                      {e.note && (
                        <p className="mt-0.5 leading-relaxed text-muted">{e.note}</p>
                      )}
                      <p className="mt-0.5 text-xs text-muted">
                        {e.actor} ·{" "}
                        {e.createdAt.toLocaleString("en-CA", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {e.isPublic && " · shown to the resident"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Section>
          </div>

          {/* ---------------- Actions ---------------- */}
          <div className="lg:sticky lg:top-24">
            <CaseActions
              reference={c.reference}
              status={c.status}
              currentPriority={m.effectivePriority}
              modelPriority={c.priorityModel}
              assignedCrew={c.assignedCrew}
              publicSummary={c.publicSummary}
            />
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}
