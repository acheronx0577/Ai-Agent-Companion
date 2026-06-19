// fallow-ignore-file security-sink
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRepoRoot } from "./repo_paths.mjs";

const require = createRequire(import.meta.url);
const npmRoot = path.dirname(require.resolve("npm/package.json"));
const npmCli = path.join(npmRoot, "bin", "npm-cli.js");
const npxCli = path.join(npmRoot, "bin", "npx-cli.js");

export function runNpmScript(script, env = process.env) {
  execFileSync(process.execPath, [npmCli, "run", script], {
    cwd: getRepoRoot(),
    stdio: "inherit",
    env,
  });
}

export function runNpx(args, env = process.env) {
  execFileSync(process.execPath, [npxCli, ...args], {
    cwd: getRepoRoot(),
    stdio: "inherit",
    env,
  });
}
