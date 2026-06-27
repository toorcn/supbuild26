import type {
  ActionItem,
  ContactContext,
  Contact,
  ExtractedMemory,
  Founder,
  GraphEdge,
  GraphNode,
  Meeting,
  MemoryItem,
  PartnerProfile,
  SilentSuggestion,
  TranscriptEvent
} from "./types";

// Forebrief demo world.
//
// Founder Maya Chen is raising a Series A for Meshwave, an integration platform.
// Her relationship graph spans four relationship types, proving the "one memory
// for everyone the founder knows" thesis:
//   - investor  : Priya Iyer (Principal, Lattice Ventures)  <- the deep live flow
//   - customer  : Raj Patel (VP Eng, Northwind Logistics)
//   - advisor   : Aisha Bello (GTM advisor)
//   - candidate : Sana Okafor (founding-engineer candidate)
//
// The live companion + Exa fusion runs on the investor flow; the other three
// contacts prove the adaptive briefing/Q&A works across relationship types.
//
// This module is BOTH the zero-config fallback (DATA_MODE=demo) AND the seed
// source for real Neo4j via seed-neo4j.ts. The primary judging path is real
// Neo4j + real Exa; this seeded world is the resilient baseline beneath it.

export const founder: Founder = {
  id: "founder-maya",
  name: "Maya Chen",
  company: "Meshwave"
};

export const contacts: Contact[] = [
  {
    id: "contact-priya",
    name: "Priya Iyer",
    relationshipType: "investor",
    organization: "Lattice Ventures",
    role: "Principal",
    relationshipSince: "2026-03",
    funnelStage: "first call"
  },
  {
    id: "contact-raj",
    name: "Raj Patel",
    relationshipType: "customer",
    organization: "Northwind Logistics",
    role: "VP Engineering",
    relationshipSince: "2026-02",
    dealStage: "demo"
  },
  {
    id: "contact-aisha",
    name: "Aisha Bello",
    relationshipType: "advisor",
    organization: "Independent",
    role: "GTM Advisor",
    relationshipSince: "2025-11"
  },
  {
    id: "contact-sana",
    name: "Sana Okafor",
    relationshipType: "candidate",
    organization: "Current: Legacy Systems Inc.",
    role: "Senior Engineer",
    relationshipSince: "2026-05"
  }
];

export const primaryContact = contacts[0];

export const meetings: Meeting[] = [
  {
    id: "meeting-2026-06-20-priya",
    contactId: "contact-priya",
    founderId: founder.id,
    startsAt: "2026-06-20T10:30:00+08:00",
    type: "Investor follow-up",
    location: "Video",
    objective: "Reconfirm diligence path and schedule the partner meeting",
    status: "not_started"
  },
  {
    id: "meeting-2026-04-08-priya",
    contactId: "contact-priya",
    founderId: founder.id,
    startsAt: "2026-04-08T11:00:00+08:00",
    endedAt: "2026-04-08T11:42:00+08:00",
    type: "First call",
    location: "Video",
    objective: "Series A intro and integration-risk diligence",
    status: "review"
  },
  {
    id: "meeting-2026-06-22-raj",
    contactId: "contact-raj",
    founderId: founder.id,
    startsAt: "2026-06-22T14:00:00+08:00",
    type: "Technical demo",
    location: "Video",
    objective: "Prove legacy WMS migration in a live demo",
    status: "not_started"
  },
  {
    id: "meeting-2026-04-15-raj",
    contactId: "contact-raj",
    founderId: founder.id,
    startsAt: "2026-04-15T15:00:00+08:00",
    endedAt: "2026-04-15T15:50:00+08:00",
    type: "Discovery",
    location: "Video",
    objective: "Understand Northwind's integration pain and budget",
    status: "review"
  },
  {
    id: "meeting-2026-06-25-aisha",
    contactId: "contact-aisha",
    founderId: founder.id,
    startsAt: "2026-06-25T09:30:00+08:00",
    type: "Advisory sync",
    location: "Coffee",
    objective: "Pressure-test the Series A narrative and pricing",
    status: "not_started"
  },
  {
    id: "meeting-2026-06-26-sana",
    contactId: "contact-sana",
    founderId: founder.id,
    startsAt: "2026-06-26T16:00:00+08:00",
    type: "Final round",
    location: "Onsite",
    objective: "Systems-design round and team fit",
    status: "not_started"
  }
];

