#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { getRepoRoot } from "./lib/repo_paths.mjs";
import { resolvePython } from "./lib/dev_python.mjs";

const fix = process.argv.includes("--fix");
const py = resolvePython();
const exclude = ["--exclude", "venv,.git,node_modules,convex/_generated"];

const checkArgs = ["-m", "ruff", "check", ".", ...exclude];
if (fix) {
  checkArgs.push("--fix");
}
execFileSync(py, checkArgs, { cwd: getRepoRoot(), stdio: "inherit" });

const formatArgs = fix
  ? ["-m", "ruff", "format", "."]
  : ["-m", "ruff", "format", "--check", "."];
execFileSync(py, formatArgs, { cwd: getRepoRoot(), stdio: "inherit" });
