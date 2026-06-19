// fallow-ignore-file security-sink
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function getRepoRoot() {
  return REPO_ROOT;
}

export function resolveRepoPath(...segments) {
  const joined = path.join(...segments);
  if (joined.includes("..")) {
    throw new Error(`Unsafe repo path: ${joined}`);
  }
  const resolved = path.resolve(REPO_ROOT, joined);
  const relative = path.relative(REPO_ROOT, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes repo root: ${joined}`);
  }
  return resolved;
}

export function readRepoText(...segments) {
  return fs.readFileSync(resolveRepoPath(...segments), "utf8");
}

export function readRepoJson(...segments) {
  return JSON.parse(readRepoText(...segments));
}

export function repoPathExists(...segments) {
  return fs.existsSync(resolveRepoPath(...segments));
}