// Per-contact internal memories. The investor contact carries the richest set
// because that is the deep live-companion flow; the others carry enough for
// briefing and adaptive Q&A.
export const memoriesByContact: Record<string, MemoryItem[]> = {
  "contact-priya": [
    {
      id: "memory-priya-arr",
      contactId: "contact-priya",
      category: "Milestone",
      title: "Meshwave crossed $1.5M ARR",
      summary: "Meshwave hit $1.5M ARR since the last call, up 2x.",
      source: "Internal metric, 2026-06",
      sourceSnippet: "We grew from $750k to $1.5M ARR in the last two quarters.",
      confidence: 0.97,
      status: "known",
      validFrom: "2026-06-01",
      lastConfirmedAt: "2026-06-10",
      salience: 0.95
    },
    {
      id: "memory-priya-integration",
      contactId: "contact-priya",
      category: "Unresolved Concern",
      title: "Legacy WMS integration risk is open",
      summary: "Priya flagged migrating off a legacy WMS as the main diligence risk last call.",
      source: "2026-04-08 meeting",
      sourceSnippet: "I love the traction, but I need to be sure a customer can migrate off a legacy system without a six-month project.",
      confidence: 0.93,
      status: "open",
      validFrom: "2026-04-08",
      lastConfirmedAt: "2026-04-08",
      salience: 0.98
    },
    {
      id: "memory-priya-arr-bar",
      contactId: "contact-priya",
      category: "Goal/Objective",
      title: "Path to $10M ARR is her bar",
      summary: "Priya wants a credible path to $10M ARR before a term sheet.",
      source: "2026-04-08 meeting",
      sourceSnippet: "Show me a repeatable path to $10M and we can talk terms.",
      confidence: 0.9,
      status: "known",
      validFrom: "2026-04-08",
      lastConfirmedAt: "2026-04-08",
      salience: 0.88
    },
    {
      id: "memory-priya-roi-promise",
      contactId: "contact-priya",
      category: "Promise/Commitment",
      title: "ROI deck + migration case study promised",
      summary: "Maya promised to send the ROI deck and a migration case study.",
      source: "2026-04-08 meeting",
      sourceSnippet: "I'll send the ROI deck and the Northwind migration case study after this.",
      confidence: 0.95,
      status: "open",
      validFrom: "2026-04-08",
      lastConfirmedAt: "2026-04-08",
      salience: 0.86
    },
    {
      id: "memory-priya-partner-intro",
      contactId: "contact-priya",
      category: "Referral Opportunity",
      title: "Partner-meeting intro available",
      summary: "Priya can intro Maya to her partner Marcus for the next stage.",
      source: "2026-04-08 meeting",
      sourceSnippet: "If diligence checks out, I'll bring Marcus into the next conversation.",
      confidence: 0.88,
      status: "open",
      validFrom: "2026-04-08",
      lastConfirmedAt: "2026-04-08",
      salience: 0.9
    }
  ],
  "contact-raj": [
    {
      id: "memory-raj-champion",
      contactId: "contact-raj",
      category: "Relationship Mention",
      title: "Raj is the technical champion",
      summary: "Raj owns the integration rewrite and is the internal champion.",
      source: "2026-04-15 meeting",
      sourceSnippet: "I've been trying to replace our legacy WMS for two years.",
      confidence: 0.94,
      status: "known",
      validFrom: "2026-04-15",
      lastConfirmedAt: "2026-04-15",
      salience: 0.92
    },
    {
      id: "memory-raj-budget",
      contactId: "contact-raj",
      category: "Milestone",
      title: "Budget approved for FY",
      summary: "Northwind approved integration budget for the fiscal year.",
      source: "2026-04-15 meeting",
      sourceSnippet: "We finally have budget approved for the integration work.",
      confidence: 0.91,
      status: "known",
      validFrom: "2026-04-15",
      lastConfirmedAt: "2026-04-15",
      salience: 0.9
    },
    {
      id: "memory-raj-risk",
      contactId: "contact-raj",
      category: "Unresolved Concern",
      title: "CFO wants migration proof",
      summary: "Raj's CFO wants a live demo proving legacy WMS migration before signing.",
      source: "2026-04-15 meeting",
      sourceSnippet: "My CFO won't sign until she sees the legacy migration actually work.",
      confidence: 0.92,
      status: "open",
      validFrom: "2026-04-15",
      lastConfirmedAt: "2026-04-15",
      salience: 0.96
    },
    {
      id: "memory-raj-demo-promise",
      contactId: "contact-raj",
      category: "Promise/Commitment",
      title: "Live migration demo promised",
      summary: "Maya promised a live demo migrating a sample legacy WMS workflow.",
      source: "2026-04-15 meeting",
      sourceSnippet: "I'll run a live demo where we migrate one of your legacy WMS workflows.",
      confidence: 0.95,
      status: "open",
      validFrom: "2026-04-15",
      lastConfirmedAt: "2026-04-15",
      salience: 0.88
    }
  ],
  "contact-aisha": [
    {
      id: "memory-aisha-pricing",
      contactId: "contact-aisha",
      category: "Goal/Objective",
      title: "Pricing for enterprise tier",
      summary: "Aisha is pressure-testing the enterprise pricing tier before the raise.",
      source: "2026-05 sync",
      sourceSnippet: "Your enterprise pricing is too low relative to the migration value.",
      confidence: 0.9,
      status: "open",
      validFrom: "2026-05-20",
      lastConfirmedAt: "2026-05-20",
      salience: 0.9
    },
    {
      id: "memory-aisha-narrative",
      contactId: "contact-aisha",
      category: "Unresolved Concern",
      title: "Series A narrative not sharp yet",
      summary: "Aisha feels the Series A story undersells the migration moat.",
      source: "2026-05 sync",
      sourceSnippet: "You're leading with traction, but the moat is the migration engine.",
      confidence: 0.88,
      status: "open",
      validFrom: "2026-05-20",
      lastConfirmedAt: "2026-05-20",
      salience: 0.92
    },
    {
      id: "memory-aisha-intro",
      contactId: "contact-aisha",
      category: "Referral Opportunity",
      title: "Can intro enterprise accounts",
      summary: "Aisha can intro two enterprise logistics accounts if pricing is set.",
      source: "2026-05 sync",
      sourceSnippet: "Set the enterprise price and I'll intro you to two accounts.",
      confidence: 0.86,
      status: "open",
      validFrom: "2026-05-20",
      lastConfirmedAt: "2026-05-20",
      salience: 0.85
    }
  ],
  "contact-sana": [
    {
      id: "memory-sana-legacy",
      contactId: "contact-sana",
      category: "Milestone",
      title: "Deep legacy-systems experience",
      summary: "Sana has shipped legacy-system migrations at her current role.",
      source: "2026-05 screen",
      sourceSnippet: "I've spent five years migrating legacy WMS and ERP systems.",
      confidence: 0.92,
      status: "known",
      validFrom: "2026-05-10",
      lastConfirmedAt: "2026-05-10",
      salience: 0.93
    },
    {
      id: "memory-sana-motivation",
      contactId: "contact-sana",
      category: "Signal",
      title: "Wants founding ownership",
      summary: "Sana is exploring roles to get founding-level ownership and impact.",
      source: "2026-05 screen",
      sourceSnippet: "I want a founding role where I own the hard migration problems.",
      confidence: 0.89,
      status: "known",
      validFrom: "2026-05-10",
      lastConfirmedAt: "2026-05-10",
      salience: 0.9
    },
    {
      id: "memory-sana-concern",
      contactId: "contact-sana",
      category: "Unresolved Concern",
      title: "Unclear on equity range",
      summary: "Sana's open question is the equity range for a founding engineer.",
      source: "2026-05 screen",
      sourceSnippet: "I need to understand the equity range before I can commit.",
      confidence: 0.85,
      status: "open",
      validFrom: "2026-05-10",
      lastConfirmedAt: "2026-05-10",
      salience: 0.88
    }
  ]
};

