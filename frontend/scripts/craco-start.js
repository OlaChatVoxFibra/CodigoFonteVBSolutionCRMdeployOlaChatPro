#!/usr/bin/env node
/**
 * Dev server via CRACO (Windows-safe, igual ao craco-build.js).
 */
const { spawnSync } = require("child_process");
const path = require("path");

process.env.DISABLE_ESLINT_PLUGIN = "true";
if (!process.env.PORT) process.env.PORT = "5181";

const root = path.join(__dirname, "..");
const cracoPkg = require.resolve("@craco/craco/package.json", { paths: [root] });
const cracoBin = path.join(path.dirname(cracoPkg), "dist", "bin", "craco.js");

const result = spawnSync(process.execPath, [cracoBin, "start"], {
  stdio: "inherit",
  env: process.env,
  cwd: root
});

process.exit(result.status === 0 ? 0 : result.status || 1);
