"use client";

import { useMemo, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { extractMeetingSignals } from "@/lib/demo-data";
import type { ActionItem, ContactContext, ExtractedMemory, TranscriptEvent } from "@/lib/types";
import { Badge, EmptyState, Panel } from "./ui";

type ApprovalNoticeState = {
  id: string;
  message: string;
  tone: "signal" | "amber" | "rose";
};

type MemoryApprovalResponse = {
  status?: string;
  memory?: ExtractedMemory;
  writeMode?: "neo4j" | "demo";
  saved?: boolean;
  reason?: string;
  error?: string;
};

type ActionApprovalResponse = {
  status?: ActionItem["status"];
  action?: ActionItem;
  sendMode?: string;
  error?: string;
};

const reviewTranscript: TranscriptEvent[] = [
  {
    id: "review-1",
    speaker: "contact",
    text: "My concern is still the legacy WMS migration risk from April. I need to be sure a customer can migrate without a six-month project.",
    timestamp: new Date().toISOString()
  },
  {
    id: "review-2",
    speaker: "contact",
    text: "If your solutions engineer can walk us through a real legacy cutover, that clears most of my concern.",
    timestamp: new Date().toISOString()
  },
  {
    id: "review-3",
    speaker: "founder",
    text: "I will send the ROI deck and migration case study and draft an introduction to Diego for technical diligence.",
    timestamp: new Date().toISOString()
  }
];

export function ReviewBoard({ context }: { context: ContactContext }) {
  const generated = useMemo(() => extractMeetingSignals(reviewTranscript).extracted, []);
  const summaryMemories = context.memories.slice().sort((a, b) => b.salience - a.salience).slice(0, 3);
  const openMemories = context.memories.filter((memory) => memory.status === "open").slice(0, 3);
  const [actionState, setActionState] = useState<ActionItem[]>(context.actions);
  const [memoryState, setMemoryState] = useState<ExtractedMemory[]>(generated);
  const [actionNotices, setActionNotices] = useState<Record<string, ApprovalNoticeState>>({});
  const [memoryNotices, setMemoryNotices] = useState<Record<string, ApprovalNoticeState>>({});
  const [pendingActions, setPendingActions] = useState<Set<string>>(() => new Set());
  const [pendingMemories, setPendingMemories] = useState<Set<string>>(() => new Set());
  const approvedActions = actionState.filter((action) => action.status === "approved").length;
  const approvedMemories = memoryState.filter((memory) => memory.id.startsWith("approved-")).length;

  async function approveAction(action: ActionItem) {
    if (pendingActions.has(action.id)) return;
    setPendingActions((current) => new Set(current).add(action.id));

    try {
      const response = await fetch("/api/actions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = (await response.json()) as ActionApprovalResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Action approval failed.");
      }

      markAction(action.id, "approved");
      setActionNotices((current) => ({
        ...current,
        [action.id]: {
          id: action.id,
          tone: "signal",
          message:
            data.sendMode === "founder_approval_required"
              ? "Approved for Maya's review queue. No contact-facing message was sent."
              : "Approved locally. No contact-facing transport is configured."
        }
      }));
    } catch (caught) {
      setActionNotices((current) => ({
        ...current,
        [action.id]: {
          id: action.id,
          tone: "rose",
          message: caught instanceof Error ? caught.message : "Action approval failed."
        }
      }));
    } finally {
      setPendingActions((current) => {
        const next = new Set(current);
        next.delete(action.id);
        return next;
      });
    }
  }

  function markAction(id: string, status: ActionItem["status"]) {
    setActionState((current) =>
      current.map((action) => (action.id === id ? { ...action, status } : action))
    );
  }

  async function approveMemory(memory: ExtractedMemory) {
    if (pendingMemories.has(memory.id) || memory.id.startsWith("approved-")) return;
    setPendingMemories((current) => new Set(current).add(memory.id));

    try {
      const response = await fetch("/api/memory/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memory })
      });
      const data = (await response.json()) as MemoryApprovalResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Memory approval failed.");
      }

      setMemoryState((current) =>
        current.map((item) => (item.id === memory.id ? { ...item, id: `approved-${item.id}` } : item))
      );
      setMemoryNotices((current) => ({
        ...current,
        [memory.id]: {
          id: memory.id,
          tone: data.writeMode === "neo4j" && data.saved ? "signal" : "amber",
          message:
            data.writeMode === "neo4j" && data.saved
              ? "Saved to memory."
              : `Approved for demo continuity. ${data.reason ?? "Persistent memory is not configured."}`
        }
      }));
    } catch (caught) {
      setMemoryNotices((current) => ({
        ...current,
        [memory.id]: {
          id: memory.id,
          tone: "rose",
          message: caught instanceof Error ? caught.message : "Memory approval failed."
        }
      }));
    } finally {
      setPendingMemories((current) => {
        const next = new Set(current);
        next.delete(memory.id);
        return next;
      });
    }
  }

  function ignoreMemory(id: string) {
    setMemoryState((current) => current.filter((memory) => memory.id !== id));
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <Panel title="Meeting Summary" eyebrow={context.contact.name}>
        <div className="space-y-3 text-sm leading-6 text-muted">
          <p>
            {summaryMemories.length > 0
              ? summaryMemories.map((memory) => memory.summary).join(" ")
              : "No high-salience memories are available from the selected data source."}
          </p>
          <p>
            {openMemories.length > 0
              ? `${context.founder.name} should review open items: ${openMemories
                  .map((memory) => memory.title)
                  .join(", ")}.`
              : `${context.founder.name} has no open memory items in the selected context.`}
          </p>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[1.15rem] border border-line bg-paper p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
              Actions approved
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold text-ink">{approvedActions}</p>
          </div>
          <div className="rounded-[1.15rem] border border-line bg-paper p-4">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
              Memories approved
            </p>
            <p className="mt-2 font-mono text-3xl font-semibold text-ink">{approvedMemories}</p>
          </div>
        </div>
      </Panel>

      <Panel title="Follow-Up Actions" eyebrow="Founder approval">
        <div className="divide-y divide-line overflow-hidden rounded-[1.2rem] border border-line bg-paper">
          {actionState.length === 0 ? (
            <EmptyState>No follow-up actions are available from the selected data source.</EmptyState>
          ) : null}
          {actionState.map((action) => {
            const notice = actionNotices[action.id];
            const pending = pendingActions.has(action.id);
            return (
              <article key={action.id} className="p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={action.status === "approved" ? "signal" : "amber"}>{action.status}</Badge>
                      <span className="text-xs font-medium text-muted">Due {action.dueAt}</span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold text-ink">{action.title}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void approveAction(action)}
                      disabled={pending}
                      className="focus-ring pressable rounded-full border border-signal/40 bg-signal/10 p-2 text-ink transition-colors hover:bg-signal/20 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`Approve ${action.title}`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => markAction(action.id, "pending")}
                      className="focus-ring pressable rounded-full border border-line bg-panel p-2 text-ink transition-colors hover:border-cobalt/40"
                      aria-label={`Edit ${action.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => markAction(action.id, "ignored")}
                      className="focus-ring pressable rounded-full border border-rose/30 bg-rose/10 p-2 text-ink transition-colors hover:bg-rose/20"
                      aria-label={`Ignore ${action.title}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {action.draftText ? (
                  <p className="mt-3 rounded-[1rem] bg-panel p-3 text-sm leading-6 text-muted">
                    {action.draftText}
                  </p>
                ) : null}
                {notice ? <ApprovalNotice notice={notice} /> : null}
              </article>
            );
          })}
        </div>
      </Panel>

      <Panel title="Memory Updates" eyebrow="Founder-approved proposals" className="xl:col-span-2">
        {memoryState.length === 0 ? (
          <EmptyState>All candidate memories have been ignored or cleared.</EmptyState>
        ) : (
          <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
            {memoryState.map((memory) => {
              const approved = memory.id.startsWith("approved-");
              const originalId = memory.id.replace(/^approved-/, "");
              const notice = memoryNotices[originalId];
              const pending = pendingMemories.has(memory.id);
              return (
                <article key={memory.id} className="rounded-[1.15rem] border border-line bg-paper p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={approved ? "signal" : "neutral"}>{approved ? "approved" : memory.category}</Badge>
                    <span className="text-xs font-medium text-muted">
                      {Math.round(memory.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-ink">{memory.summary}</p>
                  <p className="mt-1 text-sm leading-6 text-muted">&quot;{memory.sourceSnippet}&quot;</p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void approveMemory(memory)}
                      disabled={approved || pending}
                      className="focus-ring pressable inline-flex items-center justify-center gap-2 rounded-full bg-signal px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-signal/80 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      {pending ? "Approving" : approved ? "Approved" : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => ignoreMemory(memory.id)}
                      className="focus-ring pressable inline-flex items-center justify-center gap-2 rounded-full border border-line bg-panel px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-rose/40"
                    >
                      <X className="h-4 w-4" />
                      Ignore
                    </button>
                  </div>
                  {notice ? <ApprovalNotice notice={notice} /> : null}
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

function ApprovalNotice({ notice }: { notice: ApprovalNoticeState }) {
  const tones: Record<ApprovalNoticeState["tone"], string> = {
    signal: "border-signal/30 bg-signal/10 text-ink",
    amber: "border-amber/40 bg-amber/15 text-ink",
    rose: "border-rose/40 bg-rose/10 text-ink"
  };

  return (
    <p className={`mt-3 rounded-[1rem] border px-3 py-2 text-sm leading-6 ${tones[notice.tone]}`}>
      {notice.message}
    </p>
  );
}
