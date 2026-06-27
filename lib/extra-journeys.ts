import { founder } from "./demo-data";
import type { ActionItem, Contact, Founder, GraphEdge, GraphNode, Meeting, MemoryItem } from "./types";

export type ExtraJourney = {
  founder: Founder;
  contact: Contact;
  meetings: Meeting[];
  memories: MemoryItem[];
  actions: ActionItem[];
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  suggestedQuestions: string[];
  briefing: string;
};

// Extra demo journeys beyond the four primary contacts in demo-data.ts.
// These prove the adaptive briefing/Q&A across additional founder relationships:
//   - a later-stage investor (diligence deepening + partner-meeting scheduling)
//   - a strategic customer (procurement + security review)

const lenaContact: Contact = {
  id: "contact-lena",
  name: "Lena Park",
  relationshipType: "investor",
  organization: "Northstar Capital",
  role: "Partner",
  relationshipSince: "2026-04",
  funnelStage: "diligence"
};

const lenaMeetings: Meeting[] = [
  {
    id: "meeting-2026-06-27-lena",
    contactId: lenaContact.id,
    founderId: founder.id,
    startsAt: "2026-06-27T11:00:00+08:00",
    type: "Diligence follow-up",
    location: "Video",
    objective: "Walk through security review and schedule the IC meeting",
    status: "not_started"
  },
  {
    id: "meeting-2026-05-12-lena",
    contactId: lenaContact.id,
    founderId: founder.id,
    startsAt: "2026-05-12T10:00:00+08:00",
    endedAt: "2026-05-12T10:45:00+08:00",
    type: "Partner meeting",
    location: "In person",
    objective: "Series B diligence kickoff and security posture review",
    status: "review"
  }
];

const lenaMemories: MemoryItem[] = [
  {
    id: "memory-lena-security",
    contactId: lenaContact.id,
    category: "Unresolved Concern",
    title: "Security review still open",
    summary: "Lena's diligence team flagged an open SOC 2 gap and wants it closed before IC.",
    source: "2026-05-12 meeting",
    sourceSnippet: "We need SOC 2 closed out before this goes to investment committee.",
    confidence: 0.93,
    status: "open",
    validFrom: "2026-05-12",
    lastConfirmedAt: "2026-05-12",
    salience: 0.97
  },
  {
    id: "memory-lena-arr-milestone",
    contactId: lenaContact.id,
    category: "Milestone",
    title: "ARR crossed $2M since partner meeting",
    summary: "Meshwave grew from $1.5M to $2M ARR between the partner meeting and now.",
    source: "Internal metric, 2026-06",
    sourceSnippet: "We're at $2M ARR now, up another 33% since we last met.",
    confidence: 0.95,
    status: "known",
    validFrom: "2026-06-10",
    lastConfirmedAt: "2026-06-10",
    salience: 0.95
  },
  {
    id: "memory-lena-ic-goal",
    contactId: lenaContact.id,
    category: "Goal/Objective",
    title: "Get on the IC agenda for July",
    summary: "Lena wants a clean diligence file so Meshwave lands on the July IC agenda.",
    source: "2026-05-12 meeting",
    sourceSnippet: "If the security review closes, I can put you on the July IC agenda.",
    confidence: 0.91,
    status: "known",
    validFrom: "2026-05-12",
    lastConfirmedAt: "2026-05-12",
    salience: 0.92
  },
  {
    id: "memory-lena-se-intro",
    contactId: lenaContact.id,
    category: "Referral Opportunity",
    title: "Open to a security-engineer intro",
    summary: "Lena is open to a warm intro to a solutions engineer who can walk her team through the migration security model.",
    source: "2026-05-12 meeting",
    sourceSnippet: "If you have someone who can walk my team through the security model, let's do that.",
    confidence: 0.9,
    status: "open",
    validFrom: "2026-05-12",
    lastConfirmedAt: "2026-05-12",
    salience: 0.93
  },
  {
    id: "memory-lena-ciso",
    contactId: lenaContact.id,
    category: "Relationship Mention",
    title: "CISO is the security gatekeeper",
    summary: "Her portfolio CISO David runs the security review and should be briefed directly.",
    source: "2026-05-12 meeting",
    sourceSnippet: "David, our portfolio CISO, runs the security review, so bring him in directly.",
    confidence: 0.88,
    status: "known",
    validFrom: "2026-05-12",
    lastConfirmedAt: "2026-05-12",
    salience: 0.85
  },
  {
    id: "memory-lena-promise",
    contactId: lenaContact.id,
    category: "Promise/Commitment",
    title: "Send security one-pager before IC",
    summary: "Maya promised to send a concise security one-pager Lena can circulate before IC.",
    source: "2026-05-12 meeting",
    sourceSnippet: "Send me a one-pager on security I can forward before investment committee.",
    confidence: 0.9,
    status: "open",
    validFrom: "2026-05-12",
    lastConfirmedAt: "2026-05-12",
    salience: 0.86
  }
];

