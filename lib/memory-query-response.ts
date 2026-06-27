import type {
  ActionItem,
  ClientContext,
  EvidenceSnippet,
  MemoryDisplayMode,
  MemoryItem,
  MemoryQueryVisualResponse,
  SuggestedAction
} from "./types";

type Intent =
  | "referral"
  | "relationship"
  | "action"
  | "timeline"
  | "summary"
  | "unknown";

const intentKeywords: Record<Exclude<Intent, "unknown">, string[]> = {
  referral: ["referral", "introduce", "introduction", "intro", "partner", "diego", "marcus", "specialist"],
  relationship: ["relationship", "network", "who", "champion", "buyer", "stakeholder", "referrer", "reports"],
  action: ["promise", "follow-up", "follow up", "action", "send", "remind", "reminder", "todo", "deck", "demo"],
  timeline: ["last time", "history", "timeline", "discuss", "discussed", "previous", "when"],
  summary: ["brief", "summary", "summarize", "know", "context", "overview"]
};

export function buildMemoryQueryVisualResponse(
  context: ClientContext,
  query: string
): MemoryQueryVisualResponse {
  const cleanQuery = query.trim();
  const source = context.memorySource === "neo4j" ? "neo4j" : "demo";
  const intent = detectIntent(cleanQuery);
  const specificTerms = queryTerms(cleanQuery);
  const hasSpecificEvidence = hasTermEvidence(context, specificTerms);
  const matches = findMatchingMemories(context.memories, cleanQuery, intent);
  const matchingActions = findMatchingActions(context.actions, cleanQuery, intent);
  const hasEvidence = matches.length > 0 || matchingActions.length > 0 || intent === "relationship";

  if ((!hasEvidence || (intent === "summary" && specificTerms.length > 0 && !hasSpecificEvidence)) && cleanQuery) {
    return buildMissingInfoResponse(context, cleanQuery);
  }

  const displayMode = selectDisplayMode(intent, matches, matchingActions);
  const citations = buildCitations(matches, matchingActions);
  const base: Pick<
    MemoryQueryVisualResponse,
    "contactId" | "query" | "source" | "displayMode" | "citations" | "researchDelta" | "warning"
  > = {
    contactId: context.contact.id,
    query: cleanQuery,
    source,
    displayMode,
    citations,
    researchDelta: context.researchDelta,
    warning: context.memoryWarning
  };

  if (displayMode === "recommendation") {
    const referralMemory = firstByCategory(matches, "Referral Opportunity") ?? matches[0];
    const introAction = matchingActions.find((action) => action.actionType.includes("intro")) ?? context.actions.find((action) =>
      action.title.toLowerCase().includes("intro")
    );

    return {
      ...base,
      answer: introAction
        ? `${context.contact.name} has an open introduction opportunity. The strongest next step is to use the pending intro: ${introAction.title}.`
        : `${context.contact.name} has an open intro need. Offer a warm introduction only after confirming the specific ask.`,
      cards: [
        {
          id: referralMemory?.id ?? "referral-recommendation",
          eyebrow: "Recommended intro",
          title: introAction?.title ?? "Confirm introduction",
          body:
            introAction?.draftText ??
            referralMemory?.summary ??
            "Confirm the specific need, then propose a warm introduction from the partner network.",
          meta: referralMemory?.source ?? "Contact memory"
        }
      ],
      graph: context.graph,
      actions: toSuggestedActions(
        introAction ? [introAction] : matchingActions.length > 0 ? matchingActions : context.actions.slice(0, 1),
        referralMemory?.summary ?? "Intro opportunity found in contact memory."
      )
    };
  }

  if (displayMode === "graph") {
    return {
      ...base,
      answer: `${context.contact.name}'s visible network includes ${context.graph.nodes
        .filter((node) => node.id !== context.contact.id && node.id !== context.founder.id)
        .map((node) => node.label)
        .join(", ")}.`,
      graph: context.graph,
      cards: context.graph.nodes.map((node) => ({
        id: node.id,
        eyebrow: node.type,
        title: node.label,
        body: node.note,
        meta: context.graph.edges
          .filter((edge) => edge.source === node.id || edge.target === node.id)
          .map((edge) => edge.label)
          .join(", ")
      }))
    };
  }

  if (displayMode === "table") {
    const rows = (matchingActions.length > 0 ? matchingActions : context.actions).map((action) => ({
      label: action.title,
      value: `${action.status} · ${action.dueAt}`,
      detail: action.draftText ?? `${action.actionType} owned by ${action.owner}`
    }));

    return {
      ...base,
      answer:
        rows.length > 0
          ? `There are ${rows.length} relevant pending action${rows.length === 1 ? "" : "s"} for ${context.contact.name}.`
          : `No pending actions matched "${cleanQuery}".`,
      rows,
      actions: toSuggestedActions(matchingActions.length > 0 ? matchingActions : context.actions, "Open follow-up in memory.")
    };
  }

  if (displayMode === "timeline") {
    const timelineItems = (matches.length > 0 ? matches : context.memories)
      .slice()
      .sort((a, b) => dateValue(b.validFrom ?? b.lastConfirmedAt) - dateValue(a.validFrom ?? a.lastConfirmedAt));

    return {
      ...base,
      answer: `The relevant history centers on ${timelineItems
        .slice(0, 3)
        .map((memory) => memory.title)
        .join(", ")}.`,
      rows: timelineItems.map((memory) => ({
        label: memory.validFrom ?? memory.lastConfirmedAt ?? "Memory",
        value: memory.title,
        detail: memory.summary
      })),
      cards: timelineItems.slice(0, 4).map(memoryToCard)
    };
  }

  const cardMemories = matches.length > 0 ? matches : context.memories.slice(0, 4);
  return {
    ...base,
    displayMode: displayMode === "brief" ? "brief" : "cards",
    answer: summarizeMemories(context, cardMemories),
    cards: cardMemories.map(memoryToCard),
    actions: matchingActions.length > 0 ? toSuggestedActions(matchingActions, "Related action from client memory.") : undefined
  };
}

