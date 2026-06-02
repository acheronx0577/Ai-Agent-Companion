#!/usr/bin/env node
/** Phase 1: schema.ts defines required tables and indexes. */
import { repoPathExists } from "./lib/repo_paths.mjs";
import { createPhaseVerifier } from "./lib/phase_verify.mjs";

const { requireIn, finish } = createPhaseVerifier();

if (!repoPathExists("convex", "schema.ts")) {
  console.error("Missing convex/schema.ts");
  process.exit(1);
}

requireIn("convex/schema.ts", "schema", [
  "users: defineTable",
  "dailyUsage: defineTable",
  "chatSessions: defineTable",
  "chatMessages: defineTable",
  'index("by_user_date"',
  /index\("by_googleSub"|authTables/,
]);

requireIn("convex/constants.ts", "constants", ["DAILY_MESSAGE_LIMIT = 10"]);

finish("Phase 1 schema layout: OK", [
  "Next: npm run convex:dev:once && npx convex run schemaInfo:phase1Status",
]);
