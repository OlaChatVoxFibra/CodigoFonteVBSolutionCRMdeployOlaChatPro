/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  createGithubRepo,
  getBrainGithubConnection,
  uploadFilesToGithubRepo
} from "../GithubServices/githubOAuthService";
import { getOrgGithubAccessToken } from "../GithubServices/GithubIntegrationService";

export async function publishBrainProjectToGithub(params: {
  token?: string;
  companyId?: number;
  userId?: number;
  mode?: "new" | "existing";
  repoName?: string;
  repoFullName?: string;
  files: Record<string, string>;
  description?: string;
  isPrivate?: boolean;
}): Promise<{
  success: boolean;
  repoUrl?: string;
  htmlUrl?: string;
  owner?: string;
  repo?: string;
  uploaded?: number;
  error?: string;
}> {
  const files = params.files || {};
  if (!Object.keys(files).length) {
    return { success: false, error: "Nenhum arquivo no projeto." };
  }

  let token = String(params.token || "").trim();
  if (!token && params.companyId != null) {
    token = (await getOrgGithubAccessToken(params.companyId)) || "";
  }
  if (!token && params.companyId != null && params.userId != null) {
    const connection = await getBrainGithubConnection(params.companyId, params.userId);
    token = connection?.getAccessToken() || "";
  }

  if (!token) {
    return {
      success: false,
      error:
        "Configure GitHub em Integrações → GitHub (PAT ou OAuth) ou conecte sua conta."
    };
  }

  const mode = params.mode === "existing" ? "existing" : "new";

  try {
    let owner: string;
    let repoName: string;
    let htmlUrl: string;

    if (mode === "existing") {
      const full = String(params.repoFullName || "").trim();
      const slash = full.indexOf("/");
      if (slash <= 0) {
        return { success: false, error: "Selecione um repositório válido." };
      }
      owner = full.slice(0, slash);
      repoName = full.slice(slash + 1);
      htmlUrl = `https://github.com/${owner}/${repoName}`;
    } else {
      const repoNameInput = String(params.repoName || "")
        .trim()
        .replace(/[^\w.-]/g, "-")
        .slice(0, 100);
      if (!repoNameInput) {
        return { success: false, error: "Informe o nome do repositório." };
      }
      const created = await createGithubRepo({
        token,
        repoName: repoNameInput,
        description: params.description,
        isPrivate: params.isPrivate !== false
      });
      owner = created.owner;
      repoName = created.repoName;
      htmlUrl = created.htmlUrl;
    }

    const uploaded = await uploadFilesToGithubRepo({
      token,
      owner,
      repoName,
      files
    });

    return {
      success: true,
      repoUrl: htmlUrl,
      htmlUrl,
      owner,
      repo: repoName,
      uploaded
    };
  } catch (e: any) {
    const status = e?.response?.status;
    const ghMsg = e?.response?.data?.message;
    if (status === 401) return { success: false, error: "Token GitHub inválido ou expirado." };
    if (status === 403) {
      return {
        success: false,
        error: ghMsg || "Sem permissão para escrever no repositório."
      };
    }
    return {
      success: false,
      error: e?.message || ghMsg || "Erro ao publicar no GitHub."
    };
  }
}