export const actionsByContact: Record<string, ActionItem[]> = {
  "contact-priya": [
    {
      id: "action-priya-roi",
      contactId: "contact-priya",
      meetingId: "meeting-2026-06-20-priya",
      title: "Send ROI deck + migration case study",
      actionType: "follow_up",
      dueAt: "2026-06-21",
      owner: founder.name,
      status: "pending",
      draftText:
        "Hi Priya, as promised here are the ROI deck and the Northwind migration case study. The case study shows the legacy WMS cutover in three weeks. Happy to walk Diego through the technical diligence."
    },
    {
      id: "action-priya-diego",
      contactId: "contact-priya",
      meetingId: "meeting-2026-06-20-priya",
      title: "Draft intro to Diego (SE)",
      actionType: "introduction",
      dueAt: "2026-06-24",
      owner: founder.name,
      status: "pending",
      draftText:
        "Priya, I'd like to introduce Diego, our solutions engineer, who ran the Northwind legacy WMS migration. Diego, Priya is leading diligence for our Series A and wants to pressure-test the migration path."
    },
    {
      id: "action-priya-marcus",
      contactId: "contact-priya",
      meetingId: "meeting-2026-06-20-priya",
      title: "Request partner-meeting with Marcus",
      actionType: "follow_up",
      dueAt: "2026-06-28",
      owner: founder.name,
      status: "pending"
    }
  ],
  "contact-raj": [
    {
      id: "action-raj-demo",
      contactId: "contact-raj",
      meetingId: "meeting-2026-06-22-raj",
      title: "Run live legacy WMS migration demo",
      actionType: "follow_up",
      dueAt: "2026-06-22",
      owner: founder.name,
      status: "pending"
    }
  ],
  "contact-aisha": [
    {
      id: "action-aisha-pricing",
      contactId: "contact-aisha",
      meetingId: "meeting-2026-06-25-aisha",
      title: "Share revised enterprise pricing",
      actionType: "follow_up",
      dueAt: "2026-06-25",
      owner: founder.name,
      status: "pending"
    }
  ],
  "contact-sana": [
    {
      id: "action-sana-equity",
      contactId: "contact-sana",
      meetingId: "meeting-2026-06-26-sana",
      title: "Send equity range + offer frame",
      actionType: "follow_up",
      dueAt: "2026-06-27",
      owner: founder.name,
      status: "pending"
    }
  ]
};

