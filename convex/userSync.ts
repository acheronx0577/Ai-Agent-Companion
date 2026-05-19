import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Profile fields returned by users.me (matches Flask /auth/me shape where possible). */
export type UserProfile = {
  userId: Id<"users">;
  email?: string;
  name?: string;
  picture?: string;
  googleSub?: string;
  createdAt?: number;
  lastLoginAt?: number;
};

export function toUserProfile(user: Doc<"users">): UserProfile {
  return {
    userId: user._id,
    email: user.email,
    name: user.name,
    picture: user.picture ?? user.image,
    googleSub: user.googleSub,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

/**
 * Patch app-specific fields from Convex Auth identity onto the auth user row.
 * Called from upsertFromAuth and from authenticated mutations (Phase 4+).
 */
export async function syncUserFromAuth(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<UserProfile> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const now = Date.now();
  const existing = await ctx.db.get(userId);
  const googleSub = identity.subject ?? existing?.googleSub;
  const picture = identity.pictureUrl ?? existing?.picture ?? existing?.image;

  await ctx.db.patch(userId, {
    name: identity.name ?? existing?.name,
    email: identity.email ?? existing?.email,
    image: picture ?? existing?.image,
    picture,
    googleSub,
    lastLoginAt: now,
    createdAt: existing?.createdAt ?? now,
  });

  const updated = await ctx.db.get(userId);
  if (!updated) {
    throw new Error("User not found after sync");
  }
  return toUserProfile(updated);
}

/** Require auth; returns null when guest. */
export async function getAuthUserIdOrNull(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users"> | null> {
  return await getAuthUserId(ctx);
}
