import { z } from "zod";

/** Severity scale shown to the dispatcher. */
export const SEVERITY_LABELS: Record<number, string> = {
  1: "Routine",
  2: "Low",
  3: "Moderate",
  4: "High",
  5: "Imminent hazard",
};

export const ConfidenceSchema = z.enum(["high", "medium", "low"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

/** The structured verdict Claude returns for one ticket. */
export const AssessmentSchema = z.object({
  severity: z.number().int().min(1).max(5),
  reasoning: z.string().min(1),
  confidence: ConfidenceSchema,
  /** Set when signals conflict — the differentiator: say so instead of guessing. */
  conflictingSignals: z.array(z.string()).default([]),
});
export type Assessment = z.infer<typeof AssessmentSchema>;

/** What the citizen form posts. */
export const SubmissionSchema = z.object({
  address: z.string().min(3),
  description: z.string().min(5),
  reporterName: z.string().optional(),
  reporterContact: z.string().optional(),
  /** base64 data URL or uploaded file path */
  photo: z.string().optional(),
});
export type Submission = z.infer<typeof SubmissionSchema>;

export type SiteContext = {
  kind: string;
  summary: string;
  occurredAt?: Date | null;
};
