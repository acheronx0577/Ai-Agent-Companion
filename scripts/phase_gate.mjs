#!/usr/bin/env node
/**
 * Pre-commit phase gate: audit → verify → optimize checks (automated verify slice).
 * Usage: node scripts/phase_gate.mjs [phaseNumber]
 *   npm run phase:gate -- 0
 */
import { execFileSync } from "node:child_process";
import { readRepoText, repoPathExists } from "./lib/repo_paths.mjs";
import { resolvePython } from "./lib/dev_python.mjs";
import { runNpmScript, runNpx } from "./lib/run_npm.mjs";

const phase = Number.parseInt(process.argv[2] ?? "0", 10);
const UI_PHASES = new Set([5, 7]);
const A11Y_BASELINE_MAX_PHASE = 4;
const python = resolvePython();

function run(label, runner, { optional = false } = {}) {
  process.stdout.write(`\n▶ ${label}\n`);
  try {
    runner();
    process.stdout.write(`✔ ${label}\n`);
    return true;
  } catch (error) {
    if (optional) {
      process.stdout.write(`⚠ ${label} (optional, skipped/failed)\n`);
      return true;
    }
    process.stderr.write(`✖ ${label} failed\n`);
    throw error;
  }
}

function checkCleanup() {
  const problems = [];
  const gitignore = readRepoText(".gitignore");

  if (!gitignore.includes("convex/_generated/")) {
    problems.push(".gitignore must list convex/_generated/");
  }
  if (!gitignore.includes(".env.local")) {
    problems.push(".gitignore must list .env.local");
  }

  const stale = [".env.railway.example", "RAILWAY.md", "railway.json", "nixpacks.toml"];
  for (const rel of stale) {
    if (repoPathExists(rel)) {
      problems.push(`Remove stale file: ${rel}`);
    }
  }

  if (problems.length) {
    console.error("\nCleanup check failed:");
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }
  console.log("\n✔ Cleanup check (no stale deploy files, gitignore OK)");
}

console.log(`Phase gate — phase ${phase} (UI-heavy: ${UI_PHASES.has(phase)})`);

if (phase >= 5) {
  try {
    run("Convex deploy (once, before tests)", () => runNpmScript("convex:dev:once"));
  } catch {
    process.stdout.write(
      "⚠ Convex deploy skipped (local `convex dev` already running on :3210)\n",
    );
  }
}

run("Python lint (ruff)", () => runNpmScript("lint"));

const unittestModules = [
  "tests.test_serve",
  "tests.test_deploy",
  "tests.test_convex_phase0",
];
if (phase >= 1) unittestModules.push("tests.test_convex_phase1");
if (phase >= 2) unittestModules.push("tests.test_convex_phase2");
if (phase >= 3) unittestModules.push("tests.test_convex_phase3");
if (phase >= 4) unittestModules.push("tests.test_convex_phase4");
if (phase >= 5) unittestModules.push("tests.test_convex_phase5");
if (phase >= 6) unittestModules.push("tests.test_convex_phase6");

run("Deploy + Convex tests", () => {
  execFileSync(python, ["-m", "unittest", ...unittestModules, "-v"], {
    stdio: "inherit",
    env: process.env,
  });
});

if (phase === 0) {
  run("Convex Phase 0 layout", () => runNpmScript("test:convex-phase0"));
  run("Convex deploy (once)", () => runNpmScript("convex:dev:once"));
  run("Convex bootstrapPing", () => runNpx(["convex", "run", "users:bootstrapPing"]));
} else if (phase === 1) {
  run("Convex Phase 1 schema layout", () => runNpmScript("test:convex-phase1"));
  run("Convex deploy (once)", () => runNpmScript("convex:dev:once"));
  run("Convex phase1Status", () => runNpx(["convex", "run", "schemaInfo:phase1Status"]));
} else if (phase === 2) {
  run("Convex Phase 2 auth layout", () => runNpmScript("test:convex-phase2"));
  run("Convex deploy (once)", () => runNpmScript("convex:dev:once"));
  run("Convex phase2Status", () => runNpx(["convex", "run", "authInfo:phase2Status"]));
} else if (phase === 3) {
  run("Convex Phase 3 user sync layout", () => runNpmScript("test:convex-phase3"));
  run("Convex deploy (once)", () => runNpmScript("convex:dev:once"));
  run("Convex phase3Status", () => runNpx(["convex", "run", "usersInfo:phase3Status"]));
  run("Convex bootstrapPing (phase 3)", () => runNpx(["convex", "run", "users:bootstrapPing"]));
} else if (phase === 4) {
  run("Convex Phase 4 usage layout", () => runNpmScript("test:convex-phase4"));
  run("Convex deploy (once)", () => runNpmScript("convex:dev:once"));
  run("Convex phase4Status", () => runNpx(["convex", "run", "usageInfo:phase4Status"]));
  run(
    "Convex daily limit check (10 used)",
    () => runNpx(["convex", "run", "usage:checkDailyLimit", '{"used": 10}']),
  );
  run("Convex guest usage status", () => runNpx(["convex", "run", "usage:status"]));
} else if (phase === 5) {
  run("Convex Phase 5 frontend layout", () => runNpmScript("test:convex-phase5"));
  run("Convex phase5Status", () => runNpx(["convex", "run", "frontendInfo:phase5Status"]));
} else if (phase === 6) {
  run("Convex Phase 6 chat bridge layout", () => runNpmScript("test:convex-phase6"));
  run("Convex phase6Status", () => runNpx(["convex", "run", "chatBridgeInfo:phase6Status"]));
}

if (UI_PHASES.has(phase) || phase <= A11Y_BASELINE_MAX_PHASE) {
  run("Message word limits (100 cap)", () => runNpmScript("test:message-limits"));
  run("Voice UI wiring", () => runNpmScript("test:voice-ui"));
  const label = UI_PHASES.has(phase)
    ? "Playwright accessibility (required)"
    : "Playwright accessibility (Design Pro baseline)";
  run(label, () => runNpmScript("test:a11y"));
}

checkCleanup();

console.log(`\n✅ Gate passed (level ${phase}). See docs/PHASE_GATE.md.\n`);
