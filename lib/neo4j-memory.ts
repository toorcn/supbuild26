import neo4j, { Driver } from "neo4j-driver";
import { getClientContext, getMeeting, partnerProfiles } from "./demo-data";
import type {
  ActionItem,
  Advisor,
  Client,
  ClientContext,
  ExtractedMemory,
  GraphEdge,
  GraphNode,
  LivePartnerRecommendation,
  LivePartnerRecommendationResponse,
  LiveMemorySearchResponse,
  MemoryCategory,
  Meeting,
  MemoryItem,
  PartnerType
} from "./types";

type DataMode = "neo4j" | "hybrid" | "demo";

let driver: Driver | null = null;

export function getDataMode(): DataMode {
  const configured = process.env.DATA_MODE?.trim().toLowerCase();
  if (configured === "neo4j" || configured === "hybrid" || configured === "demo") return configured;
  return hasNeo4jConfig() ? "neo4j" : "demo";
}

function hasNeo4jConfig() {
  return Boolean(process.env.NEO4J_URI && process.env.NEO4J_USERNAME && process.env.NEO4J_PASSWORD);
}

function getDriver() {
  if (!hasNeo4jConfig()) return null;
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI as string,
      neo4j.auth.basic(process.env.NEO4J_USERNAME as string, process.env.NEO4J_PASSWORD as string),
      { connectionTimeout: 1500, maxTransactionRetryTime: 1000 }
    );
  }
  return driver;
}

export async function closeNeo4jDriver() {
  if (!driver) return;
  await driver.close();
  driver = null;
}

function getDatabaseConfig() {
  return process.env.NEO4J_DATABASE ? { database: process.env.NEO4J_DATABASE } : undefined;
}

function getQueryConfig(routing: "READ" | "WRITE") {
  return {
    ...getDatabaseConfig(),
    routing
  };
}

export async function getClientContextWithMemoryLayer(clientId: string): Promise<ClientContext> {
  const mode = getDataMode();
  if (mode === "demo") {
    return withMode(getClientContext(clientId), "demo", "demo");
  }

  if (mode === "neo4j") {
    try {
      return await getNeo4jClientContext(clientId);
    } catch {
      return withMode(getClientContext(clientId), "neo4j", "demo", formatNeo4jFallbackWarning());
    }
  }

  const context = getClientContext(clientId);
  const graphDriver = getDriver();
  if (!graphDriver) {
    return withMode(context, "hybrid", "demo", "Graph memory is not configured; showing demo memory.");
  }

  try {
    const neo4jContext = await readNeo4jClientContext(clientId, graphDriver);

    const byId = new Map(context.memories.map((memory) => [memory.id, memory]));
    for (const memory of neo4jContext.memories) {
      byId.set(memory.id, memory);
    }

    const actionsById = new Map(context.actions.map((action) => [action.id, action]));
    for (const action of neo4jContext.actions) {
      actionsById.set(action.id, action);
    }

    return {
      ...context,
      founder: neo4jContext.founder,
      contact: neo4jContext.contact,
      upcomingMeeting: neo4jContext.upcomingMeeting,
      lastMeeting: neo4jContext.lastMeeting,
      memorySource: "neo4j",
      dataMode: "hybrid",
      memoryWarning: undefined,
      memories: Array.from(byId.values()),
      actions: Array.from(actionsById.values()),
      graph: neo4jContext.graph.nodes.length > 0 ? neo4jContext.graph : context.graph,
      suggestedQuestions: neo4jContext.suggestedQuestions,
      briefing: neo4jContext.briefing
    };
  } catch {
    return {
      ...context,
      memorySource: "demo",
      dataMode: "hybrid",
      memoryWarning: formatNeo4jFallbackWarning()
    };
  }
}

export async function getClientContextForMeeting(meetingId: string): Promise<ClientContext> {
  const mode = getDataMode();
  if (mode === "demo" || mode === "hybrid") {
    const meeting = getMeeting(meetingId);
    if (meeting) return getClientContextWithMemoryLayer(meeting.contactId);
    if (mode === "demo") throw new Error(`Unknown demo meeting: ${meetingId}`);
  }

  const graphDriver = getDriver();
  if (!graphDriver) {
    const meeting = getMeeting(meetingId);
    if (meeting) return withMode(getClientContext(meeting.contactId), mode, "demo", formatNeo4jFallbackWarning());
    throw new Error("Graph memory is required to resolve this meeting.");
  }

  try {
    const result = await graphDriver.executeQuery(
      `
      MATCH (c:Contact)-[:HAS_MEETING]->(:Meeting {id: $meetingId})
      RETURN c.id AS contactId
      LIMIT 1
      `,
      { meetingId },
      getQueryConfig(neo4j.routing.READ)
    );
    const contactId = result.records[0]?.get("contactId");
    if (typeof contactId === "string") return getClientContextWithMemoryLayer(contactId);
  } catch (error) {
    if (mode === "neo4j" && !getMeeting(meetingId)) throw error;
  }

  const meeting = getMeeting(meetingId);
  if (meeting) return withMode(getClientContext(meeting.contactId), mode, "demo", formatNeo4jFallbackWarning());
  throw new Error(`Unknown graph-memory meeting: ${meetingId}`);
}

