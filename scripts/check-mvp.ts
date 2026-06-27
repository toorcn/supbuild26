import assert from "node:assert/strict";
import { POST as approveAction } from "../app/api/actions/approve/route";
import { POST as approveMemory } from "../app/api/memory/approve/route";
import { POST as extractMeeting } from "../app/api/meetings/[meetingId]/extract/route";
import { POST as transcribeMeeting } from "../app/api/meetings/[meetingId]/transcribe/route";
import { actions, extractMeetingSignals } from "../lib/demo-data";
import type { ExtractedMemory, TranscriptEvent } from "../lib/types";

const meetingId = "meeting-2026-06-20-priya";

async function main() {
  checkExtractionHelper();
  await checkExtractRoute();
  await checkActionApprovalRoute();
  await checkMemoryApprovalRoute();
  await checkTranscriptionValidation();
  console.log("MVP checks passed");
}

function checkExtractionHelper() {
  const signals = extractMeetingSignals(demoEvents());
  assert.equal(signals.suggestions.some((item) => item.id === "suggest-integration"), true);
  assert.equal(signals.suggestions.some((item) => item.id === "suggest-diego"), true);
  assert.equal(signals.extracted.some((item) => item.category === "Unresolved Concern"), true);
  assert.equal(signals.extracted.some((item) => item.category === "Referral Opportunity"), true);
  assert.equal(signals.extracted.some((item) => item.category === "Follow-Up Action"), true);
}

async function checkExtractRoute() {
  const response = await extractMeeting(jsonRequest({ events: demoEvents() }), {
    params: Promise.resolve({ meetingId })
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.meetingId, meetingId);
  assert.equal(payload.extracted.some((item: ExtractedMemory) => item.category === "Follow-Up Action"), true);
}

async function checkActionApprovalRoute() {
  const missing = await approveAction(jsonRequest({}));
  assert.equal(missing.status, 400);

  const response = await approveAction(jsonRequest({ action: actions[0] }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.status, "approved");
  assert.equal(payload.sendMode, "founder_approval_required");
}

async function checkMemoryApprovalRoute() {
  const missing = await approveMemory(jsonRequest({}));
  assert.equal(missing.status, 400);

  const memory = extractMeetingSignals(demoEvents()).extracted.find((item) => item.category === "Unresolved Concern");
  assert.ok(memory);
  const response = await approveMemory(jsonRequest({ memory }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.status, "approved");
  assert.equal(payload.memory.id, memory.id);
  assert.equal(typeof payload.writeMode, "string");
  assert.equal(typeof payload.saved, "boolean");
}

async function checkTranscriptionValidation() {
  const badMeeting = await transcribeMeeting(new Request("http://mvp.test/transcribe", { method: "POST" }), {
    params: Promise.resolve({ meetingId: "bad-id" })
  });
  assert.equal(badMeeting.status, 404);

  const emptyForm = new FormData();
  const missingAudio = await transcribeMeeting(
    new Request("http://mvp.test/transcribe", { method: "POST", body: emptyForm }),
    { params: Promise.resolve({ meetingId }) }
  );
  assert.equal(missingAudio.status, 400);

  const previousApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    const form = new FormData();
    form.set("audio", new File([new Uint8Array(1024)], "chunk.wav", { type: "audio/wav" }));
    const response = await transcribeMeeting(
      new Request("http://mvp.test/transcribe", { method: "POST", body: form }),
      { params: Promise.resolve({ meetingId }) }
    );
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.match(payload.warning, /OPENAI_API_KEY/);
  } finally {
    if (previousApiKey) process.env.OPENAI_API_KEY = previousApiKey;
  }
}

function demoEvents(): TranscriptEvent[] {
  return [
    {
      id: "e1",
      speaker: "contact",
      text: "My concern is still the legacy WMS migration risk from April. I need to be sure a customer can migrate without a six-month project.",
      timestamp: "2026-06-20T10:35:00+08:00"
    },
    {
      id: "e2",
      speaker: "contact",
      text: "Please introduce me to Diego for technical diligence and send the ROI deck.",
      timestamp: "2026-06-20T10:36:00+08:00"
    }
  ];
}

function jsonRequest(body: unknown) {
  return new Request("http://mvp.test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
