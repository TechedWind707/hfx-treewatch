import Link from "next/link";
import { Wordmark } from "./Brand";

export function SiteHeader({
  workspace,
}: {
  /** Set on authenticated screens; replaces the public actions. */
  workspace?: { label: string; href: string; actor: string };
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 rounded-sm">
          <Wordmark />
        </Link>

        {workspace ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{workspace.label}</span>
            <span className="rounded-full bg-mist px-3 py-1.5 font-medium text-deep">
              {workspace.actor}
            </span>
            <Link
              href="/"
              className="rounded-md px-2 py-1.5 font-medium text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              Exit
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/admin"
              className="rounded-md border border-forest px-3 py-2 text-sm font-semibold text-forest transition hover:bg-mist sm:px-4"
            >
              Forestry Sign In
            </Link>
            <Link
              href="/report"
              className="rounded-md bg-forest px-3 py-2 text-sm font-semibold text-white transition hover:bg-forest-hover sm:px-4"
            >
              Report a Tree
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted sm:px-6">
        <p className="font-medium text-ink">
          Hackathon prototype — not an official Halifax Regional Municipality service.
        </p>
        <p className="mt-2 max-w-3xl leading-relaxed">
          HFX TreeWatch prepares evidence for human forestry review. It does not diagnose
          trees, certify that a tree is safe, or predict failure. For a tree on a power
          line, contact Nova Scotia Power&rsquo;s 24-hour line. In an emergency, call 911.
        </p>
      </div>
    </footer>
  );
}
