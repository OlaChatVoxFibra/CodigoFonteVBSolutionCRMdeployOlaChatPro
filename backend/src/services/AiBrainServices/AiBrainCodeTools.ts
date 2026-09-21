/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import type OpenAI from "openai";
import { streamAndPersistCodeFiles } from "./brainCodeStreamService";

export interface BrainCodeToolContext {
  companyId: number;
  userId: number;
  brainProjectId?: number;
}

export const BRAIN_CODE_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "code_sandbox_write_file",
      description:
        "Grava UM arquivo no IDE Build do projeto Brain (use várias chamadas para vários arquivos — o usuário vê cada arquivo sendo criado em tempo real). Preferível a enviar tudo de uma vez quando são muitos arquivos grandes.",
      parameters: {
        type: "object",
        properties: {
          projectTitle: { type: "string", description: "Nome do projeto IDE" },
          path: { type: "string", description: "Ex: index.html, styles.css, src/App.tsx" },
          content: { type: "string", description: "Conteúdo completo do arquivo" },
          openPreview: {
            type: "boolean",
            description: "Se true e for index.html, sugere abrir preview"
          }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "code_sandbox_write_files",
      description:
        "Grava vários arquivos de uma vez no IDE Build (index.html, CSS, JS, React, etc.). Os arquivos aparecem no painel IDE Build e ficam salvos no projeto Brain para editar, preview e terminal.",
      parameters: {
        type: "object",
        properties: {
          projectTitle: { type: "string", description: "Nome do projeto" },
          files: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: { type: "string", description: "Ex: index.html, src/App.tsx" },
                content: { type: "string" }
              },
              required: ["path", "content"]
            }
          },
          openPreview: {
            type: "boolean",
            description: "Se true, abre preview do index.html automaticamente"
          }
        },
        required: ["projectTitle", "files"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "code_sandbox_list_files",
      description: "Lista arquivos já enviados ao sandbox nesta sessão (metadados do pedido).",
      parameters: {
        type: "object",
        properties: {
          projectTitle: { type: "string" }
        }
      }
    }
  }
];

export function filterBrainCodeTools(): OpenAI.Chat.Completions.ChatCompletionTool[] {
  return BRAIN_CODE_TOOLS;
}

function normalizeFileList(files: unknown): Array<{ path: string; content: string }> {
  if (!Array.isArray(files)) return [];
  return files
    .map((f: any) => ({
      path: String(f?.path || "").replace(/^\/+/, ""),
      content: String(f?.content ?? "")
    }))
    .filter((f) => f.path);
}

function buildCodeFileData(
  normalized: Array<{ path: string; content: string }>,
  args: Record<string, unknown>,
  workspaceId?: number
) {
  return {
    success: true,
    message: `${normalized.length} arquivo(s) gravados no IDE Build.`,
    fileData: {
      type: "code_workspace" as const,
      title: String(args.projectTitle || "Projeto de código").trim(),
      content: "",
      files: normalized,
      openPreview: args.openPreview !== false,
      workspaceId
    },
    instruction:
      "Confirme que os arquivos estão no IDE Build. O usuário pode editar, preview, terminal local e publicar no GitHub."
  };
}

export async function executeAiBrainCodeTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx?: BrainCodeToolContext
): Promise<string | null> {
  if (toolName === "code_sandbox_write_file") {
    const path = String(args.path || "").replace(/^\/+/, "");
    const content = String(args.content ?? "");
    if (!path) {
      return JSON.stringify({ success: false, error: "Informe path do arquivo." });
    }

    const normalized = [{ path, content }];
    let workspaceId: number | undefined;

    if (ctx?.brainProjectId && ctx.companyId && ctx.userId) {
      try {
        const saved = await streamAndPersistCodeFiles({
          companyId: ctx.companyId,
          userId: ctx.userId,
          brainProjectId: ctx.brainProjectId,
          files: normalized,
          title: String(args.projectTitle || "").trim() || undefined
        });
        workspaceId = saved.workspaceId;
      } catch (e: any) {
        return JSON.stringify({
          success: false,
          error: e?.message || "Falha ao salvar no IDE Build."
        });
      }
    }

    return JSON.stringify(buildCodeFileData(normalized, args, workspaceId));
  }

  if (toolName === "code_sandbox_write_files") {
    const normalized = normalizeFileList(args.files);
    if (!normalized.length) {
      return JSON.stringify({ success: false, error: "Informe ao menos um arquivo." });
    }

    let workspaceId: number | undefined;
    if (ctx?.brainProjectId && ctx.companyId && ctx.userId) {
      try {
        const saved = await streamAndPersistCodeFiles({
          companyId: ctx.companyId,
          userId: ctx.userId,
          brainProjectId: ctx.brainProjectId,
          files: normalized,
          title: String(args.projectTitle || "").trim() || undefined
        });
        workspaceId = saved.workspaceId;
      } catch (e: any) {
        return JSON.stringify({
          success: false,
          error: e?.message || "Falha ao salvar no IDE Build."
        });
      }
    }

    return JSON.stringify(buildCodeFileData(normalized, args, workspaceId));
  }

  if (toolName === "code_sandbox_list_files") {
    return JSON.stringify({
      success: true,
      message:
        "Use code_sandbox_write_file (um arquivo) ou code_sandbox_write_files (vários) para gravar no IDE Build.",
      projectTitle: args.projectTitle || null
    });
  }

  return null;
}
