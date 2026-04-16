import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

/**
 * Phase 2 — Convex Auth with Google.
 * Env (Convex dashboard): AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, SITE_URL, JWT_PRIVATE_KEY, JWKS
 * Google redirect URI: {CONVEX_SITE_URL}/api/auth/callback/google
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google({
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          googleSub: profile.sub,
        };
      },
    }),
  ],
});
