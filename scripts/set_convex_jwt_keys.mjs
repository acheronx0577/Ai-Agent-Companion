#!/usr/bin/env node
/** Generate and set JWT_PRIVATE_KEY + JWKS for Convex Auth on Windows/Unix safely using -- */
import { exportJWK, exportPKCS8, generateKeyPair } from "jose";
import { convexEnvSet } from "./lib/convex_env.mjs";

const useProd = process.argv.includes("--prod");

async function main() {
  const keys = await generateKeyPair("RS256", { extractable: true });
  const privateKey = await exportPKCS8(keys.privateKey);
  const publicKey = await exportJWK(keys.publicKey);
  const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });
  const pemFormatted = privateKey.trimEnd().replace(/\n/g, " ");
  const target = useProd ? "production" : "development";

  try {
    console.log(`Setting JWT_PRIVATE_KEY on Convex ${target}...`);
    convexEnvSet("JWT_PRIVATE_KEY", pemFormatted, { prod: useProd });
    console.log(`Setting JWKS on Convex ${target}...`);
    convexEnvSet("JWKS", jwks, { prod: useProd });
    console.log("Convex JWT_PRIVATE_KEY and JWKS set successfully!");
  } catch (error) {
    console.error("Failed to set Convex environment variables:", error);
    process.exit(1);
  }
}

main();
