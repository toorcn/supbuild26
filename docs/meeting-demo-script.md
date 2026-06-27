# Forebrief Demo Script

Use this script to move through the demo while showcasing the full Forebrief loop: one memory for everyone the founder knows, fused with live external research (Exa), with the founder always in control.

Demo meeting id: `meeting-2026-06-20-priya`

Primary path:

1. `/` → redirects to the next meeting briefing
2. `/dashboard` → command center across all four relationship types
3. `/briefing/meeting-2026-06-20-priya` → investor briefing (internal memory + Exa delta)
4. `/qna/meeting-2026-06-20-priya` → adaptive Q&A (prove the OS across relationship types)
5. `/live/meeting-2026-06-20-priya` → silent live companion + Exa counter-lookups
6. `/post-meeting/meeting-2026-06-20-priya` → founder-gated review
7. `/client/contact-priya` → durable relationship memory

## 0. The One-Liner (open with this)

"Forebrief is one memory for everyone a founder knows — investors, customers, advisors, and candidates. The same agents brief you before a meeting, assist silently during it, and draft follow-ups after, fusing what you already know with live research on what just changed. The founder approves everything before anything goes out. It's how a 3-person team operates like a 30-person org."

## 1. Dashboard Opening — the OS is visible here

Open `/dashboard`.

Presenter:

"This is Maya Chen's dashboard. She's raising a Series A for Meshwave. Notice the system isn't a single-purpose tool — it holds every relationship type: Priya the investor, Raj the customer, Aisha the advisor, Sana the candidate. Same memory brain, same agents, different lens. This is the 'one memory for everyone' thesis made visible."

Point out:

- Next meeting is already prepped (Priya, investor follow-up).
- Each contact has a relationship type, and the research layer adapts to it.

If someone asks about reliability:

"The app runs from real Neo4j + real Exa when configured, with a seeded fallback so the same intelligence is available even if a service is down. For demo reliability, seeded intelligence is always layered beneath live research."

Click `Start briefing`.

## 2. Pre-Meeting Briefing — internal memory + Exa delta

Open `/briefing/meeting-2026-06-20-priya`.

Presenter:

"Before the call, Forebrief briefs Maya. But here's the difference from a CRM: it doesn't just recall what Maya already knows — it fuses that with what changed in the world since the last call."

Show the briefing:

- Internal memory: Priya flagged legacy WMS integration as the diligence risk last time; she set a $10M-ARR bar; Meshwave has since crossed $1.5M ARR.
- Exa delta (the new piece): Lattice just announced an AI-infrastructure thesis, and Priya posted about legacy-system modernization. A comparable company raised at ~18x ARR (anchoring ammo).

Presenter:

"So Maya walks in not just remembering the last call, but knowing that Priya's fund just pivoted toward exactly Meshwave's space. That's the external intelligence layer — Exa, searching the live web by meaning, domain-switched to investor signals."

If voice is configured, press the voice briefing control and say:

"What should I open with?"

Expected talking point:

"Open by acknowledging Lattice's AI-infra thesis, then move into the $1.5M ARR milestone and the migration story."

Then ask:

"What is still unresolved from the last call?"

Expected talking point:

"Legacy WMS integration risk — the gating diligence concern from April 8."

Click `Open Q&A-only view`.

## 3. Adaptive Q&A — proving the OS across relationship types

Open `/qna/meeting-2026-06-20-priya`.

Presenter:

"This is where the OS claim gets proven in software. The same memory query renders differently based on intent — and it works across every relationship type, not just investors."

First, run the investor queries in sequence:

- "Summarize this contact." → cards
- "Who is connected to her?" → graph (Priya → Marcus → partner meeting → Diego)
- "What follow ups are open?" → table
- "What happened last time?" → timeline
- "Who should I introduce?" → recommendation (Diego)
- "Does she have a brother?" → missing-info (no hallucination)

Then — the OS proof — switch to another relationship type. Navigate to a customer or candidate and ask the same kinds of questions:

Presenter:

"Same brain, same adaptive display, different relationship type. Ask about Raj the customer and you get his stakeholder graph and open deal risk. Ask about Sana the candidate and you get her work history and open equity question. The Exa layer switched its search domain automatically — investor theses for Priya, company news for Raj, public work for Sana. One system, four lenses."

