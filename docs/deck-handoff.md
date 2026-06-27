# Forebrief — Deck Handoff Document

> **Purpose:** A self-contained brief for generating a ~10-page pitch deck (PDF) about **Forebrief**. Everything below is sourced from the project's own documents (`docs/prd-forebrief.md`, `docs/system-architecture.md`, `README.md`, `docs/meeting-demo-script.md`, `docs/priya-investor-dialogue-script.md`). Build the deck from these facts, not from general assumptions. Do not invent features.

---

## 1. How to use this document

- Produce **10 slides** as a PDF, **16:9 landscape** (screen-first; this is a hackathon pitch shown on a projector).
- Read **§2–§6** for context, format, design system, and guardrails.
- Build each slide from **§7 (page-by-page spec)** — each page gives you: title, headline, body content, suggested visual, and a speaker note.
- If you need to verify or extend a fact, use **§8 (fact bank)** and **§9 (source files)**. Never fabricate a number, route, or capability that isn't there.
- The approved elevator pitch appears in **§2** — use it on the cover only. The rest of the deck stands on the project's substance.

---

## 2. Project at a glance

| Field | Value |
| --- | --- |
| **Product name** | Forebrief |
| **Tagline** | "Briefed before you're in the room." |
| **One-line positioning** | A founder relationship operating system — one memory for everyone a founder knows (investors, customers, advisors, candidates), fusing internal graph memory with live external research. |
| **Approved elevator pitch (cover use)** | "The meeting you lose isn't the one you feared — it's the one where something changed and you didn't know. Forebrief listens to you prep and to the meeting, fusing memory with live research so you always know what moved. You talk; it makes sure you're ready." |
| **Hackathon** | SUP hackathon |
| **Track** | AI-Native Organizations — helping businesses transition to agent-driven operations |
| **Judging rubric** | Innovation / sponsor tech **30%** · Proof of work **25%** · Problem fit / market **25%** · Design **20%** |
| **Sponsor tech (load-bearing)** | **OpenAI** Realtime (voice — already integrated) · **Exa** neural web search (live external intelligence — the must-add layer) · **Cursor** (build tool) |
| **Memory backbone** | **Neo4j** graph database |
| **Team** | Sim Hong Bing · Olivia Lim Yun Xuan · MUTHURAMAN PALANIAPPAN · Mohtasham Murshid Madani · Lee Ping Xian |

**What it is (neutral summary for the agent):** Forebrief is a founder relationship OS. One memory brain serves every relationship type. Three agents operate across the meeting lifecycle: a pre-meeting voice briefing, a silent in-meeting companion, and a post-meeting review. Internal graph memory is fused with live web research (Exa) so briefings reflect *what changed since the last conversation*, not just what the founder already knew. The founder approves every contact-facing follow-up — the system never sends outbound messages on its own.

---

## 3. Audience & judging context

- **Audience:** hackathon judges and sponsor reps (OpenAI, Exa, Cursor).
- **What judges must believe after the deck:**
  1. This solves a real founder workflow pain (problem fit).
  2. It's more than a chatbot — persistent relationship memory fused with live research (innovation).
  3. **Neo4j is justified** — founder relationship memory is naturally graph-shaped.
  4. **Exa is justified** — "what changed since last time" is the missing external-intelligence layer that turns static memory into a living briefing.
  5. **OpenAI Realtime is justified** — voice-native briefing + a silent in-room companion.
  6. There is real, working proof (the demo arc), and the founder stays in control.
- **Rubric mapping (so you weight pages correctly):** Problem/market → slides 2–3. Innovation/sponsor tech → slides 5–7, 9. Proof of work → slide 8. Design → the whole deck via §5, plus adaptive display + graph visuals.

---

## 4. Deck spec

- **10 slides**, **16:9 landscape** PDF.
- One big idea per slide. Headline-first, scannable from the back of a room.
- Mix of: 1 cover, 1 problem, 1 solution/positioning, 1 lifecycle, 3 sponsor-tech/architecture (Exa, Neo4j, Realtime), 1 demo (proof), 1 self-improving + control, 1 roadmap/stack/close.
- Every architecture/flow page should include a **clean vector diagram**, not a wall of text (see §5).
- Include a consistent header (project name) and footer (team / hackathon / page number).