// Relationship graphs. The investor graph maps the diligence + intro network;
// the others map their respective stakeholder networks.
export const graphByContact: Record<string, { nodes: GraphNode[]; edges: GraphEdge[] }> = {
  "contact-priya": {
    nodes: [
      { id: founder.id, label: founder.name, type: "Founder", note: founder.company },
      { id: "contact-priya", label: "Priya Iyer", type: "Contact", note: "Principal, Lattice Ventures" },
      { id: "person-marcus", label: "Marcus Reyes", type: "Person", note: "Partner, Lattice Ventures — next stage" },
      { id: "partner-diego", label: "Diego Alvarez", type: "Partner", note: "Meshwave SE — technical diligence" },
      { id: "opportunity-partner-meeting", label: "Partner Meeting", type: "Opportunity", note: "Warm path to term sheet" }
    ],
    edges: [
      { id: "edge-priya-manages", source: founder.id, target: "contact-priya", label: "raising from" },
      { id: "edge-priya-marcus", source: "contact-priya", target: "person-marcus", label: "reports to" },
      { id: "edge-priya-opportunity", source: "contact-priya", target: "opportunity-partner-meeting", label: "leads to" },
      { id: "edge-priya-diego", source: "opportunity-partner-meeting", target: "partner-diego", label: "needs" }
    ]
  },
  "contact-raj": {
    nodes: [
      { id: founder.id, label: founder.name, type: "Founder", note: founder.company },
      { id: "contact-raj", label: "Raj Patel", type: "Contact", note: "VP Eng, Northwind — champion" },
      { id: "person-cfo", label: "Helena Wu", type: "Person", note: "CFO, Northwind — economic buyer" },
      { id: "person-it-lead", label: "Sam Tan", type: "Person", note: "IT lead, Northwind — implementer" },
      { id: "opportunity-deal", label: "Enterprise Deal", type: "Opportunity", note: "Demo → closed won" }
    ],
    edges: [
      { id: "edge-raj-sells", source: founder.id, target: "contact-raj", label: "selling to" },
      { id: "edge-raj-cfo", source: "contact-raj", target: "person-cfo", label: "needs approval from" },
      { id: "edge-raj-it", source: "contact-raj", target: "person-it-lead", label: "implements with" },
      { id: "edge-raj-deal", source: "contact-raj", target: "opportunity-deal", label: "advances" }
    ]
  },
  "contact-aisha": {
    nodes: [
      { id: founder.id, label: founder.name, type: "Founder", note: founder.company },
      { id: "contact-aisha", label: "Aisha Bello", type: "Contact", note: "GTM advisor" },
      { id: "person-enterprise1", label: "FleetCo intro", type: "Person", note: "Enterprise account intro" },
      { id: "person-enterprise2", label: "CargoWorks intro", type: "Person", note: "Enterprise account intro" },
      { id: "opportunity-pricing", label: "Enterprise Pricing", type: "Opportunity", note: "Unblock enterprise revenue" }
    ],
    edges: [
      { id: "edge-aisha-advises", source: founder.id, target: "contact-aisha", label: "advised by" },
      { id: "edge-aisha-intro1", source: "contact-aisha", target: "person-enterprise1", label: "can intro" },
      { id: "edge-aisha-intro2", source: "contact-aisha", target: "person-enterprise2", label: "can intro" },
      { id: "edge-aisha-pricing", source: "contact-aisha", target: "opportunity-pricing", label: "unblocks" }
    ]
  },
  "contact-sana": {
    nodes: [
      { id: founder.id, label: founder.name, type: "Founder", note: founder.company },
      { id: "contact-sana", label: "Sana Okafor", type: "Contact", note: "Founding-engineer candidate" },
      { id: "person-referrer", label: "Diego Alvarez", type: "Person", note: "Referrer — Meshwave SE" },
      { id: "opportunity-offer", label: "Founding Engineer Offer", type: "Opportunity", note: "Owns migration engine" }
    ],
    edges: [
      { id: "edge-sana-recruits", source: founder.id, target: "contact-sana", label: "recruiting" },
      { id: "edge-sana-referrer", source: "contact-sana", target: "person-referrer", label: "referred by" },
      { id: "edge-sana-offer", source: "contact-sana", target: "opportunity-offer", label: "leads to" }
    ]
  }
};

