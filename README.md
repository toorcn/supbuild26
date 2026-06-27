# Forebrief

Forebrief is a founder relationship operating system — one memory for everyone a founder knows, fusing internal relationship memory with live external research so the founder never walks into a meeting cold, forgets important context, or misses a signal.

The app follows one founder through a meeting loop: a pre-meeting voice briefing that fuses what you already know with live research on what just changed, and a silent live companion that listens during the meeting, surfaces founder-only prompts, and captures useful facts.

## What it does

Forebrief runs one focused flow:

1. **`/`** — picks the next upcoming meeting and redirects to its briefing (or shows a message when the calendar is empty).
2. **`/briefing/[meetingId]`** — the pre-meeting briefing. The founder talks (or types) through the upcoming meeting; the assistant answers from internal memory fused with a live "what changed since last time" research delta.
3. **`/live/[meetingId]`** — the live meeting companion. It listens silently, shows live captions, surfaces founder-only prompts and relevant memory, runs live counter-lookups, recommends partners, and captures memory. It also shows the contact context panel and relationship graph. The older `/meeting/[meetingId]` route redirects here.

The same memory brain and agents are designed to work across relationship types — investors, customers, advisors, and candidates. The demo runs on an investor meeting.

## How it works

- **Pre-meeting briefing** uses OpenAI Realtime over browser WebRTC. The server mints a short-lived client secret; the browser never sees the API key. The assistant can call back into the app's memory query endpoint to answer from the contact's context fused with live research.
- **Live companion** captures meeting audio over Realtime and shows silent, founder-only prompts on screen. It can look up relevant memory, run a live counter-lookup, recommend a relevant partner, and capture durable facts (auto-saved, with duplicate protection) — without interrupting the human conversation.
- **Founder stays in control.** Follow-up actions are marked founder-approved on approval, and approval never sends contact-facing messages — it returns `founder_approval_required` with no outbound send. Human-in-the-loop governance is a feature, not a limit.

## Technologies

| Layer | Technology | Why |
| --- | --- | --- |
| App framework | Next.js App Router | Server-rendered pages and API routes in one app. |
| UI | React 19, TypeScript, Tailwind CSS, lucide-react | Fast, typed product surfaces with consistent iconography. |
| Voice briefing & live companion | OpenAI Realtime over browser WebRTC | Natural pre-meeting Q&A and silent in-meeting capture. |
| Live research | Exa neural web search | "What changed since last time" — live external intelligence fused with internal memory. |
| Memory | Neo4j graph database | Relationship memory is naturally graph-shaped: founder, contact, meetings, memories, actions, people, partners. |

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000 — it redirects to the next meeting's briefing.

The zero-config path works without any environment file: the app falls back to demo data and seeded research, so it runs with no external services configured.

## Optional environment

Copy `.env.example` to `.env.local` to enable the optional services:

```bash
cp .env.example .env.local
```

```bash
OPENAI_API_KEY=
OPENAI_REALTIME_MODEL=gpt-realtime-2
OPENAI_TRANSCRIBE_MODEL=whisper-1

EXA_API_KEY=
RESEARCH_MODE=live

DATA_MODE=demo
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=
```

- **OpenAI** — enables Realtime voice for the briefing and live companion. Without it, typed Q&A still works.
- **Exa** — enables live external research. Without it, a seeded baseline keeps briefings and lookups intelligent.
- **Neo4j** — enables graph-backed memory and writes. Without it, the app uses deterministic demo memory.

## Neo4j setup

When a local or Aura Neo4j database is available:

```bash
npm run check:neo4j
npm run seed:neo4j
```

- `check:neo4j` verifies the database connection.
- `seed:neo4j` writes the demo founder, contacts, meetings, memories, actions, and relationship graph.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Redirects to the next meeting's briefing, or shows a message when the calendar is empty. |
| `/briefing/[meetingId]` | Pre-meeting voice and typed Q&A, internal memory fused with the Exa research delta. |
| `/live/[meetingId]` | Live meeting companion: Realtime mic capture, captions, founder-only prompts, lookups, and memory capture. |
| `/meeting/[meetingId]` | Compatibility entry point to the live companion. |

## API routes

| Endpoint | Purpose |
| --- | --- |
| `POST /api/realtime/session` | Create a short-lived OpenAI Realtime client secret. |
| `POST /api/realtime/token` | Re-export of the `/api/realtime/session` handler. |
| `GET /api/demo/calendar` | Return the calendar data (used by the empty-calendar state). |
| `POST /api/memory/query` | Return a normalized memory response fused with the Exa research delta. |
| `POST /api/memory/search` | Search contact memory for live-companion tool calls. |
| `POST /api/partners/recommend` | Recommend a relevant partner for a concrete live need. |
| `GET /api/clients/[clientId]/context` | Read contact context. |
| `GET /api/clients/[clientId]/graph` | Read the relationship graph. |
| `POST /api/meetings/[meetingId]/transcribe` | Transcribe a meeting audio chunk when OpenAI is configured. |
| `POST /api/meetings/[meetingId]/extract` | Extract suggestions and candidate memories from transcript events. |
| `POST /api/meetings/[meetingId]/analyze` | Run live transcript analysis with OpenAI when configured. |
| `POST /api/meetings/[meetingId]/events` | Accept transcript events for compatibility. |
| `POST /api/memory/approve` | Save a founder-approved memory to Neo4j when configured. |
| `POST /api/actions/approve` | Mark a follow-up action as founder-approved. No outbound message is sent. |

## Verification

```bash
npm run lint
npm run check:data-source
npm run check:mvp
npm run build
```

Run Neo4j-specific checks only when Neo4j is configured:

```bash
npm run check:neo4j
npm run seed:neo4j
npm run check:neo4j-demo
```
