const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "../src");
const attrs = ["primary", "label", "title", "placeholder", "aria-label", "helperText"];
const attrRe = new RegExp(`(?:${attrs.join("|")})=["']([^"']{2,100})["']`, "g");
const found = new Set();

const manual = [
  "Leads e Vendas",
  "Atividades",
  "Projetos",
  "Mais",
  "Empresas",
  "Inventário",
  "Atendimento",
  "Filas & Chatbot",
  "Respostas Rápidas",
  "Agente IA",
  "Integrações",
  "Automações",
  "Configurações",
  "Início",
  "Email",
  "Dashboard",
  "Português",
  "English",
  "Spanish",
  "عربي",
  "Salvar",
  "Cancelar",
  "Excluir",
  "Editar",
  "Adicionar",
  "Buscar",
  "Novo",
  "Criar",
  "Fechar",
  "Confirmar",
  "Voltar",
  "Próximo",
  "Anterior",
  "Sim",
  "Não",
  "Carregando...",
  "Nenhum resultado encontrado",
  "Selecione",
  "Todos",
  "Ativo",
  "Inativo",
  "Pendente",
  "Concluído",
  "Em andamento",
  "Atrasado",
  "Hoje",
  "Ontem",
  "Amanhã",
  "Semana",
  "Mês",
  "Ano",
  "Filtros",
  "Exportar",
  "Importar",
  "Atualizar",
  "Limpar",
  "Aplicar",
  "Detalhes",
  "Ações",
  "Status",
  "Nome",
  "Descrição",
  "Data",
  "Hora",
  "Valor",
  "Total",
  "Quantidade",
  "Categoria",
  "Prioridade",
  "Responsável",
  "Observações",
  "Telefone",
  "E-mail",
  "Endereço",
  "Cidade",
  "Estado",
  "País",
  "CEP",
  "Senha",
  "Usuário",
  "Perfil",
  "Sair",
  "Ajuda",
  "Notificações",
  "Mensagens",
  "Contatos",
  "Calendário",
  "Relatórios",
  "Campanhas",
  "Conexões",
  "Filas",
  "Tags",
  "Arquivos",
  "Tarefas",
  "Projetos",
  "Leads",
  "Vendas",
  "Funil",
  "Pipeline",
  "Negócio",
  "Negócios",
  "Produto",
  "Produtos",
  "Cliente",
  "Clientes",
  "Fornecedor",
  "Fornecedores",
  "Estoque",
  "Inventário",
  "Pagamento",
  "Assinatura",
  "Plano",
  "Planos",
  "Fatura",
  "Faturas",
  "Configuração",
  "Configurações",
  "Integração",
  "Integrações",
  "Automação",
  "Automações",
  "Agente",
  "Agente IA",
  "Prompt",
  "Fluxo",
  "Fluxos",
  "Chatbot",
  "WhatsApp",
  "Atendimento",
  "Ticket",
  "Tickets",
  "Fila",
  "Filas",
  "Resposta rápida",
  "Respostas rápidas",
  "Informativo",
  "Informativos",
  "Aniversário",
  "Aniversários",
  "Usuários",
  "Empresas",
  "Administração",
  "Financeiro",
  "Kanban",
  "Agenda",
  "Programação",
  "Histórico",
  "Chamadas",
  "API",
  "Webhook",
  "Webhooks",
  "Modelo",
  "Modelos",
  "Template",
  "Templates",
  "Mídia",
  "Mídias",
  "Áudio",
  "Vídeo",
  "Imagem",
  "Documento",
  "Link",
  "Enviar",
  "Receber",
  "Responder",
  "Encaminhar",
  "Transferir",
  "Finalizar",
  "Reabrir",
  "Aceitar",
  "Recusar",
  "Aguardando",
  "Em atendimento",
  "Resolvido",
  "Fechado",
  "Aberto",
  "Online",
  "Offline",
  "Conectado",
  "Desconectado",
  "Sincronizando",
  "Erro",
  "Sucesso",
  "Aviso",
  "Informação",
  "Obrigatório",
  "Opcional",
  "Público",
  "Privado",
  "Compartilhar",
  "Copiar",
  "Colar",
  "Duplicar",
  "Renomear",
  "Mover",
  "Arquivar",
  "Restaurar",
  "Visualizar",
  "Ocultar",
  "Expandir",
  "Recolher",
  "Mais opções",
  "Ver mais",
  "Ver menos",
  "Carregar mais",
  "Página anterior",
  "Próxima página",
  "Primeira página",
  "Última página",
  "de",
  "itens",
  "item",
  "página",
  "páginas",
  "resultado",
  "resultados",
  "encontrado",
  "encontrados",
  "selecionado",
  "selecionados",
  "todos os",
  "nenhum",
  "nenhuma",
  "vazio",
  "lista vazia",
  "sem dados",
  "carregando dados",
  "erro ao carregar",
  "tente novamente",
  "operação realizada com sucesso",
  "erro ao salvar",
  "erro ao excluir",
  "tem certeza",
  "esta ação não pode ser desfeita",
  "deseja continuar",
  "deseja excluir",
  "deseja salvar",
  "alterações não salvas",
  "descartar alterações",
  "manter alterações",
];

manual.forEach((s) => found.add(s));

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
      if (/[À-ÿ]/.test(text) || manual.some((m) => text.includes(m.split(" ")[0]))) {
        found.add(text);
      }
    }
  }
}

walk(root);

// Pull strings from pt.js translation values for common UI
const ptFile = fs.readFileSync(path.join(__dirname, "../src/translate/languages/pt.js"), "utf8");
const strRe = /:\s*"([^"\\]{2,80})"/g;
let m;
while ((m = strRe.exec(ptFile))) {
  const text = m[1];
  if (/[À-ÿ]/.test(text) && !text.includes("${") && !text.includes("http")) {
    found.add(text);
  }
}

const sorted = [...found].sort((a, b) => b.length - a.length);

function slugify(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase()
    .slice(0, 60);
}

const lines = [
  "// Auto-generated UI strings dictionary. Do not edit manually — run: node scripts/build-ui-strings.js",
  "export const UI_STRINGS = {",
];

for (const pt of sorted) {
  const key = slugify(pt) || "text";
  lines.push(`  ${JSON.stringify(pt)}: { pt: ${JSON.stringify(pt)}, en: null, es: null, ar: null },`);
}

lines.push("};");
lines.push("");
lines.push("export default UI_STRINGS;");

const outPath = path.join(__dirname, "../src/translate/uiStrings.generated.js");
fs.writeFileSync(outPath, lines.join("\n"));
console.log("Wrote", sorted.length, "entries to", outPath);
