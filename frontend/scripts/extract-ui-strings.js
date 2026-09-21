const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "../src");
const attrs = ["primary", "label", "title", "placeholder", "aria-label", "helperText"];
const attrRe = new RegExp(`(?:${attrs.join("|")})=["']([^"']{2,100})["']`, "g");
const found = new Set();

function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (file === "node_modules" || file === "translate") continue;
      walk(full);
      continue;
    }
    if (!/\.(js|jsx|tsx)$/.test(file)) continue;
    const content = fs.readFileSync(full, "utf8");
    let match;
    while ((match = attrRe.exec(content))) {
      const text = match[1].trim();
      if (/[À-ÿ]/.test(text) || /^(Salvar|Cancelar|Excluir|Editar|Adicionar|Buscar|Novo|Criar|Atividades|Projetos|Configura|Leads|Mais|Empresas|Inventário|Atendimento|Integrações|Automações|Campanhas|Agente)/.test(text)) {
        found.add(text);
      }
    }
  }
}

walk(root);
const arr = [...found].sort();
console.log("count", arr.length);
arr.forEach((s) => console.log(s));
