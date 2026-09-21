const fs = require("fs");
const path = require("path");

const langDir = path.join(__dirname, "../src/translate/languages");

function loadLang(file) {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(path.join(langDir, file));
}

function flatten(obj, prefix = "") {
  const out = {};
  for (const key of Object.keys(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      Object.assign(out, flatten(val, next));
    } else if (typeof val === "string") {
      out[next] = val;
    }
  }
  return out;
}

const pt = flatten(loadLang("pt.js").messages.pt.translations);
const en = flatten(loadLang("en.js").messages.en.translations);
const es = flatten(loadLang("es.js").messages.es.translations);

const missingEn = Object.keys(pt).filter((k) => !en[k]);
const missingEs = Object.keys(pt).filter((k) => !es[k]);

console.log("Missing in EN:", missingEn.length);
console.log("Missing in ES:", missingEs.length);

function setNested(obj, keyPath, value) {
  const parts = keyPath.split(".");
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur[p] || typeof cur[p] !== "object") cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
}

function patchFile(filename, langCode, missingKeys, sourceFlat) {
  const filePath = path.join(langDir, filename);
  let content = fs.readFileSync(filePath, "utf8");
  let added = 0;

  for (const key of missingKeys) {
    const ptValue = sourceFlat[key];
    if (!ptValue) continue;
    const escaped = JSON.stringify(ptValue);
    const search = `${key.split(".").pop()}: `;
    if (content.includes(`${key.split(".").pop()}: ${escaped}`)) continue;

    const parts = key.split(".");
    const leaf = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1);

    // Find parent block and append leaf before closing brace
    let blockRegex;
    if (parentPath.length === 0) continue;

    const parentKey = parentPath[parentPath.length - 1];
    const re = new RegExp(`(${parentKey}:\\s*\\{[^}]*)(\\n\\s*\\})`, "s");
    const match = content.match(re);
    if (match && !match[1].includes(`${leaf}:`)) {
      const insertion = `${match[1]},\n          ${leaf}: ${escaped}${match[2]}`;
      content = content.replace(re, insertion);
      added++;
    }
  }

  if (added > 0) {
    fs.writeFileSync(filePath, content);
  }
  console.log(`${filename}: attempted patch, ${added} keys (manual review recommended)`);
}

// Export reverse map: pt value -> key (prefer mainDrawer/common paths)
const reverseMap = {};
const priorityPrefixes = [
  "mainDrawer.",
  "common.",
  "buttons.",
  "signup.",
  "login.",
];

for (const key of Object.keys(pt)) {
  const value = pt[key];
  if (!value || value.length > 120) continue;
  const current = reverseMap[value];
  if (!current) {
    reverseMap[value] = key;
    continue;
  }
  const newScore = priorityPrefixes.findIndex((p) => key.startsWith(p));
  const curScore = priorityPrefixes.findIndex((p) => current.startsWith(p));
  const newRank = newScore === -1 ? 999 : newScore;
  const curRank = curScore === -1 ? 999 : curScore;
  if (newRank < curRank) reverseMap[value] = key;
}

const out = path.join(__dirname, "../src/translate/reverseMap.generated.json");
fs.writeFileSync(out, JSON.stringify(reverseMap, null, 2));
console.log("Wrote reverse map with", Object.keys(reverseMap).length, "entries");
