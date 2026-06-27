"use client";

import { useMemo, useState } from "react";
import { Mic, Plus, Square, WandSparkles } from "lucide-react";
import { useLiveMeetingRecorder } from "@/hooks/use-live-meeting-recorder";
import { extractMeetingSignals } from "@/lib/demo-data";
import type { ContactContext, ExtractedMemory, SilentSuggestion, TranscriptEvent } from "@/lib/types";
import { Badge, EmptyState, Panel } from "./ui";
import { SuggestionFeed } from "./suggestion-feed";

const demoStatements = [
  "Congrats on the new AI-infrastructure thesis — legacy modernization being a focus is exactly where Meshwave plays.",
  "My concern is still the legacy WMS migration risk from April. I need to be sure a customer can migrate without a six-month project.",
  "If your solutions engineer can walk us through a real legacy cutover, that clears most of my concern.",
  "Please send me the ROI deck and the migration case study after this meeting."
];

export function MeetingCompanion({ context }: { context: ContactContext }) {
  const [events, setEvents] = useState<TranscriptEvent[]>([]);
  const [draft, setDraft] = useState("");

  const signals = useMemo(() => extractMeetingSignals(events), [events]);
  const suggestions: SilentSuggestion[] = signals.suggestions;
  const extracted: ExtractedMemory[] = signals.extracted;
  const recorder = useLiveMeetingRecorder({
    meetingId: context.upcomingMeeting.id,
    clientId: context.contact.id,
    onTranscript: (payload) => {
      if (payload.text) {
        addEvent(payload.text, "unknown");
      }
    }
  });

  function addEvent(text: string, speaker: TranscriptEvent["speaker"] = "contact") {
    const clean = text.trim();
    if (!clean) return;
    setEvents((current) => [
      ...current,
      {
        id: `event-${current.length + 1}`,
        speaker,
        text: clean,
        timestamp: new Date().toISOString()
      }
    ]);
    setDraft("");
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
      <Panel
        title="Live Meeting Companion"
        eyebrow="Silent mode"
        action={
          <Badge tone={recorder.isRecording ? "rose" : "neutral"}>
            {recorder.isRecording ? "listening" : "paused"}
          </Badge>
        }
      >
        <div className="grid gap-2 sm:grid-cols-[auto_auto_1fr]">
          <button
            type="button"
            onClick={() => void recorder.startRecording()}
            disabled={recorder.isStarting || recorder.isRecording}
            className="focus-ring pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-cobalt disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Mic className="h-4 w-4" />
            {recorder.isStarting ? "Starting" : "Start capture"}
          </button>
          <button
            type="button"
            onClick={() => void recorder.stopRecording()}
            disabled={!recorder.isRecording}
            className="focus-ring pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-panel px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-rose/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
          <button
            type="button"
            onClick={() => demoStatements.forEach((statement, index) => setTimeout(() => addEvent(statement), index * 180))}
            className="focus-ring pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-signal/30 bg-signal/10 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-signal/20"
          >
            <WandSparkles className="h-4 w-4" />
            Simulate meeting
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-[1.15rem] border border-line bg-paper p-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
              Mic level
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-signal transition-[width]"
                style={{ width: `${Math.round(recorder.audioLevel * 100)}%` }}
              />
            </div>
          </div>
          <div className="rounded-[1.15rem] border border-line bg-paper p-3">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
              Browser capture
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Microphone audio is buffered into WAV chunks, silence is skipped, and each chunk
              is posted to the meeting transcription endpoint before memory extraction.
            </p>
          </div>
        </div>

        {recorder.error ? (
          <div className="mt-3 rounded-[1.15rem] border border-rose/30 bg-rose/10 p-3 text-sm leading-6 text-ink">
            {recorder.error}
          </div>
        ) : null}

        <div className="mt-4 rounded-[1.2rem] border border-line bg-paper p-3 sm:p-4">
          <p className="text-sm font-semibold text-ink">
            Transcript stream for {context.contact.name}
          </p>
          <div className="mt-3 max-h-[360px] space-y-2 overflow-auto">
            {events.length === 0 ? (
              <EmptyState>Use simulation or add a line manually to trigger suggestions.</EmptyState>
            ) : (
              events.map((event) => (
                <article key={event.id} className="rounded-[1rem] border border-line bg-panel p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={event.speaker === "contact" ? "cobalt" : "neutral"}>{event.speaker}</Badge>
                    <span className="text-xs font-medium text-muted">
                      {new Date(event.timestamp).toLocaleTimeString("en-SG", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink">{event.text}</p>
                </article>
              ))
            )}
          </div>
        </div>

        <form
          className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            addEvent(draft);
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Type a meeting statement for demo capture"
            className="focus-ring min-h-11 min-w-0 rounded-full border border-line bg-panel px-4 py-2.5 text-sm text-ink placeholder:text-muted"
          />
          <button
            type="submit"
            className="focus-ring pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-signal/80"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </form>
      </Panel>

      <div className="space-y-5">
        <SuggestionFeed suggestions={suggestions} />
        <Panel title="Captured Memory" eyebrow="Candidate updates">
          {extracted.length === 0 ? (
            <EmptyState>Candidate memories appear after relevant transcript events.</EmptyState>
          ) : (
            <div className="space-y-3">
              {extracted.map((item) => (
                <article key={item.id} className="rounded-[1.15rem] border border-line bg-paper p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="signal">{item.category}</Badge>
                    <span className="text-xs font-medium text-muted">
                      {Math.round(item.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-ink">{item.summary}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">&quot;{item.sourceSnippet}&quot;</p>
                  <p className="mt-2 overflow-x-auto rounded-[0.85rem] bg-panel p-2 font-mono text-xs leading-5 text-muted">
                    {item.proposedGraphMutation}
                  </p>
                </article>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