export const partnerProfiles: PartnerProfile[] = [
  {
    id: "partner-diego",
    name: "Diego Alvarez",
    partnerType: "solutions_engineer",
    specialty: "Legacy WMS / ERP migration and technical diligence",
    organization: "Meshwave",
    note: "Our SE. Runs legacy migrations and supports investor + customer technical diligence.",
    keywords: ["migration", "legacy", "wms", "erp", "integration", "diligence", "demo", "technical"],
    introStatus: "trusted"
  },
  {
    id: "partner-marcus",
    name: "Marcus Reyes",
    partnerType: "investor_intro",
    specialty: "Partner at Lattice Ventures — next-stage decision maker",
    organization: "Lattice Ventures",
    note: "Partner who greenlights term sheets. Warm path is through Priya.",
    keywords: ["partner", "term sheet", "lattice", "investment", "decision", "greenlight"],
    introStatus: "available"
  },
  {
    id: "partner-exec",
    name: "Helena Wu",
    partnerType: "exec_sponsor",
    specialty: "Economic buyer — signs enterprise deals",
    organization: "Northwind Logistics",
    note: "Northwind CFO. Needs a live migration demo before signing.",
    keywords: ["cfo", "economic buyer", "sign", "budget", "approve", "enterprise"],
    introStatus: "available"
  },
  {
    id: "partner-aisha",
    name: "Aisha Bello",
    partnerType: "advisor",
    specialty: "GTM, pricing, and enterprise intros",
    organization: "Independent",
    note: "GTM advisor. Pressure-tests narrative and intros enterprise accounts.",
    keywords: ["gtm", "pricing", "narrative", "enterprise", "intro", "sales", "advisor"],
    introStatus: "trusted"
  },
  {
    id: "partner-referrer",
    name: "Diego Alvarez",
    partnerType: "candidate_referrer",
    specialty: "Engineering referrals and technical screens",
    organization: "Meshwave",
    note: "Our SE also sources engineering candidates and runs technical screens.",
    keywords: ["candidate", "engineer", "referral", "screen", "hire", "founding"],
    introStatus: "trusted"
  }
];

