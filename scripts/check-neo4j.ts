import neo4j from "neo4j-driver";
import { getNeo4jDatabaseConfig, loadLocalEnv } from "./load-local-env";

loadLocalEnv();

const uri = process.env.NEO4J_URI;
const username = process.env.NEO4J_USERNAME;
const password = process.env.NEO4J_PASSWORD;
const databaseConfig = getNeo4jDatabaseConfig();

async function main() {
  if (!uri || !username || !password) {
    throw new Error("NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD are required.");
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    connectionTimeout: 8000,
    maxTransactionRetryTime: 3000
  });

  try {
    const serverInfo = await withTimeout(
      driver.getServerInfo(databaseConfig),
      15000,
      "Neo4j getServerInfo timed out after 15s."
    );

    const result = await withTimeout(
      driver.executeQuery(
        "RETURN 1 AS ok",
        {},
        {
          ...databaseConfig,
          routing: neo4j.routing.READ
        }
      ),
      15000,
      "Neo4j executeQuery timed out after 15s."
    );

    console.log("Connection established");
    console.log({
      uri: redactUri(uri),
      database: databaseConfig?.database ?? "default",
      serverInfo,
      ok: result.records[0]?.get("ok")?.toString?.() ?? result.records[0]?.get("ok")
    });
  } finally {
    await driver.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string) {
  let timeout: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), milliseconds);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

function redactUri(value: string) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.hostname.replace(/^[^.]+/, "<host>")}`;
  } catch {
    return "<redacted>";
  }
}
