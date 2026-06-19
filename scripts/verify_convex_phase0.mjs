#!/usr/bin/env node
/**
 * Phase 0 exit checks (no Convex account required for file layout).
 * Run after `npm run convex:dev:once` to also verify deployment + functions.
 */
import { readRepoJson, readRepoText, repoPathExists } from "./lib/repo_paths.mjs";
import { createPhaseVerifier } from "./lib/phase_verify.mjs";

const { fail, finish } = createPhaseVerifier();

const requiredFiles = [
  "convex/schema.ts",
  "convex/auth.ts",
  "convex/users.ts",
  "convex/usage.ts",
  "convex/http.ts",
  "convex/tsconfig.json",
  "package.json",
];

for (const rel of requiredFiles) {
  if (!repoPathExists(rel)) {
    fail(`Missing: ${rel}`);
  }
}

const pkg = readRepoJson("package.json");
if (!pkg.dependencies?.convex) {
  fail("package.json must list convex in dependencies");
}
if (!pkg.scripts?.["convex:dev"]) {
  fail('package.json must include script "convex:dev"');
}

const gitignore = readRepoText(".gitignore");
if (!gitignore.includes("convex/_generated/")) {
  fail(".gitignore must ignore convex/_generated/");
}

const envExample = readRepoText(".env.example");
if (!envExample.includes("CONVEX_URL")) {
  fail(".env.example must document CONVEX_URL");
}

finish("Phase 0 layout: OK", ["Next: npm run convex:dev:once  (then open Convex dashboard)"]);