export const suggestedQuestionsByContact: Record<string, string[]> = {
  "contact-priya": [
    "What should I open with?",
    "What is still unresolved from the last call?",
    "Who should I introduce for technical diligence?",
    "What has changed at Lattice since we last spoke?"
  ],
  "contact-raj": [
    "What should I prove in the demo?",
    "Who is the economic buyer?",
    "What is still unresolved from the last call?",
    "What has changed at Northwind since we last spoke?"
  ],
  "contact-aisha": [
    "What should I pressure-test?",
    "What is still unresolved on pricing?",
    "Who can she introduce?",
    "What has she said publicly recently?"
  ],
  "contact-sana": [
    "What should I open with?",
    "What is her open concern?",
    "Who referred her?",
    "What has she shipped recently?"
  ]
};

export const briefingsByContact: Record<string, string> = {
  "contact-priya":
    "You are meeting Priya Iyer (Principal, Lattice Ventures) at 10:30. You last spoke on 2026-04-08. Last time, legacy WMS integration was her main diligence risk, and she set a path-to-$10M-ARR bar. Meshwave has since crossed $1.5M ARR. Live research surfaces that Lattice just announced an AI-infrastructure thesis and Priya posted about legacy-system modernization — open by acknowledging the thesis shift, then move into the migration story. Useful next questions: what is still unresolved on integration risk, and would a warm intro to Diego (our SE) advance diligence?",
  "contact-raj":
    "You are meeting Raj Patel (VP Eng, Northwind Logistics) at 14:00 for a technical demo. You last spoke on 2026-04-15. His CFO Helena needs a live legacy WMS migration demo before signing. Live research surfaces that Northwind just expanded its engineering org and a competitor had a public outage — lean on the migration proof and the outage as counter-positioning. Useful next questions: what should I prove in the demo, and who is the economic buyer?",
  "contact-aisha":
    "You are meeting Aisha Bello (GTM advisor) on 2026-06-25 to pressure-test the Series A narrative and pricing. Her open notes: enterprise pricing is too low, and the narrative undersells the migration moat. Live research surfaces that she recently published on enterprise pricing models for infra startups. Useful next questions: what should I pressure-test, and who can she introduce?",
  "contact-sana":
    "You are meeting Sana Okafor on 2026-06-26 for a final-round systems-design interview. She has deep legacy-systems experience and wants founding ownership; her open question is the equity range. Diego referred her. Live research surfaces that she recently shipped a high-profile legacy ERP migration at her current company. Useful next questions: what should I open with, and what is her open concern?"
};

