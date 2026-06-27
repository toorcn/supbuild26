import neo4j, { type Driver } from "neo4j-driver";
import { extraJourneys, type ExtraJourney } from "../lib/extra-journeys";
import {
  actionsByContact,
  contacts,
  founder,
  graphByContact,
  meetings,
  memoriesByContact,
  partnerProfiles
} from "../lib/demo-data";
import type { Contact, GraphEdge, GraphNode, MemoryItem } from "../lib/types";
import { getNeo4jDatabaseConfig, loadLocalEnv } from "./load-local-env";

loadLocalEnv();

const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
const username = process.env.NEO4J_USERNAME ?? "neo4j";
const password = process.env.NEO4J_PASSWORD ?? "password";
const databaseConfig = getNeo4jDatabaseConfig();

async function main() {
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    connectionTimeout: 8000,
    maxTransactionRetryTime: 3000
  });

  try {
    const serverInfo = await driver.getServerInfo(databaseConfig);
    console.log("Connection established");
    console.log(serverInfo);

    await executeWrite(driver, "MATCH (n) WHERE n.id IN $ids DETACH DELETE n", {
      ids: demoNodeIds()
    });

    await seedFounder(driver, founder);

    for (const contact of contacts) {
      await seedContactRelationship(driver, founder, contact);
    }

    for (const meeting of meetings) {
      await executeWrite(
        driver,
        `
        MATCH (c:Contact {id: $meeting.contactId})
        MERGE (m:Meeting {id: $meeting.id})
        SET m.startsAt = $meeting.startsAt,
            m.endedAt = $meeting.endedAt,
            m.type = $meeting.type,
            m.location = $meeting.location,
            m.objective = $meeting.objective,
            m.status = $meeting.status
        MERGE (c)-[:HAS_MEETING]->(m)
        `,
        { meeting }
      );
    }

    for (const contact of contacts) {
      const contactMemories = memoriesByContact[contact.id] ?? [];
      const lastMeetingId =
        meetings.filter((meeting) => meeting.contactId === contact.id).find((meeting) => meeting.status === "review")?.id ??
        meetings.filter((meeting) => meeting.contactId === contact.id)[0]?.id;
      for (const memory of contactMemories) {
        await executeWrite(
          driver,
          `
          MATCH (c:Contact {id: $memory.contactId})
          MERGE (mem:Memory {id: $memory.id})
          SET mem.category = $memory.category,
              mem.title = $memory.title,
              mem.summary = $memory.summary,
              mem.source = $memory.source,
              mem.sourceSnippet = $memory.sourceSnippet,
              mem.confidence = $memory.confidence,
              mem.status = $memory.status,
              mem.validFrom = $memory.validFrom,
              mem.lastConfirmedAt = $memory.lastConfirmedAt,
              mem.salience = $memory.salience
          MERGE (c)-[:HAS_MEMORY]->(mem)
          `,
          { memory }
        );

        await seedTypedMemory(driver, memory, lastMeetingId);
      }
    }

    for (const contact of contacts) {
      const contactActions = actionsByContact[contact.id] ?? [];
      for (const action of contactActions) {
        await executeWrite(
          driver,
          `
          MATCH (c:Contact {id: $action.contactId})
          MATCH (m:Meeting {id: $action.meetingId})
          MERGE (act:Action {id: $action.id})
          SET act.title = $action.title,
              act.actionType = $action.actionType,
              act.dueAt = $action.dueAt,
              act.owner = $action.owner,
              act.status = $action.status,
              act.meetingId = $action.meetingId,
              act.draftText = $action.draftText
          MERGE (c)-[:HAS_ACTION]->(act)
          MERGE (act)-[:FOLLOWS_FROM]->(m)
          `,
          { action }
        );
      }
    }

    for (const contact of contacts) {
      const graph = graphByContact[contact.id];
      if (!graph) continue;
      for (const node of graph.nodes) {
        await seedGraphNode(driver, node);
      }
      for (const edge of graph.edges) {
        await seedGraphEdge(driver, edge);
      }
    }

    for (const partner of partnerProfiles) {
      await executeWrite(
        driver,
        `
        MATCH (f:Founder {id: $founderId})
        MERGE (partner:Partner {id: $partner.id})
        SET partner.name = $partner.name,
            partner.label = $partner.name,
            partner.partnerType = $partner.partnerType,
            partner.specialty = $partner.specialty,
            partner.organization = $partner.organization,
            partner.note = $partner.note,
            partner.keywords = $partner.keywords,
            partner.searchText = $searchText,
            partner.introStatus = $partner.introStatus,
            partner.updatedAt = datetime()
        MERGE (f)-[networkRel:HAS_PARTNER]->(partner)
        SET networkRel.id = $relationshipId,
            networkRel.label = 'founder partner'
        `,
        {
          founderId: founder.id,
          partner,
          relationshipId: `edge-partner-${partner.id}`,
          searchText: [
            partner.name,
            partner.partnerType,
            partner.specialty,
            partner.organization ?? "",
            partner.note,
            partner.keywords.join(" ")
          ].join(" ")
        }
      );
    }

    for (const journey of extraJourneys) {
      await seedExtraJourney(driver, journey);
    }

    console.log("Seeded Neo4j demo graph for Forebrief.");
    console.log(`Seeded ${contacts.length} primary contacts and ${extraJourneys.length} extra founder journeys.`);
  } finally {
    await driver.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

function demoNodeIds() {
  return [
    founder.id,
    ...contacts.map((contact) => contact.id),
    ...meetings.map((meeting) => meeting.id),
    ...contacts.flatMap((contact) => (memoriesByContact[contact.id] ?? []).map((memory) => memory.id)),
    ...contacts.flatMap((contact) =>
      (memoriesByContact[contact.id] ?? []).map((memory) => typedMemoryId(memory))
    ),
    ...contacts.flatMap((contact) => (actionsByContact[contact.id] ?? []).map((action) => action.id)),
    ...contacts.flatMap((contact) => (graphByContact[contact.id]?.nodes ?? []).map((node) => node.id)),
    ...partnerProfiles.map((partner) => partner.id),
    ...extraJourneys.flatMap(extraJourneyNodeIds)
  ];
}

function executeWrite(driver: Driver, query: string, parameters: Record<string, unknown>) {
  return driver.executeQuery(query, parameters, {
    ...databaseConfig,
    routing: neo4j.routing.WRITE
  });
}

function seedFounder(driver: Driver, f: typeof founder) {
  return executeWrite(
    driver,
    `
    MERGE (f:Founder {id: $founder.id})
    SET f.name = $founder.name,
        f.company = $founder.company,
        f.label = $founder.name,
        f.note = $founder.company
    `,
    { founder: f }
  );
}

function seedContactRelationship(driver: Driver, f: typeof founder, contact: Contact) {
  return executeWrite(
    driver,
    `
    MERGE (c:Contact {id: $contact.id})
    SET c.name = $contact.name,
        c.label = $contact.name,
        c.note = $contactNote,
        c.relationshipType = $contact.relationshipType,
        c.organization = $contact.organization,
        c.role = $contact.role,
        c.relationshipSince = $contact.relationshipSince,
        c.funnelStage = $contact.funnelStage,
        c.dealStage = $contact.dealStage
    WITH c
    MATCH (f:Founder {id: $founderId})
    MERGE (f)-[manages:MANAGES]->(c)
    SET manages.id = $managesEdgeId,
        manages.label = 'manages'
    MERGE (f)-[servesAlias:SERVES]->(c)
    SET servesAlias.id = $servesEdgeId,
        servesAlias.label = 'serves'
    `,
    {
      contact,
      contactNote: `${contact.role} at ${contact.organization}`,
      founderId: f.id,
      managesEdgeId: `edge-${contact.id}-manages`,
      servesEdgeId: `edge-${contact.id}-serves`
    }
  );
}

async function seedExtraJourney(driver: Driver, journey: ExtraJourney) {
  await executeWrite(
    driver,
    `
    MERGE (f:Founder {id: $founder.id})
    SET f.name = $founder.name,
        f.company = $founder.company,
        f.label = $founder.name,
        f.note = $founder.company
    MERGE (c:Contact {id: $contact.id})
    SET c.name = $contact.name,
        c.label = $contact.name,
        c.note = $contactNote,
        c.relationshipType = $contact.relationshipType,
        c.organization = $contact.organization,
        c.role = $contact.role,
        c.relationshipSince = $contact.relationshipSince,
        c.funnelStage = $contact.funnelStage,
        c.dealStage = $contact.dealStage
    MERGE (f)-[serves:MANAGES]->(c)
    SET serves.id = $managesEdgeId,
        serves.label = 'manages'
    MERGE (f)-[servesAlias:SERVES]->(c)
    SET servesAlias.id = $servesEdgeId,
        servesAlias.label = 'serves'
    `,
    {
      founder: journey.founder,
      contact: journey.contact,
      contactNote: journey.graphNodes.find((node) => node.id === journey.contact.id)?.note ?? `${journey.contact.role} at ${journey.contact.organization}`,
      managesEdgeId: `edge-${journey.contact.id}-manages`,
      servesEdgeId: `edge-${journey.contact.id}-serves`
    }
  );

  for (const meeting of journey.meetings) {
    await executeWrite(
      driver,
      `
      MATCH (c:Contact {id: $meeting.contactId})
      MERGE (m:Meeting {id: $meeting.id})
      SET m.startsAt = $meeting.startsAt,
          m.endedAt = $meeting.endedAt,
          m.type = $meeting.type,
          m.location = $meeting.location,
          m.objective = $meeting.objective,
          m.status = $meeting.status
      MERGE (c)-[:HAS_MEETING]->(m)
      `,
      { meeting }
    );
  }

  const lastMeetingId = journey.meetings.find((meeting) => meeting.status === "review")?.id ?? journey.meetings[0].id;
  for (const memory of journey.memories) {
    await executeWrite(
      driver,
      `
      MATCH (c:Contact {id: $memory.contactId})
      MERGE (mem:Memory {id: $memory.id})
      SET mem.category = $memory.category,
          mem.title = $memory.title,
          mem.summary = $memory.summary,
          mem.source = $memory.source,
          mem.sourceSnippet = $memory.sourceSnippet,
          mem.confidence = $memory.confidence,
          mem.status = $memory.status,
          mem.validFrom = $memory.validFrom,
          mem.lastConfirmedAt = $memory.lastConfirmedAt,
          mem.salience = $memory.salience
      MERGE (c)-[:HAS_MEMORY]->(mem)
      `,
      { memory }
    );
    await seedTypedMemory(driver, memory, lastMeetingId);
  }

  for (const action of journey.actions) {
    await executeWrite(
      driver,
      `
      MATCH (c:Contact {id: $action.contactId})
      MATCH (m:Meeting {id: $action.meetingId})
      MERGE (act:Action {id: $action.id})
      SET act.title = $action.title,
          act.actionType = $action.actionType,
          act.dueAt = $action.dueAt,
          act.owner = $action.owner,
          act.status = $action.status,
          act.meetingId = $action.meetingId,
          act.draftText = $action.draftText
      MERGE (c)-[:HAS_ACTION]->(act)
      MERGE (act)-[:FOLLOWS_FROM]->(m)
      `,
      { action }
    );
  }

  for (const node of journey.graphNodes) {
    await seedGraphNode(driver, node);
  }

  for (const edge of journey.graphEdges) {
    await seedGraphEdge(driver, edge);
  }
}

function seedGraphNode(driver: Driver, node: GraphNode) {
  const label = graphNodeLabel(node.type);
  return executeWrite(
    driver,
    `
    MERGE (n:${label} {id: $node.id})
    SET n.name = $node.label,
        n.label = $node.label,
        n.title = $node.label,
        n.note = $node.note,
        n.role = coalesce(n.role, $nodeType),
        n.description = $node.note
    `,
    { node, nodeType: node.type }
  );
}

function seedGraphEdge(driver: Driver, edge: GraphEdge) {
  const relationshipType = graphRelationshipType(edge);
  return executeWrite(
    driver,
    `
    MATCH (source {id: $source})
    MATCH (target {id: $target})
    MERGE (source)-[rel:${relationshipType} {id: $id}]->(target)
    SET rel.label = $label
    `,
    edge
  );
}

function graphNodeLabel(type: GraphNode["type"]) {
  if (type === "Opportunity") return "Opportunity";
  if (type === "Partner") return "Partner";
  return type;
}

function graphRelationshipType(edge: GraphEdge) {
  if (edge.label === "manages") return "MANAGES";
  if (edge.label === "has opportunity" || edge.label === "leads to" || edge.label === "advances") return "HAS_REFERRAL_OPPORTUNITY";
  if (edge.source.startsWith("opportunity-") && edge.label.includes("support")) return "INVOLVES";
  if (edge.source.startsWith("opportunity-")) return "MATCHES_SPECIALIST";
  return "RELATED_TO";
}

function extraJourneyNodeIds(journey: ExtraJourney) {
  return [
    journey.contact.id,
    ...journey.meetings.map((meeting) => meeting.id),
    ...journey.memories.map((memory) => memory.id),
    ...journey.memories.map((memory) => typedMemoryId(memory)),
    ...journey.actions.map((action) => action.id),
    ...journey.graphNodes.map((node) => node.id)
  ];
}

function seedTypedMemory(driver: Driver, memory: MemoryItem, meetingId?: string) {
  const typed = typedMemoryFor(memory);
  if (!typed) return Promise.resolve();

  return executeWrite(
    driver,
    `
    MATCH (c:Contact {id: $contactId})
    MATCH (m:Memory {id: $memoryId})
    OPTIONAL MATCH (meeting:Meeting {id: $meetingId})
    MERGE (typed:${typed.label} {id: $typedId})
    SET typed.title = $title,
        typed.summary = $summary,
        typed.description = $summary,
        typed.source = $source,
        typed.sourceSnippet = $sourceSnippet,
        typed.confidence = $confidence,
        typed.status = $status,
        typed.validFrom = $validFrom,
        typed.lastConfirmedAt = $lastConfirmedAt,
        typed.salience = $salience,
        typed.updatedAt = datetime()
    MERGE (c)-[typedRel:${typed.relationship}]->(typed)
    SET typedRel.label = $relationshipLabel
    MERGE (meeting)-[:PRODUCED]->(m)
    `,
    {
      contactId: memory.contactId,
      memoryId: memory.id,
      meetingId: meetingId ?? (memory.source.includes("2026-04-08") ? "meeting-2026-04-08-priya" : "meeting-2026-06-20-priya"),
      typedId: typedMemoryId(memory),
      title: memory.title,
      summary: memory.summary,
      source: memory.source,
      sourceSnippet: memory.sourceSnippet,
      confidence: memory.confidence,
      status: memory.status,
      validFrom: memory.validFrom,
      lastConfirmedAt: memory.lastConfirmedAt,
      salience: memory.salience,
      relationshipLabel: typed.relationship.toLowerCase().replaceAll("_", " ")
    }
  );
}

function typedMemoryFor(memory: MemoryItem) {
  if (memory.category === "Milestone") return { label: "Milestone", relationship: "HAS_MILESTONE" };
  if (memory.category === "Unresolved Concern" || memory.category === "Signal") {
    return { label: "Concern", relationship: "HAS_CONCERN" };
  }
  if (memory.category === "Goal/Objective") return { label: "Objective", relationship: "HAS_OBJECTIVE" };
  if (memory.category === "Promise/Commitment") return { label: "Promise", relationship: "HAS_PROMISE" };
  return null;
}

function typedMemoryId(memory: MemoryItem) {
  return `${memory.id}-typed`;
}