---

## 5. Design system

> The Design rubric is 20%. Apply this system to every slide.

### 5.1 Aesthetic direction

**Primary: "Founder command-center" — dark, premium, intelligence/ops feel.**
- Background: deep ink navy / near-black (e.g. `#0B1220`), with slightly elevated panels (`#121A2B`).
- Primary accent (highlights, briefing signals, CTAs): warm amber/gold (`#F5B544`).
- Secondary accent (graph nodes, Exa/research, links): cool electric cyan (`#4ED7E1`) or blue (`#5B8CFF`).
- Text: off-white (`#E6EAF2`) for body; muted slate (`#8A93A6`) for secondary labels.
- Rationale: a finance/founder audience reads dark-premium as credible; the warm accent makes "briefing" signals pop; cyan codes "live research / graph."

**Alternative (if a lighter deck is preferred): clean light editorial.**
- Background: warm white (`#FAFAF7`); ink text (`#111521`); same amber + cyan accents; thin hairline dividers (`#E5E7EB`). Use only if the team prefers print-friendly contrast.

> Pick one system and apply it consistently. Do **not** mix the two.

### 5.2 Typography

- **Headlines:** a confident grotesk (Inter, Geist, or Söhne-like). Large, tight tracking, left-aligned.
- **Body:** same family, regular weight, comfortable line height.
- **Data / labels / numbers / routes / code:** monospace (JetBrains Mono or IBM Plex Mono). Use mono for every metric, mode name (`DATA_MODE`, `RESEARCH_MODE`), route path, and node label — it reinforces the "ops/intelligence" feel and keeps technical strings legible.

### 5.3 Layout

- Generous margins; a 12-column subtle grid.
- Headline top-left; one supporting visual occupies the right or full bleed.
- Max **5 short bullets** per slide; prefer a diagram + 3 bullets over 6 bullets.
- Consistent slide chrome: top-left "Forebrief" wordmark; bottom-right page number `NN / 10`; bottom-left team line.

### 5.4 Visual motifs (use across the deck for cohesion)

- **Graph-node / network lines** — ties to Neo4j and "relationships." Use as a subtle background texture and in the graph diagram.
- **Waveform / voice pulse** — ties to OpenAI Realtime. Use on briefing and companion slides.
- **Delta marker (⊕ or a small pulse)** — codes the Exa "what changed" layer wherever research fusion is shown.
- **Approval gate icon** — a small lock/check on review slides, coding founder-in-the-loop.

### 5.5 Diagrams (render as clean vector, not raw mermaid)

Each diagram should use the §5.1 palette, thin strokes, labeled nodes, and the relevant motif.

1. **Lifecycle loop** (slide 4): `Briefing → Live Companion → Review → Contact Memory`, with "One memory brain" at the center feeding all four.
2. **Memory ⊕ Exa fusion** (slide 5): two inputs (internal graph memory, live Exa research delta) merging into one "fused briefing."
3. **Neo4j graph** (slide 6): `Founder:Maya → Contact:Priya → Meeting(s)`, `Priya → RELATED_TO → Marcus (partner)`, `Priya → ReferralOpportunity → Diego (specialist)`. Show typed memory nodes hanging off the contact.
4. **Realtime flow** (slide 7): `Browser (WebRTC) ↔ OpenAI Realtime`; server mints ephemeral secret; tool calls back to `/api/memory/query` and Exa.
5. **Feedback loop + gate** (slide 9): `approve / reject → re-rank memory → forecast next need`, with an approval gate before any outbound.

### 5.6 Tone of copy

- Confident, concrete, founder-to-judge. Real names and real numbers.
- No hype superlatives ("revolutionary," "game-changing"). Short phrases over sentences where possible.
- Lead each slide with a single takeaway headline; let the bullets prove it.

### 5.7 Accessibility

