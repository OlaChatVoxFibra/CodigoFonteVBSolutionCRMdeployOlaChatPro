/**
 * Garante Tailwind v4 + @tailwindcss/postcss (sem tailwind.config.js).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function fail(msg) {
  console.error(`\n[Tailwind check] ${msg}\n`);
  process.exit(1);
}

function ok(msg) {
  console.log(`[Tailwind check] ${msg}`);
}

require("./fix-node-modules.js");

const forbidden = [
  path.join(root, "tailwind.config.js"),
  path.join(root, "tailwind.config.ts"),
  path.join(root, "tailwind.config.cjs")
];
for (const file of forbidden) {
  if (fs.existsSync(file)) {
    fail(
      `${path.basename(file)} encontrado — remova-o. Tailwind v4 usa src/styles/tailwind.css (@source).`
    );
  }
}

if (fs.existsSync(path.join(root, "postcss.config.js"))) {
  fail("postcss.config.js encontrado — remova-o. PostCSS é configurado em craco.config.js.");
}

const required = [
  "@tailwindcss/postcss",
  "tailwindcss",
  "postcss",
  "postcss-flexbugs-fixes",
  "postcss-preset-env",
  "postcss-normalize"
];

for (const pkg of required) {
  if (!fs.existsSync(path.join(root, "node_modules", pkg, "package.json"))) {
    fail(`Pacote ausente: ${pkg}. Execute: npm install`);
  }
}

const craco = fs.readFileSync(path.join(root, "craco.config.js"), "utf8");
if (!craco.includes("applyTailwindV4Postcss") || !craco.includes("@tailwindcss/postcss")) {
  fail("craco.config.js deve aplicar @tailwindcss/postcss via applyTailwindV4Postcss().");
}

const tailwindCss = fs.readFileSync(path.join(root, "src", "styles", "tailwind.css"), "utf8");
if (!tailwindCss.includes('@import "tailwindcss"')) {
  fail('src/styles/tailwind.css deve conter @import "tailwindcss".');
}

const clsxMjs = path.join(root, "node_modules", "clsx", "dist", "clsx.m.js");
if (!fs.existsSync(clsxMjs)) {
  fail("clsx/dist/clsx.m.js ausente — execute: npm install");
}

ok("Tailwind v4 + PostCSS OK.");
