/**
 * Canonical domain vocabulary for HFX TreeWatch.
 *
 * Two systems share one database, with strict column ownership:
 *
 *   SCORING WRAPPER (GCP, partner-owned)
 *     writes: priority_model, priority_score_model, confidence, low_confidence,
 *             detected, estimated, evidence, conflicts, model_version, scored_at
 *     never touches: status, priority_final, override_reason, assigned_crew
 *
 *   THIS APPLICATION
 *     writes: everything the resident submits, and every staff decision —
 *             status, priority_final, override_reason, assignment, inspection,
 *             work, closure, audit events
 *     reads:  the wrapper's output, and renders it. It does not re-score.
 *
 * The wrapper is fire-and-forget: POST /score returns 202 and the assessment
 * appears in the database a moment later. Until it does, the ticket is
 * `unscored` and sits at the top of the dispatcher's queue.
 */

/* ------------------------------------------------------------------ *
 * Perception + scoring — written by the wrapper
 * ------------------------------------------------------------------ */

export const DETECTION_KEYS = [
  "leaning",
  "hanging_limb",
  "dead_crown",
  "trunk_cavity",
  "trunk_crack",
  "roots_lifted",
  "wires_visible",
  "blocking_path",
  "photo_usable",
] as const;

export type DetectionKey = (typeof DETECTION_KEYS)[number];

/** Human wording for each observable feature, shown in case detail. */
export const DETECTION_LABELS: Record<DetectionKey, string> = {
  leaning: "Leaning trunk",
  hanging_limb: "Limb detached but caught in the tree",
  dead_crown: "Dead or bare crown",
  trunk_cavity: "Cavity in the trunk",
  trunk_crack: "Crack in the trunk",
  roots_lifted: "Roots lifting",
  wires_visible: "Wires in contact or close",
  blocking_path: "Obstructing a path",
  photo_usable: "At least one usable frame",
};

/** Short definition, straight from the wrapper's DETECTION_HINTS. */
export const DETECTION_HINTS: Record<DetectionKey, string> = {
  leaning: "the trunk is off vertical",
  hanging_limb: "a limb detached or broken but still caught in the tree",
  dead_crown: "the upper canopy is dead or bare",
  trunk_cavity: "an opening or hollow in the trunk",
  trunk_crack: "a split or fissure in the trunk",
  roots_lifted: "the root plate or surrounding ground is lifting",
  wires_visible: "wires run through or touch the canopy",
  blocking_path: "the tree or a limb obstructs a walkway or road",
  photo_usable: "at least one frame is clear enough to make these observations",
};

/**
 * Storage shape, per datadict §7. `conf` is the confidence the feature IS
 * PRESENT in the imagery — it is not a severity.
 *
 * `photo_index` is currently internal to the wrapper and is NOT in the stored
 * payload; it is optional here so the UI can light up the cited frame the
 * moment that schema change lands.
 */
export type Detection = {
  present: boolean;
  conf: number;
  angle_deg?: number | null;
  /** 0-based. Not yet supplied by the wrapper — see integration notes. */
  photo_index?: number | null;
};

export type Detections = Partial<Record<DetectionKey, Detection>>;

export type Estimated = {
  height_m?: number | null;
  canopy_spread_m?: number | null;
  trunk_diameter_cm?: number | null;
};

/**
 * Evidence and conflicts arrive as plain strings today. If the wrapper later
 * returns objects with a photo index, this union absorbs it without a rewrite.
 */
export type EvidenceItem = string | { text: string; photo_index?: number | null };

export function evidenceText(item: EvidenceItem): string {
  return typeof item === "string" ? item : item.text;
}

/**
 * Best-effort frame reference. Structural `photo_index` wins; otherwise fall
 * back to parsing a trailing "photo 3" out of the sentence. The fallback is a
 * convenience for highlighting only — nothing depends on it being right.
 */