const lenaActions: ActionItem[] = [
  {
    id: "action-lena-diego-intro",
    contactId: lenaContact.id,
    meetingId: lenaMeetings[0].id,
    title: "Introduce Lena to Diego (SE)",
    actionType: "introduction",
    dueAt: "2026-06-29",
    owner: founder.name,
    status: "pending",
    draftText:
      "Lena, I'd like to introduce Diego, our solutions engineer, who can walk your team through the migration security model. Diego, Lena is leading diligence for our Series B and needs the security review closed for the July IC."
  },
  {
    id: "action-lena-security-onepager",
    contactId: lenaContact.id,
    meetingId: lenaMeetings[0].id,
    title: "Send pre-IC security one-pager",
    actionType: "follow_up",
    dueAt: "2026-06-28",
    owner: founder.name,
    status: "pending",
    draftText:
      "Hi Lena, here is the concise security one-pager you can forward to the investment committee before the July agenda is set."
  }
];

const lenaGraphNodes: GraphNode[] = [
  { id: founder.id, label: founder.name, type: "Founder", note: founder.company },
  { id: lenaContact.id, label: lenaContact.name, type: "Contact", note: "Partner, Northstar Capital — diligence lead" },
  { id: "person-lena-david", label: "David Chen", type: "Person", note: "Portfolio CISO — security gatekeeper" },
  { id: "person-lena-associate", label: "Priya Menon", type: "Person", note: "Associate running the diligence file" },
  { id: "opportunity-ic", label: "July IC Slot", type: "Opportunity", note: "Path to term sheet via investment committee" },
  { id: "partner-diego-se", label: "Diego Alvarez", type: "Partner", note: "Meshwave SE — security + migration diligence" },
  { id: "partner-audit", label: "Saanvi Rao", type: "Partner", note: "SOC 2 readiness advisor" }
];

const lenaGraphEdges: GraphEdge[] = [
  { id: "edge-lena-manages", source: founder.id, target: lenaContact.id, label: "raising from" },
  { id: "edge-lena-david", source: lenaContact.id, target: "person-lena-david", label: "relies on" },
  { id: "edge-lena-associate", source: lenaContact.id, target: "person-lena-associate", label: "delegates to" },
  { id: "edge-lena-opportunity", source: lenaContact.id, target: "opportunity-ic", label: "leads to" },
  { id: "edge-lena-diego", source: "opportunity-ic", target: "partner-diego-se", label: "needs" },
  { id: "edge-lena-audit", source: "opportunity-ic", target: "partner-audit", label: "audit support" }
];

const omarContact: Contact = {
  id: "contact-omar",
  name: "Omar Haddad",
  relationshipType: "customer",
  organization: "FreightLogic",
  role: "Head of Platform",
  relationshipSince: "2026-03",
  dealStage: "negotiation"
};

