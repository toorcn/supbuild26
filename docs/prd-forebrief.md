# Product Requirements Document: Forebrief

Version: 0.1  
Date: 2026-06-27  
Status: Draft for hackathon MVP  
Primary goal: Build a demo/pitch-ready prototype that proves the end-to-end founder-relationship-OS workflow across pre-meeting, live-meeting, and post-meeting for one founder and four relationship types, fusing internal graph memory with live Exa research.

## 1. Product Summary

Forebrief is a founder relationship operating system — "briefed before you're in the room." It is one memory for everyone a founder knows (investors, customers, advisors, candidates), fusing an internal relationship-memory graph with live external research so the founder never walks into a meeting cold, forgets important context, or misses a signal.

The product uses a contact memory graph stored in Neo4j, an OpenAI Realtime voice/chat interface, an Exa neural web-search layer for live external intelligence, and a web meeting companion. The same three agents — briefing, silent live companion, and review — operate across every relationship type. For the hackathon demo, the product follows one founder working through a complete journey:

1. A seeded upcoming meeting appears in the founder's dashboard across all four relationship types.
2. The assistant starts a web-based pre-meeting briefing with the founder.
3. The assistant briefs the founder on the contact, fuses live "what changed since last time" research (Exa), and answers voice follow-up questions.
4. During the meeting, the web app listens silently and suggests useful questions, relevant context, partner/referral matches, and live counter-lookups.
5. After the meeting, the assistant generates follow-up actions and updates the contact's memory graph behind founder approval.

The core promise is: founders should not need to manually remember every diligence risk, open concern, commitment, life event, referral opportunity, or promised follow-up across a growing network of investors, customers, advisors, and candidates. Human-in-the-loop governance — never auto-email a contact — is a feature, not a limit.

## 2. Problem

Founders manage high-stakes, long-term relationships across investors, customers, advisors, and candidates. Even strong founders struggle to retain the full context of each relationship and what has changed in the world since the last conversation:

- What did we discuss last time?
- What did the contact care about most, and what risk are they still carrying?
- What promises did I make, and did I follow through?
- What people, firms, or specialists are connected to this contact?
- Which concerns remain unresolved?
- Who might need a warm introduction or partner referral?
- What has changed externally — at their firm, in their thesis, in their market — since we last spoke?
- What should I ask next to move the relationship forward?

Existing CRMs are usually passive. They store notes, but the founder must remember to search, read, and act, and they have no live external intelligence layer. The demo should show an assistant that proactively fuses internal graph memory with live web research, turns that fusion into useful briefing/suggestion/action surfaces, and saves new memory back into a graph behind explicit founder approval.

This is squarely on the AI-Native Organizations track: helping a founder's organization transition to agent-driven operations where memory, live research, and human-gated action are handled by agents rather than manual CRM toil.

## 3. Target Users

### Primary User

A founder (fundraising, selling, hiring, advising) managing many high-stakes relationships across investors, customers, advisors, and candidates.

Needs:
- Quick contact briefing before a meeting, grounded in internal memory fused with live research.
- Natural Q&A instead of digging through CRM notes.
- Quiet prompts during live meetings without interrupting the human conversation.
- Reliable follow-up capture after the meeting.
- Relationship/referral/partner graph visibility.
- Human-in-the-loop control over anything contact-facing.

### Locked Demo Persona

Founder: Maya Chen, raising a Series A for **Meshwave** (an integration platform).

Contacts (four relationship types):
- Priya Iyer — Principal, Lattice Ventures — **INVESTOR** (the deep live-companion demo flow; demo meeting id `meeting-2026-06-20-priya`)
- Raj Patel — VP Engineering, Northwind Logistics — **CUSTOMER**
- Aisha Bello — GTM Advisor — **ADVISOR**
- Sana Okafor — Founding-engineer candidate (currently Senior Engineer, Legacy Systems Inc.) — **CANDIDATE**

Supporting people/partners in the investor graph:
- Diego Alvarez — Meshwave Solutions Engineer (technical-diligence intro)
- Marcus Reyes — Partner, Lattice Ventures (next-stage decision maker)

## 4. Product Principles

1. Founder stays in control.
   - The AI advises the founder. It does not talk to the contact or send any contact-facing message without explicit founder approval. Approval returns `sendMode: founder_approval_required` and no outbound message is ever sent. Human-in-the-loop governance is a feature, not a limit.

2. Voice first before the meeting, silent during the meeting.
   - Pre-meeting flow can speak and answer questions.
   - Live meeting flow should display silent suggestions on screen.

3. Memory should be structured, not just summarized text.
   - Important facts become graph nodes/edges where possible: milestones, signals, concerns, promises, relationships, referrals, objectives, meetings, actions.

4. Fuse internal memory with live external research.
   - Every briefing and live lookup reflects what changed in the world since the last interaction, not just what the founder already knows.
   - Exa is the live external intelligence layer, controlled by `RESEARCH_MODE = seeded|cached|live` and layered over a deterministic seeded baseline so surfaces stay intelligent even if Exa is unavailable.

5. Demo should prove the workflow, not every production integration.
   - Use seeded calendar data first (and as the zero-config fallback AND the seed source for `seed-neo4j.ts`).
   - Use a web-based Realtime voice POC first.
   - Add Google Calendar, Vapi, Telegram, OpenClaw, and WhatsApp in later phases — explicitly out of scope for this hackathon.