- High contrast between text and background in either theme.
- Don't rely on color alone — label nodes and signals with text/mono tags.
- Keep body text ≥ ~18pt equivalent; headlines large and legible from a distance.

---

## 6. Content guardrails

**Do:**
- Ground every claim in §8 / §9. Use the exact names, numbers, modes, and routes.
- Make the **founder-in-the-loop** boundary explicit wherever follow-up or approval is mentioned: approval returns `sendMode: founder_approval_required` and **never** sends an outbound contact message. This is a feature, not a limit.
- Justify each sponsor tech with a one-line "why" (why Exa, why Neo4j, why Realtime).
- Show that **real Exa + real Neo4j are load-bearing**, with seeded baselines as a reliability layer — not a replacement for the live integrations.
- Reflect the **four relationship types** (investor, customer, advisor, candidate) to prove the "OS" claim.

**Don't:**
- Don't invent features, metrics, or integrations not in the source docs.
- Don't claim autonomous outreach, auto-email, real outbound calls, or production auth — these are explicitly out of MVP scope.
- Don't present the later-phase channel roadmap (Telegram/Vapi/WhatsApp) as built — it's roadmap.
- Don't drop the reliability story (`DATA_MODE` / `RESEARCH_MODE`); it's a differentiator judges respect.
- Don't use real PII — all demo data is synthetic by design.

---

## 7. Page-by-page spec

### Slide 1 — Cover

- **Title:** Forebrief
- **Headline (hero):** "Briefed before you're in the room."
- **Sub-headline (the approved pitch):** "The meeting you lose isn't the one you feared — it's the one where something changed and you didn't know. Forebrief listens to you prep and to the meeting, fusing memory with live research so you always know what moved. You talk; it makes sure you're ready."
- **Footer line:** SUP hackathon · AI-Native Organizations track · Team: Sim Hong Bing, Olivia Lim Yun Xuan, MUTHURAMAN PALANIAPPAN, Mohtasham Murshid Madani, Lee Ping Xian.
- **Sponsor row:** OpenAI · Exa · Cursor (logos / wordmarks).
- **Visual:** clean title treatment over a subtle graph-node + waveform motif. Amber accent on "Forebrief."
- **Speaker note:** One sentence — Forebrief is one memory for everyone a founder knows, fused with live research, across the whole meeting lifecycle.

### Slide 2 — The Problem

- **Headline:** Founders lose deals to context they didn't have — not skills they lack.
- **Body:**
  - Founders manage high-stakes, long-term relationships across investors, customers, advisors, and candidates.
  - They can't reliably retain each relationship's full context *and* what changed in the world since the last conversation.
  - CRMs are passive repositories — the founder must remember to search, read, and act. No live external intelligence.
- **The questions founders can't answer reliably (callout list):**
  - What did we discuss last time? · What risk are they still carrying? · What did I promise — and did I follow through? · Who's connected to this contact? · What has changed at their firm / in their thesis / in their market since we last spoke? · What should I ask next?
- **Visual:** contrast panel — left: a stale CRM note card (faded); right: a moving-world ticker (Lattice thesis, market shift) the CRM can't see.
- **Speaker note:** Static memory goes stale the moment the world moves; that gap is where founders get caught off guard.

### Slide 3 — The Solution: One Memory, Three Agents

- **Headline:** One memory for everyone a founder knows — briefed before, silent during, in control after.
- **Body (the approach, condensed from 6 principles):**
  - **Founder stays in control** — the AI advises the founder; it never contacts the contact without explicit approval.
  - **Voice before, silent during** — talk it through pre-meeting; it listens silently in-room.
  - **Structured memory** — facts become graph nodes/edges, not just text notes.
  - **Fuse internal + live research** — every briefing reflects what changed since last time.
  - **One brain, four lenses** — investors, customers, advisors, candidates, all on the same memory.
- **Visual:** the lifecycle loop with "One memory brain" at the center: Briefing → Live Companion → Review → Contact Memory.
- **Speaker note:** The same memory and agents operate across the full lifecycle and across every relationship type.

