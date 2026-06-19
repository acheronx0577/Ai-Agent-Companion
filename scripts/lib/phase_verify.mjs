import { readRepoText } from "./repo_paths.mjs";

export function createPhaseVerifier() {
  let failed = 0;

  function requireIn(relPath, label, patterns) {
    const text = readRepoText(relPath);
    for (const pattern of patterns) {
      const ok = typeof pattern === "string" ? text.includes(pattern) : pattern.test(text);
      if (!ok) {
        console.error(`${label}: missing ${pattern}`);
        failed += 1;
      }
    }
  }

  function forbidIn(relPath, label, patterns) {
    const text = readRepoText(relPath);
    for (const pattern of patterns) {
      if (text.includes(pattern)) {
        console.error(`${label}: stale ${JSON.stringify(pattern)}`);
        failed += 1;
      }
    }
  }

  function finish(successMessage, extraMessages = []) {
    if (failed > 0) {
      process.exit(1);
    }
    console.log(successMessage);
    for (const message of extraMessages) {
      console.log(message);
    }
  }

  return {
    requireIn,
    forbidIn,
    finish,
    fail(message) {
      console.error(message);
      failed += 1;
    },
    get failed() {
      return failed;
    },
  };
}

export function runPhaseVerify(successMessage, checks, extraMessages = []) {
  const verifier = createPhaseVerifier();
  checks(verifier);
  verifier.finish(successMessage, extraMessages);
}