export async function getCalendar() {
  const mode = getDataMode();
  if (mode === "demo") {
    const { getCalendar: getDemoCalendar } = await import("./demo-data");
    return { source: "demo" as const, meetings: getDemoCalendar(), warning: undefined };
  }

  const graphDriver = getDriver();
  if (!graphDriver) {
    if (mode === "neo4j") throw new Error("Graph memory is not configured.");
    const { getCalendar: getDemoCalendar } = await import("./demo-data");
    return {
      source: "demo" as const,
      meetings: getDemoCalendar(),
      warning: "Calendar memory is not configured; showing demo calendar."
    };
  }

  try {
    const result = await graphDriver.executeQuery(
      `
      MATCH (founder:Founder)-[:MANAGES]->(contact:Contact)-[:HAS_MEETING]->(meeting:Meeting)
      WHERE coalesce(meeting.status, '') <> 'review'
      RETURN founder, contact, meeting
      ORDER BY meeting.startsAt ASC
      LIMIT 25
      `,
      {},
      getQueryConfig(neo4j.routing.READ)
    );

    const meetings = result.records.map((record) => {
      const founder = advisorNodeToItem(record.get("founder").properties);
      const contact = clientNodeToItem(record.get("contact").properties);
      return {
        ...meetingNodeToItem(record.get("meeting").properties, contact.id, founder.id),
        founder,
        contact
      };
    });

    if (meetings.length === 0) {
      const { getCalendar: getDemoCalendar } = await import("./demo-data");
      return {
        source: "demo" as const,
        meetings: getDemoCalendar(),
        warning: formatNeo4jFallbackWarning()
      };
    }

    return {
      source: "neo4j" as const,
      warning: undefined,
      meetings
    };
  } catch (error) {
    if (mode === "neo4j") throw error;
    const { getCalendar: getDemoCalendar } = await import("./demo-data");
    return {
      source: "demo" as const,
      meetings: getDemoCalendar(),
      warning: formatNeo4jFallbackWarning()
    };
  }
}

async function getNeo4jClientContext(clientId: string) {
  const graphDriver = getDriver();
  if (!graphDriver) throw new Error("Graph memory is not configured.");
  return readNeo4jClientContext(clientId, graphDriver);
}

async function readNeo4jClientContext(clientId: string, graphDriver: Driver): Promise<ClientContext> {
  const [coreResult, memoryResult, actionResult, nodeResult, edgeResult] = await Promise.all([
    graphDriver.executeQuery(
      `
      MATCH (c:Contact {id: $contactId})
      OPTIONAL MATCH (a:Founder)-[:MANAGES]->(c)
      OPTIONAL MATCH (c)-[:HAS_MEETING]->(upcoming:Meeting)
      WHERE coalesce(upcoming.status, '') <> 'review'
      WITH c, a, upcoming
      ORDER BY upcoming.startsAt ASC
      WITH c, a, collect(upcoming)[0] AS upcomingMeeting
      OPTIONAL MATCH (c)-[:HAS_MEETING]->(last:Meeting)
      WHERE last.id <> upcomingMeeting.id
      WITH c, a, upcomingMeeting, last
      ORDER BY last.startsAt DESC
      RETURN c, a, upcomingMeeting, collect(last)[0] AS lastMeeting
      `,
      { contactId: clientId },
      getQueryConfig(neo4j.routing.READ)
    ),
    graphDriver.executeQuery(
      `
      MATCH (:Contact {id: $contactId})-[:HAS_MEMORY]->(m:Memory)
      RETURN m
      ORDER BY coalesce(m.salience, 0) DESC, toString(coalesce(m.updatedAt, m.createdAt, m.validFrom, '')) DESC
      `,
      { contactId: clientId },
      getQueryConfig(neo4j.routing.READ)
    ),
    graphDriver.executeQuery(
      `
      MATCH (:Contact {id: $contactId})-[:HAS_ACTION]->(a:Action)
      RETURN a
      ORDER BY toString(coalesce(a.dueAt, a.updatedAt, a.createdAt, '')) ASC
      `,
      { contactId: clientId },
      getQueryConfig(neo4j.routing.READ)
    ),
    graphDriver.executeQuery(
      `
      MATCH (c:Contact {id: $contactId})
      RETURN c AS node
      UNION
      MATCH (a:Founder)-[:MANAGES]->(:Contact {id: $contactId})
      RETURN a AS node
      UNION
      MATCH (:Contact {id: $contactId})-[:RELATED_TO|HAS_REFERRAL_OPPORTUNITY]-(node)
      RETURN node
      UNION
      MATCH (:Contact {id: $contactId})-[:HAS_REFERRAL_OPPORTUNITY]-(:Opportunity)-[:MATCHES_SPECIALIST|INVOLVES]-(node)
      RETURN node
      `,
      { contactId: clientId },
      getQueryConfig(neo4j.routing.READ)
    ),
    graphDriver.executeQuery(
      `
      MATCH (source:Founder)-[r:MANAGES]->(target:Contact {id: $contactId})
      RETURN
        coalesce(source.id, elementId(source)) AS source,
        coalesce(target.id, elementId(target)) AS target,
        type(r) AS type,
        coalesce(r.label, r.relationship) AS label,
        coalesce(r.id, elementId(r)) AS id
      UNION
      MATCH (:Contact {id: $contactId})-[r:RELATED_TO|HAS_REFERRAL_OPPORTUNITY]-(target)
      WITH startNode(r) AS source, endNode(r) AS target, r
      RETURN
        coalesce(source.id, elementId(source)) AS source,
        coalesce(target.id, elementId(target)) AS target,
        type(r) AS type,
        coalesce(r.label, r.relationship) AS label,
        coalesce(r.id, elementId(r)) AS id
      UNION
      MATCH (:Contact {id: $contactId})-[:HAS_REFERRAL_OPPORTUNITY]-(:Opportunity)-[r:MATCHES_SPECIALIST|INVOLVES]-(target)
      WITH startNode(r) AS source, endNode(r) AS target, r
      RETURN
        coalesce(source.id, elementId(source)) AS source,
        coalesce(target.id, elementId(target)) AS target,
        type(r) AS type,
        coalesce(r.label, r.relationship) AS label,
        coalesce(r.id, elementId(r)) AS id
      `,
      { contactId: clientId },
      getQueryConfig(neo4j.routing.READ)
    )
  ]);

  const core = coreResult.records[0];
  if (!core) throw new Error(`Contact ${clientId} was not found in graph memory.`);

  const clientNode = core.get("c");
  const advisorNode = core.get("a");
  const upcomingMeetingNode = core.get("upcomingMeeting");
  const lastMeetingNode = core.get("lastMeeting");
  if (!clientNode || !advisorNode || !upcomingMeetingNode) {
    throw new Error(`Contact ${clientId} is missing founder or upcoming meeting data in graph memory.`);
  }

  const founder = advisorNodeToItem(advisorNode.properties);
  const contact = clientNodeToItem(clientNode.properties);
  const upcomingMeeting = meetingNodeToItem(upcomingMeetingNode.properties, contact.id, founder.id);
  const lastMeeting = lastMeetingNode
    ? meetingNodeToItem(lastMeetingNode.properties, contact.id, founder.id)
    : upcomingMeeting;
  const memories = memoryResult.records.map((record) =>
    memoryNodeToItem(record.get("m").properties, clientId)
  );
  const actions = actionResult.records.map((record) =>
    actionNodeToItem(record.get("a").properties, clientId, upcomingMeeting.id, founder.name)
  );
  const graph = {
    nodes: nodeResult.records.map((record) =>
      graphNodeToItem(record.get("node").labels, record.get("node").properties)
    ),
    edges: edgeResult.records.map((record) =>
      graphEdgeToItem(
        record.get("id"),
        record.get("source"),
        record.get("target"),
        record.get("type"),
        record.get("label")
      )
    )
  };
  const suggestedQuestions = buildSuggestedQuestions(memories);

  return {
    founder,
    contact,
    upcomingMeeting,
    lastMeeting,
    memories,
    actions,
    graph,
    suggestedQuestions,
    briefing: buildBriefing({ founder, contact, upcomingMeeting, lastMeeting, memories, suggestedQuestions }),
    memorySource: "neo4j",
    dataMode: "neo4j"
  };
}

