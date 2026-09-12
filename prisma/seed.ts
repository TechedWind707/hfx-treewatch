/**
 * Demo fixture set. Six scripted cases, one per thing the demo has to prove.
 *
 * The `model` block on each case is the scoring wrapper's ModelOutput, stored
 * verbatim the way the wrapper would write it. Nothing here is computed by
 * this application — swapping in the wrapper's real fixtures/detections/*.json
 * is a copy-paste into these objects.
 *
 * Photo URLs point at local placeholders until object storage is wired up.
 *
 *   npm run db:reset
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Detection = {
  present: boolean;
  conf: number;
  angle_deg?: number | null;
};

type ModelOutput = {
  model_version: string;
  priority: string; // low | moderate | high | extreme
  priority_score: number;
  confidence: number;
  low_confidence: boolean;
  detected: Record<string, Detection>;
  estimated: {
    height_m?: number | null;
    canopy_spread_m?: number | null;
    trunk_diameter_cm?: number | null;
  };
  evidence: string[];
  conflicts: string[];
};

type Seed = {
  reference: string;
  daysAgo: number;
  lat: number;
  lng: number;
  addressText: string;
  description: string;
  whats_wrong: string[];
  whats_nearby: string[];
  when_noticed: string;
  reporterName?: string;
  frames: string[];
  status: string;
  model: ModelOutput | null;
  scoringError?: string;
  staff?: {
    priorityFinal?: string;
    overrideReason?: string;
    overriddenBy?: string;
    assignedCrew?: string;
    inspectionFindings?: string;
    workNotes?: string;
    publicSummary?: string;
    closedBy?: string;
  };
  events?: {
    actor: string;
    action: string;
    note?: string;
    priorValue?: string;
    newValue?: string;
    isPublic?: boolean;
    publicText?: string;
    daysAgo: number;
  }[];
};

const absent = (conf: number): Detection => ({ present: false, conf });

const CASES: Seed[] = [
  /* ---------------------------------------------------------------- *
   * TW-1042 — the primary demo case. Genuinely ambiguous: a real lean
   * and a real hanging limb, but the resident's wires claim is not
   * supported. High priority, medium confidence.
   * ---------------------------------------------------------------- */
  {
    reference: "TW-1042",
    daysAgo: 0,
    lat: 44.6454,
    lng: -63.5923,
    addressText: "Quinpool Rd near Oxford St, Halifax",
    description:
      "Big maple on the boulevard is leaning toward the sidewalk and there's a broken branch caught up in it. Kids walk past here to school. I think it's touching the wires too but it's hard to tell from the ground.",
    whats_wrong: ["leaning", "branch_hanging", "touching_wires"],
    whats_nearby: ["sidewalk", "road", "playground_or_school"],
    when_noticed: "after_recent_storm",
    reporterName: "M. Doucette",
    frames: ["full_tree", "base_roots", "the_problem", "surroundings"],
    status: "forestry_review",
    model: {
      model_version: "wrapper-0.1+vision-api",
      priority: "high",
      priority_score: 58,
      confidence: 0.62,
      low_confidence: false,
      detected: {
        leaning: { present: true, conf: 0.81, angle_deg: 18 },
        hanging_limb: { present: true, conf: 0.74 },
        dead_crown: absent(0.9),
        trunk_cavity: absent(0.66),
        trunk_crack: absent(0.71),
        roots_lifted: absent(0.83),
        wires_visible: absent(0.88),
        blocking_path: { present: true, conf: 0.69 },
        photo_usable: { present: true, conf: 0.95 },
      },
      estimated: { height_m: 12.5, canopy_spread_m: 8.0, trunk_diameter_cm: 45 },
      evidence: [
        "Trunk lean 18 degrees from vertical, photo 1",
        "Limb detached and lodged in canopy, photo 3",
        "Canopy overhangs the sidewalk, photo 4",
      ],
      conflicts: [
        "Resident reported touching wires; no wires detected in any frame",
      ],
    },
    events: [
      {
        actor: "system",
        action: "submitted",
        daysAgo: 0,
        isPublic: true,
        publicText: "Report received.",
      },
      {
        actor: "system",
        action: "scored",
        daysAgo: 0,
        newValue: "high",
        isPublic: true,
        publicText: "Evidence checked and passed to forestry review.",
      },
    ],
  },

  /* ---------------------------------------------------------------- *
   * TW-1037 — priority is not certainty. Extreme band, low confidence,
   * because two of four frames were unreadable.
   * ---------------------------------------------------------------- */
  {
    reference: "TW-1037",
    daysAgo: 1,
    lat: 44.6698,
    lng: -63.6103,
    addressText: "Connaught Ave at Almon St, Halifax",
    description:
      "The whole tree shifted in the storm. There's a gap in the soil on one side and it's over the power line to the house. Took these at dusk, sorry about the quality.",
    whats_wrong: ["leaning", "roots_lifting", "touching_wires"],
    whats_nearby: ["power_line", "house_or_building", "driveway"],
    when_noticed: "after_recent_storm",
    reporterName: "J. Fraser",
    frames: ["full_tree", "base_roots", "the_problem", "surroundings"],
    status: "forestry_review",
    model: {
      model_version: "wrapper-0.1+vision-api",
      priority: "extreme",
      priority_score: 84,
      confidence: 0.41,
      low_confidence: true,
      detected: {
        leaning: { present: true, conf: 0.58, angle_deg: 22 },
        hanging_limb: absent(0.31),
        dead_crown: absent(0.22),
        trunk_cavity: absent(0.19),
        trunk_crack: absent(0.27),
        roots_lifted: { present: true, conf: 0.52 },
        wires_visible: { present: true, conf: 0.61 },
        blocking_path: absent(0.14),
        photo_usable: { present: true, conf: 0.44 },
      },
      estimated: { height_m: null, canopy_spread_m: null, trunk_diameter_cm: null },
      evidence: [
        "Trunk lean approximately 22 degrees, photo 1",
        "Ground disturbance at the root plate, photo 2",
        "Conductor runs through the upper canopy, photo 3",
      ],
      conflicts: [
        "Two frames were too dark to assess; findings rest on photos 1 and 3 only",
      ],
    },
    events: [
      { actor: "system", action: "submitted", daysAgo: 1, isPublic: true, publicText: "Report received." },
      {
        actor: "system",
        action: "scored",
        daysAgo: 1,
        newValue: "extreme",
        isPublic: true,
        publicText: "Evidence checked and passed to forestry review.",
      },
    ],
  },

  /* ---------------------------------------------------------------- *
   * TW-1028 — the override case. Model said moderate, staff dropped it
   * to low with a reason. The original is retained.
   * ---------------------------------------------------------------- */
  {
    reference: "TW-1028",
    daysAgo: 6,
    lat: 44.6512,
    lng: -63.5832,
    addressText: "Spring Garden Rd at Summer St, Halifax",
    description:
      "Neighbour says this tree is dangerous and about to come down. Looks completely healthy to me, full leaves, no lean. Submitting so someone can settle it.",
    whats_wrong: ["other"],
    whats_nearby: ["sidewalk", "parked_cars"],
    when_noticed: "been_a_while",
    frames: ["full_tree", "base_roots", "the_problem"],
    status: "forestry_review",
    model: {
      model_version: "wrapper-0.1+vision-api",
      priority: "moderate",
      priority_score: 36,
      confidence: 0.88,
      low_confidence: false,
      detected: {
        leaning: absent(0.09),
        hanging_limb: absent(0.06),
        dead_crown: { present: true, conf: 0.54 },
        trunk_cavity: absent(0.12),
        trunk_crack: absent(0.08),
        roots_lifted: absent(0.07),
        wires_visible: absent(0.04),
        blocking_path: absent(0.11),
        photo_usable: { present: true, conf: 0.97 },
      },
      estimated: { height_m: 9.0, canopy_spread_m: 7.5, trunk_diameter_cm: 38 },
      evidence: ["Partial bare crown in the upper third, photo 1"],
      conflicts: [],
    },
    staff: {
      priorityFinal: "low",
      overrideReason:
        "Bare crown is seasonal dieback on a species that flushes late. Inspected this block six weeks ago, condition rated good. Routine monitoring is sufficient.",
      overriddenBy: "K. Pictou (Forestry)",
    },
    events: [
      { actor: "system", action: "submitted", daysAgo: 6, isPublic: true, publicText: "Report received." },
      { actor: "system", action: "scored", daysAgo: 6, newValue: "moderate" },
      {
        actor: "K. Pictou (Forestry)",
        action: "priority_override",
        priorValue: "moderate",
        newValue: "low",
        note: "Seasonal dieback, recent inspection on file.",
        daysAgo: 5,
        isPublic: true,
        publicText: "Reviewed by forestry staff and scheduled for routine monitoring.",
      },
    ],
  },

  /* ---------------------------------------------------------------- *
   * TW-1024 — evidence is insufficient. A specific, safe re-shoot
   * request rather than a generic rejection.
   * ---------------------------------------------------------------- */
  {
    reference: "TW-1024",
    daysAgo: 9,
    lat: 44.6602,
    lng: -63.5771,
    addressText: "Robie St at Cunard St, Halifax",
    description:
      "Something looks off about this tree but I honestly can't tell what. It's right by the bus stop. Didn't want to get too close.",
    whats_wrong: ["other"],
    whats_nearby: ["sidewalk", "road"],
    when_noticed: "unsure",
    frames: ["full_tree", "the_problem", "surroundings"],
    status: "more_evidence_needed",
    model: {
      model_version: "wrapper-0.1+vision-api",
      priority: "low",
      priority_score: 14,
      confidence: 0.23,
      low_confidence: true,
      detected: {
        leaning: absent(0.18),
        hanging_limb: absent(0.21),
        dead_crown: absent(0.16),
        trunk_cavity: absent(0.13),
        trunk_crack: absent(0.15),
        roots_lifted: absent(0.11),
        wires_visible: absent(0.09),
        blocking_path: absent(0.12),
        photo_usable: { present: false, conf: 0.19 },
      },
      estimated: { height_m: null, canopy_spread_m: null, trunk_diameter_cm: null },
      evidence: [],
      conflicts: [
        "No frame is clear enough to make observations; all three are backlit",
      ],
    },
    events: [
      { actor: "system", action: "submitted", daysAgo: 9, isPublic: true, publicText: "Report received." },
      {
        actor: "system",
        action: "evidence_requested",
        daysAgo: 9,
        isPublic: true,
        publicText:
          "We need one more photo. From the same safe spot on the sidewalk, please take one with the sun behind you so the trunk isn't in shadow.",
      },
    ],
  },

  /* ---------------------------------------------------------------- *
   * TW-1019 — fail-soft. The wrapper never answered. The report did not
   * disappear; it sits at the top of the queue for a human.
   * ---------------------------------------------------------------- */
  {
    reference: "TW-1019",
    daysAgo: 2,
    lat: 44.6389,
    lng: -63.5714,
    addressText: "Alderney Dr near the ferry terminal, Dartmouth",
    description:
      "Cavity in the trunk you can put your arm into, about chest height. It's right beside the walkway to the ferry, lots of people go past.",
    whats_wrong: ["trunk_damage"],
    whats_nearby: ["sidewalk", "house_or_building"],
    when_noticed: "this_week",
    reporterName: "R. Comeau",
    frames: ["full_tree", "base_roots", "the_problem"],
    status: "forestry_review",
    model: null,
    scoringError: "PerceptionError: upstream vision call timed out after 30s",
    events: [
      { actor: "system", action: "submitted", daysAgo: 2, isPublic: true, publicText: "Report received." },
      {
        actor: "system",
        action: "scoring_failed",
        note: "PerceptionError: upstream vision call timed out after 30s. Case raised to the top of the queue for manual review.",
        daysAgo: 2,
        isPublic: true,
        publicText: "Your report is with forestry staff for review.",
      },
    ],
  },

  /* ---------------------------------------------------------------- *
   * TW-1008 — the full lifecycle, already complete.
   * ---------------------------------------------------------------- */
  {
    reference: "TW-1008",
    daysAgo: 21,
    lat: 44.6741,
    lng: -63.6018,
    addressText: "Bayers Rd at Connaught Ave, Halifax",
    description:
      "Dead limb hanging up in the canopy, maybe four metres up, right over where we park.",
    whats_wrong: ["branch_hanging", "dead_or_bare"],
    whats_nearby: ["parked_cars", "driveway"],
    when_noticed: "this_week",
    frames: ["full_tree", "base_roots", "the_problem", "surroundings"],
    status: "closed",
    model: {
      model_version: "wrapper-0.1+vision-api",
      priority: "high",
      priority_score: 61,
      confidence: 0.79,
      low_confidence: false,
      detected: {
        leaning: absent(0.11),
        hanging_limb: { present: true, conf: 0.86 },
        dead_crown: { present: true, conf: 0.72 },
        trunk_cavity: absent(0.14),
        trunk_crack: absent(0.1),
        roots_lifted: absent(0.08),
        wires_visible: absent(0.06),
        blocking_path: absent(0.19),
        photo_usable: { present: true, conf: 0.93 },
      },
      estimated: { height_m: 14.0, canopy_spread_m: 9.5, trunk_diameter_cm: 52 },
      evidence: [
        "Detached limb lodged in the canopy above the parking area, photo 3",
        "Dead wood through the upper third of the crown, photo 1",
      ],
      conflicts: [],
    },
    staff: {
      assignedCrew: "Crew 4 — West End",
      inspectionFindings:
        "Confirmed hanging limb approximately 4 m, dead wood through the upper crown. No structural defect in the trunk. Removal of the limb and a crown clean recommended.",
      workNotes: "Limb removed, crown cleaned. No further work required.",
      publicSummary:
        "A forestry crew removed the hanging limb and cleared dead wood from the crown. No further work is needed at this location.",
      closedBy: "A. Bernard (Forestry)",
    },
    events: [
      { actor: "system", action: "submitted", daysAgo: 21, isPublic: true, publicText: "Report received." },
      { actor: "system", action: "scored", daysAgo: 21, newValue: "high" },
      {
        actor: "A. Bernard (Forestry)",
        action: "assigned",
        newValue: "Crew 4 — West End",
        daysAgo: 19,
        isPublic: true,
        publicText: "An inspection has been scheduled.",
      },
      {
        actor: "Crew 4 — West End",
        action: "inspection_completed",
        daysAgo: 12,
        isPublic: true,
        publicText: "Inspection completed. Work is required.",
      },
      {
        actor: "Crew 4 — West End",
        action: "work_completed",
        daysAgo: 5,
        isPublic: true,
        publicText: "Work completed.",
      },
      {
        actor: "A. Bernard (Forestry)",
        action: "closed",
        daysAgo: 4,
        isPublic: true,
        publicText:
          "A forestry crew removed the hanging limb and cleared dead wood from the crown. No further work is needed at this location.",
      },
    ],
  },
];