const omarMeetings: Meeting[] = [
  {
    id: "meeting-2026-06-28-omar",
    contactId: omarContact.id,
    founderId: founder.id,
    startsAt: "2026-06-28T15:00:00+08:00",
    type: "Procurement review",
    location: "Video",
    objective: "Close security review and align on contract terms",
    status: "not_started"
  },
  {
    id: "meeting-2026-04-20-omar",
    contactId: omarContact.id,
    founderId: founder.id,
    startsAt: "2026-04-20T14:00:00+08:00",
    endedAt: "2026-04-20T14:40:00+08:00",
    type: "Technical evaluation",
    location: "Video",
    objective: "Legacy TMS migration proof and procurement kickoff",
    status: "review"
  }
];

const omarMemories: MemoryItem[] = [
  {
    id: "memory-omar-tms",
    contactId: omarContact.id,
    category: "Milestone",
    title: "Legacy TMS migration proven",
    summary: "Omar's team validated a legacy TMS migration in the last technical evaluation.",
    source: "2026-04-20 meeting",
    sourceSnippet: "We ran the legacy TMS migration and it held up, so procurement can proceed.",
    confidence: 0.95,
    status: "known",
    validFrom: "2026-04-20",
    lastConfirmedAt: "2026-04-20",
    salience: 0.95
  },
  {
    id: "memory-omar-security",
    contactId: omarContact.id,
    category: "Unresolved Concern",
    title: "Security questionnaire outstanding",
    summary: "Omar's security team has not signed off on the vendor questionnaire yet.",
    source: "2026-04-20 meeting",
    sourceSnippet: "Our security team still needs to sign off on the vendor questionnaire.",
    confidence: 0.92,
    status: "open",
    validFrom: "2026-04-20",
    lastConfirmedAt: "2026-04-20",
    salience: 0.96
  },
  {
    id: "memory-omar-budget",
    contactId: omarContact.id,
    category: "Goal/Objective",
    title: "Close before fiscal year-end",
    summary: "Omar wants the contract signed before FreightLogic's fiscal year-end to lock the budget.",
    source: "2026-04-20 meeting",
    sourceSnippet: "If we can close before fiscal year-end, I can lock in the budget.",
    confidence: 0.9,
    status: "known",
    validFrom: "2026-04-20",
    lastConfirmedAt: "2026-04-20",
    salience: 0.89
  },
  {
    id: "memory-omar-se-intro",
    contactId: omarContact.id,
    category: "Referral Opportunity",
    title: "Wants a solutions-engineer walkthrough",
    summary: "Omar is open to a SE who can answer his security team's integration questions directly.",
    source: "2026-04-20 meeting",
    sourceSnippet: "Can your solutions engineer get on a call with my security team directly?",
    confidence: 0.89,
    status: "open",
    validFrom: "2026-04-20",
    lastConfirmedAt: "2026-04-20",
    salience: 0.9
  },
  {
    id: "memory-omar-champion",
    contactId: omarContact.id,
    category: "Relationship Mention",
    title: "Internal champion is the platform lead",
    summary: "Omar is the internal champion but his VP Sofia owns the final sign-off.",
    source: "2026-04-20 meeting",
    sourceSnippet: "I'm championing this internally, but Sofia, our VP, owns the final sign-off.",
    confidence: 0.88,
    status: "known",
    validFrom: "2026-04-20",
    lastConfirmedAt: "2026-04-20",
    salience: 0.84
  },
  {
    id: "memory-omar-promise",
    contactId: omarContact.id,
    category: "Promise/Commitment",
    title: "Send completed security questionnaire",
    summary: "Maya promised to send the completed security questionnaire ahead of procurement.",
    source: "2026-04-20 meeting",
    sourceSnippet: "Send the filled-in security questionnaire and we'll move to procurement.",
    confidence: 0.9,
    status: "open",
    validFrom: "2026-04-20",
    lastConfirmedAt: "2026-04-20",
    salience: 0.86
  }
];