### Slide 4 — How It Works: The Meeting Lifecycle

- **Headline:** The complete relationship loop — before, during, after, and forward.
- **Body:**
  - **Before (L1):** voice or typed briefing — internal memory fused with the Exa research delta; suggested openers and questions.
  - **During (L2):** silent live companion — live captions, founder-only prompts, live Exa counter-lookups, partner recommendations, memory capture.
  - **After (review):** follow-up actions and memory updates, all behind founder approval.
  - **Forward (contact memory):** timeline, network graph, approved memory, open work, and live research carry into the next interaction.
- **Visual:** the lifecycle sequence diagram (4 stages, arrows forward, memory brain feeding each).
- **Speaker note:** This loop is what makes the memory compound — each meeting feeds the next.

### Slide 5 — Live Intelligence: Exa (Sponsor Tech)

- **Headline:** Briefings reflect what changed since you last spoke — not just what you already knew.
- **Body:**
  - Exa is the live external-intelligence layer: neural web search by meaning, layered over internal graph memory.
  - In briefings: a "what changed since last time" research delta with citations.
  - In-meeting: live counter-lookups when a competitor, person, or topic comes up mid-call.
  - Domain-switched per relationship type — investor theses for investors, company news for customers, public work for candidates.
  - **Reliability:** `RESEARCH_MODE = seeded | cached | live`; a deterministic seeded baseline is always layered beneath live calls, so every surface stays intelligent even if Exa is down.
- **Proof (Priya arc):** Exa surfaced Lattice's new AI-infrastructure thesis, Priya's post on legacy-system modernization, and a comparable company's ~18x ARR raise — anchoring ammo, all cited.
- **Visual:** Memory ⊕ Exa delta → fused briefing (two inputs merging, ⊕ delta marker).
- **Speaker note:** This is the layer that turns static memory into a living briefing — and why Exa is load-bearing, not decorative.

### Slide 6 — Graph Memory: Neo4j

- **Headline:** Relationship memory is naturally graph-shaped.
- **Body:**
  - Why graph, not rows: founder, contact, meetings, memories, actions, people, partners, and referrals are all connected. "Who should I introduce?" is a graph traversal.
  - Approved memory writes create typed nodes — `Concern`, `Objective`, `Promise`, `LifeEvent` — hanging off each contact, not loose notes.
  - Memory categories: Life Event, Emotional Cue, Unresolved Concern, Goal/Objective, Promise/Commitment, Relationship Mention, Referral Opportunity, Follow-Up Action.
  - **Reliability:** `DATA_MODE = demo | hybrid | neo4j`; real Neo4j is load-bearing, with deterministic demo data as the zero-config fallback and seed source.
- **Visual:** the Neo4j graph — `Founder:Maya → Contact:Priya → Meeting(s)`; `Priya → Marcus (partner)`; `Priya → ReferralOpportunity → Diego (specialist)`; typed memory nodes off Priya.
- **Speaker note:** Graph shape is why "introduce the right person" and "what's still open" are first-class queries, not searches.

### Slide 7 — Voice-Native Architecture: OpenAI Realtime (Sponsor Tech)

- **Headline:** Talk to it before. It listens during.
- **Body:**
  - **Before:** Realtime voice Q&A over browser WebRTC. The server mints a short-lived client secret (`/api/realtime/token`) — the browser never sees the API key. The assistant calls `query_client_memory`, answered by `/api/memory/query`.
  - **During:** a silent live companion over Realtime — founder-only prompts, never speaks to the contact. Realtime tools run memory lookups, live Exa counter-lookups, partner recommendations, and memory capture.
  - **Reliability:** if voice or mic fails, typed Q&A and a scripted transcript path keep the same intelligence available.
- **Visual:** the Realtime flow — Browser (WebRTC) ↔ OpenAI Realtime; server-minted ephemeral secret; tool calls back to memory + Exa APIs. Waveform motif.
- **Speaker note:** Voice-native in both directions — spoken to before, listening during — around one memory brain. That's the differentiator over chat-only tools.

### Slide 8 — The Demo: Maya & Priya (Proof of Work)

