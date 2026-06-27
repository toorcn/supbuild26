import assert from "node:assert/strict";
import neo4j from "neo4j-driver";
import { extraJourneys } from "../lib/extra-journeys";
import { closeNeo4jDriver, getClientContextWithMemoryLayer } from "../lib/neo4j-memory";
import { getNeo4jDatabaseConfig, loadLocalEnv } from "./load-local-env";

loadLocalEnv();

async function main() {
  const uri = requiredEnv("NEO4J_URI");
  const username = requiredEnv("NEO4J_USERNAME");
  const password = requiredEnv("NEO4J_PASSWORD");
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    connectionTimeout: 8000,
    maxTransactionRetryTime: 3000
  });

  try {
    for (const journey of extraJourneys) {
      const result = await driver.executeQuery(
        `
        MATCH (contact:Contact {id: $contactId})
        OPTIONAL MATCH (contact)-[:HAS_MEETING]->(meeting:Meeting)
        OPTIONAL MATCH (contact)-[:HAS_MEMORY]->(memory:Memory)
        OPTIONAL MATCH (contact)-[:HAS_ACTION]->(action:Action)
        OPTIONAL MATCH (contact)-[rel:RELATED_TO|HAS_REFERRAL_OPPORTUNITY]->(node)
        RETURN contact.name AS name,
               count(DISTINCT meeting) AS meetings,
               count(DISTINCT memory) AS memories,
               count(DISTINCT action) AS actions,
               count(DISTINCT node) AS graphNodes
        `,
        { contactId: journey.contact.id },
        { ...getNeo4jDatabaseConfig(), routing: neo4j.routing.READ }
      );

      const record = result.records[0];
      assert.ok(record, `No Neo4j record returned for ${journey.contact.id}`);
      assert.equal(record.get("name"), journey.contact.name);
      assert.ok(record.get("meetings").toNumber() >= 2, `${journey.contact.id} missing meetings`);
      assert.ok(record.get("memories").toNumber() >= 4, `${journey.contact.id} missing memories`);
      assert.ok(record.get("actions").toNumber() >= 2, `${journey.contact.id} missing actions`);
      assert.ok(record.get("graphNodes").toNumber() >= 3, `${journey.contact.id} missing graph nodes`);

      const context = await getClientContextWithMemoryLayer(journey.contact.id);
      assert.equal(context.memorySource, "neo4j");
      assert.equal(context.contact.name, journey.contact.name);
      assert.ok(context.memories.length >= 4, `${journey.contact.id} app context missing memories`);
      assert.ok(context.actions.length >= 2, `${journey.contact.id} app context missing actions`);
      assert.ok(context.graph.nodes.length >= 5, `${journey.contact.id} app context missing graph nodes`);

      console.log("Verified extra journey", {
        contactId: journey.contact.id,
        name: record.get("name"),
        meetings: record.get("meetings").toNumber(),
        memories: record.get("memories").toNumber(),
        actions: record.get("actions").toNumber(),
        graphNodes: context.graph.nodes.length
      });
    }
  } finally {
    await driver.close();
    await closeNeo4jDriver();
  }
}

function requiredEnv(key: string) {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required`);
  return value;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
