import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { ReportWizard } from "@/components/ReportWizard";

export default function ReportPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-2xl">Report a tree</h1>
        <p className="mt-1.5 text-sm text-muted">
          About ninety seconds. You&rsquo;ll get a ticket number at the end.
        </p>
        <div className="mt-6">
          <ReportWizard />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
