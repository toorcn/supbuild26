# Extra Neo4j Journeys Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Add 1-2 additional advisor/client user journeys on top of Mr. Tan and seed them into the supplied Neo4j Aura instance.

**Architecture:** Keep Mr. Tan demo data unchanged. Add a reusable `lib/extra-journeys.ts` dataset containing two complete client journeys. Update `scripts/seed-neo4j.ts` to seed those journeys into Neo4j alongside the original Mr. Tan graph. Add a smoke check proving each extra journey has client, upcoming/review meetings, memories, actions, graph nodes, graph edges, and suggested questions.

**Tech Stack:** Next.js/TypeScript repo, `neo4j-driver`, existing seed/check scripts, Neo4j Aura via env vars only.

---

## Safety / secret handling

- Use the supplied Neo4j credentials only as runtime environment variables.
- Do not write credentials into repo files, PR bodies, README, or plan.
- Run a secret scan before committing.
- Recommend rotating the password after the hackathon because it was pasted in chat.

---

## New journeys

### Journey 1: Aisha Rahman — SME owner

- Client: `client-aisha`, Aisha Rahman, SME owner.
- Situation: café chain expansion, business loan guarantee, key-person risk, succession plan.
- Referral: business protection / tax specialist.
- Demo value: shows business-owner advisory workflow and specialist matching.

### Journey 2: Daniel Koh — young professional

- Client: `client-daniel`, Daniel Koh, young professional/new homeowner.
- Situation: first condo, mortgage protection, wedding fund, aging parents.
- Referral: mortgage/protection specialist.
- Demo value: shows millennial/HENRY planning and family obligation workflow.

---

## Implementation tasks

1. Add RED check:
   - Create `scripts/check-extra-journeys.ts`.
   - Add `npm run check:extra-journeys`.
   - Assert `lib/extra-journeys.ts` exists and has at least two journeys.
   - Run once and confirm failure.

2. Add extra journeys data:
   - Create `lib/extra-journeys.ts`.
   - Export `extraJourneys` with `{ advisor, client, meetings, memories, actions, graphNodes, graphEdges, suggestedQuestions, briefing }`.
   - Reuse existing types from `lib/types.ts`.

3. Update Neo4j seed script:
   - Import `extraJourneys`.
   - Delete extra journey IDs before reseeding.
   - Seed advisor/client/meetings/memories/actions/relationship graph for each extra journey.
   - Reuse existing typed-memory seeding for memories.

4. Verify local code:
   - `npm run check:extra-journeys`
   - `npm run lint`
   - `npm run build`
   - `npm run check:mvp`

5. Seed supplied Neo4j Aura:
   - Run `npm run seed:neo4j` with Neo4j env vars supplied at runtime.
   - Run `EXPECT_DATA_MODE=neo4j DATA_MODE=neo4j npm run check:data-source`.
   - Add a direct verification query script/one-liner to count clients/meetings/memories/actions in Aura.

6. Commit and PR:
   - Commit with `feat: seed extra Neo4j journeys`.
   - Push branch and open PR.
   - Report PR URL, checks, and Neo4j seed result.

---

## Acceptance criteria

- Two extra client journeys exist in code.
- Seed script writes them to Neo4j without touching credentials in repo.
- Aura verification confirms `client-aisha` and `client-daniel` exist with meetings, memories, actions, and graph relationships.
- Local checks/build pass.
- PR is open and mergeable; do not merge unless asked.