const ago = (days: number) => new Date(Date.now() - days * 86_400_000);

async function main() {
  await prisma.auditEvent.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.submission.deleteMany();

  for (const c of CASES) {
    const submittedAt = ago(c.daysAgo);

    await prisma.submission.create({
      data: {
        reference: c.reference,
        createdAt: submittedAt,
        submittedAt,
        lat: c.lat,
        lng: c.lng,
        accuracyM: 12,
        addressText: c.addressText,
        description: c.description,
        whatsWrong: JSON.stringify(c.whats_wrong),
        whatsNearby: JSON.stringify(c.whats_nearby),
        whenNoticed: c.when_noticed,
        reporterName: c.reporterName ?? null,

        // wrapper-owned columns, written here only to stand the demo up
        priorityModel: c.model?.priority ?? null,
        priorityScoreModel: c.model?.priority_score ?? null,
        confidence: c.model?.confidence ?? null,
        lowConfidence: c.model?.low_confidence ?? false,
        detected: c.model ? JSON.stringify(c.model.detected) : null,
        estimated: c.model ? JSON.stringify(c.model.estimated) : null,
        evidence: c.model ? JSON.stringify(c.model.evidence) : null,
        conflicts: c.model ? JSON.stringify(c.model.conflicts) : null,
        modelVersion: c.model?.model_version ?? null,
        scoredAt: c.model ? submittedAt : null,
        scoringError: c.scoringError ?? null,

        status: c.status,
        priorityFinal: c.staff?.priorityFinal ?? null,
        overrideReason: c.staff?.overrideReason ?? null,
        overriddenBy: c.staff?.overriddenBy ?? null,
        overriddenAt: c.staff?.priorityFinal ? ago(Math.max(0, c.daysAgo - 1)) : null,
        assignedCrew: c.staff?.assignedCrew ?? null,
        inspectionFindings: c.staff?.inspectionFindings ?? null,
        workNotes: c.staff?.workNotes ?? null,
        publicSummary: c.staff?.publicSummary ?? null,
        closedAt: c.status === "closed" ? ago(4) : null,
        closedBy: c.staff?.closedBy ?? null,

        photos: {
          create: c.frames.map((frameType, i) => ({
            frameType,
            orderIndex: i,
            // Swapped for the object-storage URL once the wrapper is wired up.
            url: `/api/photo-placeholder?ref=${c.reference}&n=${i + 1}&frame=${frameType}`,
          })),
        },

        events: {
          create: (c.events ?? []).map((e) => ({
            createdAt: ago(e.daysAgo),
            actor: e.actor,
            action: e.action,
            priorValue: e.priorValue ?? null,
            newValue: e.newValue ?? null,
            note: e.note ?? null,
            isPublic: e.isPublic ?? false,
            publicText: e.publicText ?? null,
          })),
        },
      },
    });
  }

  console.log(`Seeded ${CASES.length} cases: ${CASES.map((c) => c.reference).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
