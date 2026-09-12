import Anthropic from "@anthropic-ai/sdk";
import { Assessment, AssessmentSchema, SiteContext } from "./types";

export const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

let client: Anthropic | null = null;
function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

const SYSTEM_PROMPT = `You are a triage assistant for Halifax Urban Forestry.

A resident has submitted a tree request through 311: a photo, a written description,
and whatever history the city already holds for that address. Your job is to decide
how urgently a truck needs to go look at it — BEFORE anyone drives anywhere.

Severity scale:
5 — Imminent hazard. Failure appears likely within days; a person, occupied structure,
    road, or power line is in the fall path.
4 — High. Clear structural defect or storm damage over a target; needs a visit this week.
3 — Moderate. Real defect or damage, but no obvious target or no sign of imminent failure.
2 — Low. Minor damage, deadwood, or maintenance that can be batched with routine work.
1 — Routine. Aesthetic or nuisance complaint with no safety component.

Rules:
- Cite specific evidence. Name what you saw in the photo or read in the description
  ("crack at the union above the sidewalk", "third report at this address since Fiona"),
  never a generic restatement of the severity label.
- Weigh the target, not just the tree. A leaning trunk over a driveway is not a leaning
  trunk over a playground.
- Use the site history. Repeat reports, storm-damage zones, and brittle species raise
  severity; a recent clean inspection lowers it.
- When the signals CONFLICT — the photo looks fine but the description is alarming, the
  photo is unusable, the history contradicts what you see — say so. Set confidence to
  "low" and list the conflicts. A flagged uncertain ticket is more useful to a dispatcher
  than a confident wrong number.
- One sentence of reasoning. The dispatcher reads 290 of these.`;

const TOOL = {
  name: "record_assessment",
  description: "Record the hazard assessment for this tree request.",
  input_schema: {
    type: "object" as const,
    properties: {
      severity: {
        type: "integer",
        minimum: 1,
        maximum: 5,
        description: "1 routine .. 5 imminent hazard",
      },
      reasoning: {
        type: "string",
        description:
          "One sentence citing the specific evidence that drove the score.",
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
      },
      conflictingSignals: {
        type: "array",
        items: { type: "string" },
        description:
          "Specific contradictions between photo, description, and history. Empty when none.",
      },
    },
    required: ["severity", "reasoning", "confidence", "conflictingSignals"],
  },
};

function historyBlock(history: SiteContext[]) {
  if (!history.length) return "No prior records for this address.";
  return history
    .map((h) => {
      const when = h.occurredAt
        ? new Date(h.occurredAt).toISOString().slice(0, 10)
        : "undated";
      return `- [${h.kind}] (${when}) ${h.summary}`;
    })
    .join("\n");
}

export type ScoreInput = {
  address: string;
  description: string;
  /** base64 image data (no data: prefix) */
  imageBase64?: string;
  imageMediaType?: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  history: SiteContext[];
};

export async function scoreTicket(input: ScoreInput): Promise<Assessment> {
  const content: Anthropic.ContentBlockParam[] = [];

  if (input.imageBase64) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: input.imageMediaType ?? "image/jpeg",
        data: input.imageBase64,
      },
    });
  } else {
    content.push({
      type: "text",
      text: "(No photo was submitted with this request.)",
    });
  }

  content.push({
    type: "text",
    text: [
      `Address: ${input.address}`,
      ``,
      `Resident description:`,
      input.description,
      ``,
      `Site history on file:`,
      historyBlock(input.history),
    ].join("\n"),
  });

  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "record_assessment" },
    messages: [{ role: "user", content }],
  });

  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") {
    throw new Error("Claude did not return an assessment");
  }

  return AssessmentSchema.parse(block.input);
}
