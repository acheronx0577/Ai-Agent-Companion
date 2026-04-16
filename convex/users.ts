import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserIdOrNull, syncUserFromAuth, toUserProfile } from "./userSync";

const userProfileValidator = v.object({
  userId: v.id("users"),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
  picture: v.optional(v.string()),
  googleSub: v.optional(v.string()),
  createdAt: v.optional(v.number()),
  lastLoginAt: v.optional(v.number()),
});

/** Phase 0 health check — proves functions deploy. */
export const bootstrapPing = query({
  args: {},
  returns: v.object({
    ok: v.boolean(),
    phase: v.number(),
    project: v.string(),
  }),
  handler: async () => ({
    ok: true,
    phase: 3,
    project: "wakuwaku-companion",
  }),
});

/**
 * Phase 3 — sync Google identity fields onto the Convex Auth user row.
 * Call after sign-in (e.g. from /convex-auth-test) before usage mutations.
 */
export const upsertFromAuth = mutation({
  args: {},
  returns: userProfileValidator,
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not authenticated");
    }
    return await syncUserFromAuth(ctx, userId);
  },
});

/** Phase 3 — current user profile (null when signed out). */
export const me = query({
  args: {},
  returns: v.union(v.null(), userProfileValidator),
  handler: async (ctx) => {
    const userId = await getAuthUserIdOrNull(ctx);
    if (userId === null) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return toUserProfile(user);
  },
});
