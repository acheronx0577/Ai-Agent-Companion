#!/usr/bin/env node
/** Check /voices/status matches current catalog (Daniela, no stale sharvard / device Spanish). */
const base = process.env.WAKU_BASE_URL || "http://127.0.0.1:5000";
const url = `${base.replace(/\/$/, "")}/voices/status`;

let failed = 0;

function fail(msg) {
  console.error(msg);
  failed += 1;
}

async function main() {
  let res;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (error) {
    fail(`Cannot reach ${url} — start npm run dev first. (${error.message})`);
    process.exit(1);
  }
  if (!res.ok) {
    fail(`/voices/status returned ${res.status}`);
    process.exit(1);
  }
  const data = await res.json();
  console.log(`voiceCatalogVersion: ${data.voiceCatalogVersion ?? "(missing — restart Flask)"}`);

  const piper = data.piperVoices || [];
  const device = data.browserVoiceMenu || [];

  const sharvard = piper.find((v) => String(v.id).includes("sharvard"));
  if (sharvard) {
    fail("Stale catalog: es_ES-sharvard-medium still in piperVoices. Restart npm run dev.");
  }

  const daniela = piper.find((v) => v.id === "es_AR-daniela-high");
  if (!daniela?.available) {
    fail("es_AR-daniela-high missing or not available. Run: npm run download:piper-voices");
  }

  const deviceSpanish = device.find((v) => v.lang === "es");
  if (deviceSpanish) {
    fail(
      `Spanish Device Voice still in browserVoiceMenu ("${deviceSpanish.label}"). `
        + "Restart npm run dev so Flask loads the latest piper_voices.py."
    );
  }

  console.log("\nPiper voices (dropdown — Piper voices group):");
  for (const v of piper.filter((x) => x.available)) {
    console.log(`  • ${v.label}`);
  }
  console.log("\nDevice voices (dropdown — Device voices group):");
  for (const v of device) {
    console.log(`  • ${v.label}`);
  }
  console.log("\nBrowser voices: auto-listed per language (no en/es/zh/vi when Piper installed).");

  if (failed > 0) {
    process.exit(1);
  }
  console.log("\nDropdown API: OK");
}

main();
