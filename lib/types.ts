// Forebrief domain contracts.
// A startup founder's relationship graph spans investors, customers, advisors,
// and candidates. The graph, memory, action, and partner shapes are deliberately
// type-agnostic: the relationship type parameterizes behavior, not structure.

export type MeetingStatus = "not_started" | "briefed" | "listening" | "review";

export type RelationshipType = "investor" | "customer" | "advisor" | "candidate";

export type MemoryCategory =
  | "Milestone"
  | "Signal"
  | "Unresolved Concern"
  | "Goal/Objective"
  | "Promise/Commitment"
  | "Relationship Mention"
  | "Referral Opportunity"
  | "Follow-Up Action";

export type Founder = {
  id: string;
  name: string;
  company: string;
};

export type Contact = {
  id: string;
  name: string;
  relationshipType: RelationshipType;
  organization: string;
  role: string;
  relationshipSince: string;
  // Investor-specific: where this investor sits in the founder's raise funnel.
  funnelStage?: "researching" | "outreach" | "first call" | "partner meeting" | "diligence" | "passed" | "term sheet";
  // Customer-specific: deal stage in the founder's sales pipeline.
  dealStage?: "discovery" | "qualified" | "demo" | "negotiation" | "closed won" | "closed lost";
};

export type Meeting = {
  id: string;
  contactId: string;
  founderId: string;
  startsAt: string;
  endedAt?: string;
  type: string;
  location: string;
  objective: string;
  status: MeetingStatus;
};

export type MemoryItem = {
  id: string;
  contactId: string;
  category: MemoryCategory;
  title: string;
  summary: string;
  source: string;
  sourceSnippet: string;
  confidence: number;
  status: "known" | "open" | "pending" | "approved" | "ignored";
  validFrom?: string;
  lastConfirmedAt?: string;
  updatedAt?: string;
  createdAt?: string;
  salience: number;
};

export type ActionItem = {
  id: string;
  contactId: string;
  meetingId: string;
  title: string;
  actionType: string;
  dueAt: string;
  owner: string;
  status: "pending" | "approved" | "completed" | "ignored";
  draftText?: string;
};

export type GraphNode = {
  id: string;
  label: string;
  type: "Founder" | "Contact" | "Person" | "Partner" | "Opportunity";
  note: string;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

export type PartnerType =
  | "solutions_engineer"
  | "exec_sponsor"
  | "advisor"
  | "investor_intro"
  | "candidate_referrer"
  | "other";

export type PartnerProfile = {
  id: string;
  name: string;
  partnerType: PartnerType;
  specialty: string;
  organization?: string;
  note: string;
  keywords: string[];
  introStatus: "trusted" | "available" | "unknown";
};

export type LivePartnerRecommendation = {
  id: string;
  name: string;
  partnerType: PartnerType;
  specialty: string;
  organization?: string;
  matchReason: string;
  founderUse: string;
  source: string;
  confidence: number;
  status?: string;
  relationshipLabel?: string;
  evidence?: string;
};

export type LivePartnerRecommendationResponse = {
  contactId: string;
  need: string;
  reason?: string;
  source: "neo4j" | "demo";
  results: LivePartnerRecommendation[];
  warning?: string;
};

export type MemoryDisplayMode =
  | "brief"
  | "cards"
  | "table"
  | "graph"
  | "timeline"
  | "recommendation"
  | "missing_info";

export type EvidenceSnippet = {
  id: string;
  label: string;
  source: string;
  snippet: string;
  confidence?: number;
  url?: string;
  publishedAt?: string;
  // Whether this evidence came from live external research (Exa) or internal memory.
  origin?: "internal" | "external";
};

export type SuggestedAction = {
  id: string;
  title: string;
  reason: string;
  owner?: string;
  dueAt?: string;
  status?: ActionItem["status"] | "suggested";
  draftText?: string;
};

export type MemoryQueryVisualResponse = {
  contactId: string;
  query: string;
  source: "neo4j" | "demo";
  displayMode: MemoryDisplayMode;
  answer: string;
  citations: EvidenceSnippet[];
  cards?: Array<{ id: string; title: string; eyebrow: string; body: string; meta?: string }>;
  rows?: Array<{ label: string; value: string; detail?: string }>;
  graph?: { nodes: GraphNode[]; edges: GraphEdge[] };
  actions?: SuggestedAction[];
  missingInfo?: { title: string; reason: string; suggestedNextStep: string };
  // Live external intelligence delta (Exa) fused into this response.
  researchDelta?: ResearchDelta;
  warning?: string;
};

// "What changed since last time" — external intelligence layered on a briefing.
export type ResearchDelta = {
  contactId: string;
  relationshipType: RelationshipType;
  source: "exa" | "seeded" | "cached";
  updatedAt: string;
  summary: string;
  signals: EvidenceSnippet[];
  warning?: string;
};

export type LiveMemorySearchResult = {
  id: string;
  type: "memory" | "action" | "graph";
  title: string;
  summary: string;
  source: string;
  category?: MemoryCategory;
  status?: string;
  snippet?: string;
  confidence?: number;
  edgeLabel?: string;
};

export type LiveMemorySearchResponse = {
  contactId: string;
  query: string;
  reason?: string;
  source: "neo4j" | "demo";
  results: LiveMemorySearchResult[];
  warning?: string;
};

export type SaveMemoryResult = {
  writeMode: "neo4j" | "demo";
  saved: boolean;
  duplicate?: boolean;
  existingId?: string;
  reason?: string;
};

export type ContactContext = {
  founder: Founder;
  contact: Contact;
  upcomingMeeting: Meeting;
  lastMeeting: Meeting;
  memories: MemoryItem[];
  actions: ActionItem[];
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  suggestedQuestions: string[];
  briefing: string;
  memorySource?: "neo4j" | "demo";
  dataMode?: "neo4j" | "hybrid" | "demo";
  memoryWarning?: string;
  researchDelta?: ResearchDelta;
};

export type TranscriptEvent = {
  id: string;
  speaker: "founder" | "contact" | "unknown";
  text: string;
  timestamp: string;
};

export type ExtractedMemory = {
  id: string;
  contactId: string;
  category: MemoryCategory;
  summary: string;
  sourceSnippet: string;
  timestamp: string;
  confidence: number;
  proposedGraphMutation: string;
};

export type SilentSuggestion = {
  id: string;
  title: string;
  reason: string;
  source: string;
  priority: "high" | "medium" | "low";
};

export type TranscriptTurn = {
  id: string;
  speaker: "founder" | "contact" | "unknown";
  text: string;
  at: string;
};

export type RelevantMemory = {
  memoryId: string;
  reason: string;
};

export type LiveAnalysisResponse = {
  source: "openai" | "demo";
  attributions: Array<{ id: string; speaker: "founder" | "contact" }>;
  suggestions: SilentSuggestion[];
  extracted: ExtractedMemory[];
  relevant: RelevantMemory[];
  warning?: string;
};

// Back-compat aliases. The domain was reframed from advisor→founder, client→contact,
// but many call sites still reference the old names. These aliases keep them compiling
// during the migration; new code should use Founder / Contact / ContactContext.
export type Advisor = Founder;
export type Client = Contact;
export type ClientContext = ContactContext;
