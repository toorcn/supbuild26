"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Check, Lightbulb, Mic, Save, Sparkles, Square, Users } from "lucide-react";
import type {
  ContactContext,
  ExtractedMemory,
  LiveAnalysisResponse,
  LiveMemorySearchResponse,
  LiveMemorySearchResult,
  LivePartnerRecommendation,
  LivePartnerRecommendationResponse,
  MemoryCategory,
  SaveMemoryResult,
  SilentSuggestion,
  TranscriptTurn
} from "@/lib/types";
import { InfoTabs, type InfoTab } from "./info-tabs";
import { Badge, EmptyState } from "./ui";

type RealtimeStatus = "idle" | "connecting" | "connected" | "error";

type TokenResponse = {
  value?: string | null;
  client_secret?: { value?: string | null } | null;
  error?: string;
  detail?: string;
  message?: string;
};

const realtimeCallsUrl = "https://api.openai.com/v1/realtime/calls";
const ANALYZE_DEBOUNCE_MS = 1500;
const CAPTION_TTL_MS = 7000;
const MIN_TURNS_BEFORE_SUGGESTIONS = 3;
const MIN_WORDS_BEFORE_SUGGESTIONS = 18;
const SUGGESTION_COOLDOWN_MS = 20000;
const PARTNER_COOLDOWN_MS = 30000;
const CAPTURE_MIN_CONFIDENCE = 0.72;
const EMOTIONAL_CAPTURE_MIN_CONFIDENCE = 0.85;
const MEMORY_CATEGORIES: MemoryCategory[] = [
  "Milestone",
  "Signal",
  "Unresolved Concern",
  "Goal/Objective",
  "Promise/Commitment",
  "Relationship Mention",
  "Referral Opportunity",
  "Follow-Up Action"
];

type CaptionSpeaker = TranscriptTurn["speaker"];
type ActiveCaption = {
  id: string;
  key: string;
  speaker: CaptionSpeaker;
  text: string;
};

type CaptionRow = {
  key: string;
  speaker: CaptionSpeaker;
  text: string;
};

type RealtimeToolCall = {
  callId: string;
  name: string;
  args: Record<string, unknown>;
};

type LiveSearchEntry = LiveMemorySearchResponse & {
  id: string;
  at: string;
};

type LivePartnerEntry = LivePartnerRecommendationResponse & {
  id: string;
  at: string;
};

type SaveToast = {
  id: string;
  text: string;
  tone: "signal" | "amber" | "rose";
};

function signatureOf(memory: ExtractedMemory) {
  return `${memory.category}::${memory.summary}`.toLowerCase();
}

