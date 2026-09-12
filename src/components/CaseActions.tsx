"use client";

import { useState, useTransition } from "react";
import {
  approveAssessment,
  assignCase,
  closeCase,
  completeWork,
  overridePriority,
  recordInspection,
  requestEvidence,
  simulateScoringFailure,
} from "@/app/admin/actions";
import { Priority, PRIORITY_LABELS, Status } from "@/lib/domain/types";

const OVERRIDE_OPTIONS: Priority[] = [
  "critical",
  "high",
  "moderate",
  "low",
  "more_evidence_needed",
];

const CREWS = ["Crew 1 — Peninsula", "Crew 2 — Dartmouth", "Crew 4 — West End"];

const btn =
  "rounded-md px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";
const primary = `${btn} bg-forest text-white hover:bg-forest-hover`;
const secondary = `${btn} border border-line-strong text-ink hover:bg-canvas`;
const field =
  "w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm text-body placeholder:text-muted";

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <h2 className="text-base">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

export function CaseActions({
  reference,
  status,
  currentPriority,
  modelPriority,
  assignedCrew,
  publicSummary,
}: {
  reference: string;
  status: Status;
  currentPriority: Priority;
  modelPriority: Priority;
  assignedCrew: string | null;
  publicSummary: string | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<null | "override" | "evidence" | "assign" | "inspect" | "work" | "close">(null);

  // form state
  const [band, setBand] = useState<Priority>(
    currentPriority === "unscored" ? "high" : currentPriority,
  );
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [crew, setCrew] = useState(assignedCrew ?? CREWS[0]);
  const [findings, setFindings] = useState("");
  const [workRequired, setWorkRequired] = useState(true);
  const [workNotes, setWorkNotes] = useState("");
  const [summary, setSummary] = useState("");

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error);
      else {
        setOpen(null);
        setReason("");
        setMessage("");
        setFindings("");
        setWorkNotes("");
        setSummary("");
      }
    });
  }

  if (status === "closed") {
    return (
      <Panel title="Case closed">
        <p className="text-sm leading-relaxed text-body">{publicSummary}</p>
        <p className="text-xs text-muted">
          This summary is what the resident sees on their timeline.
        </p>
      </Panel>
    );
  }

  const canAssign = status === "forestry_review" || status === "more_evidence_needed";
  const canInspect = status === "inspection_scheduled";
  const canCompleteWork = status === "inspection_completed" || status === "work_required";
  const canClose =
    status === "work_completed" ||
    status === "inspection_completed" ||
    status === "forestry_review" ||
    status === "more_evidence_needed";

  return (
    <div className="space-y-4">
      <Panel title="Decision">
        {error && (
          <p
            role="alert"
            className="rounded border border-critical/30 bg-critical-bg px-3 py-2 text-sm text-critical"
          >
            {error}
          </p>
        )}

        {/* --- approve / override --- */}
        {open !== "override" ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={primary}
              disabled={pending || currentPriority === "unscored"}
              onClick={() => run(() => approveAssessment(reference))}
            >
              Approve as {PRIORITY_LABELS[currentPriority].toLowerCase()}
            </button>
            <button
              type="button"
              className={secondary}
              disabled={pending}
              onClick={() => setOpen("override")}
            >
              Override priority
            </button>
          </div>
        ) : (
          <div className="space-y-3 rounded border border-line bg-canvas p-3.5">
            <div>
              <label
                htmlFor="band"
                className="block text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Set priority to
              </label>
              <select
                id="band"
                className={`${field} mt-1.5`}
                value={band}
                onChange={(e) => setBand(e.target.value as Priority)}
              >
                {OVERRIDE_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="reason"
                className="block text-xs font-semibold uppercase tracking-wide text-muted"
              >
                Reason (required, recorded in the audit trail)
              </label>
              <textarea
                id="reason"
                rows={3}
                className={`${field} mt-1.5`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="What did you see that the scoring service did not?"
              />
            </div>
            <p className="text-xs text-muted">
              The original recommendation ({PRIORITY_LABELS[modelPriority].toLowerCase()})
              is kept, not replaced.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className={primary}
                disabled={pending}
                onClick={() => run(() => overridePriority(reference, band, reason))}
              >
                Save override
              </button>
              <button
                type="button"
                className={secondary}
                disabled={pending}
                onClick={() => setOpen(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Panel>

      <Panel title="Next step">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={secondary}
            disabled={pending}
            onClick={() => setOpen(open === "evidence" ? null : "evidence")}
          >
            Request evidence
          </button>
          {canAssign && (
            <button
              type="button"
              className={secondary}
              disabled={pending}
              onClick={() => setOpen(open === "assign" ? null : "assign")}
            >
              Assign for inspection
            </button>
          )}
          {canInspect && (
            <button
              type="button"
              className={secondary}
              disabled={pending}
              onClick={() => setOpen(open === "inspect" ? null : "inspect")}
            >
              Record inspection
            </button>
          )}
          {canCompleteWork && (
            <button
              type="button"
              className={secondary}
              disabled={pending}
              onClick={() => setOpen(open === "work" ? null : "work")}
            >
              Record completed work
            </button>
          )}
          {canClose && (
            <button
              type="button"
              className={secondary}
              disabled={pending}
              onClick={() => setOpen(open === "close" ? null : "close")}
            >
              Close case
            </button>
          )}
        </div>

        {open === "evidence" && (
          <div className="space-y-3 rounded border border-line bg-canvas p-3.5">
            <label htmlFor="msg" className="block text-xs font-semibold uppercase tracking-wide text-muted">
              What should the resident photograph, and from where?
            </label>
            <textarea
              id="msg"
              rows={3}
              className={field}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="From the same safe spot on the sidewalk, one photo with the sun behind you."
            />
            <p className="text-xs text-muted">
              Never ask a resident to approach, climb or cross a road for a photo.
            </p>
            <button
              type="button"
              className={primary}
              disabled={pending}
              onClick={() => run(() => requestEvidence(reference, message))}
            >
              Send request
            </button>
          </div>
        )}

        {open === "assign" && (
          <div className="space-y-3 rounded border border-line bg-canvas p-3.5">
            <label htmlFor="crew" className="block text-xs font-semibold uppercase tracking-wide text-muted">
              Crew
            </label>
            <select id="crew" className={field} value={crew} onChange={(e) => setCrew(e.target.value)}>
              {CREWS.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
            <button
              type="button"
              className={primary}
              disabled={pending}
              onClick={() => run(() => assignCase(reference, crew))}
            >
              Schedule inspection
            </button>
          </div>
        )}

        {open === "inspect" && (
          <div className="space-y-3 rounded border border-line bg-canvas p-3.5">
            <label htmlFor="find" className="block text-xs font-semibold uppercase tracking-wide text-muted">
              Field findings
            </label>
            <textarea
              id="find"
              rows={3}
              className={field}
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              placeholder="What the crew found on site."
            />
            <label className="flex items-center gap-2 text-sm text-body">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={workRequired}
                onChange={(e) => setWorkRequired(e.target.checked)}
              />
              Work is required
            </label>
            <button
              type="button"
              className={primary}
              disabled={pending}
              onClick={() => run(() => recordInspection(reference, findings, workRequired))}
            >
              Record inspection
            </button>
          </div>
        )}

        {open === "work" && (
          <div className="space-y-3 rounded border border-line bg-canvas p-3.5">
            <label htmlFor="wn" className="block text-xs font-semibold uppercase tracking-wide text-muted">
              What was done
            </label>
            <textarea
              id="wn"
              rows={3}
              className={field}
              value={workNotes}
              onChange={(e) => setWorkNotes(e.target.value)}
            />
            <button
              type="button"
              className={primary}
              disabled={pending}
              onClick={() => run(() => completeWork(reference, workNotes))}
            >
              Mark work completed
            </button>
          </div>
        )}

        {open === "close" && (
          <div className="space-y-3 rounded border border-line bg-canvas p-3.5">
            <label htmlFor="sum" className="block text-xs font-semibold uppercase tracking-wide text-muted">
              Public summary — the resident sees this
            </label>
            <textarea
              id="sum"
              rows={3}
              className={field}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="A forestry crew removed the hanging limb. No further work is needed."
            />
            <button
              type="button"
              className={primary}
              disabled={pending}
              onClick={() => run(() => closeCase(reference, summary))}
            >
              Close case
            </button>
          </div>
        )}
      </Panel>

      <Panel title="Demo controls">
        <p className="text-xs leading-relaxed text-muted">
          Simulates the scoring service never answering. The report is not lost — it drops
          to unscored and rises to the top of the queue for a human.
        </p>
        <button
          type="button"
          className={secondary}
          disabled={pending || currentPriority === "unscored"}
          onClick={() => run(() => simulateScoringFailure(reference))}
        >
          Simulate scoring failure
        </button>
      </Panel>
    </div>
  );
}