function detectIntent(query: string): Intent {
  const normalized = query.toLowerCase();
  if (!normalized) return "summary";

  for (const [intent, keywords] of Object.entries(intentKeywords) as Array<[Exclude<Intent, "unknown">, string[]]>) {
    if (keywords.some((keyword) => normalized.includes(keyword))) return intent;
  }

  return "unknown";
}

function selectDisplayMode(
  intent: Intent,
  matches: MemoryItem[],
  actions: ActionItem[]
): MemoryDisplayMode {
  if (intent === "referral") return "recommendation";
  if (intent === "relationship") return "graph";
  if (intent === "action" || actions.length > 0) return "table";
  if (intent === "timeline") return "timeline";
  if (matches.length <= 1) return "brief";
  return "cards";
}

function findMatchingMemories(memories: MemoryItem[], query: string, intent: Intent) {
  const terms = queryTerms(query);
  const categoryMatches = memories.filter((memory) => memoryMatchesIntent(memory, intent));
  const textMatches = terms.length
    ? memories.filter((memory) =>
        terms.some((term) =>
          `${memory.title} ${memory.summary} ${memory.category} ${memory.sourceSnippet}`.toLowerCase().includes(term)
        )
      )
    : [];

  return dedupe([...textMatches, ...categoryMatches]).sort((a, b) => b.salience - a.salience).slice(0, 6);
}

function findMatchingActions(actions: ActionItem[], query: string, intent: Intent) {
  const terms = queryTerms(query);
  const textMatches = terms.length
    ? actions.filter((action) =>
        terms.some((term) =>
          `${action.title} ${action.actionType} ${action.status} ${action.draftText ?? ""}`.toLowerCase().includes(term)
        )
      )
    : [];
  const intentMatches =
    intent === "action" || intent === "referral"
      ? actions.filter((action) =>
          intent === "referral"
            ? `${action.title} ${action.actionType}`.toLowerCase().includes("intro")
            : action.status === "pending"
        )
      : [];

  return dedupe([...textMatches, ...intentMatches]).slice(0, 6);
}