function latestTurnCaption(turns: TranscriptTurn[]) {
  for (let index = turns.length - 1; index >= 0; index--) {
    const turn = turns[index];
    const text = turn.text.trim();
    if (text) return { id: turn.id, speaker: turn.speaker, text };
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function realtimeEventText(event: Record<string, unknown>) {
  const delta = event.delta;
  if (typeof delta === "string") return delta;
  const transcript = event.transcript;
  if (typeof transcript === "string") return transcript;
  const text = event.text;
  if (typeof text === "string") return text;
  const itemTranscript = asRecord(event.item).transcript;
  return typeof itemTranscript === "string" ? itemTranscript : "";
}

function realtimeEventItemId(event: Record<string, unknown>) {
  const itemId = event.item_id;
  if (typeof itemId === "string" && itemId) return itemId;
  const nestedItemId = asRecord(event.item).id;
  if (typeof nestedItemId === "string" && nestedItemId) return nestedItemId;
  const eventId = event.event_id;
  if (typeof eventId === "string" && eventId) return eventId;
  const id = event.id;
  return typeof id === "string" && id ? id : "";
}

function realtimeFunctionCallId(event: Record<string, unknown>) {
  const callId = event.call_id;
  if (typeof callId === "string" && callId) return callId;
  const item = asRecord(event.item);
  const itemCallId = item.call_id;
  if (typeof itemCallId === "string" && itemCallId) return itemCallId;
  const outputIndex = event.output_index;
  const itemId = event.item_id;
  if (typeof itemId === "string" && itemId) return itemId;
  return typeof outputIndex === "number" ? `output-${outputIndex}` : "";
}

function realtimeFunctionName(event: Record<string, unknown>) {
  const name = event.name;
  if (typeof name === "string") return name;
  const itemName = asRecord(event.item).name;
  return typeof itemName === "string" ? itemName : "";
}

function realtimeFunctionArguments(event: Record<string, unknown>) {
  const direct = event.arguments;
  if (typeof direct === "string") return direct;
  const nested = asRecord(event.item).arguments;
  return typeof nested === "string" ? nested : "";
}

function parseToolArguments(raw: string) {
  try {
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function normalizeMemoryCategory(value: unknown): MemoryCategory {
  return MEMORY_CATEGORIES.includes(value as MemoryCategory) ? (value as MemoryCategory) : "Milestone";
}

function clampConfidence(value: unknown) {
  return typeof value === "number" ? Math.max(0, Math.min(1, value)) : 0.75;
}

function normalizedSuggestionText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(value: string) {
  return normalizedSuggestionText(value).split(" ").filter(Boolean).length;
}

function isOpeningSmallTalk(value: string) {
  const normalized = normalizedSuggestionText(value);
  if (!normalized) return true;
  const hasGreeting = /\b(hello|hi|hey|good morning|good afternoon|good evening)\b/.test(normalized);
  const hasIdentityCheck = /\b(is this|am i speaking|speaking to|mr|mrs|ms|miss)\b/.test(normalized);
  return normalized.length < 80 && (hasGreeting || hasIdentityCheck);
}

function suggestionSimilarity(left: string, right: string) {
  const leftWords = new Set(normalizedSuggestionText(left).split(" ").filter((word) => word.length > 2));
  const rightWords = new Set(normalizedSuggestionText(right).split(" ").filter((word) => word.length > 2));
  if (leftWords.size === 0 || rightWords.size === 0) return 0;
  let overlap = 0;
  for (const word of leftWords) {
    if (rightWords.has(word)) overlap += 1;
  }
  return overlap / Math.min(leftWords.size, rightWords.size);
}

function shouldAcceptSuggestion(
  suggestion: SilentSuggestion,
  turns: TranscriptTurn[],
  currentSuggestions: SilentSuggestion[],
  lastAcceptedAt: number
) {
  const spokenText = turns.map((turn) => turn.text).join(" ");
  const substantiveTurns = turns.filter((turn) => wordCount(turn.text) >= 4);
  if (substantiveTurns.length < MIN_TURNS_BEFORE_SUGGESTIONS || wordCount(spokenText) < MIN_WORDS_BEFORE_SUGGESTIONS) {
    return { accepted: false, reason: "Wait for more substantive conversation before suggesting questions." };
  }
  if (turns.slice(-2).some((turn) => isOpeningSmallTalk(turn.text))) {
    return { accepted: false, reason: "Opening greeting or identity check is not enough for a founder prompt." };
  }
  const title = normalizedSuggestionText(suggestion.title);
  const reason = normalizedSuggestionText(suggestion.reason);
  if (/(identify|identity|confirm|caller|recipient|reached|speaking to)/.test(`${title} ${reason}`)) {
    return { accepted: false, reason: "Identity-confirmation prompts are suppressed during live companion warmup." };
  }
  if (Date.now() - lastAcceptedAt < SUGGESTION_COOLDOWN_MS) {
    return { accepted: false, reason: "Suggestion cooldown is active." };
  }
  if (currentSuggestions.some((item) => suggestionSimilarity(item.title, suggestion.title) >= 0.65)) {
    return { accepted: false, reason: "Similar suggestion already shown." };
  }
  return { accepted: true, reason: "" };
}

function hasPartnerNeedSignal(value: string) {
  return /\b(lawyer|legal|will|estate|probate|trust|doctor|physician|medical|health|screening|underwriting|insurance|tax|accountant|specialist|referral|introduction|introduce|succession)\b/i.test(
    value
  );
}

function shouldAcceptPartnerLookup(
  need: string,
  sourceSnippet: string,
  turns: TranscriptTurn[],
  currentEntries: LivePartnerEntry[],
  lastAcceptedAt: number
) {
  const recentText = turns.slice(-5).map((turn) => turn.text).join(" ");
  const signalText = `${need} ${sourceSnippet} ${recentText}`;
  if (turns.slice(-2).some((turn) => isOpeningSmallTalk(turn.text)) && !hasPartnerNeedSignal(signalText)) {
    return { accepted: false, reason: "Opening greeting or identity check is not enough for a partner recommendation." };
  }
  if (!hasPartnerNeedSignal(signalText)) {
    return { accepted: false, reason: "No concrete specialist, referral, legal, medical, tax, or estate need detected." };
  }
  if (Date.now() - lastAcceptedAt < PARTNER_COOLDOWN_MS) {
    return { accepted: false, reason: "Partner recommendation cooldown is active." };
  }
  if (currentEntries.some((entry) => suggestionSimilarity(entry.need, need) >= 0.65)) {
    return { accepted: false, reason: "Similar partner need already surfaced." };
  }
  return { accepted: true, reason: "" };
}

function hasStrongEmotionalSignal(value: string) {
  return /\b(worried|concerned|anxious|stressed|overwhelmed|hesitant|frustrated|upset|relieved|excited|uncertain|afraid|nervous|confident|uncomfortable)\b/i.test(
    value
  );
}

function isGenericPositiveGreeting(value: string) {
  const normalized = normalizedSuggestionText(value);
  return /\b(i am|i m|i'm|doing|feeling|am)\s+(good|fine|okay|ok|well|great)\b/.test(normalized) ||
    /\b(what about you|how are you|how about you|nice to meet|good morning|good afternoon|good evening)\b/.test(normalized);
}

function isGenericTopicRecap(value: string) {
  const normalized = normalizedSuggestionText(value);
  const recap =
    /\b(last time|previously|prior|before|brought the conversation back|we were talking|we ve been talking|we have been talking|we discussed|for review)\b/.test(
      normalized
    );
  const durableSignal =
    /\b(i|we|my|our)\s+(want|need|plan|intend|decided|committed|promised|worry|worries|am worried|are worried|haven t|have not|can t|cannot|would like)\b/.test(
      normalized
    ) ||
    /\b(new|changed|accepted|graduated|married|divorced|moved|passed away|funding round|fundraise|term sheet|deal closed|renewal|integration|migration|diligence|hiring|candidate|advisor|investor intro|introduction|referral)\b/.test(
      normalized
    );
  return recap && !durableSignal;
}

function hasDurableCaptureSignal(memory: ExtractedMemory) {
  const text = `${memory.summary} ${memory.sourceSnippet}`;
  if (memory.category === "Signal") return hasStrongEmotionalSignal(text);
  if (memory.category === "Referral Opportunity") return hasPartnerNeedSignal(text);
  if (memory.category === "Relationship Mention") {
    return /\b(wife|husband|spouse|partner|daughter|son|child|children|family|brother|sister|mother|father|business partner|executor|beneficiary)\b/i.test(
      text
    );
  }
  if (memory.category === "Promise/Commitment" || memory.category === "Follow-Up Action") {
    return /\b(will|send|follow up|introduce|prepare|review|call|email|share|schedule|confirm|commit|promise|next step)\b/i.test(text);
  }
  if (memory.category === "Goal/Objective") {
    return /\b(want|need|goal|objective|priority|plan|intend|hope|would like|retire|retirement|buy|sell|save|fund|support|transfer|protect|reduce|grow)\b/i.test(
      text
    );
  }
  if (memory.category === "Unresolved Concern") {
    return /\b(worried|concerned|hard|stuck|issue|problem|unsure|not sure|haven't|have not|can't|cannot|unresolved|block|difficult)\b/i.test(
      text
    );
  }
  if (memory.category === "Milestone") {
    return /\b(new|accepted|graduated|married|divorced|born|moved|retired|retiring|diagnosed|hospital|passed away|started|sold|bought)\b/i.test(
      text
    );
  }
  return true;
}

function shouldAcceptCapturedMemory(memory: ExtractedMemory, existing: ExtractedMemory[]) {
  const combinedText = `${memory.summary} ${memory.sourceSnippet}`;
  if (memory.confidence < CAPTURE_MIN_CONFIDENCE) {
    return { accepted: false, reason: "Capture confidence is too low." };
  }
  if (memory.category === "Signal" && memory.confidence < EMOTIONAL_CAPTURE_MIN_CONFIDENCE) {
    return { accepted: false, reason: "Emotional signal is too weak to save." };
  }
  if (isOpeningSmallTalk(memory.sourceSnippet) || isGenericPositiveGreeting(combinedText)) {
    return { accepted: false, reason: "Greeting or small talk is not notable contact memory." };
  }
  if (isGenericTopicRecap(combinedText)) {
    return { accepted: false, reason: "Generic topic recap is not a durable contact fact." };
  }
  if (!hasDurableCaptureSignal(memory)) {
    return { accepted: false, reason: "Capture lacks a durable founder-relevant fact." };
  }
  if (existing.some((item) => signatureOf(item) === signatureOf(memory))) {
    return { accepted: false, reason: "Similar memory already captured in this session." };
  }
  return { accepted: true, reason: "" };
}

function buildLiveRealtimeInstructions(context: ContactContext) {
  return [
    "You are a founder-only live meeting conductor for a startup founder.",
    "Listen to the meeting audio, transcribe it, and use tools to help the founder. Never speak to the contact. Do not produce prose unless it is a tool call.",
    `Founder: ${context.founder.name}. Contact: ${context.contact.name}. Meeting objective: ${context.upcomingMeeting.objective}.`,
    "Use search_client_memory only when the current conversation needs a specific known fact, action, relationship, or referral from relationship memory. Keep the query focused; do not ask for the full contact record.",
    "Use surface_relevant_partner only when the conversation contains a concrete partner or introduction need, such as a solutions engineer for an integration, an exec sponsor for a deal, an advisor, an investor intro, or a candidate referrer. This tool returns focused partner cards from relationship memory or the founder partner directory.",
    "Do not surface partners for vague rapport, generic planning, greetings, identity checks, or unless the founder would benefit from knowing a specific possible intro right now.",
    "Use suggest_follow_up_question only after at least three substantive turns and a concrete diligence, integration, deal, fundraise, referral, concern, goal, or commitment signal.",
    "Do not call suggest_follow_up_question for greetings, identity checks, call routing, or generic confirmations such as 'hello' or 'is this Priya'.",
    "At most one suggestion every 20 seconds. Prefer no suggestion over a generic one.",
    "Use capture_useful_memory only for durable, founder-relevant facts worth remembering across future meetings: concrete milestones, material concerns, clear goals, explicit promises, new relationship facts, referral opportunities, and follow-up actions.",
    "Do not capture greetings, wellbeing small talk, generic positive mood, call routing, identity checks, or generic topic recaps such as 'we talked about the renewal last time'.",
    "Only capture facts actually said in the conversation. Use the sourceSnippet field for the supporting quote and keep confidence high.",
    "Captured memory is auto-saved; do not ask for permission before calling the capture tool when the fact is useful and new.",
    "Small routing context:",
    JSON.stringify({
      contactId: context.contact.id,
      founderName: context.founder.name,
      contactName: context.contact.name,
      meetingId: context.upcomingMeeting.id
    })
  ].join("\n");
}

function computeCaptionPageStart(text: string, from: number, availableWidth: number, measure: (value: string) => number) {
  if (availableWidth <= 0) return Math.min(Math.max(from, 0), text.length);

  let start = Math.min(Math.max(from, 0), text.length);
  for (let guard = 0; guard < 256; guard++) {
    const remainder = text.slice(start);
    if (measure(remainder) <= availableWidth) break;

    let lower = 1;
    let upper = remainder.length;
    let fit = 1;
    while (lower <= upper) {
      const midpoint = (lower + upper) >> 1;
      if (measure(remainder.slice(0, midpoint)) <= availableWidth) {
        fit = midpoint;
        lower = midpoint + 1;
      } else {
        upper = midpoint - 1;
      }
    }

    const space = remainder.lastIndexOf(" ", fit);
    start += space > 0 ? space + 1 : fit;
    if (start >= text.length) return text.length;
  }

  return start;
}

// Speaker attribution — multi-signal heuristics + sequence refinement.
// No LLM calls; runs synchronously on every final transcript turn.

const FOUNDER_CUES: RegExp[] = [
  /\b(i recommend|you should|have you (considered|thought about|looked at)|you might want|i suggest|i'd (like to|suggest)|let me|let's)\b/i,
  /\b(based on your|given your|in your (case|situation)|for your (situation|goals))\b/i,
  /\b(as your founder|our recommendation|the plan (is|would)|we (can|could|should) look)\b/i,
  /\b(that('s| is) (a )?(good|great|important)|i (understand|see|agree)|right[,.] |yes[,.] (so|and|but))\b/i,
];

const CONTACT_CUES: RegExp[] = [
  /\b(my (team|company|startup|product|roadmap|engineers|integration|migration|timeline|budget|deal|renewal|fundraise|investors|board|customers))\b/i,
  /\b(i (want|need|worry|feel|hope|plan|have been|intend|wish)|i'm (worried|concerned|not sure|thinking|planning|considering))\b/i,
  /\b(we (have|want|are|were|need|hope|plan|would like|'ve been|are planning))\b/i,
  /\b(our (team|product|roadmap|integration|migration|timeline|budget|deal|renewal|fundraise|investors|board|customers|goals|future))\b/i,
  /\b(i (still|haven't|don't|didn't|can't|couldn't|wouldn't))\b/i,
];

function scoreTurnSpeaker(text: string, contactName?: string): { founder: number; contact: number } {
  let founder = 0;
  let contact = 0;

  for (const p of FOUNDER_CUES) if (p.test(text)) founder += 1;
  for (const p of CONTACT_CUES) if (p.test(text)) contact += 2;

  if (text.trim().endsWith("?")) founder += 0.8;

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words <= 6 && /\b(yes|no|right|okay|ok|sure|i see|got it|understood|absolutely|certainly)\b/i.test(text)) {
    founder += 0.6;
  }

  if (contactName) {
    const firstName = contactName.split(/\s+/)[0];
    if (firstName.length > 2 && new RegExp(`\\b${firstName}\\b`, "i").test(text)) founder += 1;
    else if (/\b(mr|mrs|ms|miss|sir)\b/i.test(text)) founder += 0.5;
  }

  return { founder, contact };
}

function initialClassify(
  text: string,
  prevKnownSpeaker: TranscriptTurn["speaker"],
  contactName?: string
): TranscriptTurn["speaker"] {
  const { founder, contact } = scoreTurnSpeaker(text, contactName);
  const margin = Math.abs(founder - contact);

  if (margin >= 1.5) return founder > contact ? "founder" : "contact";

  if (prevKnownSpeaker !== "unknown") {
    return prevKnownSpeaker === "founder" ? "contact" : "founder";
  }

  if (founder > contact) return "founder";
  if (contact > founder) return "contact";
  return "unknown";
}

function refineAttributions(
  turns: TranscriptTurn[],
  contactName?: string
): Map<string, TranscriptTurn["speaker"]> {
  const updates = new Map<string, TranscriptTurn["speaker"]>();
  if (turns.length === 0) return updates;

  const speakers: TranscriptTurn["speaker"][] = turns.map((t) => t.speaker);
  const scores = turns.map((t) => scoreTurnSpeaker(t.text, contactName));

  // Pass 1: anchor high-confidence turns, fill unknowns via alternation from nearest anchor.
  let lastKnown: TranscriptTurn["speaker"] = "unknown";
  for (let i = 0; i < turns.length; i++) {
    const { founder, contact } = scores[i];
    if (Math.abs(founder - contact) >= 1.5) {
      speakers[i] = founder > contact ? "founder" : "contact";
    } else if (speakers[i] === "unknown" && lastKnown !== "unknown") {
      speakers[i] = lastKnown === "founder" ? "contact" : "founder";
    }
    if (speakers[i] !== "unknown") lastKnown = speakers[i];
  }

  // Pass 2: smooth isolated marginal flips (A, B, A → A, A, A when B has low confidence).
  for (let i = 1; i < speakers.length - 1; i++) {
    if (
      speakers[i - 1] !== "unknown" &&
      speakers[i + 1] !== "unknown" &&
      speakers[i - 1] === speakers[i + 1] &&
      speakers[i] !== speakers[i - 1] &&
      Math.abs(scores[i].founder - scores[i].contact) < 1.5
    ) {
      speakers[i] = speakers[i - 1];
    }
  }

  for (let i = 0; i < turns.length; i++) {
    if (speakers[i] !== "unknown" && speakers[i] !== turns[i].speaker) {
      updates.set(turns[i].id, speakers[i]);
    }
  }

  return updates;
}

export function LiveCompanion({
  context,
  extraTabs = []
}: {
  context: ContactContext;
  extraTabs?: InfoTab[];
}) {
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const [statusText, setStatusText] = useState("Start capture to begin a silent, founder-only companion.");
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [someoneSpeaking, setSomeoneSpeaking] = useState(false);
  const [analysis, setAnalysis] = useState<LiveAnalysisResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [liveSearches, setLiveSearches] = useState<LiveSearchEntry[]>([]);
  const [livePartnerEntries, setLivePartnerEntries] = useState<LivePartnerEntry[]>([]);
  const [saveToast, setSaveToast] = useState<SaveToast | null>(null);
  const [savedSignatures, setSavedSignatures] = useState<Set<string>>(() => new Set());
  const [savingSignatures, setSavingSignatures] = useState<Set<string>>(() => new Set());
  const [attentionSignal, setAttentionSignal] = useState<{ tabId: string; nonce: number }>({ tabId: "", nonce: 0 });
  const [transcriptPopupVisible, setTranscriptPopupVisible] = useState(false);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const turnsRef = useRef<TranscriptTurn[]>([]);
  const analyzeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attentionNonceRef = useRef(0);
  const prevCountsRef = useRef({ suggestions: 0, captured: 0, partners: 0 });
  const lastSuggestionAtRef = useRef(0);
  const lastPartnerAtRef = useRef(0);
  const functionCallNamesRef = useRef<Map<string, string>>(new Map());
  const functionCallArgumentsRef = useRef<Map<string, string>>(new Map());
  const processedFunctionCallsRef = useRef<Set<string>>(new Set());
  const startInFlightRef = useRef(false);
  const sessionRunRef = useRef(0);
  const responseActiveRef = useRef(false);
  const responseCreateRequestedRef = useRef(false);
  const pendingResponseCreateRef = useRef(false);

  const connected = status === "connected";

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  const upsertTurnText = useCallback((itemId: string, text: string, mode: "delta" | "final") => {
    setTurns((current) => {
      const index = current.findIndex((turn) => turn.id === itemId);
      if (index === -1) {
        return [
          ...current,
          { id: itemId, speaker: "unknown", text, at: new Date().toISOString() }
        ];
      }
      return current.map((turn, i) =>
        i === index ? { ...turn, text: mode === "final" ? text : `${turn.text}${text}` } : turn
      );
    });
  }, []);

  const showToast = useCallback((text: string, tone: SaveToast["tone"] = "signal") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setSaveToast({ id: `toast-${Date.now()}`, text, tone });
    toastTimerRef.current = setTimeout(() => setSaveToast(null), 2600);
  }, []);

  const runAnalysis = useCallback(() => {
    const payload = turnsRef.current;
    if (payload.length === 0) return;
    setAnalyzing(true);
    try {
      const updates = refineAttributions(payload, context.contact.name);
      if (updates.size > 0) {
        setTurns((current) =>
          current.map((turn) => {
            const refined = updates.get(turn.id);
            return refined ? { ...turn, speaker: refined } : turn;
          })
        );
      }
    } finally {
      setAnalyzing(false);
    }
  }, [context.contact.name]);

  const scheduleAnalysis = useCallback(() => {
    if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current);
    analyzeTimerRef.current = setTimeout(() => void runAnalysis(), ANALYZE_DEBOUNCE_MS);
  }, [runAnalysis]);

  const classifyTurnImmediate = useCallback((itemId: string) => {
    setTurns((current) => {
      const index = current.findIndex((t) => t.id === itemId);
      if (index === -1 || current[index].speaker !== "unknown") return current;
      let prevKnown: TranscriptTurn["speaker"] = "unknown";
      for (let i = index - 1; i >= 0; i--) {
        if (current[i].speaker !== "unknown") { prevKnown = current[i].speaker; break; }
      }
      const speaker = initialClassify(current[index].text, prevKnown, context.contact.name);
      if (speaker === "unknown") return current;
      return current.map((t, i) => i === index ? { ...t, speaker } : t);
    });
  }, [context.contact.name]);

  const saveMemory = useCallback(async (memory: ExtractedMemory): Promise<SaveMemoryResult> => {
    const signature = signatureOf(memory);
    if (savedSignatures.has(signature)) {
      showToast("Already saved in this session.", "amber");
      return { writeMode: "neo4j", saved: false, duplicate: true };
    }
    if (savingSignatures.has(signature)) {
      return { writeMode: "neo4j", saved: false, duplicate: true };
    }
    setSavingSignatures((current) => new Set(current).add(signature));
    try {
      const response = await fetch("/api/memory/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memory })
      });
      const result = (await response.json()) as SaveMemoryResult;
      if (response.ok && (result.saved || result.duplicate)) {
        setSavedSignatures((current) => new Set(current).add(signature));
      }
      if (result.duplicate) {
        showToast("Already in memory. Skipped duplicate.", "amber");
      } else if (result.saved && result.writeMode === "neo4j") {
        showToast("Saved to memory.", "signal");
      } else if (result.saved) {
        showToast("Saved.", "signal");
      } else {
        showToast(result.reason ?? "Memory was captured, but it was not saved.", "rose");
      }
      return result;
    } catch {
      showToast("Memory was captured, but the save request failed.", "rose");
      return { writeMode: "demo", saved: false, reason: "Save request failed." };
    } finally {
      setSavingSignatures((current) => {
        const next = new Set(current);
        next.delete(signature);
        return next;
      });
    }
  }, [savedSignatures, savingSignatures, showToast]);

  const resetResponseState = useCallback(() => {
    responseActiveRef.current = false;
    responseCreateRequestedRef.current = false;
    pendingResponseCreateRef.current = false;
  }, []);

  const requestResponseCreate = useCallback(() => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== "open") return;

    if (responseActiveRef.current || responseCreateRequestedRef.current) {
      pendingResponseCreateRef.current = true;
      return;
    }

    responseCreateRequestedRef.current = true;
    channel.send(JSON.stringify({ type: "response.create" }));
  }, []);

  const flushPendingResponseCreate = useCallback(() => {
    if (!pendingResponseCreateRef.current) return;
    pendingResponseCreateRef.current = false;
    requestResponseCreate();
  }, [requestResponseCreate]);

  const sendToolOutput = useCallback((callId: string, output: Record<string, unknown>) => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== "open") return;
    channel.send(JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify(output)
      }
    }));
    requestResponseCreate();
  }, [requestResponseCreate]);

  const executeRealtimeTool = useCallback(async (toolCall: RealtimeToolCall) => {
    if (processedFunctionCallsRef.current.has(toolCall.callId)) return;
    processedFunctionCallsRef.current.add(toolCall.callId);

    if (toolCall.name === "search_client_memory") {
      const query = typeof toolCall.args.query === "string" ? toolCall.args.query.trim() : "";
      if (!query) {
        sendToolOutput(toolCall.callId, { accepted: false, reason: "Missing focused search query." });
        return;
      }
      try {
        const response = await fetch("/api/memory/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactId: context.contact.id,
            query,
            reason: typeof toolCall.args.reason === "string" ? toolCall.args.reason : "",
            limit: typeof toolCall.args.limit === "number" ? toolCall.args.limit : 5
          })
        });
        const result = (await response.json()) as LiveMemorySearchResponse;
        if (!response.ok) {
          sendToolOutput(toolCall.callId, { accepted: false, reason: "Memory search failed.", detail: result });
          return;
        }
        setLiveSearches((current) => [
          { ...result, id: `search-${toolCall.callId}`, at: new Date().toISOString() },
          ...current
        ].slice(0, 5));
        attentionNonceRef.current += 1;
        setAttentionSignal({ tabId: "relevant", nonce: attentionNonceRef.current });
        sendToolOutput(toolCall.callId, {
          accepted: true,
          source: result.source,
          query: result.query,
          results: result.results,
          warning: result.warning
        });
      } catch {
        sendToolOutput(toolCall.callId, { accepted: false, reason: "Memory search request failed." });
      }
      return;
    }

    if (toolCall.name === "surface_relevant_partner") {
      const need = typeof toolCall.args.need === "string" ? toolCall.args.need.trim() : "";
      const sourceSnippet = typeof toolCall.args.sourceSnippet === "string" ? toolCall.args.sourceSnippet.trim() : "";
      if (!need) {
        sendToolOutput(toolCall.callId, { accepted: false, reason: "Missing focused partner need." });
        return;
      }
      const acceptance = shouldAcceptPartnerLookup(
        need,
        sourceSnippet,
        turnsRef.current,
        livePartnerEntries,
        lastPartnerAtRef.current
      );
      if (!acceptance.accepted) {
        sendToolOutput(toolCall.callId, { accepted: false, reason: acceptance.reason });
        return;
      }
      try {
        const response = await fetch("/api/partners/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactId: context.contact.id,
            need,
            reason: typeof toolCall.args.reason === "string" ? toolCall.args.reason : "",
            limit: 1
          })
        });
        const result = (await response.json()) as LivePartnerRecommendationResponse;
        if (!response.ok) {
          sendToolOutput(toolCall.callId, { accepted: false, reason: "Partner recommendation failed.", detail: result });
          return;
        }
        lastPartnerAtRef.current = Date.now();
        if (result.results.length > 0) {
          setLivePartnerEntries((current) => [
            { ...result, id: `partner-${toolCall.callId}`, at: new Date().toISOString() },
            ...current.filter((entry) => suggestionSimilarity(entry.need, need) < 0.65)
          ].slice(0, 4));
          attentionNonceRef.current += 1;
          setAttentionSignal({ tabId: "partners", nonce: attentionNonceRef.current });
        }
        sendToolOutput(toolCall.callId, {
          accepted: true,
          source: result.source,
          need: result.need,
          results: result.results,
          warning: result.warning
        });
      } catch {
        sendToolOutput(toolCall.callId, { accepted: false, reason: "Partner recommendation request failed." });
      }
      return;
    }

    if (toolCall.name === "suggest_follow_up_question") {
      const suggestion: SilentSuggestion = {
        id: `rt-question-${toolCall.callId}`,
        title: typeof toolCall.args.title === "string" ? toolCall.args.title : "Ask a follow-up",
        reason: typeof toolCall.args.reason === "string" ? toolCall.args.reason : "Suggested from the live conversation.",
        source: typeof toolCall.args.source === "string" ? toolCall.args.source : "Realtime tool call",
        priority:
          toolCall.args.priority === "high" || toolCall.args.priority === "low"
            ? toolCall.args.priority
            : "medium"
      };
      const currentSuggestions = analysis?.suggestions ?? [];
      const acceptance = shouldAcceptSuggestion(
        suggestion,
        turnsRef.current,
        currentSuggestions,
        lastSuggestionAtRef.current
      );
      if (!acceptance.accepted) {
        sendToolOutput(toolCall.callId, { accepted: false, reason: acceptance.reason });
        return;
      }
      lastSuggestionAtRef.current = Date.now();
      setAnalysis((current) => ({
        source: "openai",
        attributions: current?.attributions ?? [],
        suggestions: [
          suggestion,
          ...(current?.suggestions ?? []).filter((item) => suggestionSimilarity(item.title, suggestion.title) < 0.65)
        ].slice(0, 2),
        extracted: current?.extracted ?? [],
        relevant: current?.relevant ?? []
      }));
      attentionNonceRef.current += 1;
      setAttentionSignal({ tabId: "ask", nonce: attentionNonceRef.current });
      sendToolOutput(toolCall.callId, { accepted: true });
      return;
    }

    if (toolCall.name === "capture_useful_memory") {
      const summary = typeof toolCall.args.summary === "string" ? toolCall.args.summary.trim() : "";
      if (!summary) {
        sendToolOutput(toolCall.callId, { accepted: false, reason: "Missing summary" });
        return;
      }
      const memory: ExtractedMemory = {
        id: `rt-memory-${toolCall.callId}`,
        contactId: context.contact.id,
        category: normalizeMemoryCategory(toolCall.args.category),
        summary,
        sourceSnippet: typeof toolCall.args.sourceSnippet === "string" ? toolCall.args.sourceSnippet : "",
        timestamp: new Date().toISOString(),
        confidence: clampConfidence(toolCall.args.confidence),
        proposedGraphMutation: typeof toolCall.args.proposedGraphMutation === "string" ? toolCall.args.proposedGraphMutation : ""
      };
      const captureAcceptance = shouldAcceptCapturedMemory(memory, analysis?.extracted ?? []);
      if (!captureAcceptance.accepted) {
        sendToolOutput(toolCall.callId, { accepted: false, reason: captureAcceptance.reason });
        return;
      }
      setAnalysis((current) => ({
        source: "openai",
        attributions: current?.attributions ?? [],
        suggestions: current?.suggestions ?? [],
        extracted: [memory, ...(current?.extracted ?? []).filter((item) => signatureOf(item) !== signatureOf(memory))].slice(0, 8),
        relevant: current?.relevant ?? []
      }));
      attentionNonceRef.current += 1;
      setAttentionSignal({ tabId: "captured", nonce: attentionNonceRef.current });
      const saveResult = await saveMemory(memory);
      sendToolOutput(toolCall.callId, {
        accepted: true,
        saved: saveResult.saved,
        duplicate: saveResult.duplicate,
        writeMode: saveResult.writeMode,
        memoryId: memory.id,
        existingId: saveResult.existingId,
        reason: saveResult.reason
      });
    }
  }, [analysis?.extracted, analysis?.suggestions, context, livePartnerEntries, saveMemory, sendToolOutput]);

  const handleRealtimeEvent = useCallback(
    (raw: string) => {
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return;
      }
      const type = typeof event.type === "string" ? event.type : "";

      if (type === "response.created") {
        responseCreateRequestedRef.current = false;
        responseActiveRef.current = true;
        return;
      }
      if (type === "response.done" || type === "response.cancelled") {
        responseCreateRequestedRef.current = false;
        responseActiveRef.current = false;
        flushPendingResponseCreate();
        return;
      }
      if (type === "input_audio_buffer.speech_started") {
        setSomeoneSpeaking(true);
        return;
      }
      if (type === "input_audio_buffer.speech_stopped") {
        setSomeoneSpeaking(false);
        return;
      }
      if (type === "conversation.item.input_audio_transcription.delta") {
        const itemId = realtimeEventItemId(event);
        const delta = realtimeEventText(event);
        if (itemId && delta) upsertTurnText(itemId, delta, "delta");
        return;
      }
      if (
        type === "conversation.item.input_audio_transcription.completed" ||
        type === "conversation.item.input_audio_transcription.segment"
      ) {
        const itemId = realtimeEventItemId(event);
        const transcriptText = realtimeEventText(event);
        if (itemId) {
          if (transcriptText) upsertTurnText(itemId, transcriptText, "final");
          classifyTurnImmediate(itemId);
          scheduleAnalysis();
        }
        return;
      }
      const functionCallId = realtimeFunctionCallId(event);
      if (functionCallId) {
        const name = realtimeFunctionName(event);
        if (name) functionCallNamesRef.current.set(functionCallId, name);
        const args = realtimeFunctionArguments(event);
        if (args) functionCallArgumentsRef.current.set(functionCallId, args);
      }
      if (type === "response.function_call_arguments.delta" && functionCallId) {
        const delta = typeof event.delta === "string" ? event.delta : "";
        if (delta) {
          functionCallArgumentsRef.current.set(
            functionCallId,
            `${functionCallArgumentsRef.current.get(functionCallId) ?? ""}${delta}`
          );
        }
        return;
      }
      if (
        type === "response.function_call_arguments.done" ||
        type === "response.output_item.done" ||
        type === "conversation.item.done"
      ) {
        const item = asRecord(event.item);
        const resolvedCallId = functionCallId || (typeof item.call_id === "string" ? item.call_id : "");
        const name = realtimeFunctionName(event) || functionCallNamesRef.current.get(resolvedCallId) || "";
        const rawArgs = realtimeFunctionArguments(event) || functionCallArgumentsRef.current.get(resolvedCallId) || "";
        if (resolvedCallId && name) {
          void executeRealtimeTool({ callId: resolvedCallId, name, args: parseToolArguments(rawArgs) });
        }
        return;
      }
      if (type === "error") {
        const error = event.error as { message?: string } | undefined;
        const message = error?.message ?? "Realtime returned an error.";
        if (/active response in progress/i.test(message)) {
          responseActiveRef.current = true;
          responseCreateRequestedRef.current = false;
          pendingResponseCreateRef.current = true;
          setStatus("connected");
          setStatusText("Still processing the previous response. Capture will continue automatically.");
          return;
        }
        setStatus("error");
        setStatusText(message);
      }
    },
    [classifyTurnImmediate, executeRealtimeTool, flushPendingResponseCreate, scheduleAnalysis, upsertTurnText]
  );

  const stopCapture = useCallback(() => {
    sessionRunRef.current += 1;
    startInFlightRef.current = false;
    if (analyzeTimerRef.current) clearTimeout(analyzeTimerRef.current);
    channelRef.current?.close();
    channelRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    functionCallNamesRef.current.clear();
    functionCallArgumentsRef.current.clear();
    processedFunctionCallsRef.current.clear();
    resetResponseState();
    lastSuggestionAtRef.current = 0;
    lastPartnerAtRef.current = 0;
    setSomeoneSpeaking(false);
    setStatus((current) => (current === "error" ? current : "idle"));
    setStatusText("Capture stopped. Saved memory stays on the contact record.");
  }, [resetResponseState]);

  const startCapture = useCallback(async () => {
    if (startInFlightRef.current || status === "connecting" || connected) return;
    startInFlightRef.current = true;
    const sessionRun = sessionRunRef.current + 1;
    sessionRunRef.current = sessionRun;
    const isCurrentSession = () => sessionRunRef.current === sessionRun;

    resetResponseState();
    setStatus("connecting");
    setStatusText("Connecting…");

    try {
      const tokenResponse = await fetch("/api/realtime/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcribe: true,
          instructions: buildLiveRealtimeInstructions(context),
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

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isCurrentSession()) {
        stream.getTracks().forEach((track) => track.stop());
        peer.close();
        return;
      }
      localStreamRef.current = stream;
      for (const track of stream.getAudioTracks()) {
        peer.addTrack(track, stream);
      }

      const channel = peer.createDataChannel("oai-events");
      channelRef.current = channel;
      channel.onmessage = (event) => {
        if (isCurrentSession()) handleRealtimeEvent(event.data);
      };
      channel.onerror = () => {
        if (!isCurrentSession()) return;
        setStatus("error");
        setStatusText("Realtime data channel failed.");
      };
      channel.onclose = () => {
        if (!isCurrentSession()) return;
        setStatus((current) => (current === "error" ? current : "idle"));
      };
      channel.onopen = () => {
        if (!isCurrentSession()) return;
        setStatus("connected");
        setStatusText("Listening silently. Suggestions and captured memory appear as you talk.");
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
      if (!sdpResponse.ok) {
        throw new Error(await sdpResponse.text());
      }
      if (!isCurrentSession()) return;
      await peer.setRemoteDescription({ type: "answer", sdp: await sdpResponse.text() });
    } catch (caught) {
      if (!isCurrentSession()) return;
      stopCapture();
      setStatus("error");
      setStatusText(caught instanceof Error ? caught.message : "Could not start live capture.");
    } finally {
      if (isCurrentSession()) startInFlightRef.current = false;
    }
  }, [connected, context, handleRealtimeEvent, resetResponseState, status, stopCapture]);

  useEffect(() => {
    return () => {
      stopCapture();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [stopCapture]);

  const extracted = analysis?.extracted ?? [];
  const suggestions = analysis?.suggestions ?? [];
  const clientMemories = context.memories;
  const searchResultCount = liveSearches.reduce((count, search) => count + search.results.length, 0);
  const partnerResultCount = livePartnerEntries.reduce((count, entry) => count + Math.min(entry.results.length, 1), 0);
  const relevantMemories = useMemo(() => {
    if (!analysis) return [];
    return analysis.relevant
      .map((item) => {
        const memory = clientMemories.find((m) => m.id === item.memoryId);
        return memory ? { memory, reason: item.reason } : null;
      })
      .filter((entry): entry is { memory: (typeof clientMemories)[number]; reason: string } => entry !== null);
  }, [analysis, clientMemories]);

  const unsavedCount = extracted.filter((m) => !savedSignatures.has(signatureOf(m))).length;

  // When fresh suggestions or captures land, auto-surface the matching dock panel.
  useEffect(() => {
    if (!analysis) return;
    const prev = prevCountsRef.current;
    const suggestionCount = analysis.suggestions.length;
    const capturedCount = analysis.extracted.length;
    const partnerCount = partnerResultCount;
    let tabId = "";
    if (suggestionCount > prev.suggestions) tabId = "ask";
    else if (capturedCount > prev.captured) tabId = "captured";
    else if (partnerCount > prev.partners) tabId = "relevant";
    prevCountsRef.current = { suggestions: suggestionCount, captured: capturedCount, partners: partnerCount };
    if (tabId) {
      attentionNonceRef.current += 1;
      setAttentionSignal({ tabId, nonce: attentionNonceRef.current });
    }
  }, [analysis, partnerResultCount]);

  const insightTabs: InfoTab[] = [
    {
      id: "ask",
      label: "Ask",
      icon: <Lightbulb className="h-4 w-4" />,
      badge: suggestions.length,
      attention: suggestions.length > 0,
      content: (
        <div className="space-y-2">
          {analyzing ? <p className="text-xs text-muted">updating…</p> : null}
          {suggestions.length === 0 ? (
            <EmptyState>Prompts appear as the conversation gives the model something to work with.</EmptyState>
          ) : (
            suggestions.map((suggestion) => <SuggestionCard key={suggestion.id} suggestion={suggestion} />)
          )}
        </div>
      )
    },
    {
      id: "relevant",
      label: "Lookup",
      icon: <Sparkles className="h-4 w-4" />,
      badge: relevantMemories.length + searchResultCount + partnerResultCount,
      attention: searchResultCount > 0 || partnerResultCount > 0,
      content: (
        <div className="space-y-2">
          {liveSearches.length === 0 && relevantMemories.length === 0 && livePartnerEntries.length === 0 ? (
            <EmptyState>Targeted memory lookups appear here when the conversation needs a specific known fact.</EmptyState>
          ) : (
            <>
              {livePartnerEntries.map((entry) => (
                <div key={entry.id} className="rounded-[1.1rem] border border-line bg-paper p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={entry.source === "neo4j" ? "signal" : "amber"}>
                      {entry.source === "neo4j" ? "Graph memory" : "Demo memory"}
                    </Badge>
                    <Badge tone="cobalt">Best partner</Badge>
                    <span className="text-xs font-medium text-muted">{entry.need}</span>
                  </div>
                  {entry.reason ? <p className="mt-1 text-xs leading-5 text-muted">{entry.reason}</p> : null}
                  <div className="mt-2 space-y-2">
                    {entry.results.slice(0, 1).map((partner) => (
                      <PartnerRecommendationCard key={`${entry.id}-${partner.id}`} partner={partner} />
                    ))}
                  </div>
                </div>
              ))}
              {liveSearches.map((search) => (
                <div key={search.id} className="rounded-[1.1rem] border border-line bg-paper p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={search.source === "neo4j" ? "signal" : "amber"}>
                      {search.source === "neo4j" ? "Graph memory" : "Demo memory"}
                    </Badge>
                    <span className="text-xs font-medium text-muted">{search.query}</span>
                  </div>
                  {search.reason ? <p className="mt-1 text-xs leading-5 text-muted">{search.reason}</p> : null}
                  <div className="mt-2 space-y-2">
                    {search.results.length > 0 ? (
                      search.results.map((result) => <SearchResultCard key={`${search.id}-${result.id}`} result={result} />)
                    ) : (
                      <p className="text-sm leading-5 text-muted">No matching contact memory found.</p>
                    )}
                  </div>
                </div>
              ))}
              {relevantMemories.map(({ memory, reason }) => (
                <div key={memory.id} className="rounded-[1.1rem] border border-line bg-paper p-3">
                  <Badge tone="cobalt">{memory.category}</Badge>
                  <p className="mt-2 text-sm font-semibold text-ink">{memory.title}</p>
                  <p className="mt-1 text-sm leading-5 text-muted">{memory.summary}</p>
                  <p className="mt-2 text-xs leading-5 text-cobalt">{reason}</p>
                </div>
              ))}
            </>
          )}
        </div>
      )
    },
    {
      id: "captured",
      label: "Saved",
      icon: <Users className="h-4 w-4" />,
      badge: extracted.length,
      attention: unsavedCount > 0,
      content: (
        <div className="space-y-2">
          {unsavedCount > 1 ? (
            <button
              type="button"
              onClick={() => extracted.forEach((memory) => void saveMemory(memory))}
              className="focus-ring pressable rounded-full border border-signal/40 bg-signal/10 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-signal/20"
            >
              Retry unsaved
            </button>
          ) : null}
          {extracted.length === 0 ? (
            <EmptyState>Notable facts saved from this meeting appear here with save status.</EmptyState>
          ) : (
            extracted.map((memory, index) => {
              const signature = signatureOf(memory);
              return (
                <CapturedCard
                  key={memory.id || `${signature}-${index}`}
                  memory={memory}
                  saved={savedSignatures.has(signature)}
                  saving={savingSignatures.has(signature)}
                  onSave={() => void saveMemory(memory)}
                />
              );
            })
          )}
        </div>
      )
    }
  ];

  return (
    <>
      {/* Transcript / caption stage — the focused primary surface. */}
      <section className="surface-enter overflow-hidden rounded-[0.55rem] border border-line bg-paper p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`relative flex h-3 w-3 shrink-0 rounded-full ${
                status === "error" ? "bg-rose" : connected ? "bg-signal" : "bg-muted"
              }`}
              aria-hidden
            >
              {connected && someoneSpeaking ? <span className="voice-ring absolute inset-0 rounded-full bg-signal/40" /> : null}
            </span>
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-muted">
                Live companion
              </p>
              <p className="text-sm font-semibold text-ink">
                {connected ? (someoneSpeaking ? "Hearing the room…" : "Listening") : "Not capturing"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:justify-end">
            <Badge tone={status === "error" ? "rose" : connected ? "signal" : "neutral"}>
              {status === "error" ? "error" : connected ? "live" : "idle"}
            </Badge>
            {connected ? (
              <button
                type="button"
                onClick={stopCapture}
                className="focus-ring pressable inline-flex min-h-10 items-center justify-center gap-2 rounded-[0.4rem] border border-line bg-paper px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-rose/50"
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void startCapture()}
                disabled={status === "connecting"}
                className="focus-ring pressable inline-flex min-h-10 items-center justify-center gap-2 rounded-[0.4rem] bg-ink px-4 py-2 text-sm font-semibold text-paper transition-colors hover:bg-cobalt disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Mic className="h-4 w-4" />
                {status === "connecting" ? "Connecting" : "Start"}
              </button>
            )}
          </div>
        </div>

        {status === "error" || status === "connecting" ? (
          <p className="mt-3 text-sm leading-6 text-muted">{statusText}</p>
        ) : null}

        {analysis?.warning ? (
          <p className="mt-3 rounded-[0.4rem] border border-amber/40 bg-amber/15 px-3 py-2 text-xs leading-5 text-ink">
            {analysis.warning}
          </p>
        ) : null}

        {transcriptPopupVisible ? null : (
          <LiveCaptionStage turns={turns} context={context} status={status} connected={connected} />
        )}
      </section>

      {/* Live insights ride in the bottom dock so they are one tap away — never a scroll —
          and auto-pop the relevant panel when something new needs attention. */}
      {saveToast ? <SaveToastNotice toast={saveToast} /> : null}
      <InfoTabs
        attentionSignal={attentionSignal}
        floatingContent={
          <DockLiveTranscript turns={turns} context={context} status={status} connected={connected} />
        }
        onActiveChange={setTranscriptPopupVisible}
        tabs={[...insightTabs, ...extraTabs]}
      />
    </>
  );
}

function LiveCaptionStage({
  turns,
  context,
  status,
  connected
}: {
  turns: TranscriptTurn[];
  context: ContactContext;
  status: RealtimeStatus;
  connected: boolean;
}) {
  const active = connected || status === "connecting";
  if (!active && turns.length === 0) return null;

  return (
    <div className="mt-4 border-t border-line/70 pt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">Live captions</p>
        {turns.length ? <span className="text-xs font-medium text-muted">{turns.length} turns</span> : null}
      </div>

      <div className="relative mt-3 min-h-[64px] overflow-hidden">
        <div className="pointer-events-none absolute inset-x-8 bottom-0 flex h-11 items-end justify-center gap-1.5 opacity-45">
          {[14, 26, 18, 34, 22, 40, 19, 30, 16].map((height, index) => (
            <span
              key={`${height}-${index}`}
              className={`w-1 rounded-full bg-ink/20 ${connected ? "voice-bar" : ""}`}
              style={{ height, animationDelay: `${index * 90}ms` }}
            />
          ))}
        </div>
        <div className="relative flex min-h-[64px] items-end justify-center">
          <FloatingLiveCaptions turns={turns} context={context} active={active} status={status} />
        </div>
      </div>
    </div>
  );
}

function DockLiveTranscript({
  turns,
  context,
  status,
  connected
}: {
  turns: TranscriptTurn[];
  context: ContactContext;
  status: RealtimeStatus;
  connected: boolean;
}) {
  const row = latestTurnCaption(turns);
  const active = connected || status === "connecting";

  return (
    <div className="relative z-10 rounded-[0.55rem] border border-line bg-white/95 p-3 shadow-[0_18px_60px_-24px_rgba(31,45,38,0.45)] ring-1 ring-white/80 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              status === "error" ? "bg-rose" : active ? "bg-signal" : "bg-muted"
            }`}
          />
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">
            Live transcript
          </p>
        </div>
        <Badge tone={status === "error" ? "rose" : active ? "signal" : "neutral"}>
          {status === "connecting" ? "connecting" : connected ? "live" : "idle"}
        </Badge>
      </div>

      <div className="mt-2 flex min-w-0 items-start gap-2">
        {row ? <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${captionSpeakerDotClass(row.speaker)}`} /> : null}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-muted">
            {row ? captionSpeakerLabel(row.speaker, context) : active ? "Listening" : "No transcript yet"}
          </p>
          <p className="mt-0.5 max-h-12 overflow-hidden text-sm font-semibold leading-5 text-ink">
            {row?.text ?? (active ? "Captions will stay visible here while the insight panel is open." : "Start capture to see live captions.")}
          </p>
        </div>
      </div>
    </div>
  );
}

function FloatingLiveCaptions({
  turns,
  context,
  active,
  status
}: {
  turns: TranscriptTurn[];
  context: ContactContext;
  active: boolean;
  status: RealtimeStatus;
}) {
  const [current, setCurrent] = useState<ActiveCaption | null>(null);
  const [topRow, setTopRow] = useState<CaptionRow | null>(null);
  const [captionPage, setCaptionPage] = useState<{ key: string; start: number; width: number | null }>({
    key: "",
    start: 0,
    width: null
  });
  const keyCounterRef = useRef(0);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textBoxRef = useRef<HTMLDivElement | null>(null);
  const measureCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const previousCurrentRef = useRef<ActiveCaption | null>(null);
  const previousWindowStartRef = useRef(0);
  const windowStart = current && captionPage.key === current.key ? captionPage.start : 0;
  const pinWidth = current && captionPage.key === current.key ? captionPage.width : null;

  const cancelClear = useCallback(() => {
    if (clearTimerRef.current) {
      clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const next = latestTurnCaption(turns);
    if (!next) return;

    setCurrent((previous) => {
      if (previous?.id === next.id) {
        if (previous.text === next.text && previous.speaker === next.speaker) return previous;
        return { ...previous, text: next.text, speaker: next.speaker };
      }
      return { ...next, key: `caption-${keyCounterRef.current++}` };
    });

    cancelClear();
    clearTimerRef.current = setTimeout(() => {
      setCurrent(null);
      setTopRow(null);
      clearTimerRef.current = null;
    }, CAPTION_TTL_MS);
  }, [cancelClear, turns]);

  useEffect(() => () => cancelClear(), [cancelClear]);

  useEffect(() => {
    const previous = previousCurrentRef.current;
    const previousWindowStart = previousWindowStartRef.current;

    if (current && previous && current.key !== previous.key) {
      const lastPageText = previous.text.slice(previousWindowStart).trim();
      if (lastPageText) {
        setTopRow({
          key: `${previous.key}-${previousWindowStart}`,
          speaker: previous.speaker,
          text: lastPageText
        });
      }
    }

    previousCurrentRef.current = current;
    previousWindowStartRef.current = windowStart;
  }, [current, windowStart]);

  useEffect(() => {
    const box = textBoxRef.current;
    const line = box?.firstElementChild as HTMLElement | null;
    const pill = box?.parentElement;
    const wrap = pill?.parentElement;
    if (!current || !box || !line || !pill || !wrap) return;

    if (!measureCtxRef.current) {
      measureCtxRef.current = document.createElement("canvas").getContext("2d");
    }
    const context2d = measureCtxRef.current;
    if (!context2d) return;

    const computed = getComputedStyle(line);
    context2d.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
    const chromeWidth = pill.offsetWidth - box.offsetWidth;
    const availableWidth = wrap.clientWidth - chromeWidth - 2;
    const nextStart = computeCaptionPageStart(current.text, windowStart, availableWidth, (value) => context2d.measureText(value).width);

    if (nextStart !== windowStart) {
      const completedPageText = current.text.slice(windowStart, nextStart).trim();
      if (completedPageText) {
        setTopRow({
          key: `${current.key}-${windowStart}`,
          speaker: current.speaker,
          text: completedPageText
        });
      }
    }
    const nextWidth = nextStart > 0 && availableWidth > 0 ? availableWidth : null;
    if (nextStart !== windowStart || nextWidth !== pinWidth) {
      setCaptionPage((previous) => {
        const nextPage = { key: current.key, start: nextStart, width: nextWidth };
        return previous.key === nextPage.key && previous.start === nextPage.start && previous.width === nextPage.width
          ? previous
          : nextPage;
      });
    }
  }, [current, current?.text, pinWidth, windowStart]);

  return (
    <div className="pointer-events-none mx-auto flex w-full max-w-xl flex-col items-center gap-2">
      {topRow ? <CaptionPill key={topRow.key} row={topRow} context={context} previous /> : null}
      {current ? (
        <CaptionPill
          row={{ key: current.key, speaker: current.speaker, text: current.text.slice(Math.min(windowStart, current.text.length)) }}
          context={context}
          textBoxRef={textBoxRef}
          pinnedWidth={pinWidth}
        />
      ) : active ? (
        <IdleCaption status={status} />
      ) : null}
    </div>
  );
}

function CaptionPill({
  row,
  context,
  previous = false,
  textBoxRef,
  pinnedWidth
}: {
  row: CaptionRow;
  context: ContactContext;
  previous?: boolean;
  textBoxRef?: RefObject<HTMLDivElement | null>;
  pinnedWidth?: number | null;
}) {
  const label = captionSpeakerLabel(row.speaker, context);
  const dotClass = captionSpeakerDotClass(row.speaker);

  return (
    <div
      className={`caption-page flex max-w-full items-center gap-2 rounded-full border border-white/70 bg-white/65 py-2 pl-3 pr-4 shadow-soft backdrop-blur-xl ${
        previous ? "opacity-70" : ""
      }`}
      aria-label={`${label}: ${row.text}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
      <div
        ref={textBoxRef}
        className="min-w-0 flex-1 overflow-hidden"
        style={pinnedWidth ? { width: pinnedWidth, flex: "none" } : undefined}
      >
        <p className="whitespace-nowrap text-[13px] font-semibold leading-snug text-ink sm:text-sm">{row.text || "…"}</p>
      </div>
    </div>
  );
}

function captionSpeakerLabel(speaker: CaptionSpeaker, context: ContactContext) {
  return speaker === "founder" ? context.founder.name : speaker === "contact" ? context.contact.name : "Speaker";
}

function captionSpeakerDotClass(speaker: CaptionSpeaker) {
  return speaker === "founder" ? "bg-cobalt" : speaker === "contact" ? "bg-signal" : "bg-muted";
}

function IdleCaption({ status }: { status: RealtimeStatus }) {
  return (
    <div className="caption-page flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-3.5 py-2 shadow-soft backdrop-blur-xl">
      <span className={`h-2 w-2 shrink-0 rounded-full ${status === "connecting" ? "bg-amber" : "bg-signal"} animate-pulse`} />
      <span className="text-xs font-semibold tracking-normal text-muted">
        {status === "connecting" ? "Connecting…" : "Listening…"}
      </span>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: SilentSuggestion }) {
  const tone = suggestion.priority === "high" ? "rose" : suggestion.priority === "low" ? "neutral" : "amber";
  return (
    <div className="rounded-[0.55rem] border border-line bg-paper p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-5 text-ink">{suggestion.title}</p>
        <Badge tone={tone}>{suggestion.priority}</Badge>
      </div>
      <p className="mt-1 text-sm leading-5 text-muted">{suggestion.reason}</p>
      <p className="mt-2 text-xs text-muted">{suggestion.source}</p>
    </div>
  );
}

function SearchResultCard({ result }: { result: LiveMemorySearchResult }) {
  const tone = result.type === "memory" ? "cobalt" : result.type === "action" ? "amber" : "signal";
  return (
    <div className="rounded-[0.45rem] border border-line bg-panel/70 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{result.type}</Badge>
        {result.category ? <span className="text-xs font-medium text-muted">{result.category}</span> : null}
        {result.edgeLabel ? <span className="text-xs font-medium text-muted">{result.edgeLabel}</span> : null}
      </div>
      <p className="mt-1.5 text-sm font-semibold leading-5 text-ink">{result.title}</p>
      <p className="mt-1 text-sm leading-5 text-muted">{result.summary || result.snippet || result.source}</p>
    </div>
  );
}

function PartnerRecommendationCard({ partner }: { partner: LivePartnerRecommendation }) {
  const tone = partner.partnerType === "exec_sponsor" ? "rose" : partner.partnerType === "solutions_engineer" ? "cobalt" : "signal";
  return (
    <div className="rounded-[0.45rem] border border-line bg-panel/70 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={tone}>{partner.partnerType.replace("_", " ")}</Badge>
        <span className="text-xs font-medium text-muted">{Math.round(partner.confidence * 100)}% match</span>
        {partner.status ? <span className="text-xs font-medium text-muted">{partner.status}</span> : null}
      </div>
      <p className="mt-1.5 text-sm font-semibold leading-5 text-ink">{partner.name}</p>
      <p className="mt-1 text-sm leading-5 text-muted">{partner.specialty}</p>
      {partner.organization ? <p className="mt-1 text-xs leading-5 text-muted">{partner.organization}</p> : null}
      <p className="mt-2 text-sm leading-5 text-ink">{partner.matchReason}</p>
      <p className="mt-1 text-xs leading-5 text-cobalt">{partner.founderUse}</p>
      {partner.evidence ? <p className="mt-1 text-xs leading-5 text-muted">{partner.evidence}</p> : null}
    </div>
  );
}

function SaveToastNotice({ toast }: { toast: SaveToast }) {
  const toneClass =
    toast.tone === "rose"
      ? "border-rose/40 bg-rose/12"
      : toast.tone === "amber"
        ? "border-amber/40 bg-amber/15"
        : "border-signal/40 bg-signal/15";

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex justify-center sm:bottom-28">
      <div className={`caption-page max-w-sm rounded-full border px-4 py-2 text-sm font-semibold text-ink shadow-diffusion backdrop-blur-xl ${toneClass}`}>
        {toast.text}
      </div>
    </div>
  );
}

function CapturedCard({
  memory,
  saved,
  saving,
  onSave
}: {
  memory: ExtractedMemory;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="rounded-[0.55rem] border border-line bg-paper p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={saved ? "signal" : "neutral"}>{memory.category}</Badge>
        <span className="text-xs font-medium text-muted">{Math.round(memory.confidence * 100)}% confidence</span>
      </div>
      <p className="mt-2 text-sm font-semibold text-ink">{memory.summary}</p>
      {memory.sourceSnippet ? (
        <p className="mt-1 text-sm leading-5 text-muted">&quot;{memory.sourceSnippet}&quot;</p>
      ) : null}
      <button
        type="button"
        onClick={onSave}
        disabled={saved || saving}
        className="focus-ring pressable mt-3 inline-flex items-center justify-center gap-2 rounded-[0.4rem] bg-signal px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-signal/80 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {saved ? "Saved" : saving ? "Saving" : "Save to memory"}
      </button>
    </div>
  );
}
