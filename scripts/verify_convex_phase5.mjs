#!/usr/bin/env node
/** Phase 5: main app Convex Auth + usage bridge. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function requireIn(file, label, patterns) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  for (const pattern of patterns) {
    const ok = typeof pattern === "string" ? text.includes(pattern) : pattern.test(text);
    if (!ok) {
      console.error(`${label}: missing ${pattern}`);
      failed += 1;
    }
  }
}

requireIn("frontend/convex_bridge.jsx", "convex_bridge.jsx", [
  "initWakuConvexBridge",
  "window.WakuConvex",
  "syncFlaskSession",
  "authorizedFetch",
  "/auth/convex-bridge",
  "api.usage.status",
]);
requireIn("static/app.js", "app.js", [
  "useConvexFrontend",
  "WakuConvex",
  "authorizedFetch",
]);
requireIn("templates/index.html", "index.html", [
  "data-convex-url",
  "data-convex-enabled",
  "convex_bridge.js",
  "convex-bridge-root",
  '<button id="google-sign-in-button"',
]);
requireIn("wakuwaku/auth.py", "wakuwaku/auth.py", [
  "/convex-bridge",
  "auth_convex_bridge",
  "fetch_verified_profile_via_convex",
]);
requireIn("app.py", "app.py", [
  "convex_frontend_enabled",
  "convex_url",
  "convex_enabled",
]);
requireIn("static/convex_client_api.js", "convex_client_api.js", [
  'ref("users:me")',
  'ref("usage:status")',
  'ref("usage:increment")',
  "Symbol.for(\"functionName\")",
]);
requireIn("convex/frontendInfo.ts", "frontendInfo.ts", ["phase5Status", "USE_CONVEX_FRONTEND"]);

if (failed > 0) process.exit(1);
console.log("Phase 5 frontend bridge layout: OK");