6. Keep the contact interaction human.
   - The contact only speaks to the founder.
   - The product supports the founder in the background.

## 5. Goals

### MVP Goals

- Show a complete pre-meeting, live-meeting, and post-meeting journey for one founder (Maya) across four relationship types, with the investor (Priya) as the deep live-companion flow.
- Use Neo4j as the memory layer/source of truth.
- Use OpenAI Realtime for voice interaction in the pre-meeting and live-companion experiences.
- Use Exa as the live external intelligence layer, fused with internal memory in briefing (research delta on "what changed since last time") and in the live companion (live counter-lookups).
- Use the web app as the portable interface for both phone and laptop usage.
- Display relevant contact context as brief, cards, table, graph, timeline, recommendation, or missing-info depending on the content (L1.5 adaptive display).
- During a meeting, capture useful details and show silent suggested questions/context/partner matches.
- After a meeting, generate actions and memory updates that the founder can review.
- Include referral/partner network graph capture and visualization.
- Prove the OS works across all four relationship types (investor, customer, advisor, candidate) via briefing + adaptive Q&A, not just the investor live flow.

### Pitch Goals

The demo should make judges/sponsors believe:

- This solves a real workflow pain for founders managing many high-stakes relationships.
- The product is more than a chatbot because it has persistent relationship memory fused with live research.
- Neo4j is justified because founder relationship memory is naturally graph-shaped.
- Exa is justified because "what changed since last time" is the missing external-intelligence layer that turns static memory into a living briefing.
- The assistant can improve recall, follow-through, trust, and referral/partner opportunities while keeping the founder in control of anything contact-facing.

## 6. Non-Goals For Hackathon MVP

- Production-grade compliance, retention, audit, or consent management.
- Authentication or multi-tenant isolation.
- Multi-user sync or durable transcript storage.
- Full Google Calendar integration.
- Full WhatsApp integration.
- Full Telegram/OpenClaw automation.
- Real outbound phone call via Vapi.
- Real outbound email or any contact-facing message send.
- Robust speaker diarization.
- Fully automated contact messaging.
- Financial advice generation or portfolio recommendations.
- Replacing CRM systems.

## 7. Scope By Prototype Level

### L1: Pre-Meeting Realtime Briefing

Build a web page that simulates an incoming briefing session before an upcoming meeting.

Requirements:
- Show seeded upcoming meeting for Maya and Priya (and the other three relationship-type meetings on the dashboard).
- Founder can start/join the pre-meeting briefing.
- App pre-fetches the contact context from Neo4j (selected `DATA_MODE`).
- App fuses the Exa research delta ("what changed since last time") over the seeded baseline (`RESEARCH_MODE`).
- Assistant speaks a concise briefing:
  - who the founder is meeting
  - when the meeting is
  - how long since the last meeting
  - last discussed topics
  - unresolved concerns
  - important milestones/updates
  - what has changed externally since the last meeting (Exa)
  - suggested opening line
  - suggested questions
- Founder can ask natural voice follow-up questions.
- Assistant answers using fetched contact memory fused with live research.

Demo example (investor, Priya):
- "You are meeting Priya Iyer, Principal at Lattice Ventures, at 10:30. You last met on 2026-04-08. Last time she flagged legacy WMS integration risk as the main diligence concern and set a credible path-to-$10M-ARR bar. Since then, Meshwave has crossed $1.5M ARR. Exa just surfaced that Lattice announced a new AI-infrastructure thesis and Priya posted about legacy-system modernization — so open by acknowledging the thesis shift, then move into the migration story."

### L1.5: Adaptive Memory Display

Add a visual output area in the same web interface. Memory queries do not always render as chat.

Requirements:
- Display retrieved data in the best useful format (`lib/memory-query-response.ts` selects a display mode):
  - `brief`: one concise answer
  - `cards`: memory cards for high-salience facts
  - `table`: pending actions and follow-ups
  - `graph`: relationship and referral graph
  - `timeline`: prior meeting and memory sequence
  - `recommendation`: referral or partner next step
  - `missing_info`: explicit gap with suggested next question
- When the founder asks a voice question, update the visual panel if the answer has structured data.

Example founder question:
- "Who should I introduce Priya to for technical diligence?"

Expected visual:
- Relationship graph showing Maya, Priya, Marcus Reyes (partner), the partner-meeting opportunity, and Diego Alvarez (SE).
- Recommendation card explaining why Diego Alvarez is the best partner match for the legacy-WMS technical-diligence intro.

### L2: Live Meeting Companion

Build a web page the founder can keep open during an in-person or online meeting (primary route `/live/[meetingId]`; `/meeting/[meetingId]` redirects here).

Requirements:
- Capture meeting audio through the browser over OpenAI Realtime (WebRTC).
- Show live transcript/captions or lightweight event stream.
- Display silent suggestions on screen, not spoken aloud.
- Fetch relevant contact memory when the conversation touches known topics.
- Run live Exa counter-lookups when a competitor, person, or topic is mentioned mid-call.
- Suggest better questions based on:
  - open concerns
  - known objectives
  - relationship gaps
  - promises from prior meetings
  - referral/partner opportunities
- Capture new useful memory:
  - milestones and signals
  - unresolved concerns
  - stated goals
  - promises made by the founder
  - people/firm/business mentions
  - referral/partner opportunities
- Save proposed memory updates for review or directly into Neo4j depending on demo flow.

