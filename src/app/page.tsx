import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
          Halifax Urban Forestry
        </p>
        <h1 className="text-4xl font-semibold tracking-tight">TreeWatch</h1>
        <p className="text-base leading-relaxed text-neutral-600 dark:text-neutral-400">
          290 tree requests are waiting for a truck. TreeWatch scores hazard
          severity at intake — from the photo, the description, and the history
          already on file — so the queue is ranked by urgency instead of arrival
          order.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/report"
          className="rounded-lg border border-neutral-200 p-5 transition hover:border-emerald-500 dark:border-neutral-800"
        >
          <span className="block font-medium">Report a tree</span>
          <span className="mt-1 block text-sm text-neutral-500">
            Photo and description — takes a minute.
          </span>
        </Link>
        <Link
          href="/admin"
          className="rounded-lg border border-neutral-200 p-5 transition hover:border-emerald-500 dark:border-neutral-800"
        >
          <span className="block font-medium">Dispatcher queue</span>
          <span className="mt-1 block text-sm text-neutral-500">
            Open tickets, ranked by severity.
          </span>
        </Link>
      </div>
    </main>
  );
}
