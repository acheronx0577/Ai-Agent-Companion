#!/usr/bin/env node
/** Phase 3: user sync (upsertFromAuth, users.me). */
import { runPhaseVerify } from "./lib/phase_verify.mjs";

runPhaseVerify("Phase 3 user sync layout: OK", ({ requireIn }) => {
  requireIn("convex/users.ts", "users.ts", [
    "upsertFromAuth",
    "export const me",
    "getAuthUserId",
    "syncUserFromAuth",
  ]);
  requireIn("convex/userSync.ts", "userSync.ts", ["syncUserFromAuth", "toUserProfile"]);
  requireIn("convex/usersInfo.ts", "usersInfo.ts", ["phase3Status", "users.upsertFromAuth"]);
  requireIn("templates/convex_auth_test.html", "convex_auth_test.html", [
    "convex-auth-root",
    "convex_auth_test.js",
    "Convex auth",
  ]);
  requireIn("frontend/convex_auth_test.jsx", "convex_auth_test.jsx", [
    "upsertFromAuth",
    "api.users.me",
  ]);
});