Explicitly not required for MVP:
- Accurate diarization.
- Perfect distinction between founder and contact.
- Full automatic meeting minutes.
- Durable transcript storage.

Recommended MVP behavior:
- Treat live audio as a single conversation stream (with simple `founder`/`contact`/`unknown` speaker labels).
- Extract candidate facts with confidence and source transcript snippets.
- Display the candidate facts as "captured memory" cards.
- Let the founder approve or ignore them.

### L3: Telegram/OpenClaw Founder Q&A (later phase — out of hackathon scope)

Integrate a messaging interface after the web demo works. Out of scope for this hackathon; kept as a later-phase level.

Requirements:
- At minimum, use Telegram as the first external chat surface.
- Founder can ask questions about contacts from Telegram.
- Bot answers from Neo4j memory fused with Exa research.
- Keep responses short and grounded in known contact memory.

Example:
- Founder: "What should I know before meeting Priya?"
- Bot: returns compact pre-meeting brief with the Exa research delta.

### L3.1: Passive Chat Profiling Via OpenClaw (later phase — out of hackathon scope)

Use OpenClaw to read allowlisted founder-contact chats and update memory. Out of scope for this hackathon; kept as a later-phase level.

Requirements:
- Only ingest chats from explicitly allowlisted contacts/numbers.
- Extract useful memory from messages:
  - important milestones and signals
  - unresolved concerns
  - follow-up promises
  - referral or introduction opportunities
  - contact preferences
- Save extracted items with evidence, source, timestamp, and confidence.

### L3.2: Automated Follow-Up Drafting Via OpenClaw (later phase — out of hackathon scope)

Generate follow-up drafts for founder approval. Out of scope for this hackathon; kept as a later-phase level.

Requirements:
- Draft follow-up messages after meetings or chats.
- Founder must approve before sending.
- System should explain why the follow-up is recommended.

### L4: Real Pre-Meeting Phone Calls (later phase — out of hackathon scope)

Use Vapi or similar service for real outbound phone calls. Out of scope for this hackathon; kept as a later-phase level.

Requirements:
- Assistant calls the founder before upcoming meetings.
- Founder can receive briefing and ask questions over phone.
- Call still uses Neo4j-backed memory fused with Exa research.
- Call is only for the founder, never the contact.

### L5: WhatsApp Integration (later phase — out of hackathon scope)

Add WhatsApp via OpenClaw when available. Out of scope for this hackathon; kept as a later-phase level.

Requirements:
- Allowlisted WhatsApp contacts only.
- Passive profiling from chats.
- Founder-approved follow-up drafts.
- Respect contact privacy and consent requirements.

## 8. Demo Narrative

The demo follows the investor (Priya) arc as the deep live-companion flow, with the other three relationship types proving the OS works via briefing + adaptive Q&A on the dashboard:

1. Maya opens her dashboard.
   - She sees seeded upcoming meetings across all four relationship types: Priya (investor, 2026-06-20), Raj (customer, 2026-06-22), Aisha (advisor, 2026-06-25), Sana (candidate, 2026-06-26). The investor meeting is the deep flow.

2. Forebrief briefs Maya by voice (Exa fusion).
   - Simple "Start briefing" state on `/briefing/[meetingId]`.
   - Assistant says what matters before Maya meets Priya, fusing internal memory (integration risk, $10M-ARR bar, $1.5M ARR crossed) with the Exa research delta (Lattice's new AI-infrastructure thesis, Priya's post on legacy-system modernization).

3. Maya asks follow-up questions naturally.
   - "What did we discuss last time?"
   - "What should I open with?"
   - "Who can help with technical diligence?"
   - "Who should I introduce Priya to?"

4. The app shows visual context (L1.5 adaptive display).
   - Contact card, timeline, open concerns, relationship/partner graph, recommendation card for Diego.

5. Maya starts the live meeting companion at `/live/[meetingId]`.
   - The app listens in the background over Realtime.
   - Captions and suggestions appear silently.

6. Priya mentions relevant information.
   - Lattice's new AI-infra / legacy-modernization thesis (Exa external signal).
   - The legacy WMS migration risk is still her gating concern.
   - Interest in bringing Marcus (partner) in for the partner meeting if technical diligence holds.
   - Request for the ROI deck and migration case study Maya promised.

7. The app captures memory and suggests questions, with live Exa counter-lookups.
   - "Acknowledge Lattice's AI-infra thesis" opening suggestion.
   - "Lead with the $1.5M ARR milestone."
   - "Ask what would fully de-risk the migration in diligence."
   - "Offer a warm intro to Diego for technical diligence."
   - Best partner card for Diego Alvarez (solutions engineer).
   - Captured memory: integration diligence is the gating concern; Priya is open to a Diego intro.

8. After the meeting, the app creates actions.
   - Send ROI deck + Northwind migration case study.
   - Draft warm intro to Diego.
   - Request partner meeting with Marcus once diligence clears.
   - Log unresolved concern (integration risk).
   - Update relationship graph.

9. Maya reviews and approves.
   - Nothing is sent to the contact automatically. Approval returns `sendMode: founder_approval_required` and persists founder-approved records to Neo4j when configured.

10. Maya opens the contact profile and inspects the relationship graph, timeline, open items, and approved/recent memory across the other three relationship types (Raj, Aisha, Sana) to prove the OS, not just the investor flow.

## 9. User Stories

### Pre-Meeting

