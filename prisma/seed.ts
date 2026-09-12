/**
 * Seeds the demo queue: 14 tree requests with pre-seeded site history,
 * roughly matching the shape of Halifax's real 311 tree backlog.
 *
 * Severity is left NULL on purpose — the demo scores them through Claude so
 * the reasoning lines are live, not canned. Run `npm run seed:score` (once that
 * script exists) to pre-score everything except the ticket you demo live.
 *
 *   npm run db:push && npm run db:seed
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Seed = {
  address: string;
  description: string;
  reporterName?: string;
  daysAgo: number;
  history: { kind: string; summary: string; daysAgo?: number }[];
};

const TICKETS: Seed[] = [
  {
    address: "6259 Quinpool Rd",
    description:
      "Large maple in the boulevard has a split running down the main trunk. It got worse after the wind last week. Kids walk past here to Oxford School.",
    reporterName: "M. Doucette",
    daysAgo: 3,
    history: [
      {
        kind: "prior_ticket",
        summary: "Deadwood removal requested at this address, closed no action.",
        daysAgo: 410,
      },
      {
        kind: "species_risk",
        summary: "Norway maple — included bark at branch unions, elevated failure rate.",
      },
      { kind: "storm_zone", summary: "Inside Fiona high-damage corridor (2022)." },
    ],
  },
  {
    address: "1489 Hollis St",
    description:
      "Tree branches are scraping my window every time it's windy. Very annoying, please trim.",
    daysAgo: 11,
    history: [
      { kind: "inspection", summary: "Routine inspection, no defects noted.", daysAgo: 190 },
    ],
  },
  {
    address: "3021 Connaught Ave",
    description:
      "Whole tree is leaning over the sidewalk since the storm. Roots look lifted on one side, there's a gap in the soil.",
    reporterName: "J. Fraser",
    daysAgo: 1,
    history: [
      { kind: "storm_zone", summary: "Inside Dorian high-damage corridor (2019)." },
      {
        kind: "prior_ticket",
        summary: "Neighbour reported same tree leaning; visit scheduled, not completed.",
        daysAgo: 34,
      },
    ],
  },
  {
    address: "5512 Young St",
    description:
      "Dead limb hanging up in the canopy, maybe 4 metres up, right over where we park.",
    daysAgo: 6,
    history: [
      { kind: "species_risk", summary: "Silver maple — brittle wood, frequent limb drop." },
    ],
  },
  {
    address: "2 Melrose Ave",
    description:
      "Leaves all over my lawn from the city tree. This happens every single year and nobody does anything.",
    daysAgo: 18,
    history: [
      {
        kind: "prior_ticket",
        summary: "Three leaf-litter complaints from this address, all closed no action.",
        daysAgo: 365,
      },
    ],
  },
  {
    address: "6970 Bayers Rd",
    description:
      "Big tree next to the bus stop. Bark is falling off in sheets near the bottom and there are mushrooms growing at the base.",
    reporterName: "A. Bernard",
    daysAgo: 2,
    history: [
      {
        kind: "species_risk",
        summary: "Mature ash — Emerald Ash Borer confirmed within 2 km.",
      },
      { kind: "storm_zone", summary: "Inside Fiona high-damage corridor (2022)." },
    ],
  },
  {
    address: "1180 Tower Rd",
    description:
      "Something looks off about this tree but I honestly can't tell. Photo was taken at dusk, sorry about the quality.",
    daysAgo: 4,
    history: [
      { kind: "inspection", summary: "Inspected 5 months ago, rated fair condition.", daysAgo: 150 },
    ],
  },
  {
    address: "3450 Robie St",
    description:
      "Branch came down on the sidewalk overnight and is still lying there. The rest of the tree looks fine to me.",
    daysAgo: 1,
    history: [],
  },
  {
    address: "15 Titus St",
    description:
      "Tree is touching the power line at the corner. NS Power said to call the city.",
    reporterName: "R. Comeau",
    daysAgo: 5,
    history: [
      {
        kind: "prior_ticket",
        summary: "Line clearance requested at this pole, referred to utility.",
        daysAgo: 700,
      },
    ],
  },
  {
    address: "6405 Chebucto Rd",
    description:
      "Stump left from a removal last year is starting to rot and it's a trip hazard on the walkway.",
    daysAgo: 25,
    history: [
      { kind: "prior_ticket", summary: "Tree removed, stump grinding deferred.", daysAgo: 300 },
    ],
  },
  {
    address: "1 Alderney Dr",
    description:
      "Cavity in the trunk you can put your arm into, about chest height. Tree is right beside the ferry terminal walkway.",
    reporterName: "K. Pictou",
    daysAgo: 2,
    history: [
      { kind: "storm_zone", summary: "Waterfront exposure zone — high wind loading." },
      { kind: "inspection", summary: "Flagged for re-inspection 12 months ago, not completed.", daysAgo: 380 },
    ],
  },
  {
    address: "88 Portland St",
    description:
      "Roots are lifting the sidewalk slab, about a 5 cm lip. Someone's going to trip.",
    daysAgo: 14,
    history: [],
  },
  {
    address: "230 Waverley Rd",
    description:
      "The tree fell already. It's across my back fence, not blocking the road.",
    daysAgo: 3,
    history: [
      { kind: "storm_zone", summary: "Inside Fiona high-damage corridor (2022)." },
    ],
  },
  {
    address: "5991 Spring Garden Rd",
    description:
      "Neighbour says this tree is dangerous and about to come down. Looks completely healthy to me — full leaves, no lean. Submitting so someone can settle it.",
    daysAgo: 7,
    history: [
      {
        kind: "prior_ticket",
        summary: "Two hazard reports from the same complainant, both closed no action.",
        daysAgo: 120,
      },
      { kind: "inspection", summary: "Inspected 6 weeks ago, rated good condition.", daysAgo: 42 },
    ],
  },
];

function daysAgoDate(d: number) {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000);
}

async function main() {
  await prisma.siteHistory.deleteMany();
  await prisma.ticket.deleteMany();

  for (const t of TICKETS) {
    await prisma.ticket.create({
      data: {
        address: t.address,
        description: t.description,
        reporterName: t.reporterName,
        createdAt: daysAgoDate(t.daysAgo),
        siteHistory: {
          create: t.history.map((h) => ({
            kind: h.kind,
            summary: h.summary,
            occurredAt: h.daysAgo ? daysAgoDate(h.daysAgo) : null,
          })),
        },
      },
    });
  }

  console.log(`Seeded ${TICKETS.length} tickets.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
