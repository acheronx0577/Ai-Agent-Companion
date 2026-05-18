import { v } from "convex/values";
import { query } from "./_generated/server";

/** Phase 3 — user sync wiring check (no login required). */
export const phase3Status = query({
  args: {},
  returns: v.object({
    phase: v.number(),
    functions: v.array(v.string()),
    indexes: v.array(v.string()),
  }),
  handler: async () => ({
    phase: 3,
    functions: ["users.upsertFromAuth", "users.me", "users.bootstrapPing"],
    indexes: ["users.email", "users.phone", "users.by_googleSub"],
  }),
});