As a founder, I want the assistant to brief me before a meeting — fusing internal memory with live research — so I can enter the conversation already remembering the contact's context and what has changed since last time.

Acceptance criteria:
- Given an upcoming seeded meeting, the app can generate a voice briefing.
- The briefing includes at least 4 contact-specific facts from Neo4j.
- The briefing includes a live Exa research delta ("what changed since last time") with citations.
- The briefing includes at least 2 suggested questions or openers.
- The founder can ask at least 2 follow-up questions by voice.
- The assistant answers from known contact memory fused with live research.

### During Meeting

As a founder, I want silent suggestions during the meeting so I can ask better questions without interrupting the contact.

Acceptance criteria:
- The app captures meeting audio through the web app over Realtime.
- The app shows text suggestions without speaking aloud.
- The suggestions are tied to live conversation content or existing memory.
- The app shows relevant historical context when triggered by the conversation.
- The app runs at least one live Exa counter-lookup during the meeting.
- The app captures at least 3 candidate memory updates.

### Post-Meeting

As a founder, I want the assistant to produce follow-ups and memory updates so I do not forget what I promised.

Acceptance criteria:
- The app generates a meeting summary.
- The app proposes follow-up actions.
- The app proposes memory updates with categories and evidence.
- The founder can approve/ignore proposed updates.
- Approved updates appear in the contact profile/graph.
- No approved action sends a contact-facing message (`sendMode: founder_approval_required`).

### Partner / Referral Tracking

As a founder, I want relationship/partner opportunities captured so I can make useful introductions and move relationships to the next stage.

Acceptance criteria:
- The app identifies mentioned people/firms/partners.
- The app can represent them in the relationship graph.
- The app can mark a referral opportunity or warm introduction.
- The app can show why a recommended partner is relevant (e.g., Diego for legacy-WMS technical diligence).
- The app can recommend a partner that bridges to the next stage (e.g., Marcus partner meeting).

### OS Across Relationship Types

As a founder, I want the same briefing and Q&A to work across investors, customers, advisors, and candidates so one memory serves my whole network.

Acceptance criteria:
- The dashboard shows upcoming meetings for all four relationship types.
- Briefing and adaptive Q&A work for at least one contact of each type (Priya, Raj, Aisha, Sana).
- The relationship graph adapts per contact type (investor funnel, customer deal, advisor, candidate).

## 10. Functional Requirements

### Calendar And Demo Data

FR-001: The app must provide seeded demo calendar data (also the seed source for `seed-neo4j.ts` and the zero-config fallback).  
FR-002: The app must show at least one upcoming meeting (investor Priya; plus customer/advisor/candidate on the dashboard).  
FR-003: The meeting must link to a contact profile in Neo4j.  
FR-004: Google Calendar integration must be designed as a later replaceable data source, not required in MVP.

### Contact Memory Retrieval

FR-010: The app must retrieve contact context from Neo4j by contact ID (selected `DATA_MODE` = demo|hybrid|neo4j).  
FR-011: The app must retrieve recent meetings/interactions.  
FR-012: The app must retrieve open concerns, promises, objectives, milestones, and signals.  
FR-013: The app must retrieve relationship/referral/partner graph context.  
FR-014: Retrieval results must include timestamps where available.

### Live Research (Exa)

FR-015: The app must fuse a live external research delta ("what changed since last time") into briefing responses.  
FR-016: The app must support `RESEARCH_MODE = seeded|cached|live`, mirroring the `DATA_MODE` reliability pattern, with a deterministic seeded baseline always available.  
FR-017: The app must run live Exa counter-lookups in the live companion when a relevant person/topic is mentioned.  
FR-018: Research results must include citations/evidence snippets and a clear source indicator (live/cached/seeded).  
FR-019: When Exa is unavailable, the seeded baseline must keep briefings and lookups intelligent.

### Pre-Meeting Voice

FR-020: The app must create a realtime voice session from the browser.  
FR-021: The browser must request a short-lived/ephemeral Realtime credential from the backend.  
FR-022: The assistant must receive pre-fetched contact context (and research delta) before briefing.  
FR-023: The assistant must speak a concise briefing.  
FR-024: The founder must be able to interrupt or ask follow-up questions.  
FR-025: The app must display a text transcript or summary of the briefing.

### Visual Context (L1.5 Adaptive Display)

FR-030: The app must display a contact context panel.  
FR-031: The app must display open items/actions.  
FR-032: The app must display relationship graph data.  
FR-033: The app must update visuals when a voice answer contains structured data.  
FR-034: The app must select an appropriate display mode (brief, cards, table, graph, timeline, recommendation, missing_info) based on query intent.

### Live Meeting Companion

FR-040: The app must start and stop live meeting capture.  
FR-041: The app must process live meeting transcript/audio events.  
FR-042: The app must show silent suggestions on screen.  
FR-043: The app must show relevant memory/context cards when triggered.  
FR-044: The app must extract candidate memory updates.  
FR-045: The app must not speak during the live meeting mode unless the founder explicitly switches modes.  
FR-046: The app must run live Exa counter-lookups during the meeting and display results.

### Memory Extraction

FR-050: The app must classify candidate memory updates into categories:
- Life Event
- Emotional Cue
- Unresolved Concern
- Goal/Objective
- Promise/Commitment
- Relationship Mention
- Referral Opportunity
- Follow-Up Action