export function getContact(contactId: string): Contact | undefined {
  return contacts.find((contact) => contact.id === contactId);
}

export function getClientContext(clientId = primaryContact.id): ContactContext {
  const contact = getContact(clientId);
  if (!contact) {
    throw new Error(`Unknown demo contact: ${clientId}`);
  }

  const contactMeetings = meetings.filter((meeting) => meeting.contactId === contact.id);
  const upcoming = contactMeetings.find((meeting) => meeting.status !== "review") ?? contactMeetings[0];
  const last = contactMeetings.find((meeting) => meeting.status === "review") ?? contactMeetings[1];

  return {
    founder,
    contact,
    upcomingMeeting: upcoming,
    lastMeeting: last,
    memories: memoriesByContact[contact.id] ?? [],
    actions: actionsByContact[contact.id] ?? [],
    graph: graphByContact[contact.id] ?? { nodes: [], edges: [] },
    suggestedQuestions: suggestedQuestionsByContact[contact.id] ?? [],
    memorySource: "demo",
    briefing: briefingsByContact[contact.id] ?? ""
  };
}

// Back-compat aliases used by some routes/scripts.
export const client = primaryContact;
export const advisor = founder;

export function getMeeting(meetingId: string): Meeting | undefined {
  return meetings.find((meeting) => meeting.id === meetingId);
}

export function getCalendar() {
  return meetings
    .filter((meeting) => meeting.status !== "review")
    .map((meeting) => {
      const contact = getContact(meeting.contactId);
      return {
        ...meeting,
        founder,
        contact,
        client: contact
      };
    });
}

