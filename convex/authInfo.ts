import { v } from "convex/values";
import { query } from "./_generated/server";

/** Phase 2 — auth wiring check (no login required). */
export const phase2Status = query({
  args: {},
  returns: v.object({
    phase: v.number(),
    provider: v.string(),
    signInPath: v.string(),
    callbackPath: v.string(),
    authTables: v.array(v.string()),
  }),
  handler: async () => ({
    phase: 2,
    provider: "google",
    signInPath: "/api/auth/signin/google",
    callbackPath: "/api/auth/callback/google",
    authTables: [
      "users",
      "authSessions",
      "authAccounts",
      "authRefreshTokens",
      "authVerificationCodes",
      "authVerifiers",
      "authRateLimits",
    ],
  }),
});
