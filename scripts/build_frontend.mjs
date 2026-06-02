#!/usr/bin/env node
import { build } from "esbuild";

const shared = {
  bundle: true,
  format: "esm",
  minify: true,
  platform: "browser",
  target: ["es2022"],
};

await Promise.all([
  build({
    ...shared,
    entryPoints: ["frontend/convex_bridge.jsx"],
    outfile: "static/convex_bridge.js",
  }),
  build({
    ...shared,
    entryPoints: ["frontend/convex_auth_test.jsx"],
    outfile: "static/convex_auth_test.js",
  }),
]);

console.log("Local Convex frontend bundles built.");