- **Headline:** One founder, one investor meeting, the full loop — live.
- **Body (beat-by-beat):**
  - Maya opens on Lattice's new AI-infrastructure thesis (Exa-surfaced).
  - Leads with the $1.5M ARR milestone (up 2x since the April 8 call).
  - Priya re-raises the legacy WMS migration risk — her gating diligence concern.
  - Companion suggests: ask what would fully de-risk the migration in diligence; offer a warm intro to Diego for technical diligence.
  - Best-partner card: Diego Alvarez (ran the Northwind legacy WMS migration).
  - Priya asks for the ROI deck + migration case study; wants to bring Marcus (partner) in once technical story holds.
- **Captured & surfaced:** opening suggestion · milestone lead · de-risk question · Diego partner card · captured memory (integration diligence is the gating concern; Priya open to a Diego intro).
- **Post-meeting:** 3 follow-up actions + memory updates; founder approves; **nothing is sent to Priya**; approved memory persists to Neo4j.
- **OS proof:** the same brain briefs Raj (customer), Aisha (advisor), Sana (candidate).
- **Visual:** a horizontal beat timeline of the demo, with screenshot-strip placeholders for dashboard / briefing / live companion / review / contact graph.
- **Speaker note:** This is the working proof — the loop runs end to end, voice + live research + graph memory + founder-gated write.

### Slide 9 — Self-Improving Memory & Founder-in-Loop Control

- **Headline:** Agents do the work. The founder owns the send.
- **Body:**
  - **Self-improving memory:** accepted/rejected founder decisions become feedback signals that re-rank future memory surfacing and forecast likely founder needs (Visual Cortex Flow pattern-memory concept).
  - **Adaptive display (L1.5):** one query renders as `brief · cards · table · graph · timeline · recommendation · missing_info` — including an explicit "I don't have that in memory" rather than a hallucination.
  - **Founder-in-the-loop:** approval returns `sendMode: founder_approval_required` and **never** sends email, WhatsApp, Telegram, calendar invites, or any contact-facing message. Human-in-the-loop governance is a feature, not a limit.
  - **Trust:** grounded answers from pre-fetched context + citations; auditable Exa sources; synthetic demo data.
- **Visual:** feedback loop (approve/reject → re-rank → forecast) with an approval gate icon before any outbound.
- **Speaker note:** Control isn't a constraint we're apologizing for — it's the trust model that makes an agent-driven founder OS safe to actually use.

### Slide 10 — Roadmap, Stack & Close

- **Headline:** Built to extend — and working today.
- **Roadmap (later phases, out of MVP scope):**
  - L3 Telegram founder Q&A · L3.1/L3.2 OpenClaw passive chat profiling + follow-up drafting · L4 Vapi real outbound founder calls · L5 WhatsApp.
  - New channels plug into the existing memory / extraction / research / approval contracts — they don't bypass them.
- **In MVP / out of MVP (by design):**
  - In: the full before/during/after loop, real Exa + real Neo4j, four relationship types, founder-gated write.
  - Out: auth/multi-tenant, durable transcript storage, real outbound messaging, full diarization, production compliance/retention.
- **Stack recap:** Next.js App Router · React 19 · TypeScript · Tailwind · lucide-react · OpenAI Realtime · Exa · Neo4j · Visual Cortex Flow pattern.
- **Verification:** `lint` + `check:data-source` + `check:mvp` + `build`; real Exa and real Neo4j demonstrably load-bearing.
- **Close:** "Briefed before you're in the room — across every relationship a founder has."
- **Visual:** small stack logo row + a clean recap of the lifecycle loop at reduced scale.
- **Speaker note:** One closing line — the same memory, fused with live research, across the whole lifecycle, with the founder in control.

---

## 8. Fact bank (do not deviate without checking sources)

### 8.1 People & demo world

