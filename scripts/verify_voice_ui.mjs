#!/usr/bin/env node
/** Static checks for voice combobox layout and Microsoft English voice preference. */
import { createPhaseVerifier } from "./lib/phase_verify.mjs";

const { requireIn, forbidIn, finish } = createPhaseVerifier();
const guestCopy = "Sign in for daily trial messages.";

requireIn("static/app.js", "app.js", [
  "const GUEST_USAGE_METER_TEXT = ",
  guestCopy,
  "function isExcludedVoice(voice)",
  "function isMicrosoftVoice(voice)",
  "microsoftVoices.length ? microsoftVoices : matches",
  "const VOICE_PREFERENCE_VERSION = 5;",
  "const DEFAULT_DEVICE_VOICE_LANG = 'en';",
  "const DEFAULT_DEVICE_VOICE_LABEL_HINT = 'microsoft english';",
  "browserMenuEntryMatchesDefaultDeviceVoice",
  "voice.voiceURI",
  "piperCatalogVoices",
  "piperVoices",
  "getSelectedPiperVoiceId",
]);
requireIn("wakuwaku/piper_voices.py", "wakuwaku/piper_voices.py", [
  "en_US-hfc_female-medium",
  "DEVICE_LANGS_ALWAYS",
  "Japanese Device Voice",
  "Microsoft English Device Voice",
]);
forbidIn("wakuwaku/piper_voices.py", "wakuwaku/piper_voices.py", [
  "es_AR-daniela-high",
  "zh_CN-huayan-medium",
  "vi_VN-25hours_single-low",
  "Korean Device Voice",
  "Spanish Device Voice",
  "Chinese Device Voice",
  "Vietnamese Device Voice",
]);
requireIn("app.py", "app.py", [
  '_payload_string(payload, "voice")',
  "piperVoices",
  "browserVoiceMenu",
  "list_piper_voice_menu",
]);
requireIn("wakuwaku/piper_voices.py", "wakuwaku/piper_voices.py", [
  "BROWSER_VOICE_MENU",
  "list_browser_voice_menu",
  "list_piper_voice_menu",
  "voice_availability",
  "_evict_loaded_voices",
  "PIPER_MAX_LOADED_VOICES",
]);
requireIn("static/app.js", "app.js", [
  "PIPER_STATUS_TTL_MS",
  "fetchPiperStatus",
  "voice-select-group-label",
  "buildVoiceListboxSignature",
  "aria-activedescendant",
]);
requireIn("static/style.css", "style.css", [
  ".voice-select-group-label",
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

finish("Voice UI wiring: OK");