FR-051: Each candidate memory update must include:
- contact ID
- category
- summary
- source transcript snippet or source event
- timestamp
- confidence
- proposed graph mutation

FR-052: The founder must be able to approve, edit, or ignore candidate updates.

### Post-Meeting Actions

FR-060: The app must generate a meeting summary.  
FR-061: The app must generate follow-up actions.  
FR-062: The app must identify promises made during the meeting.  
FR-063: The app must draft founder-approved follow-up messages or introductions.  
FR-064: The app must not send messages automatically in MVP; approval returns `sendMode: founder_approval_required` and no outbound contact message is ever sent.

### Graph Visualization

FR-070: The app must show the contact relationship graph.  
FR-071: The graph must include contact, people, partners, and referral/opportunity nodes.  
FR-072: The graph must show edge labels or relationship types.  
FR-073: The graph must allow selecting a node to view supporting context.  
FR-074: The app must recommend a best-match partner (e.g., Diego for technical diligence) with an explanation.

## 11. Non-Functional Requirements

NFR-001: The demo should run locally with seeded data (zero-config path works without `.env.local`, falling back to demo data and seeded research).  
NFR-002: The UI should work on laptop and mobile browser widths.  
NFR-003: Pre-meeting voice should feel responsive enough for a live demo.  
NFR-004: Live suggestions should appear quickly enough to feel realtime, even if backed by a simplified pipeline.  
NFR-005: Demo data must be synthetic and should not contain real contact PII.  
NFR-006: Failed realtime connection should degrade to typed chat or scripted demo mode if possible.  
NFR-007: The founder should always be able to review AI-generated memory/actions before any contact-facing follow-up.  
NFR-008: Live research (Exa) must degrade gracefully — when Exa is unavailable or `RESEARCH_MODE=seeded`, the seeded baseline keeps every surface intelligent.  
NFR-009: Real Exa and real Neo4j are both load-bearing for judging; the seeded baselines exist for reliability, not to replace the live integrations.

## 12. Recommended Technical Architecture

### Frontend

Framework:
- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- lucide-react

Implementation direction:
- Use Next.js App Router for pages, layouts, route handlers, and server-side data access where useful.
- Use Tailwind CSS as the primary styling system for responsive layouts, component states, and demo polish.
- Keep UI components local and lightweight for the hackathon MVP; introduce a component library only if it speeds delivery without increasing setup risk.

Key pages:
- `/` — redirects to the next meeting briefing.
- `/dashboard` — founder day view / command center and workflow map across all four relationship types.
- `/briefing/[meetingId]` — pre-meeting voice briefing and Q&A (internal memory fused with Exa research delta).
- `/qna/[meetingId]` — standalone L1.5 memory Q&A surface for answer-first visual responses.
- `/live/[meetingId]` — primary live meeting companion (`/meeting/[meetingId]` redirects here).
- `/client/[clientId]` — contact profile, memory, timeline, graph.
- `/post-meeting/[meetingId]` — summary, action review, memory update review.

UI components:
- Dashboard / agenda list
- Incoming briefing panel
- Voice session controls
- Contact context card
- Timeline
- Open items table
- Silent suggestion feed
- Captured memory review cards
- Relationship/partner graph
- Post-meeting action board

### Backend

Recommended route responsibilities:
- `POST /api/realtime/session` and `POST /api/realtime/token`
  - Server creates an ephemeral OpenAI Realtime session for the browser (briefing or live-companion mode).
- `GET /api/demo/calendar`
  - Returns seeded demo meetings from the selected data mode.
- `GET /api/clients/:clientId/context`
  - Returns data-mode-backed contact context for briefing.
- `GET /api/clients/:clientId/graph`
  - Returns nodes/edges for visualization.
- `POST /api/memory/query`
  - Returns a normalized L1/L1.5 visual memory response fused with the Exa research delta.
- `POST /api/memory/search`
  - Searches contact memory for live-companion tool calls.
- `POST /api/partners/recommend`
  - Recommends a relevant founder-network partner for a concrete live need.
- `POST /api/meetings/:meetingId/transcribe`
  - Transcribes an audio chunk when OpenAI is configured.
- `POST /api/meetings/:meetingId/extract`
  - Extracts candidate memories/actions from transcript events.
- `POST /api/meetings/:meetingId/analyze`
  - Runs live transcript analysis with OpenAI chat completion when configured.
- `POST /api/memory/approve`
  - Writes approved memory updates to Neo4j (demo fallback otherwise).
- `POST /api/actions/approve`
  - Marks action/follow-up as founder-approved (`sendMode: founder_approval_required`); no outbound message sent.

### AI Layer

Pre-meeting mode:
- Use OpenAI Realtime via browser WebRTC.
- Backend mints ephemeral session credentials.
- Assistant receives pre-fetched contact context fused with the Exa research delta and produces spoken responses.
- Assistant can answer founder Q&A from the context bundle.

Live meeting mode:
- Use OpenAI Realtime audio/transcript capture over WebRTC.
- Use browser microphone capture, buffered audio chunks, silence skipping, a transcription endpoint, and transcript-driven analysis.
- Prefer text/silent outputs.
- Use Realtime tools / extraction prompts to create candidate memory/action records, run memory lookups, recommend partners, and run live Exa counter-lookups.
- Keep human-in-the-loop approval for updates and follow-ups.

### Live Research Layer (Exa)

Use Exa as the live external intelligence layer, controlled by `RESEARCH_MODE`:

| Mode | Behavior | Best For |
| --- | --- | --- |
| `seeded` | Deterministic Exa-shaped signals baked into the demo journey. No Exa key required. | Fast first run and judge fallback. |
| `cached` | Real Exa results fetched once and cached to disk. | Repeatable demos without live network calls. |
| `live` | Real Exa calls, layered over the seeded baseline when configured. | Proof of live external intelligence. |

If `RESEARCH_MODE` is unset or Exa is not configured, the seeded baseline keeps briefings and lookups intelligent. Implemented in `lib/exa-research.ts`.

### Memory Layer

Use Neo4j as the source of truth for demo memory, with `DATA_MODE` = demo|hybrid|neo4j.

Live meeting memory behavior:
- Query Neo4j for additional contact memory when building live context.
- Save approved captured memories/actions to Neo4j after founder review.
- Store proposed graph mutations as auditable metadata first; do not execute arbitrary AI-generated Cypher without validation.

Optional later additions:
- Vector indexes in Neo4j for semantic memory retrieval.
- Separate object storage for raw transcripts/audio.
- A higher-level memory abstraction only if required; current default is Neo4j.

## 13. Neo4j Data Model

> Note: New code uses `Founder`/`Contact` domain types. The Neo4j node labels below may keep the legacy `Advisor`/`Client` labels in the seed script for transition, mapping to `Founder`/`Contact` respectively — or may be renamed to `Founder`/`Contact`. Either is acceptable; the contract is `Founder`↔`Advisor` and `Contact`↔`Client` (`Advisor`/`Client` are deprecated type aliases of `Founder`/`Contact` in `lib/types.ts`).

### Core Node Labels

- `Advisor` (maps to `Founder`) — Maya Chen
- `Client` (maps to `Contact`) — Priya, Raj, Aisha, Sana
- `Meeting`
- `Memory`
- `LifeEvent`
- `Concern`
- `Objective`
- `Promise`
- `Action`
- `Person`
- `Specialist`
- `ReferralOpportunity` / `Opportunity`
- `Interaction`

### Core Relationships

- `(Advisor)-[:MANAGES]->(Client)`
- `(Client)-[:HAS_MEETING]->(Meeting)`
- `(Meeting)-[:PRODUCED]->(Memory)`
- `(Client)-[:HAS_MEMORY]->(Memory)`
- `(Client)-[:HAS_LIFE_EVENT]->(LifeEvent)`
- `(Client)-[:HAS_CONCERN]->(Concern)`
- `(Client)-[:HAS_OBJECTIVE]->(Objective)`
- `(Client)-[:HAS_PROMISE]->(Promise)`
- `(Client)-[:HAS_ACTION]->(Action)`
- `(Client)-[:RELATED_TO {relationship}]->(Person)`
- `(Client)-[:HAS_REFERRAL_OPPORTUNITY]->(ReferralOpportunity)`
- `(ReferralOpportunity)-[:INVOLVES]->(Person)`
- `(ReferralOpportunity)-[:MATCHES_SPECIALIST]->(Specialist)`
- `(Action)-[:FOLLOWS_FROM]->(Meeting)`

Seeded investor graph (Maya → Priya):
- `(Founder: Maya Chen)-[:MANAGES]->(Contact: Priya Iyer)`
- `(Priya)-[:HAS_MEETING]->(Meeting: 2026-06-20 upcoming)` and `(Meeting: 2026-04-08 prior)`
- `(Priya)-[:HAS_MEMORY]->(Memory)` and `(Priya)-[:HAS_ACTION]->(Action)`
- `(Priya)-[:RELATED_TO {reports to}]->(Person: Marcus Reyes)`
- `(Priya)-[:HAS_REFERRAL_OPPORTUNITY]->(Opportunity: partner-meeting)`
- `(Opportunity)-[:MATCHES_SPECIALIST]->(Specialist/Partner: Diego Alvarez)`

### Important Properties

Common properties:
- `id`
- `title`
- `summary`
- `createdAt`
- `updatedAt`
- `source`
- `sourceSnippet`
- `confidence`
- `status`

Meeting properties:
- `startsAt`
- `endedAt`
- `type`
- `location`
- `objective`

Memory properties:
- `category`
- `salience`
- `validFrom`
- `lastConfirmedAt`

Action properties:
- `actionType`
- `dueAt`
- `owner`
- `status`
- `draftText`

ReferralOpportunity properties:
- `need`
- `reason`
- `urgency`
- `status`

## 14. Seed Demo Data

### Founder

Name: Maya Chen  
Company: Meshwave (integration platform, raising Series A)

### Contacts (four relationship types)

- Priya Iyer — Principal, Lattice Ventures — INVESTOR (deep live-companion flow)
- Raj Patel — VP Engineering, Northwind Logistics — CUSTOMER
- Aisha Bello — GTM Advisor — ADVISOR
- Sana Okafor — Senior Engineer (Legacy Systems Inc.) — CANDIDATE (founding-engineer)

### Primary Upcoming Meeting (investor)

Meeting id: `meeting-2026-06-20-priya`  
Date: 2026-06-20  
Time: 10:30 AM  
Purpose: Reconfirm diligence path and schedule the partner meeting

### Last Meeting (investor)

Date: 2026-04-08  
Key notes:
- Series A intro and integration-risk diligence.
- Priya flagged legacy WMS integration risk as the main diligence concern.
- Priya set a credible path-to-$10M-ARR bar before a term sheet.
- Maya promised to send the ROI deck and a migration case study.
- Priya can intro Maya to her partner Marcus for the next stage.

