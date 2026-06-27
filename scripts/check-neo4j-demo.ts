import assert from "node:assert/strict";
import {
  closeNeo4jDriver,
  getClientContextWithMemoryLayer,
  saveApprovedMemory
} from "../lib/neo4j-memory";
import type { ExtractedMemory } from "../lib/types";
import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

const clientId = "contact-priya";
const memoryId = "aa-smoke-approved-integration-risk";

async function main() {
  assertNeo4jEnv();

  try {
    const writeResult = await saveApprovedMemory(approvedSmokeMemory());
    assert.equal(writeResult.writeMode, "neo4j");
    assert.equal(writeResult.saved, true);

    const context = await getClientContextWithMemoryLayer(clientId);
    assert.equal(context.memorySource, "neo4j");

    const approvedMemory = context.memories.find((memory) => memory.id === memoryId);
    assert.ok(approvedMemory, "Approved smoke memory was not returned from Neo4j context.");
    assert.equal(approvedMemory.status, "approved");
    assert.equal(approvedMemory.source, "live meeting companion");
    assert.equal(approvedMemory.salience, 0.95);
    assert.ok(
      approvedMemory.updatedAt || approvedMemory.createdAt,
      "Approved smoke memory is missing Neo4j timestamp metadata."
    );

    const approvedOrRecent = context.memories.filter(
      (memory) => memory.status === "approved" || memory.source === "live meeting companion"
    );
    assert.equal(
      approvedOrRecent.some((memory) => memory.id === memoryId),
      true,
      "Approved smoke memory would not appear in the contact profile approved/recent section."
    );

    console.log("Neo4j demo flow checks passed");
  } finally {
    await closeNeo4jDriver();
  }
}

function assertNeo4jEnv() {
  const missing = ["NEO4J_URI", "NEO4J_USERNAME", "NEO4J_PASSWORD"].filter(
    (key) => !process.env[key]
  );
  if (missing.length > 0) {
    throw new Error(`${missing.join(", ")} required for npm run check:neo4j-demo.`);
  }
}

function approvedSmokeMemory(): ExtractedMemory {
  return {
    id: memoryId,
    contactId: clientId,
    category: "Unresolved Concern",
    summary: "Legacy WMS integration risk is still open and needs a founder-approved follow-up.",
    sourceSnippet: "I need to be sure a customer can migrate off a legacy system without a six-month project.",
    timestamp: new Date().toISOString(),
    confidence: 0.94,
    proposedGraphMutation:
      "MERGE (c:Contact {id: 'contact-priya'})-[:HAS_CONCERN]->(:Concern {title: 'Legacy WMS integration risk remains open'})"
  };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
