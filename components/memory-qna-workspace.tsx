"use client";

import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { AdaptiveMemoryDisplay } from "@/components/adaptive-memory-display";
import type { ContactContext, MemoryQueryVisualResponse } from "@/lib/types";
import { Badge, EmptyState, Panel } from "./ui";

type HistoryItem = {
  id: string;
  query: string;
  displayMode: MemoryQueryVisualResponse["displayMode"];
  answer: string;
};

const demoPrompts = [
  "Summarize this contact.",
  "Who is connected to her?",
  "What follow ups are open?",
  "What did we discuss last time?",
  "Who should I introduce for diligence?"
];

export function MemoryQnaWorkspace({ context }: { context: ContactContext }) {
  const [draft, setDraft] = useState("");
  const [visualResponse, setVisualResponse] = useState<MemoryQueryVisualResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [queryingMemory, setQueryingMemory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitQuestion(question: string) {
    const clean = question.trim();
    if (!clean || queryingMemory) return;

    setQueryingMemory(true);
    setError(null);
    setDraft("");

    try {
      const response = await fetch("/api/memory/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: context.contact.id,
          query: clean
        })
      });

      const payload = (await response.json()) as MemoryQueryVisualResponse | { error?: string };
      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Unable to query contact memory.");
      }

      const memoryResponse = payload as MemoryQueryVisualResponse;
      setVisualResponse(memoryResponse);
      setHistory((current) => [
        {
          id: `${Date.now()}-${current.length}`,
          query: clean,
          displayMode: memoryResponse.displayMode,
          answer: memoryResponse.answer
        },
        ...current
      ]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Memory query failed.");
    } finally {
      setQueryingMemory(false);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-5">
        <Panel
          title="Ask contact memory"
          eyebrow="Q&A only"
          action={<Badge tone={queryingMemory ? "amber" : "signal"}>{queryingMemory ? "asking" : "ready"}</Badge>}
        >
          <form
            className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              void submitQuestion(draft);
            }}
          >
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              disabled={queryingMemory}
              placeholder={`Ask anything about ${context.contact.name}`}
              className="focus-ring min-h-12 min-w-0 rounded-full border border-line bg-paper px-4 py-3 text-sm text-ink placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={queryingMemory || !draft.trim()}
              className="focus-ring pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-signal px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-signal/80 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {queryingMemory ? "Asking" : "Ask"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            {demoPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void submitQuestion(prompt)}
                disabled={queryingMemory}
                className="focus-ring pressable inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3.5 py-2 text-left text-xs leading-5 text-ink transition-colors hover:border-signal/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5 text-signal" />
                {prompt}
              </button>
            ))}
          </div>

          {error ? (
            <div className="mt-4 rounded-[1rem] border border-rose/30 bg-rose/10 p-3 text-sm leading-6 text-ink">
              {error}
            </div>
          ) : null}
        </Panel>

        <AdaptiveMemoryDisplay
          response={visualResponse}
          variant="hero"
          title="Latest answer"
          emptyText="Ask a question above. The graph/table/recommendation appears here first, so nobody needs to scroll."
        />
      </div>

      <Panel title="Question history" eyebrow="Session">
        {history.length === 0 ? (
          <EmptyState>Asked questions will appear here after the first query.</EmptyState>
        ) : (
          <div className="space-y-3">
            {history.slice(0, 6).map((item) => (
              <article key={item.id} className="rounded-[1rem] border border-line bg-paper p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="cobalt">{item.displayMode}</Badge>
                  <p className="text-sm font-semibold text-ink">{item.query}</p>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-5 text-muted">{item.answer}</p>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </section>
  );
}
