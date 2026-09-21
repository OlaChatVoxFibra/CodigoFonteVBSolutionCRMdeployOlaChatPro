#!/usr/bin/env node
/**
 * Build de produção sem cross-env (Vercel/Linux não têm devDependencies no PATH).
 */
const { spawnSync } = require("child_process");
const path = require("path");

process.env.CI = "false";
process.env.DISABLE_ESLINT_PLUGIN = "true";
process.env.NODE_OPTIONS = "--max-old-space-size=4096";

const root = path.join(__dirname, "..");
const cracoPkg = require.resolve("@craco/craco/package.json", { paths: [root] });
const cracoBin = path.join(path.dirname(cracoPkg), "dist", "bin", "craco.js");

const result = spawnSync(process.execPath, [cracoBin, "build"], {
  stdio: "inherit",
  env: process.env,
  cwd: root
});

process.exit(result.status === 0 ? 0 : result.status || 1);