function memoryMatchesIntent(memory: MemoryItem, intent: Intent) {
  if (intent === "referral") return memory.category === "Referral Opportunity";
  if (intent === "relationship") return memory.category === "Relationship Mention" || memory.category === "Milestone";
  if (intent === "action") return memory.category === "Promise/Commitment" || memory.category === "Follow-Up Action";
  if (intent === "timeline") return Boolean(memory.validFrom || memory.lastConfirmedAt);
  if (intent === "summary") return memory.salience >= 0.85;
  return false;
}

function buildCitations(memories: MemoryItem[], actions: ActionItem[]): EvidenceSnippet[] {
  return [
    ...memories.map((memory) => ({
      id: memory.id,
      label: memory.title,
      source: memory.source,
      snippet: memory.sourceSnippet || memory.summary,
      confidence: memory.confidence
    })),
    ...actions.map((action) => ({
      id: action.id,
      label: action.title,
      source: action.meetingId,
      snippet: action.draftText ?? `${action.actionType} due ${action.dueAt}`,
      confidence: undefined
    }))
  ].slice(0, 8);
}

function buildMissingInfoResponse(context: ClientContext, query: string): MemoryQueryVisualResponse {
  const title = `No confirmed memory for "${query}"`;

  return {
    contactId: context.contact.id,
    query,
    source: context.memorySource === "neo4j" ? "neo4j" : "demo",
    displayMode: "missing_info",
    answer: `I do not see confirmed memory for "${query}" in ${context.contact.name}'s current record.`,
    citations: [],
    missingInfo: {
      title,
      reason: "The query did not match current memories, actions, or relationship graph evidence.",
      suggestedNextStep: `Ask ${context.contact.name} about this during the meeting, then save it as a pending memory gap for review.`
    },
    actions: [
      {
        id: `memory-gap-${Date.now()}`,
        title: `Capture memory gap: ${query}`,
        reason: "Missing information surfaced during pre-meeting Q&A.",
        owner: context.founder.name,
        status: "suggested"
      }
    ],
    researchDelta: context.researchDelta,
    warning: context.memoryWarning
  };
}

function summarizeMemories(context: ClientContext, memories: MemoryItem[]) {
  if (memories.length === 0) {
    return `No relevant memory was found for ${context.contact.name}.`;
  }

  return `${context.contact.name}: ${memories
    .slice(0, 3)
    .map((memory) => memory.summary)
    .join(" ")}`;
}

function memoryToCard(memory: MemoryItem) {
  return {
    id: memory.id,
    eyebrow: memory.category,
    title: memory.title,
    body: memory.summary,
    meta: memory.source
  };
}

function toSuggestedActions(actions: ActionItem[], reason: string): SuggestedAction[] {
  return actions.map((action) => ({
    id: action.id,
    title: action.title,
    reason,
    owner: action.owner,
    dueAt: action.dueAt,
    status: action.status,
    draftText: action.draftText
  }));
}

function firstByCategory(memories: MemoryItem[], category: MemoryItem["category"]) {
  return memories.find((memory) => memory.category === category);
}

function queryTerms(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2)
    .filter(
      (term) =>
        ![
          "what",
          "who",
          "should",
          "about",
          "know",
          "his",
          "her",
          "the",
          "brief",
          "summary",
          "summarize",
          "overview",
          "context",
          "contact",
          "client",
          "meeting",
          "maya",
          "priya",
          "raj",
          "aisha",
          "sana"
        ].includes(term)
    );
}

function hasTermEvidence(context: ClientContext, terms: string[]) {
  if (terms.length === 0) return true;
  const searchable = [
    ...context.memories.map((memory) => `${memory.title} ${memory.summary} ${memory.category} ${memory.sourceSnippet}`),
    ...context.actions.map((action) => `${action.title} ${action.actionType} ${action.status} ${action.draftText ?? ""}`),
    ...context.graph.nodes.map((node) => `${node.label} ${node.type} ${node.note}`)
  ]
    .join(" ")
    .toLowerCase();

  return terms.some((term) => searchable.includes(term));
}

function dedupe<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function dateValue(value?: string) {
  return value ? Date.parse(value) || 0 : 0;
}
