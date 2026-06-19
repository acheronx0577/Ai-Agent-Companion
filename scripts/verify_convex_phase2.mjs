#!/usr/bin/env node
/** Phase 2: Convex Auth + Google provider wiring. */
import { readRepoJson, repoPathExists } from "./lib/repo_paths.mjs";
import { runPhaseVerify } from "./lib/phase_verify.mjs";

runPhaseVerify("Phase 2 auth layout: OK", ({ requireIn }) => {
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

  if (!repoPathExists("docs", "CONVEX_AUTH.md")) {
    console.error("Missing docs/CONVEX_AUTH.md");
    process.exit(1);
  }

  const pkg = readRepoJson("package.json");
  if (!pkg.dependencies?.["@convex-dev/auth"]) {
    console.error("package.json must include @convex-dev/auth");
    process.exit(1);
  }
});