### Known Memory (investor, Priya)

Milestones/signals:
- Meshwave crossed $1.5M ARR since the last call (up 2x, ~$750k → $1.5M).

Concerns:
- Legacy WMS integration risk remains open — Priya needs proof a customer can migrate off a legacy WMS without a six-month project.
- Path to $10M ARR is her bar before a term sheet.

Promises/actions:
- Send the ROI deck + Northwind migration case study (promised last time).
- Draft a warm introduction to Diego (SE) for technical diligence.
- Request the partner meeting with Marcus once diligence clears.

Live Exa research delta (seeded baseline, real in `live` mode):
- Lattice announced a new AI-infrastructure thesis (legacy modernization focus).
- Priya posted about legacy-system modernization.

Relationship/partner graph:
- Marcus Reyes — Partner, Lattice Ventures — next-stage decision maker (warm path through Priya).
- Diego Alvarez — Meshwave Solutions Engineer — ran the Northwind legacy WMS migration; best match for technical diligence.
- Partner-meeting opportunity bridging Priya → Marcus → Diego.

### Cross-relationship-type seed (OS proof)

- Customer (Raj, Northwind): legacy WMS rewrite champion, integration budget approved, CFO wants a live migration demo before signing; Maya promised a live demo migrating a sample legacy WMS workflow.
- Advisor (Aisha): advisory sync to pressure-test the Series A narrative and pricing.
- Candidate (Sana): final-round systems-design and team-fit interview; background in legacy systems.

## 15. UX Requirements

UI implementation:
- Build responsive screens with Tailwind utility classes and shared React components.
- Prioritize clear, dense founder workflow surfaces over marketing-style pages.
- Use consistent status states for briefing, listening, captured memory, pending approval, approved, and ignored.
- Ensure laptop and mobile layouts preserve the same core workflow: dashboard, briefing, Q&A, meeting companion, and review.

### Dashboard

Purpose:
- Show Maya what is happening today across all four relationship types.

Must show:
- Upcoming meeting cards (investor, customer, advisor, candidate).
- Contact name and relationship type.
- Meeting time.
- Briefing status.
- Button to start briefing.

### Pre-Meeting Briefing Page

Purpose:
- Replace CRM digging with voice briefing and Q&A fused with live research.

Must show:
- Simple call/voice interface.
- Current contact and meeting.
- Transcript or briefing summary.
- Contact context panel.
- Exa research delta ("what changed since last time") with citations.
- Suggested questions.
- Relationship/partner panel when relevant.

### Q&A Page (L1.5)

Purpose:
- Answer-first adaptive memory display.

Must show:
- Natural-language answer.
- Adaptive visual mode (brief, cards, table, graph, timeline, recommendation, missing_info).
- Evidence/citations and research delta.

### Live Meeting Companion Page

Purpose:
- Listen during the meeting and support Maya silently.

Must show:
- Start/stop meeting capture.
- Live captions.
- Compact suggestion feed.
- Relevant memory cards.
- Live Exa counter-lookup results.
- Captured memory candidates.
- Clear "silent mode" behavior.

### Post-Meeting Review Page

Purpose:
- Convert meeting into follow-through.

Must show:
- Meeting summary.
- Proposed actions.
- Proposed memory updates.
- Referral/introduction drafts.
- Approve/edit/ignore controls.
- Updated graph preview.
- Clear indication that approval does not send a contact-facing message.

## 16. Demo Acceptance Criteria

The demo is successful if the presenter can complete this flow in under 5 minutes (demo meeting id `meeting-2026-06-20-priya`):

1. Open `/dashboard` and show upcoming meetings across all four relationship types, with the Priya investor meeting as the deep flow.
2. Start pre-meeting briefing.
3. Hear a spoken briefing with specific contact context and the Exa research delta (Lattice AI-infra thesis, $1.5M ARR milestone, integration-risk concern).
4. Ask a voice follow-up question and receive a grounded answer.
5. Show visual contact context (L1.5 adaptive display) and relationship/partner graph.
6. Start live meeting companion at `/live/[meetingId]`.
7. Run the supplied Priya dialogue through live capture.
8. See silent suggestions and relevant memory cards appear, including a live Exa counter-lookup.
9. See candidate memory and best-partner (Diego) recommendation generated.
10. End meeting and review follow-up actions.
11. Approve at least one action and one memory update (approval returns `founder_approval_required`; nothing is sent to the contact).
12. Open the contact profile and show updated memory/graph, then show briefing/Q&A working for at least one other relationship type (Raj, Aisha, or Sana).

Minimum demo content:
- 1 founder
- 4 contacts (investor, customer, advisor, candidate)
- 1 deep upcoming investor meeting + prior investor meeting
- 5+ memory items
- 2+ relationship/partner nodes
- 1+ referral/partner opportunity (Diego / Marcus)
- 3+ post-meeting actions

## 17. Risks And Mitigations

### Realtime Voice Reliability

Risk:
- Voice session may fail during demo.

Mitigation:
- Provide typed chat fallback.
- Provide scripted demo transcript fallback.
- Keep pre-fetched context visible even if voice fails.

### Live Research Reliability

Risk:
- Exa calls may fail or rate-limit during demo.

