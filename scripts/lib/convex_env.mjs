import fs from "node:fs";
import { readRepoText, resolveRepoPath } from "./repo_paths.mjs";
import { runNpx } from "./run_npm.mjs";

export function parseEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }
    const [key, ...rest] = trimmed.split("=");
    out[key.trim()] = rest.join("=").trim();
  }
  return out;
}

export function readDotEnv() {
  const envPath = resolveRepoPath(".env");
  if (!fs.existsSync(envPath)) {
    return null;
  }
  return parseEnv(readRepoText(".env"));
}

export function convexEnvSet(name, value, { prod = false } = {}) {
  const args = ["convex", "env", "set", name];
  if (prod) {
    args.push("--prod");
  }
  args.push("--", value);
  runNpx(args);
}

export function readGoogleOAuthCredentials() {
  const env = readDotEnv();
  if (!env) {
    return null;
  }
  const id = env.GOOGLE_OAUTH_CLIENT_ID;
  const secret = env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!id || !secret) {
    return null;
  }
  return { id, secret };
}

export function normalizeHttpsSiteUrl(url) {
  const trimmed = url.trim().replace(/\/$/, "");
  if (!trimmed.startsWith("https://")) {
    throw new Error("SITE_URL must be an https:// URL");
  }
  return trimmed;
}
