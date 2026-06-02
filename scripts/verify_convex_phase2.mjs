#!/usr/bin/env node
/** Phase 2: Convex Auth + Google provider wiring. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function requireIn(file, label, patterns) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  for (const pattern of patterns) {
    const ok = typeof pattern === "string" ? text.includes(pattern) : pattern.test(text);
    if (!ok) {
      console.error(`${label}: missing ${pattern}`);
      failed += 1;
    }
  }
}

requireIn("convex/auth.ts", "auth.ts", [
  "convexAuth",
  '@auth/core/providers/google',
  "providers:",
]);
requireIn("convex/auth.config.ts", "auth.config.ts", ["CONVEX_SITE_URL", "applicationID"]);
requireIn("convex/http.ts", "http.ts", ["auth.addHttpRoutes", 'from "./auth"']);
requireIn("convex/schema.ts", "schema.ts", ["authTables", "dailyUsage: defineTable"]);
requireIn("templates/convex_auth_test.html", "convex_auth_test.html", [
  "Sign in with Google (Convex)",
]);
requireIn("app.py", "app.py", ["/convex-auth-test", "convex_auth_test.html"]);

if (!fs.existsSync(path.join(root, "docs", "CONVEX_AUTH.md"))) {
  console.error("Missing docs/CONVEX_AUTH.md");
  failed += 1;
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (!pkg.dependencies?.["@convex-dev/auth"]) {
  console.error("package.json must include @convex-dev/auth");
  failed += 1;
}

if (failed > 0) process.exit(1);
console.log("Phase 2 auth layout: OK");
