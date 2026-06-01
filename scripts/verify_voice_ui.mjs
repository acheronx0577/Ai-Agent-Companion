#!/usr/bin/env node
/** Static checks for voice combobox layout and Microsoft English voice filtering. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;

function requireIn(file, label, patterns) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  for (const pattern of patterns) {
    if (!text.includes(pattern)) {
      console.error(`${label}: missing ${JSON.stringify(pattern)}`);
      failed += 1;
    }
  }
}

function forbidIn(file, label, patterns) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  for (const pattern of patterns) {
    if (text.includes(pattern)) {
      console.error(`${label}: stale ${JSON.stringify(pattern)}`);
      failed += 1;
    }
  }
}

const guestCopy = "Sign in for daily trial messages.";

requireIn("static/app.js", "app.js", [
  "const GUEST_USAGE_METER_TEXT = ",
  guestCopy,
  "function isExcludedVoice(voice)",
  "normalizedName.includes('microsoft')",
  "normalizedLang.startsWith('en')",
  "voice.voiceURI",
]);
requireIn("templates/index.html", "index.html", [guestCopy]);
forbidIn("templates/index.html", "index.html", [
  "Sign in to chat and use your daily trial messages.",
]);
forbidIn("static/app.js", "app.js", [
  "Sign in to chat and use your daily trial messages.",
]);
requireIn("static/style.css", "style.css", [
  ".voice-select-trigger {",
  "grid-template-columns: 1.25rem minmax(0, 1fr) 1.25rem",
  ".voice-select-trigger-label",
  "text-align: center",
  "--vc-pip-max-height",
]);

if (failed > 0) process.exit(1);
console.log("Voice UI wiring: OK");
