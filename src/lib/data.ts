import { prisma } from "./prisma";
import {
  Detections,
  Estimated,
  EvidenceItem,
  Priority,
  Status,
  WhatsNearby,
  WhatsWrong,
  WhenNoticed,
  adaptPriority,
} from "./domain/types";
import { Rankable, sortQueue } from "./domain/queue";

/** A submission, with the wrapper's JSON payload columns parsed. */
export type CaseRecord = Rankable & {
  createdAt: Date;
  updatedAt: Date;
  status: Status;
  lat: number;
  lng: number;
  accuracyM: number | null;
  addressText: string | null;
  description: string;
  whatsWrong: WhatsWrong[];
  whatsNearby: WhatsNearby[];
  whenNoticed: WhenNoticed;
  reporterName: string | null;

  // wrapper output
  confidence: number | null;
  lowConfidence: boolean;
  detected: Detections;
  estimated: Estimated;
  evidence: EvidenceItem[];
  conflicts: EvidenceItem[];
  modelVersion: string | null;
  scoredAt: Date | null;
  scoringError: string | null;
  /** Raw wrapper vocabulary, kept for the audit trail. `extreme` stays `extreme`. */
  rawPriorityModel: string | null;

  // staff
  overrideReason: string | null;
  overriddenBy: string | null;
  overriddenAt: Date | null;
  assignedCrew: string | null;
  inspectionFindings: string | null;
  workNotes: string | null;
  publicSummary: string | null;
  closedAt: Date | null;
  closedBy: string | null;

  photos: { id: string; frameType: string; url: string; orderIndex: number }[];
  events: {
    id: string;
    createdAt: Date;
    actor: string;
    action: string;
    priorValue: string | null;
    newValue: string | null;
    note: string | null;
    isPublic: boolean;
    publicText: string | null;
  }[];
};

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type Row = Awaited<ReturnType<typeof loadRows>>[number];

async function loadRows(where?: { reference?: string }) {
  return prisma.submission.findMany({
    where,
    include: {
      photos: { orderBy: { orderIndex: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

function toCase(row: Row): CaseRecord {
  return {
    id: row.id,
    reference: row.reference,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    submittedAt: row.submittedAt,
    status: row.status as Status,

    lat: row.lat,
    lng: row.lng,
    accuracyM: row.accuracyM,
    addressText: row.addressText,
    description: row.description,
    whatsWrong: parseJson<WhatsWrong[]>(row.whatsWrong, []),
    whatsNearby: parseJson<WhatsNearby[]>(row.whatsNearby, []),
    whenNoticed: row.whenNoticed as WhenNoticed,
    reporterName: row.reporterName,

    priorityModel: adaptPriority(row.priorityModel),
    rawPriorityModel: row.priorityModel,
    priorityFinal: row.priorityFinal ? adaptPriority(row.priorityFinal) : null,
    priorityScoreModel: row.priorityScoreModel,
    confidence: row.confidence,
    lowConfidence: row.lowConfidence,
    detected: parseJson<Detections>(row.detected, {}),
    estimated: parseJson<Estimated>(row.estimated, {}),
    evidence: parseJson<EvidenceItem[]>(row.evidence, []),
    conflicts: parseJson<EvidenceItem[]>(row.conflicts, []),
    modelVersion: row.modelVersion,
    scoredAt: row.scoredAt,
    scoringError: row.scoringError,

    overrideReason: row.overrideReason,
    overriddenBy: row.overriddenBy,
    overriddenAt: row.overriddenAt,
    assignedCrew: row.assignedCrew,
    inspectionFindings: row.inspectionFindings,
    workNotes: row.workNotes,
    publicSummary: row.publicSummary,
    closedAt: row.closedAt,
    closedBy: row.closedBy,

    photos: row.photos.map((p) => ({
      id: p.id,
      frameType: p.frameType,
      url: p.url,
      orderIndex: p.orderIndex,
    })),
    events: row.events.map((e) => ({
      id: e.id,
      createdAt: e.createdAt,
      actor: e.actor,
      action: e.action,
      priorValue: e.priorValue,
      newValue: e.newValue,
      note: e.note,
      isPublic: e.isPublic,
      publicText: e.publicText,
    })),
  };
}

/** The dispatcher's queue, in deterministic order. */
export async function getQueue(): Promise<CaseRecord[]> {
  const rows = await loadRows();
  return sortQueue(rows.map(toCase));
}

export async function getCase(reference: string): Promise<CaseRecord | null> {
  const rows = await loadRows({ reference });
  return rows[0] ? toCase(rows[0]) : null;
}

/** Open cases only, for the operations counters. */
export function summarise(cases: CaseRecord[]) {
  const open = cases.filter((c) => c.status !== "closed");
  const count = (p: Priority) =>
    open.filter((c) => (c.priorityFinal ?? c.priorityModel) === p).length;

  return {
    open: open.length,
    unscored: count("unscored"),
    critical: count("critical"),
    high: count("high"),
    lowConfidence: open.filter((c) => c.lowConfidence).length,
    closed: cases.length - open.length,
  };
}