function formatNeo4jFallbackWarning() {
  return "Graph memory is unavailable; showing demo memory.";
}

function withMode(
  context: ClientContext,
  dataMode: DataMode,
  memorySource: "neo4j" | "demo",
  memoryWarning?: string
): ClientContext {
  return {
    ...context,
    dataMode,
    memorySource,
    memoryWarning
  };
}

export async function queryClientMemory(clientId: string, query: string) {
  const graphDriver = getDriver();
  const normalized = query.trim().toLowerCase();
  const context = getClientContext(clientId);

  if (!graphDriver) {
    return {
      source: "demo",
      results: context.memories.filter((memory) =>
        `${memory.title} ${memory.summary} ${memory.sourceSnippet}`.toLowerCase().includes(normalized)
      )
    };
  }

  try {
    const result = await graphDriver.executeQuery(
      `
      MATCH (:Contact {id: $contactId})-[:HAS_MEMORY|HAS_ACTION]->(item)
      WHERE $query = ''
        OR toLower(coalesce(item.title, '') + ' ' + coalesce(item.summary, '') + ' ' + coalesce(item.sourceSnippet, '') + ' ' + coalesce(item.draftText, '')) CONTAINS $query
      RETURN labels(item) AS labels, item
      ORDER BY coalesce(item.salience, 0) DESC, toString(coalesce(item.updatedAt, item.createdAt, item.validFrom, item.dueAt, '')) DESC
      LIMIT 12
      `,
      { contactId: clientId, query: normalized },
      getQueryConfig(neo4j.routing.READ)
    );

    return {
      source: "neo4j",
      results: result.records.map((record) => ({
        labels: record.get("labels"),
        properties: record.get("item").properties
      }))
    };
  } catch (error) {
    return {
      source: "demo",
      warning: error instanceof Error ? error.message : "Graph memory unavailable, using demo memory.",
      results: context.memories.filter((memory) =>
        `${memory.title} ${memory.summary} ${memory.sourceSnippet}`.toLowerCase().includes(normalized)
      )
    };
  }
}

