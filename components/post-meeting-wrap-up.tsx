"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Edit3,
  FileText,
  GitBranch,
  Lightbulb,
  Mail,
  MessageSquareText,
  Network,
  Sparkles,
  X
} from "lucide-react";
import type { ActionItem, ContactContext, ExtractedMemory, Meeting } from "@/lib/types";
import { Badge, EmptyState, SecondaryButton } from "./ui";

type NoticeTone = "signal" | "amber" | "rose" | "cobalt";
type MemoryStatus = "pending" | "approved" | "rejected";
type LocalActionStatus = ActionItem["status"] | "reminder" | "drafted";

type MemoryApprovalResponse = {
  writeMode?: "neo4j" | "demo";
  saved?: boolean;
  reason?: string;
  error?: string;
};

type WrapMemory = ExtractedMemory & {
  label: string;
  source: string;
  importance: "High" | "Medium" | "Low";
};

type FollowUpAction = {
  id: string;
  type: string;
  title: string;
  reason: string;
  priority: "High" | "Medium" | "Low";
  nextStep: string;
  dueAt?: string;
  draftText?: string;
};

type Recommendation = {
  id: string;
  title: string;
  why: string;
  priority: "High" | "Medium" | "Low";
};

const initialRecap =
  "The meeting centered on a company milestone, an unresolved integration need, and the contact wanting a clearer path forward. The founder promised a practical resource and should close the loop with a partner introduction while the topic is still fresh.";

