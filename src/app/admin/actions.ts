"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  Priority,
  Status,
  STATUS_CITIZEN_LABELS,
  canTransition,
} from "@/lib/domain/types";

/** Demo staff identity. Replaced by real sign-in outside the hackathon. */
const DEMO_STAFF = "K. Pictou (Forestry)";

type ActionResult = { ok: true } | { ok: false; error: string };

async function loadOr404(reference: string) {
  const row = await prisma.submission.findUnique({ where: { reference } });
  if (!row) throw new Error(`No case ${reference}`);
  return row;
}

function refresh(reference: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/${reference}`);
  revalidatePath(`/ticket/${reference}`);
}

/**
 * Move a case along the status machine, writing an audit event. Illegal
 * transitions are refused rather than silently applied.
 */
async function transition(
  reference: string,
  to: Status,
  event: {
    action: string;
    note?: string | null;
    isPublic?: boolean;
    publicText?: string | null;
  },
  extra: Record<string, unknown> = {},
): Promise<ActionResult> {
  const row = await loadOr404(reference);
  const from = row.status as Status;

  if (from !== to && !canTransition(from, to)) {
    return {
      ok: false,
      error: `Cannot move a case from "${STATUS_CITIZEN_LABELS[from]}" to "${STATUS_CITIZEN_LABELS[to]}".`,
    };
  }

  await prisma.$transaction([
    prisma.submission.update({
      where: { reference },
      data: { status: to, ...extra },
    }),
    prisma.auditEvent.create({
      data: {
        submissionId: row.id,
        actor: DEMO_STAFF,
        action: event.action,
        priorValue: from,
        newValue: to,
        note: event.note ?? null,
        isPublic: event.isPublic ?? false,
        publicText: event.publicText ?? null,
      },
    }),
  ]);

  refresh(reference);
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * Priority override — the original model output is never overwritten.
 * ------------------------------------------------------------------ */

export async function overridePriority(
  reference: string,
  priorityFinal: Priority,
  reason: string,
): Promise<ActionResult> {
  const trimmed = reason.trim();
  if (trimmed.length < 10) {
    return {
      ok: false,
      error: "An override needs a reason of at least 10 characters. It goes in the audit record.",
    };
  }

  const row = await loadOr404(reference);
  const before = row.priorityFinal ?? row.priorityModel ?? "unscored";

  await prisma.$transaction([
    prisma.submission.update({
      where: { reference },
      data: {
        // priorityModel and priorityScoreModel are deliberately untouched.
        priorityFinal,
        overrideReason: trimmed,
        overriddenBy: DEMO_STAFF,
        overriddenAt: new Date(),
      },
    }),
    prisma.auditEvent.create({
      data: {
        submissionId: row.id,
        actor: DEMO_STAFF,
        action: "priority_override",
        priorValue: before,
        newValue: priorityFinal,
        note: trimmed,
        isPublic: true,
        publicText: "Reviewed by forestry staff.",
      },
    }),
  ]);

  refresh(reference);
  return { ok: true };
}

export async function approveAssessment(reference: string): Promise<ActionResult> {
  const row = await loadOr404(reference);
  await prisma.auditEvent.create({
    data: {
      submissionId: row.id,
      actor: DEMO_STAFF,
      action: "assessment_approved",
      newValue: row.priorityModel ?? "unscored",
      note: "Staff accepted the preliminary recommendation without change.",
      isPublic: true,
      publicText: "Reviewed by forestry staff.",
    },
  });
  refresh(reference);
  return { ok: true };
}

/* ------------------------------------------------------------------ *
 * Workflow actions
 * ------------------------------------------------------------------ */

export async function requestEvidence(
  reference: string,
  message: string,
): Promise<ActionResult> {
  const trimmed = message.trim();
  if (trimmed.length < 10) {
    return { ok: false, error: "Say specifically what photo is needed, and from where." };
  }
  return transition(
    reference,
    "more_evidence_needed",
    {
      action: "evidence_requested",
      note: trimmed,
      isPublic: true,
      publicText: trimmed,
    },
  );
}

export async function assignCase(
  reference: string,
  crew: string,
): Promise<ActionResult> {
  if (!crew.trim()) return { ok: false, error: "Choose a crew." };
  return transition(
    reference,
    "inspection_scheduled",
    {
      action: "assigned",
      note: `Assigned to ${crew.trim()}.`,
      isPublic: true,
      publicText: "An inspection has been scheduled.",
    },
    { assignedCrew: crew.trim(), inspectionScheduledAt: new Date() },
  );
}

export async function recordInspection(
  reference: string,
  findings: string,
  workRequired: boolean,
): Promise<ActionResult> {
  const trimmed = findings.trim();
  if (trimmed.length < 10) {
    return { ok: false, error: "Record what was found in the field." };
  }
  const scheduled = await transition(
    reference,
    "inspection_completed",
    {
      action: "inspection_completed",
      note: trimmed,
      isPublic: true,
      publicText: workRequired
        ? "Inspection completed. Work is required."
        : "Inspection completed. No work is required.",
    },
    { inspectionFindings: trimmed },
  );
  if (!scheduled.ok) return scheduled;

  if (workRequired) {
    return transition(reference, "work_required", {
      action: "work_required",
      note: "Work planned following inspection.",
    });
  }
  return scheduled;
}

export async function completeWork(
  reference: string,
  notes: string,
): Promise<ActionResult> {
  return transition(
    reference,
    "work_completed",
    {
      action: "work_completed",
      note: notes.trim() || null,
      isPublic: true,
      publicText: "Work completed.",
    },
    { workNotes: notes.trim() || null },
  );
}

export async function closeCase(
  reference: string,
  publicSummary: string,
): Promise<ActionResult> {
  const trimmed = publicSummary.trim();
  if (trimmed.length < 10) {
    return {
      ok: false,
      error: "Write the summary the resident will see when the case closes.",
    };
  }
  return transition(
    reference,
    "closed",
    {
      action: "closed",
      note: "Case closed with an approved public summary.",
      isPublic: true,
      publicText: trimmed,
    },
    { publicSummary: trimmed, closedAt: new Date(), closedBy: DEMO_STAFF },
  );
}

/* ------------------------------------------------------------------ *
 * Demo controls
 * ------------------------------------------------------------------ */

/**
 * Simulates the wrapper never answering: clears the scoring columns and drops
 * the case to `unscored`, where the queue lifts it to the top. Proves that a
 * model failure increases human visibility instead of losing the report.
 */
export async function simulateScoringFailure(reference: string): Promise<ActionResult> {
  const row = await loadOr404(reference);
  await prisma.$transaction([
    prisma.submission.update({
      where: { reference },
      data: {
        priorityModel: null,
        priorityScoreModel: null,
        confidence: null,
        lowConfidence: false,
        detected: null,
        estimated: null,
        evidence: null,
        conflicts: null,
        modelVersion: null,
        scoredAt: null,
        scoringError: "PerceptionError: upstream vision call timed out after 30s",
      },
    }),
    prisma.auditEvent.create({
      data: {
        submissionId: row.id,
        actor: "system",
        action: "scoring_failed",
        priorValue: row.priorityModel,
        newValue: "unscored",
        note: "Simulated wrapper failure. Case raised to the top of the queue for manual review.",
        isPublic: true,
        publicText: "Your report is with forestry staff for review.",
      },
    }),
  ]);
  refresh(reference);
  return { ok: true };
}
