#!/usr/bin/env node
/** Check /voices/status: English Piper + English/Japanese device voices. */
import { resolveLocalServiceUrl } from "./lib/dev_url.mjs";

const serviceUrl = resolveLocalServiceUrl("/voices/status");

let failed = 0;

function fail(msg) {
  console.error(msg);
  failed += 1;
}

async function main() {
  const serviceUrl = resolveLocalServiceUrl("/voices/status");
  let res;
  try {
    // fallow-ignore-next-line security-sink
    res = await fetch(serviceUrl, { cache: "no-store" });
  } catch (error) {
    fail(`Cannot reach ${serviceUrl} — start npm run dev first. (${error.message})`);
    process.exit(1);
  }
  if (!res.ok) {
    fail(`/voices/status returned ${res.status}`);
    process.exit(1);
  }
  const data = await res.json();
  console.log(`voiceCatalogVersion: ${data.voiceCatalogVersion ?? "(missing)"}`);
  console.log(`piperAvailable: ${data.piperAvailable}`);

  const piper = data.piperVoices || [];
  const device = data.browserVoiceMenu || [];

  for (const lang of ["es", "ko", "zh", "vi"]) {
    if (piper.some((v) => v.lang === lang)) {
      fail(`Unexpected Piper voice for ${lang}`);
    }
    if (device.some((v) => v.lang === lang)) {
      fail(`Unexpected device voice for ${lang}`);
    }
  }

  const enPiper = piper.find((v) => v.id === "en_US-hfc_female-medium");
  if (!enPiper) {
    fail("Missing en_US-hfc_female-medium in catalog");
  }

  const deviceLangs = new Set(device.map((v) => v.lang));
  if (!deviceLangs.has("ja")) {
    fail(`Expected Japanese device voice, got: ${[...deviceLangs].join(", ")}`);
  }
  if (!deviceLangs.has("en")) {
    fail(`Expected English device voice, got: ${[...deviceLangs].join(", ")}`);
  }

  console.log("\nPiper voices:");
  for (const v of piper) {
    console.log(`  • ${v.label}${v.available ? "" : " (not installed)"}`);
  }
  console.log("\nDevice voices:");
  for (const v of device) {
    console.log(`  • ${v.label}`);
  }

  if (failed > 0) {
    process.exit(1);
  }
  console.log("\nDropdown API: OK");
}

main();
