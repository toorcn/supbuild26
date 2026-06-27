"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarClock, CheckCircle2, CircleHelp, Mic, Square, UserRound } from "lucide-react";
import { AdaptiveMemoryDisplay, CompactRelationshipGraph } from "@/components/adaptive-memory-display";
import type { ContactContext, MemoryQueryVisualResponse } from "@/lib/types";
import { Badge } from "./ui";

type Turn = {
  id: string;
  role: "assistant" | "founder" | "system";
  text: string;
  visual?: MemoryQueryVisualResponse | null;
};

type RealtimeStatus = "idle" | "connecting" | "connected" | "speaking" | "error";

type TokenResponse = {
  mode?: string;
  model?: string;
  value?: string | null;
  client_secret?: {
    value?: string | null;
    expires_at?: number | null;
  } | null;
  error?: string;
  detail?: string;
  message?: string;
};

const LIVE_PREFIX = "live-";
const realtimeCallsUrl = "https://api.openai.com/v1/realtime/calls";
const TEXT_REVEAL_DELAY_MS = 240;
const VISUAL_REVEAL_DELAY_MS = 900;
const AUTO_SCROLL_BOTTOM_GAP = 96;
const MIC_ERROR_ESCALATION_DELAY_MS = 2500;

function tryParseJSON(str: string) {
  const cleaned = str.trim();
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned);
  } catch {
    // Attempt simple repair for trailing commas or unclosed arrays/objects
    const openBraces = (cleaned.match(/\{/g) || []).length;
    const closeBraces = (cleaned.match(/\}/g) || []).length;
    const openBrackets = (cleaned.match(/\[/g) || []).length;
    const closeBrackets = (cleaned.match(/\]/g) || []).length;

    let repaired = cleaned;
    if (repaired.endsWith(",")) {
      repaired = repaired.slice(0, -1);
    }

    for (let i = 0; i < openBraces - closeBraces; i++) {
      repaired += "}";
    }
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
      repaired += "]";
    }

    try {
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}