Click `Open companion`.

## 4. Live Meeting Companion — silent, Exa-armed

Open `/live/meeting-2026-06-20-priya`.

Presenter:

"During the call, the companion listens silently. It never speaks to Priya. It surfaces prompts only to Maya, looks up relevant memory, and can run live Exa counter-lookups when a competitor or topic comes up."

Press `Start`.

Run the dialogue from `docs/priya-investor-dialogue-script.md`. Key beats:

- Maya opens on the Lattice AI-infra thesis (Exa-surfaced).
- Priya re-raises the legacy WMS migration risk.
- Maya offers a warm intro to Diego for technical diligence.
- Priya asks for the ROI deck + migration case study.

While speaking, point out:

- The caption area shows live transcript.
- The `Ask` panel shows silent suggested follow-up questions.
- The `Relevant` panel shows matching internal memory + partner recommendations, and can show live Exa counter-lookups (e.g. if a competitor is mentioned, a one-line counter surfaces).
- The `Saved` panel shows captured durable facts.
- `Save to memory` demonstrates the write path, with duplicate protection.

If Realtime or mic is unavailable:

"The app still demonstrates the same intelligence path with deterministic extraction and the review board. The boundary is the same: transcript signals become founder-only prompts, memory candidates, and follow-up actions."

Click `End and review`.

## 5. Post-Meeting Review — founder in control

Open `/post-meeting/meeting-2026-06-20-priya`.

Presenter:

"After the call, Forebrief does not blindly email investors or update records. Maya reviews what was captured."

Show these sections:

- Detected follow-up actions (send ROI deck, draft Diego intro, request Marcus partner meeting).
- Memory updates (integration diligence gating, Diego intro accepted).
- Recommended next best actions.
- Relationship memory visual.
- Prepared next interaction.

Click `Approve memory updates`, or approve one memory manually.

Presenter:

"Approval writes to Neo4j when configured. In demo mode, it marks the approval locally. Either way — nothing goes to Priya without Maya. The human-in-the-loop boundary is the point: agents do the work, the founder owns the send."

Click `View full memory`.

## 6. Contact Memory Page — durable relationship context

Open `/client/contact-priya`.

Presenter:

"This is the durable relationship surface. Maya can inspect what's known, what's open, the relationship timeline, the network graph, approved memories, and live research — all in one place."

Open each tab:

- `Timeline`: prior meeting evidence and dated context.
- `Network`: graph-shaped relationship memory (Priya → Marcus → partner meeting → Diego).
- `Memory`: approved or recent durable facts.
- `Open Work`: unresolved concerns and follow-ups stay visible.
- `Research`: the live Exa delta — what changed at Lattice since last time.

Closing line:

"Forebrief proves the complete loop: prepare before the meeting from internal memory fused with live research, assist silently during the meeting with Exa-armed counter-lookups, extract useful signals, keep the founder in control, and carry approved memory forward into the next interaction — across every relationship a founder has."

## Quick Back-And-Forth Route

Use this when time is short:

1. Dashboard: "One memory for investors, customers, advisors, candidates."
2. Briefing: "Internal memory + Exa delta on what changed at Lattice."
3. Q&A: "Same query renders as cards, graph, table, timeline, recommendation, or missing info — across all relationship types."
4. Live companion: "Founder-only prompts, Exa counter-lookups, memory capture."
5. Review: "Founder approval before any write or follow-up."
6. Contact page: "Approved memory + live research becomes durable relationship context."

## One-Minute Version

"Forebrief is one memory for everyone a founder knows. It starts before the meeting by briefing Maya from graph-shaped relationship memory fused with live Exa research — so she knows Lattice just announced an AI-infra thesis and Priya posted about legacy modernization since the last call. During the meeting, it listens silently, suggests founder-only prompts, runs live counter-lookups, and captures durable facts like the integration-risk concern and the Diego intro. Afterward, it prepares follow-ups and memory updates — but Maya must approve them before anything reaches an investor. The contact page then shows the durable result: timeline, relationship graph, approved memories, open work, and live research, ready for the next interaction."