export async function searchClientMemory(
  clientId: string,
  query: string,
  reason = "",
  limit = 5
): Promise<LiveMemorySearchResponse> {
  const graphDriver = getDriver();
  const normalizedLimit = Math.max(1, Math.min(8, Math.floor(limit)));
  const terms = liveSearchTerms(query);

  if (!graphDriver) {
    const context = getClientContext(clientId);
    return {
      contactId: clientId,
      query,
      reason,
      source: "demo",
      results: searchDemoContext(context, terms, normalizedLimit),
      warning: "Graph memory is not configured; searched demo memory."
    };
  }

  try {
    const result = await graphDriver.executeQuery(
      `
      MATCH (c:Contact {id: $contactId})
      CALL {
        WITH c
        MATCH (c)-[:HAS_MEMORY]->(m:Memory)
        WHERE $isEmpty OR any(term IN $terms WHERE
          toLower(coalesce(m.title, '') + ' ' + coalesce(m.summary, '') + ' ' + coalesce(m.category, '') + ' ' + coalesce(m.sourceSnippet, '')) CONTAINS term
        )
        RETURN
          'memory' AS type,
          m.id AS id,
          coalesce(m.title, m.category, 'Memory') AS title,
          coalesce(m.summary, '') AS summary,
          coalesce(m.source, 'Contact memory') AS source,
          m.category AS category,
          m.status AS status,
          m.sourceSnippet AS snippet,
          m.confidence AS confidence,
          null AS edgeLabel
        UNION
        WITH c
        MATCH (c)-[:HAS_ACTION]->(a:Action)
        WHERE $isEmpty OR any(term IN $terms WHERE
          toLower(coalesce(a.title, '') + ' ' + coalesce(a.actionType, '') + ' ' + coalesce(a.status, '') + ' ' + coalesce(a.draftText, '')) CONTAINS term
        )
        RETURN
          'action' AS type,
          a.id AS id,
          coalesce(a.title, 'Action') AS title,
          coalesce(a.draftText, a.actionType, '') AS summary,
          coalesce(a.meetingId, 'Contact action') AS source,
          null AS category,
          a.status AS status,
          a.draftText AS snippet,
          null AS confidence,
          null AS edgeLabel
        UNION
        WITH c
        MATCH (c)-[r:RELATED_TO|HAS_REFERRAL_OPPORTUNITY]->(n)
        WHERE $isEmpty OR any(term IN $terms WHERE
          toLower(coalesce(n.label, n.name, n.title, '') + ' ' + coalesce(n.note, n.summary, n.description, '') + ' ' + type(r) + ' ' + coalesce(r.label, '')) CONTAINS term
        )
        RETURN
          'graph' AS type,
          coalesce(n.id, elementId(n)) AS id,
          coalesce(n.label, n.name, n.title, 'Related node') AS title,
          coalesce(n.note, n.summary, n.description, '') AS summary,
          'Contact graph' AS source,
          null AS category,
          n.status AS status,
          coalesce(n.note, n.summary, n.description, '') AS snippet,
          null AS confidence,
          coalesce(r.label, type(r)) AS edgeLabel
        UNION
        WITH c
        MATCH (c)-[:HAS_REFERRAL_OPPORTUNITY]->(:Opportunity)-[r:MATCHES_SPECIALIST|INVOLVES]->(n)
        WHERE $isEmpty OR any(term IN $terms WHERE
          toLower(coalesce(n.label, n.name, n.title, '') + ' ' + coalesce(n.note, n.summary, n.description, '') + ' ' + type(r) + ' ' + coalesce(r.label, '')) CONTAINS term
        )
        RETURN
          'graph' AS type,
          coalesce(n.id, elementId(n)) AS id,
          coalesce(n.label, n.name, n.title, 'Related node') AS title,
          coalesce(n.note, n.summary, n.description, '') AS summary,
          'Contact graph' AS source,
          null AS category,
          n.status AS status,
          coalesce(n.note, n.summary, n.description, '') AS snippet,
          null AS confidence,
          coalesce(r.label, type(r)) AS edgeLabel
      }
      RETURN type, id, title, summary, source, category, status, snippet, confidence, edgeLabel
      LIMIT toInteger($limit)
      `,
      { contactId: clientId, terms, isEmpty: terms.length === 0, limit: normalizedLimit },
      getQueryConfig(neo4j.routing.READ)
    );

    return {
      contactId: clientId,
      query,
      reason,
      source: "neo4j",
      results: result.records.map((record) => ({
        id: stringValue(record.get("id"), "neo4j-result"),
        type: liveResultType(record.get("type")),
        title: stringValue(record.get("title"), "Contact memory"),
        summary: stringValue(record.get("summary")),
        source: stringValue(record.get("source"), "Graph memory"),
        category: memoryCategoryValue(record.get("category")),
        status: stringValue(record.get("status")) || undefined,
        snippet: stringValue(record.get("snippet")) || undefined,
        confidence: numberValue(record.get("confidence")),
        edgeLabel: stringValue(record.get("edgeLabel")) || undefined
      }))
    };
  } catch (error) {
    const context = getClientContext(clientId);
    return {
      contactId: clientId,
      query,
      reason,
      source: "demo",
      results: searchDemoContext(context, terms, normalizedLimit),
      warning: error instanceof Error ? error.message : "Graph memory unavailable; searched demo memory."
    };
  }
}