const omarActions: ActionItem[] = [
  {
    id: "action-omar-questionnaire",
    contactId: omarContact.id,
    meetingId: omarMeetings[0].id,
    title: "Send completed security questionnaire",
    actionType: "follow_up",
    dueAt: "2026-06-29",
    owner: founder.name,
    status: "pending",
    draftText:
      "Hi Omar, here is the completed security questionnaire for your team to sign off so we can move procurement forward before fiscal year-end."
  },
  {
    id: "action-omar-diego-intro",
    contactId: omarContact.id,
    meetingId: omarMeetings[0].id,
    title: "Introduce Omar to Diego (SE)",
    actionType: "introduction",
    dueAt: "2026-07-01",
    owner: founder.name,
    status: "pending",
    draftText:
      "Omar, I'd like to introduce Diego, our solutions engineer, who can walk your security team through the integration and migration model directly. Diego, Omar is closing a FreightLogic deal and his security team needs the integration questions answered."
  }
];

const omarGraphNodes: GraphNode[] = [
  { id: founder.id, label: founder.name, type: "Founder", note: founder.company },
  { id: omarContact.id, label: omarContact.name, type: "Contact", note: "Head of Platform, FreightLogic — champion" },
  { id: "person-omar-sofia", label: "Sofia Bauer", type: "Person", note: "VP — final sign-off owner" },
  { id: "person-omar-sec", label: "Security team", type: "Person", note: "Runs the vendor security review" },
  { id: "opportunity-deal-omar", label: "FreightLogic Deal", type: "Opportunity", note: "Negotiation → closed won before fiscal year-end" },
  { id: "partner-diego-cust", label: "Diego Alvarez", type: "Partner", note: "Meshwave SE — integration + security diligence" },
  { id: "partner-legal", label: "Maya Chen", type: "Partner", note: "Contract redlines via outside counsel" }
];

const omarGraphEdges: GraphEdge[] = [
  { id: "edge-omar-manages", source: founder.id, target: omarContact.id, label: "selling to" },
  { id: "edge-omar-sofia", source: omarContact.id, target: "person-omar-sofia", label: "needs approval from" },
  { id: "edge-omar-sec", source: omarContact.id, target: "person-omar-sec", label: "blocks on" },
  { id: "edge-omar-opportunity", source: omarContact.id, target: "opportunity-deal-omar", label: "advances" },
  { id: "edge-omar-diego", source: "opportunity-deal-omar", target: "partner-diego-cust", label: "needs" },
  { id: "edge-omar-legal", source: "opportunity-deal-omar", target: "partner-legal", label: "contract support" }
];

export const extraJourneys: ExtraJourney[] = [
  {
    founder,
    contact: lenaContact,
    meetings: lenaMeetings,
    memories: lenaMemories,
    actions: lenaActions,
    graphNodes: lenaGraphNodes,
    graphEdges: lenaGraphEdges,
    suggestedQuestions: [
      "What is still open on Lena's security review?",
      "Who should I introduce to close the diligence file?",
      "What should I send before the July IC agenda is set?"
    ],
    briefing:
      "You are meeting Lena Park (Partner, Northstar Capital) at 11:00 AM. The open diligence item is the SOC 2 security review her CISO David needs closed before the July investment committee. Meshwave has since crossed $2M ARR. Open by confirming the security one-pager, then offer a warm intro to Diego so her team can pressure-test the migration security model before IC."
  },
  {
    founder,
    contact: omarContact,
    meetings: omarMeetings,
    memories: omarMemories,
    actions: omarActions,
    graphNodes: omarGraphNodes,
    graphEdges: omarGraphEdges,
    suggestedQuestions: [
      "What is blocking Omar's security sign-off?",
      "Who is the economic buyer at FreightLogic?",
      "How does the fiscal year-end deadline shape the plan?"
    ],
    briefing:
      "You are meeting Omar Haddad (Head of Platform, FreightLogic) at 3:00 PM. His team already validated the legacy TMS migration, but the security questionnaire is still outstanding and his VP Sofia owns final sign-off. He wants to close before fiscal year-end. Confirm the completed questionnaire, then offer a Diego intro so his security team can resolve integration questions directly."
  }
];