Mitigation:
- `RESEARCH_MODE=seeded` deterministic baseline keeps every surface intelligent.
- Live calls fall back to seeded/cached on any error with a clear indicator.
- Seeded intelligence is always layered beneath live research.

### Scope Creep

Risk:
- External integrations consume all build time.

Mitigation:
- Prioritize seeded calendar, web Realtime voice, Neo4j, Exa fusion, and the investor demo story first.
- Treat Telegram/OpenClaw/Vapi/WhatsApp as later phases, explicitly out of hackathon scope.
- Keep the four-relationship-type OS proof at briefing + adaptive Q&A level, with the investor (Priya) as the only deep live flow.

### Privacy And Consent

Risk:
- Meeting capture and passive chat profiling have consent/compliance implications.

Mitigation:
- Use synthetic demo data.
- Add visible consent/disclaimer language for demo.
- Keep founder approval before memory/action writebacks.
- Do not contact contacts automatically (`founder_approval_required`).

### Hallucinated Contact Facts

Risk:
- Assistant may invent details not in memory.

Mitigation:
- Pre-fetch context.
- Prompt assistant to answer only from provided contact memory and research evidence.
- Show source snippets/citations/timestamps.
- Prefer "I do not have that in memory" when unsupported.
- Exa citations make external claims auditable.

### Graph Complexity

Risk:
- Over-modeling slows MVP.

Mitigation:
- Start with a small graph schema.
- Add generic `Memory` nodes first, then specialized labels for high-value categories.

## 18. Success Metrics

For the hackathon:
- Demo flow completes without manual code changes.
- Founder can receive and interact with voice briefing fused with live research.
- Live meeting companion produces useful suggestions and at least one live Exa counter-lookup.
- Post-meeting flow creates credible actions and memory updates behind founder approval.
- Relationship/partner graph is visible and understandable (Priya → Marcus → Diego).
- The OS works across all four relationship types (investor, customer, advisor, candidate).
- Real Exa and real Neo4j are demonstrably load-bearing (not just the seeded fallback).

For future product validation:
- Reduction in time spent preparing for meetings.
- Increase in completed follow-ups.
- Increase in captured contact milestones, signals, and concerns.
- Increase in successful warm introductions/partner referrals.
- Founder-reported confidence before meetings.
- Contact-reported feeling of being remembered and understood.

## 19. Implementation Priority

### Must Build First

1. Seed Neo4j data for Maya and the four contacts (Priya investor arc primary).
2. Dashboard with seeded upcoming meetings across relationship types.
3. Contact context retrieval API (selected `DATA_MODE`).
4. Pre-meeting briefing page.
5. Realtime voice session for briefing/Q&A.
6. Exa research fusion in briefing (`RESEARCH_MODE`).
7. Contact context visual cards + L1.5 adaptive display.
8. Relationship/partner graph display.

### Must Build Second

1. Live meeting companion page (`/live/[meetingId]`).
2. Realtime transcript/caption stream.
3. Silent suggestion feed.
4. Live Exa counter-lookups.
5. Candidate memory extraction.
6. Best-partner recommendation (Diego).
7. Post-meeting review page.
8. Founder-approved memory/action writeback (`founder_approval_required`).

### Build If Time Allows

1. More polished graph exploration.
2. Google Calendar integration.
3. Telegram Q&A (L3).
4. Vapi outbound founder call (L4).
5. OpenClaw passive chat import (L3.1).
6. WhatsApp support (L5).

## 20. Open Questions

1. Should candidate memory updates be auto-saved for demo speed, or require explicit founder approval?
2. Should the live meeting transcript be visible, or should the UI only show suggestions and captured memory?
3. Does the hackathon judging criteria reward real external integrations (Exa, Neo4j) more than a complete end-to-end product story? (Assumed: both — real Exa + real Neo4j are load-bearing.)
4. Does the team prefer pure Neo4j memory, or a hybrid Neo4j plus higher-level memory library?
5. What minimum privacy/consent wording is acceptable for the demo?
6. Should the L3/L3.1/L3.2/L4/L5 channel levels be shown in the pitch as roadmap, or omitted entirely?

## 21. Definition Of Done For MVP

The MVP is done when:

- A user can run the app locally (zero-config path works without `.env.local`).
- Seed data exists for Maya and the four contacts (Priya investor arc primary).
- The dashboard shows upcoming meetings across all four relationship types.
- The pre-meeting voice briefing works or has a reliable fallback.
- Founder Q&A returns grounded answers from contact memory fused with Exa research.
- Visual context (L1.5 adaptive display) appears in the app.
- Live meeting companion can show silent suggestions and a live Exa counter-lookup.
- Candidate memory/partner updates can be generated.
- Post-meeting actions can be reviewed.
- Approved updates are reflected in the contact memory/graph (`founder_approval_required`; no outbound send).
- Real Neo4j and real Exa are demonstrably load-bearing, with seeded baselines as reliable fallback.

## 22. References

- OpenAI Realtime WebRTC guide: https://developers.openai.com/api/docs/guides/realtime-webrtc
- OpenAI Realtime conversations guide: https://developers.openai.com/api/docs/guides/realtime-conversations
- Exa documentation: https://docs.exa.ai
- Neo4j vector indexes: https://neo4j.com/docs/cypher-manual/current/indexes/semantic-indexes/vector-indexes/
- Visual Cortex Flow (pattern-memory concept): https://github.com/frenzy2004/Visual-Cortex-Flow
