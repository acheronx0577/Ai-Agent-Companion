#!/usr/bin/env node
/**
 * Copy GOOGLE_OAUTH_* from .env into Convex AUTH_GOOGLE_* (local dev helper).
 */
import { convexEnvSet, readGoogleOAuthCredentials } from "./lib/convex_env.mjs";

const credentials = readGoogleOAuthCredentials();
if (!credentials) {
  console.error("Missing .env with GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET");
  process.exit(1);
}

convexEnvSet("AUTH_GOOGLE_ID", credentials.id);
convexEnvSet("AUTH_GOOGLE_SECRET", credentials.secret);
convexEnvSet("SITE_URL", "http://127.0.0.1:5000");

console.log("Convex AUTH_GOOGLE_* and SITE_URL updated from .env");