export async function recommendClientPartners(
  clientId: string,
  need: string,
  reason = "",
  limit = 3
): Promise<LivePartnerRecommendationResponse> {
  const graphDriver = getDriver();
  const normalizedLimit = Math.max(1, Math.min(5, Math.floor(limit)));
  const terms = liveSearchTerms(need);

  if (!graphDriver) {
    const context = getClientContext(clientId);
    return {
      contactId: clientId,
      need,
      reason,
      source: "demo",
      results: recommendDemoPartners(context, terms, need, normalizedLimit),
      warning: "Graph memory is not configured; searched demo partner directory."
    };
  }

  try {
    const result = await graphDriver.executeQuery(
      `
      MATCH (c:Contact {id: $contactId})
      OPTIONAL MATCH (founder:Founder)-[:MANAGES]->(c)
      WITH c, founder
      CALL {
        WITH c
        MATCH (c)-[:HAS_REFERRAL_OPPORTUNITY]->(opportunity:Opportunity)-[r:MATCHES_SPECIALIST|INVOLVES]->(partner:Partner)
        WHERE $isEmpty OR any(term IN $terms WHERE
          toLower(
            coalesce(opportunity.title, '') + ' ' +
            coalesce(opportunity.label, '') + ' ' +
            coalesce(opportunity.need, '') + ' ' +
            coalesce(opportunity.reason, '') + ' ' +
            coalesce(opportunity.note, '') + ' ' +
            coalesce(partner.name, '') + ' ' +
            coalesce(partner.label, '') + ' ' +
            coalesce(partner.partnerType, '') + ' ' +
            coalesce(partner.specialty, '') + ' ' +
            coalesce(partner.role, '') + ' ' +
            coalesce(partner.note, '') + ' ' +
            coalesce(partner.searchText, '')
          ) CONTAINS term
        )
        RETURN
          coalesce(partner.id, elementId(partner)) AS id,
          coalesce(partner.name, partner.label, 'Partner') AS name,
          coalesce(partner.partnerType, partner.role, 'other') AS partnerType,
          coalesce(partner.specialty, partner.role, partner.note, 'Partner') AS specialty,
          partner.organization AS organization,
          coalesce(partner.note, '') AS note,
          coalesce(partner.introStatus, partner.status, 'available') AS status,
          coalesce(r.label, type(r)) AS relationshipLabel,
          coalesce(opportunity.title, opportunity.label, opportunity.need, $need) AS evidence,
          'Memory graph' AS source,
          0.94 AS confidence
        UNION
        WITH c, founder
        MATCH (founder)-[networkRel:HAS_PARTNER]->(partner:Partner)
        WHERE NOT $isEmpty
          AND any(term IN $terms WHERE
            toLower(
              coalesce(partner.name, '') + ' ' +
              coalesce(partner.label, '') + ' ' +
              coalesce(partner.partnerType, '') + ' ' +
              coalesce(partner.specialty, '') + ' ' +
              coalesce(partner.role, '') + ' ' +
              coalesce(partner.note, '') + ' ' +
              coalesce(partner.searchText, '')
            ) CONTAINS term
          )
        RETURN
          coalesce(partner.id, elementId(partner)) AS id,
          coalesce(partner.name, partner.label, 'Partner') AS name,
          coalesce(partner.partnerType, partner.role, 'other') AS partnerType,
          coalesce(partner.specialty, partner.role, partner.note, 'Partner') AS specialty,
          partner.organization AS organization,
          coalesce(partner.note, '') AS note,
          coalesce(partner.introStatus, partner.status, 'available') AS status,
          coalesce(networkRel.label, type(networkRel)) AS relationshipLabel,
          $need AS evidence,
          'Partner directory' AS source,
          0.76 AS confidence
      }
      RETURN id, name, partnerType, specialty, organization, note, status, relationshipLabel, evidence, source, max(confidence) AS confidence
      ORDER BY confidence DESC, name ASC
      LIMIT toInteger($limit)
      `,
      { contactId: clientId, need, terms, isEmpty: terms.length === 0, limit: normalizedLimit },
      getQueryConfig(neo4j.routing.READ)
    );

    return {
      contactId: clientId,
      need,
      reason,
      source: "neo4j",
      results: result.records.map((record) =>
        partnerRecommendationFromRecord({
          id: record.get("id"),
          name: record.get("name"),
          partnerType: record.get("partnerType"),
          specialty: record.get("specialty"),
          organization: record.get("organization"),
          note: record.get("note"),
          status: record.get("status"),
          relationshipLabel: record.get("relationshipLabel"),
          evidence: record.get("evidence"),
          source: record.get("source"),
          confidence: record.get("confidence")
        })
      )
    };
  } catch (error) {
    const context = getClientContext(clientId);
    return {
      contactId: clientId,
      need,
      reason,
      source: "demo",
      results: recommendDemoPartners(context, terms, need, normalizedLimit),
      warning: error instanceof Error ? error.message : "Graph memory unavailable; searched demo partner directory."
    };
  }
}

export async function saveApprovedMemory(memory: ExtractedMemory) {
  const graphDriver = getDriver();
  if (!graphDriver) {
    return {
      writeMode: "demo",
      saved: false,
      reason: "NEO4J_URI, NEO4J_USERNAME, or NEO4J_PASSWORD is not configured."
    };
  }

  try {
    const normalizedSummary = normalizeMemoryText(memory.summary);
    const normalizedSnippet = normalizeMemoryText(memory.sourceSnippet);
    const duplicateResult = await graphDriver.executeQuery(
      `
      MATCH (:Contact {id: $contactId})-[:HAS_MEMORY]->(existing:Memory)
      WHERE existing.category = $category
        AND (
          toLower(coalesce(existing.summary, '')) = $normalizedSummary
          OR ($normalizedSnippet <> '' AND toLower(coalesce(existing.sourceSnippet, '')) = $normalizedSnippet)
          OR ($allowContains AND toLower(coalesce(existing.summary, '')) <> '' AND toLower(coalesce(existing.summary, '')) CONTAINS $normalizedSummary)
          OR ($allowContains AND toLower(coalesce(existing.summary, '')) <> '' AND $normalizedSummary CONTAINS toLower(coalesce(existing.summary, '')))
        )
      RETURN existing.id AS id
      LIMIT 1
      `,
      {
        contactId: memory.contactId,
        category: memory.category,
        normalizedSummary,
        normalizedSnippet,
        allowContains: normalizedSummary.length >= 32
      },
      getQueryConfig(neo4j.routing.READ)
    );
    const existingId = duplicateResult.records[0]?.get("id");
    if (typeof existingId === "string") {
      return {
        writeMode: "neo4j",
        saved: false,
        duplicate: true,
        existingId
      };
    }

    await graphDriver.executeQuery(
      `
      MERGE (c:Contact {id: $contactId})
      MERGE (m:Memory {id: $id})
      SET m.category = $category,
          m.title = $category,
          m.summary = $summary,
          m.source = 'live meeting companion',
          m.sourceSnippet = $sourceSnippet,
          m.confidence = $confidence,
          m.status = 'approved',
          m.salience = 0.95,
          m.proposedGraphMutation = $proposedGraphMutation,
          m.updatedAt = datetime(),
          m.createdAt = coalesce(m.createdAt, datetime())
      MERGE (c)-[:HAS_MEMORY]->(m)
      `,
      {
        contactId: memory.contactId,
        id: memory.id,
        category: memory.category,
        summary: memory.summary,
        sourceSnippet: memory.sourceSnippet,
        confidence: memory.confidence,
        proposedGraphMutation: memory.proposedGraphMutation
      },
      getQueryConfig(neo4j.routing.WRITE)
    );

    await saveTypedApprovedMemory(graphDriver, memory);

    return {
      writeMode: "neo4j",
      saved: true
    };
  } catch (error) {
    return {
      writeMode: "demo",
      saved: false,
      reason: error instanceof Error ? error.message : "Graph memory unavailable."
    };
  }
}

