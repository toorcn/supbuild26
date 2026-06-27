# Cleaner Dashboard UI Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Refactor the MVP into a cleaner dashboard-style experience with clearer separation between briefing, live meeting companion, client memory, and post-meeting review features.

**Architecture:** Keep the existing Next.js App Router and demo data model. Introduce reusable dashboard/feature presentation primitives, then reorganize the dashboard and key feature pages so each workflow has its own visual lane, purpose, and CTA without changing backend APIs.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, lucide-react.

---

## Current context / assumptions

- The app currently works and builds.
- Existing pages already cover the feature loop: dashboard, briefing, meeting companion, review, client graph.
- The requested change is UI/UX organization, not new backend behavior.
- Keep seeded demo data and Neo4j/OpenAI routes untouched unless UI copy needs to reference them.
- Avoid new dependencies to keep the hackathon app stable.

## Proposed approach

1. Add lightweight reusable UI primitives for dashboard feature cards and section headers in `components/ui.tsx`.
2. Rework `app/page.tsx` into a dashboard-style control center:
   - Hero / next meeting summary.
   - Four separated feature cards: Voice Briefing, Live Companion, Client Memory, Post-Meeting Review.
   - Workflow status strip.
   - Keep client context/timeline/graph below as supporting evidence.
3. Add clearer sectioning to feature pages so judges can understand each capability quickly:
   - Briefing page: separate voice controls, grounding context, and readiness.
   - Meeting page: separate capture/suggestions/memory capture.
   - Review page: already separated; keep copy consistent.
4. Tune global styling for a cleaner dashboard feel: more whitespace, clearer cards, stronger nav hierarchy, and consistent background gradients.
5. Validate with lint/build and a browser screenshot.

## Files likely to change

- Modify: `components/ui.tsx`
- Modify: `app/page.tsx`
- Modify: `app/briefing/[meetingId]/page.tsx`
- Modify: `app/meeting/[meetingId]/page.tsx`
- Modify: `app/post-meeting/[meetingId]/page.tsx`
- Modify: `app/globals.css`
- Create: `.hermes/plans/2026-06-20_104656-clean-dashboard-ui.md`

## Step-by-step plan

### Task 1: Add reusable dashboard primitives

**Objective:** Create small composable components for dashboard feature cards and metric tiles.

**Files:**
- Modify: `components/ui.tsx`

**Steps:**
1. Inspect existing exports in `components/ui.tsx`.
2. Add a `FeatureCard` component that accepts eyebrow, title, description, href, cta, icon, tone, and optional children.
3. Add a `MetricCard` or reuse `IconPill` if it already fits.
4. Keep API simple and avoid changing existing component call sites.
5. Run `npm run lint` after implementation.

### Task 2: Rebuild dashboard page as feature-separated control center

**Objective:** Make `/` feel like a dashboard with clearly separated product capabilities.

**Files:**
- Modify: `app/page.tsx`

**Steps:**
1. Preserve current `getClientContextWithMemoryLayer(client.id)` flow.
2. Replace the dense top layout with:
   - next meeting hero,
   - right-side meeting card,
   - four feature cards for Briefing, Companion, Client Memory, Review.
3. Make CTAs point to current routes:
   - `/briefing/${meeting.id}`
   - `/meeting/${meeting.id}`
   - `/client/${client.id}`
   - `/post-meeting/${meeting.id}`
4. Keep `ClientContextPanel`, `Timeline`, and `RelationshipGraph` below with a label like “Memory evidence”.
5. Run lint/build.

### Task 3: Clean feature page headings and grouping

**Objective:** Improve separation and scanability on individual feature pages.

**Files:**
- Modify: `app/briefing/[meetingId]/page.tsx`
- Modify: `app/meeting/[meetingId]/page.tsx`
- Modify: `app/post-meeting/[meetingId]/page.tsx`

**Steps:**
1. Add concise “what this feature proves” copy to each page.
2. Ensure each page has a clear primary CTA to the next workflow step.
3. Keep existing components and data flow intact.
4. Avoid large layout rewrites inside `VoiceBriefing`, `MeetingCompanion`, or `ReviewBoard` unless necessary.

### Task 4: Polish visual system

**Objective:** Make dashboard feel cleaner and more modern without changing brand identity.

**Files:**
- Modify: `app/globals.css`
- Modify: `components/ui.tsx` if needed

**Steps:**
1. Improve body background and card shadows subtly.
2. Ensure sections have consistent spacing.
3. Keep colors compatible with current design tokens.
4. Verify mobile layout remains usable through responsive Tailwind grids.

### Task 5: Validate and open PR

**Objective:** Prove the change works and raise a GitHub PR.

**Commands:**
```bash
npm install
npm run lint
npm run build
```

**Expected:**
- lint passes
- Next.js production build passes
- browser dashboard screenshot shows separated feature cards

**PR:**
- Branch: `feat/clean-dashboard-ui`
- Title: `feat: separate advisor dashboard features`
- Body summary:
  - Cleaner feature-separated dashboard
  - Reusable feature card UI
  - Improved workflow page copy/structure
  - Validation results

## Risks / tradeoffs

- Too much UI polish could distract from demo functionality; keep changes scoped to organization and clarity.
- Avoid adding packages to prevent lockfile churn and audit noise.
- OpenAI/Neo4j functionality may not be configured locally; validation should rely on fallback demo mode plus build/lint.

## Acceptance criteria

- Dashboard clearly separates the product into feature areas.
- Existing routes still build and render.
- No new dependencies.
- `npm run lint` passes.
- `npm run build` passes.
- PR is opened against `main`.
