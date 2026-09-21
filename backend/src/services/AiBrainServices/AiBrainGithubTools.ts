/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import type OpenAI from "openai";
import axios from "axios";
import { publishBrainProjectToGithub } from "./brainGithubPublishService";
import {
  getGithubIntegrationPublic,
  listOrgGithubRepos,
  readGithubRepoFile
} from "../GithubServices/GithubIntegrationService";
import { githubApiHeaders } from "../GithubServices/githubOAuthService";

export const GITHUB_MCP_ID = "github";

export const BRAIN_GITHUB_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_github_integration_status",
      description:
        "Verifica se o GitHub da organização está conectado e quais recursos estão habilitados (Brain, publish, leitura de repos).",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "list_github_repositories",
      description:
        "Lista repositórios GitHub acessíveis pela integração da organização.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "read_github_repository_file",
      description:
        "Lê o conteúdo de um arquivo em um repositório GitHub (owner/repo).",
      parameters: {
        type: "object",
        properties: {
          repoFullName: {
            type: "string",
            description: "Nome completo owner/repo (ex: minha-org/meu-app)"
          },
          path: { type: "string", description: "Caminho do arquivo no repo" },
          ref: { type: "string", description: "Branch ou commit (opcional)" }
        },
        required: ["repoFullName", "path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_github_pull_requests",
      description:
        "Lista pull requests abertas (ou recentes) de um repositório GitHub.",
      parameters: {
        type: "object",
        properties: {
          repoFullName: { type: "string" },
          state: {
            type: "string",
            enum: ["open", "closed", "all"],
            default: "open"
          },
          limit: { type: "number", default: 10 }
        },
        required: ["repoFullName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "code_github_publish_repository",
      description:
        "Publica arquivos de código no GitHub (novo repositório ou existente). Usa a integração GitHub da organização.",
      parameters: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["new", "existing"],
            description: "new = criar repo; existing = enviar para repo existente"
          },
          repoName: { type: "string", description: "Nome do novo repositório" },
          repoFullName: {
            type: "string",
            description: "owner/repo quando mode=existing"
          },
          description: { type: "string" },
          isPrivate: { type: "boolean", default: true },
          files: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: { type: "string" },
                content: { type: "string" }
              },
              required: ["path", "content"]
            }
          }
        },
        required: ["files"]
      }
    }
  }
];

export function filterGithubToolsForMcp(
  mcpConnections?: string[]
): OpenAI.Chat.Completions.ChatCompletionTool[] {
  if (!mcpConnections?.includes(GITHUB_MCP_ID)) return [];
  return BRAIN_GITHUB_TOOLS;
}

async function listGithubPullRequests(params: {
  companyId: number;
  repoFullName: string;
  state?: string;
  limit?: number;
}): Promise<
  Array<{
    number: number;
    title: string;
    state: string;
    htmlUrl: string;
    user?: string;
    createdAt: string;
  }>