export async function saveApprovedAction(action: ActionItem) {
  const graphDriver = getDriver();
  if (!graphDriver) {
    return {
      writeMode: "demo",
      saved: false,
      reason: "NEO4J_URI, NEO4J_USERNAME, or NEO4J_PASSWORD is not configured."
    };
  }

  try {
    await graphDriver.executeQuery(
      `
      MATCH (c:Contact {id: $contactId})
      OPTIONAL MATCH (meeting:Meeting {id: $meetingId})
      MERGE (a:Action {id: $id})
      SET a.title = $title,
          a.actionType = $actionType,
          a.dueAt = $dueAt,
          a.owner = $owner,
          a.status = 'approved',
          a.meetingId = $meetingId,
          a.draftText = $draftText,
          a.updatedAt = datetime(),
          a.createdAt = coalesce(a.createdAt, datetime())
      MERGE (c)-[:HAS_ACTION]->(a)
      FOREACH (_ IN CASE WHEN meeting IS NULL THEN [] ELSE [1] END |
        MERGE (a)-[:FOLLOWS_FROM]->(meeting)
      )
      `,
      {
        contactId: action.contactId,
        meetingId: action.meetingId,
        id: action.id,
        title: action.title,
        actionType: action.actionType,
        dueAt: action.dueAt,
        owner: action.owner,
        draftText: action.draftText
      },
      getQueryConfig(neo4j.routing.WRITE)
    );

    return {
      writeMode: "neo4j",
      saved: true
    };
  } catch (error) {
    return {
      writeMode: "demo",
      saved: false,
      reason: error instanceof Error ? error.message : "Graph memory unavailable."
    };
  }
}

async function saveTypedApprovedMemory(graphDriver: Driver, memory: ExtractedMemory) {
  const typed = approvedMemoryType(memory.category);
  if (!typed) return;

  await graphDriver.executeQuery(
    `
    MATCH (c:Contact {id: $contactId})
    MATCH (m:Memory {id: $memoryId})
    MERGE (typed:${typed.label} {id: $typedId})
    SET typed.title = $title,
        typed.summary = $summary,
        typed.description = $summary,
        typed.source = 'live meeting companion',
        typed.sourceSnippet = $sourceSnippet,
        typed.confidence = $confidence,
        typed.status = 'approved',
        typed.updatedAt = datetime(),
        typed.createdAt = coalesce(typed.createdAt, datetime())
    MERGE (c)-[typedRel:${typed.relationship}]->(typed)
    SET typedRel.label = $relationshipLabel
    MERGE (m)-[:MATERIALIZED_AS]->(typed)
    `,
    {
      contactId: memory.contactId,
      memoryId: memory.id,
      typedId: `${memory.id}-typed`,
      title: memory.category,
      summary: memory.summary,
      sourceSnippet: memory.sourceSnippet,
      confidence: memory.confidence,
      relationshipLabel: typed.relationship.toLowerCase().replaceAll("_", " ")
    },
    getQueryConfig(neo4j.routing.WRITE)
  );
}

function approvedMemoryType(category: ExtractedMemory["category"]) {
  if (category === "Milestone") return { label: "LifeEvent", relationship: "HAS_LIFE_EVENT" };
  if (category === "Unresolved Concern" || category === "Signal") {
    return { label: "Concern", relationship: "HAS_CONCERN" };
  }
  if (category === "Goal/Objective") return { label: "Objective", relationship: "HAS_OBJECTIVE" };
  if (category === "Promise/Commitment") return { label: "Promise", relationship: "HAS_PROMISE" };
  return null;
}

const liveMemoryCategories: MemoryCategory[] = [
  "Milestone",
  "Signal",
  "Unresolved Concern",
  "Goal/Objective",
  "Promise/Commitment",
  "Relationship Mention",
  "Referral Opportunity",
  "Follow-Up Action"
];

function liveSearchTerms(query: string) {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2)
    .filter(
      (term) =>
        ![
          "the",
          "and",
          "for",
          "with",
          "about",
          "contact",
          "founder",
          "meeting",
          "that",
          "this",
          "from",
          "what",
          "when",
          "where",
          "who"
        ].includes(term)
    )
    .slice(0, 8);
}

function searchDemoContext(context: ClientContext, terms: string[], limit: number) {
  const includesTerm = (value: string) =>
    terms.length === 0 || terms.some((term) => value.toLowerCase().includes(term));

  return [
    ...context.memories
      .filter((memory) =>
        includesTerm(`${memory.title} ${memory.summary} ${memory.category} ${memory.sourceSnippet}`)
      )
      .map((memory) => ({
        id: memory.id,
        type: "memory" as const,
        title: memory.title,
        summary: memory.summary,
        source: memory.source,
        category: memory.category,
        status: memory.status,
        snippet: memory.sourceSnippet,
        confidence: memory.confidence
      })),
    ...context.actions
      .filter((action) =>
        includesTerm(`${action.title} ${action.actionType} ${action.status} ${action.draftText ?? ""}`)
      )
      .map((action) => ({
        id: action.id,
        type: "action" as const,
        title: action.title,
        summary: action.draftText ?? action.actionType,
        source: action.meetingId,
        status: action.status,
        snippet: action.draftText
      })),
    ...context.graph.nodes
      .filter((node) => includesTerm(`${node.label} ${node.type} ${node.note}`))
      .map((node) => ({
        id: node.id,
        type: "graph" as const,
        title: node.label,
        summary: node.note,
        source: "Demo graph",
        edgeLabel: context.graph.edges.find((edge) => edge.source === node.id || edge.target === node.id)?.label
      }))
  ].slice(0, limit);
}