function VisualChart({ data }: { data: { type?: string; title?: string; labels?: string[]; values?: number[] } }) {
  const type = data.type || "bar";
  const title = data.title || "Chart";
  const labels = data.labels || [];
  const values = data.values || [];
  const max = Math.max(...values, 1);

  if (type === "pie") {
    const total = values.reduce((a, b) => a + b, 0) || 1;
    const slices = values.map((val, idx) => {
      const percent = (val / total) * 100;
      const start = values.slice(0, idx).reduce((sum, v) => sum + (v / total) * 100, 0);
      return { label: labels[idx] || "", value: val, start, percent };
    });

    const colors = [
      "oklch(62% 0.16 250)", // cobalt/blue
      "oklch(62% 0.16 140)", // signal/green
      "oklch(67% 0.15 70)",  // amber/yellow
      "oklch(60% 0.15 20)",  // rose/red
      "oklch(50% 0.05 240)"  // neutral/gray
    ];

    return (
      <div className="mt-3 rounded-[1.1rem] border border-line bg-paper p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{title}</p>
        <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
          <div className="relative h-32 w-32 shrink-0 rounded-full" style={{
            background: `conic-gradient(${slices.map((slice, idx) => `${colors[idx % colors.length]} ${slice.start}% ${slice.start + slice.percent}%`).join(", ")})`
          }} />
          <div className="space-y-1.5">
            {slices.map((slice, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: colors[idx % colors.length] }} />
                <span className="font-semibold text-ink">{slice.label}:</span>
                <span className="text-muted">{slice.value} ({slice.percent.toFixed(0)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const barColors = [
    "bg-cobalt",
    "bg-signal",
    "bg-amber",
    "bg-rose",
    "bg-muted"
  ];

  return (
    <div className="mt-3 rounded-[1.1rem] border border-line bg-paper p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{title}</p>
      <div className="mt-4 space-y-3">
        {labels.map((label, idx) => {
          const val = values[idx] || 0;
          const pct = Math.min((val / max) * 100, 100);
          return (
            <div key={idx} className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-ink">{label}</span>
                <span className="text-muted">{val}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-panel overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColors[idx % barColors.length]}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VisualCards({ cards }: { cards: Array<{ title?: string; body?: string; eyebrow?: string; meta?: string }> }) {
  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {cards.map((card, idx) => (
        <div key={idx} className="rounded-[1.1rem] border border-line bg-paper p-3.5 shadow-soft transition hover:border-signal/30">
          {card.eyebrow ? (
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted">{card.eyebrow}</p>
          ) : null}
          {card.title ? (
            <p className="mt-1 text-sm font-semibold text-ink">{card.title}</p>
          ) : null}
          {card.body ? (
            <p className="mt-1 text-sm leading-5 text-muted">{card.body}</p>
          ) : null}
          {card.meta ? (
            <p className="mt-2 text-[0.68rem] text-muted">{card.meta}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function parseMarkdownTable(block: string) {
  const lines = block.trim().split("\n");
  if (lines.length < 2) return null;

  const parseRow = (line: string) => {
    return line
      .split("|")
      .map((cell) => cell.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
  };

  const headers = parseRow(lines[0]);
  if (!headers.length) return null;

  const secondRow = parseRow(lines[1]);
  const isSeparator = secondRow.length > 0 && secondRow.every((cell) => /^[:-]+$/.test(cell));
  if (!isSeparator) return null;

  const dataRows = lines.slice(2).map(parseRow).filter((row) => row.length > 0);

  return { headers, rows: dataRows };
}

function RenderedTable({ table }: { table: { headers: string[]; rows: string[][] } }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-[1.1rem] border border-line bg-paper">
      <table className="w-full text-left text-sm text-ink">
        <thead className="bg-panel border-b border-line text-xs font-semibold uppercase tracking-wider text-muted">
          <tr>
            {table.headers.map((h, i) => (
              <th key={i} className="px-4 py-2.5 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {table.rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-panel/50">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-4 py-2.5">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VisualGraph({ graph }: { graph: { nodes?: Array<{ id: string; label: string; type?: string; note?: string }>; edges?: Array<{ id: string; source: string; target: string; label?: string }> } }) {
  const formattedGraph = {
    nodes: (graph.nodes || []).map(n => ({
      id: n.id,
      label: n.label,
      type: (n.type || "Person") as "Founder" | "Contact" | "Person" | "Partner" | "Opportunity",
      note: n.note || ""
    })),
    edges: (graph.edges || []).map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label || ""
    }))
  };

  return <CompactRelationshipGraph graph={formattedGraph} hero={false} />;
}

function takeRevealChunk(text: string) {
  const newlineIndex = text.indexOf("\n");
  if (newlineIndex >= 0 && newlineIndex < 140) {
    return {
      chunk: text.slice(0, newlineIndex + 1),
      rest: text.slice(newlineIndex + 1)
    };
  }

  const sentence = text.match(/^([\s\S]{24,180}?[.!?])(\s+|$)/);
  if (sentence) {
    const length = sentence[0].length;
    return { chunk: text.slice(0, length), rest: text.slice(length) };
  }

  const words = text.match(/^(\S+\s*){1,6}/);
  if (words) {
    const length = words[0].length;
    return { chunk: text.slice(0, length), rest: text.slice(length) };
  }

  return { chunk: text, rest: "" };
}

function splitVisualTextUnits(text: string) {
  const cleaned = text.trim();
  if (!cleaned) return [];
  return cleaned.match(/[^.!?\n]+(?:[.!?]+|\n+|$)\s*/g) ?? [cleaned];
}

function visualStepCount(response: MemoryQueryVisualResponse) {
  const answerSteps = Math.max(splitVisualTextUnits(response.answer).length, response.answer.trim() ? 1 : 0);
  const graphSteps = response.graph ? Math.max(response.graph.nodes.length, 1) : 0;

  return Math.max(
    1,
    answerSteps +
      (response.missingInfo ? 1 : 0) +
      graphSteps +
      (response.cards?.length ?? 0) +
      (response.rows?.length ?? 0) +
      (response.actions?.length ?? 0) +
      response.citations.length +
      (response.warning ? 1 : 0)
  );
}

function visualResponseKey(response: MemoryQueryVisualResponse) {
  return [
    response.query,
    response.displayMode,
    response.answer,
    response.graph?.nodes.length ?? 0,
    response.cards?.length ?? 0,
    response.rows?.length ?? 0,
    response.actions?.length ?? 0,
    response.citations.length
  ].join("|");
}

function stagedVisualResponse(response: MemoryQueryVisualResponse, step: number): MemoryQueryVisualResponse {
  const answerUnits = splitVisualTextUnits(response.answer);
  const answerSteps = Math.max(answerUnits.length, response.answer.trim() ? 1 : 0);
  const visibleAnswer = answerUnits.length
    ? answerUnits.slice(0, Math.min(step, answerSteps)).join("").trim()
    : response.answer;

  let remaining = Math.max(0, step - answerSteps);
  const showMissingInfo = Boolean(response.missingInfo && remaining-- > 0);

  let graph = response.graph;
  if (response.graph) {
    const visibleNodeCount = Math.max(0, Math.min(response.graph.nodes.length, remaining));
    remaining = Math.max(0, remaining - response.graph.nodes.length);
    const nodes = response.graph.nodes.slice(0, visibleNodeCount);
    const nodeIds = new Set(nodes.map((node) => node.id));
    graph = nodes.length
      ? {
          nodes,
          edges: response.graph.edges.filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
        }
      : undefined;
  }

  const cardCount = Math.max(0, Math.min(response.cards?.length ?? 0, remaining));
  remaining = Math.max(0, remaining - (response.cards?.length ?? 0));
  const rowCount = Math.max(0, Math.min(response.rows?.length ?? 0, remaining));
  remaining = Math.max(0, remaining - (response.rows?.length ?? 0));
  const actionCount = Math.max(0, Math.min(response.actions?.length ?? 0, remaining));
  remaining = Math.max(0, remaining - (response.actions?.length ?? 0));
  const citationCount = Math.max(0, Math.min(response.citations.length, remaining));
  remaining = Math.max(0, remaining - response.citations.length);

  return {
    ...response,
    answer: visibleAnswer,
    missingInfo: showMissingInfo ? response.missingInfo : undefined,
    graph,
    cards: response.cards?.slice(0, cardCount),
    rows: response.rows?.slice(0, rowCount),
    actions: response.actions?.slice(0, actionCount),
    citations: response.citations.slice(0, citationCount),
    warning: remaining > 0 ? response.warning : undefined
  };
}

function ProgressiveAdaptiveMemoryDisplay({
  response,
  onRevealStep
}: {
  response: MemoryQueryVisualResponse;
  onRevealStep?: () => void;
}) {
  const [step, setStep] = useState(1);
  const totalSteps = visualStepCount(response);

  useEffect(() => {
    onRevealStep?.();
  }, [onRevealStep, step]);

  useEffect(() => {
    if (totalSteps <= 1) return;

    const timer = window.setInterval(() => {
      setStep((current) => {
        if (current >= totalSteps) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, VISUAL_REVEAL_DELAY_MS);

    return () => window.clearInterval(timer);
  }, [response, totalSteps]);

  return <AdaptiveMemoryDisplay response={stagedVisualResponse(response, step)} variant="compact" title="Latest answer" />;
}

function BriefingContextBoard({ context }: { context: ContactContext }) {
  const meetingTime = formatBriefingTime(context.upcomingMeeting.startsAt);
  const priorityMemories = context.memories
    .filter((memory) => memory.status === "open" || memory.status === "pending" || memory.salience >= 8)
    .sort((a, b) => b.salience - a.salience)
    .slice(0, 3);
  const openActions = context.actions
    .filter((action) => action.status === "pending" || action.status === "approved")
    .slice(0, 2);
  const suggestedQuestions = context.suggestedQuestions.slice(0, 2);

  return (
    <div className="mx-5 grid gap-3 border-b border-line/70 bg-paper/70 p-3 sm:mx-6 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] sm:p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-signal/25 bg-signal/10 text-signal">
            <UserRound className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-ink">{context.contact.name}</p>
            <p className="truncate text-xs leading-5 text-muted">
              {context.contact.role} · {context.contact.organization}
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-sm leading-5 text-ink">
          <GlanceLine
            icon={<CalendarClock className="h-3.5 w-3.5" />}
            label={meetingTime}
            body={context.upcomingMeeting.objective}
          />
          {openActions[0] ? (
            <GlanceLine
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              label="Open follow-up"
              body={openActions[0].title}
            />
          ) : null}
        </div>
      </div>

      <div className="min-w-0 rounded-lg border border-line/70 bg-panel/70 p-3">
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted">
          Built-in Q&A context
        </p>
        <div className="mt-2 space-y-2">
          {[...suggestedQuestions, ...priorityMemories.map((memory) => memory.title)]
            .slice(0, 3)
            .map((item, index) => (
              <div key={`${item}-${index}`} className="flex gap-2 text-sm leading-5 text-ink">
                <CircleHelp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" />
                <p className="line-clamp-2">{item}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function GlanceLine({
  icon,
  label,
  body
}: {
  icon: ReactNode;
  label: string;
  body: string;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2">
      <span className="mt-0.5 text-signal">{icon}</span>
      <p className="min-w-0">
        <span className="font-semibold text-ink">{label}</span>
        <span className="text-muted"> - </span>
        <span className="text-muted">{body}</span>
      </p>
    </div>
  );
}

function formatBriefingTime(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Singapore"
  }).format(new Date(value));
}

export function DynamicResponseContent({ text, isLiveTurn, speaking }: { text: string; isLiveTurn: boolean; speaking: boolean }) {
  if (!text) {
    return <p className="mt-2 text-base leading-7 text-ink">…</p>;
  }

  // Split text by markdown code blocks: ```[lang]\n[content]\n```
  const parts = text.split(/(```[\s\S]*?(?:```|$))/g);

  return (
    <div className="mt-2 space-y-3">
      {parts.map((part, index) => {
        if (part.startsWith("```")) {
          const match = part.match(/^```(\w*)\n([\s\S]*?)(?:```|$)/);
          const lang = match ? match[1].toLowerCase() : "";
          const content = match ? match[2] : part.replace(/^```\w*\n?/, "").replace(/```$/, "");

          if (lang === "chart") {
            const parsed = tryParseJSON(content);
            if (parsed) return <VisualChart key={index} data={parsed} />;
          }

          if (lang === "graph") {
            const parsed = tryParseJSON(content);
            if (parsed) return <VisualGraph key={index} graph={parsed} />;
          }

          if (lang === "cards" || lang === "card") {
            const parsed = tryParseJSON(content);
            if (parsed && Array.isArray(parsed)) return <VisualCards key={index} cards={parsed} />;
          }

          return (
            <pre key={index} className="overflow-x-auto rounded-lg bg-panel p-3 text-xs text-muted border border-line">
              <code>{content}</code>
            </pre>
          );
        }

        if (part.includes("|") && part.includes("-")) {
          const table = parseMarkdownTable(part);
          if (table) {
            return <RenderedTable key={index} table={table} />;
          }
        }

        const lines = part.split("\n");
        const listItems: string[] = [];
        const contentElements: ReactNode[] = [];

        const flushList = (key: string) => {
          if (listItems.length > 0) {
            contentElements.push(
              <ul key={key} className="my-2 ml-5 list-disc space-y-1.5 text-base leading-7 text-ink">
                {listItems.map((item, idx) => (
                  <li key={idx} className="marker:text-signal">{item}</li>
                ))}
              </ul>
            );
            listItems.length = 0;
          }
        };

        lines.forEach((line, lIdx) => {
          const trimmed = line.trim();
          const listMatch = trimmed.match(/^[-*]\s+(.*)$/);
          if (listMatch) {
            listItems.push(listMatch[1]);
          } else {
            flushList(`list-${index}-${lIdx}`);
            if (trimmed) {
              contentElements.push(
                <p key={`p-${index}-${lIdx}`} className="whitespace-pre-wrap text-base leading-7 text-ink">
                  {trimmed}
                </p>
              );
            }
          }
        });
        flushList(`list-final-${index}`);

        return <div key={index} className="space-y-1">{contentElements}</div>;
      })}
      {isLiveTurn && speaking ? (
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-ink align-middle" />
      ) : null}
    </div>
  );
}

export function VoiceBriefing({
  context,
  fillViewport = false
}: {
  context: ContactContext;
  fillViewport?: boolean;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const [statusText, setStatusText] = useState(
    "Tap to start. I'll talk you through it — just ask follow-ups out loud."
  );
  const [queryingMemory, setQueryingMemory] = useState(false);
  // Orb minimises once the agent has started responding at least once
  const [orbMinimised, setOrbMinimised] = useState(false);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const counterRef = useRef(0);
  const feedRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(false);
  const sessionRunRef = useRef(0);
  const scrollPinnedRef = useRef(true);
  const revealQueuesRef = useRef<Map<string, string>>(new Map());
  const revealTimersRef = useRef<Map<string, number>>(new Map());
  const receivedTextRef = useRef<Map<string, string>>(new Map());
  const revealedTextRef = useRef<Map<string, string>>(new Map());
  const completedTurnIdsRef = useRef<Set<string>>(new Set());
  const pendingVisualRef = useRef<MemoryQueryVisualResponse | null>(null);
  const pendingVisualSourceTurnIdRef = useRef<string | null>(null);
  const liveResponseIdRef = useRef<string | null>(null);
  const turnIdsByResponseIdRef = useRef<Map<string, string>>(new Map());
  // Track the ID of the current live turn so stale closures can target it
  const liveTurnIdRef = useRef<string | null>(null);
  const micErrorTimerRef = useRef<number | null>(null);

  const connected = status === "connected" || status === "speaking";
  const speaking = status === "speaking";
  const visibleTurns = turns.slice(-2);
  const showContextBoard = !orbMinimised && turns.length === 0;

  const phaseLabel =
    status === "error"
      ? "Mic issue"
      : status === "connecting"
        ? "Connecting"
        : speaking
          ? "Speaking"
          : connected
            ? "Listening"
            : "Ready";

  const closeRealtimeResources = useCallback(() => {
    channelRef.current?.close();
    channelRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current.remove();
      audioRef.current = null;
    }
    revealTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    revealTimersRef.current.clear();
    revealQueuesRef.current.clear();
    receivedTextRef.current.clear();
    revealedTextRef.current.clear();
    completedTurnIdsRef.current.clear();
    pendingVisualRef.current = null;
    pendingVisualSourceTurnIdRef.current = null;
    liveResponseIdRef.current = null;
    turnIdsByResponseIdRef.current.clear();
    liveTurnIdRef.current = null;
    if (micErrorTimerRef.current) {
      window.clearTimeout(micErrorTimerRef.current);
      micErrorTimerRef.current = null;
    }
  }, []);

  const clearMicErrorTimer = useCallback(() => {
    if (!micErrorTimerRef.current) return;
    window.clearTimeout(micErrorTimerRef.current);
    micErrorTimerRef.current = null;
  }, []);

  const showTransientMicIssue = useCallback(
    (message: string) => {
      clearMicErrorTimer();
      setStatusText("Brief connection hiccup - still trying.");
      micErrorTimerRef.current = window.setTimeout(() => {
        micErrorTimerRef.current = null;
        setStatus("error");
        setStatusText(message);
      }, MIC_ERROR_ESCALATION_DELAY_MS);
    },
    [clearMicErrorTimer]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sessionRunRef.current += 1;
      closeRealtimeResources();
    };
  }, [closeRealtimeResources]);

  const scrollFeedToBottom = useCallback(() => {
    const el = feedRef.current;
    if (!el || !scrollPinnedRef.current) return;
    window.requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, []);

  // Auto-scroll only while the advisor is already following the live bottom.
  useEffect(() => {
    scrollFeedToBottom();
  }, [scrollFeedToBottom, turns]);

  const handleFeedScroll = useCallback(() => {
    const el = feedRef.current;
    if (!el) return;
    const bottomGap = el.scrollHeight - el.scrollTop - el.clientHeight;
    scrollPinnedRef.current = bottomGap < AUTO_SCROLL_BOTTOM_GAP;
  }, []);

  // Generate a unique ID outside of any setState callback to avoid double-invoke issues
  function nextId(prefix: string) {
    counterRef.current += 1;
    return `${prefix}${counterRef.current}`;
  }

  // Append text that has passed through the paced reveal queue.
  const appendRevealedText = useCallback((id: string, delta: string) => {
    revealedTextRef.current.set(id, `${revealedTextRef.current.get(id) ?? ""}${delta}`);
    setTurns((current) => {
      return current.map((turn) =>
        turn.id === id ? { ...turn, text: `${turn.text}${delta}` } : turn
      );
    });
  }, []);

  const finishLiveTurnIfRevealed = useCallback((id: string) => {
    const queue = revealQueuesRef.current.get(id);
    if (queue || !completedTurnIdsRef.current.has(id)) return;
    if (liveTurnIdRef.current === id) {
      liveTurnIdRef.current = null;
      setTurns((current) => [...current]);
    }
  }, []);

  const scheduleReveal = useCallback(
    (id: string) => {
      if (revealTimersRef.current.has(id)) return;

      const timer = window.setTimeout(() => {
        revealTimersRef.current.delete(id);
        const queued = revealQueuesRef.current.get(id) ?? "";
        if (!queued) {
          finishLiveTurnIfRevealed(id);
          return;
        }

        const { chunk, rest } = takeRevealChunk(queued);
        revealQueuesRef.current.set(id, rest);
        appendRevealedText(id, chunk);

        if (rest) {
          scheduleReveal(id);
        } else {
          revealQueuesRef.current.delete(id);
          finishLiveTurnIfRevealed(id);
        }
      }, TEXT_REVEAL_DELAY_MS);

      revealTimersRef.current.set(id, timer);
    },
    [appendRevealedText, finishLiveTurnIfRevealed]
  );

  // Queue transcript text so large deltas/final transcripts reveal in readable steps.
  const enqueueLiveText = useCallback(
    (id: string, text: string) => {
      if (!text) return;
      revealQueuesRef.current.set(id, `${revealQueuesRef.current.get(id) ?? ""}${text}`);
      scheduleReveal(id);
    },
    [scheduleReveal]
  );

  const appendLiveDelta = useCallback(
    (id: string, delta: string) => {
      receivedTextRef.current.set(id, `${receivedTextRef.current.get(id) ?? ""}${delta}`);
      enqueueLiveText(id, delta);
    },
    [enqueueLiveText]
  );

  // Final transcripts sometimes arrive as one large event; reveal only the unseen suffix.
  const finaliseLiveTurn = useCallback(
    (id: string, finalText: string) => {
      if (!finalText) return;
      const receivedText = receivedTextRef.current.get(id) ?? "";
      if (!receivedText) {
        receivedTextRef.current.set(id, finalText);
        enqueueLiveText(id, finalText);
        return;
      }

      if (finalText.startsWith(receivedText) && finalText.length > receivedText.length) {
        const suffix = finalText.slice(receivedText.length);
        receivedTextRef.current.set(id, finalText);
        enqueueLiveText(id, suffix);
      }
    },
    [enqueueLiveText]
  );

  const attachVisualToTurn = useCallback((id: string, visual: MemoryQueryVisualResponse) => {
    setTurns((current) => {
      return current.map((turn) =>
        turn.id === id ? { ...turn, visual } : turn
      );
    });
  }, []);

  const attachPendingVisualToTurn = useCallback(
    (id: string) => {
      const visual = pendingVisualRef.current;
      if (!visual || pendingVisualSourceTurnIdRef.current === id) return;
      pendingVisualRef.current = null;
      pendingVisualSourceTurnIdRef.current = null;
      attachVisualToTurn(id, visual);
    },
    [attachVisualToTurn]
  );

  const responseIdFromEvent = useCallback((event: Record<string, unknown>) => {
    const directId = stringField(event.response_id);
    if (directId) return directId;
    const response =
      event.response && typeof event.response === "object" ? (event.response as Record<string, unknown>) : null;
    return response ? stringField(response.id) : "";
  }, []);

  const turnIdForEvent = useCallback(
    (event: Record<string, unknown>) => {
      const responseId = responseIdFromEvent(event);
      if (responseId) {
        const turnId = turnIdsByResponseIdRef.current.get(responseId);
        if (turnId) return turnId;
      }
      return liveTurnIdRef.current;
    },
    [responseIdFromEvent]
  );

  async function startRealtimeBriefing() {
    if (status === "connecting" || connected) return;
    const sessionRun = sessionRunRef.current + 1;
    sessionRunRef.current = sessionRun;
    const isCurrentSession = () => mountedRef.current && sessionRunRef.current === sessionRun;

    setStatus("connecting");
    setStatusText("Connecting…");
    clearMicErrorTimer();

    try {
      const tokenResponse = await fetch("/api/realtime/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voice: "alloy",
          instructions: buildRealtimeInstructions(context),
          tools: [queryClientMemoryTool],
          tool_choice: "auto"
        })
      });

      const token = (await tokenResponse.json()) as TokenResponse;
      const ephemeralKey = token.value ?? token.client_secret?.value;
      if (!tokenResponse.ok || !ephemeralKey) {
        throw new Error(token.detail ?? token.error ?? token.message ?? "Unable to create Realtime token.");
      }
      if (!isCurrentSession()) return;

      const peer = new RTCPeerConnection();
      if (!isCurrentSession()) {
        peer.close();
        return;
      }
      peerRef.current = peer;

      audioRef.current = document.createElement("audio");
      audioRef.current.autoplay = true;
      peer.ontrack = (event) => {
        if (isCurrentSession() && audioRef.current) audioRef.current.srcObject = event.streams[0];
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isCurrentSession()) {
        stream.getTracks().forEach((track) => track.stop());
        peer.close();
        return;
      }
      localStreamRef.current = stream;
      for (const track of stream.getAudioTracks()) peer.addTrack(track, stream);

      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;

      // Bind handler fresh at connection time; it uses only refs and stable setters/callbacks
      channel.onmessage = (event) => {
        if (isCurrentSession()) void handleRealtimeEvent(event.data);
      };
      channel.onerror = () => {
        if (!isCurrentSession()) return;
        showTransientMicIssue("The mic connection needs another tap.");
      };
      channel.onclose = () => {
        if (!isCurrentSession()) return;
        clearMicErrorTimer();
        setStatus((current) => (current === "error" ? current : "idle"));
        setStatusText("Realtime session closed.");
      };
      channel.onopen = () => {
        if (!isCurrentSession()) return;
        clearMicErrorTimer();
        setStatus("connected");
        setStatusText(`I'm listening — ask me anything about ${context.contact.name}.`);
        requestAssistantResponse(
          `Start with a brief warm greeting to ${context.founder.name}, then speak the prepared pre-meeting briefing for ${context.contact.name}. Then pause and wait for ${context.founder.name}'s voice follow-up questions.`
        );
      };

      const offer = await peer.createOffer();
      if (!isCurrentSession()) return;
      await peer.setLocalDescription(offer);
      if (!isCurrentSession()) return;

      const sdpResponse = await fetch(realtimeCallsUrl, {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp"
        }
      });

      if (!sdpResponse.ok) throw new Error(await sdpResponse.text());
      if (!isCurrentSession()) return;
      await peer.setRemoteDescription({ type: "answer", sdp: await sdpResponse.text() });
    } catch (caught) {
      if (!isCurrentSession()) return;
      stopRealtimeBriefing();
      setStatus("error");
      setStatusText(caught instanceof Error ? caught.message : "Realtime briefing failed.");
    }
  }

  function stopRealtimeBriefing() {
    sessionRunRef.current += 1;
    closeRealtimeResources();
    setStatus((current) => (current === "error" ? current : "idle"));
    setStatusText("Briefing ended. Tap to start again whenever you're ready.");
  }

  async function queryMemory(question: string) {
    setQueryingMemory(true);
    try {
      const response = await fetch("/api/memory/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: context.contact.id, query: question })
      });
      const payload = (await response.json()) as MemoryQueryVisualResponse | { error?: string };
      if (!response.ok) {
        throw new Error("error" in payload && payload.error ? payload.error : "Unable to query contact memory.");
      }
      return payload as MemoryQueryVisualResponse;
    } finally {
      setQueryingMemory(false);
    }
  }

  function requestAssistantResponse(instructions: string) {
    sendRealtimeEvent({
      type: "response.create",
      response: { instructions }
    });
  }

  function sendRealtimeEvent(payload: unknown) {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== "open") {
      setStatusText("Realtime data channel is not open yet.");
      return;
    }
    channel.send(JSON.stringify(payload));
  }

  async function handleRealtimeEvent(raw: string) {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return;
    }

    const type = typeof event.type === "string" ? event.type : "";
    const functionCall = extractFunctionCall(event);
    if (functionCall?.name === "query_client_memory") {
      await answerFunctionCall(functionCall);
      return;
    }

    if (type === "error") {
      const error = event.error as { message?: string } | undefined;
      showTransientMicIssue(error?.message ?? "The mic connection needs another tap.");
      return;
    }

    if (type === "response.created") {
      clearMicErrorTimer();
      setStatus("speaking");
      setOrbMinimised(true);
      // Generate the new turn ID *outside* setTurns to avoid double-invoke issues
      const newId = nextId(LIVE_PREFIX);
      const responseId = responseIdFromEvent(event);
      liveTurnIdRef.current = newId;
      liveResponseIdRef.current = responseId || null;
      if (responseId) turnIdsByResponseIdRef.current.set(responseId, newId);
      revealQueuesRef.current.set(newId, "");
      receivedTextRef.current.set(newId, "");
      revealedTextRef.current.set(newId, "");
      completedTurnIdsRef.current.delete(newId);
      setTurns((current) => [
        ...current,
        { id: newId, role: "assistant", text: "" }
      ]);
      return;
    }

    if (
      type === "response.output_text.delta" ||
      type === "response.audio_transcript.delta" ||
      type === "response.output_audio_transcript.delta" ||
      type === "response.text.delta"
    ) {
      const delta = typeof event.delta === "string" ? event.delta : "";
      const id = turnIdForEvent(event);
      if (id && delta) {
        appendLiveDelta(id, delta);
        attachPendingVisualToTurn(id);
      }
      return;
    }

    if (
      type === "response.audio_transcript.done" ||
      type === "response.output_audio_transcript.done" ||
      type === "response.text.done" ||
      type === "response.output_text.done"
    ) {
      const finalText = typeof event.transcript === "string" ? event.transcript : "";
      const id = turnIdForEvent(event);
      if (id && finalText) finaliseLiveTurn(id, finalText);
      return;
    }

    if (type === "response.done") {
      clearMicErrorTimer();
      const responseId = responseIdFromEvent(event);
      const id = turnIdForEvent(event);
      if (id) {
        attachPendingVisualToTurn(id);
        completedTurnIdsRef.current.add(id);
        finishLiveTurnIfRevealed(id);
      }
      if (responseId) turnIdsByResponseIdRef.current.delete(responseId);
      if (responseId && liveResponseIdRef.current === responseId) liveResponseIdRef.current = null;
      setStatus("connected");
      setStatusText(`I'm listening — ask me anything about ${context.contact.name}.`);
    }
  }

  async function answerFunctionCall(functionCall: { callId: string; name: string; argumentsJson: string }) {
    let parsed: { query?: string };
    try {
      parsed = JSON.parse(functionCall.argumentsJson) as { query?: string };
    } catch {
      parsed = {};
    }

    const query = parsed.query?.trim();
    if (!query) {
      sendFunctionOutput(functionCall.callId, { error: "Missing query argument.", displayMode: "missing_info" });
      requestAssistantResponse(`Tell ${context.founder.name} the memory query tool was called without a query.`);
      return;
    }

    try {
      const response = await queryMemory(query);
      pendingVisualRef.current = response;
      pendingVisualSourceTurnIdRef.current = liveTurnIdRef.current;
      sendFunctionOutput(functionCall.callId, response);
      requestAssistantResponse(
        `Answer ${context.founder.name} from the query_client_memory tool output. If displayMode is missing_info, mention the suggested next step.`
      );
    } catch (caught) {
      sendFunctionOutput(functionCall.callId, {
        error: caught instanceof Error ? caught.message : "Memory query failed."
      });
      requestAssistantResponse(`Briefly tell ${context.founder.name} the memory query failed.`);
    }
  }

  function sendFunctionOutput(callId: string, output: unknown) {
    sendRealtimeEvent({
      type: "conversation.item.create",
      item: { type: "function_call_output", call_id: callId, output: JSON.stringify(output) }
    });
  }

  const sectionClass = fillViewport
    ? "surface-enter flex min-h-0 flex-1 flex-col overflow-hidden rounded-[0.55rem] border border-line bg-paper shadow-soft"
    : "surface-enter sticky top-3 flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden rounded-[0.55rem] border border-line bg-paper shadow-soft";
  const headerClass = fillViewport
    ? "flex shrink-0 items-center justify-between gap-3 border-b border-line bg-panel px-5 py-3 sm:px-6"
    : "flex items-center justify-between gap-3 border-b border-line bg-panel p-5 sm:p-6";
  const largeOrbClass = fillViewport
    ? "flex shrink-0 flex-col items-center px-5 pb-4 pt-4 text-center sm:px-6"
    : "flex flex-col items-center px-5 pb-5 pt-5 text-center sm:px-6";

  return (
    <section className={sectionClass}>
      {/* Floating minimised orb — fixed to top-right of the section */}
      {orbMinimised && (
        <div className="absolute right-4 top-4 z-20 flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => (connected ? stopRealtimeBriefing() : void startRealtimeBriefing())}
            aria-label={connected ? "Stop briefing" : "Start briefing"}
              className="focus-ring pressable relative flex h-14 w-14 items-center justify-center rounded-xl shadow-lg"
          >
            {connected && (
              <>
                <span className="voice-ring absolute inset-0 rounded-full bg-signal/25" />
                <span className="voice-ring voice-ring--delay absolute inset-0 rounded-full bg-signal/20" />
              </>
            )}
            <span
              className={`relative flex h-12 w-12 items-center justify-center rounded-xl border text-paper transition-colors ${
                status === "error"
                  ? "border-rose/40 bg-rose"
                  : connected
                    ? "border-signal/40 bg-ink voice-breathe"
                    : status === "connecting"
                      ? "border-line bg-ink/80 voice-breathe"
                      : "border-line bg-ink"
              }`}
            >
              {speaking ? (
                <span className="flex items-end gap-0.5" aria-hidden>
                  {[0, 1, 2].map((bar) => (
                    <span
                      key={bar}
                      className="voice-bar w-1 rounded-full bg-paper"
                      style={{ height: "14px", animationDelay: `${bar * 120}ms` }}
                    />
                  ))}
                </span>
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </span>
          </button>
          <Badge tone={status === "error" ? "rose" : connected ? "signal" : "neutral"}>
            {phaseLabel}
          </Badge>
        </div>
      )}

      {/* Header row */}
      <div className={headerClass}>
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted">
          Voice briefing
        </p>
        {!orbMinimised && (
          <Badge tone={status === "error" ? "rose" : connected ? "signal" : "neutral"}>
            {phaseLabel}
          </Badge>
        )}
      </div>

      {showContextBoard ? <BriefingContextBoard context={context} /> : null}

      {/* Large orb — shown until the agent first responds */}
      {!orbMinimised && (
        <div className={largeOrbClass}>
          <button
            type="button"
            onClick={() => (connected ? stopRealtimeBriefing() : void startRealtimeBriefing())}
            aria-label={connected ? "Stop briefing" : "Start briefing"}
            className="focus-ring pressable relative flex h-28 w-28 items-center justify-center rounded-2xl sm:h-32 sm:w-32"
          >
            {connected && (
              <>
                <span className="voice-ring absolute inset-0 rounded-full bg-signal/25" />
                <span className="voice-ring voice-ring--delay absolute inset-0 rounded-full bg-signal/20" />
              </>
            )}
            <span
              className={`relative flex h-24 w-24 items-center justify-center rounded-2xl border text-paper transition-colors sm:h-28 sm:w-28 ${
                status === "error"
                  ? "border-rose/40 bg-rose"
                  : connected
                    ? "border-signal/40 bg-ink voice-breathe"
                    : status === "connecting"
                      ? "border-line bg-ink/80 voice-breathe"
                      : "border-line bg-ink"
              }`}
            >
              {speaking ? (
                <span className="flex items-end gap-1.5" aria-hidden>
                  {[0, 1, 2, 3, 4].map((bar) => (
                    <span
                      key={bar}
                      className="voice-bar h-8 w-1.5 rounded-full bg-paper"
                      style={{ animationDelay: `${bar * 120}ms` }}
                    />
                  ))}
                </span>
              ) : (
                <Mic className="h-9 w-9" />
              )}
            </span>
          </button>

          <p className="mt-3 text-base font-semibold tracking-tight text-ink">{phaseLabel}</p>
          <p className="mt-1 max-w-md text-sm leading-6 text-muted">{statusText}</p>

          {connected && (
            <button
              type="button"
              onClick={stopRealtimeBriefing}
              className="focus-ring pressable mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-[0.4rem] border border-line bg-paper px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-rose/50"
            >
              <Square className="h-4 w-4" />
              End briefing
            </button>
          )}
        </div>
      )}

      {/* Streaming output area — shows agent responses with text + rich visual inline */}
      <div
        ref={feedRef}
        onScroll={handleFeedScroll}
        className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-8"
        style={{ scrollbarWidth: "thin" }}
      >
        {turns.length === 0 && !queryingMemory ? (
          /* Empty state — shown before agent speaks */
          <div className="flex h-20 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm text-muted">
              {status === "connecting"
                ? "Connecting to your briefing assistant…"
                : status === "error"
                  ? "Mic needs another tap if it does not recover."
                  : "The opening brief will appear here as it is spoken."}
            </p>
          </div>
        ) : (
          <div className="grid content-start gap-4">
            {visibleTurns.map((turn, index) => {
              const isLast = index === visibleTurns.length - 1;
              const isLiveTurn = turn.id === liveTurnIdRef.current;

              if (turn.role === "founder") {
                return (
                  <div
                    key={turn.id}
                    className="caption-enter ml-auto w-fit max-w-[85%] rounded-[0.45rem] bg-cobalt/10 px-4 py-2.5 text-right text-sm leading-6 text-ink"
                  >
                    <span className="block text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-muted">
                      {context.founder.name}
                    </span>
                    {turn.text}
                  </div>
                );
              }

              if (turn.role === "system") {
                return (
                  <div
                    key={turn.id}
                    className="caption-enter rounded-[0.45rem] border border-amber/30 bg-amber/10 px-4 py-2.5 text-sm leading-6 text-ink"
                  >
                    {turn.text}
                  </div>
                );
              }

              /* Agent turn — streams transcript text; visual content (table, graph, cards) renders inline below */
              return (
                <div key={turn.id} className="caption-enter space-y-3">
                  {/* Text stream */}
                  {(turn.text || (isLast && connected)) ? (
                    <div className="rounded-[0.5rem] border border-line bg-panel p-4 sm:p-5">
                      <span className="text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-muted">
                        {isLiveTurn && speaking ? "Speaking now" : "Agent"}
                      </span>
                      <DynamicResponseContent
                        text={turn.text}
                        isLiveTurn={isLiveTurn}
                        speaking={speaking}
                      />
                    </div>
                  ) : null}

                  {/* Rich visual output — table, graph, cards, timeline rendered inline */}
                  {turn.visual ? (
                    <div className="caption-enter">
                      <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted">
                        Latest answer
                      </p>
                      <ProgressiveAdaptiveMemoryDisplay
                        key={visualResponseKey(turn.visual)}
                        response={turn.visual}
                        onRevealStep={scrollFeedToBottom}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}

            {queryingMemory && (
              <div className="caption-enter flex items-center gap-2 rounded-xl border border-line bg-paper px-4 py-3 text-sm text-muted">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" />
                Querying contact memory…
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function extractFunctionCall(event: Record<string, unknown>) {
  const type = typeof event.type === "string" ? event.type : "";
  if (type === "response.function_call_arguments.done") {
    return {
      callId: stringField(event.call_id),
      name: stringField(event.name),
      argumentsJson: stringField(event.arguments)
    };
  }

  const item =
    event.item && typeof event.item === "object" ? (event.item as Record<string, unknown>) : null;
  if (type === "response.output_item.done" && item?.type === "function_call") {
    return {
      callId: stringField(item.call_id),
      name: stringField(item.name),
      argumentsJson: stringField(item.arguments)
    };
  }

  return null;
}

function stringField(value: unknown) {
  return typeof value === "string" ? value : "";
}

const queryClientMemoryTool = {
  type: "function",
  name: "query_client_memory",
  description:
    "Query the founder's contact memory graph for contact-specific facts, follow-ups, relationships, referral recommendations, or missing information.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The founder's contact-specific memory question."
      }
    },
    required: ["query"],
    additionalProperties: false
  }
};

function buildRealtimeInstructions(context: ContactContext) {
  return [
    "You are Forebrief, a founder-only pre-meeting voice assistant for a startup founder.",
    `You are briefing ${context.founder.name} before a meeting with ${context.contact.name} (${context.contact.relationshipType}).`,
    "Use only the contact memory context below. Do not invent facts.",
    "Call query_client_memory for contact-specific follow-up questions, introductions, relationships, actions, timelines, or missing information.",
    "If the tool returns missing_info, say what is missing and suggest the next step from the tool output.",
    "Keep answers concise, specific, and action-oriented.",
    "Never speak to or message the contact directly.",
    "The briefing page no longer opens a separate Q&A-only view. Treat suggestedQuestions, open actions, salient memories, and relationship graph context as built-in Q&A preparation for the voice briefing.",
    "For the opening briefing, include the contact, meeting objective, one personal opener, unresolved/open items, and the top one or two useful questions the founder should be ready to ask.",
    "Begin the spoken opening briefing with a brief, warm greeting to the founder before the substantive briefing.",
    `Do not tell ${context.founder.name} to open another view for Q&A context.`,
    "",
    "CRITICAL VISUAL DIRECTIVE FOR TEXT OUTPUT:",
    "Your audio output must remain conversational, professional, and descriptive.",
    "However, your text output must NEVER contain conversational greetings, introductory filler, or spoken dialogue (e.g. do NOT output 'Sure, I can help with that' or 'Here is the allocation').",
    "Instead, your text response must consist ONLY of the corresponding structured visual representation of what is being spoken, using the most suitable format below:",
    "",
    "1. Bulleted Summary: If you are explaining a concept or speaking conversationally (such as the opening greeting/briefing), your text output must consist ONLY of a simple bulleted summary of the key points of what you are saying (e.g., lines starting with '- ').",
    "2. Tables: If you are presenting structured status, dates, or comparisons, output ONLY a standard markdown table. E.g.",
    "| Task | Due | Status |",
    "|---|---|---|",
    "| Will Update | 2026-06-30 | Pending |",
    "3. Cards: If you are presenting distinct memories, topics, or notes, output ONLY a code block with language 'cards' containing a JSON array. E.g.",
    "```cards",
    "[",
    "  {\"title\": \"Will Update\", \"eyebrow\": \"Concern\", \"body\": \"Needs to update will soon.\", \"meta\": \"Source: meeting\"}",
    "]",
    "```",
    "4. Charts: If you are presenting allocations, metrics, or financial breakdowns, output ONLY a code block with language 'chart' containing a JSON object. E.g.",
    "```chart",
    "{",
    "  \"type\": \"bar\" | \"pie\",",
    "  \"title\": \"Asset Allocation\",",
    "  \"labels\": [\"Equities\", \"Bonds\", \"Cash\"],",
    "  \"values\": [60, 30, 10]",
    "}",
    "```",
    "5. Graphs: If you are presenting family connections, relationships, or specialist networks, output ONLY a code block with language 'graph' containing a JSON object. E.g.",
    "```graph",
    "{",
    "  \"nodes\": [",
    "    {\"id\": \"node1\", \"label\": \"Maya\", \"type\": \"Founder\", \"note\": \"Meshwave founder\"},",
    "    {\"id\": \"node2\", \"label\": \"Priya\", \"type\": \"Contact\", \"note\": \"Principal, Lattice Ventures\"}",
    "  ],",
    "  \"edges\": [",
    "    {\"id\": \"edge1\", \"source\": \"node1\", \"target\": \"node2\", \"label\": \"manages\"}",
    "  ]",
    "}",
    "```",
    "Prepared opening briefing:",
    context.briefing,
    "",
    "External research delta:",
    context.researchDelta
      ? JSON.stringify(context.researchDelta, null, 2)
      : "No external research delta is available for this contact.",
    "",
    "Built-in Q&A preparation prompts:",
    JSON.stringify(context.suggestedQuestions, null, 2),
    "",
    "Contact memory context JSON:",
    JSON.stringify(
      {
        founder: context.founder,
        contact: context.contact,
        upcomingMeeting: context.upcomingMeeting,
        lastMeeting: context.lastMeeting,
        memories: context.memories,
        actions: context.actions,
        graph: context.graph,
        researchDelta: context.researchDelta,
        suggestedQuestions: context.suggestedQuestions
      },
      null,
      2
    )
  ].join("\n");
}
