#!/usr/bin/env node
/** Phase 4: usage limits in Convex. */
import { runPhaseVerify } from "./lib/phase_verify.mjs";

runPhaseVerify("Phase 4 usage layout: OK", ({ requireIn }) => {
  requireIn("convex/usage.ts", "usage.ts", [
    "export const status",
    "export const increment",
    "export const checkDailyLimit",
    "getAuthUserId",
  ]);
  requireIn("convex/usageLogic.ts", "usageLogic.ts", [
    "computeUsageStatusForUser",
    "rateLimitFromTimestamps",
  ]);
  requireIn("frontend/convex_auth_test.jsx", "convex_auth_test.jsx", [
    "usage.increment",
    "<h2>Usage</h2>",
  ]);
  requireIn("convex/schema.ts", "schema.ts", ["chatRateState: defineTable", "dailyUsage: defineTable"]);
  requireIn("convex/usageInfo.ts", "usageInfo.ts", ["phase4Status", "usage.increment"]);
  requireIn("wakuwaku/convex_usage.py", "wakuwaku/convex_usage.py", ["use_convex_usage", "USE_CONVEX_USAGE"]);
  requireIn("wakuwaku/usage_limit.py", "wakuwaku/usage_limit.py", ["use_convex_usage"]);
});
