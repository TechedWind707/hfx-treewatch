import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { getCase } from "@/lib/data";
import {
  FRAME_LABELS,
  FrameType,
  STATUS_CITIZEN_LABELS,
  WHATS_NEARBY_LABELS,
  WHATS_WRONG_LABELS,
  WhatsNearby,
  WhatsWrong,
} from "@/lib/domain/types";

export const dynamic = "force-dynamic";

/**
 * The resident's view. Rendered from public events only — internal notes,
 * crew details, model scores and staff reasoning never appear here.
 */
export default async function TicketPage({ params }: PageProps<"/ticket/[reference]">) {
  const { reference } = await params;
  const c = await getCase(reference);
  if (!c) notFound();

  const publicEvents = c.events.filter((e) => e.isPublic && e.publicText);
  const latest = publicEvents.at(-1);

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="rounded-card border border-line bg-surface p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest">
            Report received
          </p>
          <h1 className="mt-2 text-3xl">{c.reference}</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-body">
            Thank you. Your report is with Halifax Urban Forestry. Keep this number —
            it&rsquo;s how you check back on it.
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-mist px-3.5 py-1.5 text-sm font-semibold text-deep">
            {STATUS_CITIZEN_LABELS[c.status]}
          </div>

          {latest && (
            <p className="mt-4 border-l-2 border-line-strong pl-4 text-sm leading-relaxed text-body">
              {latest.publicText}
            </p>
          )}
        </div>

        {/* Timeline */}
        <section className="mt-5 rounded-card border border-line bg-surface p-6">
          <h2 className="text-base">Progress</h2>
          <ol className="mt-4 space-y-4">
            {publicEvents.map((e, i) => (
              <li key={e.id} className="flex gap-3.5">
                <span className="relative flex flex-col items-center">
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      i === publicEvents.length - 1 ? "bg-forest" : "bg-line-strong"
                    }`}
                    aria-hidden
                  />
                  {i < publicEvents.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-line" aria-hidden />
                  )}
                </span>
                <div className="pb-1">
                  <p className="text-sm leading-relaxed text-body">{e.publicText}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {e.createdAt.toLocaleString("en-CA", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* What you sent */}
        <section className="mt-5 rounded-card border border-line bg-surface p-6">
          <h2 className="text-base">What you sent</h2>
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {c.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <li key={p.id}>
                <img
                  src={p.url}
                  alt={FRAME_LABELS[p.frameType as FrameType] ?? p.frameType}
                  className="aspect-square w-full rounded border border-line object-cover"
                />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm leading-relaxed text-body">{c.description}</p>
          <p className="mt-3 text-xs text-muted">
            {c.whatsWrong.map((w) => WHATS_WRONG_LABELS[w as WhatsWrong]).join(", ")} ·
            near {c.whatsNearby.map((w) => WHATS_NEARBY_LABELS[w as WhatsNearby]).join(", ")}
          </p>
        </section>

        <p className="mt-6 text-sm text-muted">
          <Link href="/report" className="font-medium text-civic underline-offset-4 hover:underline">
            Report another tree
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
