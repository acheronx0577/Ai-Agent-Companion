#!/usr/bin/env node
/** Ensures 100-word message cap is wired in template, client, and server. */
import { runPhaseVerify } from "./lib/phase_verify.mjs";

runPhaseVerify("Message word limits: OK", ({ requireIn }) => {
  requireIn("wakuwaku/message_limits.py", "wakuwaku/message_limits.py", ["MAX_MESSAGE_WORDS = 100"]);
  requireIn("static/app.js", "app.js", ["const MAX_MESSAGE_WORDS = 100", "truncateToWordLimit"]);
  requireIn("templates/index.html", "index.html", [
    'id="message-word-hint"',
    "0 / 100 words",
    "aria-describedby=\"message-word-hint\"",
  ]);
  requireIn("app.py", "app.py", ["message_exceeds_word_limit", "messageTooLong"]);
});
