#!/usr/bin/env node
/**
 * Set Convex *production* Auth env for Render (or other hosting).
 */
import {
  convexEnvSet,
  normalizeHttpsSiteUrl,
  parseEnv,
  readGoogleOAuthCredentials,
} from "./lib/convex_env.mjs";
import { readRepoText, repoPathExists } from "./lib/repo_paths.mjs";

let siteUrl;
try {
  siteUrl = normalizeHttpsSiteUrl(process.argv[2] || process.env.PRODUCTION_SITE_URL || "");
} catch {
  console.error("Pass your public app URL, e.g.:");
  console.error("  node scripts/sync_convex_production.mjs https://ai-companion-ngbi.onrender.com");
  process.exit(1);
}

const credentials = readGoogleOAuthCredentials();
if (!credentials) {
  console.error("Missing .env with GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET");
  process.exit(1);
}

console.log(`Setting Convex PRODUCTION env (SITE_URL=${siteUrl})...`);
convexEnvSet("AUTH_GOOGLE_ID", credentials.id, { prod: true });
convexEnvSet("AUTH_GOOGLE_SECRET", credentials.secret, { prod: true });
convexEnvSet("SITE_URL", siteUrl, { prod: true });

let convexSiteHint = "https://YOUR-PROJECT.convex.site";
if (repoPathExists(".env.local")) {
  const localEnv = parseEnv(readRepoText(".env.local"));
  const site = (localEnv.CONVEX_SITE_URL || "").replace(/\/$/, "");
  if (site.includes(".convex.site")) {
    convexSiteHint = site;
  }
}

console.log("\nDone. Also verify:");
console.log("  1. npx convex deploy");
console.log("  2. Render env: CONVEX_URL + CONVEX_SITE_URL from Convex dashboard (Production)");
console.log(`  3. Google redirect: ${siteUrl}/auth/google/callback`);
console.log(`  4. Google redirect: ${convexSiteHint}/api/auth/callback/google`);
console.log("  5. JWT_PRIVATE_KEY + JWKS: npm run convex:set-jwt-keys:prod");
