import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`L1.5 Q&A check failed: ${message}`);
    process.exit(1);
  }
}

function readRequired(relativePath: string) {
  const absolutePath = join(root, relativePath);
  assert(existsSync(absolutePath), `${relativePath} does not exist`);
  return readFileSync(absolutePath, "utf8");
}

const qnaPage = readRequired("app/qna/[meetingId]/page.tsx");
const workspace = readRequired("components/memory-qna-workspace.tsx");
const adaptiveDisplay = readRequired("components/adaptive-memory-display.tsx");
const voiceBriefing = readRequired("components/voice-briefing.tsx");
const ui = readRequired("components/ui.tsx");
const dashboard = readRequired("app/dashboard/page.tsx");
const briefingPage = readRequired("app/briefing/[meetingId]/page.tsx");

assert(qnaPage.includes("getClientContextForMeeting"), "Q&A page must load meeting context");
assert(qnaPage.includes("MemoryQnaWorkspace"), "Q&A page must render MemoryQnaWorkspace");
assert(workspace.includes("/api/memory/query"), "Q&A workspace must call memory query API");
assert(workspace.includes("AdaptiveMemoryDisplay"), "Q&A workspace must render adaptive display");
assert(adaptiveDisplay.includes("CompactRelationshipGraph"), "Adaptive display must include graph renderer");
assert(adaptiveDisplay.includes("Relationship map"), "Graph renderer must show relationship-map copy");
assert(voiceBriefing.includes("Latest answer"), "Briefing must pin latest answer near the top");
assert(voiceBriefing.includes("Built-in Q&A context"), "Briefing must include Q&A context in the voice surface");
assert(voiceBriefing.includes("variant=\"compact\""), "Briefing must render a compact adaptive answer");
assert(ui.includes("/qna/meeting-2026-06-20-priya"), "Header nav must link Q&A route");
assert(dashboard.includes("Voice Briefing"), "Dashboard must expose the integrated voice briefing");
assert(!briefingPage.includes("Open Q&A-only view"), "Briefing page must not require opening Q&A-only view");

console.log("L1.5 Q&A check passed");
