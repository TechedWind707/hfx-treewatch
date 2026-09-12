"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  FRAME_TYPES,
  FrameType,
  WHATS_NEARBY,
  WHATS_WRONG,
  WHEN_NOTICED,
  WhatsNearby,
  WhatsWrong,
  WhenNoticed,
} from "@/lib/domain/types";

export type SubmissionInput = {
  lat: number;
  lng: number;
  accuracyM?: number | null;
  addressText?: string | null;
  description: string;
  whatsWrong: WhatsWrong[];
  whatsNearby: WhatsNearby[];
  whenNoticed: WhenNoticed;
  reporterName?: string | null;
  reporterContact?: string | null;
  photos: { frameType: FrameType; dataUrl: string }[];
};

export type SubmitResult =
  | { ok: true; reference: string }
  | { ok: false; errors: Record<string, string> };

/**
 * The blocking contract. Exactly seven things stop a submission; everything
 * else is a warning or a fallback. A valid report must never be lost because
 * something optional failed.
 */
function validate(input: SubmissionInput): Record<string, string> {
  const e: Record<string, string> = {};

  if (input.photos.length < 3 || input.photos.length > 5) {
    e.photos = "Add between three and five photographs.";
  }
  if (!input.photos.some((p) => p.frameType === "full_tree")) {
    e.full_tree = "One photo must show the whole tree, ground to top.";
  }
  if (
    !Number.isFinite(input.lat) ||
    !Number.isFinite(input.lng) ||
    (input.lat === 0 && input.lng === 0)
  ) {
    e.location = "Confirm the tree's location on the map.";
  }
  const len = input.description.trim().length;
  if (len < 10 || len > 1000) {
    e.description = "Describe what you see in 10 to 1,000 characters.";
  }
  if (!input.whatsWrong.length) e.whatsWrong = "Choose at least one thing that looks wrong.";
  if (!input.whatsNearby.length) e.whatsNearby = "Choose at least one thing that's nearby.";
  if (!WHEN_NOTICED.includes(input.whenNoticed)) {
    e.whenNoticed = "Choose when you noticed it.";
  }

  // Vocabulary guards — reject anything outside the canonical sets.
  if (input.whatsWrong.some((w) => !WHATS_WRONG.includes(w))) {
    e.whatsWrong = "Unrecognised selection.";
  }
  if (input.whatsNearby.some((w) => !WHATS_NEARBY.includes(w))) {
    e.whatsNearby = "Unrecognised selection.";
  }
  if (input.photos.some((p) => !FRAME_TYPES.includes(p.frameType))) {
    e.photos = "Unrecognised photo category.";
  }

  return e;
}

async function nextReference(): Promise<string> {
  const rows = await prisma.submission.findMany({
    select: { reference: true },
  });
  const highest = rows.reduce((max, r) => {
    const n = Number(/TW-(\d+)/.exec(r.reference)?.[1] ?? 0);
    return n > max ? n : max;
  }, 1000);
  return `TW-${highest + 1}`;
}

/**
 * Persist first, then score. The ticket exists and has a number before the
 * scoring service is contacted at all — so a scoring failure can never make a
 * report disappear, it only makes it more visible.
 */
export async function createSubmission(
  input: SubmissionInput,
): Promise<SubmitResult> {
  const errors = validate(input);
  if (Object.keys(errors).length) return { ok: false, errors };

  const reference = await nextReference();

  const created = await prisma.submission.create({
    data: {
      reference,
      lat: input.lat,
      lng: input.lng,
      accuracyM: input.accuracyM ?? null,
      addressText: input.addressText ?? null,
      description: input.description.trim(),
      whatsWrong: JSON.stringify(input.whatsWrong),
      whatsNearby: JSON.stringify(input.whatsNearby),
      whenNoticed: input.whenNoticed,
      reporterName: input.reporterName ?? null,
      reporterContact: input.reporterContact ?? null,
      status: "forestry_review",
      photos: {
        create: input.photos.map((p, i) => ({
          frameType: p.frameType,
          orderIndex: i,
          url: p.dataUrl,
        })),
      },
      events: {
        create: [
          {
            actor: "resident",
            action: "submitted",
            newValue: "submitted",
            isPublic: true,
            publicText: "Report received.",
          },
        ],
      },
    },
  });

  // Fire and forget. The resident never waits on the vision call.
  void requestScoring(created.id, reference, input);

  revalidatePath("/admin");
  return { ok: true, reference };
}

/**
 * Hands the case to the scoring wrapper. Nothing personal crosses this
 * boundary: no name, no contact, no civic address.
 *
 * Until SCORING_SERVICE_URL is set the case simply stays unscored, which is
 * the same path a real failure takes.
 */
async function requestScoring(
  id: string,
  reference: string,
  input: SubmissionInput,
) {
  const base = process.env.SCORING_SERVICE_URL;
  if (!base) return;

  const payload = {
    submission_id: id,
    ticket_ref: reference,
    submitted_at: new Date().toISOString(),
    description: input.description.trim(),
    whats_wrong: input.whatsWrong,
    whats_nearby: input.whatsNearby,
    when_noticed: input.whenNoticed,
    location: { lat: input.lat, lng: input.lng, accuracy_m: input.accuracyM ?? null },
    photos: input.photos.map((p, i) => ({ photo_index: i, frame_type: p.frameType })),
  };

  try {
    await fetch(`${base.replace(/\/$/, "")}/score`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SCORING_API_KEY
          ? { Authorization: `Bearer ${process.env.SCORING_API_KEY}` }
          : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    await prisma.submission.update({
      where: { id },
      data: {
        scoringError:
          err instanceof Error
            ? `Scoring request failed: ${err.message}`
            : "Scoring request failed.",
      },
    });
  }
}