export function evidencePhotoIndex(item: EvidenceItem): number | null {
  if (typeof item !== "string" && typeof item.photo_index === "number") {
    return item.photo_index;
  }
  const match = /\bphoto\s+(\d+)\b/i.exec(evidenceText(item));
  if (!match) return null;
  const oneBased = Number(match[1]);
  return Number.isFinite(oneBased) && oneBased > 0 ? oneBased - 1 : null;
}

/** Exactly what the wrapper returns from POST /score/sync, and writes to the DB. */
export type ModelOutput = {
  submission_id: string;
  model_version: string;
  scored_at: string;
  /** Wrapper vocabulary: low | moderate | high | extreme. */
  priority: string;
  priority_score: number;
  confidence: number;
  low_confidence: boolean;
  detected: Detections;
  estimated: Estimated;
  evidence: EvidenceItem[];
  conflicts: EvidenceItem[];
};

/* ------------------------------------------------------------------ *
 * Citizen submission contract
 * ------------------------------------------------------------------ */

export const FRAME_TYPES = [
  "full_tree",
  "base_roots",
  "the_problem",
  "surroundings",
  "extra",
] as const;
export type FrameType = (typeof FRAME_TYPES)[number];

export const FRAME_LABELS: Record<FrameType, string> = {
  full_tree: "The whole tree",
  base_roots: "Base and roots",
  the_problem: "The problem itself",
  surroundings: "What's around it",
  extra: "Anything else",
};

export const FRAME_HELP: Record<FrameType, string> = {
  full_tree: "Stand back far enough to get the whole tree in frame, ground to top.",
  base_roots: "The bottom of the trunk and the ground around it.",
  the_problem: "Whatever made you report it — the lean, the split, the hanging branch.",
  surroundings: "What's underneath and around it: path, road, cars, wires.",
  extra: "Anything else you think forestry should see.",
};

export const WHATS_WRONG = [
  "leaning",
  "branch_hanging",
  "dead_or_bare",
  "trunk_damage",
  "roots_lifting",
  "touching_wires",
  "blocking_path",
  "other",
] as const;
export type WhatsWrong = (typeof WHATS_WRONG)[number];

export const WHATS_WRONG_LABELS: Record<WhatsWrong, string> = {
  leaning: "It's leaning",
  branch_hanging: "A branch is hanging or broken",
  dead_or_bare: "It looks dead or bare",
  trunk_damage: "The trunk is damaged or split",
  roots_lifting: "The roots are lifting the ground",
  touching_wires: "It's touching wires",
  blocking_path: "It's blocking a path or road",
  other: "Something else",
};

export const WHATS_NEARBY = [
  "sidewalk",
  "driveway",
  "road",
  "house_or_building",
  "power_line",
  "playground_or_school",
  "parked_cars",
  "nothing",
] as const;
export type WhatsNearby = (typeof WHATS_NEARBY)[number];

export const WHATS_NEARBY_LABELS: Record<WhatsNearby, string> = {
  sidewalk: "Sidewalk",
  driveway: "Driveway",
  road: "Road",
  house_or_building: "House or building",
  power_line: "Power line",
  playground_or_school: "Playground or school",
  parked_cars: "Parked cars",
  nothing: "Nothing nearby",
};

export const WHEN_NOTICED = [
  "today",
  "this_week",
  "after_recent_storm",
  "been_a_while",
  "unsure",
] as const;
export type WhenNoticed = (typeof WHEN_NOTICED)[number];

export const WHEN_NOTICED_LABELS: Record<WhenNoticed, string> = {
  today: "Today",
  this_week: "This week",
  after_recent_storm: "After the recent storm",
  been_a_while: "It's been a while",
  unsure: "Not sure",
};

/* ------------------------------------------------------------------ *
 * Priority — wrapper vocabulary in, canonical vocabulary out
 * ------------------------------------------------------------------ */

