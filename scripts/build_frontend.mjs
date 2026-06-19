#!/usr/bin/env node
import { build } from "esbuild";

const shared = {
  bundle: true,
  format: "esm",
  minify: true,
  platform: "browser",
  target: ["es2022"],
  jsx: "automatic",
  jsxImportSource: "react",
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
  build({
    ...shared,
    entryPoints: ["frontend/landing_hero.jsx"],
    outfile: "static/landing_hero.js",
  }),
  build({
    bundle: true,
    format: "iife",
    minify: true,
    platform: "browser",
    target: ["es2022"],
    entryPoints: ["frontend/landing.js"],
    outfile: "static/landing.js",
  }),
]);

console.log("Local Convex frontend bundles built.");
