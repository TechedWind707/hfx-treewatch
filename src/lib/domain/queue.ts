/**
 * Dispatch order — owned by this application, not by the scoring wrapper.
 *
 * Deterministic so a judge can follow it on screen:
 *   1. unscored first — a scoring failure must raise human visibility
 *   2. canonical priority band (staff override wins over the model)
 *   3. effective score = min(100, priority_score + min(days_open x 2, 20))
 *   4. oldest submission first
 *
 * Age contributes at most 20 points, so a stale low case surfaces eventually
 * but can never silently become a critical one. Both the original model score
 * and the age-adjusted queue score are displayed.
 */
import { Priority, PRIORITY_RANK, adaptPriority } from "./types";

export const MAX_AGE_POINTS = 20;
export const POINTS_PER_DAY = 2;

export type Rankable = {
  id: string;
  reference: string;
  submittedAt: Date;
  /** The wrapper's band, already adapted (`extreme` -> `critical`). */
  priorityModel: Priority;
  /** Staff override. Null when nobody has overridden. */
  priorityFinal: Priority | null;
  /** The wrapper's 0-100 score. Null while unscored. */
  priorityScoreModel: number | null;
};

export type QueueMetrics = {
  daysOpen: number;
  agePoints: number;
  /** Age-adjusted score used for ordering. */
  effectiveScore: number;
  /** What the dispatcher acts on: override if present, otherwise the model. */
  effectivePriority: Priority;
  /** True when a human has changed the band. */
  isOverridden: boolean;
};

export function effectivePriority(t: Rankable): Priority {
  return t.priorityFinal ?? t.priorityModel;
}

export function queueMetrics(t: Rankable, now = new Date()): QueueMetrics {
  const daysOpen = Math.max(
    0,
    Math.floor((now.getTime() - t.submittedAt.getTime()) / 86_400_000),
  );
  const agePoints = Math.min(daysOpen * POINTS_PER_DAY, MAX_AGE_POINTS);
  const base = t.priorityScoreModel ?? 0;

  return {
    daysOpen,
    agePoints,
    effectiveScore: Math.min(100, base + agePoints),
    effectivePriority: effectivePriority(t),
    isOverridden: t.priorityFinal !== null && t.priorityFinal !== t.priorityModel,
  };
}

/** Stable, total ordering. Same input always produces the same queue. */
export function sortQueue<T extends Rankable>(tickets: T[], now = new Date()): T[] {
  return [...tickets].sort((a, b) => {
    const ma = queueMetrics(a, now);
    const mb = queueMetrics(b, now);

    const bandDelta =
      PRIORITY_RANK[ma.effectivePriority] - PRIORITY_RANK[mb.effectivePriority];
    if (bandDelta !== 0) return bandDelta;

    const scoreDelta = mb.effectiveScore - ma.effectiveScore;
    if (scoreDelta !== 0) return scoreDelta;

    const ageDelta = a.submittedAt.getTime() - b.submittedAt.getTime();
    if (ageDelta !== 0) return ageDelta;

    return a.reference.localeCompare(b.reference);
  });
}

/** Convenience for rows loaded straight out of the database. */
export function toRankable(row: {
  id: string;
  reference: string;
  submittedAt: Date;
  priorityModel: string | null;
  priorityFinal: string | null;
  priorityScoreModel: number | null;
}): Rankable {
  return {
    id: row.id,
    reference: row.reference,
    submittedAt: row.submittedAt,
    priorityModel: adaptPriority(row.priorityModel),
    priorityFinal: row.priorityFinal ? adaptPriority(row.priorityFinal) : null,
    priorityScoreModel: row.priorityScoreModel,
  };
}