- **Founder:** Maya Chen, raising Series A for **Meshwave** (an integration platform).
- **Contacts (four relationship types):**
  - **Priya Iyer** — Principal, Lattice Ventures — **INVESTOR** (the deep live-companion flow).
  - **Raj Patel** — VP Engineering, Northwind Logistics — **CUSTOMER**.
  - **Aisha Bello** — GTM Advisor — **ADVISOR**.
  - **Sana Okafor** — Senior Engineer, Legacy Systems Inc. — **CANDIDATE** (founding-engineer).
- **Supporting people:** **Diego Alvarez** — Meshwave Solutions Engineer (ran the Northwind legacy WMS migration; best match for technical diligence). **Marcus Reyes** — Partner, Lattice Ventures (next-stage decision maker).
- **Demo meeting id:** `meeting-2026-06-20-priya` · **Time:** 10:30 AM · **Purpose:** reconfirm diligence path and schedule the partner meeting.
- **Prior investor meeting:** 2026-04-08.

### 8.2 Investor-arc facts (Priya)

- **Prior call (Apr 8):** Priya flagged legacy WMS integration risk as the main diligence concern; set a path-to-$10M-ARR bar before a term sheet; Maya promised the ROI deck + a migration case study; Priya can intro Maya to partner Marcus.
- **Internal milestone:** Meshwave crossed **$1.5M ARR** since the last call (up 2x, ~$750k → $1.5M).
- **Exa research delta (seeded baseline; real in `live` mode):** Lattice announced a new **AI-infrastructure thesis** (legacy-modernization focus); Priya posted about legacy-system modernization; a comparable company raised at **~18x ARR** (anchoring ammo). All cited.
- **Live-companion signals:** opening suggestion (acknowledge Lattice's AI-infra thesis); lead with the $1.5M ARR milestone; ask what would fully de-risk the migration in diligence; offer a warm intro to Diego; best-partner card for Diego Alvarez.
- **Captured memory:** integration diligence is the gating concern; Priya is open to a Diego intro.
- **Post-meeting actions:** send ROI deck + Northwind migration case study · draft warm intro to Diego · request partner meeting with Marcus once diligence clears · log unresolved concern (integration risk).
- **Approval behavior:** returns `sendMode: founder_approval_required`; **no outbound message is sent**; approved memory persists to Neo4j when configured.

### 8.3 Cross-relationship-type seed (OS proof)

- **Customer (Raj, Northwind):** legacy WMS rewrite champion; integration budget approved; CFO wants a live migration demo before signing; Maya promised a live demo migrating a sample legacy WMS workflow.
- **Advisor (Aisha):** advisory sync to pressure-test the Series A narrative and pricing.
- **Candidate (Sana):** final-round systems-design and team-fit interview; background in legacy systems.

### 8.4 The three agents / lifecycle

1. **L1 Pre-meeting briefing** — voice + typed Q&A via OpenAI Realtime; internal memory fused with the Exa research delta; suggested openers/questions.
2. **L1.5 Adaptive memory display** — one query → `brief · cards · table · graph · timeline · recommendation · missing_info` (selected by `lib/memory-query-response.ts`).
3. **L2 Live meeting companion** — silent; Realtime mic capture; founder-only prompts; live Exa counter-lookups; partner recommendations; memory capture.
4. **Post-meeting review** — founder-gated approvals of actions and memory updates.
5. **Contact memory page** — durable relationship context: timeline, network graph, approved/recent memory, open work, live research.

### 8.5 Reliability pattern (key differentiator)

- **`DATA_MODE = demo | hybrid | neo4j`** — unset → `neo4j` if Neo4j env vars present, else `demo`. Seeded data is both the zero-config fallback and the seed source for `seed-neo4j.ts`.
- **`RESEARCH_MODE = seeded | cached | live`** — unset or no Exa key → `seeded` baseline. Seeded intelligence is **always layered beneath** live research so surfaces stay intelligent if a service is down.
- **Fallbacks:** no OpenAI key → typed Q&A works; mic denial → typed/scripted path; no Exa → seeded baseline; no Neo4j in demo/hybrid → deterministic memory.

### 8.6 Neo4j schema

- `(Founder: Maya Chen)-[:MANAGES]->(Contact: Priya Iyer)`
- `(Contact)-[:HAS_MEETING]->(Meeting)` — 2026-06-20 upcoming, 2026-04-08 prior
- `(Contact)-[:HAS_MEMORY]->(Memory)`, `(Contact)-[:HAS_ACTION]->(Action)`
- `(Contact)-[:RELATED_TO {reports to}]->(Person: Marcus Reyes)`
- `(Contact)-[:HAS_REFERRAL_OPPORTUNITY]->(ReferralOpportunity)` (partner-meeting)
- `(ReferralOpportunity)-[:MATCHES_SPECIALIST]->(Specialist: Diego Alvarez)`
- Approved memory writes create a `Memory` node + typed nodes (`LifeEvent`, `Concern`, `Objective`, `Promise`).
- Memory categories: Life Event · Emotional Cue · Unresolved Concern · Goal/Objective · Promise/Commitment · Relationship Mention · Referral Opportunity · Follow-Up Action.

### 8.7 Key API routes (for accuracy on the architecture slide)

- `POST /api/realtime/token` (and `/session`) — mint short-lived OpenAI Realtime client secret.
- `POST /api/memory/query` — adaptive L1/L1.5 visual response fused with the Exa research delta.
- `POST /api/memory/search` — contact memory search for live-companion tool calls.
- `POST /api/partners/recommend` — recommend a relevant partner for a live need.
- `GET /api/clients/[clientId]/context` and `/graph` — data-mode-backed contact context and relationship graph.
- `POST /api/meetings/[meetingId]/{transcribe,extract,analyze,events}` — transcript + extraction + analysis (compatibility and test paths).
- `POST /api/memory/approve` — persist approved memory to Neo4j when configured (demo fallback otherwise).
- `POST /api/actions/approve` — mark action founder-approved; `sendMode: founder_approval_required`; no outbound send.

### 8.8 Tech stack

- Next.js App Router · React 19 · TypeScript · Tailwind CSS · lucide-react.
- OpenAI Realtime (over browser WebRTC; server-minted ephemeral secret) + OpenAI audio transcription.
- Exa neural web search (`lib/exa-research.ts`).
- Neo4j driver (`lib/neo4j-memory.ts`) + deterministic local demo data (`lib/demo-data.ts`).
- Visual Cortex Flow pattern-memory concept (self-improving memory + forecasting).

### 8.9 Roadmap (later phases — explicitly out of MVP scope)

- L3 Telegram founder Q&A · L3.1 OpenClaw passive chat profiling (allowlisted) · L3.2 OpenClaw follow-up drafting (founder-approved) · L4 Vapi real outbound founder calls · L5 WhatsApp.

### 8.10 Non-goals (MVP out of scope — do not imply as built)

- Production compliance/retention/audit/consent · authentication or multi-tenant isolation · multi-user sync or durable transcript storage · real outbound email/messaging/phone · full speaker diarization · replacing CRM systems · financial advice generation.

### 8.11 Success metrics (hackathon)

- Demo flow completes without manual code changes.
- Voice briefing fused with live research works.
- Live companion produces useful suggestions + ≥1 live Exa counter-lookup.
- Post-meeting flow creates credible actions + memory updates behind founder approval.
- Relationship/partner graph is visible (Priya → Marcus → Diego).
- OS works across all four relationship types.
- Real Exa and real Neo4j are demonstrably load-bearing (not just the seeded fallback).

---

## 9. Source files (verify here, don't guess)

- `README.md` — product summary, team, tech stack, data/research modes, routes, verification.
- `docs/prd-forebrief.md` — full requirements, principles, demo narrative, Neo4j model, seed data, acceptance criteria.
- `docs/system-architecture.md` — runtime architecture, layer responsibilities, lifecycle flows, API surface, reliability boundaries.
- `docs/meeting-demo-script.md` — the 5-minute judge demo path beat-by-beat.
- `docs/priya-investor-dialogue-script.md` — the live-meeting dialogue and the signals each beat should surface.

> If any slide content conflicts with these files, **the files win.** Fix the slide, not the facts.