// Live-companion signal extraction for the investor flow (the deep demo path).
// Mirrors the original five-act arc: milestone → unresolved concern → intro → follow-up,
// now with the Exa-surfaced thesis signal as the opening beat.
export function extractMeetingSignals(events: TranscriptEvent[]) {
  const text = events.map((event) => event.text).join(" ").toLowerCase();
  const now = new Date().toISOString();
  const extracted: ExtractedMemory[] = [];
  const suggestions: SilentSuggestion[] = [];
  const contactId = primaryContact.id;

  if (text.includes("thesis") || text.includes("ai-infrastructure") || text.includes("lattice")) {
    suggestions.push({
      id: "suggest-thesis",
      title: "Acknowledge Lattice's AI-infra thesis",
      reason: "Live research surfaced that Lattice announced a new AI-infrastructure thesis since the last call.",
      source: "External signal: Lattice Ventures thesis announcement",
      priority: "medium"
    });
    extracted.push({
      id: "extract-thesis",
      contactId,
      category: "Signal",
      summary: "Priya's fund announced an AI-infrastructure thesis since the last call.",
      sourceSnippet: latestMatchingSnippet(events, ["thesis", "ai-infrastructure", "lattice"]),
      timestamp: now,
      confidence: 0.88,
      proposedGraphMutation:
        "MERGE (c:Contact {id: 'contact-priya'})-[:HAS_SIGNAL]->(:Signal {title: 'Lattice AI-infra thesis'})"
    });
  }

  if (text.includes("arr") || text.includes("traction") || text.includes("1.5")) {
    suggestions.push({
      id: "suggest-traction",
      title: "Lead with the $1.5M ARR milestone",
      reason: "ARR growth is high-salience internal memory and counters the integration-risk frame.",
      source: "Internal milestone: Meshwave crossed $1.5M ARR",
      priority: "high"
    });
    extracted.push({
      id: "extract-traction",
      contactId,
      category: "Milestone",
      summary: "The $1.5M ARR milestone came up as the lead traction proof.",
      sourceSnippet: latestMatchingSnippet(events, ["arr", "traction", "1.5"]),
      timestamp: now,
      confidence: 0.9,
      proposedGraphMutation:
        "MERGE (c:Contact {id: 'contact-priya'})-[:HAS_MILESTONE]->(:Milestone {title: '$1.5M ARR reconfirmed'})"
    });
  }

  if (text.includes("integration") || text.includes("legacy") || text.includes("wms") || text.includes("migrate")) {
    suggestions.push({
      id: "suggest-integration",
      title: "Ask what is still blocking the migration risk",
      reason: "Legacy WMS integration is the open diligence concern from the last call.",
      source: "Open concern from 2026-04-08",
      priority: "high"
    });
    extracted.push({
      id: "extract-integration",
      contactId,
      category: "Unresolved Concern",
      summary: "Legacy WMS integration remains the active diligence concern.",
      sourceSnippet: latestMatchingSnippet(events, ["integration", "legacy", "wms", "migrate"]),
      timestamp: now,
      confidence: 0.92,
      proposedGraphMutation:
        "MERGE (c:Contact {id: 'contact-priya'})-[:HAS_CONCERN]->(:Concern {title: 'Legacy WMS integration risk remains open'})"
    });
  }

  if (text.includes("diego") || text.includes("engineer") || text.includes("diligence")) {
    suggestions.push({
      id: "suggest-diego",
      title: "Offer a warm intro to Diego for technical diligence",
      reason: "Diego ran the Northwind migration and can de-risk the integration question.",
      source: "Partner network: solutions engineer",
      priority: "high"
    });
    extracted.push({
      id: "extract-diego",
      contactId,
      category: "Referral Opportunity",
      summary: "Priya is open to a Diego intro for technical diligence.",
      sourceSnippet: latestMatchingSnippet(events, ["diego", "engineer", "diligence"]),
      timestamp: now,
      confidence: 0.9,
      proposedGraphMutation:
        "MERGE (r:Opportunity {id: 'opportunity-partner-meeting'}) SET r.status = 'diligence_intro_ready'"
    });
  }

  if (text.includes("deck") || text.includes("send") || text.includes("case study")) {
    extracted.push({
      id: "extract-deck",
      contactId,
      category: "Follow-Up Action",
      summary: "Send the ROI deck and migration case study after the meeting.",
      sourceSnippet: latestMatchingSnippet(events, ["deck", "send", "case study"]),
      timestamp: now,
      confidence: 0.89,
      proposedGraphMutation:
        "MERGE (c:Contact {id: 'contact-priya'})-[:HAS_ACTION]->(:Action {title: 'Send ROI deck + migration case study'})"
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: "suggest-default",
      title: "Reconfirm the next concrete step",
      reason: "The conversation has not yet touched an open concern.",
      source: "Meeting objective",
      priority: "low"
    });
  }

  return {
    suggestions: dedupeById(suggestions),
    extracted: dedupeById(extracted)
  };
}

export function latestMatchingSnippet(events: TranscriptEvent[], terms: string[]) {
  const match = [...events]
    .reverse()
    .find((event) => terms.some((term) => event.text.toLowerCase().includes(term)));
  return match?.text ?? events.at(-1)?.text ?? "No transcript snippet available.";
}

function dedupeById<T extends { id: string }>(items: T[]) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

export const suggestedQuestions = suggestedQuestionsByContact[primaryContact.id];
export const memories = memoriesByContact[primaryContact.id];
export const actions = actionsByContact[primaryContact.id];
export const graphNodes = graphByContact[primaryContact.id].nodes;
export const graphEdges = graphByContact[primaryContact.id].edges;
