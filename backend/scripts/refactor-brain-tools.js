const fs = require("fs");
const p = "src/services/AiBrainServices/AiBrainChatService.ts";
const lines = fs.readFileSync(p, "utf8").split(/\r?\n/);

const crmImport =
  'import { CRM_TOOLS, executeAiBrainCrmTool, AI_BRAIN_SYSTEM_PROMPT } from "./AiBrainCrmTools";';
const anthropicImports = [
  'import { isClaudeModelId } from "../../providers/anthropic/utils/isClaudeModel";',
  'import { anthropicBrainChat } from "../../providers/anthropic/brain/AnthropicBrainChatService";'
];

const part1 = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith("const CRM_TOOLS")) break;
  if (i === 42 && !part1.includes(crmImport)) {
    part1.push(crmImport);
    part1.push("");
  }
  part1.push(line);
}

let i = lines.findIndex((l) => l.startsWith("const CRM_TOOLS"));
while (i < lines.length && !lines[i].startsWith("interface Attachment")) {
  i++;
}
const part2 = lines.slice(i).filter((l) => !l.startsWith("const SYSTEM_PROMPT"));

let out = [...part1, ...part2].join("\n");
if (!out.includes("isClaudeModelId")) {
  const idx = out.indexOf(crmImport);
  out =
    out.slice(0, idx + crmImport.length) +
    "\n" +
    anthropicImports.join("\n") +
    out.slice(idx + crmImport.length);
}

out = out.replace(/\bSYSTEM_PROMPT\b/g, "AI_BRAIN_SYSTEM_PROMPT");
out = out.replace(/\bexecuteTool\(/g, "executeAiBrainCrmTool(");

if (!out.includes("isClaudeModelId(preModel)")) {
  out = out.replace(
    "export async function aiBrainChat(params: ChatParams): Promise<ChatResult> {",
    `export async function aiBrainChat(params: ChatParams): Promise<ChatResult> {
  const preModel = params.model || "gpt-5.5";
  if (isClaudeModelId(preModel)) {
    return anthropicBrainChat(params) as any;
  }`
  );
}

fs.writeFileSync(p, out);
console.log("ok", out.split("\n").length, "lines");