> {
  const integration = await getGithubIntegrationPublic(params.companyId);
  if (integration.status !== "connected") {
    throw new Error("GitHub não configurado para esta organização.");
  }

  const { getOrgGithubAccessToken } = await import(
    "../GithubServices/GithubIntegrationService"
  );
  const token = await getOrgGithubAccessToken(params.companyId);
  if (!token) throw new Error("Token GitHub indisponível.");

  const full = String(params.repoFullName || "").trim();
  const slash = full.indexOf("/");
  if (slash <= 0) throw new Error("Repositório inválido.");
  const owner = full.slice(0, slash);
  const repo = full.slice(slash + 1);

  const res = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/pulls`,
    {
      headers: githubApiHeaders(token),
      params: {
        state: params.state || "open",
        per_page: Math.min(30, Math.max(1, params.limit || 10)),
        sort: "updated",
        direction: "desc"
      },
      timeout: 25000
    }
  );

  const batch = Array.isArray(res.data) ? res.data : [];
  return batch.map((pr: any) => ({
    number: Number(pr.number),
    title: String(pr.title || ""),
    state: String(pr.state || ""),
    htmlUrl: String(pr.html_url || ""),
    user: pr.user?.login ? String(pr.user.login) : undefined,
    createdAt: String(pr.created_at || "")
  }));
}

export async function executeAiBrainGithubTool(
  toolName: string,
  args: Record<string, unknown>,
  companyId: number,
  userId: number
): Promise<string | null> {
  if (toolName === "list_github_integration_status") {
    const data = await getGithubIntegrationPublic(companyId);
    return JSON.stringify({
      connected: data.status === "connected",
      status: data.status,
      authType: data.authType,
      account: data.githubAccount,
      enableBrainAi: data.enableBrainAi,
      enablePublish: data.enablePublish,
      enableReposRead: data.enableReposRead,
      platformOAuthConfigured: data.platformOAuthConfigured
    });
  }

  if (toolName === "list_github_repositories") {
    const integration = await getGithubIntegrationPublic(companyId);
    if (integration.status !== "connected" || !integration.enableReposRead) {
      return JSON.stringify({
        success: false,
        error: "Configure GitHub em Integrações → GitHub e habilite leitura de repositórios."
      });
    }
    const items = await listOrgGithubRepos(companyId);
    return JSON.stringify({
      success: true,
      count: items.length,
      repositories: items.slice(0, 50)
    });
  }

  if (toolName === "read_github_repository_file") {
    const integration = await getGithubIntegrationPublic(companyId);
    if (integration.status !== "connected" || !integration.enableReposRead) {
      return JSON.stringify({
        success: false,
        error: "Leitura de repositórios não habilitada."
      });
    }
    const file = await readGithubRepoFile({
      workspaceId: companyId,
      repoFullName: String(args.repoFullName || ""),
      path: String(args.path || ""),
      ref: args.ref ? String(args.ref) : undefined
    });
    const maxLen = 120_000;
    const content =
      file.content.length > maxLen
        ? `${file.content.slice(0, maxLen)}\n\n… (truncado)`
        : file.content;
    return JSON.stringify({
      success: true,
      path: file.path,
      content,
      sha: file.sha
    });
  }

  if (toolName === "list_github_pull_requests") {
    const integration = await getGithubIntegrationPublic(companyId);
    if (integration.status !== "connected" || !integration.enableReposRead) {
      return JSON.stringify({
        success: false,
        error: "GitHub não configurado para listar pull requests."
      });
    }
    const items = await listGithubPullRequests({
      companyId,
      repoFullName: String(args.repoFullName || ""),
      state: args.state ? String(args.state) : "open",
      limit: Number(args.limit || 10)
    });
    return JSON.stringify({ success: true, pullRequests: items });
  }

  if (toolName !== "code_github_publish_repository") return null;

  const integration = await getGithubIntegrationPublic(companyId);
  if (integration.status !== "connected" || !integration.enablePublish) {
    return JSON.stringify({
      success: false,
      error: "Publicação GitHub não habilitada. Configure em Integrações → GitHub."
    });
  }

  const filesArr = Array.isArray(args.files) ? args.files : [];
  const files: Record<string, string> = {};
  filesArr.forEach((f: any) => {
    const p = String(f?.path || "").replace(/^\/+/, "");
    if (p) files[p] = String(f?.content ?? "");
  });

  const mode = args.mode === "existing" ? "existing" : "new";
  const result = await publishBrainProjectToGithub({
    companyId,
    userId,
    mode,
    repoName: args.repoName ? String(args.repoName) : undefined,
    repoFullName: args.repoFullName ? String(args.repoFullName) : undefined,
    description: args.description as string | undefined,
    isPrivate: args.isPrivate !== false,
    files
  });

  if (!result.success) {
    return JSON.stringify({ success: false, error: result.error });
  }

  return JSON.stringify({
    success: true,
    message: `Repositório publicado: ${result.htmlUrl} (${result.uploaded} arquivo(s))`,
    repoUrl: result.htmlUrl,
    owner: result.owner,
    uploaded: result.uploaded,
    instruction: "Confirme o link do repositório ao usuário."
  });
}
