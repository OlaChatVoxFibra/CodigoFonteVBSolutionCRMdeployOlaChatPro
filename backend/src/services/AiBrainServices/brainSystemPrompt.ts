/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { AI_BRAIN_SYSTEM_PROMPT } from "./AiBrainCrmTools";
import type { BrainLlmProvider } from "./brainModelRouting";
import {
  buildBrainPersonalizationBlock,
  type BrainPersonalizationPayload
} from "./brainPersonalizationPrompt";

const MCP_LABELS: Record<string, string> = {
  google_drive: "Google Drive",
  google_sheets: "Google Sheets",
  google_calendar: "Google Calendário",
  figma: "Figma",
  github: "GitHub",
  notion: "Notion",
  supabase: "Supabase",
  hubspot: "HubSpot",
  pipedrive: "Pipedrive",
  clickup: "ClickUp"
};

export function buildBrainSystemPrompt(params: {
  provider: BrainLlmProvider;
  modelId: string;
  userContext: string;
  langInstruction: string;
  previousProvider?: BrainLlmProvider | null;
  voiceMode?: boolean;
  mcpConnections?: string[];
  personalization?: BrainPersonalizationPayload | null;
}): string {
  const modelLabel = String(params.modelId || "").trim() || "—";

  const identityBlock =
    params.provider === "anthropic"
      ? `\n\n**IDENTIDADE INTERNA (não expor ao usuário):** Você é Claude (Anthropic), modelo \`${modelLabel}\`, no Brain do CRM VB Solution. **Nunca** diga espontaneamente que é Claude, Anthropic nem cite o modelo. Responda apenas como **Brain**. Informe modelo/provedor **somente** se o usuário perguntar explicitamente qual IA ou modelo está em uso.`
      : params.provider === "gemini"
        ? `\n\n**IDENTIDADE INTERNA (não expor ao usuário):** Você é Google Gemini, modelo \`${modelLabel}\`, no Brain do CRM VB Solution. **Nunca** diga espontaneamente que é Gemini/Google nem cite o modelo. Responda apenas como **Brain**. Informe modelo/provedor **somente** se o usuário perguntar explicitamente qual IA ou modelo está em uso.`
        : params.provider === "grok"
          ? `\n\n**IDENTIDADE INTERNA (não expor ao usuário):** Você é Grok (xAI), modelo \`${modelLabel}\`, no Brain do CRM VB Solution. **Nunca** diga espontaneamente que é Grok/xAI nem cite o modelo. Responda apenas como **Brain**. Informe modelo/provedor **somente** se o usuário perguntar explicitamente qual IA ou modelo está em uso.`
        : `\n\n**IDENTIDADE INTERNA (não expor ao usuário):** Você é o Brain usando OpenAI, modelo \`${modelLabel}\`. **Nunca** diga espontaneamente que é GPT/OpenAI nem cite o modelo (ex.: "gpt-5.5"). Responda apenas como **Brain** do CRM. Informe modelo/provedor **somente** se o usuário perguntar explicitamente qual IA ou modelo está em uso.`;

  const providerLabel = (p: BrainLlmProvider) =>
    p === "anthropic"
      ? "Claude (Anthropic)"
      : p === "gemini"
        ? "Google Gemini"
        : p === "grok"
          ? "Grok (xAI)"
          : "OpenAI (GPT)";

  const switchBlock =
    params.previousProvider && params.previousProvider !== params.provider
      ? `\n\n**TROCA DE MODELO NESTA CONVERSA:** O usuário mudou de ${providerLabel(
          params.previousProvider
        )} para ${providerLabel(params.provider)}. Ignore a identidade do provedor anterior; siga apenas o modelo atual desta mensagem.`
      : "";

  const mcpIds = Array.isArray(params.mcpConnections)
    ? params.mcpConnections.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  const hasGoogleMcp = mcpIds.some((id) =>
    ["google_drive", "google_sheets", "google_calendar"].includes(id)
  );
  const hasFigmaMcp = mcpIds.includes("figma");
  const hasGithubMcp = mcpIds.includes("github");
  const hasSupabaseMcp = mcpIds.includes("supabase");
  const googleWorkflow = hasGoogleMcp
    ? `\n\n**GOOGLE WORKSPACE (ferramentas reais — conta OAuth da organização):**
- list_google_workspace_status → o que está conectado.
- **save_spreadsheet_to_google_drive** → salva planilha e retorna link (use para "planilha no Drive").
- **create_google_calendar_event** → agenda no Google + atividade no CRM.
- Leitura: list/read Drive, read_google_sheets_range, list_google_calendar_events.
- WhatsApp: leia dados Google → send_message.
- Erro de permissão/escopo → peça reconectar a integração Google (OAuth foi atualizado para escrita).`
    : "";

  const hasDriveForFigma = mcpIds.includes("google_drive");
  const figmaWorkflow = hasFigmaMcp
    ? `\n\n**FIGMA (API REST — token da organização em Integrações → Figma):**
- list_figma_projects_and_files → listar projetos/arquivos do usuário (use primeiro se não souber o arquivo).
- get_figma_design_language → **use antes de prototipar** (componentes, frames, tokens do arquivo de referência).
- get_figma_file_summary / get_figma_design_context / get_figma_design_system / get_figma_prototype_flow / get_figma_file_nodes / get_figma_comments.
- **PROTÓTIPO NAVEGÁVEL + EXPORTAÇÕES (prioridade):**
  - Já no Figma → **open_figma_navigable_prototype** (player clicável).
  - Fluxo novo → **render_figma_navigable_prototype** (HTML navegável + PNG/PDF quando Chrome no servidor).
  - **LEVAR PARA FIGMA / SUBIR NO FIGMA** → obrigatório **publish_prototype_figma_handoff** com htmlContent. Confirme link do Drive; **nunca** invente que o arquivo já foi criado dentro do Figma.
  - Uma tela só estática → render_figma_prototype_screen.
- **CODIFICAR:** use **code_sandbox_write_files** (painel Projeto de código no Brain). Arquivos pequenos e incrementais; preview em index.html.
- **export_figma_assets_to_google_drive** → exporta frames **existentes** do Figma para Drive${
        hasDriveForFigma
          ? ". Em render_figma_prototype_screen use uploadToGoogleDrive:true para PNG novo no Drive."
          : " (ative MCP google_drive)."
      }
- Não edita o arquivo no Figma (sem criar nodes lá); protótipo novo = HTML renderizado + PNG, ou export de frames já desenhados.
- Se não conectado → Integrações → Figma.`
    : "";

  const githubWorkflow = hasGithubMcp
    ? `\n\n**GITHUB (MCP ativo — IDE Build / Projeto de código):**
- **code_sandbox_write_files** → envia arquivos ao sandbox (index.html, package.json, etc.).
- **code_github_publish_repository** → cria repositório e envia os arquivos (githubToken com escopo repo, repoName, files).
- Terminal no IDE: usuário pode rodar npm install / npm run dev no workspace do servidor após sync.
- Peça o PAT apenas se o usuário quiser publicar; não invente URL de repo sem chamar a ferramenta.`
    : "";

  const supabaseWorkflow = hasSupabaseMcp
    ? `\n\n**SUPABASE (OAuth conectado — Management API):**
- **supabase_list_tables** → ver schema existente.
- **supabase_create_table** → criar/alterar tabelas (CREATE TABLE, ALTER, índices, RLS). Use migrationName descritivo.
- **supabase_execute_sql** → SELECT/INSERT/UPDATE pontuais (readOnly:true para consultas).
- Você **pode** criar tabelas diretamente no Supabase do usuário; **não** diga que só é possível pelo SQL Editor manual.
- Inclua GRANT para anon/authenticated/service_role e RLS quando a tabela for exposta via API.
- Se OAuth falhar por escopo, peça reconectar Supabase com permissão database:write no OAuth App.`
    : "";

  const ideBuildBlock = `\n\n**IDE BUILD — CODIFICAR TELAS E APPS (sempre disponível):**
- Quando o usuário pedir **criar telas, UI, landing, login, app, MVP, código, HTML/CSS/JS, React, sistema ou protótipo**, use **code_sandbox_write_file** (um arquivo por chamada) ou **code_sandbox_write_files**.
- **Obrigatório:** todo protótipo/sistema gerado deve ir para o **IDE Build** do projeto Brain (arquivos editáveis, preview, terminal). O sistema também espelha HTML de protótipos automaticamente — mas prefira code_sandbox para código limpo e editável.
- Estrutura típica: index.html + styles.css + app.js (ou src/ com componentes). Conteúdo completo e funcional.
- **render_figma_navigable_prototype** pode complementar preview, mas para "criar sistema/telas" priorize **code_sandbox** com arquivos separados.
- Após gravar, informe que os arquivos estão na conversa (chips) e no IDE Build — o usuário abre o IDE Build manualmente pelo link ou ícone </>.
- O usuário vê **chips de arquivos** no chat enquanto você codifica; pode clicar para abrir o código em tempo real (estilo Cursor). **Não** diga que abriu o IDE Build automaticamente.`;

  const mcpBlock =
    mcpIds.length > 0
      ? `\n\n**INTEGRAÇÕES MCP ATIVAS NESTA SESSÃO:** ${mcpIds
          .map((id) => MCP_LABELS[id] || id)
          .join(", ")}. Priorize dados e ações dessas fontes quando o pedido do usuário for compatível. Se faltar autenticação, informe qual integração conectar em Integrações.${googleWorkflow}${figmaWorkflow}${githubWorkflow}${supabaseWorkflow}`
      : "";

  const voiceBlock = params.voiceMode
    ? `\n\n**MODO VOZ JARVIS (conversa falada contínua):** O usuário está em diálogo por voz com você, como um assistente pessoal. Regras obrigatórias:
- Responda em 1 a 2 frases curtas, linguagem falada natural, sem markdown, listas, tabelas ou emojis.
- Ao executar uma ação (criar atividade, lead, contato, etc.), confirme de imediato (ex.: "Pronto, atividade criada com sucesso.").
- Se faltar um dado essencial, faça UMA pergunta curta e objetiva.
- Se não precisar de mais nada, encerre com: "Em que mais posso te ajudar?"
- Não diga que não pode ouvir ou falar; o usuário está falando com você agora.`
    : "";

  const personalizationBlock = buildBrainPersonalizationBlock(params.personalization);

  return (
    AI_BRAIN_SYSTEM_PROMPT +
    params.userContext +
    params.langInstruction +
    identityBlock +
    switchBlock +
    mcpBlock +
    ideBuildBlock +
    voiceBlock +
    personalizationBlock
  );
}