export function PostMeetingWrapUp({ context, meeting }: { context: ContactContext; meeting: Meeting }) {
  const wrapMemories = useMemo(() => buildMemoryUpdates(context), [context]);
  const followUps = useMemo(() => buildFollowUps(context), [context]);
  const recommendations = useMemo(() => buildRecommendations(context, followUps), [context, followUps]);

  const [memoryStatus, setMemoryStatus] = useState<Record<string, MemoryStatus>>(() =>
    Object.fromEntries(wrapMemories.map((memory) => [memory.id, "pending"]))
  );
  const [actionStatus, setActionStatus] = useState<Record<string, LocalActionStatus>>({});
  const [notice, setNotice] = useState<{ id: string; tone: NoticeTone; message: string } | null>(null);
  const [pendingMemories, setPendingMemories] = useState<Set<string>>(() => new Set());
  const [recapEditing, setRecapEditing] = useState(false);
  const [recapText, setRecapText] = useState(initialRecap);
  const initialDraft = useMemo(() => buildFollowUpDraft(context, followUps), [context, followUps]);
  const [draftText, setDraftText] = useState(initialDraft);

  const approvedCount = Object.values(memoryStatus).filter((status) => status === "approved").length;
  const rejectedCount = Object.values(memoryStatus).filter((status) => status === "rejected").length;
  const activeActions = followUps;
  const endedAt = formatEndedAt(meeting);

  function showNotice(id: string, tone: NoticeTone, message: string) {
    setNotice({ id, tone, message });
  }

  async function approveMemory(memory: WrapMemory) {
    if (pendingMemories.has(memory.id) || memoryStatus[memory.id] === "approved") return;
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

      setMemoryStatus((current) => ({ ...current, [memory.id]: "approved" }));
      showNotice(
        memory.id,
        data.writeMode === "neo4j" && data.saved ? "signal" : "amber",
        data.writeMode === "neo4j" && data.saved
          ? "Saved to memory."
          : `Marked for save. ${data.reason ?? "Persistent memory is not configured."}`
      );
    } catch (caught) {
      showNotice(memory.id, "rose", caught instanceof Error ? caught.message : "Memory approval failed.");
    } finally {
      setPendingMemories((current) => {
        const next = new Set(current);
        next.delete(memory.id);
        return next;
      });
    }
  }

  function rejectMemory(id: string) {
    setMemoryStatus((current) => ({ ...current, [id]: "rejected" }));
    showNotice(id, "rose", "Memory update rejected.");
  }

  async function approveAllMemories() {
    const pending = wrapMemories.filter((memory) => memoryStatus[memory.id] === "pending");
    if (pending.length === 0) return;
    setPendingMemories((current) => {
      const next = new Set(current);
      pending.forEach((memory) => next.add(memory.id));
      return next;
    });

    try {
      const results = await Promise.all(
        pending.map(async (memory) => {
          const response = await fetch("/api/memory/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ memory })
          });
          return { id: memory.id, ok: response.ok };
        })
      );
      const approvedIds = results.filter((result) => result.ok).map((result) => result.id);
      setMemoryStatus((current) => ({
        ...current,
        ...Object.fromEntries(approvedIds.map((id) => [id, "approved" as const]))
      }));
      showNotice("memory-all", approvedIds.length === pending.length ? "signal" : "amber", `${approvedIds.length} memory update${approvedIds.length === 1 ? "" : "s"} marked for save.`);
    } catch {
      showNotice("memory-all", "rose", "Memory approval failed.");
    } finally {
      setPendingMemories((current) => {
        const next = new Set(current);
        pending.forEach((memory) => next.delete(memory.id));
        return next;
      });
    }
  }

  function markAction(id: string, status: LocalActionStatus, message: string) {
    setActionStatus((current) => ({ ...current, [id]: status }));
    showNotice(id, "signal", message);
  }

  async function copyRecap() {
    await navigator.clipboard?.writeText(recapText);
    showNotice("recap-copy", "signal", "Recap copied.");
  }

  async function copyDraft() {
    await navigator.clipboard?.writeText(draftText);
    showNotice("draft-copy", "signal", "Draft copied.");
  }

  return (
    <div className="space-y-5">
      <section className="surface-enter overflow-hidden rounded-[1.6rem] border border-line/80 bg-panel shadow-diffusion">
        <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="flex min-w-0 flex-col justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="signal">Meeting completed</Badge>
                <Badge tone="cobalt">AI-generated</Badge>
              </div>
              <h1 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
                The close-loop is ready for {context.contact.name}.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted sm:text-base sm:leading-7">
                AI captured new context, follow-up actions, and possible next steps. Review what matters,
                approve the memory, and leave the meeting with the next interaction already prepared.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void approveAllMemories()}
                className="focus-ring pressable inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-signal/40 bg-signal/10 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-signal/20"
              >
                <Sparkles className="h-4 w-4" />
                Approve memory updates
              </button>
            </div>
          </div>

          <div className="grid gap-3 rounded-[1.25rem] border border-line bg-paper/85 p-3 sm:grid-cols-2">
            <HeaderMetric label="Contact" value={context.contact.name} icon={<MessageSquareText className="h-4 w-4" />} />
            <HeaderMetric label="Founder" value={context.founder.name} icon={<Sparkles className="h-4 w-4" />} />
            <HeaderMetric label="Meeting" value={meeting.type} icon={<FileText className="h-4 w-4" />} />
            <HeaderMetric label="Ended" value={endedAt} icon={<Clock3 className="h-4 w-4" />} />
            <HeaderMetric label="Actions" value={`${activeActions.length} detected`} icon={<Bell className="h-4 w-4" />} />
            <HeaderMetric label="Memory" value={`${approvedCount}/${wrapMemories.length} saved`} icon={<Network className="h-4 w-4" />} />
          </div>
        </div>
        {notice ? <Notice tone={notice.tone}>{notice.message}</Notice> : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)_minmax(320px,0.8fr)]">
        <section className="surface-enter rounded-[1.6rem] border border-line/80 bg-panel p-4 shadow-diffusion sm:p-5">
          <SectionKicker icon={<FileText className="h-4 w-4" />} label="Generated meeting recap" />
          {recapEditing ? (
            <textarea
              value={recapText}
              onChange={(event) => setRecapText(event.target.value)}
              className="focus-ring mt-4 min-h-44 w-full resize-none rounded-[1rem] border border-line bg-paper p-3 text-sm leading-6 text-ink"
            />
          ) : (
            <p className="mt-4 text-base leading-7 text-ink">{recapText}</p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <TinyButton onClick={() => setRecapEditing((current) => !current)} icon={<Edit3 className="h-4 w-4" />}>
              {recapEditing ? "Done" : "Edit recap"}
            </TinyButton>
            <TinyButton onClick={() => void copyRecap()} icon={<Copy className="h-4 w-4" />}>
              Copy
            </TinyButton>
          </div>
        </section>

        <section className="surface-enter rounded-[1.6rem] border border-line/80 bg-panel p-4 shadow-diffusion sm:p-5 xl:row-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionKicker icon={<Bell className="h-4 w-4" />} label="Detected follow-up actions" />
            <Badge tone="amber">{activeActions.length} open</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {followUps.map((action, index) => {
              const status = actionStatus[action.id] ?? "pending";
              return (
                <article
                  key={action.id}
                  className="stagger-item rounded-[1.15rem] border border-line bg-paper p-3 transition-colors hover:border-cobalt/35"
                  style={{ "--index": index } as CSSProperties}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={priorityTone(action.priority)}>{action.type}</Badge>
                        <span className="text-xs font-semibold text-muted">{action.priority} priority</span>
                      </div>
                      <h2 className="mt-2 text-base font-semibold leading-snug text-ink">{action.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-muted">{action.reason}</p>
                    </div>
                    <StatusPill status={status} />
                  </div>
                  <p className="mt-3 rounded-[0.95rem] bg-panel px-3 py-2 text-sm leading-6 text-ink">
                    {action.nextStep}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <TinyLink
                      href={emailDraftHref(action.title, action.draftText ?? draftText)}
                      onClick={() => markAction(action.id, "drafted", "Email draft opened.")}
                      icon={<Mail className="h-4 w-4" />}
                    >
                      Open email draft
                    </TinyLink>
                    <TinyLink
                      href={calendarHref(action)}
                      onClick={() => markAction(action.id, "reminder", "Calendar reminder opened.")}
                      icon={<Bell className="h-4 w-4" />}
                    >
                      Add to calendar
                    </TinyLink>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="surface-enter rounded-[1.6rem] border border-line/80 bg-panel p-4 shadow-diffusion sm:p-5 xl:row-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionKicker icon={<Sparkles className="h-4 w-4" />} label="Memory updates" />
            <button
              type="button"
              onClick={() => void approveAllMemories()}
              className="focus-ring pressable rounded-full border border-signal/40 bg-signal/10 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-signal/20"
            >
              Approve all
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="neutral">{rejectedCount} rejected</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {wrapMemories.length === 0 ? (
              <EmptyState>No memory updates were detected.</EmptyState>
            ) : (
              wrapMemories.map((memory, index) => {
                const status = memoryStatus[memory.id] ?? "pending";
                const pending = pendingMemories.has(memory.id);
                return (
                  <article
                    key={memory.id}
                    className="stagger-item rounded-[1.15rem] border border-line bg-paper p-3 transition-colors"
                    style={{ "--index": index } as CSSProperties}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={status === "approved" ? "signal" : status === "rejected" ? "rose" : "neutral"}>
                        {status === "approved" ? "approved" : memory.category}
                      </Badge>
                      <span className="text-xs font-semibold text-muted">
                        {memory.importance} importance, {Math.round(memory.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-5 text-ink">{memory.summary}</p>
                    <p className="mt-2 rounded-[0.9rem] bg-panel px-3 py-2 text-sm leading-5 text-muted">
                      &quot;{memory.sourceSnippet}&quot;
                    </p>
                    <p className="mt-2 text-xs font-medium text-muted">Source: {memory.source}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <IconButton
                        label={pending ? "Approving" : "Approve"}
                        onClick={() => void approveMemory(memory)}
                        disabled={status === "approved" || pending}
                        icon={<Check className="h-4 w-4" />}
                        tone="signal"
                      />
                      <IconButton
                        label="Reject"
                        onClick={() => rejectMemory(memory.id)}
                        disabled={status === "rejected"}
                        icon={<X className="h-4 w-4" />}
                        tone="rose"
                      />
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="surface-enter rounded-[1.6rem] border border-line/80 bg-panel p-4 shadow-diffusion sm:p-5">
          <SectionKicker icon={<Lightbulb className="h-4 w-4" />} label="Recommended next best actions" />
          <div className="mt-4 space-y-3">
            {recommendations.map((item, index) => (
              <article key={item.id} className="stagger-item border-t border-line pt-3 first:border-t-0 first:pt-0" style={{ "--index": index } as CSSProperties}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
                  <h2 className="text-sm font-semibold text-ink">{item.title}</h2>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted">{item.why}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="surface-enter rounded-[1.6rem] border border-line/80 bg-panel p-4 shadow-diffusion sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionKicker icon={<Mail className="h-4 w-4" />} label="Follow-up draft" />
            <Badge tone="cobalt">editable</Badge>
          </div>
          <textarea
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            className="focus-ring mt-4 min-h-40 w-full resize-none rounded-[1.15rem] border border-line bg-paper p-3 text-sm leading-6 text-ink"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <TinyButton
              onClick={() => void copyDraft()}
              icon={<Copy className="h-4 w-4" />}
            >
              Copy draft
            </TinyButton>
            <TinyLink href={emailDraftHref("Follow-up from today's meeting", draftText)} onClick={() => showNotice("draft-email", "signal", "Email draft opened.")} icon={<Mail className="h-4 w-4" />}>
              Open email draft
            </TinyLink>
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="surface-enter rounded-[1.6rem] border border-line/80 bg-panel p-4 shadow-diffusion sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionKicker icon={<GitBranch className="h-4 w-4" />} label="Relationship memory visual" />
            <SecondaryButton href={`/briefing/${meeting.id}`} icon={<Network className="h-4 w-4" />}>
              Return to briefing
            </SecondaryButton>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-5">
            {buildMemoryPath(context, wrapMemories).map((item, index) => (
              <div key={item.title} className="stagger-item relative rounded-[1.1rem] border border-line bg-paper p-3" style={{ "--index": index } as CSSProperties}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cobalt/30 bg-cobalt/10 text-cobalt">
                  {item.icon}
                </div>
                <p className="mt-3 text-sm font-semibold leading-5 text-ink">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface-enter rounded-[1.6rem] border border-line/80 bg-panel p-4 shadow-diffusion sm:p-5">
          <SectionKicker icon={<CheckCircle2 className="h-4 w-4" />} label="Next interaction prepared" />
          <p className="mt-3 text-sm leading-6 text-muted">
            Next time, remember to check whether the contact reviewed the resource, whether the partner
            connection happened, and whether the original concern has been resolved.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              "Ask if the contact reviewed the integration guide.",
              "Confirm whether the partner introduction happened.",
              "Revisit the unresolved integration planning concern.",
              "Check if the contact feels clearer about the migration path."
            ].map((item) => {
              return (
                <div
                  key={item}
                  className="flex min-h-16 items-start gap-3 rounded-[1rem] border border-line bg-paper p-3 text-sm leading-5 text-muted"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
                  <span>{item}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function buildMemoryUpdates(context: ContactContext): WrapMemory[] {
  const openMemories = context.memories.filter((memory) => memory.status === "open").slice(0, 4);
  const actionMemories = context.actions.slice(0, 2).map((action, index): WrapMemory => ({
    id: `wrap-action-${action.id}`,
    contactId: context.contact.id,
    category: "Promise/Commitment",
    label: "Promise made",
    summary: `${context.founder.name} should close the loop on: ${action.title}.`,
    sourceSnippet: action.draftText ?? action.title,
    source: "Detected follow-up action",
    timestamp: new Date().toISOString(),
    confidence: index === 0 ? 0.91 : 0.84,
    importance: index === 0 ? "High" : "Medium",
    proposedGraphMutation: ""
  }));

  const memoryUpdates = openMemories.map((memory, index): WrapMemory => ({
    id: `wrap-memory-${memory.id}`,
    contactId: memory.contactId,
    category: memory.category,
    label: memory.title,
    summary: memory.summary,
    sourceSnippet: memory.sourceSnippet,
    source: memory.source,
    timestamp: new Date().toISOString(),
    confidence: memory.confidence,
    importance: index < 2 ? "High" : "Medium",
    proposedGraphMutation: ""
  }));

  return [...memoryUpdates, ...actionMemories].slice(0, 6);
}

function buildFollowUps(context: ContactContext): FollowUpAction[] {
  const actionCards = context.actions.map((action, index): FollowUpAction => ({
    id: action.id,
    type: action.actionType === "introduction" ? "Specialist opportunity" : index === 0 ? "Promise detected" : "Concern detected",
    title: action.title,
    reason: action.actionType === "introduction"
      ? "The contact has a concrete need that a trusted partner can help with."
      : action.draftText
        ? "The founder promised a concrete follow-up during the meeting."
        : "The meeting left an open item that should not wait until the next review.",
    priority: index === 0 ? "High" : index === 1 ? "Medium" : "Low",
    nextStep: action.actionType === "introduction"
      ? "Draft a warm introduction and let the founder choose the partner before sending."
      : action.draftText
        ? "Review the generated message and send it today while the meeting context is fresh."
        : "Create a dated reminder so this concern appears before the next contact interaction.",
    dueAt: action.dueAt,
    draftText: action.draftText
  }));

  if (actionCards.length > 0) return actionCards;

  return [
    {
      id: "fallback-guide",
      type: "Promise detected",
      title: "Send promised follow-up resource",
      reason: "The meeting created a clear follow-up that should be closed today.",
      priority: "High",
      nextStep: "Review the draft and send the resource after founder approval.",
      dueAt: "2026-06-21"
    }
  ];
}

function buildRecommendations(context: ContactContext, followUps: FollowUpAction[]): Recommendation[] {
  return [
    {
      id: "rec-send-resource",
      title: followUps[0]?.title ?? "Send promised resource today",
      why: "This is the clearest commitment from the conversation and protects trust after the meeting.",
      priority: "High"
    },
    {
      id: "rec-specialist",
      title: "Draft a warm partner introduction",
      why: `${context.contact.name} has an open need that should move from concern to concrete next step.`,
      priority: "Medium"
    },
    {
      id: "rec-check-in",
      title: "Schedule a follow-up check-in",
      why: "The unresolved concern should be revisited before it becomes stale.",
      priority: "Medium"
    }
  ];
}

function buildFollowUpDraft(context: ContactContext, followUps: FollowUpAction[]) {
  const firstAction = followUps[0]?.title.toLowerCase() ?? "send over the resource we discussed";
  const specialistAction = followUps.find((action) => action.type === "Specialist opportunity");
  return `Hi ${context.contact.name}, thank you for meeting today. As discussed, I will ${firstAction}. ${
    specialistAction ? "I can also prepare a warm partner introduction for the topic we covered. " : ""
  }I will keep the next check-in focused on whether this feels clearer and what support would be useful next.`;
}

function emailDraftHref(subject: string, body: string) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function calendarHref(action: FollowUpAction) {
  const { start, end } = calendarDates(action);
  const details = `${action.reason}\n\nSuggested next step: ${action.nextStep}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(action.title)}&dates=${start}/${end}&details=${encodeURIComponent(details)}`;
}

function calendarDates(action: FollowUpAction) {
  const isoDate = action.dueAt?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? "2026-06-21";
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return {
    start: `${year}${padDatePart(month)}${padDatePart(day)}`,
    end: `${next.getUTCFullYear()}${padDatePart(next.getUTCMonth() + 1)}${padDatePart(next.getUTCDate())}`
  };
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function buildMemoryPath(context: ContactContext, memories: WrapMemory[]) {
  const topMemory = memories[0]?.category ?? "Memory update";
  return [
    { title: context.contact.name, detail: "Contact context", icon: <MessageSquareText className="h-4 w-4" /> },
    { title: topMemory, detail: "New signal captured", icon: <Sparkles className="h-4 w-4" /> },
    { title: "Open planning need", detail: "Carried into next brief", icon: <FileText className="h-4 w-4" /> },
    { title: "Promise made", detail: "Follow-up ready", icon: <CheckCircle2 className="h-4 w-4" /> },
    { title: "Next check-in", detail: "Founder prompted", icon: <Bell className="h-4 w-4" /> }
  ];
}

function formatEndedAt(meeting: Meeting) {
  if (!meeting.endedAt) return "Just now";
  const value = meeting.endedAt;
  return new Intl.DateTimeFormat("en-SG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Singapore"
  }).format(new Date(value));
}

function priorityTone(priority: "High" | "Medium" | "Low") {
  if (priority === "High") return "rose" as const;
  if (priority === "Medium") return "amber" as const;
  return "neutral" as const;
}

function HeaderMetric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-[0.95rem] border border-line bg-panel/70 p-3">
      <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
        <span className="text-cobalt">{icon}</span>
        {label}
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

function SectionKicker({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
        <span className="text-cobalt">{icon}</span>
        {label}
      </div>
    </div>
  );
}

function TinyButton({ children, icon, onClick }: { children: ReactNode; icon: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring pressable inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-cobalt/40 hover:bg-panel"
    >
      {icon}
      {children}
    </button>
  );
}

function TinyLink({
  children,
  icon,
  href,
  onClick
}: {
  children: ReactNode;
  icon: ReactNode;
  href: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="focus-ring pressable inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-cobalt/40 hover:bg-panel"
    >
      {icon}
      {children}
    </a>
  );
}

function IconButton({
  label,
  icon,
  onClick,
  disabled = false,
  tone
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone: "signal" | "rose" | "neutral";
}) {
  const classes = {
    signal: "border-signal/40 bg-signal/10 hover:bg-signal/20",
    rose: "border-rose/35 bg-rose/10 hover:bg-rose/20",
    neutral: "border-line bg-panel hover:border-cobalt/40"
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`focus-ring pressable inline-flex min-h-9 items-center justify-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-ink transition-colors disabled:cursor-not-allowed disabled:opacity-55 ${classes[tone]}`}
    >
      {icon}
      {label}
    </button>
  );
}

function StatusPill({ status }: { status: LocalActionStatus }) {
  const tone = status === "ignored" ? "rose" : status === "pending" ? "amber" : "signal";
  const label = status === "reminder" ? "calendar opened" : status === "drafted" ? "draft opened" : status;
  return <Badge tone={tone}>{label}</Badge>;
}

function Notice({ tone, children }: { tone: NoticeTone; children: ReactNode }) {
  const tones: Record<NoticeTone, string> = {
    signal: "border-signal/30 bg-signal/10",
    amber: "border-amber/40 bg-amber/15",
    rose: "border-rose/40 bg-rose/10",
    cobalt: "border-cobalt/30 bg-cobalt/10"
  };

  return (
    <div className={`border-t px-4 py-3 text-sm font-medium text-ink sm:px-5 ${tones[tone]}`}>
      {children}
    </div>
  );
}
