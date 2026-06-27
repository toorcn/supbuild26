import assert from "node:assert/strict";
import { getCalendar, getClientContextWithMemoryLayer, getDataMode } from "../lib/neo4j-memory";
import { closeNeo4jDriver } from "../lib/neo4j-memory";
import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

async function main() {
  const expectedMode = process.env.EXPECT_DATA_MODE?.trim();
  const mode = getDataMode();
  if (expectedMode) assert.equal(mode, expectedMode);

  const calendar = await getCalendar();
  assert.ok(calendar.meetings.length > 0, "No meetings returned from selected data source.");

  const firstMeeting = calendar.meetings[0];
  const context = await getClientContextWithMemoryLayer(firstMeeting.contactId);
  assert.equal(context.dataMode, mode);

  if (mode === "neo4j" && calendar.source === "neo4j") {
    assert.equal(calendar.source, "neo4j");
    assert.equal(context.memorySource, "neo4j");
    assert.ok(context.memories.length > 0, "Neo4j context returned no memories.");
    assert.ok(context.graph.nodes.length > 0, "Neo4j context returned no graph nodes.");
    assert.notEqual(
      context.briefing,
      "You are meeting Priya Iyer (Principal, Lattice Ventures) at 10:30. You last spoke on 2026-04-08. Last time, legacy WMS integration was her main diligence risk, and she set a path-to-$10M-ARR bar. Meshwave has since crossed $1.5M ARR. Live research surfaces that Lattice just announced an AI-infrastructure thesis and Priya posted about legacy-system modernization — open by acknowledging the thesis shift, then move into the migration story. Useful next questions: what is still unresolved on integration risk, and would a warm intro to Diego (our SE) advance diligence?",
      "Neo4j mode should generate the briefing from graph data, not reuse the fixed demo briefing."
    );
  } else if (mode === "neo4j") {
    assert.equal(calendar.source, "demo");
    assert.equal(context.memorySource, "demo");
    assert.ok(calendar.warning, "Neo4j fallback should explain why demo data is shown.");
    assert.ok(context.memoryWarning, "Neo4j fallback should explain why demo memory is shown.");
  }

  console.log("Data source check passed");
  console.log({
    mode,
    calendarSource: calendar.source,
    memorySource: context.memorySource,
    contact: context.contact.name,
    meeting: context.upcomingMeeting.id,
    memories: context.memories.length,
    graphNodes: context.graph.nodes.length
  });
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await closeNeo4jDriver();
  });
