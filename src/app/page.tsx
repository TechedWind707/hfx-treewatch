import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { HeroVisual } from "@/components/HeroVisual";

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="flex-1">
        {/* Hero */}
        <section className="border-b border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14 lg:py-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest">
                Halifax urban forestry
              </p>
              <h1 className="mt-3 text-[2rem] leading-[1.15] sm:text-[2.6rem]">
                See a concerning tree? Help forestry review the right evidence sooner.
              </h1>
              <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-body">
                Use guided photos and a confirmed location to create a useful tree concern
                report. HFX TreeWatch checks the evidence and prepares it for human
                forestry review.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/report"
                  className="rounded-md bg-forest px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-forest-hover"
                >
                  Report a Tree
                </Link>
                <Link
                  href="/admin"
                  className="rounded-md border border-forest px-5 py-3 text-[15px] font-semibold text-forest transition hover:bg-mist"
                >
                  Forestry Admin Sign In
                </Link>
              </div>

              <p className="mt-6 max-w-xl border-l-2 border-line-strong pl-4 text-sm leading-relaxed text-muted">
                Preliminary assessment only. A qualified forestry inspection remains the
                final decision.
              </p>
            </div>

            <HeroVisual />
          </div>
        </section>

        {/* The problem, stated plainly */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl">Why reports get stuck</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-body">
            Tree concerns already reach Halifax through 311. They arrive with uneven
            photos and descriptions, so staff have to interpret the evidence before they
            can decide what deserves faster review. TreeWatch does that interpreting
            step, in the open, and leaves the decision with a person.
          </p>

          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                n: "1",
                h: "A resident reports once",
                p: "Guided photo prompts and a confirmed map pin, from a safe distance. About ninety seconds.",
              },
              {
                n: "2",
                h: "The evidence is checked",
                p: "Observable features are identified and cited, with a confidence figure and any contradictions made explicit.",
              },
              {
                n: "3",
                h: "A person decides",
                p: "Forestry staff see a ranked queue with reasons, override anything, and close the case with a public summary.",
              },
            ].map((s) => (
              <li
                key={s.n}
                className="rounded-card border border-line bg-surface p-5"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-mist text-sm font-semibold text-forest">
                  {s.n}
                </span>
                <h3 className="mt-3 text-base">{s.h}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.p}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Safety strip */}
        <section className="border-y border-line bg-mist/60">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            <h2 className="text-lg">Before you photograph anything</h2>
            <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-body sm:grid-cols-2">
              <li>
                Stay on the sidewalk or your own property. Never climb, touch or shake a
                tree, and never stand under a hanging branch.
              </li>
              <li>
                If a tree is on a power line, do not approach it. Call Nova Scotia
                Power&rsquo;s 24-hour outage line.
              </li>
              <li>
                If a tree has fallen across a road or onto a building with people inside,
                call 911 first.
              </li>
              <li>
                Photographs taken from a distance are more useful to forestry than close
                ones taken unsafely.
              </li>
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
