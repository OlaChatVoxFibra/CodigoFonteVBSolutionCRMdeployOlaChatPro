#!/usr/bin/env node
/**
 * Corrige clsx (mjs) e remove tailwind.config.js conflitante com Tailwind v4.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const tailwindConfigs = [
  "tailwind.config.js",
  "tailwind.config.ts",
  "tailwind.config.cjs",
  "tailwind.config.mjs"
];

for (const name of tailwindConfigs) {
  const file = path.join(root, name);
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`[fix-node-modules] removido ${name} (conflita com Tailwind v4 + @tailwindcss/postcss)`);
  }
}

const clsxDist = path.join(root, "node_modules", "clsx", "dist");
const clsxMjs = path.join(clsxDist, "clsx.mjs");
const clsxMjsSource = path.join(clsxDist, "clsx.m.js");

if (fs.existsSync(clsxMjsSource) && !fs.existsSync(clsxMjs)) {
  fs.copyFileSync(clsxMjsSource, clsxMjs);
  console.log("[fix-node-modules] criado clsx/dist/clsx.mjs a partir de clsx.m.js");
}

console.log("[fix-node-modules] OK");