export const PRIORITIES = [
  "critical",
  "high",
  "moderate",
  "low",
  "more_evidence_needed",
  "unscored",
] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  critical: "Critical",
  high: "High",
  moderate: "Moderate",
  low: "Low",
  more_evidence_needed: "More evidence needed",
  unscored: "Unscored",
};

export const PRIORITY_MEANING: Record<Priority, string> = {
  critical: "Possible immediate threat. Urgent manual review — not an emergency dispatch.",
  high: "Serious visible indicators or exposure. May need prompt inspection.",
  moderate: "Concern without clear evidence of immediate danger.",
  low: "Routine maintenance or limited visible risk evidence.",
  more_evidence_needed: "Evidence is insufficient for a reliable recommendation.",
  unscored: "Scoring has not completed. Review manually before anything else.",
};

/** Queue band order. Unscored sorts first — a scoring failure must raise visibility. */
export const PRIORITY_RANK: Record<Priority, number> = {
  unscored: 0,
  critical: 1,
  high: 2,
  more_evidence_needed: 3,
  moderate: 4,
  low: 5,
};

/**
 * Adapter at the boundary. The wrapper says `extreme`; every screen in this
 * application says `critical`. Nothing downstream sees the legacy word.
 */
export function adaptPriority(input: string | null | undefined): Priority {
  if (!input) return "unscored";
  const v = input.trim().toLowerCase();
  if (v === "extreme") return "critical";
  return (PRIORITIES as readonly string[]).includes(v) ? (v as Priority) : "unscored";
}

/* ------------------------------------------------------------------ *
 * Status — owned entirely by this application
 * ------------------------------------------------------------------ */

export const STATUSES = [
  "draft",
  "submitted",
  "evidence_review",
  "more_evidence_needed",
  "forestry_review",
  "inspection_scheduled",
  "inspection_completed",
  "work_required",
  "work_completed",
  "closed",
] as const;
export type Status = (typeof STATUSES)[number];

/** What the resident is shown. */
export const STATUS_CITIZEN_LABELS: Record<Status, string> = {
  draft: "Draft",
  submitted: "Report received",
  evidence_review: "Checking evidence",
  more_evidence_needed: "More information needed",
  forestry_review: "Forestry review",
  inspection_scheduled: "Inspection scheduled",
  inspection_completed: "Inspection completed",
  work_required: "Work required",
  work_completed: "Work completed",
  closed: "Closed",
};

/** What it means to forestry staff. */
export const STATUS_STAFF_LABELS: Record<Status, string> = {
  draft: "Not yet submitted",
  submitted: "Awaiting checks",
  evidence_review: "Validation or scoring in progress",
  more_evidence_needed: "Paused for evidence or staff follow-up",
  forestry_review: "Human decision required",
  inspection_scheduled: "Assigned and planned",
  inspection_completed: "Field findings recorded",
  work_required: "Treatment, pruning, monitoring or removal planned",
  work_completed: "Closure review pending",
  closed: "Public reason and audit event recorded",
};

/** Legal transitions. Anything not listed is refused and audited. */
export const ALLOWED_TRANSITIONS: Record<Status, Status[]> = {
  draft: ["submitted"],
  submitted: ["evidence_review", "more_evidence_needed", "forestry_review"],
  evidence_review: ["forestry_review", "more_evidence_needed"],
  more_evidence_needed: ["evidence_review", "forestry_review", "closed"],
  forestry_review: [
    "inspection_scheduled",
    "more_evidence_needed",
    "work_required",
    "closed",
  ],
  inspection_scheduled: ["inspection_completed", "forestry_review"],
  inspection_completed: ["work_required", "work_completed", "closed"],
  work_required: ["work_completed", "closed"],
  work_completed: ["closed"],
  closed: [],
};

export function canTransition(from: Status, to: Status): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export const LIMITATIONS_TEXT =
  "Preliminary evidence triage only. This is not a prediction of tree failure and does not certify that a tree is safe or dangerous. A qualified forestry inspection remains the deciding assessment.";
