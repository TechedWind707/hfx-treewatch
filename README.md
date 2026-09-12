# HFX TreeWatch

**290 tree requests are waiting for a truck — this is the tool that tells Urban Forestry which ones can't wait.**

Halifax Urban Forestry receives ~2,000 tree requests every six months and has no way to
tell a genuine hazard from a routine complaint without sending a truck to look. Every
ticket gets the same site-visit treatment regardless of urgency.

TreeWatch scores hazard severity **at intake**, before anyone drives anywhere, by combining
three things the city already has: the resident's photo, their description, and the history
on file for that address (prior tickets, storm-damage zone, species risk). It returns a
severity score, a one-sentence reasoning line citing the specific evidence, and an explicit
**low-confidence flag** when the signals conflict.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Data | SQLite via Prisma |
| Scoring | Claude (vision + tool-use for structured output) |

## Getting started

```bash
npm install

cp .env.example .env.local     # add your ANTHROPIC_API_KEY
cp .env.example .env           # Prisma CLI reads .env

npm run db:push                # create dev.db from prisma/schema.prisma
npm run db:seed                # load 14 demo tickets with site history

npm run dev                    # http://localhost:3000
```

## Layout

```
prisma/
  schema.prisma    Ticket, SiteHistory, TicketStatus
  seed.ts          14 demo tickets with pre-seeded fake history
src/
  app/             citizen form (/), admin queue (/admin), API routes
  lib/
    claude.ts      scoring prompt + tool schema; scoreTicket()
    prisma.ts      singleton client
    types.ts       zod schemas, severity labels
```

## Severity scale

| | |
|---|---|
| 5 | Imminent hazard — failure likely within days, target in the fall path |
| 4 | High — clear defect or storm damage over a target, visit this week |
| 3 | Moderate — real defect, no obvious target or imminent failure |
| 2 | Low — minor damage or deadwood, batch with routine work |
| 1 | Routine — aesthetic or nuisance, no safety component |

A dispatcher can override any score; the override and the original both stay on the ticket.

## Why the low-confidence flag matters

A generic classifier always returns a number. The differentiator here is that TreeWatch
says *"the photo is unusable and the description contradicts the history"* and flags the
ticket for a human instead of guessing. That flag is what makes the queue trustworthy
enough to actually re-rank a truck schedule against.

## Build scope (hackathon, 4.5 h)

- [x] Project scaffold, schema, demo data
- [ ] Citizen submission form (photo + description)
- [ ] `POST /api/score` — live Claude assessment
- [ ] Admin queue re-ranked by severity, reasoning inline
- [ ] Close ticket + override severity
- [ ] Stretch: video upload, live history instead of pre-seeded
