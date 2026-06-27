import { existsSync, readFileSync } from "node:fs";

export function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;

    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const equalsIndex = line.indexOf("=");
      if (equalsIndex === -1) continue;

      const key = line.slice(0, equalsIndex).trim();
      const rawValue = line.slice(equalsIndex + 1).trim();
      if (!key || process.env[key] !== undefined) continue;

      process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
    }
  }
}

export function getNeo4jDatabaseConfig() {
  return process.env.NEO4J_DATABASE ? { database: process.env.NEO4J_DATABASE } : undefined;
}
