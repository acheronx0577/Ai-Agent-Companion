import fs from "node:fs";
import { resolveRepoPath } from "./repo_paths.mjs";

export function resolvePython() {
  const candidates = [
    resolveRepoPath("venv", "Scripts", "python.exe"),
    resolveRepoPath("venv", "bin", "python"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return "python";
}