function recommendDemoPartners(
  context: ClientContext,
  terms: string[],
  need: string,
  limit: number
): LivePartnerRecommendation[] {
  const includesTerm = (value: string) =>
    terms.length === 0 || terms.some((term) => value.toLowerCase().includes(term));
  const hasOpenReferral = context.memories.some(
    (memory) =>
      memory.category === "Referral Opportunity" &&
      (terms.length === 0 || includesTerm(`${memory.title} ${memory.summary} ${memory.sourceSnippet}`))
  );

  return partnerProfiles
    .filter((partner) =>
      hasOpenReferral && partner.partnerType === "solutions_engineer"
        ? true
        : includesTerm(`${partner.name} ${partner.partnerType} ${partner.specialty} ${partner.note} ${partner.keywords.join(" ")}`)
    )
    .map((partner) => ({
      id: partner.id,
      name: partner.name,
      partnerType: partner.partnerType,
      specialty: partner.specialty,
      organization: partner.organization,
      matchReason: hasOpenReferral
        ? "Matched to an open referral opportunity in the demo contact memory."
        : `Matched the live need to ${partner.specialty.toLowerCase()}.`,
      founderUse:
        partner.introStatus === "trusted"
          ? "Confirm the contact still wants an introduction, then offer a warm intro."
          : "Use as founder context first; confirm fit before offering an intro.",
      source: hasOpenReferral ? "Demo referral graph" : "Demo partner directory",
      confidence: hasOpenReferral ? 0.9 : 0.72,
      status: partner.introStatus,
      relationshipLabel: hasOpenReferral ? "matches" : "founder partner",
      evidence: need
    }))
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, limit);
}

function partnerRecommendationFromRecord(values: Record<string, unknown>): LivePartnerRecommendation {
  const source = stringValue(values.source, "Partner directory");
  const evidence = stringValue(values.evidence);
  const note = stringValue(values.note);
  const specialty = stringValue(values.specialty, "Partner");
  const status = stringValue(values.status, "available");

  return {
    id: stringValue(values.id, `partner-${crypto.randomUUID()}`),
    name: stringValue(values.name, "Partner"),
    partnerType: partnerTypeValue(values.partnerType),
    specialty,
    organization: stringValue(values.organization) || undefined,
    matchReason: evidence
      ? `Matched this conversation to ${evidence}.`
      : `Matched this conversation to ${specialty.toLowerCase()}.`,
    founderUse:
      source.includes("referral")
        ? "Confirm the contact still wants this support, then offer the warm introduction."
        : "Use as founder context first; confirm the need before offering an introduction.",
    source,
    confidence: numberValue(values.confidence) ?? 0.7,
    status,
    relationshipLabel: stringValue(values.relationshipLabel) || undefined,
    evidence: note || evidence || undefined
  };
}

function liveResultType(value: unknown) {
  return value === "action" || value === "graph" ? value : "memory";
}

function memoryCategoryValue(value: unknown) {
  return liveMemoryCategories.includes(value as MemoryCategory) ? (value as MemoryCategory) : undefined;
}

function partnerTypeValue(value: unknown): PartnerType {
  return value === "solutions_engineer" ||
    value === "exec_sponsor" ||
    value === "advisor" ||
    value === "investor_intro" ||
    value === "candidate_referrer" ||
    value === "other"
    ? value
    : "other";
}

function stringValue(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && typeof (value as { toString?: unknown }).toString === "function") {
    const text = String(value);
    return text === "[object Object]" ? fallback : text;
  }
  return fallback;
}

function numberValue(value: unknown) {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && typeof (value as { toNumber?: unknown }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return undefined;
}

function normalizeMemoryText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function memoryNodeToItem(properties: Record<string, unknown>, clientId: string): MemoryItem {
  const stringProp = (key: string, fallback = "") =>
    typeof properties[key] === "string" ? properties[key] : fallback;
  const numberProp = (key: string, fallback: number) =>
    typeof properties[key] === "number" ? properties[key] : fallback;
  const temporalProp = (key: string) => {
    const value = properties[key];
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && typeof (value as { toString?: unknown }).toString === "function") {
      return String(value);
    }
    return undefined;
  };

  return {
    id: stringProp("id", `neo4j-${crypto.randomUUID()}`),
    contactId: clientId,
    category: stringProp("category", "Milestone") as MemoryItem["category"],
    title: stringProp("title", stringProp("category", "Memory")),
    summary: stringProp("summary"),
    source: stringProp("source", "Graph memory"),
    sourceSnippet: stringProp("sourceSnippet"),
    confidence: numberProp("confidence", 0.8),
    status: stringProp("status", "known") as MemoryItem["status"],
    validFrom: stringProp("validFrom", undefined as unknown as string),
    lastConfirmedAt: stringProp("lastConfirmedAt", undefined as unknown as string),
    updatedAt: temporalProp("updatedAt"),
    createdAt: temporalProp("createdAt"),
    salience: numberProp("salience", 0.7)
  };
}

function advisorNodeToItem(properties: Record<string, unknown>): Advisor {
  const stringProp = (key: string, fallback = "") =>
    typeof properties[key] === "string" ? properties[key] : fallback;

  return {
    id: stringProp("id", `neo4j-founder-${crypto.randomUUID()}`),
    name: stringProp("name", stringProp("label", "Founder")),
    company: stringProp("company", stringProp("firm", stringProp("note", "")))
  };
}

function clientNodeToItem(properties: Record<string, unknown>): Client {
  const stringProp = (key: string, fallback = "") =>
    typeof properties[key] === "string" ? properties[key] : fallback;

  return {
    id: stringProp("id", `neo4j-contact-${crypto.randomUUID()}`),
    name: stringProp("name", stringProp("label", "Contact")),
    relationshipType: stringProp(
      "relationshipType",
      stringProp("clientType", "investor")
    ) as Client["relationshipType"],
    organization: stringProp("organization", stringProp("note", "")),
    role: stringProp("role", stringProp("clientType", "")),
    relationshipSince: stringProp("relationshipSince", "Unknown")
  };
}

function meetingNodeToItem(
  properties: Record<string, unknown>,
  contactId = stringFrom(properties.contactId, stringFrom(properties.clientId, "")),
  founderId = stringFrom(properties.founderId, stringFrom(properties.advisorId, ""))
): Meeting {
  const stringProp = (key: string, fallback = "") => stringFrom(properties[key], fallback);

  return {
    id: stringProp("id", `neo4j-meeting-${crypto.randomUUID()}`),
    contactId,
    founderId,
    startsAt: stringProp("startsAt"),
    endedAt: stringProp("endedAt", undefined as unknown as string),
    type: stringProp("type", "Meeting"),
    location: stringProp("location", "Unknown"),
    objective: stringProp("objective", "Contact meeting"),
    status: stringProp("status", "not_started") as Meeting["status"]
  };
}

function actionNodeToItem(
  properties: Record<string, unknown>,
  clientId: string,
  meetingId = "meeting-2026-06-20-priya",
  owner = "Maya Chen"
): ActionItem {
  const stringProp = (key: string, fallback = "") =>
    typeof properties[key] === "string" ? properties[key] : fallback;

  return {
    id: stringProp("id", `neo4j-action-${crypto.randomUUID()}`),
    contactId: clientId,
    meetingId: stringProp("meetingId", meetingId),
    title: stringProp("title", "Follow-up action"),
    actionType: stringProp("actionType", "follow_up"),
    dueAt: stringProp("dueAt"),
    owner: stringProp("owner", owner),
    status: stringProp("status", "pending") as ActionItem["status"],
    draftText: stringProp("draftText", undefined as unknown as string)
  };
}

function graphNodeToItem(labels: string[], properties: Record<string, unknown>): GraphNode {
  const stringProp = (key: string, fallback = "") =>
    typeof properties[key] === "string" ? properties[key] : fallback;
  const type = graphNodeTypeFromLabels(labels);

  return {
    id: stringProp("id", `neo4j-node-${crypto.randomUUID()}`),
    label: stringProp("label", stringProp("name", stringProp("title", "Graph node"))),
    type,
    note: stringProp("note", stringProp("notes", stringProp("reason")))
  };
}

function graphEdgeToItem(
  id: unknown,
  source: unknown,
  target: unknown,
  type: unknown,
  label: unknown
): GraphEdge {
  const sourceId = typeof source === "string" ? source : "unknown-source";
  const targetId = typeof target === "string" ? target : "unknown-target";
  const relationshipType = typeof type === "string" ? type : "RELATED";

  return {
    id: typeof id === "string" ? id : `${sourceId}-${relationshipType}-${targetId}`,
    source: sourceId,
    target: targetId,
    label: typeof label === "string" ? label : relationshipType.toLowerCase().replaceAll("_", " ")
  };
}

function graphNodeTypeFromLabels(labels: string[]): GraphNode["type"] {
  if (labels.includes("Founder") || labels.includes("Advisor")) return "Founder";
  if (labels.includes("Contact") || labels.includes("Client")) return "Contact";
  if (labels.includes("Partner") || labels.includes("Specialist")) return "Partner";
  if (labels.includes("Opportunity") || labels.includes("ReferralOpportunity")) return "Opportunity";
  return "Person";
}

function buildSuggestedQuestions(memories: MemoryItem[]) {
  const questions = memories
    .filter((memory) => memory.status === "open" || memory.salience >= 0.85)
    .sort((a, b) => b.salience - a.salience)
    .slice(0, 4)
    .map((memory) => {
      if (memory.category === "Referral Opportunity") {
        return `Would an introduction related to ${memory.title.toLowerCase()} help with the next step?`;
      }
      if (memory.category === "Milestone") {
        return `How has ${memory.title.toLowerCase()} changed your planning priorities?`;
      }
      if (memory.category === "Unresolved Concern") {
        return `What has made ${memory.title.toLowerCase()} hard to complete?`;
      }
      return `What is the next concrete step for ${memory.title.toLowerCase()}?`;
    });

  return questions.length > 0 ? questions : ["What would make the next step feel clear and useful?"];
}

function buildBriefing({
  founder,
  contact,
  upcomingMeeting,
  lastMeeting,
  memories,
  suggestedQuestions
}: {
  founder: Advisor;
  contact: Client;
  upcomingMeeting: Meeting;
  lastMeeting: Meeting;
  memories: MemoryItem[];
  suggestedQuestions: string[];
}) {
  const salient = memories
    .slice()
    .sort((a, b) => b.salience - a.salience)
    .slice(0, 4);
  const open = memories.filter((memory) => memory.status === "open").slice(0, 3);
  const meetingTime = formatMeetingTime(upcomingMeeting.startsAt);
  const lastMeetingDate = lastMeeting?.startsAt ? formatMeetingDate(lastMeeting.startsAt) : "an earlier meeting";
  const importantContext = salient.map((memory) => memory.summary).join(" ");
  const openContext = open.map((memory) => memory.title.toLowerCase()).join(", ");
  const firstQuestion = suggestedQuestions[0];

  return [
    `You are meeting ${contact.name}${meetingTime ? ` at ${meetingTime}` : ""}.`,
    `The founder is ${founder.name}.`,
    `The last recorded meeting was ${lastMeetingDate}.`,
    importantContext ? `High-salience context: ${importantContext}` : "",
    openContext ? `Open items to handle: ${openContext}.` : "",
    firstQuestion ? `Useful opening question: ${firstQuestion}` : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function formatMeetingTime(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "";
  return new Intl.DateTimeFormat("en-SG", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Singapore"
  }).format(new Date(timestamp));
}

function formatMeetingDate(value: string) {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeZone: "Asia/Singapore"
  }).format(new Date(timestamp));
}

function stringFrom(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof (value as { toString?: unknown }).toString === "function") {
    return String(value);
  }
  return fallback;
}
